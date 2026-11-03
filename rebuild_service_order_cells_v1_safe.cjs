const fs=require("fs");
const p="./src/App.jsx";
let s=fs.readFileSync(p,"utf8");
const mark="M-CROSS_NEW_SERVICE_ORDER_CELLS_V1_SAFE";
if(s.includes(mark)){console.log("OK: すでに適用済みです");process.exit(0)}
const old=`:<strong>{item.label}</strong>}{item.memo&&<small>{item.memo}</small>}`;
const neo=`:<div className="newOrderWorkSpecCell"><strong>{item.label}</strong><small>{String(item.productCode||"").trim()||(Array.isArray(item.parts)?item.parts.filter(Boolean).join(" "):"")||"仕様・品番未設定"}</small>{item.memo&&<em>{item.memo}</em>}</div>}`;
const n=s.split(old).length-1;
if(n!==1){console.error("ERROR: 施工内容表示 MATCH="+n+"。変更していません");process.exit(1)}
const cssPos="/* M-CROSS_SERVICE_ORDER_BLACK_FIX_V4 */";
if(!s.includes(cssPos)){console.error("ERROR: CSS位置が見つかりません。変更していません");process.exit(1)}
const css=`/* ${mark} */ .serviceOrderPanel .newOrderWorkSpecCell{grid-column:1!important;grid-row:1 / span 2!important;display:grid!important;align-content:center!important;gap:6px!important;margin:6px 8px!important;padding:8px 10px!important;border:1px solid rgba(99,190,161,.62)!important;border-radius:14px!important;background:#fff!important;box-sizing:border-box!important}.serviceOrderPanel .newOrderWorkSpecCell>strong{display:block!important;padding:0!important;border:0!important;background:transparent!important;color:#314b42!important}.serviceOrderPanel .newOrderWorkSpecCell>small{display:block!important;padding:6px 8px!important;border:1px solid rgba(110,145,232,.42)!important;border-radius:10px!important;background:#f8fbff!important;color:#5b6270!important}.serviceOrderPanel .newOrderWorkSpecCell>em{font-size:12px!important;font-style:normal!important;color:#756a78!important}.serviceOrderPanel .rebuiltRoundOrderRow .orderQuantityCompare{margin:6px!important;padding:8px!important;border:1px solid rgba(110,145,232,.52)!important;border-radius:14px!important;background:#fff!important;box-sizing:border-box!important}.serviceOrderPanel .rebuiltRoundOrderRow .orderRateField input{border:1px solid rgba(216,77,131,.52)!important;border-radius:14px!important;background:#fff!important}.serviceOrderPanel .rebuiltRoundOrderRow .orderLineAmount{margin:6px!important;border:1px solid rgba(99,190,161,.35)!important;border-radius:14px!important;background:#fff!important}@media(max-width:620px){.serviceOrderPanel .newOrderWorkSpecCell{grid-column:1/-1!important;grid-row:auto!important;margin:0!important}.serviceOrderPanel .rebuiltRoundOrderRow .orderQuantityCompare{margin:0!important}} `;
fs.copyFileSync(p,p+".backup_new_order_cells_"+Date.now());
s=s.replace(old,neo);
s=s.replace(cssPos,css+cssPos);
fs.writeFileSync(p,s,"utf8");
console.log("OK: 工事項目・仕様品番・数量・単価・金額を専用丸枠UIへ作り直しました");
