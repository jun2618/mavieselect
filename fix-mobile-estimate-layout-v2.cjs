const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-mobile-estimate-layout-v2');
const MARKER = '/* M-CROSS_MOBILE_ESTIMATE_LAYOUT_V2 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。crossmeasure フォルダで実行してください。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');

if (source.includes(MARKER)) {
  console.log('SKIP: スマホ概算レイアウトV2はすでに適用済みです。');
  process.exit(0);
}

if (!source.includes('estimateRow') || !source.includes('estimateRoom')) {
  console.error('ERROR: 概算見積のCSSクラスを確認できないため中止しました。');
  process.exit(1);
}

const css = String.raw`
${MARKER}
/* スマホ概算見積：通常は横方向、文字サイズを大きくした場合は単語単位で2～3行まで自然に折り返す */
.app {
  --estimate-accent: #c7783e;
  --estimate-border: rgba(199, 120, 62, 0.58);
  --estimate-surface: rgba(255, 255, 255, 0.78);
  --estimate-text: inherit;
}
.app.theme-dark {
  --estimate-accent: #93c5fd;
  --estimate-border: rgba(147, 197, 253, 0.55);
  --estimate-surface: rgba(15, 23, 42, 0.76);
}
.app.theme-pop {
  --estimate-accent: #f472b6;
  --estimate-border: rgba(244, 114, 182, 0.62);
  --estimate-surface: rgba(255, 247, 252, 0.88);
}
.app.theme-cyber {
  --estimate-accent: #25dcff;
  --estimate-border: rgba(37, 220, 255, 0.72);
  --estimate-surface: rgba(4, 12, 28, 0.86);
}
.app.theme-luxury {
  --estimate-accent: #d8b76a;
  --estimate-border: rgba(216, 183, 106, 0.66);
  --estimate-surface: rgba(8, 8, 10, 0.88);
}
.app.theme-sakura {
  --estimate-accent: #ff78ad;
  --estimate-border: rgba(255, 120, 173, 0.66);
  --estimate-surface: rgba(255, 247, 251, 0.90);
}
.app.theme-ice {
  --estimate-accent: #76d8ff;
  --estimate-border: rgba(118, 216, 255, 0.70);
  --estimate-surface: rgba(239, 250, 255, 0.88);
}
.app.theme-forest {
  --estimate-accent: #72c98a;
  --estimate-border: rgba(114, 201, 138, 0.65);
  --estimate-surface: rgba(241, 250, 243, 0.86);
}
.app.theme-retro {
  --estimate-accent: #ffcc55;
  --estimate-border: rgba(255, 204, 85, 0.70);
  --estimate-surface: rgba(30, 21, 10, 0.88);
}
.app.theme-galaxy {
  --estimate-accent: #bda4ff;
  --estimate-border: rgba(189, 164, 255, 0.72);
  --estimate-surface: rgba(10, 7, 28, 0.88);
}

.estimateRoom {
  border-color: var(--estimate-border) !important;
  background: var(--estimate-surface) !important;
}
.estimateRoom h3,
.estimateRow > strong,
.estimateRow .estimateNumber {
  color: var(--estimate-text) !important;
}
.estimateRow > strong {
  color: var(--estimate-accent) !important;
}

@media (max-width: 700px) {
  .estimateRoom {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }

  .estimateRow {
    min-width: 650px;
    grid-template-columns: minmax(260px, 1fr) 105px 110px 125px !important;
    column-gap: 12px !important;
    align-items: center !important;
  }

  .estimateRow > strong {
    min-width: 240px;
    font-size: 16px !important;
    line-height: 1.45 !important;
    white-space: normal !important;
    word-break: keep-all !important;
    overflow-wrap: normal !important;
  }

  .estimateRow > strong .estimateMemo {
    display: inline !important;
    margin-left: 8px !important;
    font-size: 15px !important;
    line-height: inherit !important;
    white-space: normal !important;
    word-break: keep-all !important;
    overflow-wrap: normal !important;
  }

  .estimateNumber {
    font-size: 15px !important;
    line-height: 1.35 !important;
    white-space: nowrap !important;
  }

  .estimateRoom h3 {
    font-size: 19px !important;
  }
}
`;

const needle = '<div className={`app${';
const index = source.indexOf(needle);
if (index === -1) {
  console.error('ERROR: Appのルート要素を特定できないため中止しました。');
  process.exit(1);
}

const insertion = `<style>{\`${css.replace(/`/g, '\\`')}\`}</style>\n      `;

fs.copyFileSync(appPath, backupPath);
source = source.slice(0, index) + insertion + source.slice(index);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: スマホ概算見積V2を適用しました。');
console.log('仕様: 通常は横方向、フォント拡大時は単語単位で2～3行、1文字ずつの縦折り返しは禁止。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev で確認してください。');
