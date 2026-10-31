const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const editorPath = path.join(root, 'src', 'EstimateRowEditor.jsx')
const cssPath = path.join(root, 'src', 'EstimateRowEditor.css')
const editorBackup = editorPath + '.before-mobile-scroll-v1'
const cssBackup = cssPath + '.before-mobile-scroll-v1'
const marker = 'M-CROSS_ESTIMATE_EDITOR_MOBILE_SCROLL_V1_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(editorPath)) fail('src/EstimateRowEditor.jsx が見つかりません。')
if (!fs.existsSync(cssPath)) fail('src/EstimateRowEditor.css が見つかりません。')

let editor = fs.readFileSync(editorPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')
if (editor.includes(marker)) {
  console.log('SKIP: スマホ編集画面スクロール修正V1は適用済みです。')
  process.exit(0)
}

const importOld = "import { useEffect, useState } from 'react'"
const functionOld = `export default function EstimateRowEditor({ value, onClose, onSave, onReset }) {
  const [form, setForm] = useState(value)
  useEffect(() => setForm(value), [value])`
const panelOld = `<section className="estimateEditorPanel" role="dialog" aria-modal="true" aria-label="見積明細を編集" onClick={event => event.stopPropagation()}>`

if (!editor.includes(importOld)) fail('React importが想定と違います。変更していません。')
if (!editor.includes(functionOld)) fail('編集コンポーネント冒頭が想定と違います。変更していません。')
if (!editor.includes(panelOld)) fail('編集パネル要素が見つかりません。変更していません。')

fs.copyFileSync(editorPath, editorBackup)
fs.copyFileSync(cssPath, cssBackup)

try {
  editor = editor.replace(importOld, "import { useEffect, useRef, useState } from 'react'")
  editor = editor.replace(functionOld, `export default function EstimateRowEditor({ value, onClose, onSave, onReset }) {
  /* ${marker} */
  const [form, setForm] = useState(value)
  const panelRef = useRef(null)

  useEffect(() => {
    setForm(value)
    if (!value) return

    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.scrollTo({ top: 0, behavior: 'auto' })
      panelRef.current?.querySelector('input')?.focus({ preventScroll: true })
    })

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
    }
  }, [value])`)
  editor = editor.replace(panelOld, `<section ref={panelRef} className="estimateEditorPanel" role="dialog" aria-modal="true" aria-label="見積明細を編集" onClick={event => event.stopPropagation()}>`)

  css += `
/* ${marker} */
.estimateEditorBackdrop{overscroll-behavior:contain}
.estimateEditorPanel{scroll-behavior:auto;overscroll-behavior:contain}
@media(max-width:620px){
  .estimateEditorBackdrop{align-items:stretch;overflow:hidden}
  .estimateEditorPanel{position:relative;inset:auto;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-top:max(16px,env(safe-area-inset-top));padding-bottom:max(16px,env(safe-area-inset-bottom))}
  .estimateEditorHeader{position:sticky;top:0;z-index:2;padding-bottom:10px;background:inherit}
  .estimateEditorActions{z-index:3;padding-bottom:max(10px,env(safe-area-inset-bottom))}
}
`

  fs.writeFileSync(editorPath, editor, 'utf8')
  fs.writeFileSync(cssPath, css, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: スマホの見積編集画面を先頭表示へ修正し、ビルド成功を確認しました。')
  console.log('  - 開いた直後に編集パネル内部を先頭へ移動')
  console.log('  - 背景画面のスクロールを停止')
  console.log('  - 見出しを上部、操作ボタンを下部に固定')
  console.log('BACKUP: ' + editorBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(editorBackup)) fs.copyFileSync(editorBackup, editorPath)
  if (fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup, cssPath)
  process.exit(1)
}
