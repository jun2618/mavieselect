const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.step19-2-estimate-transfer-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_STEP19_2_ESTIMATE_TRANSFER_FIX */'

if (s.includes(marker)) {
  console.log('原状回復の見積引継ぎ修正は適用済みです')
  process.exit(0)
}

if (!s.includes('function createWorkOrderFromRestoration()')) {
  console.error('STEP19.2の原状回復→工事案件処理が見つかりません。変更しませんでした。')
  process.exit(1)
}

// 1. 工事案件データに見積明細を保持できるようにする。
const dataNeedle = `    workDetails: source.workDetails || '',
    estimateAmount: sales,`
if (!s.includes(dataNeedle)) {
  console.error('工事案件データの見積項目が見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(dataNeedle, `    workDetails: source.workDetails || '',
    estimateItems: Array.isArray(source.estimateItems) ? source.estimateItems : [],
    estimateAmount: sales,`)

// 2. 原状回復から工事案件を作る直前に、既存M-Crossの見積計算を実行する。
const nowNeedle = `    const now = new Date().toISOString()
    const workOrder = normalizeWorkOrder({`
if (!s.includes(nowNeedle)) {
  console.error('原状回復工事案件の作成位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const calculation = `    ${marker}
    const factor = Math.max(0, Number(caseCrossFactor) || Number(pricingSettings.crossFactor) || 0)
    const restorationEstimateRows = buildEstimateRows(
      records,
      cfRecords,
      softRecords,
      floorTrimRecords,
      rooms,
      factor,
      pricingSettings
    )

    const normalizedAdditionalWorks = (additionalWorks || []).map((item, index) => {
      const quantity = Number(item.quantity) || 0
      const unitPrice = Number(item.unitPrice) || 0
      const amount = Number(item.amount) || quantity * unitPrice
      return {
        id: item.id || 'additional-' + index,
        category: '追加作業',
        name: item.work || item.name || '追加作業',
        specification: item.memo || '',
        quantity,
        unit: item.unit || '式',
        unitPrice,
        amount,
        sourceType: 'additionalWork',
      }
    })

    const normalizedEstimateRows = restorationEstimateRows.map((row, index) => ({
      id: row.id || 'estimate-' + index,
      category: row.category || row.type || '',
      name: row.name || row.label || row.work || row.item || row.type || '工事項目',
      specification: row.specification || row.spec || row.memo || '',
      quantity: Number(row.quantity ?? row.qty ?? 0) || 0,
      unit: row.unit || '',
      unitPrice: Number(row.unitPrice ?? row.price ?? 0) || 0,
      amount: Number(row.amount ?? 0) || 0,
      sourceType: 'mcrossEstimate',
    }))

    const estimateItems = [...normalizedEstimateRows, ...normalizedAdditionalWorks]
    const estimateAmount = estimateItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

    const now = new Date().toISOString()
    const workOrder = normalizeWorkOrder({`

s = s.replace(nowNeedle, calculation)

// 3. 作成する工事案件へ明細・金額・状態を渡す。
const statusNeedle = `      workDetails: [...new Set(workNames)].join('・') || '原状回復工事',
      estimateStatus: '未作成',`
if (!s.includes(statusNeedle)) {
  console.error('原状回復工事案件の見積状態が見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(statusNeedle, `      workDetails: [...new Set(workNames)].join('・') || '原状回復工事',
      estimateItems,
      estimateAmount,
      estimateStatus: estimateItems.length > 0 ? '作成中' : '未作成',`)

// 4. 工事案件詳細に見積明細を表示する。
const estimateSectionNeedle = `                      <section className="workOrderSection"><h2>見積</h2><div className="workOrderFormGrid">`
if (!s.includes(estimateSectionNeedle)) {
  console.error('工事案件詳細の見積欄が見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(estimateSectionNeedle, `                      <section className="workOrderSection"><h2>見積</h2>
                      {Array.isArray(item.estimateItems) && item.estimateItems.length > 0 && (
                        <div className="workOrderEstimateItems">
                          {item.estimateItems.map((estimateItem, estimateIndex) => (
                            <div className="workOrderEstimateItem" key={estimateItem.id || estimateIndex}>
                              <div><strong>{estimateItem.name || '工事項目'}</strong>{estimateItem.specification && <small>{estimateItem.specification}</small>}</div>
                              <span>{Number(estimateItem.quantity || 0).toLocaleString()} {estimateItem.unit || ''}</span>
                              <span>¥{Number(estimateItem.unitPrice || 0).toLocaleString()}</span>
                              <strong>¥{Number(estimateItem.amount || 0).toLocaleString()}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="workOrderFormGrid">`)

// 5. 見積金額は引継ぎ値を確認できるようにするが、補正編集は残す。
const anchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(anchor)) {
  console.error('CSS追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const css = `/* M-CROSS_STEP19_2_ESTIMATE_TRANSFER_FIX_STYLE */
.workOrderEstimateItems{display:grid;gap:7px}.workOrderEstimateItem{display:grid;grid-template-columns:minmax(0,1fr) 110px 120px 130px;align-items:center;gap:10px;padding:10px 12px;border:1px solid rgba(100,120,150,.18);border-radius:10px;background:rgba(255,255,255,.62)}.workOrderEstimateItem>div{display:grid;gap:2px}.workOrderEstimateItem small{color:#737b87}.workOrderEstimateItem>span,.workOrderEstimateItem>strong{text-align:right}@media(max-width:700px){.workOrderEstimateItem{grid-template-columns:1fr 1fr}.workOrderEstimateItem>div{grid-column:1/-1}.workOrderEstimateItem>span,.workOrderEstimateItem>strong{text-align:left}}
`

s = s.replace(anchor, css + '\n' + anchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('原状回復の見積金額・明細引継ぎ修正 OK')
console.log('M-Cross既存のbuildEstimateRowsと追加作業から見積明細を作成します')
console.log('見積合計を工事案件の見積金額へ自動設定します')
console.log('既に作成済みの工事案件には遡及しません。新しく工事案件へ進んだ案件から反映されます')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
