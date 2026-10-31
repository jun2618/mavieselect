const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.step19-button-placement-fix-backup'

if (!fs.existsSync(file)) {
  console.error('src/App.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_STEP19_BUTTON_PLACEMENT_FIX */'

if (s.includes(marker)) {
  console.log('STEP19 ボタン配置修正は適用済みです')
  process.exit(0)
}

if (!s.includes('/* M-CROSS_STEP19_WORK_ORDERS_BASE */')) {
  console.error('STEP19本体が見つかりません。変更しませんでした。')
  process.exit(1)
}

// STEP19で誤った場所へ追加された工事案件ボタンを全て一旦除去。
const misplaced = /\s*<button className="secondaryButton workOrdersEntryButton" type="button" onClick=\{\(\) => setShowWorkOrders\(true\)\}>工事案件<\/button>/g
s = s.replace(misplaced, '')

// トップ画面の residentCasesEntryButton を正確な目印にして、その直後へ追加。
const residentStart = s.indexOf('<button\n                className="secondaryButton residentCasesEntryButton"')
let start = residentStart
if (start === -1) {
  start = s.indexOf('<button className="secondaryButton residentCasesEntryButton"')
}
if (start === -1) {
  console.error('トップ画面の入居中案件ボタンを特定できません。変更しませんでした。')
  process.exit(1)
}

const residentEnd = s.indexOf('</button>', start)
if (residentEnd === -1) {
  console.error('入居中案件ボタンの終了位置を特定できません。変更しませんでした。')
  process.exit(1)
}

const insertAt = residentEnd + '</button>'.length
const workButton = `
              ${marker}
              <button
                className="secondaryButton workOrdersEntryButton"
                type="button"
                onClick={() => setShowWorkOrders(true)}
              >
                工事案件
              </button>`

s = s.slice(0, insertAt) + workButton + s.slice(insertAt)

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP19 ボタン配置修正 OK')
console.log('誤った位置の工事案件ボタンを削除し、トップ画面の入居中案件ボタン直後へ入れ直しました')
console.log('工事案件データ構造と画面本体はそのまま残しています')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
