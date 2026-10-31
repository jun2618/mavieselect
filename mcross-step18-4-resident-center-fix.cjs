const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.resident-center-fix-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker='/* M-CROSS_STEP18_4_RESIDENT_CENTER_FIX */'
if (s.includes(marker)) { console.log('STEP18.4は適用済みです'); process.exit(0) }
if (!s.includes('residentCasesHome')) { console.error('入居中案件画面が見つかりません。'); process.exit(1) }
const anchor='/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(anchor)) { console.error('CSS追加位置が見つかりません。'); process.exit(1) }
const css=`/* M-CROSS_STEP18_4_RESIDENT_CENTER_FIX */
@media (min-width:980px){
  /* residentCasesHome had its own width rule, so center the resident workspace independently. */
  .residentCasesHome{
    position:relative!important;
    left:50%!important;
    right:auto!important;
    transform:translateX(-50%)!important;
    margin-left:0!important;
    margin-right:0!important;
    box-sizing:border-box!important;
  }
  .residentQuickPasteCard,
  .residentCaseFormCard{
    width:100%!important;
    max-width:100%!important;
    margin-left:auto!important;
    margin-right:auto!important;
    box-sizing:border-box!important;
  }
}
@media (min-width:980px) and (max-width:1249px){
  .residentCasesHome{width:calc(100vw - 40px)!important;max-width:1080px!important}
}
@media (min-width:1250px){
  .residentCasesHome{width:min(1540px,calc(100vw - 80px))!important;max-width:1540px!important}
}
`
s=s.replace(anchor,css+'\n'+anchor)
fs.copyFileSync(file,backup)
fs.writeFileSync(file,s,'utf8')
console.log('STEP18.4 入居中案件中央固定 OK')
console.log('入居中案件ホームと簡単入力カードをウィンドウ中央基準に揃えます')
console.log('バックアップ:',backup)
console.log('次に npm run build を実行してください')
