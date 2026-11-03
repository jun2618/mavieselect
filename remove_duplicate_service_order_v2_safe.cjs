const fs=require("fs");
const p="./src/App.jsx";
let s=fs.readFileSync(p,"utf8");
fs.copyFileSync(p,p+".backup_remove_v2_"+Date.now());
const before=s;
s=s.replace(/^import ServiceOrderV2 from "\.\/ServiceOrderV2\.jsx";\r?\n/m,"");
s=s.replace(/^\s*\{\/\* M-CROSS_SERVICE_ORDER_V2_CONNECTED_V1_SAFE \*\/\}\r?\n^\s*\{.*<ServiceOrderV2.*\r?\n/m,"");
if(s===before){console.error("ERROR: V2接続箇所が見つからないため変更していません");process.exit(1)}
if(s.includes("M-CROSS_SERVICE_ORDER_V2_CONNECTED_V1_SAFE")||s.includes("<ServiceOrderV2")){console.error("ERROR: V2接続が残っています。保存していません");process.exit(1)}
fs.writeFileSync(p,s,"utf8");
console.log("OK: 重複していたWORK ORDER V2だけ外しました。既存の鍵情報とExcel出力は残しています");
