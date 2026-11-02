const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_REMOVE_ESTIMATE_EXCLUDED_NOTICE_V31_SAFE';
const backup=file+'.remove-excluded-notice-v31-backup-'+Date.now();

function fail(message){
  console.error('ERROR: '+message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('除外項目案内削除V31はすでに適用されています。');

const text='見積から外した項目があります';
const positions=[];
let p=0;
while((p=original.indexOf(text,p))>=0){positions.push(p);p+=text.length}
if(positions.length!==1)fail('「'+text+'」の検出数が '+positions.length+' 件です。');

let next=original;
const textPos=positions[0];

// 条件付きJSXブロック全体を優先して特定。
const lineStart=next.lastIndexOf('\n',textPos)+1;
const lineEndRaw=next.indexOf('\n',textPos);
const lineEnd=lineEndRaw<0?next.length:lineEndRaw;
const line=next.slice(lineStart,lineEnd);

let start=-1,end=-1;
if(line.includes('{') && line.includes('}') && line.includes(text)){
  start=lineStart;
  end=lineEnd;
}else{
  // 複数行の場合、直前の条件式開始 { から対応する } までを探索。
  start=next.lastIndexOf('{',textPos);
  if(start<0)fail('案内ブロック開始位置が見つかりません。');
  let depth=0,quote=null,escaped=false;
  for(let i=start;i<next.length;i++){
    const ch=next[i];
    if(quote){
      if(escaped){escaped=false;continue}
      if(ch==='\\'){escaped=true;continue}
      if(ch===quote)quote=null;
      continue;
    }
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue}
    if(ch==='{')depth++;
    else if(ch==='}'){
      depth--;
      if(depth===0){end=i+1;break}
    }
  }
  if(end<0)fail('案内ブロック終了位置が見つかりません。');
}

const candidate=next.slice(start,end);
if(!candidate.includes(text))fail('削除対象の案内ブロックを確認できません。');
// ボタンや入力を巻き込まないことを確認
if(/<button|<input|<select|<textarea/.test(candidate))fail('対象範囲に操作要素が含まれるため安全停止しました。');

next=next.slice(0,start)+`\n                  {/* ${marker} */}`+next.slice(end);

if(next===original||!next.includes(marker))fail('V31の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');

try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 「見積から外した項目があります」案内削除V31を適用しました。');
  console.log('・案内枠だけ削除');
  console.log('・見積除外データ自体は維持');
  console.log('・見積/発注/Excel出力機能には触れていません');
  console.log('BACKUP: '+backup);
}catch(error){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
