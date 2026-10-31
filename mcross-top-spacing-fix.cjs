const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.top-spacing-fix-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_TOP_SPACING_FIX_V1 */'
if (s.includes(marker)) { console.log('トップ画面余白修正は適用済みです'); process.exit(0) }

const navText = '地図・ナビを開く'
const startText = '採寸を開始する →'
const savedText = '保存済み一覧を見る'
const residentText = '入居中案件'
if (![navText,startText,savedText,residentText].every(t => s.includes(t))) { console.error('トップ画面の既知ボタンを確認できません。変更しませんでした。'); process.exit(1) }

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) { console.error('CSS追加位置が見つかりません。変更しませんでした。'); process.exit(1) }

const css = `/* M-CROSS_TOP_SPACING_FIX_V1 */
/* トップ画面の入力ブロックと操作ボタンの縦リズムを揃える */
.main .card > .primary,
.main .card > .secondaryButton,
.main .card > .oneDriveSyncPanel,
.main .card > .residentCasesEntryButton{margin-top:12px!important;margin-bottom:0!important}
.main .card > .primary + .secondaryButton,
.main .card > .secondaryButton + .secondaryButton,
.main .card > .secondaryButton + .oneDriveSyncPanel,
.main .card > .oneDriveSyncPanel + .residentCasesEntryButton,
.main .card > .residentCasesEntryButton + .secondaryButton{margin-top:10px!important}
/* 地図ボタンのあとに号室見出しが食い込まないよう余白を確保 */
.main .card > button.primary + label,
.main .card > button.secondaryButton + label,
.main .card > button + .fieldLabel,
.main .card > button + h2,
.main .card > button + h3{margin-top:22px!important}
/* 現場メモ後の検索ボタンと採寸開始を少し分離 */
.main .card textarea + small{display:block;margin-top:7px}
.main .card .similarSitesButton{margin-top:14px!important;margin-bottom:6px!important}
/* OneDrive自身の外側余白は親側で管理 */
.main .card > .oneDriveSyncPanel{margin-bottom:0!important}
@media(max-width:620px){
  .main .card > .primary,
  .main .card > .secondaryButton,
  .main .card > .oneDriveSyncPanel,
  .main .card > .residentCasesEntryButton{margin-top:10px!important}
  .main .card > button.primary + label,
  .main .card > button.secondaryButton + label{margin-top:20px!important}
}
`
s = s.replace(styleAnchor, css + '\n' + styleAnchor)
fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('トップ画面余白修正 OK')
console.log('ボタン間隔を統一し、地図ボタンと号室、検索と採寸開始の間隔を調整しました')
console.log('機能ロジックは変更していません')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
