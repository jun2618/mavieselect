const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_FINAL_ORDER_STAFF_PHONE_V10_SAFE';
const backup=file+'.staff-phone-v10-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('担当電話表示V10はすでに適用されています。');
if(!original.includes('M-CROSS_FINAL_ORDER_STAFF_DROPDOWN_V9_SAFE'))fail('担当者ドロップダウンV9が見つかりません。');
if(!original.includes('M-CROSS_FINAL_ORDER_XLSX_POPULATE_V6_SAFE'))fail('xlsx-populate V6が見つかりません。');
let next=original;

// G12:J13 はテンプレートで結合済み。G13へ別書込せず、G12へ担当＋電話を2行で入れる。
const oldBlock=`      const staff=finalOrderStaffMaster[finalOrderStaff]||null
      ws.cell('G12').value(staff?('担当 '+staff.name):'')
      ws.cell('G13').value(staff&&staff.phone?('TEL '+staff.phone):'')`;
const count=next.split(oldBlock).length-1;
if(count!==1)fail('担当者Excel転記処理を一意に特定できません。検出数: '+count);

const newBlock=`      /* ${marker} */
      const staff=finalOrderStaffMaster[finalOrderStaff]||null
      ws.cell('G12')
        .value(staff?['担当 '+staff.name,staff.phone||''].filter(Boolean).join('\\n'):'')
        .style({wrapText:true,horizontalAlignment:'center',verticalAlignment:'center'})`;
next=next.replace(oldBlock,newBlock);

if(next===original||!next.includes(marker))fail('担当電話表示V10の適用に失敗しました。');
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 担当電話表示V10を適用しました。');
  console.log('・G12:J13の結合セル内へ担当名＋電話番号を2行表示');
  console.log('・町田: 090-9432-4445');
  console.log('・佐々木: 090-6995-5636');
  console.log('・坂下: 電話番号未設定のため氏名のみ');
  console.log('・未選択時は空白');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
