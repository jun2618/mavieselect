const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.step19-2-restoration-to-workorder-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_STEP19_2_RESTORATION_TO_WORKORDER */'
if (s.includes(marker)) { console.log('STEP19.2は適用済みです'); process.exit(0) }
if (!s.includes('/* M-CROSS_STEP19_WORK_ORDERS_BASE */')) { console.error('STEP19が見つかりません。'); process.exit(1) }

const fnTarget = '  function createWorkOrderFromResidentCase(residentCase) {'
if (!s.includes(fnTarget)) { console.error('STEP19.1関数が見つかりません。変更しませんでした。'); process.exit(1) }
const fn = `  ${marker}
  function createWorkOrderFromRestoration() {
    const propertyName = selectedProperty?.name || ''
    const unitValue = String(unit || '').trim()
    if (!propertyName || !unitValue) {
      window.alert('物件名と号室を確認してください。')
      return
    }

    const sourceId = [selectedProperty?.id || propertyName, unitValue].join('|')
    const existing = workOrders.find(item => item.sourceType === 'restoration' && item.sourceId === sourceId)
    if (existing) {
      window.alert('この原状回復案件はすでに工事案件へ登録されています。')
      setStarted(false)
      setShowWorkOrders(true)
      return
    }

    const workNames = [
      records?.length ? 'クロス' : '',
      cfRecords?.length ? 'CF' : '',
      softRecords?.length ? 'ソフト巾木' : '',
      floorTrimRecords?.length ? '床見切り' : '',
      ...(additionalWorks || []).map(item => item.work || item.name || '').filter(Boolean),
    ].filter(Boolean)

    const now = new Date().toISOString()
    const workOrder = normalizeWorkOrder({
      id: createResidentCaseId(),
      company: company || '',
      propertyName,
      unit: unitValue,
      address: selectedProperty?.address || '',
      workDetails: [...new Set(workNames)].join('・') || '原状回復工事',
      estimateStatus: '未作成',
      orderStatus: '未発注',
      billingStatus: '未請求',
      sourceType: 'restoration',
      sourceId,
      createdAt: now,
      updatedAt: now,
    })

    setWorkOrders(previous => [workOrder, ...previous])
    setStarted(false)
    setShowWorkOrders(true)
  }

`
s=s.replace(fnTarget,fn+fnTarget)

// Place button on final estimate/summary view, immediately after estimate intro.
const estimateIntro = `<p className="estimateIntro">退去時にお客様へ提示するための概算です。正式見積ではありません。</p>`
if (!s.includes(estimateIntro)) { console.error('原状回復の概算画面が見つかりません。変更しませんでした。'); process.exit(1) }
const block = `${estimateIntro}
                  <div className="restorationWorkOrderAction">
                    {workOrders.some(item => item.sourceType === 'restoration' && item.sourceId === [selectedProperty?.id || selectedProperty?.name || '', String(unit || '').trim()].join('|')) ? (
                      <button className="secondaryButton" type="button" onClick={() => { setStarted(false); setShowWorkOrders(true) }}>工事案件を開く</button>
                    ) : (
                      <button className="primary" type="button" onClick={() => {
                        if (!window.confirm('この原状回復案件から工事案件を作成しますか？\\n物件・号室と施工項目を引き継ぎます。')) return
                        createWorkOrderFromRestoration()
                      }}>工事案件へ進む</button>
                    )}
                  </div>`
s=s.replace(estimateIntro,block)

const anchor='/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(anchor)) { console.error('CSS位置が見つかりません。'); process.exit(1) }
const css=`/* M-CROSS_STEP19_2_RESTORATION_TO_WORKORDER_STYLE */
.restorationWorkOrderAction{display:grid;gap:8px;margin:12px 0 16px}.restorationWorkOrderAction .primary,.restorationWorkOrderAction .secondaryButton{width:100%;margin:0;min-height:48px}
`
s=s.replace(anchor,css+'\n'+anchor)

fs.copyFileSync(file,backup)
fs.writeFileSync(file,s,'utf8')
console.log('STEP19.2 原状回復→工事案件 OK')
console.log('概算画面に「工事案件へ進む」を追加しました')
console.log('物件・号室・住所・施工項目を引き継ぎます')
console.log('同じ原状回復案件からの二重作成を防止します')
console.log('バックアップ:',backup)
console.log('次に npm run build を実行してください')
