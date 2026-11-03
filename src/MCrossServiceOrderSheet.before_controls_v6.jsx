import './MCrossServiceOrderSheet.css'

const money=value=>'¥'+Math.round(Number(value)||0).toLocaleString('ja-JP')
const qty=value=>{const n=Number(value);if(!Number.isFinite(n))return '';return String(Math.round(n*100)/100)}

export default function MCrossServiceOrderSheet({orderDraft,setOrderDraft,propertyName='',unit='',address='',workName='',onSave}){
 const items=Array.isArray(orderDraft?.items)?orderDraft.items:[]
 const subtotal=items.reduce((sum,item)=>sum+(Number(item.orderQuantity)||0)*(Number(item.orderRate)||0),0)
 const tax=Math.round(subtotal*.1)
 const update=(index,patch)=>setOrderDraft(previous=>({...previous,items:previous.items.map((item,i)=>i===index?{...item,...patch}:item)}))
 const remove=index=>setOrderDraft(previous=>({...previous,items:previous.items.filter((_,i)=>i!==index)}))
 return <section className="mcrossServiceSheet">
  <header className="mcrossServiceSheetHead"><div className="mcrossServiceSheetBrand"><strong>M-Cross</strong><small>MavieSelect</small></div><h2>施 工 発 注 書</h2><div className="mcrossServiceSheetCompany"><strong>株式会社 MavieSelect</strong><span>〒060-0007</span><span>札幌市中央区北7条西22丁目1-12-201</span><span>TEL 011-699-6492　FAX 011-699-6493</span></div></header>
  <section className="mcrossServiceSheetMeta"><div><span>物件名</span><strong>{propertyName}</strong></div><div><span>号室</span><strong>{unit?String(unit).replace(/号室$/,'')+'号室':''}</strong></div><div><span>住所</span><strong>{address}</strong></div><div><span>工事名</span><strong>{workName||'原状回復工事'}</strong></div><div className="wide"><span>発注先</span><strong>{orderDraft?.contractor||'発注先未選択'}</strong></div></section>
  <div className="mcrossServiceSheetTable"><div className="mcrossServiceSheetRow head"><span>No.</span><span>工事項目</span><span>仕様・品番</span><span>見積→発注</span><span>単位</span><span>発注単価</span><span>発注金額</span><span>操作</span></div>{items.map((item,index)=><div className="mcrossServiceSheetRow" key={(item.id||'row')+'-'+index}><span>{index+1}</span><span className="work">{item.label}</span><span>{item.productCode||item.memo||''}</span><span className="compare">{qty(item.sourceQuantity)} → {qty(item.orderQuantity)}</span><span>{item.unit}</span><span className="rate"><input onFocus={e=>{requestAnimationFrame(()=>e.currentTarget.select())}} inputMode="decimal" type="number" min="0" step="1" value={item.orderRate??''} onChange={e=>update(index,{orderRate:e.target.value===''?'':Math.max(0,Number(e.target.value)||0)})}/></span><span className="amount">{item.orderRate===''||item.orderRate==null?'未設定':money((Number(item.orderQuantity)||0)*(Number(item.orderRate)||0))}</span><span><button type="button" className="mcrossServiceSheetDelete" onClick={()=>remove(index)}>×</button></span></div>)}</div>
  <footer className="mcrossServiceSheetFoot"><div className="mcrossServiceSheetNotes"><strong>備考</strong><textarea placeholder="必要な場合に入力"/></div><div className="mcrossServiceSheetTotals"><div><span>小計</span><strong>{money(subtotal)}</strong></div><div><span>消費税（10%）</span><strong>{money(tax)}</strong></div><div className="grand"><span>合計</span><strong>{money(subtotal+tax)}</strong></div></div></footer>
  <div className="mcrossServiceSheetActions"><button type="button" onClick={onSave}>📦 下書き保存</button></div>
 </section>
}
