const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step15-4-pdf-filename-parser-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP15_4_PDF_FILENAME_PARSER */'
if (s.includes(marker)) { console.log('STEP15.4は適用済みです'); process.exit(0) }

const oldSignature = 'function parseResidentOrderPdfText(rawText, propertyMaster) {'
if (!s.includes(oldSignature)) { console.error('PDF解析関数が見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(oldSignature, `${marker}\nfunction parseResidentOrderPdfText(rawText, propertyMaster, fileName = '') {`)

const compactLine = `  const compact = squash(source)`
if (!s.includes(compactLine)) { console.error('PDF正規化位置が見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(compactLine, `  const compact = squash(source)\n  const compactFileName = squash(fileName)`)

// Replace initial property matching with body + filename matching.
const matchStart = s.indexOf('  let matchedProperty = [...properties]')
const detectedStart = s.indexOf('  // 帳票PDFでは文字間に空白が入るため、空白除去後の文字列から直接物件名を拾う。', matchStart)
if (matchStart === -1 || detectedStart === -1) { console.error('物件照合処理が見つかりません。変更しませんでした。'); process.exit(1) }
const matchCode = `  let matchedProperty = [...properties]
    .sort((a, b) => squash(b.name).length - squash(a.name).length)
    .find(item => {
      const name = squash(item.name)
      if (!name) return false
      return compact.includes(name) || compactFileName.includes(name)
        || compact.includes(name.replace(/ベル/g, 'べル'))
        || compactFileName.includes(name.replace(/ベル/g, 'べル'))
    })

`
s = s.slice(0, matchStart) + matchCode + s.slice(detectedStart)

// Improve detected fallback using filename.
const knownPatternNeedle = `  const knownPatterns = [
    /リバティベル月寒/u,
    /inove[^0-9〒]{2,30}/u,
  ]
  for (const pattern of knownPatterns) {
    const match = compact.match(pattern)`
if (!s.includes(knownPatternNeedle)) { console.error('物件名候補処理が見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(knownPatternNeedle, `  const knownPatterns = [
    /リバティベル月寒/u,
    /inove[^0-9〒]{2,30}/u,
  ]
  for (const pattern of knownPatterns) {
    const match = compactFileName.match(pattern) || compact.match(pattern)`)

// Use filename to get room number first.
const unitNeedle = `  // 今回のハウスメイト形式では「57408 1101 011-...」のように号室が並ぶ。
  let unit = ''`
if (!s.includes(unitNeedle)) { console.error('号室解析位置が見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(unitNeedle, `  // ファイル名の「物件名1101発注書」を最優先し、本文候補を補助に使います。
  let unit = ''
  const fileUnitMatch = compactFileName.match(/(?:[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+-)?([0-9]{3,4})(?:発注書|依頼書|pdf|$)/u)
  if (fileUnitMatch) unit = fileUnitMatch[1]`)

// Avoid overwriting filename unit.
s = s.replace(`  const roomNearPhone = compact.match(/(?:\\d{4,6})(?:[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+-)?(\\d{3,4})011-\\d{3}-\\d{4}/u)
  if (roomNearPhone) unit = roomNearPhone[1]`, `  const roomNearPhone = compact.match(/(?:\\d{4,6})(?:[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+-)?(\\d{3,4})011-\\d{3}-\\d{4}/u)
  if (!unit && roomNearPhone) unit = roomNearPhone[1]`)

// Robust issue detection from phrases visible in extracted PDF.
const hasNeedle = `  const hasDoor = compact.includes('玄関ドア')
  const hasChain = compact.includes('チェーン')
  const hasParts = compact.includes('黒いボッチ') || compact.includes('バネ') || compact.includes('ネジくぎ') || compact.includes('ネジ')`
if (!s.includes(hasNeedle)) { console.error('故障内容判定位置が見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(hasNeedle, `  const hasDoor = compact.includes('玄関ドア') || compact.includes('本日玄関')
  const hasChain = compact.includes('チェーン') || compact.includes('ドアに引掛ける') || compact.includes('ドアに引っ掛ける')
  const hasParts = compact.includes('黒いボッチ') || compact.includes('黒い部品') || compact.includes('バネ') || compact.includes('ネジくぎ') || compact.includes('ネジ')`)

// Pass filename to parser.
const callOld = `      const orderParsed = parseResidentOrderPdfText(extractedText, mergedPropertyMaster)`
const callNew = `      const orderParsed = parseResidentOrderPdfText(extractedText, mergedPropertyMaster, fileValue.name || '')`
if (!s.includes(callOld)) { console.error('PDF解析呼び出しが見つかりません。変更しませんでした。'); process.exit(1) }
s = s.replace(callOld, callNew)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('STEP15.4 PDFファイル名連携解析 OK')
console.log('PDF本文だけでなくファイル名から物件名・号室を判定します')
console.log('ドアチェーン故障文の判定を強化しました')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
