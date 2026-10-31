const fs=require('fs');
const path=require('path');

const roots=['./src'];
const exts=new Set(['.js','.jsx','.ts','.tsx']);
const patterns=[
  /graph\.microsoft\.com/ig,
  /OneDrive/ig,
  /accessToken/ig,
  /msal/ig,
  /Files\.ReadWrite/ig,
  /drive\/root/ig,
  /drive\/items/ig,
  /uploadSession/ig,
  /fetch\s*\(/ig
];

function walk(dir,out=[]){
  if(!fs.existsSync(dir))return out;
  for(const name of fs.readdirSync(dir)){
    const p=path.join(dir,name);
    const st=fs.statSync(p);
    if(st.isDirectory())walk(p,out);
    else if(exts.has(path.extname(p)))out.push(p);
  }
  return out;
}

const files=roots.flatMap(r=>walk(r));
const report=[];
report.push('M-Cross OneDrive/Graph readiness scan');
report.push('====================================');
for(const file of files){
  const text=fs.readFileSync(file,'utf8');
  const lines=text.split(/\r?\n/);
  let hits=[];
  lines.forEach((line,i)=>{
    if(patterns.some(re=>{re.lastIndex=0;return re.test(line)})){
      hits.push(`${i+1}: ${line.trim()}`);
    }
  });
  if(hits.length){
    report.push('');
    report.push('FILE: '+file);
    report.push(...hits.slice(0,120));
  }
}
const out='./mcross_onedrive_export_readiness.txt';
fs.writeFileSync(out,report.join('\n'),'utf8');
console.log('OK: OneDrive/Graph連携の既存実装を確認しました。');
console.log('出力: '+out);
console.log('このCJSはApp.jsxを変更しません。');
