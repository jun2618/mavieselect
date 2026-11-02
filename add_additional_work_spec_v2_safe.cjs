const fs=require('fs');
const f='src/App.jsx';
const b='src/App.jsx.additional-work-spec-v1-backup';
let s=fs.readFileSync(f,'utf8');
const marker='M-CROSS_ADDITIONAL_WORK_SPEC_V1_SAFE';
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const edits=[
  ["  const [work, setWork] = useState('')", "  const [work, setWork] = useState('')\n  /* "+marker+" */\n  const [spec, setSpec] = useState('')"],
  ["    setWork('')\n    setQuantity('1')", "    setWork('')\n    setSpec('')\n    setQuantity('1')"],
  ["    setWork(item.work || '')\n    setQuantity(String(item.quantity ?? '1'))", "    setWork(item.work || '')\n    setSpec(item.spec || '')\n    setQuantity(String(item.quantity ?? '1'))"],
  ["      work: work.trim(),\n      quantity: numericQuantity,", "      work: work.trim(),\n      spec: spec.trim(),\n      quantity: numericQuantity,"],
  ["          {pastUnitPriceSuggestions.length > 0 && (", "          <label><span>{'\\u4ed5\\u69d8\\u30fb\\u5185\\u5bb9'}</span><input value={spec} onChange={event => setSpec(event.target.value)} placeholder={'\\u4f8b\\uff1a\\u30b5\\u30fc\\u30e2\\u5f0f\\u3001\\u30ab\\u30fc\\u30c8\\u30ea\\u30c3\\u30b8\\u4ed8\\u304d'} /></label>\n          {pastUnitPriceSuggestions.length > 0 && ("],
  ["<div><strong>{item.room}　{item.work}</strong><small>{item.memo || 'メモなし'}</small></div>", "<div><strong>{item.room}　{item.work}{item.spec ? '　' + item.spec : ''}</strong><small>{item.memo || 'メモなし'}</small></div>"],
  ["parts: [item.room || '', '', item.work || '', ''],", "parts: [item.room || '', item.work || '', item.spec || '', ''],"],
  ["[item.room||'','',item.work||'','']", "[item.room||'',item.work||'',item.spec||'','']"],
  ["item.room || '', item.work || '', Number(item.quantity || 0), item.unit || '式',", "item.room || '', item.work || '', item.spec || '', Number(item.quantity || 0), item.unit || '式',"],
  ["['部屋', '作業内容', '数量', '単位', '単価', '金額', 'メモ']", "['部屋', '作業内容', '仕様・内容', '数量', '単位', '単価', '金額', 'メモ']"]
];
for(const [from,to] of edits){
  if(!s.includes(from)){console.error('ERROR: TARGET NOT FOUND: '+from.slice(0,100));process.exit(1)}
  s=s.replace(from,to);
}
fs.copyFileSync(f,b);
fs.writeFileSync(f,s,'utf8');
console.log('OK: ADDITIONAL WORK SPEC V1 APPLIED / BACKUP: '+b);
