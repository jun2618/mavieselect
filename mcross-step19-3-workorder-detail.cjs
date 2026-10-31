const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.step19-3-workorder-detail-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker='/* M-CROSS_STEP19_3_WORKORDER_DETAIL */'
if (s.includes(marker)) { console.log('STEP19.3は適用済みです'); process.exit(0) }
if (!s.includes('/* M-CROSS_STEP19_WORK_ORDERS_BASE */')) { console.error('STEP19が見つかりません。'); process.exit(1) }

const stateTarget = "  const [showWorkOrders, setShowWorkOrders] = useState(false)"
if (!s.includes(stateTarget)) { console.error('工事案件stateが見つかりません。'); process.exit(1) }
s=s.replace(stateTarget,`${stateTarget}\n  ${marker}\n  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState('')`)

const fnTarget='  function createWorkOrderFromRestoration() {'
if (!s.includes(fnTarget)) { console.error('STEP19.2関数が見つかりません。'); process.exit(1) }
const fn=`  function updateWorkOrder(workOrderId, patch) {
    const now = new Date().toISOString()
    setWorkOrders(previous => previous.map(item => item.id === workOrderId
      ? normalizeWorkOrder({ ...item, ...patch, updatedAt: now })
      : item
    ))
  }

`
s=s.replace(fnTarget,fn+fnTarget)

const article=`<article className="card" key={item.id}>`
if (!s.includes(article)) { console.error('工事案件カードが見つかりません。'); process.exit(1) }
s=s.replace(article,`<article className="card workOrderCard" key={item.id} role="button" tabIndex={0} onClick={() => setSelectedWorkOrderId(item.id)} onKeyDown={event => { if (event.key === 'Enter') setSelectedWorkOrderId(item.id) }}>`)

// Insert detail overlay before the work-order section closes by targeting the unique list expression ending.
const listEnd=`</article>)}</div>}`
if (!s.includes(listEnd)) { console.error('工事案件一覧の終了位置が見つかりません。'); process.exit(1) }
const detail=`</article>)}</div>}
                {selectedWorkOrderId && (() => {
                  const item = workOrders.find(workItem => workItem.id === selectedWorkOrderId)
                  if (!item) return null
                  return <section className="workOrderDetailPage">
                    <div className="card workOrderDetail">
                      <div className="workOrderDetailTop">
                        <button className="back" type="button" onClick={() => setSelectedWorkOrderId('')}>← 工事案件一覧へ</button>
                        <div><p className="eyebrow">M-Cross WORK</p><h1>{item.propertyName || '物件名未設定'} {item.unit ? item.unit + '号室' : ''}</h1></div>
                      </div>

                      <section className="workOrderSection"><h2>基本情報</h2><div className="workOrderFormGrid">
                        <label><span>管理会社</span><input value={item.company || ''} onChange={e => updateWorkOrder(item.id,{company:e.target.value})}/></label>
                        <label><span>物件名</span><input value={item.propertyName || ''} onChange={e => updateWorkOrder(item.id,{propertyName:e.target.value})}/></label>
                        <label><span>号室</span><input value={item.unit || ''} onChange={e => updateWorkOrder(item.id,{unit:e.target.value})}/></label>
                        <label className="wide"><span>住所</span><input value={item.address || ''} onChange={e => updateWorkOrder(item.id,{address:e.target.value})}/></label>
                        <label className="wide"><span>工事内容</span><textarea rows="3" value={item.workDetails || ''} onChange={e => updateWorkOrder(item.id,{workDetails:e.target.value})}/></label>
                      </div></section>

                      <section className="workOrderSection"><h2>見積</h2><div className="workOrderFormGrid">
                        <label><span>見積金額</span><input type="number" min="0" value={item.estimateAmount || 0} onChange={e => updateWorkOrder(item.id,{estimateAmount:Number(e.target.value)||0})}/></label>
                        <label><span>見積状態</span><select value={item.estimateStatus || '未作成'} onChange={e => updateWorkOrder(item.id,{estimateStatus:e.target.value})}><option>未作成</option><option>作成中</option><option>提出済</option><option>承認</option></select></label>
                      </div><button className="secondaryButton" type="button" onClick={() => window.alert('見積書出力はSTEP20で追加します')}>見積書を出力</button></section>

                      <section className="workOrderSection"><h2>発注</h2><div className="workOrderFormGrid">
                        <label><span>発注状態</span><select value={item.orderStatus || '未発注'} onChange={e => updateWorkOrder(item.id,{orderStatus:e.target.value})}><option>未発注</option><option>発注準備</option><option>発注済み</option><option>施工中</option></select></label>
                        <label><span>発注先</span><input value={item.contractor || ''} onChange={e => updateWorkOrder(item.id,{contractor:e.target.value})}/></label>
                      </div></section>

                      <section className="workOrderSection"><h2>工程</h2><div className="workOrderFormGrid">
                        <label><span>着工予定</span><input type="date" value={item.startDate || ''} onChange={e => updateWorkOrder(item.id,{startDate:e.target.value})}/></label>
                        <label><span>完了予定</span><input type="date" value={item.completionDueDate || ''} onChange={e => updateWorkOrder(item.id,{completionDueDate:e.target.value})}/></label>
                        <label><span>完了日</span><input type="date" value={item.completedDate || ''} onChange={e => updateWorkOrder(item.id,{completedDate:e.target.value})}/></label>
                      </div></section>

                      <section className="workOrderSection"><h2>原価・利益</h2><div className="workOrderFormGrid">
                        <label><span>業者支払</span><input type="number" min="0" value={item.contractorCost || 0} onChange={e => updateWorkOrder(item.id,{contractorCost:Number(e.target.value)||0})}/></label>
                        <label><span>資材費</span><input type="number" min="0" value={item.materialCost || 0} onChange={e => updateWorkOrder(item.id,{materialCost:Number(e.target.value)||0})}/></label>
                        <label><span>その他経費</span><input type="number" min="0" value={item.otherCost || 0} onChange={e => updateWorkOrder(item.id,{otherCost:Number(e.target.value)||0})}/></label>
                      </div><div className="workOrderMoneyGrid"><div><span>売上</span><strong>¥{item.estimateAmount.toLocaleString()}</strong></div><div><span>原価</span><strong>¥{item.costTotal.toLocaleString()}</strong></div><div><span>利益</span><strong>¥{item.profit.toLocaleString()}</strong></div><div><span>利益率</span><strong>{item.profitRate}%</strong></div></div></section>

                      <section className="workOrderSection"><h2>請求</h2><div className="workOrderFormGrid"><label><span>請求状態</span><select value={item.billingStatus || '未請求'} onChange={e => updateWorkOrder(item.id,{billingStatus:e.target.value})}><option>未請求</option><option>請求準備</option><option>請求済</option></select></label></div></section>
                    </div>
                  </section>
                })()}`
