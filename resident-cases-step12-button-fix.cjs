const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step12-button-fix-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP12_BUTTON_FIX_V1 */'
if (s.includes(marker)) { console.log('簡単入力ボタン修正は適用済みです'); process.exit(0) }
if (!s.includes('showResidentQuickPaste')) { console.error('STEP12本体が見つかりません。変更しませんでした。'); process.exit(1) }
const importButton = `<button className="secondaryButton residentImportButton" type="button" onClick={() => residentExcelInputRef.current?.click()}>📥 Excelから取り込む</button>`
if (!s.includes(importButton)) { console.error('Excel取込ボタンが見つかりません。変更しませんでした。'); process.exit(1) }
const quickButton = `<button className="secondaryButton residentQuickPasteButton" type="button" onClick={() => {
                      setResidentQuickPasteText('')
                      setResidentQuickPreview(null)
                      setResidentQuickError('')
                      setShowResidentQuickPaste(true)
                    }}>📋 依頼文から簡単入力</button>`
// 既にボタンがある場合は重複させない
if (!s.includes('>📋 依頼文から簡単入力</button>')) {
  s = s.replace(importButton, importButton + '\n                    ' + quickButton)
}
s = s.replace('/* M-CROSS_RESIDENT_CASES_STEP12_QUICK_PASTE_STYLE */', `${marker}\n/* M-CROSS_RESIDENT_CASES_STEP12_QUICK_PASTE_STYLE */`)
fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('簡単入力ボタン修正 OK')
console.log('「Excelから取り込む」の横/下に「依頼文から簡単入力」を表示します')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
