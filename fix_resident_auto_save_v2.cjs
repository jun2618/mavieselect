const fs = require('fs')
const path = require('path')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const panelPath = path.join(root, 'src', 'OneDriveSyncPanel.jsx')
const marker = 'M-CROSS_RESIDENT_AUTO_SAVE_V2_DIRTY'
const dirtyKeyLine = "const residentAutoSaveDirtyKey = 'mcross_resident_auto_save_dirty_v1'"

for (const file of [appPath, panelPath]) {
  if (!fs.existsSync(file)) {
    console.error('ERROR: ' + file + ' が見つかりません。M-Crossフォルダで実行してください。')
    process.exit(1)
  }
}

let app = fs.readFileSync(appPath, 'utf8')
let panel = fs.readFileSync(panelPath, 'utf8')

if (app.includes(marker) || panel.includes(marker)) {
  console.log('SKIP: 自動保存V2はすでに適用済みです。')
  process.exit(0)
}
if (!app.includes('M-CROSS_RESIDENT_AUTO_SAVE_V1') || !panel.includes('M-CROSS_RESIDENT_AUTO_SAVE_V1')) {
  console.error('ERROR: 先に自動保存V1を適用してください。ファイルは変更していません。')
  process.exit(1)
}

fs.copyFileSync(appPath, appPath + '.before-resident-auto-save-v2')
fs.copyFileSync(panelPath, panelPath + '.before-resident-auto-save-v2')

// App.jsx: OneDriveSyncPanelが一時的に画面から外れていても変更を失わないよう、未送信フラグを残す。
const appNeedle = `    /* M-CROSS_RESIDENT_AUTO_SAVE_V1 */
    window.dispatchEvent(new CustomEvent('mcross:resident-cases-saved', {`
const appReplacement = `    /* ${marker} */
    localStorage.setItem('mcross_resident_auto_save_dirty_v1', new Date().toISOString())
    /* M-CROSS_RESIDENT_AUTO_SAVE_V1 */
    window.dispatchEvent(new CustomEvent('mcross:resident-cases-saved', {`
if (!app.includes(appNeedle)) {
  console.error('ERROR: App.jsxの自動保存イベント箇所が見つかりません。ファイルは変更していません。')
  process.exit(1)
}
app = app.replace(appNeedle, appReplacement)

// Panel: dirty keyを追加。
const keyNeedle = `const residentAutoSaveDelay = 2500`
if (!panel.includes(keyNeedle)) {
  console.error('ERROR: residentAutoSaveDelayが見つかりません。ファイルは変更していません。')
  process.exit(1)
}
panel = panel.replace(keyNeedle, `${keyNeedle}
${dirtyKeyLine}`)

// アップロード成功時だけ未送信フラグを削除。
const successNeedle = `      setCloudBackup(payload)
      setResidentAutoStatus('☁ 入居中案件 ' + localCases.length + '件 OneDrive保存済み')`
const successReplacement = `      localStorage.removeItem(residentAutoSaveDirtyKey)
      setCloudBackup(payload)
      setResidentAutoStatus('☁ 入居中案件 ' + localCases.length + '件 OneDrive保存済み')`
if (!panel.includes(successNeedle)) {
  console.error('ERROR: 自動保存成功箇所が見つかりません。ファイルは変更していません。')
  process.exit(1)
}
panel = panel.replace(successNeedle, successReplacement)

// Panelが再表示されたとき、未送信変更があれば自動送信する。
const effectNeedle = `  useEffect(() => {
    function handleResidentCasesSaved() {`
const effectReplacement = `  useEffect(() => {
    function scheduleResidentAutoSave() {
      if (localStorage.getItem(residentPcMasterKey) !== 'true') return
      window.clearTimeout(residentAutoTimerRef.current)
      setResidentAutoStatus('入居中案件の変更を保存待ち…')
      residentAutoTimerRef.current = window.setTimeout(autoUploadResidentCases, residentAutoSaveDelay)
    }

    function handleResidentCasesSaved() {`
if (!panel.includes(effectNeedle)) {
  console.error('ERROR: 自動保存イベントuseEffectが見つかりません。ファイルは変更していません。')
  process.exit(1)
}
panel = panel.replace(effectNeedle, effectReplacement)

const handlerNeedle = `    function handleResidentCasesSaved() {
      if (localStorage.getItem(residentPcMasterKey) !== 'true') return
      window.clearTimeout(residentAutoTimerRef.current)
      setResidentAutoStatus('入居中案件の変更を保存待ち…')
      residentAutoTimerRef.current = window.setTimeout(autoUploadResidentCases, residentAutoSaveDelay)
    }
    window.addEventListener('mcross:resident-cases-saved', handleResidentCasesSaved)`
const handlerReplacement = `    function handleResidentCasesSaved() {
      scheduleResidentAutoSave()
    }
    window.addEventListener('mcross:resident-cases-saved', handleResidentCasesSaved)

    /* ${marker}: 入居中案件画面から戻ってPanelが再表示された場合も送信する */
    if (localStorage.getItem(residentAutoSaveDirtyKey)) {
      scheduleResidentAutoSave()
    }`
if (!panel.includes(handlerNeedle)) {
  console.error('ERROR: 自動保存ハンドラー本体が見つかりません。ファイルは変更していません。')
  process.exit(1)
}
panel = panel.replace(handlerNeedle, handlerReplacement)

// 手動PC送信成功でもdirtyを消す。
const manualNeedle = `      localStorage.setItem(residentPcMasterKey, 'true')
      setCloudBackup(payload)`
const manualReplacement = `      localStorage.setItem(residentPcMasterKey, 'true')
      localStorage.removeItem(residentAutoSaveDirtyKey)
      setCloudBackup(payload)`
if (!panel.includes(manualNeedle)) {
  console.error('ERROR: 手動PC送信成功箇所が見つかりません。ファイルは変更していません。')
  process.exit(1)
}
panel = panel.replace(manualNeedle, manualReplacement)

fs.writeFileSync(appPath, app, 'utf8')
fs.writeFileSync(panelPath, panel, 'utf8')

console.log('OK: 入居中案件の自動保存V2を適用しました。')
console.log('原因対策: 入居中案件画面で同期パネルが非表示でも未送信フラグを保持します。')
console.log('トップ画面へ戻ると2.5秒後にOneDriveへ自動保存します。')
console.log('NEXT: npm run build')
