const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const marker='M-CROSS_CONTRACTOR_SCROLL_FLOW_V4_SAFE';
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const openOld='onClick={() => { setShowContractorPicker(true); window.setTimeout(()=>document.querySelector(".contractorPickerPanel")?.scrollTo({top:0,left:0,behavior:"instant"}),30) }}';
const openNew=`onClick={() => { setShowContractorPicker(true); window.setTimeout(()=>{const b=document.querySelector('.contractorPickerBackdrop');const p=document.querySelector('.contractorPickerPanel');if(b){b.scrollTop=0;b.scrollLeft=0}if(p){p.scrollTop=0;p.scrollLeft=0}},50) }}`;
const closeOld='window.setTimeout(()=>document.querySelector(".serviceOrderPanel")?.scrollIntoView({behavior:"smooth",block:"start"}),60) /* M-CROSS_CONTRACTOR_SCROLL_FLOW_V1_SAFE */';
const closeNew=`window.setTimeout(()=>document.querySelector('.serviceOrderPanel')?.scrollIntoView({behavior:'auto',block:'start'}),80) /* M-CROSS_CONTRACTOR_SCROLL_FLOW_V1_SAFE */ /* ${marker} */`;
for(const [old,label] of [[openOld,'開く処理'],[closeOld,'選択後処理']]){const n=s.split(old).length-1;if(n!==1){console.error('ERROR: '+label+' MATCH='+n+' 変更していません。');process.exit(1)}}
fs.copyFileSync(p,'./src/App.before_contractor_scroll_flow_v4.jsx');
s=s.replace(openOld,openNew).replace(closeOld,closeNew);
fs.writeFileSync(p,s,'utf8');
console.log('OK: 職人一覧は最上部、選択後は施工発注トップへ移動します。');
