const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step16-8-remove-pdf-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP16_8_REMOVE_PDF_IMPORT */'
if (s.includes(marker)) { console.log('PDF取込UI削除は適用済みです'); process.exit(0) }

const pdfText = '📄 PDFから案件登録'
const pos = s.indexOf(pdfText)
if (pos === -1) { console.error('PDFから案件登録ボタンが見つかりません。変更しませんでした。'); process.exit(1) }
const buttonStart = s.lastIndexOf('<button', pos)
const buttonEnd = s.indexOf('</button>', pos)
if (buttonStart === -1 || buttonEnd === -1) { console.error('PDFボタン範囲を特定できません。'); process.exit(1) }
let removeStart = buttonStart
let removeEnd = buttonEnd + '</button>'.length

// Immediately following hidden PDF file input is also removed.
const after = s.slice(removeEnd, removeEnd + 900)
const inputMatch = after.match(/^\s*<input[\s\S]*?residentPdfInputRef[\s\S]*?\/>/)
if (inputMatch) removeEnd += inputMatch[0].length
s = s.slice(0, removeStart) + s.slice(removeEnd)

// Remove stale PDF source filename and source preview from normal quick-input UI.
s = s.replace(/\s*\{residentPdfFileName && <p className="residentPdfSource">[\s\S]*?<\/p>\}/, '')
s = s.replace(/\s*\{residentPdfSourceText && <details open className="residentSourceBox">[\s\S]*?<\/details>\}/, '')

// Simplify subtitle to the intended workflow.
const subtitles = [
  '文章はここへ貼り付け。PDFを選んだ場合は自動解析し、下の「登録前の確認」に結果だけ表示します。',
  '依頼メールやメッセージをそのまま貼り付けます。'
]
for (const text of subtitles) {
  s = s.replace(`<p className="subtitle">${text}</p>`, '<p className="subtitle">PDFやメールの必要な文章をコピーして貼り付け、ローカルAIで整理します。</p>')
}

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) { console.error('CSS位置が見つかりません。'); process.exit(1) }
const css = `/* M-CROSS_RESIDENT_STEP16_8_REMOVE_PDF_IMPORT */\n.residentPdfSource{display:none!important}\n`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('PDFから案件登録UI削除 OK')
console.log('今後は PDFの必要なテキストをコピー → 依頼文から簡単入力 → ローカルAIで読み取る の一本化です')
console.log('PDF/OCR関連コードは内部に残すため、必要なら将来再利用できます')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
