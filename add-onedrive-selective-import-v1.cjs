const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'auth-test.html');
const backup = path.join(process.cwd(), 'auth-test.before-selective-import-v1.html');
const MARK='M-CROSS_ONEDRIVE_SELECTIVE_IMPORT_V1';
if(!fs.existsSync(p)){console.error('ERROR: auth-test.html が見つかりません。');process.exit(1)}
let s=fs.readFileSync(p,'utf8');
if(s.includes(MARK)){console.log('SKIP: 選択取込V1は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_ONEDRIVE_COMPARE_ONLY_V1')){console.error('ERROR: 先に比較V1を適用してください。');process.exit(1)}
fs.copyFileSync(p,backup);
const anchor='    <small>比較だけ行います。端末・OneDriveのデータは変更しません。</small>\n  </section>';
if(!s.includes(anchor)){console.error('ERROR: 取込UIの追加位置が見つかりません。');process.exit(1)}
const ui=`${anchor}
  <!-- ${MARK} -->
  <section id="importPanel">
    <h2>OneDriveから選択して取り込む</h2>
    <p>「OneDriveのみ」「OneDriveが新しい」物件だけ候補にします。</p>
    <button id="prepareImport" type="button">取込候補を確認</button>
    <div id="importCandidates"></div>
    <button id="importSelected" type="button" disabled>選択した物件を取り込む</button>
    <div id="importStatus">まだ取り込んでいません。</div>
    <small>「同じ」「端末が新しい」物件は対象外です。実行前に確認画面を出します。</small>
  </section>`;
s=s.replace(anchor,ui);
const da="  const compareList = document.querySelector('#compareList')";
if(!s.includes(da)){console.error('ERROR: JS挿入位置が見つかりません。');process.exit(1)}
s=s.replace(da,`${da}
  const prepareImport = document.querySelector('#prepareImport')
  const importCandidates = document.querySelector('#importCandidates')
  const importSelected = document.querySelector('#importSelected')
  const importStatus = document.querySelector('#importStatus')
  let pendingCloudEntries = []`);
const end='</script>\n</body>';
if(!s.includes(end)){console.error('ERROR: script終端が見つかりません。');process.exit(1)}
const handler=`

  async function loadCloudBackup() {
    const accessToken = await getGraphAccessToken()
    const response = await fetch(backupFileUrl, { headers: { Authorization: 'Bearer ' + accessToken } })
    if (!response.ok) throw new Error('OneDrive読込失敗 HTTP ' + response.status)
    const cloud = await response.json()
    if (cloud?.fileType !== 'm-cross-backup' || !Array.isArray(cloud.entries)) throw new Error('M-Crossバックアップ形式ではありません。')
    return cloud
  }

  prepareImport.addEventListener('click', async () => {
    try {
      importStatus.textContent = '取込候補を確認しています…'
      importCandidates.replaceChildren()
      const local = collectMCrossEntries().entries
      const cloud = await loadCloudBackup()
      const localMap = new Map(local.map(entry => [entry.storageKey, entry]))
      pendingCloudEntries = cloud.entries.filter(entry => {
        if (!entry.storageKey || !String(entry.storageKey).startsWith('m-cross:')) return false
        const localEntry = localMap.get(entry.storageKey)
        if (!localEntry) return true
        return new Date(entry.updatedAt || 0).getTime() > new Date(localEntry.updatedAt || 0).getTime()
      })

      pendingCloudEntries.forEach((entry, index) => {
        const label = document.createElement('label')
        label.className = 'importCandidate'
        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.dataset.index = String(index)
        const text = document.createElement('span')
        const localEntry = localMap.get(entry.storageKey)
        text.textContent = (entry.propertyName || '物件名なし') + ' ' + (entry.unit || '') + '号室 - ' + (localEntry ? 'OneDriveが新しい' : 'OneDriveのみ')
        label.append(checkbox, text)
        importCandidates.append(label)
      })
      importSelected.disabled = pendingCloudEntries.length === 0
      importStatus.textContent = pendingCloudEntries.length ? '取込候補 ' + pendingCloudEntries.length + '件。取り込む物件だけチェックしてください。' : '安全に取り込める候補はありません。'
    } catch(error){console.error(error);importStatus.textContent='候補確認失敗: '+(error?.message||String(error))}
  })

  importSelected.addEventListener('click', () => {
    const indexes = [...importCandidates.querySelectorAll('input[type="checkbox"]:checked')].map(input => Number(input.dataset.index))
    const selected = indexes.map(index => pendingCloudEntries[index]).filter(Boolean)
    if (!selected.length) { importStatus.textContent = '取り込む物件を選択してください。'; return }
    const names = selected.map(entry => (entry.propertyName || '物件名なし') + ' ' + (entry.unit || '') + '号室').join('\n')
    if (!window.confirm('次の' + selected.length + '件をこの端末へ取り込みます。\n\n' + names + '\n\n続けますか？')) return
    try {
      selected.forEach(entry => {
        const clean = { ...entry }
        delete clean.__sourceKey
        localStorage.setItem(entry.storageKey, JSON.stringify(clean))
      })
      importStatus.textContent = '取込成功: ' + selected.length + '件。M-Crossを開き直すと保存済み一覧に反映されます。'
      importSelected.disabled = true
    } catch(error){console.error(error);importStatus.textContent='取込失敗: '+(error?.message||String(error))}
  })
`;
s=s.replace(end,handler+'\n'+end);
s=s.replace('#localInspector,#backupPanel,#comparePanel{','#localInspector,#backupPanel,#comparePanel,#importPanel{');
s=s.replace('#localSummary,#backupStatus,#compareSummary{','#localSummary,#backupStatus,#compareSummary,#importStatus{');
s=s.replace('</style>',' .importCandidate{display:flex;gap:10px;align-items:center;margin:8px 0;padding:10px;border:1px solid #ddd;border-radius:10px}.importCandidate input{width:20px;height:20px} </style>');
fs.writeFileSync(p,s,'utf8');
console.log('OK: OneDriveから選択して取り込むV1を追加しました。');
console.log('候補: OneDriveのみ / OneDriveが新しい物件だけ。');
console.log('同じ / 端末が新しい物件は変更しません。');
console.log('M-Cross本体 src/App.jsx は変更していません。');
console.log('BACKUP:',backup);
console.log('NEXT: npm run dev');
