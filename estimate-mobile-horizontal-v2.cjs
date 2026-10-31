const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-mobile-horizontal-v2')
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}
let source = fs.readFileSync(file, 'utf8')
const original = source

// 現在確認できたCSSを狙って安全に変更
const oldMedia = `    .estimateRow { grid-template-columns:minmax(0,1fr) auto; }
    .estimateRow .estimateUnit,.estimateRow .estimateRate { grid-column:1 / -1; text-align:left; color:#958896; }
    .estimateRow .estimateNumber { text-align:left; }`
const newMedia = `    .estimateRow { grid-template-columns:minmax(0,1fr) 52px 68px 72px; gap:5px; align-items:center; }
    .estimateRow .estimateUnit,.estimateRow .estimateRate { grid-column:auto; text-align:right; color:#958896; white-space:nowrap; }
    .estimateRow .estimateNumber { text-align:right; white-space:nowrap; }
    .estimateRow strong { text-align:right; white-space:nowrap; font-size:12px; }
    .estimateRow > span:first-child { min-width:0; overflow-wrap:anywhere; }
    .estimateMemo { display:block; margin-top:3px; color:#b07c9c; font-size:11px; font-weight:700; line-height:1.25; }`

const mediaCount = source.split(oldMedia).length - 1
if (mediaCount !== 1) {
  console.error(`スマホ用概算CSSを特定できません（一致数: ${mediaCount}）。変更せず終了しました。`)
  process.exit(1)
}

// 現在のJSXクラス名に合わせて、項目名の下へメモを追加
const rowRegex = /<div className="estimateRow" key=\{row\.category \+ '-' \+ row\.label \+ '-' \+ index\}>[\s\S]*?<\/div>/
const match = source.match(rowRegex)
if (!match) {
  console.error('概算行のJSXを特定できません。変更せず終了しました。')
  process.exit(1)
}
let rowBlock = match[0]
// row.labelの表示spanだけを置換。既存クラス名・数量・単価・金額は温存
const labelRegex = /<span>\{row\.label\}<\/span>/
if (!labelRegex.test(rowBlock)) {
  console.error('概算の項目名表示を特定できません。変更せず終了しました。')
  process.exit(1)
}
const newLabel = `<span>{row.label}{row.memo && <small className="estimateMemo">{row.memo}</small>}</span>`
rowBlock = rowBlock.replace(labelRegex, newLabel)

fs.copyFileSync(file, backup)
source = source.replace(oldMedia, newMedia)
source = source.replace(match[0], rowBlock)

if (source === original) {
  console.error('変更がありません。')
  process.exit(1)
}
fs.writeFileSync(file, source, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('OK: スマホ概算を「項目｜数量｜単価｜金額」の横並びに変更')
console.log('OK: メモあり項目は項目名の下にメモを表示')
console.log('OK: 集計ロジックには触れていません')
console.log('完了: 次に npm run build を実行してください。')
