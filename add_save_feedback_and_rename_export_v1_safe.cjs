const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const cssPath = path.join(root, 'src', 'App.css')
const appBackup = appPath + '.before-save-feedback-v1'
const cssBackup = cssPath + '.before-save-feedback-v1'
const marker = 'M-CROSS_SAVE_FEEDBACK_AND_EXPORT_LABEL_V1_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if (!fs.existsSync(cssPath)) fail('src/App.css が見つかりません。')
let app = fs.readFileSync(appPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')
if (app.includes(marker)) { console.log('SKIP: 保存完了表示V1は適用済みです。'); process.exit(0) }

const saveState = "  const [showEstimate, setShowEstimate] = useState(false)"
const saveButton = '<button className="saveButton" type="button" onClick={saveCurrentData}>保存する</button>'
const exportLabel = '                Excel出力'

if (!app.includes(saveState)) fail('showEstimate stateが見つかりません。変更していません。')
if (!app.includes(saveButton)) fail('保存ボタンが見つかりません。変更していません。')
if (!app.includes(exportLabel)) fail('Excel出力ボタンの文字が見つかりません。変更していません。')

fs.copyFileSync(appPath, appBackup)
fs.copyFileSync(cssPath, cssBackup)
try {
  app = app.replace(saveState, `${saveState}\n  /* ${marker} */\n  const [saveFeedback, setSaveFeedback] = useState('')`)

  const replacement = `<div className="saveActionWithFeedback">
                <button className="saveButton" type="button" onClick={() => {
                  const saved = saveCurrentData()
                  if (saved) {
                    const now = new Date()
                    const time = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                    setSaveFeedback('✓ 保存しました ' + time)
                    window.setTimeout(() => setSaveFeedback(''), 3500)
                  } else {
                    setSaveFeedback('保存できませんでした')
                  }
                }}>保存する</button>
                {saveFeedback && <div className={\`saveFeedbackMessage \${saveFeedback.startsWith('✓') ? 'success' : 'error'}\`} role="status">{saveFeedback}</div>}
              </div>`
  app = app.replace(saveButton, replacement)
  app = app.replace(exportLabel, '                📊 採寸データ出力')

  css += `\n/* ${marker} */\n.saveActionWithFeedback{display:grid;gap:7px}.saveFeedbackMessage{padding:8px 12px;border-radius:10px;font-size:14px;font-weight:800;text-align:center}.saveFeedbackMessage.success{background:rgba(24,145,90,.12);color:#087443}.saveFeedbackMessage.error{background:rgba(200,50,50,.12);color:#b42318}.theme-dark .saveFeedbackMessage.success,.theme-cyber .saveFeedbackMessage.success,.theme-luxury .saveFeedbackMessage.success,.theme-retro .saveFeedbackMessage.success,.theme-galaxy .saveFeedbackMessage.success{color:#8dffc5}.theme-dark .saveFeedbackMessage.error,.theme-cyber .saveFeedbackMessage.error,.theme-luxury .saveFeedbackMessage.error,.theme-retro .saveFeedbackMessage.error,.theme-galaxy .saveFeedbackMessage.error{color:#ffb4ab}\n`

  fs.writeFileSync(appPath, app, 'utf8')
  fs.writeFileSync(cssPath, css, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 保存完了表示と「採寸データ出力」への名称変更を適用し、ビルド成功を確認しました。')
  console.log('BACKUP: ' + appBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(appBackup)) fs.copyFileSync(appBackup, appPath)
  if (fs.existsSync(cssBackup)) fs.copyFileSync(cssBackup, cssPath)
  process.exit(1)
}
