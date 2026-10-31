const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const enhancerPath = path.join(root, 'src', 'measurementMemoVoice.js')
const cssPath = path.join(root, 'src', 'measurementMemoVoice.css')
const backup = appPath + '.before-measurement-memo-voice-v2'
const marker = 'M-CROSS_MEASUREMENT_MEMO_VOICE_V2_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let app = fs.readFileSync(appPath, 'utf8')
if (app.includes(marker)) {
  console.log('SKIP: 採寸メモ音声追記V2は適用済みです。')
  process.exit(0)
}
if (fs.existsSync(enhancerPath) || fs.existsSync(cssPath)) {
  fail('measurementMemoVoice.js または CSS がすでに存在します。勝手に上書きしません。')
}

const importRegex = /^import .*['"]\.\/App\.css['"]\s*$/m
if (!importRegex.test(app)) fail('App.css のimport位置が見つかりません。')

fs.copyFileSync(appPath, backup)

const enhancer = `/* ${marker} */
import './measurementMemoVoice.css'

const BUTTON_CLASS = 'measurementMemoVoiceButtonV2'
const STATUS_CLASS = 'measurementMemoVoiceStatusV2'
let activeRecognition = null

function setReactInputValue(element, value) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
  descriptor?.set?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

function appendTranscript(field, transcript) {
  const current = String(field.value || '').trim()
  const addition = String(transcript || '').trim()
  if (!addition) return
  setReactInputValue(field, [current, addition].filter(Boolean).join('　'))
}

function findMemoFields() {
  return [...document.querySelectorAll('label')]
    .filter(label => {
      const title = label.querySelector(':scope > span')?.textContent?.trim()
      if (title !== 'メモ') return false
      if (label.classList.contains('siteMemoField')) return false
      return Boolean(label.querySelector('input, textarea'))
    })
}

function addVoiceButton(label) {
  if (label.querySelector('.' + BUTTON_CLASS)) return
  const field = label.querySelector('input, textarea')
  if (!field) return

  const wrapper = document.createElement('div')
  wrapper.className = 'measurementMemoVoiceWrapV2'

  const button = document.createElement('button')
  button.type = 'button'
  button.className = BUTTON_CLASS
  button.textContent = '🎤 メモへ音声追記'

  const status = document.createElement('small')
  status.className = STATUS_CLASS
  status.setAttribute('role', 'status')

  button.addEventListener('click', () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      status.textContent = 'このブラウザーでは音声入力を利用できません'
      return
    }
    if (activeRecognition) {
      try { activeRecognition.stop() } catch {}
      activeRecognition = null
    }

    const recognition = new Recognition()
    activeRecognition = recognition
    recognition.lang = 'ja-JP'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    button.disabled = true
    button.textContent = '🎤 聞き取り中…'
    status.textContent = '話してください'

    recognition.onresult = event => {
      const transcript = event.results?.[0]?.[0]?.transcript || ''
      appendTranscript(field, transcript)
      status.textContent = transcript ? '✓ メモへ追記しました' : '音声を認識できませんでした'
      field.dispatchEvent(new Event('blur', { bubbles: true }))
    }
    recognition.onerror = event => {
      status.textContent = event.error === 'not-allowed'
        ? 'マイクの使用が許可されていません'
        : '音声入力エラー: ' + (event.error || '認識できませんでした')
    }
    recognition.onend = () => {
      button.disabled = false
      button.textContent = '🎤 メモへ音声追記'
      if (activeRecognition === recognition) activeRecognition = null
    }

    try {
      recognition.start()
    } catch (error) {
      console.error(error)
      button.disabled = false
      button.textContent = '🎤 メモへ音声追記'
      status.textContent = '音声入力を開始できませんでした'
      activeRecognition = null
    }
  })

  wrapper.append(button, status)
  field.insertAdjacentElement('afterend', wrapper)
}

function scanMemoFields() {
  findMemoFields().forEach(addVoiceButton)
}

function startObserver() {
  scanMemoFields()
  const observer = new MutationObserver(() => scanMemoFields())
  observer.observe(document.documentElement, { childList: true, subtree: true })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startObserver, { once: true })
} else {
  startObserver()
}
`

const styles = `/* ${marker} */
.measurementMemoVoiceWrapV2{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:7px}
.measurementMemoVoiceButtonV2{min-height:40px;padding:8px 12px;border:1px solid rgba(39,111,203,.34);border-radius:10px;background:rgba(39,111,203,.08);color:inherit;font:inherit;font-weight:850;cursor:pointer}
.measurementMemoVoiceButtonV2:disabled{opacity:.72;cursor:default}
.measurementMemoVoiceStatusV2{font-size:13px;line-height:1.4;opacity:.82}
@media(max-width:620px){.measurementMemoVoiceButtonV2{min-height:44px}.measurementMemoVoiceWrapV2{align-items:stretch}.measurementMemoVoiceStatusV2{width:100%}}
`

try {
  app = app.replace(importRegex, match => `${match}\nimport './measurementMemoVoice' // ${marker}`)
  fs.writeFileSync(enhancerPath, enhancer, 'utf8')
  fs.writeFileSync(cssPath, styles, 'utf8')
  fs.writeFileSync(appPath, app, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 採寸メモ音声追記V2を追加し、ビルド成功を確認しました。')
  console.log('  - React JSXのメモ欄は直接書き換えていません')
  console.log('  - 「メモ」ラベルの入力欄だけにボタンを追加')
  console.log('  - 現場メモは対象外')
  console.log('  - 既存メモへ全角スペース区切りで追記')
  console.log('BACKUP: ' + backup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backup)) fs.copyFileSync(backup, appPath)
  if (fs.existsSync(enhancerPath)) fs.unlinkSync(enhancerPath)
  if (fs.existsSync(cssPath)) fs.unlinkSync(cssPath)
  process.exit(1)
}
