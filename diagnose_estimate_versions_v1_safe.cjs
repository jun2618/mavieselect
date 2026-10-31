const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const diagPath = path.join(root, 'src', 'estimateVersionDiagnostics.js')
const cssPath = path.join(root, 'src', 'estimateVersionDiagnostics.css')
const backup = appPath + '.before-estimate-version-diagnostics-v1'
const marker = 'M-CROSS_ESTIMATE_VERSION_DIAGNOSTICS_V1_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if (fs.existsSync(diagPath) || fs.existsSync(cssPath)) fail('診断ファイルが既に存在します。勝手に上書きしません。')
let app = fs.readFileSync(appPath, 'utf8')
if (app.includes(marker)) { console.log('SKIP: 見積版診断V1は適用済みです。'); process.exit(0) }

const appCssImport = /^import .*['"]\.\/App\.css['"]\s*$/m
const explorerButtonRegex = /<button className="savedExplorerFile estimateVersionExplorerFile"[\s\S]*?<\/button>/g
const buttons = app.match(explorerButtonRegex) || []
if (!appCssImport.test(app)) fail('App.css importが見つかりません。')
if (buttons.length !== 1) fail('保存済み見積版ボタンの一致数が ' + buttons.length + ' 件です。')

fs.copyFileSync(appPath, backup)

const diagCode = `/* ${marker} */
import './estimateVersionDiagnostics.css'

function yen(value) { return '¥' + Number(value || 0).toLocaleString('ja-JP') }
function marks(version) { const list=['','無印','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩']; return list[Number(version)||0] || String(version) }

function rowTotal(rows) {
  return (Array.isArray(rows) ? rows : []).reduce((sum, row) => sum + Number(row?.amount || 0), 0)
}
function additionalTotal(items) {
  return (Array.isArray(items) ? items : []).reduce((sum, item) => sum + Number(item?.amount || Number(item?.quantity || 0) * Number(item?.unitPrice || 0)), 0)
}

export function openEstimateVersionDiagnostics(entry, versions) {
  const root = document.createElement('div')
  root.className = 'estimateDiagBackdrop'
  const panel = document.createElement('section')
  panel.className = 'estimateDiagPanel'
  const title = document.createElement('h2')
  title.textContent = '見積版データ診断'
  const subtitle = document.createElement('p')
  subtitle.textContent = [entry?.propertyName, entry?.unit ? entry.unit + '号室' : '', entry?.workName || ''].filter(Boolean).join(' ')
  const close = document.createElement('button')
  close.type='button'; close.className='estimateDiagClose'; close.textContent='閉じる'
  close.addEventListener('click',()=>root.remove())
  panel.append(title,subtitle)

  const list = document.createElement('div')
  list.className='estimateDiagList'
  ;(Array.isArray(versions)?versions:[]).sort((a,b)=>Number(a.version)-Number(b.version)).forEach(version=>{
    const rows=Array.isArray(version.rows)?version.rows:[]
    const extras=Array.isArray(version.additionalWorks)?version.additionalWorks:[]
    const card=document.createElement('article')
    const heading=document.createElement('strong')
    heading.textContent='版: '+marks(version.version)+'  (version='+String(version.version)+')'
    const details=document.createElement('pre')
    details.textContent=[
      '保存合計: '+yen(version.totalAmount),
      '明細件数: '+rows.length,
      '明細amount合計: '+yen(rowTotal(rows)),
      'その他工事件数: '+extras.length,
      'その他工事合計: '+yen(additionalTotal(extras)),
      '作成日時: '+String(version.createdAt||''),
      '',
      '先頭3明細:',
      ...rows.slice(0,3).map((row,index)=>(index+1)+'. '+(Array.isArray(row.parts)?row.parts.filter(Boolean).join(' '):(row.label||row.name||''))+' / '+yen(row.amount))
    ].join('\\n')
    card.append(heading,details);list.appendChild(card)
  })
  if(!list.children.length){const p=document.createElement('p');p.textContent='保存済み見積版がありません。';list.appendChild(p)}
  panel.append(list,close);root.appendChild(panel);document.body.appendChild(root)
}
`

const css = `/* ${marker} */
.estimateDiagBackdrop{position:fixed;inset:0;z-index:2147483500;display:flex;align-items:flex-start;justify-content:center;padding:12px;background:rgba(0,0,0,.66);overflow:hidden;box-sizing:border-box}.estimateDiagPanel{width:min(760px,100%);max-height:calc(100dvh - 24px);overflow:auto;padding:18px;border-radius:16px;background:#fff;color:#172230;box-sizing:border-box}.estimateDiagPanel h2,.estimateDiagPanel p{margin-top:0}.estimateDiagList{display:grid;gap:10px}.estimateDiagList article{padding:12px;border:1px solid #ccd6e5;border-radius:12px}.estimateDiagList pre{margin:8px 0 0;white-space:pre-wrap;font:13px/1.55 ui-monospace,Consolas,monospace}.estimateDiagClose{width:100%;min-height:44px;margin-top:14px;border:0;border-radius:10px;background:#276fcb;color:#fff;font-weight:800}.theme-dark .estimateDiagPanel,.theme-cyber .estimateDiagPanel,.theme-luxury .estimateDiagPanel,.theme-retro .estimateDiagPanel,.theme-galaxy .estimateDiagPanel{background:#101827;color:#f7fbff}@media(max-width:620px){.estimateDiagBackdrop{padding:0}.estimateDiagPanel{width:100vw;height:100dvh;max-height:100dvh;border-radius:0}}
`

try {
  fs.writeFileSync(diagPath, diagCode, 'utf8')
  fs.writeFileSync(cssPath, css, 'utf8')
  app = app.replace(appCssImport, match => `${match}\nimport { openEstimateVersionDiagnostics } from './estimateVersionDiagnostics' // ${marker}`)

  const oldButton = buttons[0]
  const insertPoint = oldButton.lastIndexOf('</button>')
  if (insertPoint < 0) throw new Error('見積版ボタン終了位置が見つかりません。')
  const diagnosticButton = `</button>\n                              <button className="savedExplorerFile estimateVersionDiagnosticButton" type="button" onClick={(event) => { event.stopPropagation(); openEstimateVersionDiagnostics(entry, versions) }}>\n                                <span>🧪</span><div><strong>この案件の見積版データを診断</strong><small>無印・②・③の保存内容を確認</small></div>\n                              `
  const newButton = oldButton.slice(0, insertPoint) + diagnosticButton + oldButton.slice(insertPoint + '</button>'.length)
  app = app.replace(oldButton, newButton)
  fs.writeFileSync(appPath, app, 'utf8')

  console.log('診断機能を追加しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 見積版データ診断V1を追加し、ビルド成功を確認しました。')
  console.log('BACKUP: ' + backup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backup)) fs.copyFileSync(backup, appPath)
  if (fs.existsSync(diagPath)) fs.unlinkSync(diagPath)
  if (fs.existsSync(cssPath)) fs.unlinkSync(cssPath)
  process.exit(1)
}
