const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-cross-two-step-scroll')

if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}
let s = fs.readFileSync(file, 'utf8')
const original = s

// 前回の失敗版が入っていた場合は、追加したrefだけ安全に除去する。
s = s.replace("  const measurementTypeAreaRef = useRef(null)\n", '')
s = s.replace('ref={measurementTypeAreaRef} className="measurementTypes" aria-label="採寸区分"', 'className="measurementTypes" aria-label="採寸区分"')

// 既存のクロス用 ref の直後に2段階のスクロール先を追加。
const refAnchor = '  const crossInputAreaRef = useRef(null)'
const refPos = s.indexOf(refAnchor, s.indexOf('export default function App()'))
if (refPos === -1) { console.error('crossInputAreaRef が見つかりません。'); process.exit(1) }
const refInsert = `${refAnchor}\n  const crossRoomAreaRef = useRef(null)\n  const crossTypeAreaRef = useRef(null)`
s = s.slice(0, refPos) + s.slice(refPos).replace(refAnchor, refInsert, 1)

// クロス採寸タブを押した時だけ、部屋選択エリアへ。
const crossTabOld = `<button type="button" className={activePage === 'cross' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('cross')}>クロス採寸</button>`
const crossTabNew = `<button type="button" className={activePage === 'cross' ? 'measurementType active' : 'measurementType'} onClick={() => {
                  setActivePage('cross')
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      crossRoomAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    })
                  })
                }}>クロス採寸</button>`
if (!s.includes(crossTabOld)) { console.error('クロス採寸タブが見つかりません。'); process.exit(1) }
s = s.replace(crossTabOld, crossTabNew)

// クロスの部屋タブ領域を、最初のスクロール先にする。
const roomNavOld = '<nav className="roomTabs" aria-label="クロスの部屋">'
const roomNavNew = '<nav ref={crossRoomAreaRef} className="roomTabs" aria-label="クロスの部屋">'
if (!s.includes(roomNavOld)) { console.error('クロス部屋タブが見つかりません。'); process.exit(1) }
s = s.replace(roomNavOld, roomNavNew)

// 天井・壁の採寸区分を2段階目のスクロール先にする。
const typeOld = '<div className="measurementTypes" aria-label="採寸区分">'
const typeNew = '<div ref={crossTypeAreaRef} className="measurementTypes" aria-label="採寸区分">'
if (!s.includes(typeOld)) { console.error('クロス採寸区分が見つかりません。'); process.exit(1) }
s = s.replace(typeOld, typeNew)

// App本体のクロスgoToPageを、部屋→採寸区分スクロールへ置換。
const appStart = s.indexOf('export default function App()')
const goStart = s.indexOf('  function goToPage(index) {', appStart)
const goEnd = s.indexOf('\n  function updateCrossInput', goStart)
if (goStart === -1 || goEnd === -1) { console.error('クロス用goToPageが見つかりません。'); process.exit(1) }
const goBlock = `  function goToPage(index) {
    const nextIndex = Math.max(0, Math.min(index, rooms.length))
    setPageIndex(nextIndex)
    setActiveInput('')
    setHeight('')
    setCount('')
    setMemo('')

    if (nextIndex < rooms.length) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          crossTypeAreaRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        })
      })
    }
  }
`
s = s.slice(0, goStart) + goBlock + s.slice(goEnd)

if (s === original) { console.error('変更がありません。'); process.exit(1) }
fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('OK: クロス採寸タップ → 部屋選択までスライド')
console.log('OK: 部屋タップ → 天井・収納天井・壁・収納壁までスライド')
console.log('OK: 入力欄タップ → 既存の電卓スクロールはそのまま維持')
console.log('完了: npm run build を実行してください。')
