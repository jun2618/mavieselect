const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-combined-colors-v3';
const mark='M-CROSS_COMBINED_COLORS_V3_EXACT_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: V3適用済みです。');process.exit(0)}
const a=s.indexOf('async function downloadCombinedEstimateMeasurementExcel('), z=s.indexOf('\nasync function downloadEstimateExcelLegacy',a);
if(a<0||z<0)fail('一括出力関数を特定できません。');
let x=s.slice(a,z);
const hs=x.indexOf('    function addSheet('), he=x.indexOf("    addSheet('クロス採寸'",hs);
if(hs<0||he<0)fail('addSheet範囲を特定できません。');
const helper=`    /* ${mark} */\n    function addSheet(name,headers,data,colors){\n      const safeHeaders=Array.isArray(headers)?headers:[]\n      const safeData=Array.isArray(data)?data:[]\n      const palette=colors&&typeof colors==='object'?colors:{header:'5271C4',pale:'EAF0FF',title:'3658A7'}\n      const old=workbook.sheet(name); if(old)workbook.deleteSheet(name)\n      const sh=workbook.addSheet(name)\n      sh.cell('A1').value(name+' 採寸データ').style({bold:true,fontSize:16,fill:palette.title,fontColor:'FFFFFF'})\n      ;[['管理会社',entry.company||''],['物件名',entry.propertyName||''],['住所',entry.address||''],['号室',entry.unit||'']].forEach((v,i)=>{sh.cell(3+i,1).value(v[0]).style({bold:true,fill:palette.pale});sh.cell(3+i,2).value(v[1])})\n      safeHeaders.forEach((h,i)=>sh.cell(8,i+1).value(h).style({bold:true,fill:palette.header,fontColor:'FFFFFF'}))\n      safeData.forEach((row,ri)=>(Array.isArray(row)?row:[]).forEach((v,ci)=>{const c=sh.cell(9+ri,1+ci).value(v);if(ri%2===1)c.style('fill',palette.pale)}))\n      safeHeaders.forEach((_,i)=>sh.column(i+1).width(i===0?16:14))\n    }\n`;
x=x.slice(0,hs)+helper+x.slice(he);
// Replace all five generated call lines exactly, eliminating the malformed V1 palette injection.
const lines=x.split('\n');
const calls={
'クロス採寸':`    addSheet('クロス採寸',['部屋','採寸区分','クロス種別','施工面','メモ','高さ(m)','本数','数量'],(entry.records||[]).map(r=>[r.room||'',r.type||'',r.type==='壁'?(r.crossFinish==='color'?'カラークロス':'通常クロス'):'',r.surfaceName||'',r.memo||'',Number(r.height||0),Number(r.count||0),Number(formatQuantity(getRecordQuantity(r)))]),{header:'5271C4',pale:'EAF0FF',title:'3658A7'})`,
'CF採寸':`    addSheet('CF採寸',['部屋','メモ','長さ(m)','本数','数量'],(entry.cfRecords||[]).map(r=>[r.room||'',r.memo||'',Number(r.length||0),Number(r.count||0),Number(formatQuantity(getLengthQuantity(r)))]),{header:'2F9E75',pale:'E8F7F1',title:'237A5B'})`,
'ソフト巾木':`    addSheet('ソフト巾木',['部屋','メモ','枚数'],(entry.softRecords||[]).map(r=>[r.room||'',r.memo||'',Number(formatQuantity(getSoftBaseboardQuantity(r)))]),{header:'D08A28',pale:'FFF4DF',title:'A86B17'})`,
'床見切り':`    addSheet('床見切り',['部屋1','部屋2','カラー','数量'],(entry.floorTrimRecords||[]).map(r=>[r.roomA||'',r.roomB||'',r.color||'',Number(r.quantity||0)]),{header:'8762B8',pale:'F2EBFA',title:'68458F'})`,
'その他工事':`    addSheet('その他工事',['部屋','工事内容','メモ','数量','単位','単価','金額'],(entry.additionalWorks||[]).map(r=>[r.room||'',r.work||'',r.memo||'',Number(r.quantity||0),r.unit||'',Number(r.unitPrice||0),Number(r.amount||(Number(r.quantity)||0)*(Number(r.unitPrice)||0))]),{header:'C45E68',pale:'FCECEF',title:'9E434D'})`
};
const seen={};
for(let i=0;i<lines.length;i++){for(const name of Object.keys(calls)){if(lines[i].includes("addSheet('"+name+"'")){lines[i]=calls[name];seen[name]=(seen[name]||0)+1}}}
for(const name of Object.keys(calls))if(seen[name]!==1)fail(name+' 呼出し数='+String(seen[name]||0)+'。変更していません。');
x=lines.join('\n');
fs.copyFileSync(p,b);
try{s=s.slice(0,a)+x+s.slice(z);fs.writeFileSync(p,s,'utf8');console.log('採寸シート5種類の呼出しと配色引数を正しい形へ再構築しました。');cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});console.log('OK: 一括Excel色分けV3を適用しました。');console.log('BACKUP: '+b)}catch(e){console.error('失敗したため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
