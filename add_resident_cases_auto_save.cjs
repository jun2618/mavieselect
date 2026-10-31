const fs = require('fs')
const path = require('path')

const root = process.cwd()
const appPath = path.join(root, 'src', 'App.jsx')
const panelPath = path.join(root, 'src', 'OneDriveSyncPanel.jsx')
const marker = 'M-CROSS_RESIDENT_AUTO_SAVE_V1'

for (const file of [appPath, panelPath]) {
  if (!fs.existsSync(file)) {
    console.error('ERROR: ' + file + ' が見つかりません。M-Crossフォルダで実行してください。')
    process.exit(1)
  }
}

let app = fs.readFileSync(appPath, 'utf8')
let panel = fs.readFileSync(panelPath, 'utf8')

if (app.includes(marker) || panel.includes(marker)) {
  console.log('SKIP: 自動保存修正はすでに適用済みです。')
  process.exit(0)
}

if (!panel.includes('M-CROSS_RESIDENT_PC_MASTER_SYNC_V2')) {
  console.error('ERROR: 先にPC正本方式の同期修正を適用してください。ファイルは変更していません。')
  process.exit(1)
}

const appBackup = appPath + '.before-resident-auto-save'
const panelBackup = panelPath + '.before-resident-auto-save'
fs.copyFileSync(appPath, appBackup)
fs.copyFileSync(panelPath, panelBackup)

// App.jsx: 入居中案件のローカル保存成功後に、同じ画面内へ更新イベントを通知する。
const oldSave = `    localStorage.setItem(
      residentCasesStorageKey,
      JSON.stringify(Array.isArray(cases) ? cases : [])
    )
    return true`
const newSave = `    localStorage.setItem(
      residentCasesStorageKey,
      JSON.stringify(Array.isArray(cases) ? cases : [])
    )
    /* ${marker} */
    window.dispatchEvent(new CustomEvent('mcross:resident-cases-saved', {
      detail: { count: Array.isArray(cases) ? cases.length : 0, savedAt: new Date().toISOString() },
    }))
    return true`

if (!app.includes(oldSave)) {
  console.error('ERROR: App.jsx の saveResidentCases 保存箇所が見つかりません。ファイルは変更していません。')
  process.exit(1)
}
app = app.replace(oldSave, newSave)

// useRefを追加する。
const importOld = `import { useEffect, useMemo, useState } from 'react'`
const importNew = `import { useEffect, useMemo, useRef, useState } from 'react'`
if (!panel.includes(importOld)) {
  console.error('ERROR: OneDriveSyncPanel.jsx のReact importが想定外です。ファイルは変更していません。')
  process.exit(1)
}
panel = panel.replace(importOld, importNew)

// PCマスター端末だけが自動送信できる端末別フラグ。
const keyAnchor = `const RESIDENT_SYNC_MARKER = 'M-CROSS_RESIDENT_ONEDRIVE_SYNC_V1'`
panel = panel.replace(keyAnchor, `${keyAnchor}
const residentPcMasterKey = 'mcross_resident_pc_master_v1'
const residentAutoSaveDelay = 2500
const AUTO_SAVE_MARKER = '${marker}'`)

// state/refを追加。
const stateAnchor = `  const [expanded, setExpanded] = useState(false)`
panel = panel.replace(stateAnchor, `${stateAnchor}
  const [residentAutoStatus, setResidentAutoStatus] = useState('')
  const residentAutoTimerRef = useRef(null)
  const residentAutoRunningRef = useRef(false)
  const residentAutoPendingRef = useRef(false)`)

