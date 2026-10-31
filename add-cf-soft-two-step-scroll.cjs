const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-cf-soft-two-step-scroll')

if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}

let source = fs.readFileSync(file, 'utf8')
const original = source
const start = source.indexOf('function LengthMeasurementPage(')
const end = source.indexOf('\nfunction FloorTrimSection(', start)

if (start === -1 || end === -1) {
  console.error('CF・ソフト巾木の共用画面を特定できません。変更せず終了しました。')
  process.exit(1)
}

let component = source.slice(start, end)

// 以前の入力欄→テンキー用refがあれば維持し、今回の2つのrefだけ追加する。
const refAnchor = '  const memoInputRef = useRef(null)'
if (!component.includes(refAnchor)) {
  console.error('refの追加位置が見つかりません。変更せず終了しました。')
  process.exit(1)
}
if (!component.includes('const lengthRoomAreaRef = useRef(null)')) {
  component = component.replace(
    refAnchor,
    `${refAnchor}\n  const lengthRoomAreaRef = useRef(null)\n  const lengthEntryAreaRef = useRef(null)`
  )
}

// CF・ソフト巾木の画面が表示された直後、部屋選択へ移動する。
const totalAnchor = "  const total = Object.values(roomTotals).reduce((sum, value) => sum + value, 0)"
if (!component.includes(totalAnchor)) {
  console.error('初期スクロール処理の追加位置が見つかりません。')
  process.exit(1)
}
if (!component.includes('lengthRoomAreaRef.current?.scrollIntoView')) {
  component = component.replace(totalAnchor, `${totalAnchor}

  useEffect(() => {
    const firstFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        lengthRoomAreaRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      })
    })
    return () => cancelAnimationFrame(firstFrame)
  }, [])`)
}

// 部屋タップ後は、CFなら長さ・本数、ソフト巾木なら枚数の入力エリアへ移動する。
const goStart = component.indexOf('  function goToPage(index) {')
const goEnd = component.indexOf('\n\n  function updateInput', goStart)
if (goStart === -1 || goEnd === -1) {
  console.error('CF・ソフト巾木のgoToPageを特定できません。')
  process.exit(1)
}
const goBlock = `  function goToPage(index) {
    const nextIndex = Math.max(0, Math.min(index, rooms.length))
    setPageIndex(nextIndex)
    setActiveInput('')
    setLength('')
    setCount('')
    setMemo('')

    if (nextIndex < rooms.length) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          lengthEntryAreaRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        })
      })
    }
  }`
component = component.slice(0, goStart) + goBlock + component.slice(goEnd)

// 部屋タブを最初のスクロール先に設定。
const navOld = '<nav className="roomTabs" aria-label={`${title}の部屋`}>'
const navNew = '<nav ref={lengthRoomAreaRef} className="roomTabs" aria-label={`${title}の部屋`}>'
if (component.includes(navOld)) {
  component = component.replace(navOld, navNew)
} else if (!component.includes('ref={lengthRoomAreaRef} className="roomTabs"')) {
  console.error('CF・ソフト巾木の部屋タブが見つかりません。')
  process.exit(1)
}

// 入力カードを部屋タップ後のスクロール先に設定。
const cardOld = `          <section className="card">
            <h2>{room}</h2>`
const cardNew = `          <section ref={lengthEntryAreaRef} className="card">
            <h2>{room}</h2>`
if (component.includes(cardOld)) {
  component = component.replace(cardOld, cardNew)
} else if (!component.includes('ref={lengthEntryAreaRef} className="card"')) {
  console.error('CF・ソフト巾木の入力カードが見つかりません。')
  process.exit(1)
}

source = source.slice(0, start) + component + source.slice(end)

if (source === original) {
  console.error('変更がありません。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, source, 'utf8')

console.log('OK: バックアップ作成 ' + backup)
console.log('OK: CF採寸タップ → CFの部屋選択までスライド')
console.log('OK: ソフト巾木タップ → ソフト巾木の部屋選択までスライド')
console.log('OK: CFの部屋タップ → 長さ・本数までスライド')
console.log('OK: ソフト巾木の部屋タップ → 枚数までスライド')
console.log('OK: 入力欄タップ → テンキーへの既存スクロールは維持')
console.log('完了: npm run build を実行してください。')
