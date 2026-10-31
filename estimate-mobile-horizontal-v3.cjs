const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-mobile-horizontal-v3')
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}
let source = fs.readFileSync(file, 'utf8')
const original = source

const oldCss = `    .estimateRow { grid-template-columns:minmax(0,1fr) auto; }
    .estimateRow .estimateUnit,.estimateRow .estimateRate { grid-column:1 / -1; text-align:left; color:#958896; }
    .estimateRow .estimateNumber { text-align:left; }`
const newCss = `    .estimateRow { grid-template-columns:minmax(0,1fr) 52px 68px 72px; gap:5px; align-items:center; }
    .estimateRow .estimateUnit,.estimateRow .estimateRate { grid-column:auto; text-align:right; color:#958896; white-space:nowrap; }
    .estimateRow .estimateNumber { text-align:right; white-space:nowrap; }
    .estimateRow > strong { min-width:0; overflow-wrap:anywhere; font-size:12px; line-height:1.35; }
    .estimateRow > .estimateNumber > strong { white-space:nowrap; font-size:12px; }
    .estimateMemo { display:block; margin-top:3px; color:#b07c9c; font-size:11px; font-weight:700; line-height:1.25; }`

const cssCount = source.split(oldCss).length - 1
if (cssCount !== 1) {
  console.error(`スマホ用概算CSSを特定できません（一致数: ${cssCount}）。変更せず終了しました。`)
  process.exit(1)
}

const oldLabel = `<strong>{row.label}</strong>`
const newLabel = `<strong>{row.label}{row.memo && <small className="estimateMemo">{row.memo}</small>}</strong>`
const labelCount = source.split(oldLabel).length - 1
if (labelCount !== 1) {
  console.error(`概算の項目名表示を特定できません（一致数: ${labelCount}）。変更せず終了しました。`)
  process.exit(1)
}

fs.copyFileSync(file, backup)
source = source.replace(oldCss, newCss)
source = source.replace(oldLabel, newLabel)

if (source === original) {
  console.error('変更がありません。')
  process.exit(1)
}
fs.writeFileSync(file, source, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('OK: スマホ概算を4列横並びに変更')
console.log('OK: メモありは項目名の下にメモを表示')
console.log('OK: メモなし合算／メモあり別項目の集計処理は変更していません')
console.log('完了: 次に npm run build を実行してください。')
