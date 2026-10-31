const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const dictPath = path.join(root, 'src', 'voiceCorrectionDictionary.js')
const backup = dictPath + '.before-spacing-fix-v3'
const marker = 'M-CROSS_VOICE_DICTIONARY_SPACING_FIX_V3_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(dictPath)) fail('src/voiceCorrectionDictionary.js が見つかりません。')
let source = fs.readFileSync(dictPath, 'utf8')
if (source.includes(marker)) { console.log('SKIP: 音声辞書スペース補正V3は適用済みです。'); process.exit(0) }

const oldFunction = `export function applyUserVoiceCorrections(value) {
  let text = String(value || '').trim()
  for (const item of readItems()) text = text.split(item.from).join(item.to)
  return text
}`

if (!source.includes(oldFunction)) fail('現在のユーザー辞書適用関数が見つかりません。変更していません。')
fs.copyFileSync(dictPath, backup)

const newFunction = `/* ${marker} */
function normalizeVoiceKey(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('ja')
    .replace(/[\\s　、，,。・]+/g, '')
    .trim()
}

export function applyUserVoiceCorrections(value) {
  let text = String(value || '').trim()
  const items = readItems()

  // まず従来どおり完全一致・部分一致で置換する。
  for (const item of items) {
    if (item?.from) text = text.split(String(item.from)).join(String(item.to || ''))
  }

  // 音声認識が「貼り 覗く」のように空白を挟んでも、
  // 辞書の「貼り覗く」と同じ語として扱う。
  const normalizedText = normalizeVoiceKey(text)
  const exact = items.find(item => normalizeVoiceKey(item.from) === normalizedText)
  if (exact) return String(exact.to || '').trim()

  return text
}`

try {
  source = source.replace(oldFunction, newFunction)
  fs.writeFileSync(dictPath, source, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 音声辞書で空白・全角空白・句読点の揺れを無視するV3を適用しました。')
  console.log('例: 「貼り 覗く」も辞書「貼り覗く」と一致します。')
  console.log('BACKUP: ' + backup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backup)) fs.copyFileSync(backup, dictPath)
  process.exit(1)
}
