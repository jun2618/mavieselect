const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const memoPath = path.join(root, 'src', 'measurementMemoVoice.js')
const appPath = path.join(root, 'src', 'App.jsx')
const memoBackup = memoPath + '.before-voice-correction-v1'
const appBackup = appPath + '.before-voice-correction-v1'
const marker = 'M-CROSS_VOICE_CORRECTION_DICTIONARY_V1_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(memoPath)) fail('src/measurementMemoVoice.js が見つかりません。')
if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')

let memo = fs.readFileSync(memoPath, 'utf8')
let app = fs.readFileSync(appPath, 'utf8')
if (memo.includes(marker) || app.includes(marker)) {
  console.log('SKIP: 音声補正辞書V1は適用済みです。')
  process.exit(0)
}

const memoResult = "      const transcript = event.results?.[0]?.[0]?.transcript || ''\n      appendTranscript(field, transcript)"
const appResult = "        const transcript = event.results?.[0]?.[0]?.transcript || ''"
if (!memo.includes(memoResult)) fail('採寸メモ側の音声認識結果処理が見つかりません。')
if (!app.includes(appResult)) fail('その他工事側の音声認識結果処理が見つかりません。')

fs.copyFileSync(memoPath, memoBackup)
fs.copyFileSync(appPath, appBackup)

const dictionary = `/* ${marker} */
const mCrossVoiceCorrections = [
  ['針覗く', '梁除く'],
  ['針のぞく', '梁除く'],
  ['針除く', '梁除く'],
  ['梁覗く', '梁除く'],
  ['梁のぞく', '梁除く'],
  ['ソフト幅木', 'ソフト巾木'],
  ['ソフト幅木', 'ソフト巾木'],
  ['クッションフロアー', 'クッションフロア'],
  ['カートリッヂ', 'カートリッジ'],
]

function correctMCrossVoiceText(value) {
  let text = String(value || '').trim()
  for (const [from, to] of mCrossVoiceCorrections) {
    text = text.split(from).join(to)
  }
  return text
}

`

try {
  memo = dictionary + memo
  memo = memo.replace(memoResult, "      const transcript = correctMCrossVoiceText(event.results?.[0]?.[0]?.transcript || '')\n      appendTranscript(field, transcript)")

  // App.jsx側にも同じ小さな辞書を独立追加。既存ロジックは変更せず、認識直後だけ補正。
  const helperAnchor = '  function applyOtherWorkVoiceText(transcript) {'
  if (!app.includes(helperAnchor)) throw new Error('その他工事の音声解析関数が見つかりません。')
  const appDictionary = `  /* ${marker} */
  function correctOtherWorkVoiceText(value) {
    const corrections = [
      ['針覗く', '梁除く'], ['針のぞく', '梁除く'], ['針除く', '梁除く'],
      ['梁覗く', '梁除く'], ['梁のぞく', '梁除く'],
      ['ソフト幅木', 'ソフト巾木'], ['クッションフロアー', 'クッションフロア'],
      ['カートリッヂ', 'カートリッジ'],
    ]
    let text = String(value || '').trim()
    corrections.forEach(([from, to]) => { text = text.split(from).join(to) })
    return text
  }

${helperAnchor}`
  app = app.replace(helperAnchor, appDictionary)
  app = app.replace(appResult, "        const transcript = correctOtherWorkVoiceText(event.results?.[0]?.[0]?.transcript || '')")

  fs.writeFileSync(memoPath, memo, 'utf8')
  fs.writeFileSync(appPath, app, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: M-Cross音声補正辞書V1を適用し、ビルド成功を確認しました。')
  console.log('例: 針覗く/針除く/梁覗く -> 梁除く')
  console.log('    ソフト幅木 -> ソフト巾木')
  console.log('    クッションフロアー -> クッションフロア')
  console.log('BACKUP: ' + memoBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(memoBackup)) fs.copyFileSync(memoBackup, memoPath)
  if (fs.existsSync(appBackup)) fs.copyFileSync(appBackup, appPath)
  process.exit(1)
}
