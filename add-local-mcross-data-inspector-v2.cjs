const fs = require('fs');
const path = require('path');

const pagePath = path.join(process.cwd(), 'auth-test.html');
const backupPath = path.join(process.cwd(), 'auth-test.before-local-data-inspector-v2.html');
const MARKER = 'M-CROSS_LOCAL_DATA_INSPECTOR_V2';

if (!fs.existsSync(pagePath)) {
  console.error('ERROR: auth-test.html が見つかりません。');
  process.exit(1);
}

let s = fs.readFileSync(pagePath, 'utf8');
if (s.includes(MARKER)) {
  console.log('SKIP: 端末データ確認V2は適用済みです。');
  process.exit(0);
}

fs.copyFileSync(pagePath, backupPath);

// V1 markerをV2へ更新。画面UIはそのまま使う。
s = s.replace('M-CROSS_LOCAL_DATA_INSPECTOR_V1', MARKER);

const start = s.indexOf('  function looksLikeMCrossEntry(value) {');
const end = s.indexOf("\n  inspectLocal.addEventListener('click', () => {", start);
if (start < 0 || end < 0) {
  console.error('ERROR: V1の端末データ読取処理を特定できません。');
  process.exit(1);
}

const replacement = `  function looksLikeMCrossEntry(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
      && typeof value.propertyName === 'string'
      && Array.isArray(value.records)
  }

  function collectMCrossEntries() {
    const found = []
    const sources = []

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue

      try {
        const parsed = JSON.parse(raw)

        // M-Cross本体は保存物件を1件ずつlocalStorageへ保存している。
        if (looksLikeMCrossEntry(parsed)) {
          found.push({ ...parsed, storageKey: parsed.storageKey || key, __sourceKey: key })
          sources.push({ key, count: 1 })
          continue
        }

        // 将来の配列形式やバックアップ形式も読取だけ対応。
        const candidates = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.entries)
            ? parsed.entries
            : []
        const matching = candidates.filter(looksLikeMCrossEntry)
        if (matching.length > 0) {
          sources.push({ key, count: matching.length })
          matching.forEach(entry => found.push({ ...entry, storageKey: entry.storageKey || key, __sourceKey: key }))
        }
      } catch {
        // JSONではない設定値は対象外
      }
    }

    const unique = new Map()
    found.forEach(entry => {
      const identity = entry.storageKey
        || [entry.company, entry.propertyName, entry.unit, entry.updatedAt].map(value => String(value || '')).join('|')
      if (!unique.has(identity)) unique.set(identity, entry)
    })

    return { entries: [...unique.values()], sources }
  }
`;

s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(pagePath, s, 'utf8');

console.log('OK: 端末M-Crossデータ確認V2へ更新しました。');
console.log('1物件=localStorage 1件の実保存形式に対応しました。');
console.log('読取り専用です。端末データとM-Cross本体は変更しません。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
