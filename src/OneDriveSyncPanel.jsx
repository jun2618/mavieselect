import { useEffect, useMemo, useState } from 'react'
import { PublicClientApplication } from '@azure/msal-browser'

const MARKER = 'M-CROSS_ONEDRIVE_SYNC_INTEGRATION_V1'
const storagePrefix = 'm-cross:'
const graphScopes = ['User.Read', 'Files.ReadWrite.AppFolder']
const backupFileUrl = 'https://graph.microsoft.com/v1.0/me/drive/special/approot:/m-cross-backup.json:/content'

const msal = new PublicClientApplication({
  auth: {
    clientId: '783680c7-c4fc-4028-bacd-e25497f40334',
    authority: 'https://login.microsoftonline.com/3ac7d9e7-5765-41cc-8e82-3c27d62cea00',
    redirectUri: window.location.origin + '/auth-redirect.html',
  },
  cache: { cacheLocation: 'localStorage' },
})

let initializePromise = null
function initializeAuth() {
  if (!initializePromise) initializePromise = msal.initialize()
  return initializePromise
}

function readLocalEntries() {
  const entries = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key || !key.startsWith(storagePrefix)) continue
    try {
      const data = JSON.parse(localStorage.getItem(key) || 'null')
      if (data && Array.isArray(data.records)) {
        entries.push({ ...data, archived: Boolean(data.archived), storageKey: key })
      }
    } catch {
      // M-Cross本体と同じく、読み込めないデータは除外
    }
  }
  return entries.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
}

function entryKey(entry) {
  return entry.storageKey || [entry.company, entry.propertyName, entry.unit].join('|')
}

function compareEntries(localEntries, cloudEntries) {
  const localMap = new Map(localEntries.map(entry => [entryKey(entry), entry]))
  const cloudMap = new Map(cloudEntries.map(entry => [entryKey(entry), entry]))
  return [...new Set([...localMap.keys(), ...cloudMap.keys()])].map(key => {
    const local = localMap.get(key)
    const cloud = cloudMap.get(key)
    let state = '同じ'
    if (local && !cloud) state = '端末のみ'
    else if (!local && cloud) state = 'OneDriveのみ'
    else {
      const localTime = new Date(local?.updatedAt || 0).getTime()
      const cloudTime = new Date(cloud?.updatedAt || 0).getTime()
      if (localTime > cloudTime) state = '端末が新しい'
      else if (cloudTime > localTime) state = 'OneDriveが新しい'
    }
    return { key, local, cloud, entry: local || cloud, state }
  })
}

