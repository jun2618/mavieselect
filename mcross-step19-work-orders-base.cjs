const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.step19-work-orders-base-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_STEP19_WORK_ORDERS_BASE */'
if (s.includes(marker)) { console.log('STEP19 工事案件の土台は適用済みです'); process.exit(0) }

const helperTarget = 'function normalizeResidentCase(value) {'
if (!s.includes(helperTarget)) { console.error('共通関数の追加位置が見つかりません。変更しませんでした。'); process.exit(1) }
const helper = `${marker}
const workOrdersStorageKey = 'm-cross:work-orders:v1'

function normalizeWorkOrder(value) {
  const source = value && typeof value === 'object' ? value : {}
  const sales = Math.max(0, Number(source.estimateAmount) || 0)
  const contractorCost = Math.max(0, Number(source.contractorCost) || 0)
  const materialCost = Math.max(0, Number(source.materialCost) || 0)
  const otherCost = Math.max(0, Number(source.otherCost) || 0)
  const costTotal = contractorCost + materialCost + otherCost
  const profit = sales - costTotal
  return {
    id: source.id || createResidentCaseId(),
    company: source.company || '', propertyName: source.propertyName || '', unit: source.unit || '', address: source.address || '',
    workDetails: source.workDetails || '',
    estimateAmount: sales,
    estimateStatus: source.estimateStatus || '未作成',
    orderStatus: source.orderStatus || '未発注',
    contractor: source.contractor || '',
    startDate: source.startDate || '', completionDueDate: source.completionDueDate || '', completedDate: source.completedDate || '',
    contractorCost, materialCost, otherCost, costTotal, profit,
    profitRate: sales > 0 ? Number(((profit / sales) * 100).toFixed(1)) : 0,
    billingStatus: source.billingStatus || '未請求',
    sourceType: source.sourceType || '', sourceId: source.sourceId || '',
    createdAt: source.createdAt || new Date().toISOString(), updatedAt: source.updatedAt || new Date().toISOString(),
  }
}

function loadWorkOrders() {
  try {
    const parsed = JSON.parse(localStorage.getItem(workOrdersStorageKey) || '[]')
    return Array.isArray(parsed) ? parsed.map(normalizeWorkOrder) : []
  } catch { return [] }
}

function saveWorkOrders(items) {
  try { localStorage.setItem(workOrdersStorageKey, JSON.stringify(items)); return true } catch { return false }
}

`
s = s.replace(helperTarget, helper + helperTarget)

const residentState = "  const [residentCases, setResidentCases] = useState(() => loadResidentCases())"
if (!s.includes(residentState)) { console.error('App state追加位置が見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(residentState, `${residentState}
  const [workOrders, setWorkOrders] = useState(() => loadWorkOrders())
  const [showWorkOrders, setShowWorkOrders] = useState(false)`)

const saveEffectTarget = `  useEffect(() => {
    saveResidentCases(residentCases)
  }, [residentCases])`
if (!s.includes(saveEffectTarget)) { console.error('保存effectが見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(saveEffectTarget, `${saveEffectTarget}

  useEffect(() => {
    saveWorkOrders(workOrders)
  }, [workOrders])`)

// Add an entry next to resident cases button.
const residentButtonText = '入居中案件'
const p = s.indexOf(residentButtonText)
if (p === -1) { console.error('入居中案件ボタンが見つかりません。変更しませんでした。'); process.exit(1) }
const end = s.indexOf('</button>', p)
if (end === -1) { console.error('入居中案件ボタン末尾が見つかりません。'); process.exit(1) }
const insertAt = end + '</button>'.length
const button = `
              <button className="secondaryButton workOrdersEntryButton" type="button" onClick={() => setShowWorkOrders(true)}>工事案件</button>`
s = s.slice(0, insertAt) + button + s.slice(insertAt)

// Show a simple full-page work order dashboard when requested.
const mainNeedle = `{showResidentCases ? (`
if (!s.includes(mainNeedle)) { console.error('トップ画面切替位置が見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(mainNeedle, `{showWorkOrders ? (
              <section className="workOrdersHome">
                <div className="workOrdersTopbar"><button className="back" type="button" onClick={() => setShowWorkOrders(false)}>← 戻る</button><div><p className="eyebrow">M-Cross WORK</p><h1>工事案件</h1></div></div>
                <div className="workOrderStats">
                  <div><span>全案件</span><strong>{workOrders.length}</strong></div>
                  <div><span>未請求</span><strong>{workOrders.filter(item => item.billingStatus !== '請求済').length}</strong></div>
                  <div><span>完了</span><strong>{workOrders.filter(item => item.completedDate).length}</strong></div>
                </div>
                {workOrders.length === 0 ? <div className="card workOrdersEmpty"><strong>工事案件はまだありません</strong><span>次のSTEPで採寸案件・入居中案件から工事案件へ進める機能を追加します。</span></div> : <div className="workOrdersList">{workOrders.map(item => <article className="card" key={item.id}><strong>{item.propertyName || '物件名未設定'} {item.unit ? item.unit + '号室' : ''}</strong><p>{item.workDetails || '工事内容未入力'}</p><div className="summaryLine"><span>見積</span><strong>¥{item.estimateAmount.toLocaleString()}</strong></div><div className="summaryLine"><span>原価</span><strong>¥{item.costTotal.toLocaleString()}</strong></div><div className="summaryLine"><span>利益</span><strong>¥{item.profit.toLocaleString()} / {item.profitRate}%</strong></div><small>{item.orderStatus} / {item.billingStatus}</small></article>)}</div>}
              </section>
            ) : showResidentCases ? (`)

const anchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(anchor)) { console.error('CSS位置が見つかりません。'); process.exit(1) }
const css = `/* M-CROSS_STEP19_WORK_ORDERS_BASE_STYLE */
.workOrdersHome{display:grid;gap:16px;width:min(1200px,calc(100% - 24px));margin:0 auto}.workOrdersTopbar{display:flex;align-items:center;gap:18px}.workOrdersTopbar h1,.workOrdersTopbar p{margin:0}.workOrderStats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.workOrderStats>div{display:grid;gap:4px;padding:14px;border:1px solid rgba(100,120,150,.2);border-radius:14px;background:#fff;text-align:center}.workOrderStats span{font-size:12px;font-weight:800;color:#687386}.workOrderStats strong{font-size:24px}.workOrdersEmpty{display:grid;gap:6px;text-align:center}.workOrdersList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media(max-width:700px){.workOrdersHome{width:100%}.workOrdersList{grid-template-columns:1fr}.workOrderStats{grid-template-columns:repeat(3,1fr)}}
`
s = s.replace(anchor, css + '\n' + anchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('STEP19 工事案件の土台 OK')
console.log('工事案件データ: 見積 / 発注 / 工程 / 原価 / 利益 / 請求状態')
console.log('トップ画面に「工事案件」入口を追加しました')
console.log('既存の採寸・入居中案件は変更していません')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
