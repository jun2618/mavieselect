const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const cssPath = path.join(root, 'src', 'App.css')
const appBackup = appPath + '.before-saved-explorer-v4'
const cssBackup = cssPath + '.before-saved-explorer-v4'
const marker = 'M-CROSS_SAVED_EXPLORER_V4_EXACT'

function fail(m){ console.error('ERROR: '+m); process.exit(1) }
if(!fs.existsSync(appPath)||!fs.existsSync(cssPath)) fail('src/App.jsx または src/App.css が見つかりません。')
let app=fs.readFileSync(appPath,'utf8'), css=fs.readFileSync(cssPath,'utf8')
if(app.includes(marker)){ console.log('SKIP: 保存済みエクスプローラーV4は適用済みです。'); process.exit(0) }

const stateAnchor="  const [savedSortOrder, setSavedSortOrder] = useState('newest')"
const bulkAnchor="              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '0 0 18px' }}>"
const conditionalStart="              {visibleSavedEntries.length === 0 ? ("
const listStart='                <div className="savedList">'
const conditionalEnd="              )}"

if(!app.includes(stateAnchor)) fail('savedSortOrder stateが見つかりません。')
if(!app.includes(bulkAnchor)) fail('実コードの一括操作欄が見つかりません。')
if(!app.includes(conditionalStart)) fail('保存済み一覧の空表示判定が見つかりません。')

