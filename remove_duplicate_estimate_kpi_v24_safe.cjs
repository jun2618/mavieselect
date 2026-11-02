const fs=require('fs'),cp=require('child_process'),path=require('path');
const jsx=path.join(process.cwd(),'src','CostCalculationPage.jsx');
const marker='M-CROSS_REMOVE_DUPLICATE_ESTIMATE_KPI_V24_SAFE';
if(!fs.existsSync(jsx)){console.error('ERROR: CostCalculationPage.jsx not found');process.exit(1)}
let s=fs.readFileSync(jsx,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const needle='<article className="estimate">';
const starts=[];let pos=0;while((pos=s.indexOf(needle,pos))>=0){starts.push(pos);pos+=needle.length}
console.log('estimate KPI count:',starts.length);
if(starts.length!==2){console.error('ERROR: expected exactly 2 estimate KPI cards; no changes');process.exit(1)}
// Keep the newer, first card inserted by V23. Remove only the second duplicate article.
const start=starts[1];
let depth=0,end=-1,i=start;
const open='<article',close='</article>';
while(i<s.length){const no=s.indexOf(open,i),nc=s.indexOf(close,i);if(nc<0)break;if(no>=0&&no<nc){depth++;i=no+open.length;continue}depth--;i=nc+close.length;if(depth===0){end=i;break}}
if(end<0){console.error('ERROR: duplicate article end not found; no changes');process.exit(1)}
const backup=jsx+'.before-remove-duplicate-estimate-v24-'+Date.now()+'.bak';
fs.copyFileSync(jsx,backup);
s=s.slice(0,start)+`{/* ${marker}: duplicate estimate KPI removed */}`+s.slice(end);
fs.writeFileSync(jsx,s,'utf8');
console.log('OK: duplicate estimate KPI removed');console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,jsx);console.error('ERROR: build failed; JSX restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
