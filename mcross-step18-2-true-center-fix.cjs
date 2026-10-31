const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.pc-true-center-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_STEP18_2_TRUE_CENTER_FIX */'
if (s.includes(marker)) { console.log('STEP18.2は適用済みです'); process.exit(0) }
if (!s.includes('/* M-CROSS_STEP18_PC_APP_LAYOUT */')) { console.error('STEP18が見つかりません。'); process.exit(1) }
const anchor='/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(anchor)) { console.error('CSS追加位置が見つかりません。'); process.exit(1) }
const css=`/* M-CROSS_STEP18_2_TRUE_CENTER_FIX */
/* PCでは親要素の既存オフセットを打ち消し、現在のウィンドウ幅の中央に固定 */
@media (min-width:980px){
  html,body,#root{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;overflow-x:hidden!important}
  #root>.app,.app{width:100%!important;max-width:none!important;margin:0!important;padding-left:0!important;padding-right:0!important;box-sizing:border-box!important}
  .app>.main,.main,.settingsMain{
    position:relative!important;
    left:50%!important;
    right:auto!important;
    transform:translateX(-50%)!important;
    margin-left:0!important;
    margin-right:0!important;
    box-sizing:border-box!important;
  }
}
@media (min-width:980px) and (max-width:1249px){
  .app>.main,.main,.settingsMain{width:calc(100vw - 40px)!important;max-width:1080px!important;padding-left:0!important;padding-right:0!important}
  .residentCasesHome{width:100%!important;max-width:1080px!important;margin-left:auto!important;margin-right:auto!important}
  .main>.card{width:100%!important;max-width:100%!important;margin-left:auto!important;margin-right:auto!important;box-sizing:border-box!important}
}
@media (min-width:1250px){
  .app>.main,.main{width:min(1480px,calc(100vw - 80px))!important}
  .settingsMain{width:min(1260px,calc(100vw - 80px))!important}
}
`
s=s.replace(anchor,css+'\n'+anchor)
fs.copyFileSync(file,backup)
fs.writeFileSync(file,s,'utf8')
console.log('STEP18.2 真ん中固定 OK')
console.log('既存の親要素オフセットを打ち消し、現在のブラウザ/PWAウィンドウ中央を基準に配置します')
console.log('2分割では左右20px程度、フル画面ではワイド表示を維持します')
console.log('バックアップ:',backup)
console.log('次に npm run build を実行してください')
