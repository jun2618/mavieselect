const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const panelPath = path.join(root, 'src', 'EstimateVersionPanel.jsx')
const appBackup = appPath + '.before-estimate-version-explorer-v3'
const panelBackup = panelPath + '.before-estimate-version-explorer-v3'
const marker = 'M-CROSS_ESTIMATE_VERSION_EXPLORER_FILENAME_V3_SAFE'

function fail(message){ console.error('ERROR: ' + message); process.exit(1) }
if(!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
if(!fs.existsSync(panelPath)) fail('src/EstimateVersionPanel.jsx が見つかりません。')
let app=fs.readFileSync(appPath,'utf8')
let panel=fs.readFileSync(panelPath,'utf8')
if(app.includes(marker)||panel.includes(marker)){ console.log('SKIP: 見積版エクスプローラーV3は適用済みです。'); process.exit(0) }

const explorerFileNeedle = `<div className="savedExplorerFiles">
                        {matching.map(({ entry }, index) => (`
const downloadVersionNeedle = `onDownloadVersion={version => downloadEstimateExcel({
                      company,
                      propertyName: selectedProperty?.name || '',
                      address: selectedProperty?.address || '',
                      unit,
                      estimateVersion: version.version,
                    }, version.rows || [], version.copyFormat || estimateCopyFormat, version.additionalWorks || [])}`
const headingNeedle = `<h2>{selectedProperty?.name} {unit}号室</h2>`

if(!app.includes(explorerFileNeedle)) fail('保存済みエクスプローラーの号室表示位置が見つかりません。')
if(!app.includes(downloadVersionNeedle)) fail('過去見積の出力処理が見つかりません。')
if(!app.includes(headingNeedle)) fail('見積画面の物件・号室見出しが見つかりません。')

fs.copyFileSync(appPath,appBackup)
fs.copyFileSync(panelPath,panelBackup)

try{
  // 丸数字共通ヘルパーをApp.jsxへ追加。
  const appFnAnchor='export default function App() {'
  if(!app.includes(appFnAnchor)) throw new Error('App開始位置が見つかりません。')
  const helper=`/* ${marker} */
function estimateVersionMark(version) {
  const marks = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
  const number = Number(version) || 0
  return marks[number] || '（' + number + '）'
}

`
  app=app.replace(appFnAnchor,helper+appFnAnchor)

  // エクスプローラーの物件フォルダ内に、保存済み見積版もファイルとして表示。
  const oldFiles=`<div className="savedExplorerFiles">
                        {matching.map(({ entry }, index) => (
                          <button className="savedExplorerFile" type="button" key={entry.storageKey || index} onClick={() => openSavedEntry(entry)}>
                            <span>📄</span>
                            <div>
                              <strong>{entry.unit ? entry.unit + '号室' : '号室未設定'}</strong>
                              <small>更新 {formatSavedDate(entry.updatedAt)}</small>
                            </div>
                          </button>
                        ))}
                      </div>`
  if(!app.includes(oldFiles)) throw new Error('エクスプローラーのファイル表示ブロックが想定と違います。')
  const newFiles=`<div className="savedExplorerFiles">
                        {matching.flatMap(({ entry }, index) => {
                          const baseName = (entry.propertyName || '物件名なし') + (entry.unit ? entry.unit + '号室' : '')
                          let versions = []
                          try {
                            const key = 'mcross:estimate-versions:' + [entry.company || '', entry.propertyName || '', String(entry.unit || '').trim()].join('|')
                            const stored = JSON.parse(localStorage.getItem(key) || '[]')
                            versions = Array.isArray(stored) ? stored : []
                          } catch {}
                          const items = [
                            <button className="savedExplorerFile" type="button" key={(entry.storageKey || index) + '-current'} onClick={() => openSavedEntry(entry)}>
                              <span>📄</span>
                              <div><strong>{baseName}</strong><small>採寸・現在の見積 ／ 更新 {formatSavedDate(entry.updatedAt)}</small></div>
                            </button>,
                          ]
                          versions.sort((a,b) => Number(a.version)-Number(b.version)).forEach(version => {
                            items.push(
                              <button className="savedExplorerFile estimateVersionExplorerFile" type="button" key={(entry.storageKey || index) + '-estimate-' + version.version} onClick={() => openSavedEntry(entry)}>
                                <span>📑</span>
                                <div><strong>{baseName}{estimateVersionMark(version.version)}</strong><small>保存済み見積 ／ ¥{Number(version.totalAmount || 0).toLocaleString('ja-JP')}</small></div>
                              </button>
                            )
                          })
                          return items
                        })}
                      </div>`
  app=app.replace(oldFiles,newFiles)

  // 見積画面のタイトルにも現在版番号を表示。
  app=app.replace(headingNeedle,`<h2>{selectedProperty?.name} {unit}号室{estimateVersionMark(currentEstimateVersion)}</h2>`)

  // 過去版出力時は表示名にも版番号を渡す。
  app=app.replace(downloadVersionNeedle,`onDownloadVersion={version => downloadEstimateExcel({
                      company,
                      propertyName: (selectedProperty?.name || '') + estimateVersionMark(version.version),
                      address: selectedProperty?.address || '',
                      unit,
                      estimateVersion: version.version,
                    }, version.rows || [], version.copyFormat || estimateCopyFormat, version.additionalWorks || [])}`)

  // 現行見積の直接出力にも現在版番号を渡す箇所を限定置換。
  const quickProperty=`propertyName: selectedProperty?.name || '',\n                    address: selectedProperty?.address || '',\n                    unit,`
  if(app.includes(quickProperty)){
    app=app.replace(quickProperty,`propertyName: (selectedProperty?.name || '') + estimateVersionMark(currentEstimateVersion),\n                    address: selectedProperty?.address || '',\n                    unit,`)
  }

  fs.writeFileSync(appPath,app,'utf8')
  fs.writeFileSync(panelPath,panel,'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true})
  console.log('OK: 見積①②③をエクスプローラーと画面名・出力名へ反映し、ビルド成功を確認しました。')
  console.log('BACKUP: '+appBackup)
}catch(error){
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message||String(error))
  if(fs.existsSync(appBackup)) fs.copyFileSync(appBackup,appPath)
  if(fs.existsSync(panelBackup)) fs.copyFileSync(panelBackup,panelPath)
  process.exit(1)
}
