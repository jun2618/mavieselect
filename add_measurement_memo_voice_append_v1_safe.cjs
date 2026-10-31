const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const cssPath = path.join(root, 'src', 'App.css')
const appBackup = appPath + '.before-measurement-memo-voice-v1'
const cssBackup = cssPath + '.before-measurement-memo-voice-v1'
const marker = 'M-CROSS_MEASUREMENT_MEMO_VOICE_APPEND_V1_SAFE'

function fail(message){ console.error('ERROR: '+message); process.exit(1) }
if(!fs.existsSync(appPath)||!fs.existsSync(cssPath)) fail('src/App.jsx または src/App.css が見つかりません。')
let app=fs.readFileSync(appPath,'utf8'), css=fs.readFileSync(cssPath,'utf8')
if(app.includes(marker)){ console.log('SKIP: 採寸メモ音声追記V1は適用済みです。'); process.exit(0) }

// 共通のmemo stateと、音声入力が既に導入済みであることだけを安全条件にする。
const memoState = "  const [memo, setMemo] = useState('')"
if(!app.includes(memoState)) fail('共通memo stateが見つかりません。変更していません。')
if(!app.includes('window.SpeechRecognition || window.webkitSpeechRecognition')) fail('既存の音声入力処理が見つかりません。変更していません。')

// memoへ直接書く入力欄を検出。value={memo} かつ setMemoを使うinput/textareaだけを対象にする。
const memoFieldRegex = /<(input|textarea)([^>]*\bvalue=\{memo\}[^>]*\bonChange=\{[^}]*setMemo\([^}]+\)[^}]*\}[^>]*)\s*\/>/g
const memoMatches=[...app.matchAll(memoFieldRegex)]
if(memoMatches.length<1) fail('value={memo} のメモ入力欄が見つかりません。変更していません。')

fs.copyFileSync(appPath,appBackup); fs.copyFileSync(cssPath,cssBackup)
try{
  app=app.replace(memoState, `${memoState}\n  /* ${marker} */\n  const [measurementMemoVoiceStatus, setMeasurementMemoVoiceStatus] = useState('')\n  const [measurementMemoVoiceListening, setMeasurementMemoVoiceListening] = useState(false)`)

  const helperAnchor='  function startOtherWorkVoiceInput() {'
  if(!app.includes(helperAnchor)) throw new Error('既存のその他工事音声入力関数が見つかりません。')
  const helper=`  function startMeasurementMemoVoiceAppend() {\n    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition\n    if (!Recognition) {\n      setMeasurementMemoVoiceStatus('このブラウザーでは音声入力を利用できません。')\n      return\n    }\n    try {\n      const recognition = new Recognition()\n      recognition.lang = 'ja-JP'\n      recognition.continuous = false\n      recognition.interimResults = false\n      recognition.maxAlternatives = 1\n      setMeasurementMemoVoiceListening(true)\n      setMeasurementMemoVoiceStatus('🎤 聞き取り中…')\n      recognition.onresult = event => {\n        const transcript = String(event.results?.[0]?.[0]?.transcript || '').trim()\n        if (!transcript) return\n        setMemo(previous => [String(previous || '').trim(), transcript].filter(Boolean).join('　'))\n        setMeasurementMemoVoiceStatus('✓ メモへ追記しました')\n        setIsDirty(true)\n      }\n      recognition.onerror = event => {\n        setMeasurementMemoVoiceStatus(event.error === 'not-allowed' ? 'マイクの使用が許可されていません' : '音声入力エラー: ' + (event.error || '認識できませんでした'))\n      }\n      recognition.onend = () => setMeasurementMemoVoiceListening(false)\n      recognition.start()\n    } catch (error) {\n      console.error(error)\n      setMeasurementMemoVoiceListening(false)\n      setMeasurementMemoVoiceStatus('音声入力を開始できませんでした')\n    }\n  }\n\n${helperAnchor}`
  app=app.replace(helperAnchor,helper)

  // memo入力欄の直後にマイクUIを追加。複数画面で同じmemo stateを使っていても個別に表示される。
  let added=0
  app=app.replace(memoFieldRegex,(full)=>{
    added++
    return `${full}\n                  <div className="measurementMemoVoiceRow">\n                    <button type="button" className="measurementMemoVoiceButton" disabled={measurementMemoVoiceListening} onClick={startMeasurementMemoVoiceAppend}>${'${measurementMemoVoiceListening ? \'🎤 聞き取り中…\' : \'🎤 メモへ音声追記\'}'}</button>\n                    {measurementMemoVoiceStatus && <small role="status">{measurementMemoVoiceStatus}</small>}\n                  </div>`
  })
  if(added<1) throw new Error('メモ入力欄への音声ボタン追加件数が0件です。')

  css += `\n/* ${marker} */\n.measurementMemoVoiceRow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:7px}.measurementMemoVoiceButton{min-height:40px;padding:8px 12px;border:1px solid rgba(39,111,203,.34);border-radius:10px;background:rgba(39,111,203,.08);color:inherit;font-weight:850;cursor:pointer}.measurementMemoVoiceButton:disabled{opacity:.7}.measurementMemoVoiceRow small{font-size:13px!important;opacity:.82!important}@media(max-width:620px){.measurementMemoVoiceButton{min-height:44px}.measurementMemoVoiceRow{align-items:stretch}.measurementMemoVoiceRow small{width:100%}}\n`

  fs.writeFileSync(appPath,app,'utf8'); fs.writeFileSync(cssPath,css,'utf8')
  console.log('音声追記ボタンを '+added+' 箇所に追加しました。自動ビルド確認を行います。')
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true})
  console.log('OK: 採寸メモへの音声追記V1を適用し、ビルド成功を確認しました。')
  console.log('既存メモは上書きせず、認識結果を全角スペース区切りで末尾へ追記します。')
  console.log('BACKUP: '+appBackup)
}catch(error){
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message||String(error))
  if(fs.existsSync(appBackup)) fs.copyFileSync(appBackup,appPath)
  if(fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup,cssPath)
  process.exit(1)
}
