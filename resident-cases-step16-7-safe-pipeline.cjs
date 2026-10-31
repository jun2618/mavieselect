const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step16-7-safe-pipeline-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP16_7_SAFE_PIPELINE */'
if (s.includes(marker)) { console.log('STEP16.7は適用済みです'); process.exit(0) }
if (!s.includes('extractJapanesePhoneFromSource')) { console.error('STEP16.3以降が見つかりません。変更しませんでした。'); process.exit(1) }

// Add evidence extractor: explicitly prefers labels like 今回連絡先TEL over other TELs.
const helperTarget = 'function normalizeResidentCase(value) {'
if (!s.includes(helperTarget)) { console.error('共通関数位置が見つかりません。'); process.exit(1) }
const helper = `${marker}
function extractResidentEvidence(sourceText) {
  const source = String(sourceText || '').normalize('NFKC').replace(/[－ー―‐‑‒–—−]/g, '-')
  const lines = source.split(/\\r?\\n/).map(line => line.trim()).filter(Boolean)
  const phoneFrom = text => {
    const mobile = text.match(/0[789]0[\\s-]*\\d{4}[\\s-]*\\d{4}/)
    if (mobile) return normalizeJapanesePhone(mobile[0])
    const fixed = text.match(/011[\\s-]*\\d{3}[\\s-]*\\d{4}/)
    if (fixed) return normalizeJapanesePhone(fixed[0])
    return ''
  }
  const priorityLabels = ['今回連絡先TEL','今回連絡先','入居者連絡先','入居者TEL','連絡先TEL','連絡先']
  let residentContact = ''
  for (const label of priorityLabels) {
    const index = lines.findIndex(line => line.includes(label))
    if (index < 0) continue
    residentContact = phoneFrom(lines[index]) || phoneFrom(lines[index + 1] || '') || phoneFrom(lines.slice(index, index + 3).join(' '))
    if (residentContact) break
  }
  const requestMarkers = ['障害受付内容','依頼内容','状況']
  let relevantText = ''
  for (const label of requestMarkers) {
    const index = lines.findIndex(line => line.includes(label))
    if (index < 0) continue
    relevantText = lines.slice(index, index + 10).join('\\n')
    if (relevantText.length > 40) break
  }
  return { residentContact, relevantText: relevantText || lines.slice(0, 30).join('\\n') }
}

`
s = s.replace(helperTarget, helper + helperTarget)

// PDF Ollama must receive only relevant excerpt when available.
const safeSource = "    const safeSourceText = String(sourceText || '').slice(0, 3500)"
if (!s.includes(safeSource)) { console.error('AI入力制限位置が見つかりません。'); process.exit(1) }
s = s.replace(safeSource, `    const evidence = extractResidentEvidence(sourceText)
    const safeSourceText = String(evidence.relevantText || sourceText || '').slice(0, 2500)`)

// PDF result phone always comes from explicit evidence, never AI inference or generic first phone.
const phoneAssignRegex = /parsed\.residentContact\s*=\s*extractJapanesePhoneFromSource\(extractedText\)(?:\s*\|\|[^\n]+)?/
if (!phoneAssignRegex.test(s)) { console.error('PDF電話番号反映位置が見つかりません。'); process.exit(1) }
s = s.replace(phoneAssignRegex, `parsed.residentContact = extractResidentEvidence(extractedText).residentContact`)

// Manual text path also prefers evidence labels but falls back to source extraction for simple tests.
const manualContact = `residentContact: extractJapanesePhoneFromSource(sourceText),`
if (s.includes(manualContact)) {
  s = s.replace(manualContact, `residentContact: extractResidentEvidence(sourceText).residentContact || extractJapanesePhoneFromSource(sourceText),`)
}

// Add explicit source-vs-result warning in registration confirmation.
const confirmHeading = '<h3>登録前の確認</h3>'
if (!s.includes(confirmHeading)) { console.error('登録前確認見出しが見つかりません。'); process.exit(1) }
s = s.replace(confirmHeading, `<div className="residentSafetyNotice">⚠ 電話番号・物件・号室は元文章と照らし合わせてから登録してください。AIは候補整理にのみ使用します。</div>
                      ${confirmHeading}`)

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) { console.error('CSS位置が見つかりません。'); process.exit(1) }
const css = `/* M-CROSS_RESIDENT_STEP16_7_SAFE_PIPELINE_STYLE */
.residentSafetyNotice{padding:10px 12px;border:1px solid rgba(205,125,42,.35);border-radius:11px;background:rgba(255,183,72,.11);color:#8b5a16;font-size:12px;font-weight:850;line-height:1.5}.theme-dark .residentSafetyNotice,.theme-cyber .residentSafetyNotice,.theme-luxury .residentSafetyNotice,.theme-retro .residentSafetyNotice,.theme-galaxy .residentSafetyNotice{color:#ffd28a}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('STEP16.7 安全パイプライン OK')
console.log('「今回連絡先TEL」等を最優先し、管理会社TELを誤採用しにくくしました')
console.log('AIへ渡すPDF文章を依頼内容付近の最大2500文字に縮小しました')
console.log('登録前に原文照合警告を常時表示します')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
