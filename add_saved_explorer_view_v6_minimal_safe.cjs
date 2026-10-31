const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const cssPath = path.join(root, 'src', 'App.css')
const appBackup = appPath + '.before-saved-explorer-v6'
const cssBackup = cssPath + '.before-saved-explorer-v6'
const marker = 'M-CROSS_SAVED_EXPLORER_V6_MINIMAL_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if (!fs.existsSync(cssPath)) fail('src/App.css が見つかりません。')

let app = fs.readFileSync(appPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')

if (app.includes(marker)) {
  console.log('SKIP: 保存済みエクスプローラーV6は適用済みです。')
  process.exit(0)
}

const stateAnchor = "  const [savedSortOrder, setSavedSortOrder] = useState('newest')"
const bulkAnchor = "              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '0 0 18px' }}>"
const conditionalAnchor = "              {visibleSavedEntries.length === 0 ? ("
const savedListAnchor = '                <div className="savedList">'

for (const [name, anchor] of [
  ['savedSortOrder state', stateAnchor],
  ['一括操作欄', bulkAnchor],
  ['保存済み一覧の空表示判定', conditionalAnchor],
  ['savedList開始位置', savedListAnchor],
]) {
  const count = app.split(anchor).length - 1
  if (count !== 1) fail(name + 'の一致数が ' + count + ' 件です。変更していません。')
}

fs.copyFileSync(appPath, appBackup)
fs.copyFileSync(cssPath, cssBackup)

try {
  app = app.replace(
    stateAnchor,
    `${stateAnchor}\n  /* ${marker} */\n  const [savedViewMode, setSavedViewMode] = useState('list')\n  const [savedFolderPath, setSavedFolderPath] = useState([])`
  )

  app = app.replace(
    bulkAnchor,
    `              <div className="savedViewSwitch" aria-label="保存済み表示形式">\n                <button type="button" className={savedViewMode === 'list' ? 'active' : ''} onClick={() => setSavedViewMode('list')}>☰ 一覧表示</button>\n                <button type="button" className={savedViewMode === 'explorer' ? 'active' : ''} onClick={() => { setSavedViewMode('explorer'); setSavedFolderPath([]) }}>📁 フォルダ表示</button>\n              </div>\n\n${bulkAnchor}`
  )

  const explorer = `              {/* ${marker} */}
              {savedViewMode === 'explorer' && visibleSavedEntries.length > 0 && (() => {
                const nodes = visibleSavedEntries.map(entry => {
                  const date = new Date(entry.updatedAt || entry.createdAt || 0)
                  const validDate = !Number.isNaN(date.getTime())
                  return {
                    entry,
                    levels: [
                      validDate ? date.getFullYear() + '年' : '日付不明',
                      validDate ? (date.getMonth() + 1) + '月' : '月不明',
                      entry.company || '管理会社未設定',
                      entry.propertyName || '物件名なし',
                    ],
                  }
                })
                const depth = savedFolderPath.length
                const matching = nodes.filter(node => savedFolderPath.every((value, index) => node.levels[index] === value))
                const isPropertyFolder = depth >= 4
                const folders = isPropertyFolder
                  ? []
                  : [...new Set(matching.map(node => node.levels[depth]))]
                    .sort((a, b) => String(a).localeCompare(String(b), 'ja', { numeric: true }))

                return (
                  <div className="savedExplorer">
                    <div className="savedExplorerCrumbs">
                      <button type="button" onClick={() => setSavedFolderPath([])}>📂 保存済み</button>
                      {savedFolderPath.map((part, index) => (
                        <button type="button" key={index} onClick={() => setSavedFolderPath(savedFolderPath.slice(0, index + 1))}>› {part}</button>
                      ))}
                    </div>
                    {savedFolderPath.length > 0 && (
                      <button className="savedExplorerBack" type="button" onClick={() => setSavedFolderPath(path => path.slice(0, -1))}>← ひとつ上へ</button>
                    )}
                    {!isPropertyFolder ? (
                      <div className="savedExplorerGrid">
                        {folders.map(folder => {
                          const count = matching.filter(node => node.levels[depth] === folder).length
                          const icon = depth < 2 ? '📁' : depth === 2 ? '🗂️' : '🏢'
                          return (
                            <button className="savedExplorerFolder" type="button" key={folder} onClick={() => setSavedFolderPath(path => [...path, folder])}>
                              <span className="savedExplorerIcon">{icon}</span>
                              <strong>{folder}</strong>
                              <small>{count}件</small>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="savedExplorerFiles">
                        {matching.map(({ entry }, index) => (
                          <button className="savedExplorerFile" type="button" key={entry.storageKey || index} onClick={() => openSavedEntry(entry)}>
                            <span>📄</span>
                            <div>
                              <strong>{entry.unit ? entry.unit + '号室' : '号室未設定'}</strong>
                              <small>更新 {formatSavedDate(entry.updatedAt)}</small>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}

${conditionalAnchor}`

  app = app.replace(conditionalAnchor, explorer)

  // 既存一覧は削除・再構築せず、フォルダ表示時だけ非表示にする。
  app = app.replace(
    savedListAnchor,
    `                <div className="savedList" style={{ display: savedViewMode === 'list' ? undefined : 'none' }}>`
  )

  // 0件時のメッセージはフォルダ表示でも共通利用できるため変更しない。

  css += `
/* ${marker} */
.savedViewSwitch{display:flex;gap:8px;margin:0 0 16px}
.savedViewSwitch button{flex:1;min-height:44px;border:1px solid rgba(90,120,170,.28);border-radius:12px;background:rgba(127,127,127,.08);color:inherit;font-weight:800}
.savedViewSwitch button.active{background:#276fcb;color:#fff;border-color:#276fcb}
.savedExplorer{display:grid;gap:12px;margin-bottom:18px}
.savedExplorerCrumbs{display:flex;flex-wrap:wrap;gap:6px}
.savedExplorerCrumbs button,.savedExplorerBack{border:0;background:transparent;color:inherit;font-weight:800;padding:7px 4px}
.savedExplorerGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:10px}
.savedExplorerFolder{display:grid;justify-items:start;gap:5px;min-height:112px;padding:14px;border:1px solid rgba(90,120,170,.22);border-radius:14px;background:rgba(127,127,127,.06);color:inherit;text-align:left}
.savedExplorerIcon{font-size:34px}.savedExplorerFolder strong{font-size:16px}.savedExplorerFolder small{opacity:.75}
.savedExplorerFiles{display:grid;gap:8px}.savedExplorerFile{display:flex;align-items:center;gap:12px;width:100%;padding:13px;border:1px solid rgba(90,120,170,.22);border-radius:12px;background:rgba(127,127,127,.05);color:inherit;text-align:left}
.savedExplorerFile>span{font-size:28px}.savedExplorerFile strong,.savedExplorerFile small{display:block}.savedExplorerFile small{margin-top:3px;opacity:.75}
@media(max-width:620px){.savedExplorerGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.savedExplorerFolder{min-height:105px}}
`

  fs.writeFileSync(appPath, app, 'utf8')
  fs.writeFileSync(cssPath, css, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 保存済みエクスプローラーV6を追加し、ビルド成功を確認しました。')
  console.log('階層: 年 > 月 > 管理会社 > 物件 > 号室')
  console.log('BACKUP: ' + appBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(appBackup)) fs.copyFileSync(appBackup, appPath)
  if (fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup, cssPath)
  process.exit(1)
}
