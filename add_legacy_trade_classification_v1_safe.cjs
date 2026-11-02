const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_LEGACY_TRADE_CLASSIFY_V1_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let src=fs.readFileSync(file,'utf8');
if(src.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(src.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const start=src.indexOf('async function importLegacyWorkCardExcel(');
const end=src.indexOf('async function importMCrossData(',start);
if(start<0||end<0){console.error('ERROR: legacy Excel importer range not found');process.exit(1)}
let head=src.slice(0,start),fn=src.slice(start,end),tail=src.slice(end);
function once(label,a,b){const n=fn.split(a).length-1;if(n!==1){console.error('ERROR: '+label+' MATCH='+n+'; no changes');process.exit(1)}fn=fn.replace(a,b)}
const nl=fn.includes('\r\n')?'\r\n':'\n';
const classifyAnchor=`      const classify=raw=>{const full=text(raw).replace(/[\\s　]+/g,' ').trim();const names=['浴室','トイレ','キッチン','台所','居間','洋室','和室','玄関','廊下','洗面所'];const room=names.find(n=>full.startsWith(n))||'その他';const work=room==='その他'?full:full.slice(room.length).trim();return{room,work:work||full}}`;
const classifyBlock=[
classifyAnchor,
`      /* ${marker} */`,
`      const classifyLegacyTrade=raw=>{`,
`        const value=text(raw).replace(/[\\s　]+/g,' ').toUpperCase()`,
`        if(/床見切り|見切り/.test(value))return 'floorTrim'`,
`        if(/ソフト巾木|巾木/.test(value))return 'soft'`,
`        if(/クッションフロア|(^|[^A-Z])CF([^A-Z]|$)|ＣＦ/.test(value))return 'cf'`,
`        if(/アクセントクロス|クロス|壁紙/.test(value))return 'cross'`,
`        return 'other'`,
`      }`
].join(nl);
once('classification function',classifyAnchor,classifyBlock);
const loopOld=`const {room,work}=classify(raw);const q=`;
const loopNew=`const {room,work}=classify(raw);const legacyTradeType=classifyLegacyTrade(raw);const q=`;
once('classification call',loopOld,loopNew);
const itemOld=`memo:'',sourceSheet:'見積書',sourceRow:row,legacyRawLabel:raw})`;
const itemNew=`memo:'',sourceSheet:'見積書',sourceRow:row,legacyRawLabel:raw,legacyTradeType,category:legacyTradeType})`;
once('classification fields',itemOld,itemNew);
const alertOld=`window.alert('旧工事カードを取り込みました。\\n見積明細: '+additionalWorks.length+'件\\n右側文章: '+legacyEstimateNotes.length+'件')`;
const alertNew=`const tradeCounts=additionalWorks.reduce((m,x)=>{m[x.legacyTradeType]=(m[x.legacyTradeType]||0)+1;return m},{})${nl}      window.alert('旧工事カードを取り込みました。\\n見積明細: '+additionalWorks.length+'件\\n右側文章: '+legacyEstimateNotes.length+'件\\nクロス: '+(tradeCounts.cross||0)+'件 / CF: '+(tradeCounts.cf||0)+'件 / 巾木: '+(tradeCounts.soft||0)+'件 / 見切り: '+(tradeCounts.floorTrim||0)+'件 / その他: '+(tradeCounts.other||0)+'件')`;
once('classification result alert',alertOld,alertNew);
const next=head+fn+tail,backup=file+'.before-legacy-trade-classify-'+Date.now()+'.bak';
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
console.log('OK: legacy trade classification added');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
