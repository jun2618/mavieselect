const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-estimate-numbers-large');
const MARKER = '/* M-CROSS_ESTIMATE_NUMBERS_LARGE_V1 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}
let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: 概算の数量・単価・金額拡大は適用済みです。');
  process.exit(0);
}
if (!source.includes('M-CROSS_MOBILE_ESTIMATE_FINAL') || !source.includes('estimateNumber')) {
  console.error('ERROR: 概算見積の最終版CSSを確認できないため中止しました。');
  process.exit(1);
}

const css = String.raw`
${MARKER}
/* 全テーマ共通：スマホ概算の数量・単価・金額を読みやすく拡大 */
@media (max-width:700px) {
  .estimateRow .estimateNumber {
    font-size: 1.12em !important;
    line-height: 1.5 !important;
    font-weight: 700 !important;
    letter-spacing: 0.01em !important;
  }

  .estimateRow > .estimateNumber:last-child {
    font-size: 1.18em !important;
    font-weight: 800 !important;
  }

  .estimateTotal {
    font-size: 1.18em !important;
    font-weight: 700 !important;
  }

  .estimateTotal strong {
    font-size: 1.28em !important;
    font-weight: 900 !important;
  }
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

console.log('OK: 全テーマ共通で数量・単価・金額・概算合計を大きくしました。');
console.log('BACKUP:', backupPath);
console.log('NEXT: スマホ反映は git add src/App.jsx → commit → push です。');
