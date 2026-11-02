const fs=require('fs');
const cp=require('child_process');
const file='./src/App.jsx';
const marker='M-CROSS_REMOVE_HOME_EXPORT_SHORTCUTS_V23_SAFE';
const backup=file+'.remove-home-export-shortcuts-v23-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('V23はすでに適用されています。');

let next=original;
const panelPos=next.indexOf('<OneDriveSyncPanel />');
if(panelPos<0)fail('トップページのOneDriveSyncPanelが見つかりません。');
const scopeStart=Math.max(0,panelPos-8000);
const scopeEnd=Math.min(next.length,panelPos+8000);

function removeNearestButton(text){
  const positions=[];
  let p=scopeStart;
  while((p=next.indexOf(text,p))>=0 && p<scopeEnd){positions.push(p);p+=text.length}
  if(!positions.length)fail('トップページ周辺に「'+text+'」が見つかりません。');
  const candidates=positions.map(textPos=>{
    const start=next.lastIndexOf('<button',textPos);
    const end=next.indexOf('</button>',textPos);
    if(start<scopeStart||end<0||end>scopeEnd)return null;
    const block=next.slice(start,end+9);
    return block.includes(text)?{start,end:end+9,block}:null;
  }).filter(Boolean);
  if(candidates.length!==1)fail('トップページの「'+text+'」button候補が '+candidates.length+' 件です。');
  const c=candidates[0];
  next=next.slice(0,c.start)+next.slice(c.end);
}

removeNearestButton('採寸データ出力');
removeNearestButton('見積書を出力');

const anchor='<OneDriveSyncPanel />';
next=next.replace(anchor,`{/* ${marker} */}\n              ${anchor}`);
if(next===original||!next.includes(marker))fail('V23の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
 cp.execSync('npm run build',{stdio:'inherit',shell:true});
 console.log('');console.log('OK: トップ出力ショートカット削除V23を適用しました。');
 console.log('・トップ周辺だけを対象に「採寸データ出力」を削除');
 console.log('・トップ周辺だけを対象に「見積書を出力」を削除');
 console.log('・案件/見積画面側の同名テキストや機能は残します');
 console.log('BACKUP: '+backup);
}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
