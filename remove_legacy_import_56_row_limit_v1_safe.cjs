const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_LEGACY_IMPORT_DYNAMIC_LAST_ROW_V1_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const oldWorks="      const additionalWorks=[]\n      for(let row=23;row<=56;row++){const raw=text(estimate.cell('C'+row).value());if(!raw)continue;const {room,work}=classify(raw);const legacyTradeType=classifyLegacyTrade(raw);const q=estimate.cell('H'+row).value(),p=estimate.cell('J'+row).value(),a=estimate.cell('K'+row).value();additionalWorks.push({id:'legacy-estimate-row-'+row,room,work,spec:'',estimateParts:[room,'',work,''],quantity:q==null||q===''?'':number(q),unit:text(estimate.cell('I'+row).value()),unitPrice:p==null||p===''?'':number(p),amount:a==null||a===''?'':number(a),memo:'',sourceSheet:'見積書',sourceRow:row,legacyRawLabel:raw,legacyTradeType,category:legacyTradeType})}";
const oldNotes="      const legacyEstimateNotes=[]\n      for(let row=22;row<=56;row++)for(const col of ['L','M','N','O','P','Q']){const value=text(estimate.cell(col+row).value());if(value)legacyEstimateNotes.push({row,cell:col+row,text:value})}";
if(s.split(oldWorks).length-1!==1||s.split(oldNotes).length-1!==1){console.error('ERROR: legacy fixed-row blocks not found exactly; no changes');process.exit(1)}
const newWorks=`      /* ${marker} */
      const legacyFooterLabels=new Set(['小計','消費税','消費税(10%)','消費税（10%）','合計','備考'])
      let legacyDetailLastRow=22
      for(let row=23;row<=300;row++){
        const footerHit=['A','B','C','D','E','F','G','H','I','J','K'].some(col=>legacyFooterLabels.has(text(estimate.cell(col+row).value())))
        if(footerHit)break
        const hasDetail=['C','H','I','J','K'].some(col=>text(estimate.cell(col+row).value())!=='')
        if(hasDetail)legacyDetailLastRow=row
      }
      const additionalWorks=[]
      for(let row=23;row<=legacyDetailLastRow;row++){const raw=text(estimate.cell('C'+row).value());if(!raw)continue;const {room,work}=classify(raw);const legacyTradeType=classifyLegacyTrade(raw);const q=estimate.cell('H'+row).value(),p=estimate.cell('J'+row).value(),a=estimate.cell('K'+row).value();additionalWorks.push({id:'legacy-estimate-row-'+row,room,work,spec:'',estimateParts:[room,'',work,''],quantity:q==null||q===''?'':number(q),unit:text(estimate.cell('I'+row).value()),unitPrice:p==null||p===''?'':number(p),amount:a==null||a===''?'':number(a),memo:'',sourceSheet:'見積書',sourceRow:row,legacyRawLabel:raw,legacyTradeType,category:legacyTradeType})}`;
const newNotes=`      const legacyEstimateNotes=[]
      for(let row=22;row<=legacyDetailLastRow;row++)for(const col of ['L','M','N','O','P','Q']){const value=text(estimate.cell(col+row).value());if(value)legacyEstimateNotes.push({row,cell:col+row,text:value})}`;
s=s.replace(oldWorks,newWorks).replace(oldNotes,newNotes);
const alertOld="window.alert('旧工事カードを取り込みました。\\n見積明細: '+additionalWorks.length+'件\\n右側文章: '+legacyEstimateNotes.length+'件\\nクロス: '+(tradeCounts.cross||0)+'件 / CF: '+(tradeCounts.cf||0)+'件 / 巾木: '+(tradeCounts.soft||0)+'件 / 見切り: '+(tradeCounts.floorTrim||0)+'件 / その他: '+(tradeCounts.other||0)+'件')";
if(s.includes(alertOld)) s=s.replace(alertOld,"window.alert('旧工事カードを取り込みました。\\n見積明細: '+additionalWorks.length+'件（元Excel '+legacyDetailLastRow+'行目まで）\\n右側文章: '+legacyEstimateNotes.length+'件\\nクロス: '+(tradeCounts.cross||0)+'件 / CF: '+(tradeCounts.cf||0)+'件 / 巾木: '+(tradeCounts.soft||0)+'件 / 見切り: '+(tradeCounts.floorTrim||0)+'件 / その他: '+(tradeCounts.other||0)+'件')");
const backup=file+'.before-legacy-dynamic-last-row-'+Date.now()+'.bak';
fs.copyFileSync(file,backup);fs.writeFileSync(file,s,'utf8');
console.log('OK: legacy import row 56 limit removed');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
