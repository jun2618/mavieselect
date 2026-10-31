const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.step19-2-use-actual-estimate-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_STEP19_2_USE_ACTUAL_ESTIMATE */'

if (s.includes(marker)) {
  console.log('実際の概算値を使う修正は適用済みです')
  process.exit(0)
}

if (!s.includes('function createWorkOrderFromRestoration()')) {
  console.error('原状回復→工事案件の関数が見つかりません。変更しませんでした。')
  process.exit(1)
}

// 1. 完成済みの estimateRows / totalAmount を受け取る関数へ変更。
s = s.replace(
  '  function createWorkOrderFromRestoration() {',
  `  ${marker}\n  function createWorkOrderFromRestoration(actualEstimateRows = [], actualTotalAmount = 0) {`
)

// 2. 前回追加した再計算ブロックを削除し、画面の実値から明細を正規化。
const calcStart = s.indexOf('    /* M-CROSS_STEP19_2_ESTIMATE_TRANSFER_FIX */', s.indexOf('function createWorkOrderFromRestoration'))
const nowLine = s.indexOf('    const now = new Date().toISOString()', calcStart)

if (calcStart === -1 || nowLine === -1) {
  console.error('前回の見積再計算ブロックが見つかりません。変更しませんでした。')
  process.exit(1)
}

const actualCalculation = `    const estimateItems = (Array.isArray(actualEstimateRows) ? actualEstimateRows : []).map((row, index) => ({
      id: row.id || 'estimate-' + index,
      category: row.category || row.group || row.room || row.type || '',
      name: row.name || row.label || row.work || row.item || row.displayName || row.type || '工事項目',
      specification: row.specification || row.spec || row.memo || row.note || '',
      quantity: Number(row.quantity ?? row.qty ?? row.count ?? 0) || 0,
      unit: row.unit || '',
      unitPrice: Number(row.unitPrice ?? row.price ?? row.rate ?? 0) || 0,
      amount: Number(row.amount ?? row.total ?? row.subtotal ?? 0) || 0,
      sourceType: 'mcrossActualEstimate',
    }))

    const estimateAmount = Math.max(0, Number(actualTotalAmount) || 0)

`

s = s.slice(0, calcStart) + actualCalculation + s.slice(nowLine)

// 3. 概算画面のボタンから、実際に表示中の estimateRows と totalAmount を渡す。
const callNeedle = '                        createWorkOrderFromRestoration()'
if (!s.includes(callNeedle)) {
  console.error('「工事案件へ進む」の呼び出し位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(callNeedle, '                        createWorkOrderFromRestoration(estimateRows, totalAmount)')

// 4. 引継ぎ状態は実際の合計または明細があれば作成中。
const statusNeedle = `      estimateStatus: estimateItems.length > 0 ? '作成中' : '未作成',`
if (s.includes(statusNeedle)) {
  s = s.replace(statusNeedle, `      estimateStatus: estimateItems.length > 0 || estimateAmount > 0 ? '作成中' : '未作成',`)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('実際の概算金額・明細引継ぎ修正 OK')
console.log('概算画面の estimateRows を工事案件の見積明細へ直接渡します')
console.log('概算画面の totalAmount を工事案件の見積金額へ直接渡します')
console.log('既存工事案件には遡及せず、新しく作成する原状回復工事案件から反映されます')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
