const fs = require('fs');
const path = require('path');
const pagePath = path.join(process.cwd(), 'auth-test.html');
const backupPath = path.join(process.cwd(), 'auth-test.before-local-data-inspector-v3.html');
const MARKER = 'M-CROSS_LOCAL_DATA_INSPECTOR_V3';
if (!fs.existsSync(pagePath)) { console.error('ERROR: auth-test.html が見つかりません。'); process.exit(1); }
let s = fs.readFileSync(pagePath, 'utf8');
if (s.includes(MARKER)) { console.log('SKIP: 端末データ確認V3は適用済みです。'); process.exit(0); }
fs.copyFileSync(pagePath, backupPath);
s = s.replace('M-CROSS_LOCAL_DATA_INSPECTOR_V2', MARKER);
const start = s.indexOf('  function collectMCrossEntries() {');
const end = s.indexOf("\n  inspectLocal.addEventListener('click', () => {", start);
if (start < 0 || end < 0) { console.error('ERROR: V2の読取処理を特定できません。'); process.exit(1); }
const replacement = `  function collectMCrossEntries() {
    const storagePrefix = 'm-cross:'
    const entries = []
    const sources = []

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key || !key.startsWith(storagePrefix)) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue

      try {
        const data = JSON.parse(raw)
        if (data && Array.isArray(data.records)) {
          entries.push({ ...data, archived: Boolean(data.archived), storageKey: key, __sourceKey: key })
          sources.push({ key, count: 1 })
        }
      } catch {
        // M-Cross本体と同じく、読み込めないデータは除外
      }
    }

    entries.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    return { entries, sources }
  }
`;
s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(pagePath, s, 'utf8');
console.log('OK: 端末データ確認V3へ更新しました。');
console.log('正式保存キー m-cross: だけを対象にします。');
console.log('m-cross-last-session や作業中データは対象外です。');
console.log('M-Cross本体と端末データは変更しません。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
