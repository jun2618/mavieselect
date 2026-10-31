const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const jsxPath = path.join(root, 'src', 'EstimateRowEditor.jsx')
const cssPath = path.join(root, 'src', 'EstimateRowEditor.css')
const jsxBackup = jsxPath + '.before-portal-v3'
const cssBackup = cssPath + '.before-portal-v3'
const marker = 'M-CROSS_ESTIMATE_EDITOR_PORTAL_V3_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(jsxPath)) fail('src/EstimateRowEditor.jsx が見つかりません。')
if (!fs.existsSync(cssPath)) fail('src/EstimateRowEditor.css が見つかりません。')

let jsx = fs.readFileSync(jsxPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')

if (jsx.includes(marker)) {
  console.log('SKIP: 見積編集Portal V3は適用済みです。')
  process.exit(0)
}

const reactImportPattern = /import \{([^}]+)\} from 'react'/
const reactImportMatch = jsx.match(reactImportPattern)
if (!reactImportMatch) fail('React importが見つかりません。変更していません。')
if (!jsx.includes("import './EstimateRowEditor.css'")) fail('EstimateRowEditor.css importが見つかりません。変更していません。')
if (!jsx.includes('className="estimateEditorBackdrop"')) fail('編集画面の背景要素が見つかりません。変更していません。')
if (!jsx.includes('panelRef')) fail('panelRefが見つかりません。先にスクロール修正V1/V2を適用してください。')

fs.copyFileSync(jsxPath, jsxBackup)
fs.copyFileSync(cssPath, cssBackup)

try {
  // useLayoutEffectを追加し、モーダルをdocument.body直下へ出すPortalを追加。
  const imports = reactImportMatch[1].split(',').map(value => value.trim()).filter(Boolean)
  if (!imports.includes('useLayoutEffect')) imports.push('useLayoutEffect')
  jsx = jsx.replace(reactImportPattern, `import { ${imports.join(', ')} } from 'react'`)
  jsx = jsx.replace("import './EstimateRowEditor.css'", "import { createPortal } from 'react-dom'\nimport './EstimateRowEditor.css'")

  // 既存のvalue変更useEffectとは別に、描画直後・次フレーム・短い遅延後の3回先頭を固定。
  const formGuard = '  if (!form) return null'
  if (!jsx.includes(formGuard)) throw new Error('formの表示判定が見つかりません。')
  const layoutEffect = `  /* ${marker} */
  useLayoutEffect(() => {
    if (!form) return
    const resetToTop = () => {
      if (!panelRef.current) return
      panelRef.current.scrollTop = 0
      panelRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
    resetToTop()
    const frame1 = window.requestAnimationFrame(() => {
      resetToTop()
      window.requestAnimationFrame(resetToTop)
    })
    const timer = window.setTimeout(resetToTop, 80)
    return () => {
      window.cancelAnimationFrame(frame1)
      window.clearTimeout(timer)
    }
  }, [form?.key])

${formGuard}`
  jsx = jsx.replace(formGuard, layoutEffect)

  // return (...) を return createPortal((...), document.body) に変更。
  const returnStart = '  return (\n    <div className="estimateEditorBackdrop"'
  if (!jsx.includes(returnStart)) throw new Error('編集画面のreturn開始位置が見つかりません。')
  jsx = jsx.replace(returnStart, '  return createPortal(\n    <div className="estimateEditorBackdrop"')

  // コンポーネント末尾の最後の ) を , document.body) に置換する。
  const ending = '\n  )\n}\n'
  const endingIndex = jsx.lastIndexOf(ending)
  if (endingIndex < 0) throw new Error('編集コンポーネントの終了位置が見つかりません。')
  jsx = jsx.slice(0, endingIndex) + '\n  , document.body)\n}\n' + jsx.slice(endingIndex + ending.length)

  css += `
/* ${marker} */
/* transformed祖先の影響を避け、Portalを常に実画面へ固定する */
.estimateEditorBackdrop{
  position:fixed!important;
  inset:0!important;
  width:100vw!important;
  height:100dvh!important;
  z-index:2147483000!important;
  display:flex!important;
  align-items:flex-start!important;
  justify-content:center!important;
  overflow:hidden!important;
  padding:12px!important;
  box-sizing:border-box!important;
}
.estimateEditorPanel{
  position:relative!important;
  top:0!important;
  margin:0!important;
  max-height:calc(100dvh - 24px)!important;
  overflow-y:auto!important;
  overscroll-behavior:contain!important;
}
@media(max-width:620px){
  .estimateEditorBackdrop{padding:0!important}
  .estimateEditorPanel{
    width:100vw!important;
    height:100dvh!important;
    max-height:100dvh!important;
    border-radius:0!important;
  }
}
`

  fs.writeFileSync(jsxPath, jsx, 'utf8')
  fs.writeFileSync(cssPath, css, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 見積編集画面をPortal化し、先頭固定V3のビルド成功を確認しました。')
  console.log('  - PC/スマホとも画面上端から開始')
  console.log('  - transformed祖先の影響を回避')
  console.log('  - 描画後に3回scrollTop=0を適用')
  console.log('BACKUP: ' + jsxBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(jsxBackup)) fs.copyFileSync(jsxBackup, jsxPath)
  if (fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup, cssPath)
  process.exit(1)
}
