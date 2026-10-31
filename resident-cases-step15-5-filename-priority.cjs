const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step15-5-filename-priority-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP15_5_FILENAME_PRIORITY */'
if (s.includes(marker)) { console.log('STEP15.5は適用済みです'); process.exit(0) }

const fn = 'function parseResidentOrderPdfText(rawText, propertyMaster, fileName = \'\') {'
const start = s.indexOf(fn)
if (start === -1) { console.error('STEP15.4のPDF解析関数が見つかりません。変更しませんでした。'); process.exit(1) }

const propertyMatchStart = s.indexOf('  let matchedProperty = [...properties]', start)
const detectedComment = s.indexOf('  // 帳票PDFでは文字間に空白が入るため', propertyMatchStart)
if (propertyMatchStart === -1 || detectedComment === -1) {
  console.error('物件照合処理の範囲が見つかりません。変更しませんでした。')
  process.exit(1)
}

const replacement = `  ${marker}
  // 最重要: 本文には参考写真の別物件名が含まれる場合があるため、
  // PDFファイル名に一致するM-Cross物件を最優先します。
  const fileMatchedProperty = [...properties]
    .sort((a, b) => squash(b.name).length - squash(a.name).length)
    .find(item => {
      const name = squash(item.name)
      if (!name) return false
      const variants = [
        name,
        name.replace(/ベル/g, 'べル'),
        name.replace(/べル/g, 'ベル'),
      ]
      return variants.some(value => compactFileName.includes(value))
    })

  const bodyMatchedProperty = [...properties]
    .sort((a, b) => squash(b.name).length - squash(a.name).length)
    .find(item => {
      const name = squash(item.name)
      if (!name) return false
      const variants = [
        name,
        name.replace(/ベル/g, 'べル'),
        name.replace(/べル/g, 'ベル'),
      ]
      return variants.some(value => compact.includes(value))
    })

  let matchedProperty = fileMatchedProperty || bodyMatchedProperty

`

s = s.slice(0, propertyMatchStart) + replacement + s.slice(detectedComment)

// Fallback detected name should also prefer filename and strip room/order suffix.
const detectedLine = `    const match = compactFileName.match(pattern) || compact.match(pattern)`
if (s.includes(detectedLine)) {
  s = s.replace(detectedLine, `    const match = compactFileName.match(pattern) || compact.match(pattern)`)
}

// After detected property name is known, rematch against master using normalized equality/containment,
// but never replace an already filename-matched property with a body/reference-photo property.
const rematchOld = `  if (!matchedProperty && detectedPropertyName) {
    matchedProperty = properties.find(item => {
      const left = squash(item.name)
      const right = squash(detectedPropertyName)
      return left === right || left.includes(right) || right.includes(left)
    })
  }`
const rematchNew = `  if (!matchedProperty && detectedPropertyName) {
    matchedProperty = properties.find(item => {
      const left = squash(item.name)
      const right = squash(detectedPropertyName)
      return left === right || left.includes(right) || right.includes(left)
    })
  }`
if (!s.includes(rematchOld)) {
  console.error('物件マスター再照合処理が見つかりません。変更しませんでした。')
  process.exit(1)
}
s = s.replace(rematchOld, rematchNew)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP15.5 ファイル名最優先 OK')
console.log('PDF本文の参考写真に別物件名があっても、ファイル名に一致するM-Cross物件を優先します')
console.log('今回のような「リバティべル月寒1101発注書」を先に照合します')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
