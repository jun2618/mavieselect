const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-main-save-version-v3'
const marker = 'M-CROSS_MAIN_SAVE_UPDATES_OPENED_VERSION_V3_ROBUST'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let source = fs.readFileSync(appPath, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: メイン保存版上書きV3は適用済みです。')
  process.exit(0)
}

// saveCurrentData関数の範囲だけを切り出す。
const functionStart = source.indexOf('  function saveCurrentData() {')
const nextFunction = source.indexOf('\n  function ', functionStart + 10)
if (functionStart < 0 || nextFunction < 0) fail('saveCurrentData関数の範囲を特定できません。')

let block = source.slice(functionStart, nextFunction)
const saveLine = '      localStorage.setItem(storageKey, serialized)'
if ((block.split(saveLine).length - 1) !== 1) {
  fail('saveCurrentData内のlocalStorage保存位置が一意ではありません。変更していません。')
}

fs.copyFileSync(appPath, backupPath)

try {
  const patch = `${saveLine}

      /* ${marker} */
      if (openedEstimateVersion) {
        const targetVersion = Number(openedEstimateVersion)
        const factor = Math.max(0, Number(caseCrossFactor) || Number(pricingSettings.crossFactor) || 0)
        const rawVersionRows = buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings)
        const editedVersionRows = openedEstimateRows ?? applyEstimateEdits(rawVersionRows, estimateEdits)
        const savedVersionRows = editedVersionRows.filter(row => !estimateEdits[row.exclusionKey || estimateEditKey(row)]?.excluded)
        const savedAdditionalWorks = additionalWorks.filter((item, index) => {
          const key = 'additionalWork:' + (item.id || index)
          return !estimateEdits[key]?.excluded
        })
        const savedVersionTotal = savedVersionRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
          + savedAdditionalWorks.reduce((sum, item) => sum + (Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0)
        const savedAt = new Date().toISOString()
        const nextVersions = estimateVersions.map(version => Number(version.version) === targetVersion ? {
          ...version,
          rows: JSON.parse(JSON.stringify(savedVersionRows)),
          additionalWorks: JSON.parse(JSON.stringify(savedAdditionalWorks)),
          totalAmount: savedVersionTotal,
          updatedAt: savedAt,
        } : version)
        localStorage.setItem(estimateVersionStorageKey, JSON.stringify(nextVersions))
        setEstimateVersions(nextVersions)
        setOpenedEstimateRows(savedVersionRows)
      }`

  block = block.replace(saveLine, patch)
  source = source.slice(0, functionStart) + block + source.slice(nextFunction)
  fs.writeFileSync(appPath, source, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })
  console.log('OK: 上部の「保存する」で、開いている②などの明細・合計・更新日時を上書きするV3を適用しました。')
  console.log('BACKUP: ' + backupPath)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, appPath)
  process.exit(1)
}
