const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appPath = path.join(root, 'src', 'App.jsx');
const cleanBackupPath = path.join(root, 'src', 'App.jsx.before-microsoft-signin-test-v3');
const authPath = path.join(root, 'src', 'microsoftAuth.js');
const brokenBackupPath = path.join(root, 'src', 'App.jsx.before-repair-microsoft-signin-v3-duplicates');

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}
if (!fs.existsSync(cleanBackupPath)) {
  console.error('ERROR: 復旧用バックアップ src/App.jsx.before-microsoft-signin-test-v3 が見つかりません。');
  process.exit(1);
}
if (!fs.existsSync(authPath)) {
  console.error('ERROR: src/microsoftAuth.js が見つかりません。');
  process.exit(1);
}

fs.copyFileSync(appPath, brokenBackupPath);
fs.copyFileSync(cleanBackupPath, appPath);

let auth = fs.readFileSync(authPath, 'utf8');
const redirectBlock = `  const redirectResult = await microsoftAuth.handleRedirectPromise()\n  if (redirectResult?.account) microsoftAuth.setActiveAccount(redirectResult.account)\n`;
auth = auth.replace(redirectBlock, '');
fs.writeFileSync(authPath, auth, 'utf8');

const repaired = fs.readFileSync(appPath, 'utf8');
const importNeedle = "import { initializeMicrosoftAuth, signInMicrosoft, signOutMicrosoft } from './microsoftAuth'";
const importCount = repaired.split(importNeedle).length - 1;
const accountStateCount = (repaired.match(/const \[microsoftAccount, setMicrosoftAccount\]/g) || []).length;
const statusStateCount = (repaired.match(/const \[microsoftAuthStatus, setMicrosoftAuthStatus\]/g) || []).length;

if (importCount !== 1 || accountStateCount !== 1 || statusStateCount !== 1) {
  console.error(`ERROR: 復旧後の重複確認に失敗しました。import=${importCount}, accountState=${accountStateCount}, statusState=${statusStateCount}`);
  process.exit(1);
}

if (auth.includes('handleRedirectPromise')) {
  console.error('ERROR: microsoftAuth.js から handleRedirectPromise を削除できませんでした。');
  process.exit(1);
}

console.log('OK: V3で重複したMicrosoftサインイン実装を復旧しました。');
console.log('App.jsx: V3適用直前の正常状態へ戻しました。');
console.log('microsoftAuth.js: ポップアップ認証専用へ修正しました。');
console.log('BROKEN BACKUP:', brokenBackupPath);
console.log('NEXT: npm run dev');
