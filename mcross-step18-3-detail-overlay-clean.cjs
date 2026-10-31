const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.detail-overlay-clean-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_STEP18_3_DETAIL_OVERLAY_CLEAN */'
if (s.includes(marker)) { console.log('STEP18.3は適用済みです'); process.exit(0) }
if (!s.includes('residentCaseDetailPage')) { console.error('案件詳細ページが見つかりません。変更しませんでした。'); process.exit(1) }

// A previous raw JS comment leaked into JSX in the detail view. Hide/remove it safely.
s = s.replace(/\s*\/\* M-CROSS_RESIDENT_CASES_STEP14_DETAIL_PAGE \*\//g, '')

const anchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(anchor)) { console.error('CSS追加位置が見つかりません。'); process.exit(1) }

const css = `/* M-CROSS_STEP18_3_DETAIL_OVERLAY_CLEAN */
/* 案件詳細などの独立ページを、背後の一覧が透けない本当の画面として表示 */
.residentCaseDetailPage{
  position:fixed!important;
  inset:0!important;
  width:100vw!important;
  height:100vh!important;
  max-width:none!important;
  margin:0!important;
  transform:none!important;
  overflow-y:auto!important;
  overflow-x:hidden!important;
  z-index:9999!important;
  background:#eef1f6!important;
  isolation:isolate;
}
.residentCaseDetailPage::before{
  content:'';
  position:fixed;
  inset:0;
  z-index:-1;
  background:#eef1f6;
}
.residentCaseDetailPage>.residentCaseDetail{
  width:min(1120px,calc(100vw - 48px))!important;
  max-width:1120px!important;
  margin:0 auto!important;
}
.theme-dark .residentCaseDetailPage,
.theme-cyber .residentCaseDetailPage,
.theme-luxury .residentCaseDetailPage,
.theme-retro .residentCaseDetailPage,
.theme-galaxy .residentCaseDetailPage,
.theme-dark .residentCaseDetailPage::before,
.theme-cyber .residentCaseDetailPage::before,
.theme-luxury .residentCaseDetailPage::before,
.theme-retro .residentCaseDetailPage::before,
.theme-galaxy .residentCaseDetailPage::before{background:#050b14!important}
@media(max-width:620px){
  .residentCaseDetailPage>.residentCaseDetail{width:calc(100vw - 20px)!important;margin:0 auto!important}
}
`
s=s.replace(anchor,css+'\n'+anchor)
fs.copyFileSync(file,backup)
fs.writeFileSync(file,s,'utf8')
console.log('STEP18.3 詳細ページ背景修正 OK')
console.log('案件詳細を完全な不透明フルスクリーン層にして、左右の案件一覧が見えないようにしました')
console.log('画面に出ていたSTEP14コメントも除去します')
console.log('バックアップ:',backup)
console.log('次に npm run build を実行してください')
