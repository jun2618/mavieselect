const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.step20-1-clean-template-values-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_STEP20_1_CLEAN_TEMPLATE_VALUES */'
if (s.includes(marker)) { console.log('STEP20.1は適用済みです'); process.exit(0) }
if (!s.includes('/* M-CROSS_STEP20_TEMPLATE_STYLE_FIX */')) { console.error('STEP20テンプレート版が見つかりません。'); process.exit(1) }

// 会社ロゴ・会社情報エリアはテンプレートを一切変更しない。
// 未使用明細行は数式も含め完全空欄にして #VALUE! を防ぐ。
const blankOld = `        ws.getCell('K' + rowNumber).value = { formula: 'H' + rowNumber + '*J' + rowNumber }`
if (!s.includes(blankOld)) { console.error('空明細の金額処理が見つかりません。'); process.exit(1) }
s = s.replace(blankOld, `        ws.getCell('K' + rowNumber).value = ''`)

// 明細金額はM-Crossで確定済みの値をそのまま出力する。
const itemOld = `        ws.getCell('K' + rowNumber).value = Number(item.amount || 0)`
if (!s.includes(itemOld)) { console.error('明細金額出力が見つかりません。'); process.exit(1) }
s = s.replace(itemOld, `        ws.getCell('K' + rowNumber).value = Number(item.amount || 0)`)

// ExcelJSで外部参照/数式キャッシュに依存しないよう合計は値として確定する。
const totalsOld = `      // テンプレート本来の小計→消費税→合計を維持。
      ws.getCell('K55').value = { formula: 'SUM(K23:K54)' }
      ws.getCell('K56').value = { formula: 'ROUNDDOWN(K55*0.1,0)' }
      ws.getCell('K57').value = { formula: 'SUM(K55:K56)' }
      ws.getCell('E19').value = { formula: 'K57' }`
if (!s.includes(totalsOld)) { console.error('合計数式ブロックが見つかりません。'); process.exit(1) }
const totalsNew = `      ${marker}
      const subtotalValue = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      const taxValue = Math.floor(subtotalValue * 0.1)
      const totalValue = subtotalValue + taxValue
      ws.getCell('K55').value = subtotalValue
      ws.getCell('K56').value = taxValue
      ws.getCell('K57').value = totalValue
      ws.getCell('E19').value = totalValue`
s = s.replace(totalsOld, totalsNew)

// 無記載は空白。会社名・物件名・住所・号室も値が無いとき文字を足さない。
s = s.replace(
  `      ws.getCell('B5').value = (workOrder.company || '') + (workOrder.company ? '　御中' : '')`,
  `      ws.getCell('B5').value = workOrder.company ? workOrder.company + '　御中' : ''`
)
s = s.replace(
  `      ws.getCell('G13').value = workOrder.unit ? '号室' : ''`,
  `      ws.getCell('G13').value = workOrder.unit ? '号室' : ''`
)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('STEP20.1 見積書の空白・金額修正 OK')
console.log('未使用明細は金額セルを含め完全空白にします')
console.log('#VALUE!防止のため小計・税・合計・御見積金額はM-Cross確定値を書き込みます')
console.log('テンプレートのMSロゴ・会社情報の位置と大きさには触れません')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
