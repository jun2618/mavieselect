const fs=require('fs');
for(const f of ['./src/EstimateRowEditor.jsx','./src/App.jsx']){
 const s=fs.readFileSync(f,'utf8').split(/\r?\n/);
 console.log('\n### '+f);
 if(f.includes('EstimateRowEditor')) s.forEach((l,i)=>console.log(String(i+1).padStart(4),l));
 else for(let i=8460;i<8565 && i<s.length;i++) console.log(String(i+1).padStart(5),s[i]);
}
