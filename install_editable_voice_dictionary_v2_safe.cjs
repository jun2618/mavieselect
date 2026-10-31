const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const memoPath = path.join(root, 'src', 'measurementMemoVoice.js')
const modulePath = path.join(root, 'src', 'voiceCorrectionDictionary.js')
const cssPath = path.join(root, 'src', 'voiceCorrectionDictionary.css')
const appBackup = appPath + '.before-editable-voice-dictionary-v2'
const memoBackup = memoPath + '.before-editable-voice-dictionary-v2'
const marker = 'M-CROSS_EDITABLE_VOICE_DICTIONARY_V2_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if (!fs.existsSync(memoPath)) fail('src/measurementMemoVoice.js が見つかりません。')
if (fs.existsSync(modulePath) || fs.existsSync(cssPath)) fail('音声辞書モジュールが既に存在します。勝手に上書きしません。')

let app = fs.readFileSync(appPath, 'utf8')
let memo = fs.readFileSync(memoPath, 'utf8')
if (app.includes(marker) || memo.includes(marker)) {
  console.log('SKIP: 編集可能な音声辞書V2は適用済みです。')
  process.exit(0)
}

const memoCssImport = "import './measurementMemoVoice.css'"
const memoResultOld = `      const transcript = correctMCrossVoiceText(event.results?.[0]?.[0]?.transcript || '')
      appendTranscript(field, transcript)
      status.textContent = transcript ? '✓ メモへ追記しました' : '音声を認識できませんでした'`
const otherResultOld = `        const transcript = correctOtherWorkVoiceText(event.results?.[0]?.[0]?.transcript || '')
        applyOtherWorkVoiceText(transcript)`

if (!memo.includes(memoCssImport)) fail('measurementMemoVoice.css のimportが見つかりません。')
if (!memo.includes(memoResultOld)) fail('採寸メモの認識結果処理が見つかりません。変更していません。')
if (!app.includes(otherResultOld)) fail('その他工事の認識結果処理が見つかりません。変更していません。')

fs.copyFileSync(appPath, appBackup)
fs.copyFileSync(memoPath, memoBackup)

