const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_COMBINED_ESTIMATE_DYNAMIC_ROWS_V2_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
if(!s.includes('M-CROSS_COMBINED_ESTIMATE_DYNAMIC_ROWS_V1_SAFE')){console.error('ERROR: V1 dynamic rows not found; no changes');process.exit(1)}
const start=s.indexOf('    if(extraEstimateRows>0){');
const end=s.indexOf("    ws.cell('B5').value",start);
if(start<0||end<0){console.error('ERROR: V1 dynamic block not found; no changes');process.exit(1)}
const replacement=`    /* ${marker} */
    if(extraEstimateRows>0){
      const styleKeys=['bold','italic','underline','strikethrough','fontSize','fontFamily','fontColor','horizontalAlignment','verticalAlignment','wrapText','shrinkToFit','fill','border','numberFormat']
      const copyCell=(fromAddr,toAddr,{copyValue=true}={})=>{
        const from=ws.cell(fromAddr),to=ws.cell(toAddr)
        if(copyValue){
          const formula=from.formula()
          if(formula)to.formula(formula);else to.value(from.value())
        }
        try{to.style(from.style(styleKeys))}catch{}
      }
      const copyRow=(fromRow,toRow,{copyValue=true}={})=>{
        for(const col of ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'])copyCell(col+fromRow,col+toRow,{copyValue})
        try{ws.row(toRow).height(ws.row(fromRow).height())}catch{}
      }
      // Keep the original total rows as templates, then extend the detail area.
      const totalTemplates=[55,56,57].map(r=>({
        values:['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'].map(col=>({col,value:ws.cell(col+r).value(),formula:ws.cell(col+r).formula(),styles:(()=>{try{return ws.cell(col+r).style(styleKeys)}catch{return null}})()})),
        height:(()=>{try{return ws.row(r).height()}catch{return null}})()
      }))
      for(let r=55;r<=estimateLastRow;r++)copyRow(54,r,{copyValue:false})
      totalTemplates.forEach((tpl,index)=>{
        const r=subtotalRow+index
        tpl.values.forEach(cell=>{const target=ws.cell(cell.col+r);if(cell.formula)target.formula(cell.formula);else target.value(cell.value);if(cell.styles)try{target.style(cell.styles)}catch{}})
        if(tpl.height!=null)try{ws.row(r).height(tpl.height)}catch{}
      })
      // Old total cells must not remain inside the now-expanded detail area.
      for(const r of [55,56,57])if(r<=estimateLastRow)for(const c of ['A','B','C','D','E','F','G','H','I','J','K'])ws.cell(c+r).value('')
    }
`;
const backup=file+'.before-dynamic-estimate-v2-'+Date.now()+'.bak';
fs.copyFileSync(file,backup);s=s.slice(0,start)+replacement+s.slice(end);fs.writeFileSync(file,s,'utf8');
console.log('OK: dynamic estimate copyFrom/copyTo removed');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
