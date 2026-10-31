const fs = require('fs')
const file = './src/App.jsx'
const backup = './src/App.jsx.pc-app-layout-backup'
if (!fs.existsSync(file)) { console.error('src/App.jsxが見つかりません。'); process.exit(1) }
let s = fs.readFileSync(file, 'utf8')
const marker = '/* M-CROSS_STEP18_PC_APP_LAYOUT */'
if (s.includes(marker)) { console.log('STEP18 PCアプリレイアウトは適用済みです'); process.exit(0) }

const styleAnchor = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */'
if (!s.includes(styleAnchor)) { console.error('CSS追加位置が見つかりません。変更しませんでした。'); process.exit(1) }

// Pure CSS desktop transformation: preserve mobile behavior and existing JSX logic.
const css = `/* M-CROSS_STEP18_PC_APP_LAYOUT */
@media (min-width: 980px) {
  body{background:#eef1f6}
  #root{min-height:100vh}
  .app{min-height:100vh;background:transparent}
  .app>header,.app>.header,.topHeader{max-width:none!important}
  .main{width:min(1480px,calc(100vw - 72px))!important;max-width:none!important;margin:0 auto!important;padding:28px 0 46px!important}
  .main>.card{max-width:none!important;border-radius:20px!important;box-shadow:0 12px 34px rgba(32,47,72,.10)!important}

  /* Top/new-property screen: use horizontal desktop space instead of a phone column. */
  .main>.card:not(.residentCaseDetail):not(.residentCaseFormCard):not(.residentQuickPasteCard){padding:28px!important}
  .main>.card>label{max-width:none}
  .main>.card input,.main>.card select,.main>.card textarea{font-size:15px}
  .main>.card>.primary,.main>.card>.secondaryButton,.main>.card>.residentCasesEntryButton{min-height:48px}

  /* Resident-case dashboard becomes a real desktop workspace. */
  .residentCasesHome{width:min(1540px,calc(100vw - 64px));margin:0 auto;gap:16px}
  .residentCasesTopbar{position:sticky;top:8px;z-index:20;padding:10px 14px;border:1px solid rgba(100,120,150,.18);border-radius:16px;background:rgba(250,250,252,.94);backdrop-filter:blur(12px);box-shadow:0 8px 24px rgba(30,50,80,.08)}
  .residentImportActions{display:flex!important;flex-wrap:wrap;justify-content:flex-end;gap:8px!important}
  .residentImportActions button{width:auto!important;min-width:170px}
  .residentOverallCounts{grid-template-columns:repeat(4,minmax(150px,1fr))!important}
  .residentDashboardGrid{grid-template-columns:repeat(6,minmax(120px,1fr))!important}
  .residentCaseSearchBar{grid-template-columns:minmax(320px,1fr) auto!important}

  /* Give lists a desktop density and avoid giant full-width phone cards. */
  .residentCaseList{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px!important}
  .residentCaseCard{min-height:150px;padding:16px 18px!important}
  .residentCaseCardTop>strong{font-size:17px!important}

  /* Detail acts like a desktop application window. */
  .residentCaseDetailPage{padding:24px max(28px,calc((100vw - 1240px)/2))!important;background:#eef1f6!important}
  .residentCaseDetailPage>.residentCaseDetail{min-height:calc(100vh - 48px)!important;padding:24px!important;border-radius:20px!important;box-shadow:0 20px 55px rgba(25,40,65,.16)!important}
  .residentCaseDetailGrid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  .residentQuickActions{grid-template-columns:repeat(4,minmax(0,1fr))!important}
  .residentVisitDateRow{grid-template-columns:minmax(190px,1.5fr) minmax(120px,.8fr) minmax(120px,.8fr)!important}

  /* Settings and saved views should feel like desktop panels too. */
  .settingsMain{width:min(1260px,calc(100vw - 72px))!important;max-width:none!important}
  .settingsMain>.card{padding:26px!important}

  .theme-dark .residentCasesTopbar,.theme-cyber .residentCasesTopbar,.theme-luxury .residentCasesTopbar,.theme-retro .residentCasesTopbar,.theme-galaxy .residentCasesTopbar{background:rgba(7,14,27,.94)}
  .theme-dark .residentCaseDetailPage,.theme-cyber .residentCaseDetailPage,.theme-luxury .residentCaseDetailPage,.theme-retro .residentCaseDetailPage,.theme-galaxy .residentCaseDetailPage{background:#050b14!important}
}

@media (min-width: 1280px) {
  .main{width:min(1560px,calc(100vw - 96px))!important}
  .residentCasesHome{width:min(1600px,calc(100vw - 96px))}
  .residentCaseList{grid-template-columns:repeat(3,minmax(0,1fr))}
}
`

s = s.replace(styleAnchor, css + '\n' + styleAnchor)
fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')
console.log('STEP18 PCアプリレイアウト OK')
console.log('980px以上のみPC向けレイアウトに切り替えます')
console.log('スマホ表示・機能ロジックは変更していません')
console.log('入居中案件はPCで2〜3列、詳細は広いデスクトップ画面になります')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
