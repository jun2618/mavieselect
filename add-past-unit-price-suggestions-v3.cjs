const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-past-unit-price-suggestions-v3');
const MARKER = '/* M-CROSS_PAST_UNIT_PRICE_SUGGESTIONS_V3 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: 過去単価候補V3はすでに適用済みです。');
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

const stateBlock = `  const [work, setWork] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('式')
  const [unitPrice, setUnitPrice] = useState('')
  const [memo, setMemo] = useState('')`;

const stateReplacement = `${stateBlock}

  ${MARKER}
  const pastUnitPriceSuggestions = useMemo(() => {
    const query = work.trim().toLocaleLowerCase('ja')
    if (!query) return []

    const found = []
    readSavedEntries().forEach(entry => {
      ;(entry.additionalWorks || []).forEach(record => {
        const recordWork = String(record.work || '').trim()
        const normalizedWork = recordWork.toLocaleLowerCase('ja')
        const price = Number(record.unitPrice || 0)
        if (!recordWork || !Number.isFinite(price) || price <= 0) return
        if (!normalizedWork.includes(query) && !query.includes(normalizedWork)) return
        found.push({
          work: recordWork,
          price,
          unit: record.unit || '式',
          propertyName: entry.propertyName || '物件名なし',
          room: record.room || '',
          updatedAt: entry.updatedAt || '',
        })
      })
    })

    const unique = new Map()
    found
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .forEach(item => {
        const key = item.work + '|' + item.price + '|' + item.unit
        if (!unique.has(key)) unique.set(key, item)
      })

    return [...unique.values()].slice(0, 5)
  }, [work])`;

const stateRegex = /  const \[work, setWork\] = useState\(''\)\r?\n  const \[quantity, setQuantity\] = useState\('1'\)\r?\n  const \[unit, setUnit\] = useState\('式'\)\r?\n  const \[unitPrice, setUnitPrice\] = useState\(''\)\r?\n  const \[memo, setMemo\] = useState\(''\)/g;
const stateMatches = source.match(stateRegex) || [];
if (stateMatches.length !== 1) {
  console.error(`ERROR: 追加作業state位置 の対象が ${stateMatches.length} 件でした。安全のため中止しました。`);
  process.exit(1);
}
source = source.replace(stateRegex, stateReplacement);

const workInput = `<label><span>作業内容</span><input value={work} onChange={event => setWork(event.target.value)} placeholder="例：畳表替え、電球交換" /></label>`;
const workInputReplacement = `${workInput}
          {pastUnitPriceSuggestions.length > 0 && (
            <section className="pastPriceSuggestions" aria-label="過去の単価候補">
              <strong>💡 過去の単価候補</strong>
              <div className="pastPriceSuggestionList">
                {pastUnitPriceSuggestions.map(item => (
                  <button
                    key={item.work + '-' + item.price + '-' + item.unit}
                    type="button"
                    className="pastPriceSuggestionButton"
                    onClick={() => {
                      setWork(item.work)
                      setUnitPrice(String(item.price))
                      setUnit(item.unit)
                    }}
                  >
                    <span>{item.work}</span>
                    <b>{formatYen(item.price)}／{item.unit}</b>
                    <small>{item.propertyName}{item.room ? '・' + item.room : ''}</small>
                  </button>
                ))}
              </div>
              <small>候補を押した場合だけ、作業名・単価・単位へ反映します。</small>
            </section>
          )}`;

replaceOnce('最終確認の作業内容入力欄', workInput, workInputReplacement);

const styleAnchor = source.includes('<style>{appStyles}</style>')
  ? '<style>{appStyles}</style>'
  : (source.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);
if (!styleAnchor) {
  console.error('ERROR: style要素を特定できません。');
  process.exit(1);
}

const css = `
.pastPriceSuggestions{display:grid;gap:8px;padding:12px;border:1px solid rgba(110,145,232,.38);border-radius:14px;background:rgba(110,145,232,.08)}
.pastPriceSuggestions>strong{font-size:15px}
.pastPriceSuggestionList{display:grid;gap:8px}
.pastPriceSuggestionButton{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 10px;width:100%;padding:10px 12px;border:1px solid rgba(110,145,232,.42);border-radius:11px;background:rgba(255,255,255,.82);color:inherit;font:inherit;text-align:left;cursor:pointer}
.pastPriceSuggestionButton span{min-width:0;font-weight:800;overflow-wrap:anywhere}
.pastPriceSuggestionButton b{white-space:nowrap}
.pastPriceSuggestionButton small{grid-column:1/-1;opacity:.72;font-size:12px}
.pastPriceSuggestions>small{opacity:.72;font-size:12px;line-height:1.45}
.theme-dark .pastPriceSuggestionButton,.theme-cyber .pastPriceSuggestionButton,.theme-luxury .pastPriceSuggestionButton,.theme-retro .pastPriceSuggestionButton,.theme-galaxy .pastPriceSuggestionButton{background:rgba(5,12,24,.78)}
`;

source = source.replace(styleAnchor, styleAnchor + '\n      <style>{`' + css + '`}</style>');

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: 追加作業へ過去単価候補V3を追加しました。');
console.log('作業内容を入力すると、保存済み物件から最大5件を候補表示します。');
console.log('候補を押した場合だけ、作業名・単価・単位を反映します。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
