const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const viewerPath = path.join(root, 'src', 'estimateSnapshotViewer.js')
const cssPath = path.join(root, 'src', 'estimateSnapshotViewer.css')
const backup = appPath + '.before-estimate-snapshot-viewer-v2'
const marker = 'M-CROSS_ESTIMATE_SNAPSHOT_VIEWER_V2_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if (fs.existsSync(viewerPath) || fs.existsSync(cssPath)) fail('estimateSnapshotViewerのファイルが既に存在します。勝手に上書きしません。')

let app = fs.readFileSync(appPath, 'utf8')
if (app.includes(marker)) { console.log('SKIP: 保存済み見積閲覧V2は適用済みです。'); process.exit(0) }

const appCssImportRegex = /^import .*['"]\.\/App\.css['"]\s*$/m
const clickRegex = /onClick=\{\(\)\s*=>\s*openSavedEntry\(entry\)\}/g
const versionClass = 'savedExplorerFile estimateVersionExplorerFile'
if (!appCssImportRegex.test(app)) fail('App.css importが見つかりません。')
if (!app.includes(versionClass)) fail('保存済み見積ファイル表示が見つかりません。')

// estimateVersionExplorerFile のbutton内だけを限定してクリック処理を探す。
const versionButtonRegex = /<button className="savedExplorerFile estimateVersionExplorerFile"[\s\S]*?<\/button>/g
const versionButtons = app.match(versionButtonRegex) || []
if (versionButtons.length !== 1) fail('保存済み見積ボタンの一致数が ' + versionButtons.length + ' 件です。')
if (!clickRegex.test(versionButtons[0])) fail('保存済み見積ボタンのopenSavedEntry処理が見つかりません。')

fs.copyFileSync(appPath, backup)

const viewerCode = `/* ${marker} */
import './estimateSnapshotViewer.css'

function mark(version) {
  const marks = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
  const number = Number(version) || 0
  return marks[number] || '（' + number + '）'
}
function yen(value) { return '¥' + Number(value || 0).toLocaleString('ja-JP') }
function text(value) { return String(value ?? '') }

export function openEstimateSnapshotViewer({ entry, version, onExport, onCreateRevision }) {
  const old = document.querySelector('.estimateSnapshotBackdropV2')
  if (old) old.remove()

  const root = document.createElement('div')
  root.className = 'estimateSnapshotBackdropV2'
  const previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'

  const panel = document.createElement('section')
  panel.className = 'estimateSnapshotPanelV2'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')

  const title = (entry?.propertyName || '物件名未設定') + (entry?.unit ? entry.unit + '号室' : '') + (entry?.workName || '') + mark(version?.version)
  const rows = Array.isArray(version?.rows) ? version.rows : []
  const additionalWorks = Array.isArray(version?.additionalWorks) ? version.additionalWorks : []

  const close = () => { root.remove(); document.body.style.overflow = previousOverflow }

  const header = document.createElement('header')
  header.className = 'estimateSnapshotHeaderV2'
  const heading = document.createElement('div')
  const small = document.createElement('small'); small.textContent = '保存済み見積・閲覧専用'
  const h2 = document.createElement('h2'); h2.textContent = title
  heading.append(small, h2)
  const closeButton = document.createElement('button'); closeButton.type = 'button'; closeButton.textContent = '×'; closeButton.setAttribute('aria-label', '閉じる'); closeButton.addEventListener('click', close)
  header.append(heading, closeButton)

  const notice = document.createElement('div')
  notice.className = 'estimateSnapshotNoticeV2'
  notice.textContent = 'この画面は保存済みの過去版です。現在編集中の見積は変更されません。'

  const list = document.createElement('div')
  list.className = 'estimateSnapshotRowsV2'
  const addRow = (label, memo, quantity, unit, rate, amount) => {
    const article = document.createElement('article')
    const left = document.createElement('div')
    const strong = document.createElement('strong'); strong.textContent = label || '見積項目'; left.appendChild(strong)
    if (memo) { const note = document.createElement('small'); note.textContent = memo; left.appendChild(note) }
    const numbers = document.createElement('div'); numbers.className = 'estimateSnapshotNumbersV2'
    const q = document.createElement('span'); q.textContent = text(quantity) + text(unit)
    const r = document.createElement('span'); r.textContent = yen(rate)
    const a = document.createElement('strong'); a.textContent = yen(amount)
    numbers.append(q, r, a); article.append(left, numbers); list.appendChild(article)
  }
  rows.forEach(row => addRow(Array.isArray(row.parts) ? row.parts.filter(Boolean).join(' ') : (row.label || row.name), row.memo, row.quantity, row.unit, row.rate, row.amount))
  additionalWorks.forEach(item => addRow([item.room, item.work].filter(Boolean).join(' ') || 'その他工事', item.memo, item.quantity, item.unit, item.unitPrice, item.amount || Number(item.quantity || 0) * Number(item.unitPrice || 0)))

  const total = document.createElement('div'); total.className = 'estimateSnapshotTotalV2'
  const totalLabel = document.createElement('span'); totalLabel.textContent = '合計金額'
  const totalValue = document.createElement('strong'); totalValue.textContent = yen(version?.totalAmount)
  total.append(totalLabel, totalValue)

  const actions = document.createElement('div'); actions.className = 'estimateSnapshotActionsV2'
  const exportButton = document.createElement('button'); exportButton.type = 'button'; exportButton.className = 'secondary'; exportButton.textContent = '📄 この版を出力'; exportButton.addEventListener('click', () => onExport?.(version))
  const revisionButton = document.createElement('button'); revisionButton.type = 'button'; revisionButton.className = 'primary'; revisionButton.textContent = '📑 この見積をもとに修正版を作る'; revisionButton.addEventListener('click', () => { close(); onCreateRevision?.(entry, version) })
  actions.append(exportButton, revisionButton)

  panel.append(header, notice, list, total, actions)
  root.appendChild(panel)
  root.addEventListener('click', event => { if (event.target === root) close() })
  document.body.appendChild(root)
  panel.scrollTop = 0
}
`

const styles = `/* ${marker} */
.estimateSnapshotBackdropV2{position:fixed;inset:0;z-index:2147483300;display:flex;align-items:flex-start;justify-content:center;padding:12px;background:rgba(0,0,0,.64);box-sizing:border-box;overflow:hidden}
.estimateSnapshotPanelV2{width:min(840px,100%);max-height:calc(100dvh - 24px);overflow:auto;padding:18px;border-radius:18px;background:#fff;color:#172230;box-shadow:0 24px 80px rgba(0,0,0,.4);box-sizing:border-box}
.estimateSnapshotHeaderV2{position:sticky;top:-18px;z-index:3;display:flex;justify-content:space-between;align-items:center;gap:12px;margin:-18px -18px 14px;padding:16px 18px;background:inherit;border-bottom:1px solid rgba(100,120,150,.2)}
.estimateSnapshotHeaderV2 small,.estimateSnapshotHeaderV2 h2{display:block;margin:0}.estimateSnapshotHeaderV2 small{margin-bottom:4px;opacity:.7}.estimateSnapshotHeaderV2>button{width:42px;height:42px;border:0;border-radius:50%;font-size:24px}
.estimateSnapshotNoticeV2{margin-bottom:14px;padding:10px 12px;border-radius:10px;background:rgba(39,111,203,.09);font-weight:750}
.estimateSnapshotRowsV2{display:grid;gap:8px}.estimateSnapshotRowsV2 article{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:12px;border:1px solid rgba(90,120,170,.2);border-radius:11px}.estimateSnapshotRowsV2 small{display:block;margin-top:4px;opacity:.72}.estimateSnapshotNumbersV2{display:grid;grid-template-columns:auto auto auto;gap:14px;align-items:center;white-space:nowrap}
.estimateSnapshotTotalV2{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding:16px;border-radius:12px;background:rgba(39,111,203,.09)}.estimateSnapshotTotalV2 strong{font-size:22px}
.estimateSnapshotActionsV2{position:sticky;bottom:-18px;display:flex;justify-content:flex-end;gap:8px;margin:16px -18px -18px;padding:14px 18px;background:inherit;border-top:1px solid rgba(100,120,150,.2)}.estimateSnapshotActionsV2 button{min-height:44px;padding:9px 14px;border-radius:10px;font-weight:850}.estimateSnapshotActionsV2 .primary{border:0;background:#6a4fd6;color:#fff}.estimateSnapshotActionsV2 .secondary{border:1px solid rgba(90,120,170,.3);background:rgba(127,127,127,.08);color:inherit}
.theme-dark .estimateSnapshotPanelV2,.theme-cyber .estimateSnapshotPanelV2,.theme-luxury .estimateSnapshotPanelV2,.theme-retro .estimateSnapshotPanelV2,.theme-galaxy .estimateSnapshotPanelV2{background:#101827;color:#f7fbff}
@media(max-width:620px){.estimateSnapshotBackdropV2{padding:0}.estimateSnapshotPanelV2{width:100vw;height:100dvh;max-height:100dvh;border-radius:0;padding:16px}.estimateSnapshotHeaderV2{top:-16px;margin:-16px -16px 14px;padding:14px 16px}.estimateSnapshotRowsV2 article{grid-template-columns:1fr}.estimateSnapshotNumbersV2{grid-template-columns:1fr 1fr 1fr}.estimateSnapshotActionsV2{bottom:-16px;margin:16px -16px -16px;padding:12px 16px;flex-direction:column}.estimateSnapshotActionsV2 button{width:100%}}
`

try {
  fs.writeFileSync(viewerPath, viewerCode, 'utf8')
  fs.writeFileSync(cssPath, styles, 'utf8')

  app = app.replace(appCssImportRegex, match => `${match}\nimport { openEstimateSnapshotViewer } from './estimateSnapshotViewer' // ${marker}`)

  const originalButton = versionButtons[0]
  const replacedButton = originalButton.replace(clickRegex, `onClick={() => openEstimateSnapshotViewer({
                                entry,
                                version,
                                onExport: selectedVersion => downloadEstimateExcel({
                                  company: entry.company || '',
                                  propertyName: (entry.propertyName || '') + estimateVersionMark(selectedVersion.version),
                                  address: entry.address || '',
                                  unit: entry.unit || '',
                                  estimateVersion: selectedVersion.version,
                                }, selectedVersion.rows || [], selectedVersion.copyFormat || 'merged', selectedVersion.additionalWorks || []),
                                onCreateRevision: selectedEntry => openSavedEntry(selectedEntry),
                              })}`)
  app = app.replace(originalButton, replacedButton)

  fs.writeFileSync(appPath, app, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 保存済み見積①②を正しく開くV2を適用し、ビルド成功を確認しました。')
  console.log('  - App return構造は変更していません')
  console.log('  - ②は②の保存スナップショットで閲覧')
  console.log('  - 現在編集中の③はそのまま')
  console.log('BACKUP: ' + backup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backup)) fs.copyFileSync(backup, appPath)
  if (fs.existsSync(viewerPath)) fs.unlinkSync(viewerPath)
  if (fs.existsSync(cssPath)) fs.unlinkSync(cssPath)
  process.exit(1)
}
