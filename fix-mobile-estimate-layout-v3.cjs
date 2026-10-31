const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-mobile-estimate-layout-v3');
const MARKER = '/* M-CROSS_MOBILE_ESTIMATE_LAYOUT_V3 */';

if (!fs.existsSync(appPath)) { console.error('ERROR: src/App.jsx が見つかりません。'); process.exit(1); }
let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(MARKER)) { console.log('SKIP: V3は適用済みです。'); process.exit(0); }
if (!source.includes('estimateRow') || !source.includes('estimateRoom')) { console.error('ERROR: 概算見積クラスが見つかりません。'); process.exit(1); }

const css = String.raw`
${MARKER}
.app { --est-accent:#c7783e; --est-border:rgba(199,120,62,.55); --est-surface:rgba(255,255,255,.78); }
.app.theme-dark { --est-accent:#93c5fd; --est-border:rgba(147,197,253,.55); --est-surface:rgba(15,23,42,.78); }
.app.theme-pop { --est-accent:#f472b6; --est-border:rgba(244,114,182,.62); --est-surface:rgba(255,247,252,.88); }
.app.theme-cyber { --est-accent:#25dcff; --est-border:rgba(37,220,255,.72); --est-surface:rgba(4,12,28,.86); }
.app.theme-luxury { --est-accent:#d8b76a; --est-border:rgba(216,183,106,.66); --est-surface:rgba(8,8,10,.88); }
.app.theme-sakura { --est-accent:#ff78ad; --est-border:rgba(255,120,173,.66); --est-surface:rgba(255,247,251,.90); }
.app.theme-ice { --est-accent:#76d8ff; --est-border:rgba(118,216,255,.70); --est-surface:rgba(239,250,255,.88); }
.app.theme-forest { --est-accent:#72c98a; --est-border:rgba(114,201,138,.65); --est-surface:rgba(241,250,243,.86); }
.app.theme-retro { --est-accent:#ffcc55; --est-border:rgba(255,204,85,.70); --est-surface:rgba(30,21,10,.88); }
.app.theme-galaxy { --est-accent:#bda4ff; --est-border:rgba(189,164,255,.72); --est-surface:rgba(10,7,28,.88); }
.estimateRoom { border-color:var(--est-border)!important; background:var(--est-surface)!important; }
.estimateRow>strong { color:var(--est-accent)!important; }
@media (max-width:700px){
 .estimateRoom{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
 .estimateRow{min-width:650px;grid-template-columns:minmax(260px,1fr) 105px 110px 125px!important;column-gap:12px!important;align-items:center!important}
 .estimateRow>strong{min-width:240px;font-size:16px!important;line-height:1.45!important;white-space:normal!important;word-break:keep-all!important;overflow-wrap:normal!important}
 .estimateRow>strong .estimateMemo{display:inline!important;margin-left:8px!important;font-size:15px!important;white-space:normal!important;word-break:keep-all!important;overflow-wrap:normal!important}
 .estimateNumber{font-size:15px!important;line-height:1.35!important;white-space:nowrap!important}
 .estimateRoom h3{font-size:19px!important;color:var(--est-accent)!important}
}
`;

// Current App.jsx has <style>{appStyles}</style> immediately before the .app root.
const candidates = ['<style>{appStyles}</style>', '<style>{styles}</style>'];
const anchor = candidates.find(x => source.includes(x));
if (!anchor) { console.error('ERROR: 既存のstyle要素を特定できないため中止しました。'); process.exit(1); }

const insertion = `${anchor}\n      <style>{\`${css.replace(/`/g, '\\`')}\`}</style>`;
fs.copyFileSync(appPath, backupPath);
source = source.replace(anchor, insertion);
fs.writeFileSync(appPath, source, 'utf8');
console.log('OK: スマホ概算見積V3を適用しました。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
