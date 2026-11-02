import './WorkInstructionModal.css'

export default function WorkInstructionModal({open,onClose,propertyName='',unit='',address='',workName='',propertyAccess={},rows=[],selectedIds=[]}){
 if(!open)return null
 const selected=rows.filter(row=>selectedIds.includes(row.id))
 const quantity=row=>{const q=Number(row.quantity),u=String(row.unit||'').trim();return Number.isFinite(q)&&q>0&&u&&!(q===1&&u==='式')?String(Number.isInteger(q)?q:Math.round(q*10)/10)+u:''}
 const access=[['オートロック',propertyAccess.autoLock],['キーボックス',propertyAccess.keyBox],['ドアジョイナー',propertyAccess.joiner],['マイロック',propertyAccess.myLock],['玄関開放',propertyAccess.entranceOpen]].filter(([,value])=>String(value||'').trim())
 return <div className="workInstructionBackdrop" onClick={onClose}><section className="workInstructionSheet" onClick={event=>event.stopPropagation()}>
  <header><div><small>WORK INSTRUCTION</small><h2>作 業 指 示 書</h2></div><button type="button" onClick={onClose}>× 閉じる</button></header>
  <section className="workInstructionMeta"><p><b>物件：</b>{[propertyName,unit?String(unit).replace(/号室$/,'')+'号室':''].filter(Boolean).join(' ')}</p>{address&&<p><b>住所：</b>{address}</p>}<p><b>工事名：</b>{workName}</p></section>
  {access.length>0&&<section className="workInstructionAccess"><h3>🔑 鍵・入館情報</h3>{access.map(([label,value])=><p key={label}><b>{label}：</b>{String(value)}</p>)}</section>}
  <section className="workInstructionJobs"><h3>作業内容</h3>{selected.map((row,index)=><div key={row.id}><span>{index+1}</span><strong>{String(row.name||'').replace(/[　 ]+/g,' ').trim()}</strong>{quantity(row)&&<b>{quantity(row)}</b>}</div>)}</section>
  <footer><button type="button" onClick={()=>window.print()}>🖨 印刷 / PDF</button></footer>
 </section></div>
}
