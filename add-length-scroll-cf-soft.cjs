const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-cf-soft-keypad-scroll')

if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}

let source = fs.readFileSync(file, 'utf8')
const original = source
const componentStart = source.indexOf('function LengthMeasurementPage(')
const componentEnd = source.indexOf('\nfunction FloorTrimSection(', componentStart)

if (componentStart === -1 || componentEnd === -1) {
  console.error('CF・ソフト巾木の入力画面を特定できません。変更せず終了しました。')
  process.exit(1)
}

let component = source.slice(componentStart, componentEnd)

// CF・ソフト巾木共用画面に、入力エリアの参照を追加。
const refAnchor = '  const memoInputRef = useRef(null)'
if (!component.includes(refAnchor)) {
  console.error('入力画面の参照追加位置が見つかりません。変更せず終了しました。')
  process.exit(1)
}
component = component.replace(
  refAnchor,
  `${refAnchor}\n  const lengthInputAreaRef = useRef(null)`
)

// クロスと同じ方式で、テンキーが表示された次の描画時に中央へ移動。
const effectAnchor = `  function updateInput(key) {`
if (!component.includes(effectAnchor)) {
  console.error('スクロール処理の追加位置が見つかりません。変更せず終了しました。')
  process.exit(1)
}
const effect = `  useEffect(() => {
    if (!activeInput) return

    const frame = requestAnimationFrame(() => {
      lengthInputAreaRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [activeInput])

`
component = component.replace(effectAnchor, effect + effectAnchor)

// 入力欄・テンキー・登録ボタンを含むフォーム全体をスクロール対象にする。
const formAnchor = '<form onSubmit={addRecord}>'
const formCount = component.split(formAnchor).length - 1
if (formCount !== 1) {
  console.error(`入力フォームを特定できません（一致数: ${formCount}）。変更せず終了しました。`)
  process.exit(1)
}
component = component.replace(
  formAnchor,
  '<form ref={lengthInputAreaRef} onSubmit={addRecord}>'
)

source = source.slice(0, componentStart) + component + source.slice(componentEnd)

if (source === original) {
  console.error('変更がありません。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, source, 'utf8')

console.log('OK: バックアップ作成 ' + backup)
console.log('OK: CFの長さ・本数タップ時にテンキー全体へ自動スクロール')
console.log('OK: ソフト巾木の枚数タップ時にテンキー全体へ自動スクロール')
console.log('OK: クロスと同じ requestAnimationFrame + scrollIntoView 方式を使用')
console.log('完了: npm run build を実行してください。')
