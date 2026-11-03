const fs=require("fs");
const p="./src/App.jsx";
let s=fs.readFileSync(p,"utf8");
const marker="M-CROSS_REBUILT_ROUND_ORDER_V1_SAFE";
if(s.includes(marker)){console.log("OK: すでに再構築済みです");process.exit(0)}
const oldText='className="orderDraftItem" key={item.id+'-'+itemIndex}';
const newText='className="orderDraftItem rebuiltRoundOrderRow" key={item.id+'-'+itemIndex}';
const matches=s.split(oldText).length-1;
if(matches!==1){console.error("ERROR: 発注明細行 MATCH="+matches+"。変更していません");process.exit(1)}
const cssMarker="/* M-CROSS_SERVICE_ORDER_BLACK_FIX_V3 */";
if(!s.includes(cssMarker)){console.error("ERROR: CSS挿入位置が見つかりません。変更していません");process.exit(1)}
const css="/* "+marker+" */ .serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow{gap:6px!important;padding:6px!important;background:#e7f4e5!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow>strong{margin:0!important;padding:8px 10px!important;border:1px solid rgba(99,190,161,.62)!important;border-radius:12px!important;background:#fff!important;box-sizing:border-box!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow>small{margin:0!important;padding:7px 10px!important;border:1px solid rgba(110,145,232,.48)!important;border-radius:12px!important;background:#fff!important;box-sizing:border-box!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderQuantityCompare{margin:0!important;padding:8px!important;border:1px solid rgba(110,145,232,.52)!important;border-radius:12px!important;background:#fff!important;box-sizing:border-box!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderQuantityCompare span,.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderQuantityCompare b{border:0!important;background:transparent!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderQuantityField input,.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderRateField input{padding:7px 9px!important;border:1px solid rgba(216,77,131,.52)!important;border-radius:12px!important;background:#fff!important;box-sizing:border-box!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderLineAmount{margin:0!important;padding:8px!important;border-radius:12px!important;background:rgba(255,255,255,.72)!important} ";
fs.copyFileSync(p,p+".backup_rebuild_round_order_"+Date.now());
s=s.replace(oldText,newText);
s=s.replace(cssMarker,css+cssMarker);
fs.writeFileSync(p,s,"utf8");
console.log("OK: 発注明細を専用丸枠デザインで再構築しました");
