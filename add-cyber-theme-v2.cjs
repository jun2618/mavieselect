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

// 1. テーマ選択肢にCyberを追加
replaceOnce(
`  const themeOptions = [
    ['beige', 'ベージュ'], ['dark', 'ダーク'], ['pop', 'ポップ'],
  ]`,
`  const themeOptions = [
    ['beige', 'ベージュ'], ['dark', 'ダーク'], ['pop', 'ポップ'], ['cyber', 'サイバー'],
  ]`,
'テーマ選択肢へサイバーを追加'
);

// 2. appのクラスへCyberを追加
replaceOnce(
"        className={`app${theme === 'dark' ? ' theme-dark' : theme === 'pop' ? ' theme-pop' : ''}`}",
"        className={`app${theme === 'dark' ? ' theme-dark' : theme === 'pop' ? ' theme-pop' : theme === 'cyber' ? ' theme-cyber' : ''}`}",
'サイバーテーマのクラス切替を追加'
);

// 3. Cyber CSS。見た目だけでロジックには触れない
const cyberCss = `
  .theme-cyber {
    color:#dafcff;
    background:
      linear-gradient(rgba(0,255,255,.032) 1px,transparent 1px),
      linear-gradient(90deg,rgba(255,0,220,.026) 1px,transparent 1px),
      radial-gradient(circle at 14% 10%,rgba(0,245,255,.16),transparent 25%),
      radial-gradient(circle at 88% 28%,rgba(255,0,214,.14),transparent 26%),
      #05070d;
    background-size:28px 28px,28px 28px,auto,auto,auto;
  }
  .theme-cyber .header { border-color:#00eaff; filter:drop-shadow(0 0 5px rgba(0,234,255,.6)); }
  .theme-cyber .brandGroup { position:relative; }
  .theme-cyber .mavieBrand { color:#ff4fdf; font-family:"Dancing Script","Segoe Script",cursive; text-shadow:0 0 7px #ff00d4; }
  .theme-cyber .brand { color:#8cffff; text-shadow:1px 0 #ff25d8,-1px 0 #00f6ff,0 0 10px rgba(0,246,255,.95); }
  .theme-cyber .main h1,.theme-cyber .card h2,.theme-cyber .roomSummary h3,.theme-cyber .savedProperty,.theme-cyber .record { color:#e8feff; text-shadow:0 0 6px rgba(0,238,255,.34); }
  .theme-cyber .eyebrow,.theme-cyber .propertyLine { color:#61f8ff; text-shadow:0 0 7px rgba(0,238,255,.8); }
  .theme-cyber .subtitle,.theme-cyber .savedMeta,.theme-cyber .record small,.theme-cyber .card label>span,.theme-cyber .summaryLine { color:#9fc6d0; }
  .theme-cyber .card,.theme-cyber .savedItem,.theme-cyber .roomSummary,.theme-cyber .summary,.theme-cyber .customRoomForm,.theme-cyber .customRoomItem,.theme-cyber .estimateRoom {
    color:#dafcff;
    border:1px solid rgba(0,238,255,.58);
    background:linear-gradient(145deg,rgba(5,14,24,.94),rgba(16,5,25,.92));
    box-shadow:0 0 0 1px rgba(255,0,214,.15),0 0 18px rgba(0,238,255,.23),inset 0 0 25px rgba(0,238,255,.025);
    backdrop-filter:blur(10px);
  }
  .theme-cyber .card input,.theme-cyber .card select,.theme-cyber .propertyOption,.theme-cyber .settingsOption,.theme-cyber .estimateFactor input {
    color:#eaffff;
    border:1px solid #00cfe6;
    background:#07111a;
    box-shadow:inset 0 0 8px rgba(0,237,255,.09),0 0 7px rgba(0,237,255,.12);
  }
  .theme-cyber .card input::placeholder { color:#648894; }
  .theme-cyber .card input:focus,.theme-cyber .card select:focus { border-color:#ff37d7; box-shadow:0 0 0 2px rgba(255,55,215,.2),0 0 14px rgba(255,55,215,.38); }
  .theme-cyber .settingsButton,.theme-cyber .measurementBackButton {
    color:#72f9ff; border:1px solid #00e6f6; background:#071019; box-shadow:0 0 9px rgba(0,230,246,.35);
  }
  .theme-cyber .primary,.theme-cyber .add,.theme-cyber .saveButton,.theme-cyber .secondaryButton {
    color:#eaffff;
    border:1px solid #00ebff;
    background:linear-gradient(135deg,#06151d,#11122a 58%,#260c2c);
    box-shadow:0 0 0 1px rgba(255,0,214,.22),0 0 11px rgba(0,235,255,.42),0 4px 0 #001b24;
    text-shadow:0 0 5px rgba(0,241,255,.75);
  }
  .theme-cyber .primary:active,.theme-cyber .add:active,.theme-cyber .saveButton:active,.theme-cyber .secondaryButton:active { transform:translateY(2px); box-shadow:0 0 12px rgba(255,0,214,.48); }
  .theme-cyber .room,.theme-cyber .measurementType,.theme-cyber .keypadButton {
    color:#aafcff;
    border:1px solid rgba(0,230,247,.72);
    background:linear-gradient(180deg,#08131d,#090b15);
    box-shadow:0 3px 0 #001c25,0 0 8px rgba(0,230,247,.2);
  }
  .theme-cyber .room.active,.theme-cyber .measurementType.active,.theme-cyber .settingsOption.active {
    color:#fff;
    border-color:#ff34d6;
    background:linear-gradient(135deg,#08222c,#30102e);
    box-shadow:0 0 12px rgba(255,52,214,.6),inset 0 0 12px rgba(0,238,255,.13);
    text-shadow:0 0 6px #ff7be5;
  }
  .theme-cyber .numberKeypad,.theme-cyber .address { border-color:#176d78; background:#050c13; box-shadow:inset 0 0 18px rgba(0,238,255,.05); }
  .theme-cyber .keypadButton.utility { color:#ff80e6; border-color:#a42b91; background:#170b19; }
  .theme-cyber .record { border-color:#123f49; }
  .theme-cyber .record b,.theme-cyber .summaryLine strong { color:#63fbff; text-shadow:0 0 6px rgba(0,238,255,.65); }
  .theme-cyber .record button,.theme-cyber .dangerButton { color:#ffe8fb; border:1px solid #ff2acb; background:#210a20; box-shadow:0 0 8px rgba(255,42,203,.3); }
  .theme-cyber .summary,.theme-cyber .estimateTotal { border-color:#ff3ad5; background:linear-gradient(135deg,rgba(0,233,255,.07),rgba(255,38,207,.1)); }
  .theme-cyber .estimateTotal strong { color:#6cffff; text-shadow:0 0 9px rgba(0,238,255,.85); }
  .theme-cyber .estimateNote { color:#a9c7ce; border-color:#8d2a85; background:#0d0811; }
  .theme-cyber .saveState.saved { color:#74ffd5; background:#062019; border:1px solid #20c996; }
  .theme-cyber .saveState.dirty { color:#ff9bdc; background:#250816; border:1px solid #ff3ba8; }
  .theme-cyber .actionButton { border:1px solid rgba(0,238,255,.62); box-shadow:0 0 7px rgba(0,238,255,.2); }
  .theme-cyber .actionOpen,.theme-cyber .actionOverwrite { background:#0b1730; color:#8afaff; }
  .theme-cyber .actionCsv { background:#09251e; color:#8cffe0; }
  .theme-cyber .actionDelete { background:#260a20; color:#ff98df; border-color:#ff3ccf; }
  .theme-cyber .empty { color:#668d98; }
`;

const anchor = `  @media (max-width:600px) {`;
if (!s.includes(anchor)) {
  console.error('挿入失敗: レスポンシブCSSの位置を特定できません');
  process.exit(1);
}
s = s.replace(anchor, cyberCss + anchor);
console.log('OK: サイバーテーマCSSを追加');

const backup = file + '.before-cyber-theme';
fs.writeFileSync(backup, original, 'utf8');
fs.writeFileSync(file, s, 'utf8');

console.log('\n完了');
console.log('更新:', file);
console.log('バックアップ:', backup);
console.log('変更内容: テーマ表示のみ。採寸・保存・概算・部屋管理ロジックは未変更');
console.log('次に実行: npm run build');
