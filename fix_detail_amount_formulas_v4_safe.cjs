const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_DETAIL_AMOUNT_FORMULA_V4_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const old="      ws.cell('K'+r).value(cv(row.amount)).style({horizontalAlignment:'right',verticalAlignment:'center',numberFormat:'#,##0'})";
const n=s.split(old).length-1;
if(n!==1){console.error('ERROR: K detail writer MATCH='+n+'; no changes');process.exit(1)}
const neu=`      /* ${marker} */
      const quantityValue=cv(row.quantity),rateValue=cv(row.rate),amountValue=cv(row.amount)
      const kCell=ws.cell('K'+r)
      if(quantityValue!==''&&rateValue!=='')kCell.formula('H'+r+'*J'+r)
      else kCell.value(amountValue)
      kCell.style({horizontalAlignment:'right',verticalAlignment:'center',numberFormat:'#,##0'})`;
const backup=file+'.before-detail-amount-formula-v4-'+Date.now()+'.bak';
fs.copyFileSync(file,backup);s=s.replace(old,neu);fs.writeFileSync(file,s,'utf8');
console.log('OK: detail K-column formulas added');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
