const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_AUTO_APPLY_CONTRACTOR_PRICEBOOK_V1_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const old=`const masterRate=rateKey && item.rates?.[rateKey]!=='' && item.rates?.[rateKey]!=null ? Number(item.rates[rateKey]) : current.orderRate
                              return {...current,rateKey,orderRate:Number.isFinite(masterRate)?masterRate:''}`;
const neu=`/* ${mark} */
                              const directRate=rateKey && item.rates?.[rateKey]!=='' && item.rates?.[rateKey]!=null ? Number(item.rates[rateKey]) : NaN
                              const priceRows=Array.isArray(item.priceBook)?item.priceBook:[]
                              const priceName=rateKey==='cross'?'クロス施工費':rateKey==='cf'?'CF施工費':rateKey==='soft'?'巾木施工費':rateKey==='floorTrim'?'床見切り':rateKey==='wallBase'?'壁下地':rateKey==='floorBase'?'床下地':''
                              const priceRow=priceName?priceRows.find(row=>String(row?.name||'').trim()===priceName && row?.priceType==='fixed' && row?.price!=='' && row?.price!=null):null
                              const priceBookRate=priceRow?Number(priceRow.price):NaN
                              const masterRate=Number.isFinite(directRate)?directRate:Number.isFinite(priceBookRate)?priceBookRate:current.orderRate
                              return {...current,rateKey,orderRate:Number.isFinite(Number(masterRate))?Number(masterRate):''}`;
const n=s.split(old).length-1;
if(n!==1){console.error('ERROR: 職人単価の反映位置 MATCH='+n+'。変更していません。');process.exit(1)}
const toolbar=`{(orderDraft.orderMode||'service')==='service' && orderDraft.contractorId && (`;
const toolbarNew=`{(orderDraft.orderMode||'service')==='service' && orderDraft.contractorId && (<><div className="autoRateAppliedNotice">✓ 登録済みの施工単価を発注単価へ自動反映</div>`;
const close=`</section>\n                      )}`;
// Do not structurally alter toolbar if ambiguous; add only CSS and pricing logic.
fs.copyFileSync(p,'./src/App.before_auto_apply_contractor_pricebook_v1.jsx');
s=s.replace(old,neu);
const cssAnchor='.serviceInlinePriceBook{display:grid;gap:10px;';
if(s.includes(cssAnchor)){
  s=s.replace(cssAnchor,'.autoRateAppliedNotice{padding:9px 11px;border:1px solid #85c7a7;border-radius:10px;background:#eefaf3;color:#23724b;font-size:13px;font-weight:900}.serviceInlinePriceBook{display:grid;gap:10px;');
}
fs.writeFileSync(p,s,'utf8');
console.log('OK: 職人選択時に施工単価表の固定単価を発注単価へ自動反映するよう修正しました。');
