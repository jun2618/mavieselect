const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_CUSTOMER_ESTIMATE_ROUND1_V3_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
let L=s.split(/\r?\n/); const eol=s.includes('\r\n')?'\r\n':'\n';
let c=L.findIndex(x=>x.includes('const quantity = groupRecords.reduce((sum, record) => sum + getRecordQuantity(record), 0) * factor'));
let f=L.findIndex(x=>x.includes('const quantity = measuredLength * 1.8'));
if(c<0||f<0){console.error('ERROR: 対象数量行を特定できません。変更していません。');process.exit(1)}
const ci=L[c].match(/^\s*/)[0];
L.splice(c,1,ci+'const rawQuantity = groupRecords.reduce((sum, record) => sum + getRecordQuantity(record), 0) * factor',ci+'const quantity = Math.round(rawQuantity * 10) / 10');
f=L.findIndex(x=>x.includes('const quantity = measuredLength * 1.8'));
const fi=L[f].match(/^\s*/)[0];
L.splice(f,1,fi+'const rawQuantity = measuredLength * 1.8',fi+'const quantity = Math.round(rawQuantity * 10) / 10');
const fn=L.findIndex(x=>x.includes('function buildEstimateRows(')); if(fn>=0)L.splice(fn+1,0,'  /* '+mark+' */');
fs.copyFileSync(p,'./src/App.before_customer_estimate_round1_v3.jsx');
fs.writeFileSync(p,L.join(eol),'utf8');
console.log('OK: 先方見積のクロス・CF数量を小数1桁に統一しました。');
