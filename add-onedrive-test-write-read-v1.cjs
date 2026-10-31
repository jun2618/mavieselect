const fs = require('fs');
const path = require('path');

const pagePath = path.join(process.cwd(), 'auth-test.html');
const backupPath = path.join(process.cwd(), 'auth-test.before-onedrive-write-read-v1.html');
const MARKER = 'M-CROSS_ONEDRIVE_WRITE_READ_TEST_V1';

if (!fs.existsSync(pagePath)) {
  console.error('ERROR: auth-test.html が見つかりません。先に認証サンドボックスV1を適用してください。');
  process.exit(1);
}

let s = fs.readFileSync(pagePath, 'utf8');
if (s.includes(MARKER)) {
  console.log('SKIP: OneDrive書込・読込テストV1は適用済みです。');
  process.exit(0);
}

fs.copyFileSync(pagePath, backupPath);

const statusBlock = '  <div id="status">未サインイン</div>';
if ((s.split(statusBlock).length - 1) !== 1) {
  console.error('ERROR: テスト画面の状態表示位置を特定できません。');
  process.exit(1);
}

const extraUi = `${statusBlock}
  <!-- ${MARKER} -->
  <button id="writeTest" type="button" disabled>OneDriveへTESTを保存</button>
  <button id="readTest" type="button" disabled>OneDriveからTESTを読む</button>
  <div id="graphStatus">まだOneDriveにはアクセスしていません。</div>`;
s = s.replace(statusBlock, extraUi);

const scriptAnchor = "  const login = document.querySelector('#login')";
if ((s.split(scriptAnchor).length - 1) !== 1) {
  console.error('ERROR: JavaScript挿入位置を特定できません。');
  process.exit(1);
}

const declarations = `${scriptAnchor}
  const writeTest = document.querySelector('#writeTest')
  const readTest = document.querySelector('#readTest')
  const graphStatus = document.querySelector('#graphStatus')
  const graphScopes = ['Files.ReadWrite.AppFolder']
  const graphFileUrl = 'https://graph.microsoft.com/v1.0/me/drive/special/approot:/m-cross-test.json:/content'

  function setSignedInState(account) {
    const signedIn = Boolean(account)
    writeTest.disabled = !signedIn
    readTest.disabled = !signedIn
    if (signedIn) status.textContent = 'サインイン済み: ' + account.username
  }

  async function getGraphAccessToken() {
    const account = msal.getAllAccounts()[0]
    if (!account) throw new Error('先にMicrosoftへサインインしてください')
    try {
      const result = await msal.acquireTokenSilent({ scopes: graphScopes, account })
      return result.accessToken
    } catch (error) {
      const result = await msal.acquireTokenPopup({ scopes: graphScopes, account })
      return result.accessToken
    }
  }`;
s = s.replace(scriptAnchor, declarations);

s = s.replace(
  "  if (existing) status.textContent = 'サインイン済み: ' + existing.username",
  "  if (existing) setSignedInState(existing)"
);

s = s.replace(
  "      status.textContent = 'サインイン成功: ' + (result.account?.username || 'アカウント取得済み')",
  "      status.textContent = 'サインイン成功: ' + (result.account?.username || 'アカウント取得済み')\n      setSignedInState(result.account)"
);

const bodyEnd = '</script>\n</body>';
if ((s.split(bodyEnd).length - 1) !== 1) {
  console.error('ERROR: script終端を特定できません。');
  process.exit(1);
}

const handlers = `

  writeTest.addEventListener('click', async () => {
    try {
      graphStatus.textContent = 'OneDriveへTESTを保存しています…'
      const accessToken = await getGraphAccessToken()
      const payload = {
        fileType: 'm-cross-test',
        message: 'TEST',
        createdAt: new Date().toISOString(),
        source: 'M-Cross auth sandbox',
      }
      const response = await fetch(graphFileUrl, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(payload, null, 2),
      })
      if (!response.ok) throw new Error('保存失敗 HTTP ' + response.status + ': ' + await response.text())
      const item = await response.json()
      graphStatus.textContent = '保存成功: ' + (item.name || 'm-cross-test.json')
    } catch (error) {
      console.error(error)
      graphStatus.textContent = '保存失敗: ' + (error?.message || String(error))
    }
  })

  readTest.addEventListener('click', async () => {
    try {
      graphStatus.textContent = 'OneDriveからTESTを読み込んでいます…'
      const accessToken = await getGraphAccessToken()
      const response = await fetch(graphFileUrl, {
        headers: { Authorization: 'Bearer ' + accessToken },
      })
      if (!response.ok) throw new Error('読込失敗 HTTP ' + response.status + ': ' + await response.text())
      const data = await response.json()
      graphStatus.textContent = '読込成功: ' + JSON.stringify(data)
    } catch (error) {
      console.error(error)
      graphStatus.textContent = '読込失敗: ' + (error?.message || String(error))
    }
  })
`;
s = s.replace(bodyEnd, handlers + '\n' + bodyEnd);

s = s.replace(
  '#status{margin-top:16px;padding:12px;border-radius:10px;background:#eef4ff;overflow-wrap:anywhere}',
  '#status,#graphStatus{margin-top:16px;padding:12px;border-radius:10px;background:#eef4ff;overflow-wrap:anywhere} button:disabled{opacity:.45;cursor:not-allowed}'
);

fs.writeFileSync(pagePath, s, 'utf8');
console.log('OK: OneDriveのTEST書込・読込ボタンを認証サンドボックスへ追加しました。');
console.log('対象ファイル: m-cross-test.json');
console.log('M-Cross本体 src/App.jsx は変更していません。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
