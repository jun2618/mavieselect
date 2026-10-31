const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-step4b-backup'

let s = fs.readFileSync(file, 'utf8')

const marker = '/* M-CROSS_CF_MATERIAL_STEP4B */'

if (s.includes(marker)) {
  console.log('STEP4-Bはすでに適用済みです')
  process.exit(0)
}

const start = s.indexOf('title="CF"')

if (start === -1) {
  console.error('CFのLengthMeasurementPageが見つかりません。変更しませんでした。')
  process.exit(1)
}

const target = '                setRecords={setCfRecords}'

const targetPos = s.indexOf(target, start)

if (targetPos === -1) {
  console.error('CFのsetRecordsが見つかりません。変更しませんでした。')
  process.exit(1)
}

/*
  次のLengthMeasurementPage等へ誤って入れないため、
  title="CF" から800文字以内だけを対象にする
*/
if (targetPos - start > 800) {
  console.error('CF画面から離れすぎた位置にsetRecordsが見つかりました。変更しませんでした。')
  process.exit(1)
}

const replacement = `                setRecords={setCfRecords}
                materialGroups={cfMaterialGroups}
                setMaterialGroups={setCfMaterialGroups}
                onMaterialGroupsChanged={markUnsaved}
                ${marker}`

fs.copyFileSync(file, backup)

s =
  s.slice(0, targetPos) +
  replacement +
  s.slice(targetPos + target.length)

fs.writeFileSync(file, s, 'utf8')

console.log('STEP4-B OK')
console.log('CF画面へcfMaterialGroupsを渡しました')
console.log('バックアップ:', backup)