const fs = require('fs');
const path = require('path');

const pagePath = path.join(process.cwd(), 'auth-test.html');
const backupPath = path.join(process.cwd(), 'auth-test.before-mcross-backup-v1.html');
const MARKER = 'M-CROSS_ONEDRIVE_MCROSS_BACKUP_V1';

if (!fs.existsSync(pagePath)) {
  console.error('ERROR: auth-test.html が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(pagePath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: M-Cross OneDriveバックアップV1は適用済みです。');
  process.exit(0);
}
if (!source.includes('M-CROSS_LOCAL_DATA_INSPECTOR_V3')) {
  console.error('ERROR: 先に端末データ確認V3を適用してください。');
  process.exit(1);
}

fs.copyFileSync(pagePath, backupPath);

const inspectorEnd = `    <small>読取り専用です。端末データの削除・変更・OneDrive送信は行いません。</small>
  </section>`;
if ((source.split(inspectorEnd).length - 1) !== 1) {
  console.error('ERROR: バックアップ画面の追加位置を特定できません。');
  process.exit(1);
}

const backupUi = `${inspectorEnd}
  <!-- ${MARKER} -->
  <section id="backupPanel">
    <h2>M-Cross OneDriveバックアップ</h2>
    <p>正式保存の物件だけを、OneDriveへ一方向でバックアップします。</p>
    <button id="backupMCross" type="button">端末データをOneDriveへバックアップ</button>
    <button id="inspectBackup" type="button">OneDriveバックアップ内容を確認</button>
    <div id="backupStatus">まだM-CrossデータをOneDriveへバックアップしていません。</div>
    <small>端末側の物件は変更・削除しません。OneDriveから端末への取込みも行いません。</small>
  </section>`;
source = source.replace(inspectorEnd, backupUi);

const declarationAnchor = "  const localEntries = document.querySelector('#localEntries')";
if ((source.split(declarationAnchor).length - 1) !== 1) {
  console.error('ERROR: JavaScript追加位置を特定できません。');
  process.exit(1);
}
source = source.replace(declarationAnchor, `${declarationAnchor}
  const backupMCross = document.querySelector('#backupMCross')
  const inspectBackup = document.querySelector('#inspectBackup')
  const backupStatus = document.querySelector('#backupStatus')
  const backupFileUrl = 'https://graph.microsoft.com/v1.0/me/drive/special/approot:/m-cross-backup.json:/content'`);

const scriptEnd = '</script>\n</body>';
if ((source.split(scriptEnd).length - 1) !== 1) {
  console.error('ERROR: script終端を特定できません。');
  process.exit(1);
}

const handlers = `

  backupMCross.addEventListener('click', async () => {
    try {
      const { entries } = collectMCrossEntries()
      if (entries.length === 0) {
        backupStatus.textContent = 'バックアップ対象の正式保存物件がありません。'
        return
      }

      const label = entries.length + '件をOneDriveへバックアップします。端末データは変更しません。続けますか？'
      if (!window.confirm(label)) {
        backupStatus.textContent = 'バックアップをキャンセルしました。'
        return
      }

      backupStatus.textContent = 'OneDriveへバックアップしています…'
      const accessToken = await getGraphAccessToken()
      const payload = {
        fileType: 'm-cross-backup',
        version: 1,
        exportedAt: new Date().toISOString(),
        entryCount: entries.length,
        entries: entries.map(entry => {
          const clean = { ...entry }
          delete clean.__sourceKey
          return clean
        }),
      }

      const response = await fetch(backupFileUrl, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(payload, null, 2),
      })
      if (!response.ok) throw new Error('バックアップ失敗 HTTP ' + response.status + ': ' + await response.text())
      const item = await response.json()
      backupStatus.textContent = 'バックアップ成功: ' + entries.length + '件 / ' + (item.name || 'm-cross-backup.json')
    } catch (error) {
      console.error(error)
      backupStatus.textContent = 'バックアップ失敗: ' + (error?.message || String(error))
    }
  })

  inspectBackup.addEventListener('click', async () => {
    try {
      backupStatus.textContent = 'OneDriveのバックアップを確認しています…'
      const accessToken = await getGraphAccessToken()
      const response = await fetch(backupFileUrl, {
        headers: { Authorization: 'Bearer ' + accessToken },
      })
      if (response.status === 404) {
        backupStatus.textContent = 'OneDriveにm-cross-backup.jsonはまだありません。'
        return
      }
      if (!response.ok) throw new Error('確認失敗 HTTP ' + response.status + ': ' + await response.text())
      const data = await response.json()
      if (data?.fileType !== 'm-cross-backup' || !Array.isArray(data.entries)) {
        throw new Error('M-Crossバックアップ形式ではありません。')
      }
      const names = data.entries.slice(0, 5).map(entry => (entry.propertyName || '物件名なし') + ' ' + (entry.unit || '') + '号室')
      backupStatus.textContent = 'OneDrive確認成功: ' + data.entries.length + '件 / 保存日時 ' + (data.exportedAt || '不明') + ' / ' + names.join('、')
    } catch (error) {
      console.error(error)
      backupStatus.textContent = '確認失敗: ' + (error?.message || String(error))
    }
  })
`;
source = source.replace(scriptEnd, handlers + '\n' + scriptEnd);

source = source.replace(
  '#localInspector{margin-top:18px;padding-top:16px;border-top:1px solid #ddd}',
  '#localInspector,#backupPanel{margin-top:18px;padding-top:16px;border-top:1px solid #ddd}'
);
source = source.replace(
  '#localSummary{margin-top:12px;padding:12px;border-radius:10px;background:#f2f6ff;overflow-wrap:anywhere}',
  '#localSummary,#backupStatus{margin-top:12px;padding:12px;border-radius:10px;background:#f2f6ff;overflow-wrap:anywhere}'
);

fs.writeFileSync(pagePath, source, 'utf8');
console.log('OK: M-Cross正式保存データのOneDriveバックアップV1を追加しました。');
console.log('保存先: m-cross-backup.json');
console.log('一方向バックアップのみで、端末への取込みはありません。');
console.log('M-Cross本体 src/App.jsx は変更していません。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
