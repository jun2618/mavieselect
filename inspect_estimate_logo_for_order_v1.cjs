const fs=require('fs');
const file='./src/App.jsx';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx が見つかりません。');process.exit(1)}
const text=fs.readFileSync(file,'utf8');
const lines=text.split(/\r?\n/);
const keys=['addImage','getImage','logo','ロゴ','mcross-estimate-template'];
const hits=[];
for(let i=0;i<lines.length;i++){
  if(keys.some(k=>lines[i].toLowerCase().includes(k.toLowerCase()))){
    const from=Math.max(0,i-12),to=Math.min(lines.length,i+18);
    hits.push(`--- ${from+1}-${to} ---\n`+lines.slice(from,to).map((v,j)=>`${from+j+1}: ${v}`).join('\n'));
  }
}
const out='./estimate_logo_inspection.txt';
fs.writeFileSync(out,['M-Cross estimate logo inspection','================================',...hits].join('\n\n'),'utf8');
console.log('OK: App.jsxは変更していません。');
console.log('出力: '+out);
console.log('次に: Get-Content .\\estimate_logo_inspection.txt -Encoding UTF8');
