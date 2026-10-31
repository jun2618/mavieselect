const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-theme-colors');
const MARKER = '/* M-CROSS_ESTIMATE_THEME_COLORS_V1 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');

if (source.includes(MARKER)) {
  console.log('SKIP: 概算見積のテーマ別カラーは適用済みです。');
  process.exit(0);
}

if (!source.includes('M-CROSS_MOBILE_ESTIMATE_FINAL') ||
    !source.includes('estimateRow') ||
    !source.includes('estimateTotal')) {
  console.error('ERROR: 概算見積の最終版を確認できないため中止しました。');
  process.exit(1);
}

const css = String.raw`
${MARKER}
/* 概算見積専用のテーマ別配色。レイアウトには触れない。 */
.app {
  --estimate-bg: rgba(255, 255, 255, 0.90);
  --estimate-border: rgba(180, 105, 55, 0.55);
  --estimate-heading: #8a421c;
  --estimate-item: #5c2f18;
  --estimate-number: #342117;
  --estimate-money: #9a3f0d;
  --estimate-total-bg: rgba(255, 235, 215, 0.92);
  --estimate-glow: none;
}

.app.theme-dark {
  --estimate-bg: rgba(20, 27, 39, 0.94);
  --estimate-border: rgba(125, 174, 230, 0.68);
  --estimate-heading: #b9d8ff;
  --estimate-item: #e7f1ff;
  --estimate-number: #d7e8ff;
  --estimate-money: #97c9ff;
  --estimate-total-bg: rgba(31, 50, 76, 0.95);
  --estimate-glow: 0 0 8px rgba(120, 185, 255, 0.30);
}

.app.theme-pop {
  --estimate-bg: rgba(255, 247, 252, 0.96);
  --estimate-border: rgba(235, 73, 151, 0.66);
  --estimate-heading: #c41970;
  --estimate-item: #8c174f;
  --estimate-number: #5d173b;
  --estimate-money: #d31374;
  --estimate-total-bg: rgba(255, 224, 241, 0.96);
  --estimate-glow: 0 0 7px rgba(244, 114, 182, 0.24);
}

.app.theme-cyber {
  --estimate-bg: rgba(3, 10, 24, 0.96);
  --estimate-border: rgba(37, 220, 255, 0.88);
  --estimate-heading: #c08cff;
  --estimate-item: #f0e8ff;
  --estimate-number: #54eaff;
  --estimate-money: #ffffff;
  --estimate-total-bg: rgba(5, 24, 45, 0.97);
  --estimate-glow: 0 0 9px rgba(37, 220, 255, 0.58);
}

.app.theme-luxury {
  --estimate-bg: rgba(9, 9, 11, 0.97);
  --estimate-border: rgba(216, 183, 106, 0.78);
  --estimate-heading: #f1d88d;
  --estimate-item: #fff5d7;
  --estimate-number: #f6e7b8;
  --estimate-money: #ffd76a;
  --estimate-total-bg: rgba(34, 28, 15, 0.97);
  --estimate-glow: 0 0 8px rgba(216, 183, 106, 0.34);
}

.app.theme-sakura {
  --estimate-bg: rgba(255, 249, 252, 0.97);
  --estimate-border: rgba(236, 91, 148, 0.70);
  --estimate-heading: #c93472;
  --estimate-item: #7d244d;
  --estimate-number: #5f2441;
  --estimate-money: #d42470;
  --estimate-total-bg: rgba(255, 226, 239, 0.97);
  --estimate-glow: 0 0 7px rgba(255, 120, 173, 0.25);
}

.app.theme-ice {
  --estimate-bg: rgba(242, 252, 255, 0.97);
  --estimate-border: rgba(72, 173, 219, 0.70);
  --estimate-heading: #076b9b;
  --estimate-item: #164f6d;
  --estimate-number: #123f58;
  --estimate-money: #007cad;
  --estimate-total-bg: rgba(218, 245, 255, 0.97);
  --estimate-glow: 0 0 7px rgba(79, 196, 245, 0.25);
}

.app.theme-forest {
  --estimate-bg: rgba(246, 252, 247, 0.97);
  --estimate-border: rgba(61, 143, 78, 0.68);
  --estimate-heading: #236c35;
  --estimate-item: #234f2d;
  --estimate-number: #24462c;
  --estimate-money: #167331;
  --estimate-total-bg: rgba(224, 244, 228, 0.97);
  --estimate-glow: 0 0 7px rgba(72, 166, 92, 0.22);
}

.app.theme-retro {
  --estimate-bg: rgba(31, 20, 9, 0.97);
  --estimate-border: rgba(255, 194, 61, 0.86);
  --estimate-heading: #ffdf75;
  --estimate-item: #fff0bd;
  --estimate-number: #ffd86a;
  --estimate-money: #ff9f43;
  --estimate-total-bg: rgba(61, 36, 10, 0.97);
  --estimate-glow: 0 0 7px rgba(255, 179, 55, 0.38);
}

.app.theme-galaxy {
  --estimate-bg: rgba(12, 8, 34, 0.97);
  --estimate-border: rgba(189, 164, 255, 0.82);
  --estimate-heading: #d6c5ff;
  --estimate-item: #f0eaff;
  --estimate-number: #bfe8ff;
  --estimate-money: #f8f5ff;
  --estimate-total-bg: rgba(35, 23, 75, 0.97);
  --estimate-glow: 0 0 10px rgba(173, 145, 255, 0.48);
}

.estimateRoom {
  background: var(--estimate-bg) !important;
  border-color: var(--estimate-border) !important;
  box-shadow: var(--estimate-glow) !important;
}

.estimateRoom h3 {
  color: var(--estimate-heading) !important;
  text-shadow: var(--estimate-glow) !important;
}

.estimateRow > strong:first-child,
.estimateRow > strong:first-child .estimateMemo {
  color: var(--estimate-item) !important;
}

.estimateRow .estimateNumber {
  color: var(--estimate-number) !important;
}

.estimateRow > .estimateNumber:last-child,
.estimateRow > .estimateNumber:last-child strong {
  color: var(--estimate-money) !important;
  text-shadow: var(--estimate-glow) !important;
}

.estimateTotal {
  background: var(--estimate-total-bg) !important;
  border-color: var(--estimate-border) !important;
  color: var(--estimate-heading) !important;
  box-shadow: var(--estimate-glow) !important;
}

.estimateTotal strong {
  color: var(--estimate-money) !important;
  text-shadow: var(--estimate-glow) !important;
}
`;

const anchor = source.includes('<style>{appStyles}</style>')
  ? '<style>{appStyles}</style>'
  : (source.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);

if (!anchor) {
  console.error('ERROR: 既存style要素を特定できないため中止しました。');
  process.exit(1);
}

const insertion = `${anchor}\n      <style>{\`${css.replace(/`/g, '\\`')}\`}</style>`;
fs.copyFileSync(appPath, backupPath);
source = source.replace(anchor, insertion);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: 概算見積へテーマ別カラーを適用しました。');
console.log('BACKUP:', backupPath);
console.log('NEXT: スマホ反映は git add src/App.jsx → commit → push です。');
