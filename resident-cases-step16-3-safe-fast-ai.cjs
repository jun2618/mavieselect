const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step16-3-safe-fast-ai-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP16_3_SAFE_FAST_AI */'

if (s.includes(marker)) {
  console.log('STEP16.3 安全・高速化は適用済みです')
  process.exit(0)
}

if (!s.includes('M-CROSS_RESIDENT_STEP16_1_PHONE_PDF_AI')) {
  console.error('STEP16.1が見つかりません。変更しませんでした。')
  process.exit(1)
}

// 1. AIに任せず、元文章から電話番号を確定する関数を追加。
const helperTarget = 'function normalizeResidentCase(value) {'
if (!s.includes(helperTarget)) {
  console.error('共通関数の追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const helperCode = `/* M-CROSS_RESIDENT_STEP16_3_SAFE_FAST_AI */
function extractJapanesePhoneFromSource(value) {
  const source = String(value || '')
    .normalize('NFKC')
    .replace(/[－ー―‐‑‒–—−]/g, '-')

  const labeledLines = source
    .split(/\\r?\\n/)
    .filter(line => /(連絡先|電話番号|電話|TEL)/i.test(line))

  const findPhone = text => {
    const mobile = text.match(/0[789]0[\\s-]*\\d{4}[\\s-]*\\d{4}/)
    if (mobile) return normalizeJapanesePhone(mobile[0])
    const sapporo = text.match(/011[\\s-]*\\d{3}[\\s-]*\\d{4}/)
    if (sapporo) return normalizeJapanesePhone(sapporo[0])
    return ''
  }

  for (const line of labeledLines) {
    const phone = findPhone(line)
    if (phone) return phone
  }

  return findPhone(source)
}

function withResidentAiTimeout(promise, milliseconds = 45000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('AI解析が45秒を超えたため中止しました')), milliseconds)
    }),
  ])
}

`
s = s.replace(helperTarget, helperCode + helperTarget)

// 2. Ollamaへ送る文章を短くし、出力量も制限する。
const analyzerNeedle = `  async function analyzeResidentTextWithOllama(sourceText) {
    const schema = {`
if (!s.includes(analyzerNeedle)) {
  console.error('PDF用Ollama解析関数が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(analyzerNeedle, `  async function analyzeResidentTextWithOllama(sourceText) {
    const safeSourceText = String(sourceText || '').slice(0, 7000)
    const schema = {`)

const sourcePromptNeedle = `        sourceText
      ].join('\\n')}],stream:false,think:false,format:schema,options:{temperature:0}})`
if (!s.includes(sourcePromptNeedle)) {
  console.error('PDF用Ollamaプロンプトが見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(sourcePromptNeedle, `        safeSourceText
      ].join('\\n')}],stream:false,think:false,format:schema,options:{temperature:0,num_predict:220,num_ctx:8192}})`)

const fetchNeedle = `    const response = await fetch('http://localhost:11434/api/chat', {`
const fetchReplacement = `    const response = await withResidentAiTimeout(fetch('http://localhost:11434/api/chat', {`
if (!s.includes(fetchNeedle)) {
  console.error('PDF用Ollama fetchが見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(fetchNeedle, fetchReplacement)

const fetchCloseNeedle = `    })
    if (!response.ok) throw new Error('Ollama HTTP ' + response.status)`
if (!s.includes(fetchCloseNeedle)) {
  console.error('PDF用Ollama fetch終了位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(fetchCloseNeedle, `    }), 45000)
    if (!response.ok) throw new Error('Ollama HTTP ' + response.status)`)

// 3. AIの電話番号を採用せず、必ず本文に実在する電話番号を採用。
const phoneMergeNeedle = `        parsed.residentContact = normalizeJapanesePhone(aiParsed.residentContact || parsed.residentContact)`
if (!s.includes(phoneMergeNeedle)) {
  console.error('PDF AI電話番号の反映位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(phoneMergeNeedle, `        parsed.residentContact = extractJapanesePhoneFromSource(extractedText)
          || normalizeJapanesePhone(parsed.residentContact || '')`)

// 4. 手動依頼文のAI解析も、本文の電話番号を最優先。
const previewContactNeedle = `        residentContact: normalizeJapanesePhone(parsed.residentContact || ''),`
if (!s.includes(previewContactNeedle)) {
  console.error('簡単入力AIの電話番号反映位置が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(previewContactNeedle, `        residentContact: extractJapanesePhoneFromSource(sourceText)
          || normalizeJapanesePhone(parsed.residentContact || ''),`)

// 5. 画像だけのPDFでは読込中表示を確実に終了。
const emptyPdfNeedle = `      if (!extractedText.trim()) {
        setResidentQuickError('PDFから文字を読み取れませんでした。画像だけのPDFは依頼文へ手入力してください。')
        setShowResidentQuickPaste(true)
        return
      }`
if (s.includes(emptyPdfNeedle)) {
  s = s.replace(emptyPdfNeedle, `      if (!extractedText.trim()) {
        setResidentAiStatus('')
        setResidentQuickError('画像だけのPDFはまだOCRできません。PDF画像OCRは次の段階で追加します。')
        setShowResidentQuickPaste(true)
        return
      }`)
}

// 6. 失敗時も解析中表示を消す。
const finallyNeedle = `    } finally {
      setResidentPdfLoading(false)`
if (!s.includes(finallyNeedle)) {
  console.error('PDF取込finallyが見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(finallyNeedle, `    } finally {
      setResidentPdfLoading(false)
      setResidentAiLoading(false)`)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP16.3 安全・高速化 OK')
console.log('電話番号はAI結果ではなく、元文章の連絡先から確定します')
console.log('PDF本文は最大7000文字、AI出力は220トークン、45秒で中止します')
console.log('画像だけのPDFでは解析中表示を終了し、OCR未対応を明示します')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
