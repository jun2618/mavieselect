const fs=require("fs");
const p="./src/App.jsx";
let s=fs.readFileSync(p,"utf8");
const old=".orderExcelSheet .orderDraftItem{grid-template-columns:minmax(180px,1fr) 80px 60px 100px 110px;gap:0;padding:0;border:0;border-bottom:1px solid #aeb4b8;border-radius:0;background:#fff}";
const neo=".orderExcelSheet .orderDraftItem{grid-template-columns:minmax(180px,1fr) 80px 60px 100px 110px;gap:6px;padding:6px;border:0;border-bottom:1px solid #aeb4b8;border-radius:14px;background:#fff}";
const n=s.split(old).length-1;
if(n!==1){console.error("ERROR: 対象CSS MATCH="+n+"。変更していません");process.exit(1)}
fs.copyFileSync(p,p+".backup_roundcells_"+Date.now());
s=s.replace(old,neo);
s=s.replace(".orderExcelSheet .orderDraftItem>strong{padding:8px;border-right:1px solid #aeb4b8}",".orderExcelSheet .orderDraftItem>strong{padding:8px 10px;border:1px solid rgba(99,190,161,.48);border-radius:12px;background:#fff}");
s=s.replace(".orderExcelSheet .orderDraftItem>small{grid-column:1;padding:0 8px 7px}",".orderExcelSheet .orderDraftItem>small{grid-column:1;padding:6px 10px;border:1px solid rgba(110,145,232,.38);border-radius:12px;background:#fff}");
s=s.replace(".orderExcelSheet .orderSourceQuantity,.orderExcelSheet .orderQuantityCompare{grid-column:2;grid-row:1 / span 2;display:grid;justify-items:center;gap:2px;padding:8px;border-left:1px solid #aeb4b8}",".orderExcelSheet .orderSourceQuantity,.orderExcelSheet .orderQuantityCompare{grid-column:2;grid-row:1 / span 2;display:grid;justify-items:center;gap:2px;padding:8px;border:1px solid rgba(110,145,232,.45);border-radius:12px;background:#fff}");
fs.writeFileSync(p,s,"utf8");
console.log("OK: 罫線を維持して丸枠CSSを復元しました");
