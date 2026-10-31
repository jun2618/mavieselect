const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.step19-1-resident-to-workorder-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_STEP19_1_RESIDENT_TO_WORKORDER */'
if (s.includes(marker)) { console.log('STEP19.1は適用済みです'); process.exit(0) }
if (!s.includes('/* M-CROSS_STEP19_WORK_ORDERS_BASE */')) { console.error('STEP19が見つかりません。'); process.exit(1) }

const functionTarget = '  function updateResidentCase(caseId, patch, historyStatus = \'\', historyMemo = \'\') {'
if (!s.includes(functionTarget)) { console.error('関数追加位置が見つかりません。'); process.exit(1) }
const fn = `  ${marker}
  function createWorkOrderFromResidentCase(residentCase) {
    if (!residentCase) return
    const existing = workOrders.find(item => item.sourceType === 'resident' && item.sourceId === residentCase.id)
    if (existing) {
      window.alert('この入居中案件はすでに工事案件へ登録されています。')
      setSelectedResidentCaseId('')
      setShowResidentCases(false)
      setShowWorkOrders(true)
      return
    }

    const now = new Date().toISOString()
    const workOrder = normalizeWorkOrder({
      id: createResidentCaseId(),
      company: residentCase.company || '',
      propertyName: residentCase.propertyName || '',
      unit: residentCase.unit || '',
      address: residentCase.address || '',
      workDetails: residentCase.requestDetails || '',
      estimateStatus: '未作成',
      orderStatus: '未発注',
      billingStatus: '未請求',
      sourceType: 'resident',
      sourceId: residentCase.id,
      createdAt: now,
      updatedAt: now,
    })

    setWorkOrders(previous => [workOrder, ...previous])
    updateResidentCase(residentCase.id, {
      nextAction: '工事案件で見積・発注を進める',
    }, '工事案件へ移行', '工事案件を作成')
    setSelectedResidentCaseId('')
    setShowResidentCases(false)
    setShowWorkOrders(true)
  }

`
s = s.replace(functionTarget, fn + functionTarget)

// Add conversion area before danger/delete zone in resident detail.
const dangerTarget = `<div className="residentDangerZone">`
if (!s.includes(dangerTarget)) { console.error('案件詳細の末尾位置が見つかりません。'); process.exit(1) }
const action = `<div className="residentWorkOrderTransfer">
                          {workOrders.some(workItem => workItem.sourceType === 'resident' && workItem.sourceId === item.id) ? (
                            <button className="secondaryButton" type="button" onClick={() => { setSelectedResidentCaseId(''); setShowResidentCases(false); setShowWorkOrders(true) }}>工事案件を開く</button>
                          ) : (
                            <button className="primary" type="button" onClick={() => {
                              if (!window.confirm('この入居中案件から工事案件を作成しますか？\\n物件・号室・住所・依頼内容を引き継ぎます。')) return
                              createWorkOrderFromResidentCase(item)
                            }}>工事案件へ進む</button>
                          )}
                        </div>
                        ${dangerTarget}`
s = s.replace(dangerTarget, action)

const anchor='/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(anchor)) { console.error('CSS位置が見つかりません。'); process.exit(1) }
const css=`/* M-CROSS_STEP19_1_RESIDENT_TO_WORKORDER_STYLE */
.residentWorkOrderTransfer{display:grid;gap:8px;margin-top:10px;padding-top:14px;border-top:1px solid rgba(90,130,190,.25)}.residentWorkOrderTransfer .primary,.residentWorkOrderTransfer .secondaryButton{width:100%;margin:0;min-height:48px}
`
s=s.replace(anchor,css+'\n'+anchor)

fs.copyFileSync(file,backup)
fs.writeFileSync(file,s,'utf8')
console.log('STEP19.1 入居中案件→工事案件 OK')
console.log('物件・号室・住所・依頼内容を引き継ぎます')
console.log('同じ入居中案件からの二重作成を防止します')
console.log('作成後は工事案件画面へ移動します')
console.log('バックアップ:',backup)
console.log('次に npm run build を実行してください')
