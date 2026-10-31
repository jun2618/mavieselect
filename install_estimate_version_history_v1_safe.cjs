const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const componentPath = path.join(root, 'src', 'EstimateVersionPanel.jsx')
const cssPath = path.join(root, 'src', 'EstimateVersionPanel.css')
const appBackup = appPath + '.before-estimate-version-history-v1'
const marker = 'M-CROSS_ESTIMATE_VERSION_HISTORY_V1_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if (fs.existsSync(componentPath) || fs.existsSync(cssPath)) fail('見積版管理コンポーネントが既に存在します。勝手に上書きしません。')

let app = fs.readFileSync(appPath, 'utf8')
if (app.includes(marker)) {
  console.log('SKIP: 見積版管理V1は適用済みです。')
  process.exit(0)
}

const importAnchor = "import EstimateRowEditor from './EstimateRowEditor'"
const stateAnchor = "  const [estimateEdits, setEstimateEdits] = useState({})"
const rowsAnchor = "              const estimateRows = applyEstimateEdits(rawEstimateRows, estimateEdits)"
const totalAnchor = '                  <div className="estimateTotal">'

for (const [name, anchor] of [
  ['EstimateRowEditor import', importAnchor],
  ['estimateEdits state', stateAnchor],
  ['estimateRows生成', rowsAnchor],
  ['合計金額欄', totalAnchor],
]) {
  const count = app.split(anchor).length - 1
  if (count !== 1) fail(name + 'の一致数が ' + count + ' 件です。変更していません。')
}

fs.copyFileSync(appPath, appBackup)

const component = `/* ${marker} */
import './EstimateVersionPanel.css'

function versionLabel(version) {
  return 'お見積り' + String(version)
}

export default function EstimateVersionPanel({
  propertyName,
  unit,
  currentVersion,
  versions,
  currentTotal,
  onCreateRevision,
  onDownloadVersion,
  onDeleteVersion,
}) {
  const sorted = [...versions].sort((a, b) => Number(b.version) - Number(a.version))

  return (
    <section className="estimateVersionPanel" aria-label="見積履歴">
      <div className="estimateVersionCurrent">
        <div>
          <small>現在編集中</small>
          <strong>{propertyName || '物件名未設定'} {unit ? unit + '号室 ' : ''}{versionLabel(currentVersion)}</strong>
        </div>
        <strong className="estimateVersionAmount">¥{Number(currentTotal || 0).toLocaleString('ja-JP')}</strong>
      </div>

      <button className="estimateRevisionButton" type="button" onClick={onCreateRevision}>
        📑 現在の見積を残して修正版{currentVersion + 1}を作る
      </button>
      <small className="estimateVersionHelp">現在の内容を保存してから、同じ内容を引き継いだ次の見積を編集できます。</small>

      {sorted.length > 0 && (
        <div className="estimateVersionHistory">
          <h3>過去の見積</h3>
          {sorted.map(item => (
            <article className="estimateVersionItem" key={item.id}>
              <div>
                <strong>{versionLabel(item.version)}</strong>
                <small>{new Date(item.createdAt).toLocaleString('ja-JP')} ／ ¥{Number(item.totalAmount || 0).toLocaleString('ja-JP')}</small>
              </div>
              <div className="estimateVersionActions">
                <button type="button" onClick={() => onDownloadVersion(item)}>📄 出力</button>
                <button className="delete" type="button" onClick={() => onDeleteVersion(item)}>削除</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
`

const styles = `/* ${marker} */
.estimateVersionPanel{display:grid;gap:12px;margin:18px 0;padding:16px;border:1px solid rgba(90,120,170,.24);border-radius:16px;background:rgba(39,111,203,.05)}
.estimateVersionCurrent{display:flex;align-items:center;justify-content:space-between;gap:12px}.estimateVersionCurrent small,.estimateVersionCurrent strong{display:block}.estimateVersionCurrent small{margin-bottom:4px;opacity:.7}.estimateVersionAmount{font-size:20px}
.estimateRevisionButton{min-height:48px;border:0;border-radius:12px;background:linear-gradient(135deg,#6a4fd6,#8b5dd9);color:#fff;font-weight:900;font-size:16px}.estimateVersionHelp{font-size:13px!important;opacity:.78!important}
.estimateVersionHistory{display:grid;gap:8px}.estimateVersionHistory h3{margin:4px 0}.estimateVersionItem{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid rgba(90,120,170,.2);border-radius:12px;background:rgba(255,255,255,.75)}.estimateVersionItem small,.estimateVersionItem strong{display:block}.estimateVersionItem small{margin-top:4px;opacity:.72}.estimateVersionActions{display:flex;gap:7px}.estimateVersionActions button{min-height:38px;padding:7px 11px;border:1px solid rgba(90,120,170,.28);border-radius:9px;background:rgba(127,127,127,.08);color:inherit;font-weight:800}.estimateVersionActions .delete{color:#b42318}
.theme-dark .estimateVersionItem,.theme-cyber .estimateVersionItem,.theme-luxury .estimateVersionItem,.theme-retro .estimateVersionItem,.theme-galaxy .estimateVersionItem{background:rgba(255,255,255,.06)}
@media(max-width:620px){.estimateVersionCurrent,.estimateVersionItem{align-items:stretch;flex-direction:column}.estimateVersionActions button{flex:1}.estimateVersionActions{width:100%}}
`

