const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const cssPath = path.join(root, 'src', 'App.css')
const appBackup = appPath + '.before-saved-explorer-v2'
const cssBackup = cssPath + '.before-saved-explorer-v2'
const marker = 'M-CROSS_SAVED_EXPLORER_V2_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if (!fs.existsSync(cssPath)) fail('src/App.css が見つかりません。')
let app = fs.readFileSync(appPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')
if (app.includes(marker)) { console.log('SKIP: 保存済みエクスプローラーV2は適用済みです。'); process.exit(0) }

const stateAnchor = "  const [savedSortOrder, setSavedSortOrder] = useState('newest')"
const emptyAnchor = `                {visibleSavedEntries.length === 0 ? (`
const mapAnchor = `{visibleSavedEntries.map((entry, index) => (`
const afterListAnchor = `              </section>\n            </main>\n          ) : !started ? (`
if (!app.includes(stateAnchor)) fail('savedSortOrder stateが見つかりません。')
if (!app.includes(emptyAnchor)) fail('保存済み一覧の空表示判定が見つかりません。')
if (!app.includes(mapAnchor)) fail('visibleSavedEntries.map が見つかりません。')
if (!app.includes(afterListAnchor)) fail('保存済み一覧セクション終了位置が見つかりません。')

fs.copyFileSync(appPath, appBackup)
fs.copyFileSync(cssPath, cssBackup)

try {
  app = app.replace(stateAnchor, `${stateAnchor}\n  /* ${marker} */\n  const [savedViewMode, setSavedViewMode] = useState('list')\n  const [savedFolderPath, setSavedFolderPath] = useState([])`)

  // 一括操作の直前に表示切替を挿入。
  const bulkAnchor = `                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '0 0 18px' }}>`
  if (!app.includes(bulkAnchor)) throw new Error('一括操作欄が見つかりません。')
  app = app.replace(bulkAnchor, `                <div className="savedViewSwitch" aria-label="保存済み表示形式">\n                  <button type="button" className={savedViewMode === 'list' ? 'active' : ''} onClick={() => setSavedViewMode('list')}>☰ 一覧表示</button>\n                  <button type="button" className={savedViewMode === 'explorer' ? 'active' : ''} onClick={() => { setSavedViewMode('explorer'); setSavedFolderPath([]) }}>📁 フォルダ表示</button>\n                </div>\n\n${bulkAnchor}`)

  // 既存カード部は触らず、その手前で explorer のときだけ別UIを描画し、既存カード部を list のときだけ表示。
  const emptyPos = app.indexOf(emptyAnchor)
  const explorerBlock = `                {savedViewMode === 'explorer' && visibleSavedEntries.length > 0 && (() => {\n                  const folderDate = entry => {\n                    const date = new Date(entry.updatedAt || entry.createdAt || 0)\n                    if (Number.isNaN(date.getTime())) return { year: '日付不明', month: '月不明' }\n                    return { year: date.getFullYear() + '年', month: (date.getMonth() + 1) + '月' }\n                  }\n                  const nodes = visibleSavedEntries.map(entry => {\n                    const date = folderDate(entry)\n                    return { entry, levels: [date.year, date.month, entry.company || '管理会社未設定', entry.propertyName || '物件名なし'] }\n                  })\n                  const depth = savedFolderPath.length\n                  const matching = nodes.filter(node => savedFolderPath.every((value, index) => node.levels[index] === value))\n                  const isLeaf = depth >= 4\n                  const folders = isLeaf ? [] : [...new Set(matching.map(node => node.levels[depth]))].sort((a, b) => String(a).localeCompare(String(b), 'ja', { numeric: true }))\n                  return (\n                    <div className="savedExplorer">\n                      <div className="savedExplorerCrumbs">\n                        <button type="button" onClick={() => setSavedFolderPath([])}>📂 保存済み</button>\n                        {savedFolderPath.map((part, index) => <button type="button" key={index} onClick={() => setSavedFolderPath(savedFolderPath.slice(0, index + 1))}>› {part}</button>)}\n                      </div>\n                      {savedFolderPath.length > 0 && <button className="savedExplorerBack" type="button" onClick={() => setSavedFolderPath(path => path.slice(0, -1))}>← ひとつ上へ</button>}\n                      {!isLeaf ? (\n                        <div className="savedExplorerGrid">\n                          {folders.map(folder => {\n                            const count = matching.filter(node => node.levels[depth] === folder).length\n                            const icon = depth < 2 ? '📁' : depth === 2 ? '🗂️' : '🏢'\n                            return <button className="savedExplorerFolder" type="button" key={folder} onClick={() => setSavedFolderPath(path => [...path, folder])}><span className="savedExplorerIcon">{icon}</span><strong>{folder}</strong><small>{count}件</small></button>\n                          })}\n                        </div>\n                      ) : (\n                        <div className="savedExplorerFiles">\n                          {matching.map(({ entry }, index) => <button className="savedExplorerFile" type="button" key={entry.storageKey || index} onClick={() => openSavedEntry(entry)}><span>📄</span><div><strong>{entry.unit ? entry.unit + '号室' : '号室未設定'}</strong><small>更新 {formatSavedDate(entry.updatedAt)}</small></div></button>)}\n                        </div>\n                      )}\n                    </div>\n                  )\n                })()}\n\n`
  app = app.slice(0, emptyPos) + explorerBlock + app.slice(emptyPos)

  // 既存一覧全体は list モードのときだけ表示。空表示は両モード共通で残す。
  const updatedEmptyPos = app.indexOf(emptyAnchor)
  const listDivPos = app.indexOf('<div className="savedList">', updatedEmptyPos)
  if (listDivPos < 0) throw new Error('savedList divが見つかりません。')
  app = app.slice(0, listDivPos) + `{savedViewMode === 'list' && (` + app.slice(listDivPos)

  // savedList の閉じタグは次の保存済みsection終了手前にある最後の </div> を利用。
  const sectionEnd = app.indexOf(afterListAnchor, listDivPos)
  if (sectionEnd < 0) throw new Error('保存済みセクション終了位置を再検出できません。')
  const lastDiv = app.lastIndexOf('                  </div>', sectionEnd)
  if (lastDiv < listDivPos) throw new Error('savedList終了divが見つかりません。')
  const closeEnd = lastDiv + '                  </div>'.length
  app = app.slice(0, closeEnd) + `)}` + app.slice(closeEnd)

  css += `\n/* ${marker} */\n.savedViewSwitch{display:flex;gap:8px;margin:0 0 16px}.savedViewSwitch button{flex:1;min-height:44px;border:1px solid rgba(90,120,170,.28);border-radius:12px;background:rgba(127,127,127,.08);color:inherit;font-weight:800}.savedViewSwitch button.active{background:#276fcb;color:#fff;border-color:#276fcb}.savedExplorer{display:grid;gap:12px;margin-bottom:18px}.savedExplorerCrumbs{display:flex;flex-wrap:wrap;gap:5px}.savedExplorerCrumbs button,.savedExplorerBack{border:0;background:transparent;color:inherit;font-weight:800;padding:7px 4px}.savedExplorerGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:10px}.savedExplorerFolder{display:grid;justify-items:start;gap:5px;min-height:112px;padding:14px;border:1px solid rgba(90,120,170,.22);border-radius:14px;background:rgba(127,127,127,.06);color:inherit;text-align:left}.savedExplorerIcon{font-size:34px}.savedExplorerFolder strong{font-size:16px}.savedExplorerFolder small{opacity:.75}.savedExplorerFiles{display:grid;gap:8px}.savedExplorerFile{display:flex;align-items:center;gap:12px;width:100%;padding:13px;border:1px solid rgba(90,120,170,.22);border-radius:12px;background:rgba(127,127,127,.05);color:inherit;text-align:left}.savedExplorerFile>span{font-size:28px}.savedExplorerFile strong,.savedExplorerFile small{display:block}.savedExplorerFile small{margin-top:3px;opacity:.75}@media(max-width:620px){.savedExplorerGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.savedExplorerFolder{min-height:105px}}\n`

  fs.writeFileSync(appPath, app, 'utf8')
  fs.writeFileSync(cssPath, css, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 保存済みエクスプローラーV2を追加し、ビルド成功を確認しました。')
  console.log('階層: 年 > 月 > 管理会社 > 物件 > 号室')
  console.log('BACKUP: ' + appBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(appBackup)) fs.copyFileSync(appBackup, appPath)
  if (fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup, cssPath)
  process.exit(1)
}
