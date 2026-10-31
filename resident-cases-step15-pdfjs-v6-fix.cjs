const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step15-pdfjs-v6-fix-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP15_PDFJS_V6_FIX */'

if (s.includes(marker)) {
  console.log('PDF.js v6修正は適用済みです')
  process.exit(0)
}

const importOld = "      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')"
if (!s.includes(importOld)) {
  console.error('STEP15のpdfjs importが見つかりません。変更しませんでした。')
  process.exit(1)
}

const importNew = `      ${marker}
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const workerUrl = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString()
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl`
s = s.replace(importOld, importNew)

const getDocumentOld = "      const pdf = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise"
const getDocumentNew = "      const pdf = await pdfjs.getDocument({ data: bytes }).promise"
if (!s.includes(getDocumentOld)) {
  console.error('STEP15のgetDocument呼び出しが見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(getDocumentOld, getDocumentNew)

// エラー文を実際の原因が見えるように改善
const errorOld = "      setResidentQuickError('PDFを読み込めませんでした。PDF形式またはpdfjs-distの導入状況をご確認ください。')"
const errorNew = "      setResidentQuickError('PDFを読み込めませんでした：' + (error?.message || String(error)))"
if (s.includes(errorOld)) s = s.replace(errorOld, errorNew)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP15 PDF.js v6修正 OK')
console.log('pdfjs-dist 6.4.299用にworkerを設定しました')
console.log('disableWorker指定を外しました')
console.log('PDFエラー時は具体的なエラー内容を画面表示します')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
