const fs=require('fs');const path=require('path');
const p=path.join(process.cwd(),'src','App.jsx');const b=path.join(process.cwd(),'src','App.jsx.before-estimate-font-fix-final');
const M='/* M-CROSS_ESTIMATE_FONT_FIX_FINAL */';
if(!fs.existsSync(p)){console.error('ERROR: src/App.jsx が見つかりません。');process.exit(1)}
let s=fs.readFileSync(p,'utf8');
if(s.includes(M)){console.log('SKIP: 適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_MOBILE_ESTIMATE_FINAL')||!s.includes('M-CROSS_ESTIMATE_NUMBERS_LARGE_V1')){console.error('ERROR: 対象CSSを確認できないため中止しました。');process.exit(1)}
const css=String.raw`
${M}
/* 概算見積の数字サイズを最終的に上書き。小中大のapp zoomにも連動する */
@media (max-width:700px){
 .estimateRow .estimateNumber{font-size:16px!important;line-height:1.5!important;font-weight:700!important;}
 .estimateRow>.estimateNumber:last-child,.estimateRow>.estimateNumber:last-child strong{font-size:18px!important;line-height:1.45!important;font-weight:900!important;}
 .estimateTotal{font-size:17px!important;font-weight:800!important;}
 .estimateTotal strong{font-size:20px!important;font-weight:900!important;}
}
`;
const a=s.includes('<style>{appStyles}</style>')?'<style>{appStyles}</style>':s.includes('<style>{styles}</style>')?'<style>{styles}</style>':null;
if(!a){console.error('ERROR: style要素を特定できません。');process.exit(1)}
fs.copyFileSync(p,b);s=s.replace(a,`${a}\n      <style>{\`${css.replace(/`/g,'\\`')}\`}</style>`);fs.writeFileSync(p,s,'utf8');
console.log('OK: 概算見積の数量・単価・金額・合計を確実に拡大しました。');console.log('BACKUP:',b);
