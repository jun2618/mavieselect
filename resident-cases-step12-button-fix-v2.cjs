const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.resident-step12-button-fix-v2-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_RESIDENT_STEP12_BUTTON_FIX_V2 */'

if (s.includes(marker)) {
  console.log('簡単入力ボタンV2は適用済みです')
  process.exit(0)
}

if (!s.includes('showResidentQuickPaste')) {
  console.error('STEP12の簡単入力本体が見つかりません。変更しませんでした。')
  process.exit(1)
}

const importButtonText = '📥 Excelから取り込む'
const pos = s.indexOf(importButtonText)
if (pos === -1) {
  console.error('Excelから取り込むボタンが見つかりません。変更しませんでした。')
  process.exit(1)
}

const buttonStart = s.lastIndexOf('<button', pos)
const buttonEnd = s.indexOf('</button>', pos)
if (buttonStart === -1 || buttonEnd === -1) {
  console.error('Excel取込ボタンの範囲を特定できません。変更しませんでした。')
  process.exit(1)
}
const insertAt = buttonEnd + '</button>'.length

// 画面上の同じボタングループに確実に追加する。
const quickButton = `
                    ${marker}
                    <button
                      className="secondaryButton residentQuickPasteButton"
                      type="button"
                      onClick={() => {
                        setResidentQuickPasteText('')
                        setResidentQuickPreview(null)
                        setResidentQuickError('')
                        setShowResidentQuickPaste(true)
                      }}
                    >
                      📋 依頼文から簡単入力
                    </button>`

s = s.slice(0, insertAt) + quickButton + s.slice(insertAt)

// スマホでは3ボタンを縦にして見切れを防止。
const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) {
  console.error('CSS追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

const css = `/* M-CROSS_RESIDENT_STEP12_BUTTON_FIX_V2_STYLE */
.residentImportActions{display:flex;flex-wrap:wrap;gap:8px}.residentImportActions .residentQuickPasteButton{width:auto;margin:0}@media(max-width:620px){.residentCasesTopbar{display:grid;grid-template-columns:1fr}.residentImportActions{display:grid;grid-template-columns:1fr}.residentImportActions .residentNewCaseButton,.residentImportActions .residentImportButton,.residentImportActions .residentQuickPasteButton{width:100%;margin:0}}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('簡単入力ボタンV2 OK')
console.log('Excelから取り込むボタンの直後へ、簡単入力ボタンを強制追加しました')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
