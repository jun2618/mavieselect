const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appPath = path.join(root, 'src', 'App.jsx');
const authPath = path.join(root, 'src', 'microsoftAuth.js');
const backupPath = path.join(root, 'src', 'App.jsx.before-microsoft-signin-test-v3');
const MARKER = '/* M-CROSS_MICROSOFT_SIGNIN_TEST_V3 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: MicrosoftサインインテストV3は適用済みです。');
  process.exit(0);
}

function replaceOnce(label, oldText, newText) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) {
    console.error(`ERROR: ${label} の対象が ${count} 件でした。安全のため中止しました。`);
    process.exit(1);
  }
  source = source.replace(oldText, newText);
}

const authModule = `import { PublicClientApplication } from '@azure/msal-browser'

const msalConfig = {
  auth: {
    clientId: '783680c7-c4fc-4028-bacd-e25497f40334',
    authority: 'https://login.microsoftonline.com/3ac7d9e7-5765-41cc-8e82-3c27d62cea00',
    redirectUri: window.location.origin + '/',
    postLogoutRedirectUri: window.location.origin + '/',
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
}

const loginRequest = {
  scopes: ['User.Read', 'Files.ReadWrite.AppFolder'],
}

export const microsoftAuth = new PublicClientApplication(msalConfig)
let initialized = false

export async function initializeMicrosoftAuth() {
  if (!initialized) {
    await microsoftAuth.initialize()
    initialized = true
  }
  const account = microsoftAuth.getActiveAccount() || microsoftAuth.getAllAccounts()[0] || null
  if (account) microsoftAuth.setActiveAccount(account)
  return account
}

export async function signInMicrosoft() {
  await initializeMicrosoftAuth()
  const result = await microsoftAuth.loginPopup(loginRequest)
  microsoftAuth.setActiveAccount(result.account)
  return result.account
}

export async function signOutMicrosoft() {
  await initializeMicrosoftAuth()
  const account = microsoftAuth.getActiveAccount() || microsoftAuth.getAllAccounts()[0]
  if (!account) return
  await microsoftAuth.logoutPopup({ account, postLogoutRedirectUri: window.location.origin + '/' })
}

export function getMicrosoftAccount() {
  return microsoftAuth.getActiveAccount() || microsoftAuth.getAllAccounts()[0] || null
}
`;

// Import after existing imports.
const importAnchor = "import properties from './m-cross-properties.json'";
replaceOnce(
  'import位置',
  importAnchor,
  importAnchor + "\nimport { initializeMicrosoftAuth, signInMicrosoft, signOutMicrosoft } from './microsoftAuth'"
);

// Add account state close to saved-list state.
const stateAnchor = "  const [showSavedList, setShowSavedList] = useState(false)";
replaceOnce(
  'Microsoftアカウントstate',
  stateAnchor,
  stateAnchor + "\n  const [microsoftAccount, setMicrosoftAccount] = useState(null)\n  const [microsoftAuthStatus, setMicrosoftAuthStatus] = useState('')"
);

// Add initialization effect before a stable existing effect.
const authEffect = `  ${MARKER}
  useEffect(() => {
    let active = true
    initializeMicrosoftAuth()
      .then(account => { if (active) setMicrosoftAccount(account) })
      .catch(error => { console.error(error); if (active) setMicrosoftAuthStatus('Microsoft認証の初期化に失敗しました') })
    return () => { active = false }
  }, [])

  async function handleMicrosoftSignIn() {
    try {
      setMicrosoftAuthStatus('Microsoftに接続しています…')
      const account = await signInMicrosoft()
      setMicrosoftAccount(account)
      setMicrosoftAuthStatus('Microsoftにサインインしました')
    } catch (error) {
      console.error(error)
      setMicrosoftAuthStatus(error?.errorCode === 'user_cancelled' ? 'サインインをキャンセルしました' : 'Microsoftサインインに失敗しました')
    }
  }

  async function handleMicrosoftSignOut() {
    try {
      await signOutMicrosoft()
      setMicrosoftAccount(null)
      setMicrosoftAuthStatus('Microsoftからサインアウトしました')
    } catch (error) {
      console.error(error)
      setMicrosoftAuthStatus('Microsoftサインアウトに失敗しました')
    }
  }

`;
const mainAppStateAnchor = "  const [showSplash, setShowSplash] = useState(() => loadPlaySettings().splash)";
replaceOnce('認証初期化位置', mainAppStateAnchor, authEffect + mainAppStateAnchor);

// Add optional sign-in panel before existing settings button on the top screen.
const settingsButton = `<button className="secondaryButton" type="button" onClick={() => { setSettingsPage('home'); setSettingsOpen(true) }}>⚙ M-Cross設定</button>`;
const panel = `<section className="microsoftConnectPanel">
                <div>
                  <strong>☁ OneDrive同期</strong>
                  <small>{microsoftAccount ? microsoftAccount.username : '同期を使う人だけMicrosoftへサインイン'}</small>
                </div>
                {microsoftAccount ? (
                  <button type="button" onClick={handleMicrosoftSignOut}>サインアウト</button>
                ) : (
                  <button type="button" onClick={handleMicrosoftSignIn}>Microsoftでサインイン</button>
                )}
                {microsoftAuthStatus && <p>{microsoftAuthStatus}</p>}
                <em>現在はサインイン確認だけです。保存データの送受信はまだ行いません。</em>
              </section>
              `;
replaceOnce('トップ画面の設定ボタン', settingsButton, panel + settingsButton);

const styleAnchor = source.includes('<style>{appStyles}</style>')
  ? '<style>{appStyles}</style>'
  : (source.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);
if (!styleAnchor) {
  console.error('ERROR: style要素を特定できません。');
  process.exit(1);
}

const css = `
.microsoftConnectPanel{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 12px;align-items:center;margin:14px 0;padding:13px;border:1px solid rgba(70,140,220,.42);border-radius:16px;background:rgba(70,140,220,.08)}
.microsoftConnectPanel strong,.microsoftConnectPanel small{display:block}.microsoftConnectPanel small{margin-top:4px;opacity:.72;font-size:11px;overflow-wrap:anywhere}.microsoftConnectPanel button{min-height:42px;padding:8px 12px;border:0;border-radius:10px;background:#2672ec;color:#fff;font:inherit;font-weight:800;cursor:pointer}.microsoftConnectPanel p,.microsoftConnectPanel em{grid-column:1/-1;margin:0;font-size:11px;line-height:1.45}.microsoftConnectPanel em{opacity:.68;font-style:normal}.theme-dark .microsoftConnectPanel,.theme-cyber .microsoftConnectPanel,.theme-luxury .microsoftConnectPanel,.theme-retro .microsoftConnectPanel,.theme-galaxy .microsoftConnectPanel{background:rgba(5,12,24,.78)}@media(max-width:520px){.microsoftConnectPanel{grid-template-columns:1fr}.microsoftConnectPanel button{width:100%}}
`;
source = source.replace(styleAnchor, styleAnchor + '\n      <style>{`' + css + '`}</style>');

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(authPath, authModule, 'utf8');
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: MicrosoftサインインテストV3を追加しました。');
console.log('src/microsoftAuth.js を作成しました。');
console.log('この段階ではOneDriveへデータを送受信しません。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
