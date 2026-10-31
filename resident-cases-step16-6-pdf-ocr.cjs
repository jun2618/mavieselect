const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step16-6-pdf-ocr-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP16_6_PDF_OCR */'

if (s.includes(marker)) {
  console.log('STEP16.6 PDF OCRは適用済みです')
  process.exit(0)
}

if (!s.includes('async function importResidentCasePdf(fileValue)')) {
  console.error('PDF取込関数が見つかりません。変更しませんでした。')
  process.exit(1)
}

// OCR fallback helper: only runs when PDF.js cannot obtain a usable text layer.
const functionTarget = '  async function importResidentCasePdf(fileValue) {'
const helper = `  ${marker}
  async function ocrResidentPdfPages(pdf) {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('jpn+eng', 1, {
      logger: message => {
        if (message?.status === 'recognizing text') {
          setResidentAiStatus('PDF画像をOCR中… ' + Math.round((message.progress || 0) * 100) + '%')
        } else if (message?.status) {
          setResidentAiStatus('PDF画像をOCR準備中…')
        }
      },
    })

    try {
      const texts = []
      const pageLimit = Math.min(pdf.numPages, 3)
      for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
        setResidentAiStatus('PDF画像をOCR中… ' + pageNumber + '/' + pageLimit + 'ページ')
        const page = await pdf.getPage(pageNumber)
        const viewport = page.getViewport({ scale: 1.8 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) continue
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        await page.render({ canvasContext: context, viewport }).promise
        const result = await worker.recognize(canvas)
        const pageText = String(result?.data?.text || '').trim()
        if (pageText) texts.push(pageText)
        canvas.width = 1
        canvas.height = 1
      }
      return texts.join('\\n')
    } finally {
      await worker.terminate()
    }
  }

`
s = s.replace(functionTarget, helper + functionTarget)

// Turn extractedText into let and OCR when the PDF text layer is empty or implausibly short.
const extractionTarget = `      const extractedText = pageTexts.join('\\n')
      setResidentPdfSourceText(extractedText)`
if (!s.includes(extractionTarget)) {
  console.error('PDF文字抽出結果の位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const extractionReplacement = `      let extractedText = pageTexts.join('\\n').trim()
      const compactExtractedText = extractedText.replace(/[\\s　]+/g, '')
      if (compactExtractedText.length < 40) {
        setResidentAiStatus('文字レイヤーが不足しているためOCRへ切り替えます…')
        extractedText = await ocrResidentPdfPages(pdf)
      }
      setResidentPdfSourceText(extractedText)`
s = s.replace(extractionTarget, extractionReplacement)

// Replace the old terminal error with an OCR-specific one.
const oldEmptyMessages = [
  `        setResidentQuickError('このPDFから文字レイヤーを取得できませんでした。画像PDFとは断定しません。OCR読み取りは次の段階で追加します。')`,
  `        setResidentQuickError('画像だけのPDFはまだOCRできません。PDF画像OCRは次の段階で追加します。')`,
  `        setResidentQuickError('PDFから文字を読み取れませんでした。画像だけのPDFは依頼文へ手入力してください。')`,
]
for (const oldMessage of oldEmptyMessages) {
  if (s.includes(oldMessage)) {
    s = s.replace(oldMessage, `        setResidentQuickError('PDFの文字抽出とOCRの両方で文章を取得できませんでした。元PDFをご確認ください。')`)
  }
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP16.6 PDF OCRフォールバック OK')
console.log('文字レイヤーが無い、または短すぎるPDFは自動で日本語OCRへ切り替えます')
console.log('OCR対象は先頭3ページ、PDF元文章にもOCR結果を表示します')
console.log('バックアップ:', backup)
console.log('重要: 次に npm install tesseract.js を実行してください')
console.log('その後 npm run build を実行してください')
