const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-mobile-horizontal')
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}
let source = fs.readFileSync(file, 'utf8')
fs.copyFileSync(file, backup)
console.log('OK: バックアップ作成 ' + backup)

// 概算行は既存の buildEstimateRows を使うことで、メモなし合算／メモあり別項目を統一。
const oldStart = source.indexOf('{showEstimate ? (() => {')
if (oldStart === -1) {
  console.error('概算画面が見つかりません。変更せず終了しました。')
  process.exit(1)
}

// CSS: スマホでも「項目 / 数量 / 単価 / 金額」を横並び固定にする。
const cssAnchor = '  .estimateRow b { font-size:14px; color:#5b525d; }'
if (!source.includes(cssAnchor)) {
  console.error('概算CSSの追加位置が見つかりません。変更せず終了しました。')
  process.exit(1)
}
const css = `${cssAnchor}
  .estimateRow { display:grid; grid-template-columns:minmax(0,1fr) 54px 72px 72px; gap:8px; align-items:center; }
  .estimateRow > span:first-child { min-width:0; overflow-wrap:anywhere; font-weight:800; color:#5b525d; }
  .estimateRow .estimateQuantity,
  .estimateRow .estimateRate,
  .estimateRow b { text-align:right; white-space:nowrap; }
  .estimateMemo { display:block; margin-top:3px; color:#b07c9c; font-size:11px; font-weight:700; line-height:1.25; }
  @media (max-width: 520px) {
    .estimateRoomCard { padding:12px 12px 8px; }
    .estimateRoomCard h3 { margin-bottom:8px; }
    .estimateRow { grid-template-columns:minmax(0,1fr) 50px 68px 70px; gap:5px; padding:10px 0; font-size:12px; }
    .estimateRow b { font-size:12px; }
  }`
source = source.replace(cssAnchor, css)
console.log('OK: スマホでも概算4列を横並びに固定')

// 概算表示のラベルにメモを個別表示。数量・単価・金額は右側3列。
const oldRow = `<span>{row.label}</span>
                          <span>{formatQuantity(row.quantity)}{row.unit}</span>
                          <span>× {formatYen(row.rate)}</span>
                          <b>{formatYen(row.amount)}</b>`
const newRow = `<span>
                            {row.label}
                            {row.memo && <small className="estimateMemo">{row.memo}</small>}
                          </span>
                          <span className="estimateQuantity">{formatQuantity(row.quantity)}{row.unit}</span>
                          <span className="estimateRate">× {formatYen(row.rate)}</span>
                          <b>{formatYen(row.amount)}</b>`
const rowCount = source.split(oldRow).length - 1
if (rowCount !== 1) {
  console.error(`概算行の表示箇所を特定できません（一致数: ${rowCount}）。変更せず終了しました。`)
  process.exit(1)
}
source = source.replace(oldRow, newRow)
console.log('OK: 概算でメモあり項目を個別表示')

fs.writeFileSync(file, source, 'utf8')
console.log('OK: 数量集計は現在の見積集計ルールをそのまま使用')
console.log('完了: 次に npm run build を実行してください。')
