const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-mobile-estimate-layout-v5');
const MARKER = '/* M-CROSS_MOBILE_ESTIMATE_LAYOUT_V5 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}
let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: V5はすでに適用済みです。');
  process.exit(0);
}
if (!source.includes('estimateRow') || !source.includes('estimateRoom')) {
  console.error('ERROR: 概算見積クラスが見つからないため中止しました。');
  process.exit(1);
}

const css = String.raw`
${MARKER}
/* スマホ概算見積 V5
   1行目: 工事項目
   2行目: 数量 × 単価 ＝ 金額
   横スクロールなし
*/
@media (max-width:700px) {
  .estimateRoom {
    overflow-x: hidden !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .estimateRow {
    min-width: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    display: grid !important;
    grid-template-columns: auto auto 1fr !important;
    grid-template-areas:
      "item item item"
      "quantity rate amount" !important;
    column-gap: 5px !important;
    row-gap: 5px !important;
    align-items: baseline !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }

  .estimateRow > strong {
    grid-area: item !important;
    width: 100% !important;
    min-width: 0 !important;
    font-size: 15px !important;
    line-height: 1.45 !important;
    white-space: normal !important;
    word-break: keep-all !important;
    overflow-wrap: break-word !important;
  }

  .estimateRow > strong .estimateMemo {
    display: inline !important;
    margin-left: 6px !important;
    font-size: 14px !important;
    line-height: inherit !important;
    white-space: normal !important;
    word-break: keep-all !important;
    overflow-wrap: break-word !important;
  }

  .estimateRow .estimateUnit {
    grid-area: quantity !important;
    text-align: left !important;
  }

  .estimateRow .estimateRate {
    grid-area: rate !important;
    text-align: left !important;
  }

  .estimateRow > .estimateNumber:last-child {
    grid-area: amount !important;
    justify-self: end !important;
    text-align: right !important;
  }

  .estimateNumber {
    min-width: 0 !important;
    width: auto !important;
    max-width: 100% !important;
    font-size: 14px !important;
    line-height: 1.4 !important;
    white-space: nowrap !important;
    word-break: keep-all !important;
    overflow-wrap: normal !important;
  }

  .estimateRate::after {
    content: " =";
  }

  .estimateRoom h3 {
    font-size: 18px !important;
    line-height: 1.35 !important;
  }
}
`;

const candidates = ['<style>{appStyles}</style>', '<style>{styles}</style>'];
const anchor = candidates.find(v => source.includes(v));
if (!anchor) {
  console.error('ERROR: 既存style要素を特定できないため中止しました。');
  process.exit(1);
}

const insertion = `${anchor}\n      <style>{\`${css.replace(/`/g, '\\`')}\`}</style>`;
fs.copyFileSync(appPath, backupPath);
source = source.replace(anchor, insertion);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: スマホ概算見積V5を適用しました。');
console.log('表示: 工事項目 / 数量 × 単価 ＝ 金額 の2段構成、横スクロールなし。');
console.log('BACKUP:', backupPath);
