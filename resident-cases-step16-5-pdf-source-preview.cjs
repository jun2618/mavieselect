const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step16-5-pdf-source-preview-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP16_5_PDF_SOURCE_PREVIEW */'
if (s.includes(marker)) { console.log('STEP16.5は適用済みです'); process.exit(0) }
if (!s.includes('residentPdfFileName')) { console.error('PDF取込機能が見つかりません。変更しませんでした。'); process.exit(1) }

const stateTarget = "  const [residentPdfFileName, setResidentPdfFileName] = useState('')"
if (!s.includes(stateTarget)) { console.error('PDF stateが見つかりません。'); process.exit(1) }
s = s.replace(stateTarget, `${stateTarget}\n  ${marker}\n  const [residentPdfSourceText, setResidentPdfSourceText] = useState('')`)

// New PDF clears previous source preview.
const clearTarget = `    setResidentQuickPasteText('')
    setResidentQuickPreview(null)`
if (!s.includes(clearTarget)) { console.error('PDF開始時のクリア処理が見つかりません。'); process.exit(1) }
s = s.replace(clearTarget, `    setResidentQuickPasteText('')
    setResidentPdfSourceText('')
    setResidentQuickPreview(null)`)

// Keep extracted PDF source separately, without putting it back in manual-paste textbox.
const extractedNeedle = `      const extractedText = pageTexts.join('\\n')`
if (!s.includes(extractedNeedle)) { console.error('PDF文字抽出位置が見つかりません。'); process.exit(1) }
s = s.replace(extractedNeedle, `${extractedNeedle}
      setResidentPdfSourceText(extractedText)`)

// Do not call a text PDF an image PDF merely because extraction is sparse/empty. Clarify that the PDF text layer could not be obtained.
const emptyText = `        setResidentQuickError('画像だけのPDFはまだOCRできません。PDF画像OCRは次の段階で追加します。')`
if (s.includes(emptyText)) {
  s = s.replace(emptyText, `        setResidentQuickError('このPDFから文字レイヤーを取得できませんでした。画像PDFとは断定しません。OCR読み取りは次の段階で追加します。')`)
}

// Add source/AI side-by-side preview before registration confirmation.
const confirmHeading = `<h3>登録前の確認</h3>`
if (!s.includes(confirmHeading)) { console.error('登録前確認見出しが見つかりません。'); process.exit(1) }
const comparison = `<div className="residentSourceCompare">
                        {residentPdfSourceText && <details open className="residentSourceBox"><summary>PDF元文章</summary><pre>{residentPdfSourceText}</pre></details>}
                        {!residentPdfSourceText && residentQuickPasteText && <details open className="residentSourceBox"><summary>貼り付けた元文章</summary><pre>{residentQuickPasteText}</pre></details>}
                      </div>
                      ${confirmHeading}`
s = s.replace(confirmHeading, comparison)

// When PDF import is finished, show source text even if parsing/AI failed.
const errorCatchNeedle = `      setResidentQuickError('PDFを読み込めませんでした：' + (error?.message || String(error)))`
if (s.includes(errorCatchNeedle)) {
  s = s.replace(errorCatchNeedle, `      setResidentQuickError('PDFを読み込めませんでした：' + (error?.message || String(error)))`)
}

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) { console.error('CSS位置が見つかりません。'); process.exit(1) }
const css = `/* M-CROSS_RESIDENT_STEP16_5_PDF_SOURCE_PREVIEW_STYLE */
.residentSourceCompare{display:grid;gap:10px;margin:2px 0 12px}.residentSourceBox{border:1px solid rgba(100,120,150,.25);border-radius:12px;background:rgba(255,255,255,.7);overflow:hidden}.residentSourceBox summary{padding:10px 12px;font-weight:900;cursor:pointer}.residentSourceBox pre{margin:0;padding:12px;max-height:260px;overflow:auto;white-space:pre-wrap;word-break:break-word;border-top:1px solid rgba(100,120,150,.18);font:inherit;font-size:12px;line-height:1.6}.theme-dark .residentSourceBox,.theme-cyber .residentSourceBox,.theme-luxury .residentSourceBox,.theme-retro .residentSourceBox,.theme-galaxy .residentSourceBox{background:rgba(6,14,26,.75)}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('STEP16.5 PDF元文章確認 OK')
console.log('PDF抽出原文を登録前確認に表示します')
console.log('文字が取れない場合も「画像PDF」と断定せず「文字レイヤー取得不可」と表示します')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
