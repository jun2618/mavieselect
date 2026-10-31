const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const dictPath = path.join(root, 'src', 'voiceCorrectionDictionary.js')
const backup = dictPath + '.before-variants-v4'
const marker = 'M-CROSS_VOICE_DICTIONARY_VARIANTS_V4_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(dictPath)) fail('src/voiceCorrectionDictionary.js が見つかりません。')
let source = fs.readFileSync(dictPath, 'utf8')
if (source.includes(marker)) { console.log('SKIP: 音声辞書表記揺れV4は適用済みです。'); process.exit(0) }

const functionRegex = /export function applyUserVoiceCorrections\(value\) \{[\s\S]*?\n\}/
const match = source.match(functionRegex)
if (!match) fail('applyUserVoiceCorrections関数が見つかりません。変更していません。')
fs.copyFileSync(dictPath, backup)

const replacement = `/* ${marker} */
function makeVoiceVariants(value) {
  const base = normalizeVoiceKey(value)
  const variants = new Set([base])
  const swaps = [
    ['覗く', '除く'], ['のぞく', '除く'], ['除く', '覗く'],
    ['貼り', '針'], ['針', '貼り'], ['貼り', '梁'], ['針', '梁'], ['梁', '貼り'],
  ]
  for (const [from, to] of swaps) {
    if (base.includes(from)) variants.add(base.split(from).join(to))
  }
  return variants
}

export function applyUserVoiceCorrections(value) {
  let text = String(value || '').trim()
  const items = readItems()
  const inputVariants = makeVoiceVariants(text)

  // 完全一致、空白違い、漢字・ひらがなの揺れを同じ候補として照合。
  const matched = items.find(item => {
    const registeredVariants = makeVoiceVariants(item.from)
    return [...inputVariants].some(candidate => registeredVariants.has(candidate))
  })
  if (matched) return String(matched.to || '').trim()

  // 長い文章内に登録語が含まれる場合も、空白を詰めた形で補正する。
  for (const item of items) {
    const fromKey = normalizeVoiceKey(item.from)
    if (!fromKey) continue
    const normalizedText = normalizeVoiceKey(text)
    if (normalizedText === fromKey) return String(item.to || '').trim()
  }
  return text
}`

try {
  source = source.replace(functionRegex, replacement)
  fs.writeFileSync(dictPath, source, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 音声辞書の表記揺れ吸収V4を適用し、ビルド成功を確認しました。')
  console.log('例: 貼り覗く / 貼り 除く / 針覗く / 梁覗く を同系候補として照合します。')
  console.log('BACKUP: ' + backup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backup)) fs.copyFileSync(backup, dictPath)
  process.exit(1)
}
