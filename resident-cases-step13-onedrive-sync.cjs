const fs = require('fs')

const file = './src/OneDriveSyncPanel.jsx'
const backup = './src/OneDriveSyncPanel.jsx.resident-sync-backup'

if (!fs.existsSync(file)) {
  console.error('src/OneDriveSyncPanel.jsxが見つかりません。')
  process.exit(1)
}

let s = fs.readFileSync(file, 'utf8')
const marker = 'M-CROSS_RESIDENT_ONEDRIVE_SYNC_V1'

if (s.includes(marker)) {
  console.log('入居中案件OneDrive同期はすでに適用済みです')
  process.exit(0)
}

const constTarget = "const storagePrefix = 'm-cross:'"
if (!s.includes(constTarget)) {
  console.error('storagePrefixが見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(constTarget, `${constTarget}
const residentCasesStorageKey = 'mcross_resident_cases_v1'
const RESIDENT_SYNC_MARKER = '${marker}'`)

const compareTarget = 'function compareEntries(localEntries, cloudEntries) {'
if (!s.includes(compareTarget)) {
  console.error('compareEntriesが見つかりません。変更しませんでした。')
  process.exit(1)
}

const helpers = `function readResidentCases() {
  try {
    const parsed = JSON.parse(localStorage.getItem(residentCasesStorageKey) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function residentCaseKey(item) {
  return item?.id || [item?.propertyName, item?.unit, item?.requestDate, item?.requestDetails].join('|')
}

function mergeResidentCases(localCases, cloudCases) {
  const merged = new Map()
  ;[...(Array.isArray(cloudCases) ? cloudCases : []), ...(Array.isArray(localCases) ? localCases : [])].forEach(item => {
    if (!item || typeof item !== 'object') return
    const key = residentCaseKey(item)
    if (!key) return
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, item)
      return
    }
    const existingTime = new Date(existing.updatedAt || existing.lastActionAt || existing.createdAt || 0).getTime()
    const itemTime = new Date(item.updatedAt || item.lastActionAt || item.createdAt || 0).getTime()
    if (itemTime >= existingTime) merged.set(key, item)
  })
  return [...merged.values()].sort((a, b) =>
    new Date(b.updatedAt || b.lastActionAt || b.createdAt || 0) - new Date(a.updatedAt || a.lastActionAt || a.createdAt || 0)
  )
}

`
s = s.replace(compareTarget, helpers + compareTarget)

const backupFunctionTarget = '  async function backupToOneDrive() {'
if (!s.includes(backupFunctionTarget)) {
  console.error('backupToOneDriveが見つかりません。変更しませんでした。')
  process.exit(1)
}

const syncFunction = `  async function syncResidentCases() {
    try {
      setStatus('入居中案件をOneDriveと同期しています…')
      const token = await getToken()
      const localCases = readResidentCases()
      const cloud = await fetchCloudBackup()
      const cloudCases = Array.isArray(cloud.residentCases) ? cloud.residentCases : []
      const mergedCases = mergeResidentCases(localCases, cloudCases)

      const payload = {
        ...cloud,
        fileType: 'm-cross-backup',
        version: Math.max(Number(cloud.version) || 1, 2),
        exportedAt: new Date().toISOString(),
        entries: Array.isArray(cloud.entries) ? cloud.entries : [],
        entryCount: Array.isArray(cloud.entries) ? cloud.entries.length : 0,
        residentCases: mergedCases,
        residentCaseCount: mergedCases.length,
        residentSyncMarker: RESIDENT_SYNC_MARKER,
      }

      const response = await fetch(backupFileUrl, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload, null, 2),
      })
      if (!response.ok) throw new Error('入居中案件同期失敗 HTTP ' + response.status)

      localStorage.setItem(residentCasesStorageKey, JSON.stringify(mergedCases))
      setCloudBackup(payload)
      setStatus('入居中案件同期成功: ' + mergedCases.length + '件。画面を更新します。')
      window.setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      console.error(error)
      setStatus('入居中案件同期失敗: ' + (error?.message || String(error)))
    }
  }

`
s = s.replace(backupFunctionTarget, syncFunction + backupFunctionTarget)

const actionTarget = `              <button className="oneDriveAction" type="button" onClick={compareWithOneDrive}>端末とOneDriveを比較</button>`
if (!s.includes(actionTarget)) {
  console.error('OneDrive操作ボタン位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(actionTarget, `${actionTarget}
              <button className="oneDriveAction residentSyncAction" type="button" onClick={syncResidentCases}>入居中案件をPC・スマホで同期</button>`)

const metaTarget = `{cloudBackup && <small className="oneDriveMeta">OneDrive: {cloudBackup.entries.length}件 / 保存日時 {cloudBackup.exportedAt || '未保存'}</small>}`
if (s.includes(metaTarget)) {
  s = s.replace(metaTarget, `{cloudBackup && <small className="oneDriveMeta">OneDrive: {cloudBackup.entries.length}件 / 入居中案件 {Array.isArray(cloudBackup.residentCases) ? cloudBackup.residentCases.length : 0}件 / 保存日時 {cloudBackup.exportedAt || '未保存'}</small>}`)
}

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('STEP13 入居中案件OneDrive同期 OK')
console.log('案件IDごとにPC/スマホを統合し、updatedAt等が新しい側を採用します')
console.log('既存の採寸案件entriesは変更せず、同じOneDriveバックアップJSON内へresidentCasesを追加します')
console.log('同期後は画面を自動再読込します')
console.log('バックアップ:', backup)
console.log('次に npm run build を実行してください')
