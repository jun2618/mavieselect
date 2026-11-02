const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_DYNAMIC_SUM_EXTENDED_CELLS_V3_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
if(!s.includes('M-CROSS_COMBINED_ESTIMATE_DYNAMIC_ROWS_V2_SAFE')){console.error('ERROR: dynamic rows V2 not found; no changes');process.exit(1)}
const backup=file+'.before-dynamic-sum-cells-v3-'+Date.now()+'.bak';

// 1. Remove leftover total-row merges from rows reused as detail rows.
const anchor="      // Old total cells must not remain inside the now-expanded detail area.\n      for(const r of [55,56,57])if(r<=estimateLastRow)for(const c of ['A','B','C','D','E','F','G','H','I','J','K'])ws.cell(c+r).value('')";
const replacement=`      /* ${marker} */
      // Rows 55-57 were subtotal/tax/total rows in the template. When reused as detail rows,
      // remove their old merges and contents so quantity/unit/rate stay in H/I/J.
      for(let r=55;r<=estimateLastRow;r++){
        for(const range of ['A'+r+':K'+r,'C'+r+':G'+r,'H'+r+':J'+r,'I'+r+':J'+r]){
          try{const rg=ws.range(range);if(rg.merged())rg.merged(false)}catch{}
        }
        for(const c of ['A','B','C','D','E','F','G','H','I','J','K'])ws.cell(c+r).value('')
      }`;
if(s.split(anchor).length-1!==1){console.error('ERROR: reused total-row cleanup block MATCH='+(s.split(anchor).length-1)+'; no changes');process.exit(1)}
s=s.replace(anchor,replacement);

// 2. Replace fixed numeric totals with formulas that follow the last detail row.
const oldTotals="    const subtotal=out.reduce((sum,row)=>sum+(row.amount===''||row.amount==null?0:(Number(row.amount)||0)),0),tax=Math.floor(subtotal*.1),total=subtotal+tax;ws.cell('K'+subtotalRow).value(subtotal);ws.cell('K'+taxRow).value(tax);ws.cell('K'+totalRow).value(total);ws.cell('E19').value(total)";
const newTotals="    ws.cell('K'+subtotalRow).formula('SUM(K23:K'+estimateLastRow+')');ws.cell('K'+taxRow).formula('ROUNDDOWN(K'+subtotalRow+'*10%,0)');ws.cell('K'+totalRow).formula('K'+subtotalRow+'+K'+taxRow);ws.cell('E19').formula('K'+totalRow)";
if(s.split(oldTotals).length-1!==1){console.error('ERROR: totals block MATCH='+(s.split(oldTotals).length-1)+'; no changes');process.exit(1)}
s=s.replace(oldTotals,newTotals);

// 3. Ensure extended detail rows use normal detail alignment and number formats.
const rowWrite="      ws.cell('H'+r).value(cv(row.quantity));ws.cell('I'+r).value(row.unit||'');ws.cell('J'+r).value(cv(row.rate));ws.cell('K'+r).value(cv(row.amount))";
const rowWriteNew=`      ws.cell('H'+r).value(cv(row.quantity)).style({horizontalAlignment:'right',verticalAlignment:'center',numberFormat:'0.0'})
      ws.cell('I'+r).value(row.unit||'').style({horizontalAlignment:'center',verticalAlignment:'center'})
      ws.cell('J'+r).value(cv(row.rate)).style({horizontalAlignment:'right',verticalAlignment:'center',numberFormat:'#,##0'})
      ws.cell('K'+r).value(cv(row.amount)).style({horizontalAlignment:'right',verticalAlignment:'center',numberFormat:'#,##0'})`;
if(s.split(rowWrite).length-1!==1){console.error('ERROR: detail numeric row writer MATCH='+(s.split(rowWrite).length-1)+'; no changes');process.exit(1)}
s=s.replace(rowWrite,rowWriteNew);

fs.copyFileSync(file,backup);fs.writeFileSync(file,s,'utf8');
console.log('OK: dynamic SUM formulas and extended-row cells fixed V3');
console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
