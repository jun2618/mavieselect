const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const componentPath = path.join(root, 'src', 'EstimateVersionPanel.jsx')
const backup = componentPath + '.before-version-1-visibility-v2'
const marker = 'M-CROSS_ESTIMATE_VERSION_1_VISIBILITY_V2_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(componentPath)) fail('src/EstimateVersionPanel.jsx が見つかりません。')
let source = fs.readFileSync(componentPath, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 見積①表示修正V2は適用済みです。')
  process.exit(0)
}

const oldLabel = `function versionLabel(version) {
  return 'お見積り' + String(version)
}`

const oldHistory = `      {sorted.length > 0 && (
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
      )}`

const revisionButton = `      <button className="estimateRevisionButton" type="button" onClick={onCreateRevision}>
        📑 現在の見積を残して修正版{currentVersion + 1}を作る
      </button>
      <small className="estimateVersionHelp">現在の内容を保存してから、同じ内容を引き継いだ次の見積を編集できます。</small>`

if (!source.includes(oldLabel)) fail('versionLabel関数が想定と違います。変更していません。')
if (!source.includes(oldHistory)) fail('過去の見積表示部分が見つかりません。変更していません。')
if (!source.includes(revisionButton)) fail('修正版作成ボタンが見つかりません。変更していません。')

fs.copyFileSync(componentPath, backup)

const newLabel = `/* ${marker} */
function versionLabel(version) {
  const circled = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
  const number = Number(version) || 0
  return 'お見積り' + (circled[number] || String(number))
}`

const newHistory = `      <div className="estimateVersionHistory estimateVersionHistoryVisible">
        <h3>📂 保存済みの見積</h3>
        {sorted.length === 0 ? (
          <p className="estimateVersionEmpty">まだ保存済みの見積はありません。下のボタンを押すと、現在の内容が「お見積り①」としてここに残ります。</p>
        ) : (
          sorted.map(item => (
            <article className="estimateVersionItem" key={item.id}>
              <div className="estimateVersionItemName">
                <span className="estimateVersionFileIcon">📄</span>
                <div>
                  <strong>{versionLabel(item.version)} <span className="estimateVersionSavedBadge">保存済み</span></strong>
                  <small>{new Date(item.createdAt).toLocaleString('ja-JP')} ／ ¥{Number(item.totalAmount || 0).toLocaleString('ja-JP')}</small>
                </div>
              </div>
              <div className="estimateVersionActions">
                <button type="button" onClick={() => onDownloadVersion(item)}>📄 この版を出力</button>
                <button className="delete" type="button" onClick={() => onDeleteVersion(item)}>削除</button>
              </div>
            </article>
          ))
        )}
      </div>`

try {
  source = source.replace(oldLabel, newLabel)
  // 保存済み①を見落とさないよう、現在編集中の直後へ移動する。
  source = source.replace(oldHistory, '')
  source = source.replace(revisionButton, `${newHistory}\n\n${revisionButton}`)
  fs.writeFileSync(componentPath, source, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: 過去の見積①を常時表示するV2を適用し、ビルド成功を確認しました。')
  console.log('  - お見積り①②③を丸数字で表示')
  console.log('  - 保存済み見積を現在編集中の直下へ移動')
  console.log('  - 履歴がない場合も案内を表示')
  console.log('BACKUP: ' + backup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backup)) fs.copyFileSync(backup, componentPath)
  process.exit(1)
}