const moduleCode = `/* ${marker} */
import './voiceCorrectionDictionary.css'

const STORAGE_KEY = 'mcross:voice-correction-dictionary:v1'

function readItems() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value.filter(item => item && item.from && item.to) : []
  } catch {
    return []
  }
}

function writeItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('mcross-voice-dictionary-changed'))
}

export function applyUserVoiceCorrections(value) {
  let text = String(value || '').trim()
  for (const item of readItems()) text = text.split(item.from).join(item.to)
  return text
}

function closeDialog(root) {
  root?.remove()
  document.body.style.overflow = root?.dataset.previousOverflow || ''
}

function createDialog(title) {
  const root = document.createElement('div')
  root.className = 'voiceDictionaryBackdrop'
  root.dataset.previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  root.innerHTML = '<section class="voiceDictionaryPanel" role="dialog" aria-modal="true"><div class="voiceDictionaryHeader"><strong></strong><button type="button" aria-label="閉じる">×</button></div><div class="voiceDictionaryBody"></div></section>'
  root.querySelector('.voiceDictionaryHeader strong').textContent = title
  root.querySelector('.voiceDictionaryHeader button').addEventListener('click', () => closeDialog(root))
  root.addEventListener('click', event => { if (event.target === root) closeDialog(root) })
  document.body.appendChild(root)
  return root
}

export function openVoiceRecognitionReview({ rawText, suggestedText, onApply }) {
  const raw = String(rawText || '').trim()
  const suggested = applyUserVoiceCorrections(String(suggestedText || raw).trim())
  const root = createDialog('音声認識結果を確認')
  const body = root.querySelector('.voiceDictionaryBody')
  body.innerHTML = '<label><span>認識された言葉</span><input class="voiceRaw" readonly></label><label><span>実際に使う言葉</span><textarea class="voiceCorrected" rows="3"></textarea></label><label class="voiceDictionaryCheck"><input type="checkbox"><span>修正した場合、次回から辞書で自動補正する</span></label><div class="voiceDictionaryActions"><button class="secondary" type="button">辞書を管理</button><button class="secondary cancel" type="button">キャンセル</button><button class="primary" type="button">この内容を使う</button></div>'
  body.querySelector('.voiceRaw').value = raw
  const corrected = body.querySelector('.voiceCorrected')
  corrected.value = suggested
  body.querySelector('.cancel').addEventListener('click', () => closeDialog(root))
  body.querySelector('.voiceDictionaryActions > button').addEventListener('click', () => {
    closeDialog(root)
    openVoiceDictionaryManager()
  })
  body.querySelector('.primary').addEventListener('click', () => {
    const finalText = corrected.value.trim()
    if (!finalText) return
    const shouldRegister = body.querySelector('.voiceDictionaryCheck input').checked
    if (shouldRegister && raw && raw !== finalText) {
      const items = readItems()
      const existing = items.find(item => item.from === raw)
      if (existing) existing.to = finalText
      else items.push({ id: crypto.randomUUID?.() || String(Date.now()), from: raw, to: finalText })
      writeItems(items)
    }
    closeDialog(root)
    onApply?.(finalText)
  })
  corrected.focus({ preventScroll: true })
  corrected.select()
}

export function openVoiceDictionaryManager() {
  const root = createDialog('音声補正辞書')
  const body = root.querySelector('.voiceDictionaryBody')

  const render = () => {
    const items = readItems()
    body.innerHTML = '<p class="voiceDictionaryHelp">誤認識された言葉と、正しい言葉を登録・編集できます。</p><div class="voiceDictionaryList"></div><button class="voiceDictionaryAdd primary" type="button">＋ 単語を登録</button>'
    const list = body.querySelector('.voiceDictionaryList')

    const addRow = (item = { id: '', from: '', to: '' }, isNew = false) => {
      const row = document.createElement('div')
      row.className = 'voiceDictionaryRow'
      row.innerHTML = '<label><span>誤認識</span><input class="from"></label><span class="arrow">→</span><label><span>正しい言葉</span><input class="to"></label><div class="rowActions"><button class="save" type="button">保存</button><button class="delete" type="button">削除</button></div>'
      row.querySelector('.from').value = item.from || ''
      row.querySelector('.to').value = item.to || ''
      row.querySelector('.delete').textContent = isNew ? '取消' : '削除'
      row.querySelector('.save').addEventListener('click', () => {
        const from = row.querySelector('.from').value.trim()
        const to = row.querySelector('.to').value.trim()
        if (!from || !to) return window.alert('誤認識と正しい言葉を入力してください。')
        const next = readItems()
        const target = next.find(value => value.id === item.id || value.from === item.from)
        if (target) { target.from = from; target.to = to }
        else next.push({ id: crypto.randomUUID?.() || String(Date.now()), from, to })
        writeItems(next)
        render()
      })
      row.querySelector('.delete').addEventListener('click', () => {
        if (isNew) return row.remove()
        if (!window.confirm('この辞書項目を削除しますか？')) return
        writeItems(readItems().filter(value => value.id !== item.id))
        render()
      })
      list.appendChild(row)
      if (isNew) row.querySelector('.from').focus()
    }

    items.forEach(item => addRow(item))
    if (!items.length) list.innerHTML = '<p class="voiceDictionaryEmpty">登録された単語はありません。</p>'
    body.querySelector('.voiceDictionaryAdd').addEventListener('click', () => {
      if (list.querySelector('.voiceDictionaryEmpty')) list.innerHTML = ''
      addRow(undefined, true)
    })
  }

  render()
}
`

