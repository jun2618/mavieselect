const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-mobile-estimate-layout-v4');
const MARKER = '/* M-CROSS_MOBILE_ESTIMATE_LAYOUT_V4 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。crossmeasure フォルダで実行してください。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');

if (source.includes(MARKER)) {
  console.log('SKIP: スマホ概算レイアウトV4はすでに適用済みです。');
  process.exit(0);
}

if (!source.includes('estimateRow') || !source.includes('estimateRoom')) {
  console.error('ERROR: 概算見積のCSSクラスを確認できないため中止しました。');
  process.exit(1);
}

const css = String.raw`
${MARKER}
/* スマホ概算見積V4：横スクロールなし。項目名はカード幅で自然に2～3行へ折り返す。 */
@media (max-width: 700px) {
  .estimateRoom {
    overflow-x: visible !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .estimateRow {
    min-width: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.15fr) !important;
    grid-template-areas:
      "item item item"
      "quantity rate amount" !important;
    gap: 8px 6px !important;
    align-items: start !important;
    box-sizing: border-box !important;
  }

  .estimateRow > strong {
    grid-area: item !important;
    min-width: 0 !important;
    width: 100% !important;
    font-size: 16px !important;
    line-height: 1.5 !important;
    white-space: normal !important;
    word-break: normal !important;
    overflow-wrap: anywhere !important;
  }

  .estimateRow > strong .estimateMemo {
    display: inline !important;
    margin-left: 8px !important;
    font-size: 15px !important;
    line-height: inherit !important;
    white-space: normal !important;
    word-break: normal !important;
    overflow-wrap: anywhere !important;
  }

  .estimateRow .estimateUnit {
    grid-area: quantity !important;
  }

  .estimateRow .estimateRate {
    grid-area: rate !important;
  }

  .estimateRow > .estimateNumber:last-child {
    grid-area: amount !important;
  }

  .estimateNumber {
    min-width: 0 !important;
    width: 100% !important;
    font-size: 14px !important;
    line-height: 1.4 !important;
    white-space: normal !important;
    word-break: keep-all !important;
    overflow-wrap: normal !important;
    text-align: right !important;
  }

  .estimateRoom h3 {
    font-size: 19px !important;
    line-height: 1.35 !important;
  }
}
`;

const candidates = ['<style>{appStyles}</style>', '<style>{styles}</style>'];
const anchor = candidates.find(value => source.includes(value));

if (!anchor) {
  console.error('ERROR: 既存のstyle要素を特定できないため中止しました。');
  process.exit(1);
}

const insertion = `${anchor}\n      <style>{\`${css.replace(/`/g, '\\`')}\`}</style>`;

fs.copyFileSync(appPath, backupPath);
source = source.replace(anchor, insertion);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: スマホ概算見積V4を適用しました。');
console.log('仕様: 横スクロールなし、項目名はカード幅で2～3行、数量・単価・金額は下段表示。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev またはスマホ公開版へ反映してください。');
