const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-room-part-color-v1';
const mark='M-CROSS_ROOM_PART_COLOR_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 部屋・部位色分けV1は適用済みです。');process.exit(0)}
const a=s.indexOf('async function downloadCombinedEstimateMeasurementExcel('),z=s.indexOf('\nasync function downloadEstimateExcelLegacy',a);
if(a<0||z<0)fail('一括出力関数を特定できません。');
let x=s.slice(a,z);
const hs=x.indexOf('    function addSheet('),he=x.indexOf("    addSheet('クロス採寸'",hs);
if(hs<0||he<0)fail('addSheet範囲を特定できません。');
const helper=`    /* ${mark} */\n    const roomColors=['EAF2FF','EAF8EF','FFF7D6','F3ECFF','FFF0DF','E5FAFB','FFEAF0','F1F3F5']\n    function roomFill(room){\n      const name=String(room||'').trim()\n      if(!name)return 'FFFFFF'\n      let hash=0; for(const ch of name)hash=(hash*31+ch.charCodeAt(0))>>>0\n      return roomColors[hash%roomColors.length]\n    }\n    function partFill(part){\n      const v=String(part||'')\n      if(v.includes('天井'))return 'DDEBFF'\n      if(v.includes('壁'))return 'E3F5E8'\n      if(v.includes('収納'))return 'FFE8CC'\n      return ''\n    }\n    function addSheet(name,headers,data){\n      const safeHeaders=Array.isArray(headers)?headers:[]\n      const safeData=Array.isArray(data)?data:[]\n      const old=workbook.sheet(name); if(old)workbook.deleteSheet(name)\n      const sh=workbook.addSheet(name)\n      sh.cell('A1').value(name+' 採寸データ').style({bold:true,fontSize:16,fill:'475569',fontColor:'FFFFFF'})\n      ;[['管理会社',entry.company||''],['物件名',entry.propertyName||''],['住所',entry.address||''],['号室',entry.unit||'']].forEach((v,i)=>{sh.cell(3+i,1).value(v[0]).style({bold:true,fill:'F1F5F9'});sh.cell(3+i,2).value(v[1])})\n      safeHeaders.forEach((h,i)=>sh.cell(8,i+1).value(h).style({bold:true,fill:'64748B',fontColor:'FFFFFF'}))\n      safeData.forEach((row,ri)=>{\n        const values=Array.isArray(row)?row:[]\n        const base=roomFill(values[0])\n        values.forEach((v,ci)=>sh.cell(9+ri,1+ci).value(v).style('fill',base))\n        if(name==='クロス採寸'&&values.length>1){const pf=partFill(values[1]);if(pf)sh.cell(9+ri,2).style({fill:pf,bold:true})}\n      })\n      safeHeaders.forEach((_,i)=>sh.column(i+1).width(i===0?16:14))\n    }\n`;
x=x.slice(0,hs)+helper+x.slice(he);
// Remove palette arguments from the five current calls by rebuilding them from known current V3 structure.
const lines=x.split('\n');
const rebuilt={
'クロス採寸':`    addSheet('クロス採寸',['部屋','採寸区分','クロス種別','施工面','メモ','高さ(m)','本数','数量'],(entry.records||[]).map(r=>[r.room||'',r.type||'',r.type==='壁'?(r.crossFinish==='color'?'カラークロス':'通常クロス'):'',r.surfaceName||'',r.memo||'',Number(r.height||0),Number(r.count||0),Number(formatQuantity(getRecordQuantity(r)))]))`,
'CF採寸':`    addSheet('CF採寸',['部屋','メモ','長さ(m)','本数','数量'],(entry.cfRecords||[]).map(r=>[r.room||'',r.memo||'',Number(r.length||0),Number(r.count||0),Number(formatQuantity(getLengthQuantity(r)))]))`,
'ソフト巾木':`    addSheet('ソフト巾木',['部屋','メモ','枚数'],(entry.softRecords||[]).map(r=>[r.room||'',r.memo||'',Number(formatQuantity(getSoftBaseboardQuantity(r)))]))`,
'床見切り':`    addSheet('床見切り',['部屋1','部屋2','カラー','数量'],(entry.floorTrimRecords||[]).map(r=>[r.roomA||'',r.roomB||'',r.color||'',Number(r.quantity||0)]))`,
'その他工事':`    addSheet('その他工事',['部屋','工事内容','メモ','数量','単位','単価','金額'],(entry.additionalWorks||[]).map(r=>[r.room||'',r.work||'',r.memo||'',Number(r.quantity||0),r.unit||'',Number(r.unitPrice||0),Number(r.amount||(Number(r.quantity)||0)*(Number(r.unitPrice)||0))]))`
};
const seen={};
for(let i=0;i<lines.length;i++){for(const name of Object.keys(rebuilt)){if(lines[i].includes("addSheet('"+name+"'")){lines[i]=rebuilt[name];seen[name]=(seen[name]||0)+1}}}
for(const n of Object.keys(rebuilt))if(seen[n]!==1)fail(n+' 呼出し数='+String(seen[n]||0));
x=lines.join('\n');
fs.copyFileSync(p,b);
try{s=s.slice(0,a)+x+s.slice(z);fs.writeFileSync(p,s,'utf8');console.log('シート単位の色分けを、部屋ごとの行色＋クロス部位セル色へ変更しました。');cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});console.log('OK: 部屋・部位色分けV1を適用しました。');console.log('BACKUP: '+b)}catch(e){console.error('失敗したため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