const styles = `/* ${marker} */
.voiceDictionaryBackdrop{position:fixed;inset:0;z-index:2147483200;display:flex;align-items:flex-start;justify-content:center;padding:12px;background:rgba(0,0,0,.62);box-sizing:border-box;overflow:hidden}
.voiceDictionaryPanel{width:min(720px,100%);max-height:calc(100dvh - 24px);overflow:auto;margin:0;padding:18px;border-radius:18px;background:#fff;color:#172230;box-shadow:0 24px 80px rgba(0,0,0,.38);box-sizing:border-box}
.voiceDictionaryHeader{position:sticky;top:-18px;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:-18px -18px 16px;padding:16px 18px;background:inherit;border-bottom:1px solid rgba(100,120,150,.2)}
.voiceDictionaryHeader strong{font-size:19px}.voiceDictionaryHeader button{width:42px;height:42px;border:0;border-radius:50%;font-size:24px}
.voiceDictionaryBody{display:grid;gap:14px}.voiceDictionaryBody label{display:grid;gap:6px}.voiceDictionaryBody input,.voiceDictionaryBody textarea{width:100%;box-sizing:border-box;font:inherit}
.voiceDictionaryCheck{grid-template-columns:auto 1fr!important;align-items:center}.voiceDictionaryCheck input{width:auto}
.voiceDictionaryActions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}.voiceDictionaryActions button,.voiceDictionaryAdd,.rowActions button{min-height:42px;padding:9px 14px;border-radius:10px;font-weight:800}.voiceDictionaryActions .primary,.voiceDictionaryAdd,.rowActions .save{border:0;background:#276fcb;color:#fff}.voiceDictionaryActions .secondary,.rowActions .delete{border:1px solid rgba(90,120,170,.3);background:rgba(127,127,127,.08);color:inherit}
.voiceDictionaryList{display:grid;gap:10px}.voiceDictionaryRow{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:8px;padding:12px;border:1px solid rgba(90,120,170,.22);border-radius:12px}.voiceDictionaryRow .arrow{padding-bottom:12px;font-weight:900}.rowActions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px}.voiceDictionaryHelp,.voiceDictionaryEmpty{margin:0;opacity:.78}
.theme-dark .voiceDictionaryPanel,.theme-cyber .voiceDictionaryPanel,.theme-luxury .voiceDictionaryPanel,.theme-retro .voiceDictionaryPanel,.theme-galaxy .voiceDictionaryPanel{background:#101827;color:#f7fbff}
@media(max-width:620px){.voiceDictionaryBackdrop{padding:0}.voiceDictionaryPanel{width:100vw;height:100dvh;max-height:100dvh;border-radius:0;padding:16px}.voiceDictionaryHeader{top:-16px;margin:-16px -16px 14px;padding:14px 16px}.voiceDictionaryRow{grid-template-columns:1fr}.voiceDictionaryRow .arrow{display:none}.voiceDictionaryActions button{flex:1;min-width:120px}}
`

try {
  fs.writeFileSync(modulePath, moduleCode, 'utf8')
  fs.writeFileSync(cssPath, styles, 'utf8')

  memo = memo.replace(
    "import './measurementMemoVoice.css'",
    "import './measurementMemoVoice.css'\nimport { openVoiceRecognitionReview, openVoiceDictionaryManager } from './voiceCorrectionDictionary' // " + marker
  )
  memo = memo.replace(
    memoResultOld,
    `      const rawText = String(event.results?.[0]?.[0]?.transcript || '').trim()
      openVoiceRecognitionReview({
        rawText,
        suggestedText: correctMCrossVoiceText(rawText),
        onApply: finalText => {
          appendTranscript(field, finalText)
          status.textContent = finalText ? '✓ メモへ追記しました' : '音声を認識できませんでした'
          field.dispatchEvent(new Event('blur', { bubbles: true }))
        },
      })`
  )
  // 辞書管理ボタンをメモ音声ボタンの横へ追加。
  const appendNeedle = '  wrapper.append(button, status)'
  if (!memo.includes(appendNeedle)) throw new Error('メモ音声ボタンの追加位置が見つかりません。')
  memo = memo.replace(appendNeedle, `  const dictionaryButton = document.createElement('button')
  dictionaryButton.type = 'button'
  dictionaryButton.className = BUTTON_CLASS
  dictionaryButton.textContent = '📖 音声辞書'
  dictionaryButton.addEventListener('click', openVoiceDictionaryManager)
  wrapper.append(button, dictionaryButton, status)`)

  app = app.replace(
    /^import .*['"]\.\/App\.css['"]\s*$/m,
    match => match + "\nimport { openVoiceRecognitionReview, applyUserVoiceCorrections } from './voiceCorrectionDictionary' // " + marker
  )
  app = app.replace(
    otherResultOld,
    `        const rawText = String(event.results?.[0]?.[0]?.transcript || '').trim()
        openVoiceRecognitionReview({
          rawText,
          suggestedText: applyUserVoiceCorrections(correctOtherWorkVoiceText(rawText)),
          onApply: finalText => applyOtherWorkVoiceText(finalText),
        })`
  )

  fs.writeFileSync(memoPath, memo, 'utf8')
  fs.writeFileSync(appPath, app, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 修正時に登録できる音声辞書V2を追加し、ビルド成功を確認しました。')
  console.log('  - 認識結果を確認・修正して使用')
  console.log('  - チェック時は次回から自動補正')
  console.log('  - 音声辞書で追加・編集・削除')
  console.log('  - 採寸メモとその他工事の両方へ適用')
  console.log('BACKUP: ' + appBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(appBackup)) fs.copyFileSync(appBackup, appPath)
  if (fs.existsSync(memoBackup)) fs.copyFileSync(memoBackup, memoPath)
  if (fs.existsSync(modulePath)) fs.unlinkSync(modulePath)
  if (fs.existsSync(cssPath)) fs.unlinkSync(cssPath)
  process.exit(1)
}
