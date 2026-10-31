const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const viewerPath = path.join(root, 'src', 'EstimateSnapshotViewer.jsx')
const cssPath = path.join(root, 'src', 'EstimateSnapshotViewer.css')
const appBackup = appPath + '.before-estimate-snapshot-viewer-v1'
const marker = 'M-CROSS_ESTIMATE_SNAPSHOT_VIEWER_V1_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}
function count(text, token) {
  return text.split(token).length - 1
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if (fs.existsSync(viewerPath) || fs.existsSync(cssPath)) fail('EstimateSnapshotViewerのファイルが既に存在します。勝手に上書きしません。')

let app = fs.readFileSync(appPath, 'utf8')
if (app.includes(marker)) {
  console.log('SKIP: 保存済み見積閲覧V1は適用済みです。')
  process.exit(0)
}

const importAnchor = "import EstimateVersionPanel from './EstimateVersionPanel'"
const stateAnchor = "  const [estimateVersions, setEstimateVersions] = useState([])"
const versionClickRegex = /<button className="savedExplorerFile estimateVersionExplorerFile" type="button" key=\{\(entry\.storageKey \|\| index\) \+ '-estimate-' \+ version\.version\} onClick=\{\(\) => openSavedEntry\(entry\)\}>/
const appReturnAnchor = '  return ('

if (!app.includes(importAnchor)) fail('EstimateVersionPanel importが見つかりません。')
if (!app.includes(stateAnchor)) fail('estimateVersions stateが見つかりません。')
const clickMatches = app.match(new RegExp(versionClickRegex.source, 'g')) || []
if (clickMatches.length !== 1) fail('見積版ファイルのクリック処理の一致数が ' + clickMatches.length + ' 件です。')
if (count(app, appReturnAnchor) < 1) fail('Appのreturn位置が見つかりません。')

const viewer = `/* ${marker} */
import { createPortal } from 'react-dom'
import './EstimateSnapshotViewer.css'

function mark(version) {
  const marks = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
  const number = Number(version) || 0
  return marks[number] || '（' + number + '）'
}

function yen(value) {
  return '¥' + Number(value || 0).toLocaleString('ja-JP')
}

export default function EstimateSnapshotViewer({ snapshot, onClose, onExport, onCreateRevision }) {
  if (!snapshot) return null
  const { entry, version } = snapshot
  const rows = Array.isArray(version?.rows) ? version.rows : []
  const additionalWorks = Array.isArray(version?.additionalWorks) ? version.additionalWorks : []
  const title = (entry?.propertyName || '物件名未設定') + (entry?.unit ? entry.unit + '号室' : '') + (entry?.workName || '') + mark(version?.version)

  return createPortal(
    <div className="estimateSnapshotBackdrop" onClick={onClose}>
      <section className="estimateSnapshotPanel" role="dialog" aria-modal="true" aria-label="保存済み見積" onClick={event => event.stopPropagation()}>
        <header className="estimateSnapshotHeader">
          <div><small>保存済み見積・閲覧専用</small><h2>{title}</h2></div>
          <button type="button" onClick={onClose} aria-label="閉じる">×</button>
        </header>

        <div className="estimateSnapshotNotice">この画面は保存済みの過去版です。現在編集中の見積は変更されません。</div>

        <div className="estimateSnapshotRows">
          {rows.map((row, index) => (
            <article key={index}>
              <div><strong>{Array.isArray(row.parts) ? row.parts.filter(Boolean).join(' ') : (row.label || row.name || '見積項目')}</strong>{row.memo && <small>{row.memo}</small>}</div>
              <div className="estimateSnapshotNumbers"><span>{row.quantity ?? ''}{row.unit || ''}</span><span>{yen(row.rate)}</span><strong>{yen(row.amount)}</strong></div>
            </article>
          ))}
          {additionalWorks.map((item, index) => (
            <article key={'additional-' + index}>
              <div><strong>{[item.room, item.work].filter(Boolean).join(' ') || 'その他工事'}</strong>{item.memo && <small>{item.memo}</small>}</div>
              <div className="estimateSnapshotNumbers"><span>{item.quantity ?? ''}{item.unit || ''}</span><span>{yen(item.unitPrice)}</span><strong>{yen(item.amount || Number(item.quantity || 0) * Number(item.unitPrice || 0))}</strong></div>
            </article>
          ))}
        </div>

        <div className="estimateSnapshotTotal"><span>合計金額</span><strong>{yen(version?.totalAmount)}</strong></div>
        <div className="estimateSnapshotActions">
          <button type="button" className="secondary" onClick={() => onExport(version)}>📄 この版を出力</button>
          <button type="button" className="primary" onClick={() => onCreateRevision(entry, version)}>📑 この見積をもとに修正版を作る</button>
        </div>
      </section>
    </div>,
    document.body
  )
}
`

const styles = `/* ${marker} */
.estimateSnapshotBackdrop{position:fixed;inset:0;z-index:2147483300;display:flex;align-items:flex-start;justify-content:center;padding:12px;background:rgba(0,0,0,.64);box-sizing:border-box;overflow:hidden}
.estimateSnapshotPanel{width:min(840px,100%);max-height:calc(100dvh - 24px);overflow:auto;padding:18px;border-radius:18px;background:#fff;color:#172230;box-shadow:0 24px 80px rgba(0,0,0,.4);box-sizing:border-box}
.estimateSnapshotHeader{position:sticky;top:-18px;z-index:3;display:flex;justify-content:space-between;align-items:center;gap:12px;margin:-18px -18px 14px;padding:16px 18px;background:inherit;border-bottom:1px solid rgba(100,120,150,.2)}
.estimateSnapshotHeader small,.estimateSnapshotHeader h2{display:block;margin:0}.estimateSnapshotHeader small{margin-bottom:4px;opacity:.7}.estimateSnapshotHeader>button{width:42px;height:42px;border:0;border-radius:50%;font-size:24px}
.estimateSnapshotNotice{margin-bottom:14px;padding:10px 12px;border-radius:10px;background:rgba(39,111,203,.09);font-weight:750}
.estimateSnapshotRows{display:grid;gap:8px}.estimateSnapshotRows article{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:12px;border:1px solid rgba(90,120,170,.2);border-radius:11px}.estimateSnapshotRows small{display:block;margin-top:4px;opacity:.72}.estimateSnapshotNumbers{display:grid;grid-template-columns:auto auto auto;gap:14px;align-items:center;white-space:nowrap}
.estimateSnapshotTotal{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding:16px;border-radius:12px;background:rgba(39,111,203,.09)}.estimateSnapshotTotal strong{font-size:22px}
.estimateSnapshotActions{position:sticky;bottom:-18px;display:flex;justify-content:flex-end;gap:8px;margin:16px -18px -18px;padding:14px 18px;background:inherit;border-top:1px solid rgba(100,120,150,.2)}.estimateSnapshotActions button{min-height:44px;padding:9px 14px;border-radius:10px;font-weight:850}.estimateSnapshotActions .primary{border:0;background:#6a4fd6;color:#fff}.estimateSnapshotActions .secondary{border:1px solid rgba(90,120,170,.3);background:rgba(127,127,127,.08);color:inherit}
.theme-dark .estimateSnapshotPanel,.theme-cyber .estimateSnapshotPanel,.theme-luxury .estimateSnapshotPanel,.theme-retro .estimateSnapshotPanel,.theme-galaxy .estimateSnapshotPanel{background:#101827;color:#f7fbff}
@media(max-width:620px){.estimateSnapshotBackdrop{padding:0}.estimateSnapshotPanel{width:100vw;height:100dvh;max-height:100dvh;border-radius:0;padding:16px}.estimateSnapshotHeader{top:-16px;margin:-16px -16px 14px;padding:14px 16px}.estimateSnapshotRows article{grid-template-columns:1fr}.estimateSnapshotNumbers{grid-template-columns:1fr 1fr 1fr}.estimateSnapshotActions{bottom:-16px;margin:16px -16px -16px;padding:12px 16px;flex-direction:column}.estimateSnapshotActions button{width:100%}}
`

try {
  fs.writeFileSync(viewerPath, viewer, 'utf8')
  fs.writeFileSync(cssPath, styles, 'utf8')

  app = app.replace(importAnchor, `${importAnchor}\nimport EstimateSnapshotViewer from './EstimateSnapshotViewer' // ${marker}`)
  app = app.replace(stateAnchor, `${stateAnchor}\n  const [openedEstimateSnapshot, setOpenedEstimateSnapshot] = useState(null)`)

  app = app.replace(versionClickRegex, `<button className="savedExplorerFile estimateVersionExplorerFile" type="button" key={(entry.storageKey || index) + '-estimate-' + version.version} onClick={() => setOpenedEstimateSnapshot({ entry, version })}>`)

  // App return直後に閲覧専用Viewerを置く。既存画面は変更しない。
  const lastReturn = app.lastIndexOf(appReturnAnchor)
  if (lastReturn < 0) throw new Error('App return位置が見つかりません。')
  const returnInsert = lastReturn + appReturnAnchor.length
  const viewerJsx = `
    <>
      <EstimateSnapshotViewer
        snapshot={openedEstimateSnapshot}
        onClose={() => setOpenedEstimateSnapshot(null)}
        onExport={version => downloadEstimateExcel({
          company: openedEstimateSnapshot?.entry?.company || '',
          propertyName: (openedEstimateSnapshot?.entry?.propertyName || '') + estimateVersionMark(version.version),
          address: openedEstimateSnapshot?.entry?.address || '',
          unit: openedEstimateSnapshot?.entry?.unit || '',
          estimateVersion: version.version,
        }, version.rows || [], version.copyFormat || 'merged', version.additionalWorks || [])}
        onCreateRevision={(entry, version) => {
          openSavedEntry(entry)
          setOpenedEstimateSnapshot(null)
          setSaveStatus('お見積り' + estimateVersionMark(version.version) + 'をもとに現在の見積を開きました')
        }}
      />
`
  app = app.slice(0, returnInsert) + viewerJsx + app.slice(returnInsert)

  // App returnの最終閉じ括弧手前でFragmentを閉じる。
  const appEndPattern = /\n  \)\n}\s*$/
  if (!appEndPattern.test(app)) throw new Error('Appコンポーネントの終了位置が見つかりません。')
  app = app.replace(appEndPattern, '\n    </>\n  )\n}\n')

  fs.writeFileSync(appPath, app, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 保存済み見積①②を閲覧専用で正しく開くV1を適用しました。')
  console.log('  - ②を押すと②の保存明細・追加工事・合計を表示')
  console.log('  - 現在編集中の③は変更しません')
  console.log('  - 過去版は個別出力可能')
  console.log('BACKUP: ' + appBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(appBackup)) fs.copyFileSync(appBackup, appPath)
  if (fs.existsSync(viewerPath)) fs.unlinkSync(viewerPath)
  if (fs.existsSync(cssPath)) fs.unlinkSync(cssPath)
  process.exit(1)
}
