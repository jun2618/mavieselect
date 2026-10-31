const fs = require('fs');
const path = require('path');

const authPath = path.join(process.cwd(), 'src', 'microsoftAuth.js');
const backupPath = path.join(process.cwd(), 'src', 'microsoftAuth.js.before-signin-redirect-v4');
const MARKER = '// M-CROSS_MICROSOFT_SIGNIN_REDIRECT_V4';

if (!fs.existsSync(authPath)) {
  console.error('ERROR: src/microsoftAuth.js が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(authPath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: MicrosoftサインインRedirect V4は適用済みです。');
  process.exit(0);
}

fs.copyFileSync(authPath, backupPath);

const initializeStart = source.indexOf('export async function initializeMicrosoftAuth() {');
const signInStart = source.indexOf('export async function signInMicrosoft() {');
const signOutStart = source.indexOf('export async function signOutMicrosoft() {');

if (initializeStart < 0 || signInStart < 0 || signOutStart < 0) {
  console.error('ERROR: Microsoft認証関数を特定できません。変更を中止しました。');
  process.exit(1);
}

const prefix = source.slice(0, initializeStart);
const suffix = source.slice(signOutStart);

const replacement = `${MARKER}
export async function initializeMicrosoftAuth() {
  if (!initialized) {
    await microsoftAuth.initialize()
    initialized = true
  }

  let redirectResult = null
  try {
    redirectResult = await microsoftAuth.handleRedirectPromise()
  } catch (error) {
    if (error?.errorCode !== 'no_token_request_cache_error') throw error
  }

  if (redirectResult?.account) microsoftAuth.setActiveAccount(redirectResult.account)
  const account = microsoftAuth.getActiveAccount() || microsoftAuth.getAllAccounts()[0] || null
  if (account) microsoftAuth.setActiveAccount(account)
  return account
}

export async function signInMicrosoft() {
  await initializeMicrosoftAuth()
  await microsoftAuth.loginRedirect({
    ...loginRequest,
    redirectUri: window.location.origin + '/',
  })
  return null
}

`;

source = prefix + replacement + suffix;
fs.writeFileSync(authPath, source, 'utf8');

console.log('OK: Microsoftサインインを画面遷移方式へ変更しました。');
console.log('ポップアップを使わないため block_nested_popups を回避します。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
