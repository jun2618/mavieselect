const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'auth-test.html');
const backup = path.join(process.cwd(), 'auth-test.before-onedrive-compare-only-v1.html');
const MARK='M-CROSS_ONEDRIVE_COMPARE_ONLY_V1';
if(!fs.existsSync(p)){console.error('ERROR: auth-test.html が見つかりません。');process.exit(1)}
let s=fs.readFileSync(p,'utf8');
if(s.includes(MARK)){console.log('SKIP: 比較専用V1は適用済みです。');process.exit(0)}
fs.copyFileSync(p,backup);
const anchor='    <small>端末側の物件は変更・削除しません。OneDriveから端末への取込みも行いません。</small>\n  </section>';
if(!s.includes(anchor)){console.error('ERROR: 比較UIの挿入位置が見つかりません。');process.exit(1)}
const ui=`${anchor}
  <!-- ${MARK} -->
  <section id="comparePanel">
    <h2>端末 ⇄ OneDrive 比較</h2>
    <button id="compareOnly" type="button">端末とOneDriveを比較</button>
    <div id="compareSummary">まだ比較していません。</div>
    <div id="compareList"></div>
    <small>比較だけ行います。端末・OneDriveのデータは変更しません。</small>
  </section>`;
s=s.replace(anchor,ui);
const da="  const backupStatus = document.querySelector('#backupStatus')";
if(!s.includes(da)){console.error('ERROR: JS挿入位置が見つかりません。');process.exit(1)}
s=s.replace(da,`${da}
  const compareOnly = document.querySelector('#compareOnly')
  const compareSummary = document.querySelector('#compareSummary')
  const compareList = document.querySelector('#compareList')`);
const end='</script>\n</body>';
const handler=`

  compareOnly.addEventListener('click', async () => {
    try {
      compareSummary.textContent = '比較しています…'
      compareList.replaceChildren()
      const local = collectMCrossEntries().entries
      const accessToken = await getGraphAccessToken()
      const response = await fetch(backupFileUrl, { headers: { Authorization: 'Bearer ' + accessToken } })
      if (!response.ok) throw new Error('OneDrive読込失敗 HTTP ' + response.status)
      const cloud = await response.json()
      if (cloud?.fileType !== 'm-cross-backup' || !Array.isArray(cloud.entries)) throw new Error('M-Crossバックアップ形式ではありません。')
      const byKey = entries => new Map(entries.map(entry => [entry.storageKey || [entry.company,entry.propertyName,entry.unit].join('|'), entry]))
      const lm=byKey(local), cm=byKey(cloud.entries)
      const keys=[...new Set([...lm.keys(),...cm.keys()])]
      let same=0, localNewer=0, cloudNewer=0, localOnly=0, cloudOnly=0
      keys.forEach(key=>{
        const l=lm.get(key), c=cm.get(key)
        let label='同じ'
        if(l&&!c){label='端末のみ';localOnly++}
        else if(!l&&c){label='OneDriveのみ';cloudOnly++}
        else {
          const lt=new Date(l.updatedAt||0).getTime(), ct=new Date(c.updatedAt||0).getTime()
          if(lt>ct){label='端末が新しい';localNewer++}
          else if(ct>lt){label='OneDriveが新しい';cloudNewer++}
          else {same++}
        }
        const e=l||c
        const card=document.createElement('article')
        const title=document.createElement('strong'); title.textContent=(e.propertyName||'物件名なし')+' '+(e.unit||'')+'号室'
        const state=document.createElement('small'); state.textContent=label
        card.append(title,state); compareList.append(card)
      })
      compareSummary.textContent='端末 '+local.length+'件 / OneDrive '+cloud.entries.length+'件 / 同じ '+same+' / 端末が新しい '+localNewer+' / OneDriveが新しい '+cloudNewer+' / 端末のみ '+localOnly+' / OneDriveのみ '+cloudOnly
    } catch(error){console.error(error);compareSummary.textContent='比較失敗: '+(error?.message||String(error))}
  })
`;
if(!s.includes(end)){console.error('ERROR: script終端が見つかりません。');process.exit(1)}
s=s.replace(end,handler+'\n'+end);
s=s.replace('#localInspector,#backupPanel{','#localInspector,#backupPanel,#comparePanel{');
s=s.replace('#localSummary,#backupStatus{','#localSummary,#backupStatus,#compareSummary{');
s=s.replace('#localEntries{display:grid;','#localEntries,#compareList{display:grid;');
s=s.replace('#localEntries article{','#localEntries article,#compareList article{');
s=s.replace('#localEntries article small{','#localEntries article small,#compareList article small{');
fs.writeFileSync(p,s,'utf8');
console.log('OK: 端末とOneDriveの比較専用V1を追加しました。');
console.log('比較のみで、端末・OneDriveとも変更しません。');
console.log('BACKUP:',backup);
console.log('NEXT: npm run dev');
