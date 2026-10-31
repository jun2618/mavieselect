const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const jsxPath = path.join(root, 'src', 'EstimateRowEditor.jsx')
const cssPath = path.join(root, 'src', 'EstimateRowEditor.css')
const jsxBackup = jsxPath + '.before-viewport-v2'
const cssBackup = cssPath + '.before-viewport-v2'
const marker = 'M-CROSS_ESTIMATE_EDITOR_VIEWPORT_V2_SAFE'

function fail(m){ console.error('ERROR: '+m); process.exit(1) }
if(!fs.existsSync(jsxPath)) fail('EstimateRowEditor.jsx が見つかりません。')
if(!fs.existsSync(cssPath)) fail('EstimateRowEditor.css が見つかりません。')
let jsx=fs.readFileSync(jsxPath,'utf8')
let css=fs.readFileSync(cssPath,'utf8')
if(jsx.includes(marker)){ console.log('SKIP: V2適用済みです。'); process.exit(0) }

fs.copyFileSync(jsxPath,jsxBackup)
fs.copyFileSync(cssPath,cssBackup)
try{
  // 既存の「先頭へ戻す」処理は残すが、focusでブラウザが再スクロールする処理を削除。
  const focusLine = "      panelRef.current?.querySelector('input')?.focus({ preventScroll: true })\n"
  jsx = jsx.replace(focusLine, '')

  // value変更時に二段階で確実にパネル先頭へ戻す。
  const scrollLine = "      panelRef.current?.scrollTo({ top: 0, behavior: 'auto' })"
  if(!jsx.includes(scrollLine)) throw new Error('既存のscrollTo処理が見つかりません。')
  jsx = jsx.replace(scrollLine, `${scrollLine}\n      window.scrollTo({ top: window.scrollY, behavior: 'auto' })`)
  jsx = jsx.replace('  const [form, setForm] = useState(value)', `  /* ${marker} */\n  const [form, setForm] = useState(value)`)

  css += `\n/* ${marker} */\n/* PCでも編集パネルを画面上端寄せにし、下側が画面外へ落ちにくくする */\n.estimateEditorBackdrop{display:flex!important;align-items:flex-start!important;justify-content:center!important;overflow:hidden!important;padding:12px!important;box-sizing:border-box!important}\n.estimateEditorPanel{margin:0!important;max-height:calc(100dvh - 24px)!important;overflow-y:auto!important;scrollbar-gutter:stable;box-sizing:border-box!important}\n@media(max-width:620px){.estimateEditorBackdrop{padding:0!important}.estimateEditorPanel{height:100dvh!important;max-height:100dvh!important;border-radius:0!important;padding-top:max(16px,env(safe-area-inset-top))!important;padding-bottom:max(16px,env(safe-area-inset-bottom))!important}.estimateEditorHeader{top:0!important}.estimateEditorActions{bottom:0!important}}\n`

  fs.writeFileSync(jsxPath,jsx,'utf8')
  fs.writeFileSync(cssPath,css,'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true})
  console.log('OK: 見積編集パネルをPC/スマホとも画面上部から表示するV2を適用しました。')
}catch(e){
  console.error('失敗したため自動で元に戻します。')
  console.error(e.message||String(e))
  fs.copyFileSync(jsxBackup,jsxPath)
  fs.copyFileSync(cssBackup,cssPath)
  process.exit(1)
}
