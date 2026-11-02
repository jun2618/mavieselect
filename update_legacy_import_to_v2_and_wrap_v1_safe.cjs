const fs=require('fs');const path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');const backup=f+'.legacy-v2-wrap-v1-backup';const marker='M-CROSS_LEGACY_V2_WRAP_V1_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsxなし');process.exit(1)}let s=fs.readFileSync(f,'utf8');if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const schema="packageData?.schema === 'm-cross-legacy-import:v1'";
if(!s.includes(schema)){console.error('ERROR: legacy schema判定が見つかりません');process.exit(1)}
s=s.replace(schema,"['m-cross-legacy-import:v1','m-cross-legacy-import:v2'].includes(packageData?.schema)");
const cssAnchor='  .address { display:grid; gap:8px; margin:8px 0 20px; padding:15px; border:1px dashed #efc7b4; border-radius:15px; background:#fff7ed; }';
if(!s.includes(cssAnchor)){console.error('ERROR: CSS挿入位置なし');process.exit(1)}
const css=`  /* ${marker} */\n  .estimateTable strong,.estimateTable small,.estimateRow strong,.estimateRow small,.purchaseOrderPreviewItems strong,.purchaseOrderPreviewItems small{white-space:normal!important;overflow-wrap:anywhere;word-break:break-word;line-height:1.45}\n`;
s=s.replace(cssAnchor,css+cssAnchor);
fs.copyFileSync(f,backup);fs.writeFileSync(f,s,'utf8');console.log('OK: V2取込と長文折返しに対応しました');console.log('BACKUP:',backup);
