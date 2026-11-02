const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const marker='M-CROSS_CONTRACTOR_SCROLL_FLOW_V3_SAFE';
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
if(!s.includes('M-CROSS_CONTRACTOR_SCROLL_FLOW_V1_SAFE')){console.error('ERROR: V1が見つかりません。変更していません。');process.exit(1)}
const openOld='onClick={() => setShowContractorPicker(true)}';
const openNew=`onClick={() => {setShowContractorPicker(true);window.setTimeout(()=>{const backdrop=document.querySelector('.contractorPickerBackdrop');const panel=document.querySelector('.contractorPickerPanel');if(backdrop){backdrop.scrollTop=0;backdrop.scrollLeft=0}if(panel){panel.scrollTop=0;panel.scrollLeft=0}},60)}}`;
if(!s.includes(openOld)){console.error('ERROR: 職人一覧を開く処理が見つかりません。変更していません。');process.exit(1)}
const closeOld='window.setTimeout(()=>document.querySelector(".serviceOrderPanel")?.scrollIntoView({behavior:"smooth",block:"start"}),60) /* M-CROSS_CONTRACTOR_SCROLL_FLOW_V1_SAFE */';
const closeNew=`window.setTimeout(()=>{const target=document.querySelector('.serviceOrderPanel');if(target)target.scrollIntoView({behavior:'auto',block:'start'})},80) /* M-CROSS_CONTRACTOR_SCROLL_FLOW_V1_SAFE */ /* ${marker} */`;
if(!s.includes(closeOld)){console.error('ERROR: V1の職人選択後処理が見つかりません。変更していません。');process.exit(1)}
fs.copyFileSync(p,'./src/App.before_contractor_scroll_flow_v3.jsx');
s=s.replace(openOld,openNew).replace(closeOld,closeNew);
fs.writeFileSync(p,s,'utf8');
console.log('OK: 職人一覧を最上部から表示し、選択後は施工発注トップへ移動します。');
