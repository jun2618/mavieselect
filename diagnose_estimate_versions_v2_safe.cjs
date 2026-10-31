const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const diagPath = path.join(root, 'src', 'estimateVersionDiagnostics.js')
const cssPath = path.join(root, 'src', 'estimateVersionDiagnostics.css')
const backup = appPath + '.before-estimate-version-diagnostics-v2'
const marker = 'M-CROSS_ESTIMATE_VERSION_DIAGNOSTICS_V2_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if (fs.existsSync(diagPath) || fs.existsSync(cssPath)) fail('診断ファイルが既に存在します。削除または復旧状態を確認してください。')
let app = fs.readFileSync(appPath, 'utf8')
if (app.includes(marker)) { console.log('SKIP: 見積版診断V2は適用済みです。'); process.exit(0) }

const appCssImport = /^import .*['"]\.\/App\.css['"]\s*$/m
const buttonRegex = /<button className="savedExplorerFile estimateVersionExplorerFile"[\s\S]*?<\/button>/g
const buttons = app.match(buttonRegex) || []
if (!appCssImport.test(app)) fail('App.css importが見つかりません。')
if (buttons.length !== 1) fail('保存済み見積版ボタンの一致数が ' + buttons.length + ' 件です。')
if (!/onClick=\{[\s\S]*?\}/.test(buttons[0])) fail('見積版ボタンのonClickが見つかりません。')

fs.copyFileSync(appPath, backup)

const diagCode = `/* ${marker} */
import './estimateVersionDiagnostics.css'
function yen(v){return '¥'+Number(v||0).toLocaleString('ja-JP')}
function label(v){const m=['','無印','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];return m[Number(v)||0]||String(v)}
function sumRows(rows){return (Array.isArray(rows)?rows:[]).reduce((s,r)=>s+Number(r?.amount||0),0)}
function sumExtras(items){return (Array.isArray(items)?items:[]).reduce((s,i)=>s+Number(i?.amount||Number(i?.quantity||0)*Number(i?.unitPrice||0)),0)}
export function openEstimateVersionDiagnostics(entry, versions){
  document.querySelector('.estimateDiagBackdropV2')?.remove()
  const root=document.createElement('div');root.className='estimateDiagBackdropV2'
  const panel=document.createElement('section');panel.className='estimateDiagPanelV2'
  const h=document.createElement('h2');h.textContent='見積版データ診断'
  const p=document.createElement('p');p.textContent=[entry?.propertyName,entry?.unit?entry.unit+'号室':'',entry?.workName||''].filter(Boolean).join(' ')
  panel.append(h,p)
  const list=document.createElement('div');list.className='estimateDiagListV2'
  ;(Array.isArray(versions)?[...versions]:[]).sort((a,b)=>Number(a.version)-Number(b.version)).forEach(v=>{
    const rows=Array.isArray(v.rows)?v.rows:[], extras=Array.isArray(v.additionalWorks)?v.additionalWorks:[]
    const card=document.createElement('article'), strong=document.createElement('strong'), pre=document.createElement('pre')
    strong.textContent='版: '+label(v.version)+' (version='+v.version+')'
    pre.textContent=['保存合計: '+yen(v.totalAmount),'明細件数: '+rows.length,'明細amount合計: '+yen(sumRows(rows)),'その他工事件数: '+extras.length,'その他工事合計: '+yen(sumExtras(extras)),'作成日時: '+String(v.createdAt||''),'','先頭3明細:',...rows.slice(0,3).map((r,i)=>(i+1)+'. '+(Array.isArray(r.parts)?r.parts.filter(Boolean).join(' '):(r.label||r.name||''))+' / '+yen(r.amount))].join('\\n')
    card.append(strong,pre);list.append(card)
  })
  if(!list.children.length){const empty=document.createElement('p');empty.textContent='保存済み見積版がありません。';list.append(empty)}
  const close=document.createElement('button');close.type='button';close.textContent='閉じる';close.addEventListener('click',()=>root.remove())
  panel.append(list,close);root.append(panel);root.addEventListener('click',e=>{if(e.target===root)root.remove()});document.body.append(root)
}
`
const css = `/* ${marker} */
.estimateDiagBackdropV2{position:fixed;inset:0;z-index:2147483500;display:flex;align-items:flex-start;justify-content:center;padding:12px;background:rgba(0,0,0,.66);overflow:hidden;box-sizing:border-box}.estimateDiagPanelV2{width:min(760px,100%);max-height:calc(100dvh - 24px);overflow:auto;padding:18px;border-radius:16px;background:#fff;color:#172230;box-sizing:border-box}.estimateDiagListV2{display:grid;gap:10px}.estimateDiagListV2 article{padding:12px;border:1px solid #ccd6e5;border-radius:12px}.estimateDiagListV2 pre{white-space:pre-wrap;font:13px/1.55 ui-monospace,Consolas,monospace}.estimateDiagPanelV2>button{width:100%;min-height:44px;margin-top:14px;border:0;border-radius:10px;background:#276fcb;color:#fff;font-weight:800}@media(max-width:620px){.estimateDiagBackdropV2{padding:0}.estimateDiagPanelV2{width:100vw;height:100dvh;max-height:100dvh;border-radius:0}}
`

try {
  fs.writeFileSync(diagPath, diagCode, 'utf8')
  fs.writeFileSync(cssPath, css, 'utf8')
  app = app.replace(appCssImport, m => `${m}\nimport { openEstimateVersionDiagnostics } from './estimateVersionDiagnostics' // ${marker}`)
  const oldButton = buttons[0]
  const newButton = oldButton.replace(/onClick=\{[\s\S]*?\}(?=>)/, `onClick={(event) => { event.stopPropagation(); openEstimateVersionDiagnostics(entry, versions) }}`)
  if (newButton === oldButton) throw new Error('診断用onClickへ置換できませんでした。')
  app = app.replace(oldButton, newButton)
  fs.writeFileSync(appPath, app, 'utf8')
  console.log('診断機能V2を追加しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 見積版データ診断V2を追加し、ビルド成功を確認しました。')
  console.log('注意: 診断中は②などの版ファイルを押すと診断画面が開きます。')
  console.log('BACKUP: ' + backup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backup)) fs.copyFileSync(backup, appPath)
  if (fs.existsSync(diagPath)) fs.unlinkSync(diagPath)
  if (fs.existsSync(cssPath)) fs.unlinkSync(cssPath)
  process.exit(1)
}
