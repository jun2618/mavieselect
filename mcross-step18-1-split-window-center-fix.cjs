const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.pc-split-window-center-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_STEP18_1_SPLIT_WINDOW_CENTER_FIX */'
if (s.includes(marker)) { console.log('PC分割画面中央寄せ修正は適用済みです'); process.exit(0) }
if (!s.includes('/* M-CROSS_STEP18_PC_APP_LAYOUT */')) { console.error('STEP18が見つかりません。変更しませんでした。'); process.exit(1) }
const anchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(anchor)) { console.error('CSS追加位置が見つかりません。'); process.exit(1) }
const css = `/* M-CROSS_STEP18_1_SPLIT_WINDOW_CENTER_FIX */
/* PCフル画面はワイド、Windowsの2分割程度では中央寄せして横スクロールを防ぐ */
@media (min-width:980px) and (max-width:1249px){
  html,body,#root,.app{max-width:100%;overflow-x:hidden!important}
  .main,.settingsMain{width:calc(100% - 32px)!important;max-width:1120px!important;margin-left:auto!important;margin-right:auto!important;padding-left:0!important;padding-right:0!important;box-sizing:border-box!important}
  .main>.card{width:100%!important;max-width:100%!important;box-sizing:border-box!important}
  .residentCasesHome{width:calc(100% - 32px)!important;max-width:1120px!important;margin-left:auto!important;margin-right:auto!important;box-sizing:border-box!important}
  .residentDashboardGrid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  .residentOverallCounts{grid-template-columns:repeat(4,minmax(0,1fr))!important}
  .residentCaseList{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  .residentImportActions button{min-width:0!important}
  .residentCaseSearchBar{grid-template-columns:minmax(0,1fr) auto!important}
}
@media (min-width:980px){
  .main,.residentCasesHome,.settingsMain{left:auto!important;right:auto!important;transform:none!important}
}
`
s=s.replace(anchor,css+'\n'+anchor)
fs.copyFileSync(file,backup)
fs.writeFileSync(file,s,'utf8')
console.log('PC分割画面中央寄せ修正 OK')
console.log('980-1249pxでは左右16px余白で中央配置し、横スクロールを防ぎます')
console.log('フル画面PCとスマホのレイアウトは維持します')
console.log('バックアップ:',backup)
console.log('次に npm run build を実行してください')
