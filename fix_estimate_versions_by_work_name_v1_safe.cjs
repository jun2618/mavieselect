const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backup = appPath + '.before-estimate-versions-by-work-name-v1'
const marker = 'M-CROSS_ESTIMATE_VERSIONS_BY_WORK_NAME_V1_SAFE'

function fail(message) { console.error('ERROR: ' + message); process.exit(1) }
if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let app = fs.readFileSync(appPath, 'utf8')
if (app.includes(marker)) { console.log('SKIP: 工事名別見積履歴V1は適用済みです。'); process.exit(0) }

const oldKey = "  const estimateVersionStorageKey = 'mcross:estimate-versions:' + [company, selectedProperty?.name || '', String(unit || '').trim()].join('|')"
const oldLoad = "      const loaded = JSON.parse(localStorage.getItem(estimateVersionStorageKey) || '[]')"
const explorerKey = "                            const key = 'mcross:estimate-versions:' + [entry.company || '', entry.propertyName || '', String(entry.unit || '').trim()].join('|')"
const explorerLoad = "                            const stored = JSON.parse(localStorage.getItem(key) || '[]')"

if (!app.includes(oldKey)) fail('現在の見積履歴キーが見つかりません。変更していません。')
if (!app.includes(oldLoad)) fail('見積履歴の読込処理が見つかりません。変更していません。')
if (!app.includes(explorerKey)) fail('エクスプローラー側の見積履歴キーが見つかりません。変更していません。')
if (!app.includes(explorerLoad)) fail('エクスプローラー側の見積履歴読込が見つかりません。変更していません。')

fs.copyFileSync(appPath, backup)

try {
  // 見積履歴を 管理会社 + 物件 + 号室 + 工事名 単位へ分離。
  app = app.replace(oldKey, `  /* ${marker} */
  const estimateVersionStorageKey = 'mcross:estimate-versions:' + [company, selectedProperty?.name || '', String(unit || '').trim(), String(workName || '').trim() || '原状回復工事'].join('|')
  const legacyEstimateVersionStorageKey = 'mcross:estimate-versions:' + [company, selectedProperty?.name || '', String(unit || '').trim()].join('|')`)

  // 既存データ救済: 原状回復工事だけ、工事名なしの旧履歴を読む。
  // 室内修繕・内装工事などでは旧履歴を読まないので、以前の①②③がコピー表示されない。
  app = app.replace(oldLoad, `      const currentStored = localStorage.getItem(estimateVersionStorageKey)
      const legacyStored = String(workName || '').trim() === '原状回復工事'
        ? localStorage.getItem(legacyEstimateVersionStorageKey)
        : null
      const loaded = JSON.parse(currentStored || legacyStored || '[]')`)

  // エクスプローラーでも工事名ごとの履歴を見る。
  app = app.replace(explorerKey, `                            const entryWorkName = String(entry.workName || '').trim() || '原状回復工事'
                            const key = 'mcross:estimate-versions:' + [entry.company || '', entry.propertyName || '', String(entry.unit || '').trim(), entryWorkName].join('|')
                            const legacyKey = 'mcross:estimate-versions:' + [entry.company || '', entry.propertyName || '', String(entry.unit || '').trim()].join('|')`)
  app = app.replace(explorerLoad, `                            const currentStored = localStorage.getItem(key)
                            const legacyStored = entryWorkName === '原状回復工事' ? localStorage.getItem(legacyKey) : null
                            const stored = JSON.parse(currentStored || legacyStored || '[]')`)

  // エクスプローラーの表示名に工事名を付ける。保存データ自体は変更しない。
  const baseNameOld = "                          const baseName = (entry.propertyName || '物件名なし') + (entry.unit ? entry.unit + '号室' : '')"
  if (app.includes(baseNameOld)) {
    app = app.replace(baseNameOld, "                          const baseName = (entry.propertyName || '物件名なし') + (entry.unit ? entry.unit + '号室' : '') + (entry.workName ? entry.workName : '')")
  }

  fs.writeFileSync(appPath, app, 'utf8')
  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 見積履歴を工事名ごとに分離し、ビルド成功を確認しました。')
  console.log('  - 室内修繕は室内修繕専用の①②③')
  console.log('  - 内装工事は内装工事専用の①②③')
  console.log('  - 原状回復工事は旧履歴を引き続き読めます')
  console.log('BACKUP: ' + backup)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backup)) fs.copyFileSync(backup, appPath)
  process.exit(1)
}
