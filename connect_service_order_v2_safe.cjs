const fs=require("fs");
const p="./src/App.jsx";
let s=fs.readFileSync(p,"utf8");
const mark="M-CROSS_SERVICE_ORDER_V2_CONNECTED_V1_SAFE";
if(s.includes(mark)){console.log("OK: 発注書V2は接続済みです");process.exit(0)}
const importLine='import ServiceOrderV2 from "./ServiceOrderV2.jsx";';
if(!s.includes(importLine)){const firstImport=s.indexOf("import ");if(firstImport<0){console.error("ERROR: import位置が見つかりません");process.exit(1)}s=s.slice(0,firstImport)+importLine+"\n"+s.slice(firstImport)}
const anchor='                      <div className="orderExcelWorkspace">';
const count=s.split(anchor).length-1;
if(count!==1){console.error("ERROR: 発注書挿入位置 MATCH="+count+"。変更していません");process.exit(1)}
const v2='                      {/* '+mark+' */}\n                      {(orderDraft.orderMode||"service")==="service"&&<ServiceOrderV2 items={orderDraft.items||[]} contractor={orderDraft.contractor||""} propertyAccess={liveSelectedProperty ? {autoLock:liveSelectedProperty.autoLock||selectedProperty?.autoLock||"",keyBox:liveSelectedProperty.keyBox||selectedProperty?.keyBox||"",joiner:liveSelectedProperty.joiner||selectedProperty?.joiner||"",myLock:liveSelectedProperty.myLock||selectedProperty?.myLock||"",entranceOpen:liveSelectedProperty.entranceOpen||selectedProperty?.entranceOpen||""} : {autoLock:selectedProperty?.autoLock||"",keyBox:selectedProperty?.keyBox||"",joiner:selectedProperty?.joiner||"",myLock:selectedProperty?.myLock||"",entranceOpen:selectedProperty?.entranceOpen||""}} />}\n';
fs.copyFileSync(p,p+".backup_before_v2_connect_"+Date.now());
s=s.replace(anchor,v2+anchor);
fs.writeFileSync(p,s,"utf8");
console.log("OK: 発注書V2を接続しました。旧発注書は残しています");