s=s.replace(listEnd,detail)

const anchor='/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(anchor)) { console.error('CSS位置が見つかりません。'); process.exit(1) }
const css=`/* M-CROSS_STEP19_3_WORKORDER_DETAIL_STYLE */
.workOrderCard{cursor:pointer}.workOrderCard:focus-visible{outline:3px solid #7fa6ef;outline-offset:2px}.workOrderDetailPage{position:fixed;inset:0;z-index:9999;overflow:auto;background:#eef1f6;padding:22px}.workOrderDetail{width:min(1180px,calc(100vw - 44px));margin:0 auto;display:grid;gap:16px;padding:24px!important}.workOrderDetailTop{display:flex;align-items:center;gap:18px}.workOrderDetailTop h1,.workOrderDetailTop p{margin:0}.workOrderSection{display:grid;gap:12px;padding:16px;border:1px solid rgba(100,120,150,.18);border-radius:14px;background:rgba(255,255,255,.5)}.workOrderSection h2{margin:0}.workOrderFormGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.workOrderFormGrid label{display:grid;gap:5px}.workOrderFormGrid label>span{font-size:12px;font-weight:850;color:#687386}.workOrderFormGrid input,.workOrderFormGrid select,.workOrderFormGrid textarea{width:100%;box-sizing:border-box;padding:10px 11px;border:1px solid rgba(100,120,150,.28);border-radius:10px;background:#fff;color:inherit;font:inherit}.workOrderFormGrid .wide{grid-column:1/-1}.workOrderMoneyGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.workOrderMoneyGrid>div{display:grid;gap:3px;padding:12px;border-radius:12px;background:rgba(90,130,200,.07);text-align:center}.workOrderMoneyGrid span{font-size:11px;font-weight:800;color:#687386}.workOrderMoneyGrid strong{font-size:20px}@media(max-width:700px){.workOrderDetailPage{padding:8px}.workOrderDetail{width:calc(100vw - 16px);padding:14px!important}.workOrderDetailTop{align-items:flex-start;flex-direction:column}.workOrderFormGrid{grid-template-columns:1fr}.workOrderFormGrid .wide{grid-column:auto}.workOrderMoneyGrid{grid-template-columns:repeat(2,1fr)}}
`
s=s.replace(anchor,css+'\n'+anchor)

fs.copyFileSync(file,backup)
fs.writeFileSync(file,s,'utf8')
console.log('STEP19.3 工事案件詳細 OK')
console.log('カードを押すと、基本情報・見積・発注・工程・原価利益・請求を編集できます')
console.log('原価合計・利益・利益率は自動計算されます')
console.log('見積書出力ボタンはSTEP20用の仮ボタンです')
console.log('バックアップ:',backup)
console.log('次に npm run build を実行してください')
