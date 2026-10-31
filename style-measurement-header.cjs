const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'App.jsx');
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file);
  process.exit(1);
}

let s = fs.readFileSync(file, 'utf8');
const original = s;

function replaceOnce(oldText, newText, label) {
  const count = s.split(oldText).length - 1;
  if (count !== 1) {
    console.error(`置換失敗: ${label} (一致数: ${count})`);
    process.exit(1);
  }
  s = s.replace(oldText, newText);
  console.log('OK:', label);
}

// 見た目だけを変更。イベント処理・保存・採寸ロジックには触れない。
replaceOnce(
`  .propertyLine { margin:18px 0 5px; color:#d27f6d; font-weight:700; }`,
`  .propertyLine { margin:18px 0 8px; color:#d27f6d; font-family:"Zen Maru Gothic","Yu Gothic",Meiryo,sans-serif; font-size:21px; font-weight:800; letter-spacing:.035em; line-height:1.55; text-align:left; text-shadow:0 2px 0 rgba(255,227,212,.7); }
  .measurementBackButton { display:inline-flex; align-items:center; justify-content:center; min-height:46px; margin:0 0 4px; padding:9px 16px; border:1px solid #efc7b4; border-radius:14px; color:#c96e69; background:linear-gradient(180deg,#fff,#fff3e9); box-shadow:0 4px 0 #ead8cb; font:inherit; font-size:15px; font-weight:800; cursor:pointer; -webkit-tap-highlight-color:transparent; }`,
'物件名表示と戻るボタンのCSSを追加'
);

// ダーク/ポップでも読めるよう、色だけ合わせる
replaceOnce(
`  .theme-dark .empty { color:#b9acb5; }`,
`  .theme-dark .empty { color:#b9acb5; }
  .theme-dark .measurementBackButton { color:#f0a08d; border-color:#51484d; background:#39343a; box-shadow:0 4px 0 #282428; }
  .theme-dark .propertyLine { color:#f0a08d; text-shadow:none; }`,
'ダークテーマへ見た目を追加'
);
replaceOnce(
`  .theme-pop .header { border-color:#f4b9c9; }`,
`  .theme-pop .header { border-color:#f4b9c9; }
  .theme-pop .measurementBackButton { color:#bc557e; border-color:#f2c5d1; background:#fff0f4; box-shadow:0 4px 0 #f0c7d4; }
  .theme-pop .propertyLine { color:#d95386; text-shadow:0 2px 0 #ffe0e9; }`,
'ポップテーマへ見た目を追加'
);

// スマホでは物件名を少しだけ抑えて折返ししやすくする
replaceOnce(
`  @media (max-width:420px) {
    .main { width:min(100% - 24px,620px); margin-top:22px; }`,
`  @media (max-width:420px) {
    .main { width:min(100% - 24px,620px); margin-top:22px; }
    .propertyLine { font-size:19px; overflow-wrap:anywhere; }
    .measurementBackButton { width:100%; min-height:48px; }`,
'スマホ向けサイズを調整'
);

// 採寸入力画面の戻るボタンだけクラス変更。動作はそのまま。
const measurementBackOld = `            <button
              className="back"
              onClick={() => requestNavigation(() => {
                setStarted(false)
                setShowSavedList(false)
                setIsDirty(false)
              })}
            >
              ← 物件情報へ戻る
            </button>`;
const measurementBackNew = `            <button
              className="measurementBackButton"
              type="button"
              onClick={() => requestNavigation(() => {
                setStarted(false)
                setShowSavedList(false)
                setIsDirty(false)
              })}
            >
              ← 物件情報へ戻る
            </button>`;
replaceOnce(measurementBackOld, measurementBackNew, '採寸画面の戻る表示をボタン化');

const backup = file + '.before-measurement-header-style';
fs.writeFileSync(backup, original, 'utf8');
fs.writeFileSync(file, s, 'utf8');

console.log('\n完了');
console.log('更新:', file);
console.log('バックアップ:', backup);
console.log('変更内容: 見た目のみ。採寸・保存・概算・部屋管理ロジックは未変更');
console.log('次に実行: npm run build');
