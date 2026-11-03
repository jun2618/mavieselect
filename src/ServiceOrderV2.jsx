import "./ServiceOrderV2.css";

export default function ServiceOrderV2({items=[],contractor="",propertyAccess={}}){
  const accessRows=[["オートロック",propertyAccess.autoLock],["キーボックス",propertyAccess.keyBox],["ドアジョイナー",propertyAccess.joiner],["マイロック",propertyAccess.myLock],["玄関開放",propertyAccess.entranceOpen]].filter(([,value])=>String(value||"").trim());
  const formatNumber=value=>Number.isFinite(Number(value))?Number(value).toLocaleString("ja-JP",{maximumFractionDigits:2}):"";
  return <section className="serviceOrderV2">
    <header className="serviceOrderV2Title"><div><small>WORK ORDER V2</small><h2>発 注 書</h2></div><strong>{contractor||"発注先未選択"}</strong></header>
    {accessRows.length>0&&<section className="serviceOrderV2Access"><h3>🔑 入館・鍵情報</h3><div>{accessRows.map(([label,value])=><p key={label}><b>{label}</b><span>{String(value)}</span></p>)}</div></section>}
    <div className="serviceOrderV2Head"><span>工事項目・仕様品番</span><span>見積 → 発注</span><span>単位</span><span>発注単価</span><span>発注金額</span></div>
    <div className="serviceOrderV2Rows">{items.map((item,index)=>{
      const specification=String(item.productCode||"").trim()||(Array.isArray(item.parts)?item.parts.filter(Boolean).join(" "):"")||"仕様・品番未設定";
      const amount=item.orderRate===""||item.orderRate==null?null:(Number(item.orderQuantity)||0)*(Number(item.orderRate)||0);
      return <article className="serviceOrderV2Row" key={(item.id||"item")+"-"+index}>
        <div className="serviceOrderV2Work"><strong>{item.label||"工事項目未設定"}</strong><small>{specification}</small>{item.memo&&<em>{item.memo}</em>}</div>
        <div className="serviceOrderV2Quantity"><span>見積 {formatNumber(item.sourceQuantity)}</span><b>→ 発注 {formatNumber(item.orderQuantity)}</b></div>
        <div className="serviceOrderV2Unit">{item.unit||"-"}</div>
        <div className="serviceOrderV2Rate">{item.orderRate===""||item.orderRate==null?"未設定":formatNumber(item.orderRate)+"円"}</div>
        <div className="serviceOrderV2Amount">{amount==null?"未設定":Math.round(amount).toLocaleString("ja-JP")+"円"}</div>
      </article>})}</div>
  </section>
}
