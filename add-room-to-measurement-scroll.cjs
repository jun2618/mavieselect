const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-room-measurement-scroll')

if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}

let source = fs.readFileSync(file, 'utf8')
const original = source

// App本体側のクロス採寸領域だけを対象にする。
const appStart = source.indexOf('export default function App()')
if (appStart === -1) {
  console.error('App本体が見つかりません。変更せず終了しました。')
  process.exit(1)
}

const refAnchor = '  const crossInputAreaRef = useRef(null)'
const refPos = source.indexOf(refAnchor, appStart)
if (refPos === -1) {
  console.error('クロス入力エリアの参照が見つかりません。変更せず終了しました。')
  process.exit(1)
}
source = source.slice(0, refPos) + source.slice(refPos).replace(
  refAnchor,
  `${refAnchor}\n  const measurementTypeAreaRef = useRef(null)`,
  1
)
console.log('OK: 天井・壁選択エリアの参照を追加')

const goToPageOld = `  function goToPage(index) {
    setPageIndex(Math.max(0, Math.min(index, rooms.length)))
    setActiveInput('')
    setHeight('')
    setCount('')
    setMemo('')
  }`
const goToPageNew = `  function goToPage(index) {
    const nextIndex = Math.max(0, Math.min(index, rooms.length))
    setPageIndex(nextIndex)
    setActiveInput('')
    setHeight('')
    setCount('')
    setMemo('')

    // 全室合計ではなく部屋を選んだときだけ、天井・壁選択へ移動する。
    if (nextIndex < rooms.length) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          measurementTypeAreaRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        })
      })
    }
  }`

const appTail = source.slice(appStart)
const goCount = appTail.split(goToPageOld).length - 1
if (goCount !== 1) {
  console.error(`クロス用goToPageを特定できません（一致数: ${goCount}）。変更せず終了しました。`)
  process.exit(1)
}
source = source.slice(0, appStart) + appTail.replace(goToPageOld, goToPageNew)
console.log('OK: 部屋タップ後の自動スクロール処理を追加')

const typeAreaOld = '<div className="measurementTypes" aria-label="採寸区分">'
const typeAreaNew = '<div ref={measurementTypeAreaRef} className="measurementTypes" aria-label="採寸区分">'
const typeCount = source.split(typeAreaOld).length - 1
if (typeCount !== 1) {
  console.error(`天井・壁選択エリアを特定できません（一致数: ${typeCount}）。変更せず終了しました。`)
  process.exit(1)
}
source = source.replace(typeAreaOld, typeAreaNew)
console.log('OK: 天井・壁選択エリアをスクロール先に設定')

if (source === original) {
  console.error('変更がありません。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, source, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('完了: 部屋をタップすると天井・収納天井・壁・収納壁までスライドします。')
console.log('次に npm run build を実行してください。')