// 自動アップロード本体とイベント購読を、signInの直前へ追加。
const signInAnchor = `  async function signIn() {`
const autoCode = `  /* ${marker} */
  async function autoUploadResidentCases() {
    if (localStorage.getItem(residentPcMasterKey) !== 'true') return
    if (residentAutoRunningRef.current) {
      residentAutoPendingRef.current = true
      return
    }

    residentAutoRunningRef.current = true
    residentAutoPendingRef.current = false
    try {
      setResidentAutoStatus('入居中案件をOneDriveへ自動保存中…')
      const token = await getToken()
      const localCases = readResidentCases()
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
      if (!response.ok) throw new Error('HTTP ' + response.status)
      setCloudBackup(payload)
      setResidentAutoStatus('☁ 入居中案件 ' + localCases.length + '件 OneDrive保存済み')
    } catch (error) {
      console.error(error)
      setResidentAutoStatus('⚠ OneDrive自動保存失敗: ' + (error?.message || String(error)))
    } finally {
      residentAutoRunningRef.current = false
      if (residentAutoPendingRef.current) {
        residentAutoPendingRef.current = false
        window.clearTimeout(residentAutoTimerRef.current)
        residentAutoTimerRef.current = window.setTimeout(autoUploadResidentCases, residentAutoSaveDelay)
      }
    }
  }

  useEffect(() => {
    function handleResidentCasesSaved() {
      if (localStorage.getItem(residentPcMasterKey) !== 'true') return
      window.clearTimeout(residentAutoTimerRef.current)
      setResidentAutoStatus('入居中案件の変更を保存待ち…')
      residentAutoTimerRef.current = window.setTimeout(autoUploadResidentCases, residentAutoSaveDelay)
    }
    window.addEventListener('mcross:resident-cases-saved', handleResidentCasesSaved)
    return () => {
      window.removeEventListener('mcross:resident-cases-saved', handleResidentCasesSaved)
      window.clearTimeout(residentAutoTimerRef.current)
    }
  }, [])

${signInAnchor}`
if (!panel.includes(signInAnchor)) {
  console.error('ERROR: signIn関数が見つかりません。ファイルは変更していません。')
  process.exit(1)
}
panel = panel.replace(signInAnchor, autoCode)

// 手動PC送信が成功した端末だけ、自動保存を有効化。
const uploadSuccess = `      setCloudBackup(payload)
      setStatus('PC → OneDrive 保存成功: 入居中案件 ' + localCases.length + '件')`
const uploadSuccessNew = `      localStorage.setItem(residentPcMasterKey, 'true')
      setCloudBackup(payload)
      setResidentAutoStatus('☁ PC自動保存：有効')
      setStatus('PC → OneDrive 保存成功: 入居中案件 ' + localCases.length + '件。以後、このPCでは自動保存します。')`
if (!panel.includes(uploadSuccess)) {
  console.error('ERROR: PC送信成功箇所が見つかりません。ファイルは変更していません。')
  process.exit(1)
}
panel = panel.replace(uploadSuccess, uploadSuccessNew)

// 取得する端末は受信専用に固定。誤って以前PC指定した端末でも自動送信を止める。
const downloadStore = `      localStorage.setItem(residentCasesStorageKey, JSON.stringify(cloudCases))
      setCloudBackup(cloud)`
const downloadStoreNew = `      localStorage.setItem(residentPcMasterKey, 'false')
      localStorage.setItem(residentCasesStorageKey, JSON.stringify(cloudCases))
      setResidentAutoStatus('📱 この端末は受信専用です')
      setCloudBackup(cloud)`
if (!panel.includes(downloadStore)) {
  console.error('ERROR: OneDrive取得保存箇所が見つかりません。ファイルは変更していません。')
  process.exit(1)
}
panel = panel.replace(downloadStore, downloadStoreNew)

// 状態表示を追加。
const statusDisplay = `          {status && <div className="oneDriveStatus">{status}</div>}`
const statusDisplayNew = `          {residentAutoStatus && <div className="oneDriveStatus" data-auto-save-marker={AUTO_SAVE_MARKER}>{residentAutoStatus}</div>}
          {status && <div className="oneDriveStatus">{status}</div>}`
if (!panel.includes(statusDisplay)) {
  console.error('ERROR: 同期状態表示箇所が見つかりません。ファイルは変更していません。')
  process.exit(1)
}
panel = panel.replace(statusDisplay, statusDisplayNew)

fs.writeFileSync(appPath, app, 'utf8')
fs.writeFileSync(panelPath, panel, 'utf8')

console.log('OK: 入居中案件のPC自動保存を追加しました。')
console.log('  - 最初にPC専用ボタンで一度送信すると、そのPCだけ自動保存が有効になります。')
console.log('  - 案件保存後2.5秒でOneDriveへ送信します。')
console.log('  - スマホで「OneDriveから取得」すると、その端末は受信専用になります。')
console.log('  - 手動PC送信ボタンは非常用として残しています。')
console.log('BACKUP:')
console.log('  ' + appBackup)
console.log('  ' + panelBackup)
console.log('NEXT: npm run build')
