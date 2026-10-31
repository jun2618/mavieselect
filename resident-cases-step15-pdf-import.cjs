const fs = require('fs')

const appFile = './src/App.jsx'
const packageFile = './package.json'
const backup = './src/App.jsx.resident-cases-step15-pdf-import-backup'

if (!fs.existsSync(appFile)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(appFile, 'utf8')
const marker = '/* M-CROSS_RESIDENT_CASES_STEP15_PDF_IMPORT */'

if (s.includes(marker)) {
  console.log('STEP15 PDF取り込みはすでに適用済みです')
  process.exit(0)
}

if (!s.includes('parseResidentRequestText') || !s.includes('showResidentQuickPaste')) {
  console.error('STEP12の簡単入力完全版が見つかりません。変更しませんでした。')
  process.exit(1)
}

// pdfjs-dist dependency check. The patch is still written, but npm install is required when missing.
let hasPdfJs = false
if (fs.existsSync(packageFile)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'))
    hasPdfJs = Boolean(pkg.dependencies?.['pdfjs-dist'] || pkg.devDependencies?.['pdfjs-dist'])
  } catch {
    // package.json validation is handled by npm later.
  }
}

// 1. State and file input ref.
const stateTarget = "  const [residentQuickError, setResidentQuickError] = useState('')"
if (!s.includes(stateTarget)) {
  console.error('簡単入力stateが見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(stateTarget, `${stateTarget}
  ${marker}
  const residentPdfInputRef = useRef(null)
  const [residentPdfLoading, setResidentPdfLoading] = useState(false)
  const [residentPdfFileName, setResidentPdfFileName] = useState('')`)

// 2. PDF extraction/import function inside App.
const functionTarget = '  function updateResidentCase(caseId, patch, historyStatus = \'\', historyMemo = \'\') {'
if (!s.includes(functionTarget)) {
  console.error('案件更新関数の位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const pdfFunction = `  async function importResidentCasePdf(fileValue) {
    if (!fileValue) return
    setResidentPdfLoading(true)
    setResidentPdfFileName(fileValue.name || '')
    setResidentQuickError('')
    setResidentQuickPreview(null)

    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const bytes = new Uint8Array(await fileValue.arrayBuffer())
      const pdf = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise
      const pageTexts = []

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber)
        const content = await page.getTextContent()
        const text = content.items
          .map(item => typeof item.str === 'string' ? item.str : '')
          .filter(Boolean)
          .join(' ')
          .trim()
        if (text) pageTexts.push(text)
      }

      const extractedText = pageTexts.join('\\n')
      if (!extractedText.trim()) {
        setResidentQuickError('PDFから文字を読み取れませんでした。画像だけのPDFは依頼文へ手入力してください。')
        setShowResidentQuickPaste(true)
        return
      }

      const parsed = parseResidentRequestText(extractedText, mergedPropertyMaster)
      setResidentQuickPasteText(extractedText)
      setResidentQuickPreview({
        ...parsed,
        note: [parsed.note, '取込元PDF：' + (fileValue.name || 'PDF')].filter(Boolean).join('\\n'),
      })
      setResidentQuickCompanyId(
        mergedPropertyMaster.companies.find(companyItem => companyItem.name === parsed.company)?.id || ''
      )
      setResidentQuickError(
        !parsed.propertyName || !parsed.requestDetails
          ? '一部の項目を読み取れませんでした。登録前に内容を確認・修正してください。'
          : ''
      )
      setShowResidentQuickPaste(true)
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    } catch (error) {
      console.error(error)
      setResidentQuickError('PDFを読み込めませんでした。PDF形式またはpdfjs-distの導入状況をご確認ください。')
      setShowResidentQuickPaste(true)
    } finally {
      setResidentPdfLoading(false)
      if (residentPdfInputRef.current) residentPdfInputRef.current.value = ''
    }
  }

`

s = s.replace(functionTarget, pdfFunction + functionTarget)

// 3. Add PDF button after the visible quick-paste button.
const quickText = '📋 依頼文から簡単入力'
const quickPos = s.indexOf(quickText)
if (quickPos === -1) {
  console.error('簡単入力ボタンが見つかりません。変更しませんでした。')
  process.exit(1)
}
const quickEnd = s.indexOf('</button>', quickPos)
if (quickEnd === -1) {
  console.error('簡単入力ボタンの終了位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
const insertAt = quickEnd + '</button>'.length

const pdfButton = `
                    <button
                      className="secondaryButton residentPdfImportButton"
                      type="button"
                      disabled={residentPdfLoading}
                      onClick={() => residentPdfInputRef.current?.click()}
                    >
                      {residentPdfLoading ? 'PDFを読み取り中…' : '📄 PDFから案件登録'}
                    </button>
                    <input
                      ref={residentPdfInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      hidden
                      onChange={event => importResidentCasePdf(event.target.files?.[0])}
                    />`

s = s.slice(0, insertAt) + pdfButton + s.slice(insertAt)

// 4. Show selected PDF name in the confirmation UI.
const quickTitleTarget = '<p className="subtitle">依頼メールやメッセージをそのまま貼り付けます。</p>'
if (s.includes(quickTitleTarget)) {
  s = s.replace(quickTitleTarget, `${quickTitleTarget}
                    {residentPdfFileName && <p className="residentPdfSource">取込元：{residentPdfFileName}</p>}`)
}

// 5. Styling.
const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) {
  console.error('CSS追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const css = `/* M-CROSS_RESIDENT_CASES_STEP15_PDF_IMPORT_STYLE */
.residentImportActions .residentPdfImportButton{width:auto;margin:0}.residentPdfSource{margin:0;padding:8px 10px;border-radius:10px;background:rgba(75,130,205,.08);color:#5f6f85;font-size:12px;font-weight:800}.residentPdfImportButton:disabled{opacity:.55;cursor:progress}@media(max-width:620px){.residentImportActions .residentPdfImportButton{width:100%}}
`

s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(appFile, backup)
fs.writeFileSync(appFile, s, 'utf8')

console.log('STEP15 PDF取り込み OK')
console.log('PDF選択 → 文字抽出 → M-Crossマスター照合 → 登録前確認を追加しました')
console.log('画像だけのPDFはOCR対象外のため、依頼文への手入力が必要です')
console.log('バックアップ:', backup)
if (!hasPdfJs) {
  console.log('重要: pdfjs-distが未導入です。次に npm install pdfjs-dist を実行してください')
}
console.log('その後 npm run build を実行してください')
