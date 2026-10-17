const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'App.jsx');
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file);
  process.exit(1);
}

let s = fs.readFileSync(file, 'utf8');
const original = s;

function note(label, changed) {
  console.log(changed ? 'OK: ' + label : 'SKIP: ' + label + '（追加済みまたは対象なし）');
}

// 1. 実際の画面座標を取得してスクロールする関数へ統一
const helper = `function scrollToActualPosition(targetId, topPadding = 88) {
  window.setTimeout(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target = document.getElementById(targetId)
        if (!target) {
          console.warn('スクロール先が見つかりません:', targetId)
          return
        }
        const rect = target.getBoundingClientRect()
        const targetTop = window.pageYOffset + rect.top - topPadding
        window.scrollTo({
          top: Math.max(0, targetTop),
          left: 0,
          behavior: 'smooth',
        })
      })
    })
  }, 260)
}

`;

if (/function scrollToMeasurementTarget\([^)]*\) \{[\s\S]*?\n\}/.test(s)) {
  s = s.replace(/function scrollToMeasurementTarget\([^)]*\) \{[\s\S]*?\n\}/, helper.trimEnd());
  s = s.replaceAll('scrollToMeasurementTarget(', 'scrollToActualPosition(');
  note('既存スクロール関数を実画面座標方式へ変更', true);
} else if (!s.includes('function scrollToActualPosition(')) {
  const anchor = 'function formatQuantity(value) {';
  if (!s.includes(anchor)) {
    console.error('挿入失敗: formatQuantityが見つかりません');
    process.exit(1);
  }
  s = s.replace(anchor, helper + anchor);
  note('実画面座標スクロール関数を追加', true);
} else {
  note('実画面座標スクロール関数', false);
}

// 2. CF・巾木の部屋一覧にIDを保証
let before = s;
s = s.replace(
  /<nav className="roomTabs"(?: id=\{`room-tabs-\$\{title\}`\})?(?: ref=\{roomTabsRef\})? aria-label=\{`\$\{title\}の部屋`\}>/,
  '<nav className="roomTabs" id={`room-tabs-${title}`} ref={roomTabsRef} aria-label={`${title}の部屋`}>'
);
note('CF・巾木の部屋一覧IDを設定', s !== before);

// 3. CF・巾木の入力カードにIDを保証
before = s;
s = s.replace(
  /<section className="card(?: measurementTarget)?"(?: id=\{`measurement-input-\$\{title\}`\})?(?: ref=\{measurementTargetRef\})?>\s*<h2>\{room\}<\/h2>/,
  '<section className="card measurementTarget" id={`measurement-input-${title}`} ref={measurementTargetRef}>\n            <h2>{room}</h2>'
);
note('CF・巾木の入力位置IDを設定', s !== before);

// 4. クロスの部屋一覧・部位一覧にIDを保証
before = s;
s = s.replace(
  /<nav className="roomTabs"(?: id="room-tabs-cross")?(?: ref=\{crossRoomTabsRef\})? aria-label="クロスの部屋">/,
  '<nav className="roomTabs" id="room-tabs-cross" ref={crossRoomTabsRef} aria-label="クロスの部屋">'
);
note('クロス部屋一覧IDを設定', s !== before);

before = s;
s = s.replace(
  /<div className="measurementTypes(?: measurementTarget)?"(?: id="cross-measurement-target")?(?: ref=\{crossMeasurementTargetRef\})? aria-label="採寸区分">/,
  '<div className="measurementTypes measurementTarget" id="cross-measurement-target" ref={crossMeasurementTargetRef} aria-label="採寸区分">'
);
note('クロス部位一覧IDを設定', s !== before);

// 5. LengthMeasurementPage内の部屋ボタン。標準のgoToPage呼出し後に入力欄へ移動
before = s;
s = s.replace(
  /onClick=\{\(\) => \{\s*goToPage\(index\);?\s*(?:scrollTo(?:MeasurementTarget|ActualPosition)\([^)]*\);?\s*)?\}\}>\{name\}<\/button>/,
  "onClick={() => {\n            goToPage(index)\n            scrollToActualPosition(`measurement-input-${title}`, 88)\n          }}>{name}</button>"
);
if (s === before) {
  s = s.replace(
    /onClick=\{\(\) => goToPage\(index\)\}>\{name\}<\/button>/,
    "onClick={() => {\n            goToPage(index)\n            scrollToActualPosition(`measurement-input-${title}`, 88)\n          }}>{name}</button>"
  );
}
note('CF・巾木の部屋選択後に入力位置へ移動', s !== before);