fs.copyFileSync(appPath,appBackup); fs.copyFileSync(cssPath,cssBackup)
try{
  app=app.replace(stateAnchor,`${stateAnchor}\n  /* ${marker} */\n  const [savedViewMode, setSavedViewMode] = useState('list')\n  const [savedFolderPath, setSavedFolderPath] = useState([])`)

  app=app.replace(bulkAnchor,`              <div className="savedViewSwitch">\n                <button type="button" className={savedViewMode === 'list' ? 'active' : ''} onClick={() => setSavedViewMode('list')}>☰ 一覧表示</button>\n                <button type="button" className={savedViewMode === 'explorer' ? 'active' : ''} onClick={() => { setSavedViewMode('explorer'); setSavedFolderPath([]) }}>📁 フォルダ表示</button>\n              </div>\n\n${bulkAnchor}`)

  // list div を list mode だけにする。終了位置はユーザー提示コードの article map 終了直後を利用。
  const listPos=app.indexOf(listStart, app.indexOf(conditionalStart))
  if(listPos<0) throw new Error('savedList開始位置が見つかりません。')
  const mapEndNeedle="                  ))}\n                </div>\n              )}"
  const mapEndPos=app.indexOf(mapEndNeedle,listPos)
  if(mapEndPos<0) throw new Error('savedList終了位置が見つかりません。')
  const listCloseEnd=mapEndPos + "                  ))}\n                </div>".length
  app=app.slice(0,listPos)+`                {savedViewMode === 'list' && (\n${listStart}`+app.slice(listPos+listStart.length,listCloseEnd)+`\n                )}`+app.slice(listCloseEnd)

  // explorer block is inserted immediately after the existing conditional.
  const updatedMapEnd=app.indexOf(mapEndNeedle.replace("                </div>","                </div>\n                )}"), listPos)
  // Instead, locate the stable next screen boundary and insert before it, after existing list conditional.
  const boundary="            </section>\n          </main>\n        ) : !started ? ("
  const boundaryPos=app.indexOf(boundary,listPos)
  if(boundaryPos<0) throw new Error('保存済み画面の終了位置が見つかりません。')
  const explorer=`\n              {savedViewMode === 'explorer' && visibleSavedEntries.length > 0 && (() => {\n                const nodes = visibleSavedEntries.map(entry => {\n                  const date = new Date(entry.updatedAt || entry.createdAt || 0)\n                  const valid = !Number.isNaN(date.getTime())\n                  return { entry, levels: [valid ? date.getFullYear() + '年' : '日付不明', valid ? (date.getMonth()+1) + '月' : '月不明', entry.company || '管理会社未設定', entry.propertyName || '物件名なし'] }\n                })\n                const depth=savedFolderPath.length\n                const matching=nodes.filter(node=>savedFolderPath.every((v,i)=>node.levels[i]===v))\n                const leaf=depth>=4\n                const folders=leaf?[]:[...new Set(matching.map(node=>node.levels[depth]))].sort((a,b)=>String(a).localeCompare(String(b),'ja',{numeric:true}))\n                return <div className="savedExplorer">\n                  <div className="savedExplorerCrumbs"><button type="button" onClick={()=>setSavedFolderPath([])}>📂 保存済み</button>{savedFolderPath.map((part,index)=><button type="button" key={index} onClick={()=>setSavedFolderPath(savedFolderPath.slice(0,index+1))}>› {part}</button>)}</div>\n                  {savedFolderPath.length>0 && <button className="savedExplorerBack" type="button" onClick={()=>setSavedFolderPath(p=>p.slice(0,-1))}>← ひとつ上へ</button>}\n                  {!leaf ? <div className="savedExplorerGrid">{folders.map(folder=>{ const count=matching.filter(node=>node.levels[depth]===folder).length; const icon=depth<2?'📁':depth===2?'🗂️':'🏢'; return <button className="savedExplorerFolder" type="button" key={folder} onClick={()=>setSavedFolderPath(p=>[...p,folder])}><span>{icon}</span><strong>{folder}</strong><small>{count}件</small></button> })}</div> : <div className="savedExplorerFiles">{matching.map(({entry},index)=><button className="savedExplorerFile" type="button" key={entry.storageKey||index} onClick={()=>openSavedEntry(entry)}><span>📄</span><div><strong>{entry.unit ? entry.unit+'号室':'号室未設定'}</strong><small>更新 {formatSavedDate(entry.updatedAt)}</small></div></button>)}</div>}\n                </div>\n              })()}\n`
  app=app.slice(0,boundaryPos)+explorer+app.slice(boundaryPos)

  css+=`\n/* ${marker} */\n.savedViewSwitch{display:flex;gap:8px;margin:0 0 16px}.savedViewSwitch button{flex:1;min-height:44px;border:1px solid rgba(90,120,170,.28);border-radius:12px;background:rgba(127,127,127,.08);color:inherit;font-weight:800}.savedViewSwitch button.active{background:#276fcb;color:#fff;border-color:#276fcb}.savedExplorer{display:grid;gap:12px;margin-bottom:18px}.savedExplorerCrumbs{display:flex;flex-wrap:wrap;gap:6px}.savedExplorerCrumbs button,.savedExplorerBack{border:0;background:transparent;color:inherit;font-weight:800;padding:7px 4px}.savedExplorerGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:10px}.savedExplorerFolder{display:grid;justify-items:start;gap:5px;min-height:112px;padding:14px;border:1px solid rgba(90,120,170,.22);border-radius:14px;background:rgba(127,127,127,.06);color:inherit;text-align:left}.savedExplorerFolder>span{font-size:34px}.savedExplorerFolder strong{font-size:16px}.savedExplorerFolder small{opacity:.75}.savedExplorerFiles{display:grid;gap:8px}.savedExplorerFile{display:flex;align-items:center;gap:12px;width:100%;padding:13px;border:1px solid rgba(90,120,170,.22);border-radius:12px;background:rgba(127,127,127,.05);color:inherit;text-align:left}.savedExplorerFile>span{font-size:28px}.savedExplorerFile strong,.savedExplorerFile small{display:block}.savedExplorerFile small{margin-top:3px;opacity:.75}@media(max-width:620px){.savedExplorerGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.savedExplorerFolder{min-height:105px}}\n`
  fs.writeFileSync(appPath,app,'utf8');fs.writeFileSync(cssPath,css,'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true})
  console.log('OK: 保存済みエクスプローラーV4を追加し、ビルド成功を確認しました。')
  console.log('階層: 年 > 月 > 管理会社 > 物件 > 号室')
}catch(e){console.error('適用またはビルドに失敗したため、自動で元に戻します。');console.error(e.message||String(e));fs.copyFileSync(appBackup,appPath);fs.copyFileSync(cssBackup,cssPath);process.exit(1)}
