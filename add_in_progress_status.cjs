const fs = require('fs');
const path = require('path');

const target = path.join(process.cwd(), 'src', 'App.jsx');
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-in-progress.bak');

if (!fs.existsSync(target)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  console.error('C:\\Users\\machi\\Desktop\\crossmeasure で実行してください。');
  process.exit(1);
}

let src = fs.readFileSync(target, 'utf8');

if (src.includes('進行中')) {
  console.log('OK: すでに「進行中」が存在するため、変更しませんでした。');
  process.exit(0);
}

fs.copyFileSync(target, backup);

const replacements = [
  // 配列: "発注待ち", "完了・未報告"
  {
    re: /(["'`]発注待ち["'`]\s*,\s*)(["'`]完了・未報告["'`])/,
    fn: (_, a, b) => `${a}"進行中", ${b}`,
  },
  // 配列: label: "発注待ち" の次の要素の前へ追加
  {
    re: /(\{\s*(?:value\s*:\s*["'`]発注待ち["'`]\s*,\s*)?label\s*:\s*["'`]発注待ち["'`][\s\S]*?\}\s*,)(\s*\{\s*(?:value\s*:\s*["'`]完了・未報告["'`]\s*,\s*)?label\s*:\s*["'`]完了・未報告["'`])/,
    fn: (_, a, b) => `${a}\n        { value: "進行中", label: "進行中" },${b}`,
  },
  // JSXの固定ボタン: 発注待ちボタン直後へ、同じハンドラ形式で追加
  {
    re: /(<button\b[^>]*onClick=\{\(\)\s*=>\s*([^\n{}]+?)\(["'`]発注待ち["'`]\)\}[^>]*>[\s\S]*?発注待ち[\s\S]*?<\/button>)/,
    fn: (_, block, handler) => `${block}\n              <button type="button" onClick={() => ${handler}("進行中")}>進行中</button>`,
  },
];

let changed = false;
for (const item of replacements) {
  if (item.re.test(src)) {
    src = src.replace(item.re, item.fn);
    changed = true;
    break;
  }
}

if (!changed) {
  console.error('ERROR: 自動追加できる「発注待ち」の並びが見つかりませんでした。');
  console.error('App.jsx は変更していません。バックアップのみ作成済みです。');
  process.exit(2);
}

fs.writeFileSync(target, src, 'utf8');
console.log('OK: 「進行中」を「発注待ち」の次に追加しました。');
console.log('Backup: src/App.jsx.before-in-progress.bak');
console.log('次に npm run build を実行してください。');
