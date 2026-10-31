const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step16-1-phone-pdf-ai-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP16_1_PHONE_PDF_AI */'
if (s.includes(marker)) { console.log('STEP16.1は適用済みです'); process.exit(0) }
if (!s.includes('M-CROSS_RESIDENT_STEP16_OLLAMA_AI')) { console.error('STEP16が見つかりません。変更しませんでした。'); process.exit(1) }
if (!s.includes('M-CROSS_RESIDENT_CASES_STEP15_PDF_IMPORT')) { console.error('STEP15が見つかりません。変更しませんでした。'); process.exit(1) }

// 1) Phone normalizer
const helperTarget = 'function normalizeResidentCase(value) {'
if (!s.includes(helperTarget)) { console.error('共通関数位置が見つかりません。'); process.exit(1) }
const helper = `/* M-CROSS_RESIDENT_STEP16_1_PHONE_PDF_AI */
function normalizeJapanesePhone(value) {
  let digits = String(value || '').normalize('NFKC').replace(/[^0-9+]/g, '')
  if (digits.startsWith('+81')) digits = '0' + digits.slice(3)
  digits = digits.replace(/[^0-9]/g, '')
  if (/^0[789]0\\d{8}$/.test(digits)) return digits.slice(0,3) + '-' + digits.slice(3,7) + '-' + digits.slice(7)
  if (/^011\\d{7}$/.test(digits)) return digits.slice(0,3) + '-' + digits.slice(3,6) + '-' + digits.slice(6)
  if (/^0\\d{9,10}$/.test(digits)) return digits
  return String(value || '').trim()
}

`
s = s.replace(helperTarget, helper + helperTarget)

// Normalize stored form on normalizeResidentCase.
const contactLine = "    residentContact: source.residentContact || '',"
if (!s.includes(contactLine)) { console.error('residentContact項目が見つかりません。'); process.exit(1) }
s = s.replace(contactLine, "    residentContact: normalizeJapanesePhone(source.residentContact || ''),")

// Normalize AI preview phone.
const aiContact = "        residentContact: parsed.residentContact || '',"
if (!s.includes(aiContact)) { console.error('AI解析の電話番号位置が見つかりません。'); process.exit(1) }
s = s.replace(aiContact, "        residentContact: normalizeJapanesePhone(parsed.residentContact || ''),")

// Normalize quick-preview direct registrations too.
s = s.replaceAll("residentContact: parsed.residentContact || '',", "residentContact: normalizeJapanesePhone(parsed.residentContact || ''),")

// 2) PDF import: after extraction, automatically ask Ollama when text exists.
const parsedBlock = `      const orderParsed = parseResidentOrderPdfText(extractedText, mergedPropertyMaster, fileValue.name || '')
      const genericParsed = parseResidentRequestText(extractedText, mergedPropertyMaster)`
if (!s.includes(parsedBlock)) { console.error('PDF解析ブロックが見つかりません。'); process.exit(1) }

const upgraded = `      // まず従来解析を行い、その後ローカルAI解析で補正します。
      const orderParsed = parseResidentOrderPdfText(extractedText, mergedPropertyMaster, fileValue.name || '')
      const genericParsed = parseResidentRequestText(extractedText, mergedPropertyMaster)`
s = s.replace(parsedBlock, upgraded)

// Add reusable Ollama analyzer for arbitrary PDF text, before importResidentCasePdf.
const pdfFnTarget = '  async function importResidentCasePdf(fileValue) {'
if (!s.includes(pdfFnTarget)) { console.error('PDF取込関数が見つかりません。'); process.exit(1) }
const reusable = `  async function analyzeResidentTextWithOllama(sourceText) {
    const schema = {
      type: 'object',
      properties: {
        company:{type:'string'}, propertyName:{type:'string'}, unit:{type:'string'}, address:{type:'string'},
        residentName:{type:'string'}, residentContact:{type:'string'}, requestDetails:{type:'string'},
        note:{type:'string'}, caution:{type:'string'}, nextAction:{type:'string'},
        priority:{type:'string',enum:['urgent','normal','low']}
      },
      required:['company','propertyName','unit','address','residentName','residentContact','requestDetails','note','caution','nextAction','priority']
    }
    const response = await fetch('http://localhost:11434/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'qwen3:4b',messages:[{role:'user',content:[
        '賃貸住宅の修繕依頼から案件情報を抽出してください。説明は不要です。',
        '参考写真や別物件の記載より依頼対象を優先。不明は空文字。',
        sourceText
      ].join('\\n')}],stream:false,think:false,format:schema,options:{temperature:0}})
    })
    if (!response.ok) throw new Error('Ollama HTTP ' + response.status)
    const payload = await response.json()
    return JSON.parse(payload?.message?.content || payload?.response || '{}')
  }

`
s = s.replace(pdfFnTarget, reusable + pdfFnTarget)

// Insert AI merge just before setResidentQuickPasteText in PDF function.
const setTextNeedle = `      setResidentQuickPasteText(extractedText)
      setResidentQuickPreview({`
if (!s.includes(setTextNeedle)) { console.error('PDF登録前確認位置が見つかりません。'); process.exit(1) }
const aiMerge = `      let aiParsed = null
      try {
        setResidentAiStatus('PDFをローカルAIで解析しています…')
        aiParsed = await analyzeResidentTextWithOllama(extractedText)
      } catch (aiError) {
        console.warn('PDF AI解析をスキップ:', aiError)
      }

      const aiMatchedProperty = aiParsed?.propertyName
        ? [...mergedPropertyMaster.properties].sort((a,b)=>String(b.name||'').length-String(a.name||'').length).find(item => {
            const n = value => String(value||'').normalize('NFKC').replace(/[\\s　・･]+/g,'').replace(/べ/g,'ベ').toLocaleLowerCase('ja')
            const left=n(item.name), right=n(aiParsed.propertyName)
            return left && right && (left===right || left.includes(right) || right.includes(left))
          })
        : null

      if (aiParsed) {
        parsed.company = aiMatchedProperty?.company || aiParsed.company || parsed.company
        parsed.propertyName = aiMatchedProperty?.name || aiParsed.propertyName || parsed.propertyName
        parsed.unit = aiParsed.unit || parsed.unit
        parsed.address = aiMatchedProperty?.address || aiParsed.address || parsed.address
        parsed.residentContact = normalizeJapanesePhone(aiParsed.residentContact || parsed.residentContact)
        parsed.requestDetails = aiParsed.requestDetails || parsed.requestDetails
        parsed.note = [aiParsed.residentName ? '入居者：'+aiParsed.residentName : '', aiParsed.note || '', parsed.note || ''].filter(Boolean).join('\\n')
        parsed.caution = aiParsed.caution || parsed.caution
        parsed.nextAction = aiParsed.nextAction || parsed.nextAction
        parsed.priority = ['urgent','normal','low'].includes(aiParsed.priority) ? aiParsed.priority : parsed.priority
        setResidentAiStatus('PDFのAI解析完了。内容を確認してください。')
      }

      setResidentQuickPasteText(extractedText)
      setResidentQuickPreview({`
s = s.replace(setTextNeedle, aiMerge)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('STEP16.1 電話番号補正 + PDF AI解析 OK')
console.log('090/080/070は3-4-4、011は3-3-4へ補正します')
console.log('文字抽出できるPDFは、自動でOllama解析して登録前確認へ反映します')
console.log('画像だけのPDF OCRは次段階です')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
