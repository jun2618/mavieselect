const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-cf-floor-split-only')

if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}

let source = fs.readFileSync(file, 'utf8')
const fnStart = source.indexOf('async function downloadEstimateExcel(')
const fnEnd = source.indexOf('\nfunction createRecordId()', fnStart)
if (fnStart === -1 || fnEnd === -1) {
  console.error('見積用Excel出力処理が見つかりません。変更せず終了しました。')
  process.exit(1)
}

let fn = source.slice(fnStart, fnEnd)
const oldText = "const itemCells = format === 'split' ? row.parts : [row.parts.join(' ')]"
const newText = "const splitParts = row.category === 'cf' ? [row.room, '床', 'CF貼替'] : row.parts\n      const itemCells = format === 'split' ? splitParts : [row.parts.join(' ')]"

const count = fn.split(oldText).length - 1
if (count !== 1) {
  console.error(`変更箇所を特定できません（一致数: ${count}）。`)
  console.error('もし前の「まとめる側CF修正」を実行済みなら、その状態用コードが必要です。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
fn = fn.replace(oldText, newText)
source = source.slice(0, fnStart) + fn + source.slice(fnEnd)
fs.writeFileSync(file, source, 'utf8')

console.log('OK: バックアップ作成 ' + backup)
console.log('OK: 「項目を分ける」のCFだけ変更')
console.log('出力: 居間 | 床 | CF貼替')
console.log('OK: 「項目をまとめる」は変更していません')
console.log('完了: 次に npm run build を実行してください。')
