const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.step20-13-xlsx-populate-browser-build-backup'
const marker = '/* M-CROSS_STEP20_13_XLSX_POPULATE_BROWSER_BUILD */'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
if (s.includes(marker)) {
  console.log('STEP20.13 ブラウザ版修正は適用済みです')
  process.exit(0)
}

const oldBlock = `      const bufferModule = await import('buffer')
      if (!globalThis.Buffer) globalThis.Buffer = bufferModule.Buffer
      const populateModule = await import('xlsx-populate')
      const XlsxPopulate = populateModule.default || populateModule`

if (!s.includes(oldBlock)) {
  console.error('STEP20.12のxlsx-populate読込処理が見つかりません。変更しませんでした。')
  process.exit(1)
}

const newBlock = `      ${marker}
      // Node.js版ではなく、fs・crypto・processを要求しない公式ブラウザビルドを使います。
      const populateModule = await import('xlsx-populate/browser/xlsx-populate.min.js')
      const XlsxPopulate = populateModule.default || globalThis.XlsxPopulate || populateModule
      if (!XlsxPopulate?.fromDataAsync) throw new Error('xlsx-populateブラウザ版を初期化できません')`

s = s.replace(oldBlock, newBlock)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP20.13 xlsx-populateブラウザ版への切替 OK')
console.log('process / fs / crypto / streamを要求するNode.js版の読込を廃止しました')
console.log('町田さんの見積書テンプレートを保持し、セル値だけ差し替える方針は維持します')
console.log('bufferパッケージは残っていても問題ありません')
console.log('バックアップ:', backup)
console.log('次に npm run build → npm run dev を実行してください')
