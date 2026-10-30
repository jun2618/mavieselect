/* M-CROSS_VOICE_CORRECTION_DICTIONARY_V1_SAFE */
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

/* M-CROSS_MEASUREMENT_MEMO_VOICE_V2_SAFE */
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
      const transcript = correctMCrossVoiceText(event.results?.[0]?.[0]?.transcript || '')
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
