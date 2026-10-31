const fs = require('fs');
const path = require('path');

const pagePath = path.join(process.cwd(), 'auth-test.html');
const backupPath = path.join(process.cwd(), 'auth-test.before-local-data-inspector-v1.html');
const MARKER = 'M-CROSS_LOCAL_DATA_INSPECTOR_V1';

if (!fs.existsSync(pagePath)) {
  console.error('ERROR: auth-test.html が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(pagePath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: M-Cross端末データ確認V1は適用済みです。');
  process.exit(0);
}

fs.copyFileSync(pagePath, backupPath);

const graphStatus = '  <div id="graphStatus">まだOneDriveにはアクセスしていません。</div>';
if ((source.split(graphStatus).length - 1) !== 1) {
  console.error('ERROR: 画面への追加位置を特定できません。');
  process.exit(1);
}

const inspectorUi = `${graphStatus}
  <!-- ${MARKER} -->
  <section id="localInspector">
    <h2>端末のM-Crossデータ確認</h2>
    <button id="inspectLocal" type="button">端末データを確認</button>
    <div id="localSummary">まだ確認していません。</div>
    <div id="localEntries"></div>
    <small>読取り専用です。端末データの削除・変更・OneDrive送信は行いません。</small>
  </section>`;
source = source.replace(graphStatus, inspectorUi);

const declarationAnchor = "  const graphStatus = document.querySelector('#graphStatus')";
if ((source.split(declarationAnchor).length - 1) !== 1) {
  console.error('ERROR: JavaScript追加位置を特定できません。');
  process.exit(1);
}

const declarations = `${declarationAnchor}
  const inspectLocal = document.querySelector('#inspectLocal')
  const localSummary = document.querySelector('#localSummary')
  const localEntries = document.querySelector('#localEntries')`;
source = source.replace(declarationAnchor, declarations);

const scriptEnd = '</script>\n</body>';
if ((source.split(scriptEnd).length - 1) !== 1) {
  console.error('ERROR: script終端を特定できません。');
  process.exit(1);
}

const inspectorScript = `

  function looksLikeMCrossEntry(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
      && ('propertyName' in value || 'storageKey' in value)
      && ('records' in value || 'cfRecords' in value || 'additionalWorks' in value)
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
        const candidates = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.entries)
            ? parsed.entries
            : []

        const matching = candidates.filter(looksLikeMCrossEntry)
        if (matching.length > 0) {
          sources.push({ key, count: matching.length })
          matching.forEach(entry => found.push({ ...entry, __sourceKey: key }))
        }
      } catch {
        // JSONではない設定値は確認対象外
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

  inspectLocal.addEventListener('click', () => {
    const { entries, sources } = collectMCrossEntries()
    localSummary.textContent = entries.length
      ? '保存物件 ' + entries.length + '件を確認しました。保存元: ' + sources.map(source => source.key + ' (' + source.count + '件)').join(' / ')
      : 'M-Crossの保存物件を確認できませんでした。このブラウザに保存データがない可能性があります。'

    localEntries.replaceChildren()
    entries
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, 20)
      .forEach(entry => {
        const card = document.createElement('article')
        const title = document.createElement('strong')
        const meta = document.createElement('small')
        const detail = document.createElement('small')

        title.textContent = (entry.propertyName || '物件名なし') + ' ' + (entry.unit || '') + '号室'
        meta.textContent = entry.company || '管理会社未設定'
        detail.textContent = 'クロス ' + (entry.records || []).length
          + '件 / CF ' + (entry.cfRecords || []).length
          + '件 / 追加作業 ' + (entry.additionalWorks || []).length + '件'

        card.append(title, meta, detail)
        localEntries.append(card)
      })
  })
`;
source = source.replace(scriptEnd, inspectorScript + '\n' + scriptEnd);

source = source.replace(
  'small{display:block;margin-top:12px;color:#666;line-height:1.5}',
  'small{display:block;margin-top:12px;color:#666;line-height:1.5} #localInspector{margin-top:18px;padding-top:16px;border-top:1px solid #ddd} #localSummary{margin-top:12px;padding:12px;border-radius:10px;background:#f2f6ff;overflow-wrap:anywhere} #localEntries{display:grid;gap:8px;margin-top:10px} #localEntries article{padding:10px 12px;border:1px solid #ddd;border-radius:10px;background:#fff} #localEntries article small{margin-top:3px}'
);

fs.writeFileSync(pagePath, source, 'utf8');
console.log('OK: 認証テスト画面へ端末M-Crossデータの読取り専用確認を追加しました。');
console.log('M-Cross本体 src/App.jsx と端末保存データは変更しません。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
