const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.step20-12-buffer-fix-backup'
const marker = '/* M-CROSS_STEP20_12_BUFFER_FIX */'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
if (s.includes(marker)) {
  console.log('STEP20.12 Buffer修正は適用済みです')
  process.exit(0)
}

if (!s.includes("const populateModule = await import('xlsx-populate')")) {
  console.error('STEP20.11のxlsx-populate処理が見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(
  "      const populateModule = await import('xlsx-populate')",
  `      ${marker}\n      const bufferModule = await import('buffer')\n      if (!globalThis.Buffer) globalThis.Buffer = bufferModule.Buffer\n      const populateModule = await import('xlsx-populate')`
)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP20.12 Buffer修正 OK')
console.log('ブラウザ環境へBufferを追加してからxlsx-populateを読み込みます')
console.log('元の見積書テンプレート保持方式は変更しません')
console.log('バックアップ:', backup)
console.log('次に npm install buffer を実行してください')
console.log('その後 npm run build → npm run dev を実行してください')