export default function OneDriveSyncPanel() {
  const [account, setAccount] = useState(null)
  const [status, setStatus] = useState('')
  const [cloudBackup, setCloudBackup] = useState(null)
  const [comparison, setComparison] = useState([])
  const [selectedKeys, setSelectedKeys] = useState([])
  const [expanded, setExpanded] = useState(false)
  const localEntries = useMemo(() => readLocalEntries(), [status, expanded])

  useEffect(() => {
    let active = true
    initializeAuth().then(() => {
      const existing = msal.getAllAccounts()[0] || null
      if (active) setAccount(existing)
    }).catch(error => {
      console.error(error)
      if (active) setStatus('Microsoft認証の初期化に失敗しました')
    })
    return () => { active = false }
  }, [])

  async function getToken() {
    await initializeAuth()
    const activeAccount = msal.getActiveAccount() || msal.getAllAccounts()[0]
    if (!activeAccount) throw new Error('先にMicrosoftへサインインしてください')
    msal.setActiveAccount(activeAccount)
    try {
      return (await msal.acquireTokenSilent({ scopes: graphScopes, account: activeAccount })).accessToken
    } catch {
      return (await msal.acquireTokenPopup({ scopes: graphScopes, account: activeAccount })).accessToken
    }
  }

  async function signIn() {
    try {
      setStatus('Microsoftに接続しています…')
      await initializeAuth()
      const result = await msal.loginPopup({ scopes: graphScopes })
      msal.setActiveAccount(result.account)
      setAccount(result.account)
      setStatus('Microsoftにサインインしました')
    } catch (error) {
      console.error(error)
      setStatus('サインイン失敗: ' + (error?.errorCode || error?.message || String(error)))
    }
  }

  async function signOut() {
    try {
      await initializeAuth()
      const activeAccount = msal.getActiveAccount() || msal.getAllAccounts()[0]
      if (activeAccount) await msal.logoutPopup({ account: activeAccount, postLogoutRedirectUri: window.location.origin + '/' })
      setAccount(null)
      setCloudBackup(null)
      setComparison([])
      setSelectedKeys([])
      setStatus('サインアウトしました')
    } catch (error) {
      console.error(error)
      setStatus('サインアウト失敗: ' + (error?.message || String(error)))
    }
  }

  async function fetchCloudBackup() {
    const token = await getToken()
    const response = await fetch(backupFileUrl, { headers: { Authorization: 'Bearer ' + token } })
    if (response.status === 404) return { fileType: 'm-cross-backup', version: 1, entries: [], exportedAt: '' }
    if (!response.ok) throw new Error('OneDrive読込失敗 HTTP ' + response.status)
    const data = await response.json()
    if (data?.fileType !== 'm-cross-backup' || !Array.isArray(data.entries)) throw new Error('M-Crossバックアップ形式ではありません')
    return data
  }

  async function backupToOneDrive() {
    try {
      const entries = readLocalEntries()
      if (!entries.length) { setStatus('バックアップ対象の保存物件がありません'); return }
      if (!window.confirm(entries.length + '件をOneDriveへバックアップします。端末データは変更しません。続けますか？')) return
      setStatus('OneDriveへバックアップしています…')
      const token = await getToken()
      const payload = { fileType: 'm-cross-backup', version: 1, exportedAt: new Date().toISOString(), entryCount: entries.length, entries }
      const response = await fetch(backupFileUrl, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload, null, 2),
      })
      if (!response.ok) throw new Error('バックアップ失敗 HTTP ' + response.status)
      setCloudBackup(payload)
      setComparison(compareEntries(entries, payload.entries))
      setStatus('バックアップ成功: ' + entries.length + '件')
    } catch (error) {
      console.error(error)
      setStatus('バックアップ失敗: ' + (error?.message || String(error)))
    }
  }

  async function compareWithOneDrive() {
    try {
      setStatus('端末とOneDriveを比較しています…')
      const cloud = await fetchCloudBackup()
      const result = compareEntries(readLocalEntries(), cloud.entries)
      setCloudBackup(cloud)
      setComparison(result)
      setSelectedKeys([])
      setStatus('比較完了: 端末 ' + readLocalEntries().length + '件 / OneDrive ' + cloud.entries.length + '件')
    } catch (error) {
      console.error(error)
      setStatus('比較失敗: ' + (error?.message || String(error)))
    }
  }

  const importCandidates = comparison.filter(item => item.state === 'OneDriveのみ' || item.state === 'OneDriveが新しい')

  function importSelected() {
    const selected = importCandidates.filter(item => selectedKeys.includes(item.key))
    if (!selected.length) { setStatus('取り込む物件を選択してください'); return }
    const names = selected.map(item => (item.cloud?.propertyName || '物件名なし') + ' ' + (item.cloud?.unit || '') + '号室')
    if (!window.confirm(['次の' + selected.length + '件をこの端末へ取り込みます。', '', ...names, '', '続けますか？'].join('\n'))) return
    try {
      selected.forEach(item => localStorage.setItem(item.cloud.storageKey, JSON.stringify(item.cloud)))
      setStatus('取込成功: ' + selected.length + '件。保存済み一覧を開き直してください。')
      compareWithOneDrive()
    } catch (error) {
      console.error(error)
      setStatus('取込失敗: ' + (error?.message || String(error)))
    }
  }

  return (
    <section className="oneDriveSyncPanel" data-marker={MARKER}>
      <button className="secondaryButton" type="button" onClick={() => setExpanded(value => !value)}>
        ☁ OneDrive同期 {expanded ? '▲' : '▼'}
      </button>
      {expanded && (
        <div className="oneDriveSyncBody">
          <h2>☁ OneDrive同期</h2>
          <p className="oneDriveSyncNote">同期を使う人だけMicrosoftへサインインします。自動同期はしません。</p>
          <div className="oneDriveAccountRow">
            <div><strong>{account ? 'サインイン済み' : '未サインイン'}</strong><small>{account?.username || 'Microsoftログインは任意です'}</small></div>
            {account ? <button type="button" onClick={signOut}>サインアウト</button> : <button type="button" onClick={signIn}>Microsoftでサインイン</button>}
          </div>
          <div className="oneDriveCount">この端末の正式保存物件：<strong>{localEntries.length}件</strong></div>
          {account && (
            <>
              <button className="oneDriveAction" type="button" onClick={backupToOneDrive}>端末 → OneDriveへバックアップ</button>
              <button className="oneDriveAction" type="button" onClick={compareWithOneDrive}>端末とOneDriveを比較</button>
            </>
          )}
          {status && <div className="oneDriveStatus">{status}</div>}
          {cloudBackup && <small className="oneDriveMeta">OneDrive: {cloudBackup.entries.length}件 / 保存日時 {cloudBackup.exportedAt || '未保存'}</small>}
          {comparison.length > 0 && (
            <div className="oneDriveCompareList">
              {comparison.map(item => (
                <article key={item.key}>
                  <strong>{item.entry?.propertyName || '物件名なし'} {item.entry?.unit || ''}号室</strong>
                  <span>{item.state}</span>
                </article>
              ))}
            </div>
          )}
          {importCandidates.length > 0 && (
            <div className="oneDriveImportBox">
              <h3>OneDriveから選択して取り込む</h3>
              {importCandidates.map(item => (
                <label key={item.key}>
                  <input type="checkbox" checked={selectedKeys.includes(item.key)} onChange={event => setSelectedKeys(previous => event.target.checked ? [...previous, item.key] : previous.filter(key => key !== item.key))} />
                  <span>{item.cloud?.propertyName || '物件名なし'} {item.cloud?.unit || ''}号室 - {item.state}</span>
                </label>
              ))}
              <button className="oneDriveAction" type="button" onClick={importSelected}>選択した物件を取り込む</button>
            </div>
          )}
          <small className="oneDriveWarning">「同じ」「端末が新しい」物件はOneDriveから上書きしません。</small>
        </div>
      )}
      <style>{`
        .oneDriveSyncPanel{margin-top:14px}.oneDriveSyncBody{display:grid;gap:12px;margin-top:12px;padding:15px;border:1px solid rgba(38,114,236,.38);border-radius:16px;background:rgba(38,114,236,.07)}.oneDriveSyncBody h2,.oneDriveSyncBody h3{margin:0}.oneDriveSyncNote,.oneDriveWarning{margin:0;opacity:.72;line-height:1.5}.oneDriveAccountRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.oneDriveAccountRow small{display:block;margin-top:3px;overflow-wrap:anywhere}.oneDriveAccountRow button,.oneDriveAction{min-height:44px;border:0;border-radius:11px;background:#2672ec;color:#fff;font:inherit;font-weight:800;padding:8px 12px}.oneDriveCount,.oneDriveStatus,.oneDriveMeta{padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.75)}.oneDriveCompareList{display:grid;gap:8px}.oneDriveCompareList article{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid rgba(38,114,236,.25);border-radius:10px;background:rgba(255,255,255,.75)}.oneDriveCompareList span{font-size:12px;font-weight:800}.oneDriveImportBox{display:grid;gap:8px;padding-top:10px;border-top:1px solid rgba(38,114,236,.25)}.oneDriveImportBox label{display:flex;gap:10px;align-items:center;padding:10px;border:1px solid rgba(38,114,236,.25);border-radius:10px}.oneDriveImportBox input{width:20px;height:20px}.theme-dark .oneDriveSyncBody,.theme-cyber .oneDriveSyncBody,.theme-luxury .oneDriveSyncBody,.theme-retro .oneDriveSyncBody,.theme-galaxy .oneDriveSyncBody{background:rgba(5,12,24,.85)}.theme-dark .oneDriveCount,.theme-dark .oneDriveStatus,.theme-dark .oneDriveMeta,.theme-dark .oneDriveCompareList article,.theme-cyber .oneDriveCount,.theme-cyber .oneDriveStatus,.theme-cyber .oneDriveMeta,.theme-cyber .oneDriveCompareList article,.theme-luxury .oneDriveCount,.theme-luxury .oneDriveStatus,.theme-retro .oneDriveCount,.theme-retro .oneDriveStatus,.theme-galaxy .oneDriveCount,.theme-galaxy .oneDriveStatus{background:rgba(5,12,24,.72)}@media(max-width:520px){.oneDriveAccountRow{grid-template-columns:1fr}.oneDriveAccountRow button{width:100%}}
      `}</style>
    </section>
  )
}
