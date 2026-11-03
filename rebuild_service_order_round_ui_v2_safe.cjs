const fs=require("fs");
const p="./src/App.jsx";
let s=fs.readFileSync(p,"utf8");
const marker="M-CROSS_REBUILT_ROUND_ORDER_V2_SAFE";
if(s.includes(marker)){console.log("OK: すでに再構築済みです");process.exit(0)}
const scopeStart=s.indexOf('<div className="orderExcelWorkspace">');
if(scopeStart<0){console.error("ERROR: orderExcelWorkspaceが見つかりません");process.exit(1)}
const target='className="orderDraftItem" key={item.id+'-'+itemIndex}';
const targetIndex=s.indexOf(target,scopeStart);
if(targetIndex<0){console.error("ERROR: 施工発注明細が見つかりません");process.exit(1)}
const nextTarget=s.indexOf(target,targetIndex+target.length);
const workspaceEnd=s.indexOf('</section>',scopeStart);
if(nextTarget>=0&&nextTarget<workspaceEnd){console.error("ERROR: 対象範囲内に明細が複数あります。変更していません");process.exit(1)}
const cssMarker="/* M-CROSS_SERVICE_ORDER_BLACK_FIX_V3 */";
if(!s.includes(cssMarker)){console.error("ERROR: CSS挿入位置が見つかりません");process.exit(1)}
const css="/* "+marker+" */ .serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow{gap:7px!important;padding:7px!important;background:#e5f2e3!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow>strong{margin:0!important;padding:8px 10px!important;border:1px solid rgba(99,190,161,.62)!important;border-radius:12px!important;background:#fff!important;box-sizing:border-box!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow>small{margin:0!important;padding:7px 10px!important;border:1px solid rgba(110,145,232,.48)!important;border-radius:12px!important;background:#fff!important;box-sizing:border-box!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderQuantityCompare{margin:0!important;padding:8px!important;border:1px solid rgba(110,145,232,.52)!important;border-radius:12px!important;background:#fff!important;box-sizing:border-box!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderQuantityCompare span,.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderQuantityCompare b{border:0!important;background:transparent!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderQuantityField input,.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderRateField input{padding:7px 9px!important;border:1px solid rgba(216,77,131,.52)!important;border-radius:12px!important;background:#fff!important;box-sizing:border-box!important}.serviceOrderPanel .orderExcelSheet .rebuiltRoundOrderRow .orderLineAmount{margin:0!important;padding:8px!important;border-radius:12px!important;background:rgba(255,255,255,.8)!important} ";
fs.copyFileSync(p,p+".backup_rebuilt_round_v2_"+Date.now());
s=s.slice(0,targetIndex)+target.replace('orderDraftItem','orderDraftItem rebuiltRoundOrderRow')+s.slice(targetIndex+target.length);
s=s.replace(cssMarker,css+cssMarker);
fs.writeFileSync(p,s,"utf8");
console.log("OK: 施工発注明細1か所を丸枠UIとして再構築しました");
