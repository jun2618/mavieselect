const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_FINAL_ORDER_STAFF_FONT11_V12_SAFE';
const backup=file+'.staff-font11-v12-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('担当フォント11 V12はすでに適用されています。');
if(!original.includes('M-CROSS_FINAL_ORDER_STAFF_PHONE_V10_SAFE'))fail('担当電話表示V10が見つかりません。');

let next=original;
const oldBlock=`      ws.cell('G12')
        .value(staff?['担当 '+staff.name,staff.phone||''].filter(Boolean).join('\\n'):'')
        .style({wrapText:true,horizontalAlignment:'center',verticalAlignment:'center'})`;
const count=next.split(oldBlock).length-1;
if(count!==1)fail('担当欄のExcel転記処理を一意に特定できません。検出数: '+count);

const newBlock=`      /* ${marker} */
      ws.cell('G12')
        .value(staff?['担当 '+staff.name,staff.phone||''].filter(Boolean).join('\\n'):'')
        .style({wrapText:true,horizontalAlignment:'center',verticalAlignment:'center',fontSize:11})`;
next=next.replace(oldBlock,newBlock);

if(next===original||!next.includes(marker))fail('担当フォント11 V12の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 担当欄フォントサイズ11 V12を適用しました。');
  console.log('・担当名と電話番号をフォントサイズ11で出力');
  console.log('・中央揃え/折り返しは維持');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
