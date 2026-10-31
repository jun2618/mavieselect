const fs = require('fs');
const path = require('path');
const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-mobile-estimate-final');
const FINAL = '/* M-CROSS_MOBILE_ESTIMATE_FINAL */';

if (!fs.existsSync(appPath)) { console.error('ERROR: src/App.jsx が見つかりません。'); process.exit(1); }
let s = fs.readFileSync(appPath, 'utf8');
if (s.includes(FINAL)) { console.log('SKIP: 最終版は適用済みです。'); process.exit(0); }

// Remove only prior injected estimate-layout style blocks V3-V6.
for (const v of ['V3','V4','V5','V6']) {
  const marker = `/* M-CROSS_MOBILE_ESTIMATE_LAYOUT_${v} */`;
  while (s.includes(marker)) {
    const markerPos = s.indexOf(marker);
    const styleOpen = s.lastIndexOf('<style>{`', markerPos);
    const styleClose = s.indexOf('`}</style>', markerPos);
    if (styleOpen < 0 || styleClose < 0) {
      console.error(`ERROR: ${v} の範囲を安全に特定できません。変更を中止しました。`);
      process.exit(1);
    }
    s = s.slice(0, styleOpen) + s.slice(styleClose + '`}</style>'.length);
  }
}

const anchor = s.includes('<style>{appStyles}</style>') ? '<style>{appStyles}</style>' : (s.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);
if (!anchor) { console.error('ERROR: 既存style要素を特定できません。'); process.exit(1); }
if (!s.includes('estimateRow') || !s.includes('estimateTotal')) { console.error('ERROR: 概算見積要素を確認できません。'); process.exit(1); }

const css = String.raw`
${FINAL}
/* Final mobile estimate layout: no horizontal scrolling. */
@media (max-width:700px) {
  .estimateRoom { width:100%!important; max-width:100%!important; overflow:visible!important; box-sizing:border-box!important; }
  .estimateRow { width:100%!important; max-width:100%!important; min-width:0!important; display:flex!important; flex-wrap:wrap!important; gap:4px 5px!important; box-sizing:border-box!important; overflow:visible!important; }
  .estimateRow > strong:first-child { flex:0 0 100%!important; width:100%!important; min-width:0!important; max-width:100%!important; white-space:normal!important; word-break:keep-all!important; overflow-wrap:break-word!important; font-size:1.02em!important; line-height:1.45!important; }
  .estimateRow > strong:first-child .estimateMemo { display:inline!important; margin-left:6px!important; white-space:normal!important; word-break:keep-all!important; overflow-wrap:break-word!important; font-size:.95em!important; }
  .estimateRow .estimateNumber { flex:0 0 auto!important; width:auto!important; max-width:100%!important; min-width:0!important; white-space:nowrap!important; font-size:.96em!important; line-height:1.4!important; text-align:left!important; }
  .estimateRow .estimateUnit::after { content:" ×"; }
  .estimateRow .estimateRate::after { content:" ＝"!important; }
  .estimateRow > .estimateNumber:last-child { margin-left:0!important; text-align:left!important; }
  .estimateRow > .estimateNumber:last-child::before { content:""!important; }
  .estimateTotal { width:100%!important; max-width:100%!important; display:flex!important; flex-wrap:wrap!important; justify-content:space-between!important; gap:6px 12px!important; box-sizing:border-box!important; overflow:visible!important; font-size:1.08em!important; }
  .estimateTotal strong { white-space:nowrap!important; font-size:1.15em!important; }
}
`;
const injection = `${anchor}\n      <style>{\`${css.replace(/`/g,'\\`')}\`}</style>`;
fs.copyFileSync(appPath, backupPath);
s = s.replace(anchor, injection);
fs.writeFileSync(appPath, s, 'utf8');
console.log('OK: V3-V6を整理し、スマホ概算見積の最終版1個に統合しました。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
