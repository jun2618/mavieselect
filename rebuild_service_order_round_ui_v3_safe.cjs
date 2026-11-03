const fs=require("fs");
const p="./src/App.jsx";
let s=fs.readFileSync(p,"utf8");
const mark="M-CROSS_REBUILT_ROUND_ORDER_V3_SAFE";
if(s.includes(mark)){console.log("OK: すでに適用済み");process.exit(0)}
const old=`{orderDraft.items.map((item,itemIndex)=><article className="orderDraftItem" key={item.id+'-'+itemIndex}>`;
const neo=`{orderDraft.items.map((item,itemIndex)=><article className="orderDraftItem rebuiltRoundOrderRow" key={item.id+'-'+itemIndex}>`;
const n=s.split(old).length-1;
if(n!==1){console.error("ERROR: 固有明細 MATCH="+n+"。変更していません");process.exit(1)}
const pos="/* M-CROSS_SERVICE_ORDER_BLACK_FIX_V3 */";
if(!s.includes(pos)){console.error("ERROR: CSS位置なし。変更していません");process.exit(1)}
const css=`/* ${mark} */ .serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow{gap:7px!important;padding:7px!important;background:#e5f2e3!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow>strong{margin:0!important;padding:8px 10px!important;border:1px solid rgba(99,190,161,.62)!important;border-radius:12px!important;background:#fff!important;box-sizing:border-box!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow>small{margin:0!important;padding:7px 10px!important;border:1px solid rgba(110,145,232,.48)!important;border-radius:12px!important;background:#fff!important;box-sizing:border-box!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderQuantityCompare{margin:0!important;padding:8px!important;border:1px solid rgba(110,145,232,.52)!important;border-radius:12px!important;background:#fff!important;box-sizing:border-box!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderQuantityCompare span,.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderQuantityCompare b{border:0!important;background:transparent!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderRateField input,.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderQuantityField input{padding:7px 9px!important;border:1px solid rgba(216,77,131,.52)!important;border-radius:12px!important;background:#fff!important;box-sizing:border-box!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderLineAmount{margin:0!important;padding:8px!important;border-radius:12px!important;background:rgba(255,255,255,.82)!important} `;
fs.copyFileSync(p,p+".backup_round_v3_"+Date.now());
s=s.replace(old,neo);
s=s.replace(pos,css+pos);
fs.writeFileSync(p,s,"utf8");
console.log("OK: 固有の施工発注明細だけ丸枠UIへ再構築しました");
