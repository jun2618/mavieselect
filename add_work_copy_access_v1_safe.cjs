const fs=require('fs');
const app='./src/App.jsx';
const sheet='./src/MCrossEstimateSheet.jsx';
let a=fs.readFileSync(app,'utf8');
let s=fs.readFileSync(sheet,'utf8');
const mark='M-CROSS_WORK_COPY_ACCESS_V1_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const propOld='rows={orderCandidateRows} onGoMeasurement=';
const propNew='rows={orderCandidateRows} propertyAccess={liveSelectedProperty ? {autoLock:liveSelectedProperty.autoLock||\'\',keyBox:liveSelectedProperty.keyBox||\'\',joiner:liveSelectedProperty.joiner||\'\',myLock:liveSelectedProperty.myLock||\'\',entranceOpen:liveSelectedProperty.entranceOpen||\'\'} : {}} onGoMeasurement=';
if((a.split(propOld).length-1)!==1){console.error('ERROR: App側の見積props位置が一致しません。変更していません。');process.exit(1)}
const sigOld="export default function MCrossEstimateSheet({company='',propertyName='',unit='',address='',workName='',rows:sourceRows=[],onGoMeasurement,onGoOrder,onGoCost,onExportEstimate}){";
const sigNew="export default function MCrossEstimateSheet({company='',propertyName='',unit='',address='',workName='',rows:sourceRows=[],propertyAccess={},onGoMeasurement,onGoOrder,onGoCost,onExportEstimate}){";
if((s.split(sigOld).length-1)!==1){console.error('ERROR: 見積コンポーネントprops位置が一致しません。変更していません。');process.exit(1)}
const needle="const blocks=[];if(property)blocks.push('【物件】\\n'+property);if(address)blocks.push('【住所】\\n'+address);blocks.push('【作業内容】\\n'+workLines.join('\\n'));";
const replacement=`/* ${mark} */const blocks=[];if(property)blocks.push('【物件】\\n'+property);if(address)blocks.push('【住所】\\n'+address);const accessLines=[['オートロック',propertyAccess.autoLock],['キーボックス',propertyAccess.keyBox],['ドアジョイナー',propertyAccess.joiner],['マイロック',propertyAccess.myLock],['玄関開放',propertyAccess.entranceOpen]].filter(([,value])=>String(value||'').trim()).map(([label,value])=>label+'：'+String(value).trim());if(accessLines.length)blocks.push('【鍵・入館情報】\\n'+accessLines.join('\\n'));blocks.push('【作業内容】\\n'+workLines.join('\\n'));`;
if((s.split(needle).length-1)!==1){console.error('ERROR: 現在の作業コピー処理が一致しません。変更していません。');process.exit(1)}
fs.copyFileSync(app,'./src/App.before_work_copy_access_v1.jsx');
fs.copyFileSync(sheet,'./src/MCrossEstimateSheet.before_work_copy_access_v1.jsx');
a=a.replace(propOld,propNew);
s=s.replace(sigOld,sigNew).replace(needle,replacement);
fs.writeFileSync(app,a,'utf8');
fs.writeFileSync(sheet,s,'utf8');
console.log('OK: 作業コピーへ鍵・入館情報を接続しました。');
