/* M-CROSS_EDITABLE_VOICE_DICTIONARY_V2_SAFE */
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
