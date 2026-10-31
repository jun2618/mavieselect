const fs = require('fs')
const path = require('path')

const file = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-quick-memos-cross-only')

if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file)
  process.exit(1)
}

let source = fs.readFileSync(file, 'utf8')
const original = source

// LengthMeasurementPage は CF・ソフト巾木で共用されています。
// その中の「よく使うメモ」ボタン群だけ削除し、メモ入力欄は残します。
const block = `              <div className="quickMemos" aria-label="よく使うメモ">
                {quickMemos.map(text => <button key={text} className="quickMemoButton" type="button" onClick={() => addQuickMemo(text)}>{text}</button>)}
                <button className="quickMemoButton" type="button" onClick={() => memoInputRef.current?.focus()}>その他</button>
              </div>
`

const count = source.split(block).length - 1
if (count !== 1) {
  console.error(`CF・ソフト巾木側の「よく使うメモ」を特定できません（一致数: ${count}）。`)
  console.error('変更せず終了しました。')
  process.exit(1)
}

fs.copyFileSync(file, backup)
source = source.replace(block, '')

if (source === original) {
  console.error('変更がありません。')
  process.exit(1)
}

fs.writeFileSync(file, source, 'utf8')
console.log('OK: バックアップ作成 ' + backup)
console.log('OK: CF・ソフト巾木から「よく使うメモ」ボタンを削除')
console.log('OK: CF・ソフト巾木の手入力メモ欄は残しています')
console.log('OK: クロスの「よく使うメモ」はそのまま残しています')
console.log('完了: 次に npm run build を実行してください。')
