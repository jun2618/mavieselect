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

// 1. スクロール位置用CSS
replaceOnce(
`  .roomTabs { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,96px),1fr)); gap:10px; margin:20px 0; }`,
`  .roomTabs { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,96px),1fr)); gap:10px; margin:20px 0; scroll-margin-top:18px; }
  .measurementTarget { scroll-margin-top:18px; }`,
'スクロール位置CSSを追加'
);

// 2. LengthMeasurementPageにrefs追加
replaceOnce(
`  const [activeInput, setActiveInput] = useState('')
  const isSummaryPage = pageIndex === rooms.length`,
`  const [activeInput, setActiveInput] = useState('')
  const roomTabsRef = useRef(null)
  const measurementTargetRef = useRef(null)
  const isSummaryPage = pageIndex === rooms.length`,
'CF・巾木用スクロールrefsを追加'
);

// 3. LengthMeasurementPageのgoToPageで入力欄までスクロール
replaceOnce(
`  function goToPage(index) {
    setPageIndex(Math.max(0, Math.min(index, rooms.length)))
    setActiveInput('')
    setLength('')
    setCount('')
  }`,
`  function goToPage(index) {
    const nextIndex = Math.max(0, Math.min(index, rooms.length))
    setPageIndex(nextIndex)
    setActiveInput('')
    setLength('')
    setCount('')
    requestAnimationFrame(() => {
      measurementTargetRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }`,
'CF・巾木の部屋選択後スクロールを追加'
);

// 4. LengthMeasurementPageの部屋タブにref
replaceOnce(
`      <nav className="roomTabs" aria-label={\`${title}の部屋\`}>`,
`      <nav className="roomTabs" ref={roomTabsRef} aria-label={\`${title}の部屋\`}>`,
'CF・巾木の部屋タブrefを追加'
);

// 5. LengthMeasurementPageの入力/合計対象にref
replaceOnce(
`          <section className="card">
            <h2>部屋ごとの{title}合計</h2>`,
`          <section className="card measurementTarget" ref={measurementTargetRef}>
            <h2>部屋ごとの{title}合計</h2>`,
'CF・巾木の合計位置を設定'
);
replaceOnce(
`          <section className="card">
            <h2>{room}</h2>
            <form onSubmit={addRecord}>`,
`          <section className="card measurementTarget" ref={measurementTargetRef}>
            <h2>{room}</h2>
            <form onSubmit={addRecord}>`,
'CF・巾木の入力位置を設定'
);

// 6. App側にクロス用refs追加
replaceOnce(
`  const crossInputAreaRef = useRef(null)`,
`  const crossInputAreaRef = useRef(null)
  const crossRoomTabsRef = useRef(null)
  const crossMeasurementTargetRef = useRef(null)`,
'クロス用スクロールrefsを追加'
);

// 7. App側のgoToPageでクロス部位までスクロール
replaceOnce(
`  function goToPage(index) {
    setPageIndex(Math.max(0, Math.min(index, rooms.length)))
    setActiveInput('')
    setHeight('')
    setCount('')
    setMemo('')
  }`,
`  function goToPage(index) {
    const nextIndex = Math.max(0, Math.min(index, rooms.length))
    setPageIndex(nextIndex)
    setActiveInput('')
    setHeight('')
    setCount('')
    setMemo('')
    requestAnimationFrame(() => {
      crossMeasurementTargetRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }`,
'クロスの部屋選択後スクロールを追加'
);

// 8. 採寸カテゴリボタン: 押したら該当ページの部屋一覧へスクロール
const oldButtons = `<button type="button" className={activePage === 'cross' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('cross')}>クロス採寸</button>
                <button type="button" className={activePage === 'cf' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('cf')}>CF採寸</button>
                <button type="button" className={activePage === 'soft' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('soft')}>ソフト巾木</button>`;
