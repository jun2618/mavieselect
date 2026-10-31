const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const backupPath = appPath + '.before-estimate-version-restore-race-v2'
const marker = 'M-CROSS_ESTIMATE_VERSION_RESTORE_RACE_V2_SAFE'

function fail(message) {
  console.error('ERROR: ' + message)
  process.exit(1)
}

if (!fs.existsSync(appPath)) fail('src/App.jsx が見つかりません。')
let source = fs.readFileSync(appPath, 'utf8')

if (source.includes(marker)) {
  console.log('SKIP: 見積版復元競合修正V2は適用済みです。')
  process.exit(0)
}
if (!source.includes('M-CROSS_ESTIMATE_FILE_OPEN_CONTENT_STEP2_SAFE')) {
  fail('見積ファイル内容読込STEP2が見つかりません。変更していません。')
}

const oldState = `  const [openedEstimateVersion, setOpenedEstimateVersion] = useState(null)`
const helperStart = `  function openSavedEstimateVersion(entry, version) {`
const helperEnd = `  function openSavedEntry(entry) {`

if (!source.includes(oldState)) fail('openedEstimateVersion stateが見つかりません。')
const start = source.indexOf(helperStart)
const end = source.indexOf(helperEnd, start)
if (start < 0 || end < 0) fail('openSavedEstimateVersion関数の範囲を特定できません。')

fs.copyFileSync(appPath, backupPath)

try {
  source = source.replace(
    oldState,
    `${oldState}\n  /* ${marker} */\n  const [pendingEstimateSnapshot, setPendingEstimateSnapshot] = useState(null)`
  )

  const replacement = `  function openSavedEstimateVersion(entry, version) {
    // 先に通常案件を開き、その後useEffectで選択版を復元する。
    // openSavedEntry直後の各種読込useEffectと競合しないよう、ここでは直接setEstimateEditsしない。
    setPendingEstimateSnapshot({
      entryStorageKey: entry.storageKey || '',
      version: JSON.parse(JSON.stringify(version || {})),
    })
    setOpenedEstimateVersion(Number(version?.version) || 1)
    openSavedEntry(entry)
  }

  useEffect(() => {
    if (!pendingEstimateSnapshot || !started) return
    const version = pendingEstimateSnapshot.version

    // 通常案件のestimateEdits読込が完了した後に、選択した版で確実に上書きする。
    const timer = window.setTimeout(() => {
      const restoredEdits = {}
      ;(Array.isArray(version?.rows) ? version.rows : []).forEach(row => {
        try {
          const key = estimateEditKey(row)
          restoredEdits[key] = {
            parts: Array.isArray(row.parts)
              ? [0, 1, 2, 3].map(index => String(row.parts[index] || ''))
              : [String(row.label || row.name || ''), '', '', ''],
            memo: String(row.memo || ''),
            quantity: row.quantity ?? '',
            unit: String(row.unit || ''),
            rate: row.rate ?? '',
            amount: row.amount ?? '',
            amountMode: 'manual',
          }
        } catch (error) {
          console.error('見積版の明細復元に失敗', error, row)
        }
      })

      setEstimateEdits(restoredEdits)
      setAdditionalWorks(
        Array.isArray(version?.additionalWorks)
          ? JSON.parse(JSON.stringify(version.additionalWorks))
          : []
      )
      setShowEstimate(true)
      setShowRoomManagement(false)
      setPendingEstimateSnapshot(null)
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }))
    }, 120)

    return () => window.clearTimeout(timer)
  }, [pendingEstimateSnapshot, started, currentStorageKey])

`

  source = source.slice(0, start) + replacement + source.slice(end)
  fs.writeFileSync(appPath, source, 'utf8')

  console.log('変更を適用しました。自動ビルド確認を行います。')
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true })

  console.log('OK: ②を開いた時に初回内容へ戻る競合を修正し、ビルド成功を確認しました。')
  console.log('  - 通常案件の読込完了後に②のsnapshotを復元')
  console.log('  - 無印はversion1、②はversion2、③はversion3を使用')
  console.log('BACKUP: ' + backupPath)
} catch (error) {
  console.error('適用またはビルドに失敗したため、自動で元に戻します。')
  console.error(error.message || String(error))
  if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, appPath)
  process.exit(1)
}
