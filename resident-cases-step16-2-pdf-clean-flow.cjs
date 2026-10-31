const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step16-2-pdf-clean-flow-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP16_2_PDF_CLEAN_FLOW */'
if (s.includes(marker)) { console.log('STEP16.2は適用済みです'); process.exit(0) }
if (!s.includes('M-CROSS_RESIDENT_STEP16_1_PHONE_PDF_AI')) { console.error('STEP16.1が見つかりません。変更しませんでした。'); process.exit(1) }

// PDFを選んだ瞬間に、前回の依頼文・確認結果を必ず消す。
const startNeedle = `  async function importResidentCasePdf(fileValue) {
    if (!fileValue) return
    setResidentPdfLoading(true)`
if (!s.includes(startNeedle)) { console.error('PDF取込開始位置が見つかりません。変更しませんでした。'); process.exit(1) }
const startReplacement = `  async function importResidentCasePdf(fileValue) {
    if (!fileValue) return
    ${marker}
    setResidentQuickPasteText('')
    setResidentQuickPreview(null)
    setResidentQuickError('')
    setResidentAiStatus('PDFを読み取っています…')
    setResidentPdfLoading(true)`
s = s.replace(startNeedle, startReplacement)

// PDF解析成功後は、生のPDF全文を「依頼文」欄へ残さない。
// AI解析には extractedText を直接渡しているため、textareaに残す必要はありません。
const rawTextNeedle = `      setResidentQuickPasteText(extractedText)
      setResidentQuickPreview({`
if (!s.includes(rawTextNeedle)) { console.error('PDF全文を依頼文欄へ入れる処理が見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(rawTextNeedle, `      setResidentQuickPasteText('')
      setResidentQuickPreview({`)

// PDF取込時は確認画面を開き、AI解析結果だけ見せる。
const showNeedle = `      setShowResidentQuickPaste(true)
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))`
if (s.includes(showNeedle)) {
  s = s.replace(showNeedle, `      setShowResidentQuickPaste(true)
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))`)
}

// 説明文を用途別に分かりやすくする。
const subtitle = `<p className="subtitle">依頼メールやメッセージをそのまま貼り付けます。</p>`
if (s.includes(subtitle)) {
  s = s.replace(subtitle, `<p className="subtitle">文章はここへ貼り付け。PDFを選んだ場合は自動解析し、下の「登録前の確認」に結果だけ表示します。</p>`)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('STEP16.2 PDFクリーンフロー OK')
console.log('PDF選択時に前回の依頼文・確認結果をクリアします')
console.log('PDF全文は依頼文欄へ残さず、AI解析結果だけ登録前確認へ表示します')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
