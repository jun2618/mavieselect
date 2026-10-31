const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const cssPath = path.join(root, 'src', 'App.css')
const appBackup = appPath + '.before-new-registration-button-v1'
const cssBackup = cssPath + '.before-new-registration-button-v1'
const marker = 'M-CROSS_NEW_REGISTRATION_BUTTON_V1_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if (!fs.existsSync(cssPath)) fail('src/App.css が見つかりません。')

let app = fs.readFileSync(appPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')

if (app.includes(marker)) {
  console.log('SKIP: 新規登録ボタンV1は適用済みです。')
  process.exit(0)
}

const functionAnchor = '  function startMeasurement() {'
const topAnchor = '            <p className="subtitle">採寸する物件を選択してください。</p>'
const actionAnchor = '            <div className="measurementActions">'

if (!app.includes(functionAnchor)) fail('startMeasurement関数が見つかりません。変更していません。')
if (!app.includes(topAnchor)) fail('トップページの見出し位置が見つかりません。変更していません。')
if (!app.includes(actionAnchor)) fail('編集中画面の操作欄が見つかりません。変更していません。')

fs.copyFileSync(appPath, appBackup)
fs.copyFileSync(cssPath, cssBackup)

try {
  const functions = `  /* ${marker} */
  function resetForNewRegistration() {
    try { localStorage.removeItem(workingDraftKey) } catch {}
    setWorkingDraft(null)
    setShowDraftRecovery(false)
    setStarted(false)
    setShowEstimate(false)
    setShowRoomManagement(false)
    setShowMeasurementCheck(false)
    setCompany('')
    setPropertySearch('')
    setSelectedProperty(null)
    setUnit('')
    setSiteMemo('')
    setCurrentStorageKey('')
    setRecords([])
    setCfRecords([])
    setCfMaterialGroups([])
    setSoftRecords([])
    setFloorTrimRecords([])
    setAdditionalWorks([])
    setMemo('')
    setIsDirty(false)
    setSaveStatus('新規登録を開始できます')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startNewRegistration() {
    if (!started || !isDirty) {
      resetForNewRegistration()
      return
    }

    const saveFirst = window.confirm(
      '現在編集中の内容が保存されていません。\\n\\n' +
      '［OK］保存して終了し、新規登録へ進む\\n' +
      '［キャンセル］保存せず進むか、操作を中止する'
    )

    if (saveFirst) {
      if (!saveCurrentData()) {
        window.alert('保存できなかったため、新規登録へ進みませんでした。')
        return
      }
      resetForNewRegistration()
      return
    }

    const discard = window.confirm(
      '保存せずに新規登録へ進みますか？\\n\\n' +
      '［OK］保存せず新規登録へ進む\\n' +
      '［キャンセル］編集中の画面へ戻る'
    )
    if (discard) resetForNewRegistration()
  }

`
  app = app.replace(functionAnchor, functions + functionAnchor)

  const topButton = `${topAnchor}
            <button className="newRegistrationHeroButton" type="button" onClick={startNewRegistration}>
              <span>＋ 新規で登録する</span>
              <small>新しい物件・号室の採寸を開始</small>
            </button>`
  app = app.replace(topAnchor, topButton)

  const editingButton = `${actionAnchor}
              <button className="newRegistrationInlineButton" type="button" onClick={startNewRegistration}>
                ＋ 新規登録
              </button>`
  app = app.replace(actionAnchor, editingButton)

  css += `
/* ${marker} */
.newRegistrationHeroButton{display:grid;gap:4px;width:100%;margin:16px 0 18px;padding:17px 20px;border:0;border-radius:16px;background:linear-gradient(135deg,#1976d2,#0aa6a6);color:#fff;box-shadow:0 12px 28px rgba(25,118,210,.24);text-align:left;cursor:pointer}
.newRegistrationHeroButton span{font-size:19px;font-weight:900;color:inherit!important}.newRegistrationHeroButton small{font-size:14px!important;color:rgba(255,255,255,.9)!important;opacity:1!important}.newRegistrationHeroButton:hover{transform:translateY(-1px);box-shadow:0 15px 32px rgba(25,118,210,.3)}.newRegistrationHeroButton:focus-visible{outline:3px solid rgba(25,118,210,.35);outline-offset:3px}
.newRegistrationInlineButton{border:2px solid #1976d2!important;background:rgba(25,118,210,.08)!important;color:#1565c0!important;font-weight:900!important}
.theme-dark .newRegistrationInlineButton,.theme-cyber .newRegistrationInlineButton,.theme-luxury .newRegistrationInlineButton,.theme-retro .newRegistrationInlineButton,.theme-galaxy .newRegistrationInlineButton{color:#f7fbff!important;border-color:#33e6ff!important;background:rgba(51,230,255,.1)!important}
@media(max-width:620px){.newRegistrationHeroButton{padding:16px}.newRegistrationHeroButton span{font-size:18px}.newRegistrationInlineButton{width:100%}}
`

  fs.writeFileSync(appPath, app, 'utf8')
  fs.writeFileSync(cssPath, css, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 新規登録ボタンを追加し、ビルド成功を確認しました。')
  console.log('  - トップページに大きな「新規で登録する」ボタン')
  console.log('  - 編集中画面にも「新規登録」ボタン')
  console.log('  - 未保存時は保存／破棄／キャンセルを案内')
  console.log('BACKUP: ' + appBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(appBackup)) fs.copyFileSync(appBackup, appPath)
  if (fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup, cssPath)
  process.exit(1)
}
