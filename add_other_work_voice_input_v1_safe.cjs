const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const cssPath = path.join(root, 'src', 'App.css')
const appBackup = appPath + '.before-other-work-voice-v1'
const cssBackup = cssPath + '.before-other-work-voice-v1'
const marker = 'M-CROSS_OTHER_WORK_VOICE_INPUT_V1_SAFE'

function fail(message){ console.error('ERROR: '+message); process.exit(1) }
if(!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if(!fs.existsSync(cssPath)) fail('src/App.css が見つかりません。')
let app=fs.readFileSync(appPath,'utf8')
let css=fs.readFileSync(cssPath,'utf8')
if(app.includes(marker)){ console.log('SKIP: その他工事 音声入力V1は適用済みです。'); process.exit(0) }

const stateAnchor="  const [unitPrice, setUnitPrice] = useState('')"
const formAnchor='<form className="additionalWorkForm" onSubmit={addWork}>'
if(!app.includes(stateAnchor)) fail('追加作業の単価stateが見つかりません。変更していません。')
if(!app.includes(formAnchor)) fail('追加作業フォームが見つかりません。変更していません。')

fs.copyFileSync(appPath,appBackup)
fs.copyFileSync(cssPath,cssBackup)
try{
  app=app.replace(stateAnchor, `${stateAnchor}\n  /* ${marker} */\n  const [voiceInputStatus, setVoiceInputStatus] = useState('')\n  const [voiceListening, setVoiceListening] = useState(false)`)

  const helperAnchor='  function addWork(event) {'
  if(!app.includes(helperAnchor)) throw new Error('addWork関数が見つかりません。')
  const helpers=`  function applyOtherWorkVoiceText(transcript) {\n    const text = String(transcript || '').trim()\n    if (!text) return\n    const normalized = text.replace(/[、，,。]/g, ' ').replace(/\\s+/g, ' ').trim()\n    const roomCandidate = rooms.find(name => normalized.startsWith(name + ' ') || normalized === name)\n      || rooms.find(name => normalized.includes(name))\n      || ''\n    let remainder = normalized\n    if (roomCandidate) {\n      setRoom(roomCandidate)\n      remainder = remainder.replace(roomCandidate, '').trim()\n    }\n    const quantityMatch = remainder.match(/(?:数量)?\\s*(\\d+(?:\\.\\d+)?)\\s*(式|個|本|枚|台|箇所)?$/)\n    if (quantityMatch) {\n      setQuantity(quantityMatch[1])\n      if (quantityMatch[2]) setUnit(quantityMatch[2])\n      remainder = remainder.slice(0, quantityMatch.index).trim()\n    }\n    if (remainder) setWork(remainder)\n    setVoiceInputStatus('認識結果を入力欄へ反映しました。内容を確認して登録してください。')\n  }\n\n  function startOtherWorkVoiceInput() {\n    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition\n    if (!Recognition) {\n      setVoiceInputStatus('このブラウザーでは音声入力を利用できません。端末のキーボード音声入力を使ってください。')\n      return\n    }\n    try {\n      const recognition = new Recognition()\n      recognition.lang = 'ja-JP'\n      recognition.continuous = false\n      recognition.interimResults = false\n      recognition.maxAlternatives = 1\n      setVoiceListening(true)\n      setVoiceInputStatus('🎤 聞き取り中… 例：台所 混合栓 漏水修理')\n      recognition.onresult = event => {\n        const transcript = event.results?.[0]?.[0]?.transcript || ''\n        applyOtherWorkVoiceText(transcript)\n      }\n      recognition.onerror = event => {\n        setVoiceInputStatus('音声入力エラー: ' + (event.error || '認識できませんでした'))\n      }\n      recognition.onend = () => setVoiceListening(false)\n      recognition.start()\n    } catch (error) {\n      setVoiceListening(false)\n      setVoiceInputStatus('音声入力を開始できませんでした。マイク権限を確認してください。')\n      console.error(error)\n    }\n  }\n\n${helperAnchor}`
  app=app.replace(helperAnchor,helpers)

  const voiceUI=`${formAnchor}\n          <div className="otherWorkVoiceBox">\n            <button className="otherWorkVoiceButton" type="button" disabled={voiceListening} onClick={startOtherWorkVoiceInput}>\n              {voiceListening ? '🎤 聞き取り中…' : '🎤 音声で入力'}\n            </button>\n            <small>例：台所 混合栓 漏水修理 ／ 台所 混合栓 カートリッジ交換 1個</small>\n            {voiceInputStatus && <p className="otherWorkVoiceStatus" role="status">{voiceInputStatus}</p>}\n          </div>`
  app=app.replace(formAnchor,voiceUI)

  css += `\n/* ${marker} */\n.otherWorkVoiceBox{display:grid;gap:7px;margin-bottom:16px;padding:14px;border:1px solid rgba(39,111,191,.25);border-radius:14px;background:rgba(39,111,191,.06)}.otherWorkVoiceButton{min-height:48px;border:0;border-radius:12px;background:linear-gradient(135deg,#2878db,#0aa6a6);color:#fff;font-weight:900;font-size:17px;cursor:pointer}.otherWorkVoiceButton:disabled{opacity:.75}.otherWorkVoiceBox small{font-size:13px!important;opacity:.8}.otherWorkVoiceStatus{margin:0;font-size:14px;font-weight:700}.theme-dark .otherWorkVoiceBox,.theme-cyber .otherWorkVoiceBox,.theme-luxury .otherWorkVoiceBox,.theme-retro .otherWorkVoiceBox,.theme-galaxy .otherWorkVoiceBox{background:rgba(51,230,255,.08);border-color:rgba(51,230,255,.35)}\n`

  fs.writeFileSync(appPath,app,'utf8')
  fs.writeFileSync(cssPath,css,'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true})
  console.log('OK: その他工事の音声入力V1を追加し、ビルド成功を確認しました。')
  console.log('  - 音声結果は自動登録せず入力欄へ反映')
  console.log('  - 部屋名、末尾の数量・単位を簡易解析')
  console.log('BACKUP: '+appBackup)
}catch(error){
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message||String(error))
  if(fs.existsSync(appBackup)) fs.copyFileSync(appBackup,appPath)
  if(fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup,cssPath)
  process.exit(1)
}
