const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'auth-test.html');
const backup = path.join(process.cwd(), 'auth-test.before-selective-import-v2.html');
const MARK = 'M-CROSS_ONEDRIVE_SELECTIVE_IMPORT_V2';
if (!fs.existsSync(p)) { console.error('ERROR: auth-test.html が見つかりません。'); process.exit(1); }
let s = fs.readFileSync(p, 'utf8');
if (s.includes(MARK)) { console.log('SKIP: 選択取込V2は適用済みです。'); process.exit(0); }
if (!s.includes('M-CROSS_ONEDRIVE_SELECTIVE_IMPORT_V1')) { console.error('ERROR: 選択取込V1が見つかりません。'); process.exit(1); }
fs.copyFileSync(p, backup);

// The V1 generator accidentally emitted real newlines inside JS string literals.
// Replace the complete importSelected handler with a safe version using array join '\\n'.
const start = s.indexOf("  importSelected.addEventListener('click', () => {");
const end = s.indexOf("\n</script>", start);
if (start < 0 || end < 0) { console.error('ERROR: 取込ハンドラーを特定できません。'); process.exit(1); }
const safeHandler = `  importSelected.addEventListener('click', () => {
    const indexes = [...importCandidates.querySelectorAll('input[type="checkbox"]:checked')]
      .map(input => Number(input.dataset.index))
    const selected = indexes.map(index => pendingCloudEntries[index]).filter(Boolean)
    if (!selected.length) {
      importStatus.textContent = '取り込む物件を選択してください。'
      return
    }

    const names = selected.map(entry =>
      (entry.propertyName || '物件名なし') + ' ' + (entry.unit || '') + '号室'
    )
    const confirmMessage = [
      '次の' + selected.length + '件をこの端末へ取り込みます。',
      '',
      ...names,
      '',
      '続けますか？',
    ].join('\\n')

    if (!window.confirm(confirmMessage)) return

    try {
      selected.forEach(entry => {
        const clean = { ...entry }
        delete clean.__sourceKey
        localStorage.setItem(entry.storageKey, JSON.stringify(clean))
      })
      importStatus.textContent = '取込成功: ' + selected.length + '件。M-Crossを開き直すと保存済み一覧に反映されます。'
      importSelected.disabled = true
    } catch (error) {
      console.error(error)
      importStatus.textContent = '取込失敗: ' + (error?.message || String(error))
    }
  })
`;
s = s.slice(0, start) + safeHandler + s.slice(end);
s = s.replace('M-CROSS_ONEDRIVE_SELECTIVE_IMPORT_V1', 'M-CROSS_ONEDRIVE_SELECTIVE_IMPORT_V1\n  M-CROSS_ONEDRIVE_SELECTIVE_IMPORT_V2');
fs.writeFileSync(p, s, 'utf8');
console.log('OK: 選択取込V2で文字列エラーを修正しました。');
console.log('M-Cross本体 src/App.jsx は変更していません。');
console.log('BACKUP:', backup);
console.log('NEXT: npm run dev');
