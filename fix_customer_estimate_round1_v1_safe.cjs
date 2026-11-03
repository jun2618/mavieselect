const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const mark='M-CROSS_CUSTOMER_ESTIMATE_ROUND1_V1_SAFE';
if(s.includes(mark)){console.log('ALREADY APPLIED');process.exit(0)}
const crossOld="        const quantity = groupRecords.reduce((sum, record) => sum + getRecordQuantity(record), 0) * factor\n        if (quantity <= 0) return\n        const amount = groupRecords.reduce((sum, record) => sum + definition.amountForRecord(record), 0)";
const crossNew="        const rawQuantity = groupRecords.reduce((sum, record) => sum + getRecordQuantity(record), 0) * factor\n        const quantity = Math.round(rawQuantity * 10) / 10\n        if (quantity <= 0) return\n        const baseRate = Number(pricingSettings.crossRates[definition.kind === 'ceiling' ? '天井' : definition.kind === 'wall' ? '壁' : (groupRecords[0]?.type || '')] || 0)\n        const amount = quantity * baseRate";
const cfOld="      const quantity = measuredLength * 1.8\n      if (quantity <= 0) return\n      const rate = Number(pricingSettings.cfRate || 0)";
const cfNew="      const rawQuantity = measuredLength * 1.8\n      const quantity = Math.round(rawQuantity * 10) / 10\n      if (quantity <= 0) return\n      const rate = Number(pricingSettings.cfRate || 0)";
for(const [oldValue,newValue,label] of [[crossOld,crossNew,'クロス見積数量'],[cfOld,cfNew,'CF見積数量']]){const n=s.split(oldValue).length-1;if(n!==1){console.error('ERROR: '+label+' MATCH='+n+'。変更していません。');process.exit(1)}s=s.replace(oldValue,newValue)}
s=s.replace('function buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings) {','function buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings) {\n  /* '+mark+' */');
fs.copyFileSync(p,'./src/App.before_customer_estimate_round1_v1.jsx');
fs.writeFileSync(p,s,'utf8');
console.log('OK: 先方見積のクロス・CF数量を小数1桁に丸め、その数量で見積金額を計算するようにしました。');
