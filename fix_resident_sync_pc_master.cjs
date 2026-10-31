const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'src', 'OneDriveSyncPanel.jsx')
const backup = path.join(process.cwd(), 'src', 'OneDriveSyncPanel.before_pc_master_patch.jsx')

if (!fs.existsSync(target)) {
  console.error('ERROR: src/OneDriveSyncPanel.jsx が見つかりません。M-Crossのフォルダで実行してください。')
  process.exit(1)
}

let source = fs.readFileSync(target, 'utf8')

if (source.includes('M-CROSS_RESIDENT_PC_MASTER_SYNC_V2')) {
  console.log('SKIP: この同期修正はすでに適用済みです。')
  process.exit(0)
}

fs.copyFileSync(target, backup)

function replaceFunction(text, functionName, replacement) {
  const marker = `  async function ${functionName}()`
  const start = text.indexOf(marker)
  if (start < 0) throw new Error(`${functionName} が見つかりません。`)

  const braceStart = text.indexOf('{', start)
  if (braceStart < 0) throw new Error(`${functionName} の開始位置を検出できません。`)

  let depth = 0
  let quote = null
  let escaped = false
  let lineComment = false
  let blockComment = false

  for (let i = braceStart; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (lineComment) {
      if (char === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false
        i += 1
      }
      continue
    }
    if (quote) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = null
      }
      continue
    }
    if (char === '/' && next === '/') {
      lineComment = true
      i += 1
      continue
    }
    if (char === '/' && next === '*') {
      blockComment = true
      i += 1
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return text.slice(0, start) + replacement + text.slice(i + 1)
      }
    }
  }
  throw new Error(`${functionName} の終了位置を検出できません。`)
}

const residentFunctions = `  /* M-CROSS_RESIDENT_PC_MASTER_SYNC_V2 */
  async function uploadResidentCasesToOneDrive() {
    try {
      const localCases = readResidentCases()
      const answer = window.prompt(
        '【PC専用】このPCの入居中案件 ' + localCases.length + '件を正本としてOneDriveへ保存します。\\n' +
        'スマホでは実行しないでください。続ける場合は PC と入力してください。'
      )
      if (String(answer || '').trim().toUpperCase() !== 'PC') {
        setStatus('入居中案件の送信をキャンセルしました')
        return
      }

      setStatus('PCの入居中案件をOneDriveへ保存しています…')
      const token = await getToken()
      const cloud = await fetchCloudBackup()
      const payload = {
        ...cloud,
        fileType: 'm-cross-backup',
        version: Math.max(Number(cloud.version) || 1, 2),
        exportedAt: new Date().toISOString(),
        entries: Array.isArray(cloud.entries) ? cloud.entries : [],
        entryCount: Array.isArray(cloud.entries) ? cloud.entries.length : 0,
        residentCases: localCases,
        residentCaseCount: localCases.length,
        residentSyncMarker: RESIDENT_SYNC_MARKER,
        residentMaster: 'pc',
      }

      const response = await fetch(backupFileUrl, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload, null, 2),
      })
      if (!response.ok) throw new Error('入居中案件の保存失敗 HTTP ' + response.status)

      setCloudBackup(payload)
      setStatus('PC → OneDrive 保存成功: 入居中案件 ' + localCases.length + '件')
    } catch (error) {
      console.error(error)
      setStatus('入居中案件の保存失敗: ' + (error?.message || String(error)))
    }
  }

  async function downloadResidentCasesFromOneDrive() {
    try {
      setStatus('OneDriveの入居中案件を確認しています…')
      const cloud = await fetchCloudBackup()
      const cloudCases = Array.isArray(cloud.residentCases) ? cloud.residentCases : []

      if (!Array.isArray(cloud.residentCases)) {
        setStatus('OneDriveに入居中案件データがまだありません。先にPCから保存してください。')
        return
      }

      const localCases = readResidentCases()
      if (!window.confirm(
        'OneDriveの入居中案件 ' + cloudCases.length + '件をこの端末へ取得します。\\n' +
        'この端末にある入居中案件 ' + localCases.length + '件は置き換えられます。続けますか？'
      )) return

      localStorage.setItem(residentCasesStorageKey, JSON.stringify(cloudCases))
      setCloudBackup(cloud)
      setStatus('OneDrive → この端末 取得成功: 入居中案件 ' + cloudCases.length + '件。画面を更新します。')
      window.setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      console.error(error)
      setStatus('入居中案件の取得失敗: ' + (error?.message || String(error)))
    }
  }
`

source = replaceFunction(source, 'syncResidentCases', residentFunctions)

const backupFunction = `  async function backupToOneDrive() {
    try {
      const entries = readLocalEntries()
      if (!entries.length) { setStatus('バックアップ対象の保存物件がありません'); return }
      if (!window.confirm(entries.length + '件をOneDriveへバックアップします。入居中案件のクラウドデータは保持します。続けますか？')) return
      setStatus('OneDriveへバックアップしています…')
      const token = await getToken()
      const cloud = await fetchCloudBackup()
      const cloudResidentCases = Array.isArray(cloud.residentCases) ? cloud.residentCases : []
      const payload = {
        ...cloud,
        fileType: 'm-cross-backup',
        version: Math.max(Number(cloud.version) || 1, 2),
        exportedAt: new Date().toISOString(),
        entryCount: entries.length,
        entries,
        residentCases: cloudResidentCases,
        residentCaseCount: cloudResidentCases.length,
        ...(cloud.residentSyncMarker ? { residentSyncMarker: cloud.residentSyncMarker } : {}),
        ...(cloud.residentMaster ? { residentMaster: cloud.residentMaster } : {}),
      }
      const response = await fetch(backupFileUrl, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload, null, 2),
      })
      if (!response.ok) throw new Error('バックアップ失敗 HTTP ' + response.status)
      setCloudBackup(payload)
      setComparison(compareEntries(entries, payload.entries))
      setStatus('バックアップ成功: ' + entries.length + '件。入居中案件 ' + cloudResidentCases.length + '件は保持しました。')
    } catch (error) {
      console.error(error)
      setStatus('バックアップ失敗: ' + (error?.message || String(error)))
    }
  }`

source = replaceFunction(source, 'backupToOneDrive', backupFunction)

const oldButtonPattern = /<button\s+className="oneDriveAction residentSyncAction"\s+type="button"\s+onClick=\{syncResidentCases\}>[\s\S]*?<\/button>/
if (!oldButtonPattern.test(source)) {
  throw new Error('既存の入居中案件同期ボタンが見つかりません。ファイルは変更していません。')
}

source = source.replace(oldButtonPattern, `<button className="oneDriveAction residentSyncAction" type="button" onClick={uploadResidentCasesToOneDrive}>PC専用：入居中案件をOneDriveへ保存</button>
              <button className="oneDriveAction residentSyncAction" type="button" onClick={downloadResidentCasesFromOneDrive}>スマホ・確認端末：入居中案件をOneDriveから取得</button>`)

fs.writeFileSync(target, source, 'utf8')

console.log('OK: 入居中案件の同期をPC正本方式へ変更しました。')
console.log('  - PC → OneDrive は確認文字「PC」が必要')
console.log('  - OneDrive → スマホ/確認端末はクラウド内容で置換')
console.log('  - 通常バックアップでもクラウドの入居中案件を保持')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
