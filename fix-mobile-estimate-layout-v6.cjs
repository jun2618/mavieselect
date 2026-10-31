const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-mobile-estimate-layout-v6');
const MARKER = '/* M-CROSS_MOBILE_ESTIMATE_LAYOUT_V6 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: スマホ概算見積V6はすでに適用済みです。');
  process.exit(0);
}
if (!source.includes('estimateRow') || !source.includes('estimateTotal')) {
  console.error('ERROR: 概算見積の表示要素を確認できないため中止しました。');
  process.exit(1);
}

const css = String.raw`
${MARKER}
/* スマホ概算見積 V6
   項目名
   数量 × 単価 ＝ 金額
   画面内に完全収容。大サイズでは必要に応じて自然に折り返す。
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
    box-sizing: border-box !important;
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: baseline !important;
    justify-content: flex-start !important;
    gap: 5px 6px !important;
    overflow: visible !important;
  }

  .estimateRow > strong:first-child {
    flex: 0 0 100% !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    font-size: 15px !important;
    line-height: 1.45 !important;
    white-space: normal !important;
    word-break: keep-all !important;
    overflow-wrap: break-word !important;
  }

  .estimateRow > strong:first-child .estimateMemo {
    display: inline !important;
    margin-left: 6px !important;
    font-size: 14px !important;
    line-height: inherit !important;
    white-space: normal !important;
    word-break: keep-all !important;
    overflow-wrap: break-word !important;
  }

  .estimateRow .estimateNumber {
    flex: 0 0 auto !important;
    width: auto !important;
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    font-size: 14px !important;
    line-height: 1.4 !important;
    white-space: nowrap !important;
    text-align: left !important;
    justify-self: auto !important;
  }

  .estimateRow > .estimateNumber:last-child {
    margin-left: 0 !important;
    text-align: left !important;
  }

  .estimateRow > .estimateNumber:last-child::before {
    content: "＝ " !important;
  }

  /* V5以前で追加した = を重複表示しない */
  .estimateRate::after {
    content: "" !important;
  }

  .estimateTotal {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: space-between !important;
    align-items: baseline !important;
    gap: 6px 12px !important;
    overflow: visible !important;
    font-size: 17px !important;
    line-height: 1.45 !important;
  }

  .estimateTotal strong {
    max-width: 100% !important;
    white-space: nowrap !important;
    font-size: 19px !important;
  }
}
`;

const candidates = ['<style>{appStyles}</style>', '<style>{styles}</style>'];
const anchor = candidates.find(value => source.includes(value));
if (!anchor) {
  console.error('ERROR: 既存style要素を特定できないため中止しました。');
  process.exit(1);
}

const insertion = `${anchor}\n      <style>{\`${css.replace(/`/g, '\\`')}\`}</style>`;
fs.copyFileSync(appPath, backupPath);
source = source.replace(anchor, insertion);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: スマホ概算見積V6を適用しました。');
console.log('表示: 項目名 / 数量 × 単価 ＝ 金額。横スクロールなし。合計金額も画面内に表示。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev またはスマホ公開版へ反映してください。');