// 6. クロス部屋ボタン。残っている別の{name}ボタンをクロス用に変更
before = s;
const crossNavStart = s.indexOf('<nav className="roomTabs" id="room-tabs-cross"');
const crossNavEnd = crossNavStart >= 0 ? s.indexOf('</nav>', crossNavStart) : -1;
if (crossNavStart >= 0 && crossNavEnd >= 0) {
  const chunk = s.slice(crossNavStart, crossNavEnd + 6);
  let changedChunk = chunk.replace(
    /onClick=\{\(\) => \{\s*goToPage\(index\);?\s*(?:scrollTo(?:MeasurementTarget|ActualPosition)\([^)]*\);?\s*)?\}\}>\{name\}<\/button>/,
    "onClick={() => {\n                      goToPage(index)\n                      scrollToActualPosition('cross-measurement-target', 88)\n                    }}>{name}</button>"
  );
  if (changedChunk === chunk) {
    changedChunk = chunk.replace(
      /onClick=\{\(\) => goToPage\(index\)\}>\{name\}<\/button>/,
      "onClick={() => {\n                      goToPage(index)\n                      scrollToActualPosition('cross-measurement-target', 88)\n                    }}>{name}</button>"
    );
  }
  s = s.slice(0, crossNavStart) + changedChunk + s.slice(crossNavEnd + 6);
}
note('クロス部屋選択後に部位位置へ移動', s !== before);

// 7. 上部の採寸カテゴリボタンを確実な座標スクロールへ統一
before = s;
s = s.replace(
  /onClick=\{\(\) => \{\s*setActivePage\('cross'\)[\s\S]*?\}\}>クロス採寸<\/button>/,
  `onClick={() => {
                  setActivePage('cross')
                  scrollToActualPosition('room-tabs-cross', 88)
                }}>クロス採寸</button>`
);
note('クロス採寸ボタンから部屋一覧へ移動', s !== before);

before = s;
s = s.replace(
  /onClick=\{\(\) => \{\s*setActivePage\('cf'\)[\s\S]*?\}\}>CF採寸<\/button>/,
  `onClick={() => {
                  setActivePage('cf')
                  setCfScrollSignal(value => value + 1)
                  scrollToActualPosition('room-tabs-CF', 88)
                }}>CF採寸</button>`
);
note('CF採寸ボタンから部屋一覧へ移動', s !== before);

before = s;
s = s.replace(
  /onClick=\{\(\) => \{\s*setActivePage\('soft'\)[\s\S]*?\}\}>ソフト巾木<\/button>/,
  `onClick={() => {
                  setActivePage('soft')
                  setSoftScrollSignal(value => value + 1)
                  scrollToActualPosition('room-tabs-ソフト巾木', 88)
                }}>ソフト巾木</button>`
);
note('ソフト巾木ボタンから部屋一覧へ移動', s !== before);

// 8. 次の部屋・前の部屋でも入力位置へ移動（goToPage側で座標スクロールを実行）
s = s.replace(
  /requestAnimationFrame\(\(\) => \{\s*measurementTargetRef\.current\?\.scrollIntoView\([\s\S]*?\)\s*\}\)/,
  "scrollToActualPosition(`measurement-input-${title}`, 88)"
);
s = s.replace(
  /requestAnimationFrame\(\(\) => \{\s*crossMeasurementTargetRef\.current\?\.scrollIntoView\([\s\S]*?\)\s*\}\)/,
  "scrollToActualPosition('cross-measurement-target', 88)"
);
console.log('OK: 前後の部屋移動も実画面座標方式へ統一');

// 最低限の構造確認
const required = [
  'function scrollToActualPosition',
  'getBoundingClientRect()',
  'window.pageYOffset + rect.top - topPadding',
  'id="room-tabs-cross"',
  'id={`room-tabs-${title}`}',
  'id="cross-measurement-target"',
  'id={`measurement-input-${title}`}',
];
const missing = required.filter(text => !s.includes(text));
if (missing.length) {
  console.error('変更後の確認に失敗:', missing.join(', '));
  process.exit(1);
}

if (s === original) {
  console.error('変更がありませんでした');
  process.exit(1);
}

const backup = file + '.before-actual-position-scroll-v4';
fs.writeFileSync(backup, original, 'utf8');
fs.writeFileSync(file, s, 'utf8');

console.log('\n完了');
console.log('更新:', file);
console.log('バックアップ:', backup);
console.log('次に実行: npm run build');
