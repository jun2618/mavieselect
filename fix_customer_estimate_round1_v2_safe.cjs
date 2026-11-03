const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_CUSTOMER_ESTIMATE_ROUND1_V2_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
let lines=s.split(/\r?\n/);
const cross=lines.findIndex(l=>l.includes('const quantity = groupRecords.reduce((sum, record) => sum + getRecordQuantity(record), 0) * factor'));
const cf=lines.findIndex(l=>l.includes('const quantity = measuredLength * 1.8'));
if(cross<0||cf<0){console.error('ERROR: クロス/CF数量行を特定できません。変更していません。');process.exit(1)}
if(!lines[cross+1]?.includes('if (quantity <= 0) return')||!lines[cross+2]?.includes('const amount = groupRecords.reduce')){console.error('ERROR: クロス周辺が想定外です。変更していません。');process.exit(1)}
if(!lines[cf+1]?.includes('if (quantity <= 0) return')||!lines[cf+2]?.includes('const rate = Number(pricingSettings.cfRate')){console.error('ERROR: CF周辺が想定外です。変更していません。');process.exit(1)}
const ci=lines[cross].match(/^\s*/)[0];
lines.splice(cross,3,
 ci+'const rawQuantity = groupRecords.reduce((sum, record) => sum + getRecordQuantity(record), 0) * factor',
 ci+'const quantity = Math.round(rawQuantity * 10) / 10',
 ci+'if (quantity <= 0) return',
 ci+"const rateKey = definition.kind === 'ceiling' ? '天井' : definition.kind === 'wall' ? '壁' : String(groupRecords[0]?.type || '')",
 ci+'const rate = Number(pricingSettings.crossRates[rateKey] || 0)',
 ci+'const amount = quantity * rate'
);
// re-find CF after splice
const cf2=lines.findIndex(l=>l.includes('const quantity = measuredLength * 1.8'));
const fi=lines[cf2].match(/^\s*/)[0];
lines.splice(cf2,1,fi+'const rawQuantity = measuredLength * 1.8',fi+'const quantity = Math.round(rawQuantity * 10) / 10');
const fn=lines.findIndex(l=>l.includes('function buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings)'));
if(fn>=0)lines.splice(fn+1,0,'  /* '+mark+' */');
fs.copyFileSync(p,'./src/App.before_customer_estimate_round1_v2.jsx');
fs.writeFileSync(p,lines.join(s.includes('\r\n')?'\r\n':'\n'),'utf8');
console.log('OK: 先方見積のクロス・CFを小数1桁に丸め、その数量で金額を計算するようにしました。');