try {
  fs.writeFileSync(componentPath, component, 'utf8')
  fs.writeFileSync(cssPath, styles, 'utf8')

  app = app.replace(importAnchor, `${importAnchor}\nimport EstimateVersionPanel from './EstimateVersionPanel' // ${marker}`)

  app = app.replace(stateAnchor, `${stateAnchor}
  const [estimateVersions, setEstimateVersions] = useState([])
  const estimateVersionStorageKey = 'mcross:estimate-versions:' + [company, selectedProperty?.name || '', String(unit || '').trim()].join('|')
  useEffect(() => {
    if (!company || !selectedProperty?.name || !String(unit || '').trim()) {
      setEstimateVersions([])
      return
    }
    try {
      const loaded = JSON.parse(localStorage.getItem(estimateVersionStorageKey) || '[]')
      setEstimateVersions(Array.isArray(loaded) ? loaded : [])
    } catch {
      setEstimateVersions([])
    }
  }, [estimateVersionStorageKey])`)

  // 現在の版番号をestimateRows生成直後に計算。
  app = app.replace(rowsAnchor, `${rowsAnchor}
              const currentEstimateVersion = estimateVersions.reduce((max, item) => Math.max(max, Number(item.version) || 0), 0) + 1`)

  const panel = `                  <EstimateVersionPanel
                    propertyName={selectedProperty?.name || ''}
                    unit={unit}
                    currentVersion={currentEstimateVersion}
                    versions={estimateVersions}
                    currentTotal={totalAmount}
                    onCreateRevision={() => {
                      const version = currentEstimateVersion
                      const snapshot = {
                        id: 'estimate-version-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                        version,
                        createdAt: new Date().toISOString(),
                        totalAmount,
                        rows: JSON.parse(JSON.stringify(estimateRows)),
                        additionalWorks: JSON.parse(JSON.stringify(additionalWorks)),
                        copyFormat: estimateCopyFormat,
                      }
                      const next = [...estimateVersions, snapshot]
                      try {
                        localStorage.setItem(estimateVersionStorageKey, JSON.stringify(next))
                        setEstimateVersions(next)
                        setSaveStatus('お見積り' + version + 'を保存し、修正版' + (version + 1) + 'を作成しました')
                      } catch (error) {
                        console.error(error)
                        window.alert('見積履歴を保存できませんでした。')
                      }
                    }}
                    onDownloadVersion={version => downloadEstimateExcel({
                      company,
                      propertyName: selectedProperty?.name || '',
                      address: selectedProperty?.address || '',
                      unit,
                      estimateVersion: version.version,
                    }, version.rows || [], version.copyFormat || estimateCopyFormat, version.additionalWorks || [])}
                    onDeleteVersion={version => {
                      if (!window.confirm('お見積り' + version.version + 'を削除しますか？')) return
                      const next = estimateVersions.filter(item => item.id !== version.id)
                      localStorage.setItem(estimateVersionStorageKey, JSON.stringify(next))
                      setEstimateVersions(next)
                    }}
                  />

${totalAnchor}`

  app = app.replace(totalAnchor, panel)
  fs.writeFileSync(appPath, app, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 見積①②③の版管理V1を追加し、ビルド成功を確認しました。')
  console.log('  - 現在の見積を保存して次の修正版を作成')
  console.log('  - 過去版は残り、個別にExcel出力可能')
  console.log('  - 採寸データは複製しません')
  console.log('BACKUP: ' + appBackup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(appBackup)) fs.copyFileSync(appBackup, appPath)
  if (fs.existsSync(componentPath)) fs.unlinkSync(componentPath)
  if (fs.existsSync(cssPath)) fs.unlinkSync(cssPath)
  process.exit(1)
}
