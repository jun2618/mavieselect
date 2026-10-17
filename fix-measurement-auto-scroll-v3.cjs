const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'App.jsx');
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file);
  process.exit(1);
}

let s = fs.readFileSync(file, 'utf8');
const original = s;

function replaceRequired(searchValue, replacement, label) {
  const before = s;
  s = s.replace(searchValue, replacement);
  if (s === before) {
    console.error('置換失敗: ' + label);
    process.exit(1);
  }
  console.log('OK:', label);
}

// Reactの描画完了を待ってから、確実に対象位置へ移動する共通処理
if (!s.includes('function scrollToMeasurementTarget(')) {
  replaceRequired(
    'function formatQuantity(value) {',
    `function scrollToMeasurementTarget(targetId) {
  window.setTimeout(() => {
    const target = document.getElementById(targetId)
    if (!target) return
    const headerOffset = 18
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, 180)
}

function formatQuantity(value) {`,
    '確実な自動スクロール関数を追加'
  )
} else {
  console.log('SKIP: 自動スクロール関数は追加済み')
}

// CF・ソフト巾木の部屋一覧に固定ID
replaceRequired(
  /<nav className="roomTabs"(?: ref=\{roomTabsRef\})? aria-label=\{`\$\{title\}の部屋`\}>/,
  '<nav className="roomTabs" id={`room-tabs-${title}`} ref={roomTabsRef} aria-label={`${title}の部屋`}>',
  'CF・巾木の部屋一覧へIDを追加'
)

// CF・ソフト巾木の入力カードに固定ID
replaceRequired(
  /<section className="card(?: measurementTarget)?"(?: ref=\{measurementTargetRef\})?>\n            <h2>\{room\}<\/h2>/,
  '<section className="card measurementTarget" id={`measurement-input-${title}`} ref={measurementTargetRef}>\n            <h2>{room}</h2>',
  'CF・巾木入力欄へIDを追加'
)

// CF・ソフト巾木の部屋選択で入力欄まで移動
replaceRequired(
  /onClick=\{\(\) => goToPage\(index\)\}>\{name\}<\/button>/,
  'onClick={() => { goToPage(index); scrollToMeasurementTarget(`measurement-input-${title}`) }}>{name}</button>',
  'CF・巾木の部屋選択スクロールを更新'
)

// クロスの部屋一覧に固定ID
replaceRequired(
  /<nav className="roomTabs"(?: ref=\{crossRoomTabsRef\})? aria-label="クロスの部屋">/,
  '<nav className="roomTabs" id="room-tabs-cross" ref={crossRoomTabsRef} aria-label="クロスの部屋">',
  'クロス部屋一覧へIDを追加'
)

// クロスの部位一覧に固定ID
replaceRequired(
  /<div className="measurementTypes(?: measurementTarget)?"(?: ref=\{crossMeasurementTargetRef\})? aria-label="採寸区分">/,
  '<div className="measurementTypes measurementTarget" id="cross-measurement-target" ref={crossMeasurementTargetRef} aria-label="採寸区分">',
  'クロス部位一覧へIDを追加'
)

// クロスの部屋選択で部位一覧まで移動
replaceRequired(
  /onClick=\{\(\) => goToPage\(index\)\}>\{name\}<\/button>/,
  'onClick={() => { goToPage(index); scrollToMeasurementTarget(\'cross-measurement-target\') }}>{name}</button>',
  'クロスの部屋選択スクロールを更新'
)

// カテゴリボタンのクリック処理を、描画後のIDスクロールへ変更
replaceRequired(
  /onClick=\{\(\) => \{\s*setActivePage\('cross'\)[\s\S]*?\}\}>クロス採寸<\/button>/,
  `onClick={() => {
                  setActivePage('cross')
                  scrollToMeasurementTarget('room-tabs-cross')
                }}>クロス採寸</button>`,
  'クロス採寸ボタンのスクロールを更新'
)

replaceRequired(
  /onClick=\{\(\) => \{\s*setActivePage\('cf'\)[\s\S]*?\}\}>CF採寸<\/button>/,
  `onClick={() => {
                  setActivePage('cf')
                  setCfScrollSignal(value => value + 1)
                  scrollToMeasurementTarget('room-tabs-CF')
                }}>CF採寸</button>`,
  'CF採寸ボタンのスクロールを更新'
)

replaceRequired(
  /onClick=\{\(\) => \{\s*setActivePage\('soft'\)[\s\S]*?\}\}>ソフト巾木<\/button>/,
  `onClick={() => {
                  setActivePage('soft')
                  setSoftScrollSignal(value => value + 1)
                  scrollToMeasurementTarget('room-tabs-ソフト巾木')
                }}>ソフト巾木</button>`,
  'ソフト巾木ボタンのスクロールを更新'
)

const required = [
  'function scrollToMeasurementTarget',
  'id="room-tabs-cross"',
  'id={`room-tabs-${title}`}',
  'id="cross-measurement-target"',
  'id={`measurement-input-${title}`}',
]
const missing = required.filter(text => !s.includes(text))
if (missing.length) {
  console.error('変更後の確認に失敗:', missing.join(', '))
  process.exit(1)
}

const backup = file + '.before-auto-scroll-v3'
fs.writeFileSync(backup, original, 'utf8')
fs.writeFileSync(file, s, 'utf8')

console.log('\n完了')
console.log('更新:', file)
console.log('バックアップ:', backup)
console.log('次に実行: npm run build')