const newButtons = `<button type="button" className={activePage === 'cross' ? 'measurementType active' : 'measurementType'} onClick={() => {
                  setActivePage('cross')
                  requestAnimationFrame(() => crossRoomTabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
                }}>クロス採寸</button>
                <button type="button" className={activePage === 'cf' ? 'measurementType active' : 'measurementType'} onClick={() => {
                  setActivePage('cf')
                }}>CF採寸</button>
                <button type="button" className={activePage === 'soft' ? 'measurementType active' : 'measurementType'} onClick={() => {
                  setActivePage('soft')
                }}>ソフト巾木</button>`;
replaceOnce(oldButtons, newButtons, '採寸カテゴリ切替処理を更新');

// 9. CF・巾木はコンポーネント描画後に部屋一覧へスクロールする合図を渡す
replaceOnce(
`  onRecordsChanged,
}) {`,
`  onRecordsChanged,
  scrollToRoomsSignal = 0,
}) {`,
'LengthMeasurementPageへスクロール合図を追加'
);

replaceOnce(
`  const total = Object.values(roomTotals).reduce((sum, value) => sum + value, 0)

  function goToPage(index) {`,
`  const total = Object.values(roomTotals).reduce((sum, value) => sum + value, 0)

  useEffect(() => {
    if (!scrollToRoomsSignal) return
    requestAnimationFrame(() => {
      roomTabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [scrollToRoomsSignal])

  function goToPage(index) {`,
'CF・巾木の部屋一覧自動スクロールeffectを追加'
);

// 10. Appにスクロール合図state
replaceOnce(
`  const [softPageIndex, setSoftPageIndex] = useState(0)`,
`  const [softPageIndex, setSoftPageIndex] = useState(0)
  const [cfScrollSignal, setCfScrollSignal] = useState(0)
  const [softScrollSignal, setSoftScrollSignal] = useState(0)`,
'CF・巾木スクロール合図stateを追加'
);

// 11. CF/巾木ボタンで合図更新
s = s.replace(
`                  setActivePage('cf')
                }}>CF採寸</button>`,
`                  setActivePage('cf')
                  setCfScrollSignal(value => value + 1)
                }}>CF採寸</button>`
);
s = s.replace(
`                  setActivePage('soft')
                }}>ソフト巾木</button>`,
`                  setActivePage('soft')
                  setSoftScrollSignal(value => value + 1)
                }}>ソフト巾木</button>`
);
console.log('OK: CF・巾木ボタンのスクロール合図を追加');

// 12. CF/巾木コンポーネントへ合図を渡す
replaceOnce(
`                onRecordsChanged={markUnsaved}
              />`,
`                onRecordsChanged={markUnsaved}
                scrollToRoomsSignal={cfScrollSignal}
              />`,
'CFへスクロール合図を接続'
);
replaceOnce(
`                countOnly
                onRecordsChanged={markUnsaved}
              />`,
`                countOnly
                onRecordsChanged={markUnsaved}
                scrollToRoomsSignal={softScrollSignal}
              />`,
'巾木へスクロール合図を接続'
);

// 13. クロス部屋タブにref
replaceOnce(
`                <nav className="roomTabs" aria-label="クロスの部屋">`,
`                <nav className="roomTabs" ref={crossRoomTabsRef} aria-label="クロスの部屋">`,
'クロス部屋タブrefを追加'
);

// 14. クロスの部位選択部分にスクロール先ref
replaceOnce(
`                      <div className="measurementTypes" aria-label="採寸区分">`,
`                      <div className="measurementTypes measurementTarget" ref={crossMeasurementTargetRef} aria-label="採寸区分">`,
'クロスの部位スクロール先を設定'
);

const backup = file + '.before-measurement-auto-scroll';
fs.writeFileSync(backup, original, 'utf8');
fs.writeFileSync(file, s, 'utf8');

console.log('\n完了');
console.log('更新:', file);
console.log('バックアップ:', backup);
console.log('次に実行: npm run build');
