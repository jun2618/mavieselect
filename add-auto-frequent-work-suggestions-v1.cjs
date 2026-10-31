const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-auto-frequent-work-suggestions-v1');
const MARKER = '/* M-CROSS_AUTO_FREQUENT_WORK_SUGGESTIONS_V1 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: 最近よく使う項目V1はすでに適用済みです。');
  process.exit(0);
}

function replaceRegex(label, regex, replacement) {
  const matches = source.match(regex) || [];
  if (matches.length !== 1) {
    console.error(`ERROR: ${label} の対象が ${matches.length} 件でした。安全のため中止しました。`);
    process.exit(1);
  }
  source = source.replace(regex, replacement);
}

// Add learning calculation after the AdditionalWorkForm's local memo state.
replaceRegex(
  '追加作業state位置',
  /  const \[work, setWork\] = useState\(''\)\r?\n  const \[quantity, setQuantity\] = useState\('1'\)\r?\n  const \[unit, setUnit\] = useState\('式'\)\r?\n  const \[unitPrice, setUnitPrice\] = useState\(''\)\r?\n  const \[memo, setMemo\] = useState\(''\)/,
  `  const [work, setWork] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('式')
  const [unitPrice, setUnitPrice] = useState('')
  const [memo, setMemo] = useState('')

  ${MARKER}
  const autoFrequentWorks = useMemo(() => {
    const stats = new Map()

    readSavedEntries().forEach(entry => {
      const updatedTime = new Date(entry.updatedAt || 0).getTime() || 0
      ;(entry.additionalWorks || []).forEach(record => {
        const name = String(record.work || '').trim()
        if (!name) return
        const key = name.toLocaleLowerCase('ja')
        const current = stats.get(key) || {
          name,
          count: 0,
          latestTime: 0,
          latestPrice: 0,
          latestUnit: '式',
        }
        current.count += 1
        if (updatedTime >= current.latestTime) {
          current.name = name
          current.latestTime = updatedTime
          current.latestPrice = Number(record.unitPrice || 0)
          current.latestUnit = record.unit || '式'
        }
        stats.set(key, current)
      })
    })

    return [...stats.values()]
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return b.latestTime - a.latestTime
      })
      .slice(0, 8)
  }, [additionalWorks])`
);

// Insert automatically learned chips after the existing manual common-work button area.
replaceRegex(
  'よく使う項目ボタン領域',
  /(<div className="commonWorkButtons" aria-label="よく使う追加作業">[\s\S]*?<\/div>\r?\n\r?\n        <form className="additionalWorkForm")/,
  `<div className="commonWorkButtons" aria-label="よく使う追加作業">
          {commonWorks.map(value => (
            <button key={value} className="quickMemoButton" type="button" onClick={() => setWork(value)} onContextMenu={event => { event.preventDefault(); deleteCommonWork(value) }}>{value}</button>
          ))}
          <button className="quickMemoButton" type="button" onClick={addCommonWork}>＋ よく使う項目</button>
        </div>

        {autoFrequentWorks.length > 0 && (
          <section className="autoFrequentWorks" aria-label="最近よく使う項目">
            <div className="autoFrequentWorksTitle">
              <strong>✨ 最近よく使う項目</strong>
              <small>保存済みデータから自動表示</small>
            </div>
            <div className="autoFrequentWorkButtons">
              {autoFrequentWorks.map(item => (
                <button
                  key={item.name}
                  type="button"
                  className="autoFrequentWorkButton"
                  onClick={() => {
                    setWork(item.name)
                    if (item.latestPrice > 0) setUnitPrice(String(item.latestPrice))
                    if (item.latestUnit) setUnit(item.latestUnit)
                  }}
                  title={'使用回数 ' + item.count + '回'}
                >
                  <span>{item.name}</span>
                  <small>{item.count}回{item.latestPrice > 0 ? '・直近 ' + formatYen(item.latestPrice) : ''}</small>
                </button>
              ))}
            </div>
          </section>
        )}

        <form className="additionalWorkForm"`
);

const styleAnchor = source.includes('<style>{appStyles}</style>')
  ? '<style>{appStyles}</style>'
  : (source.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);
if (!styleAnchor) {
  console.error('ERROR: style要素を特定できません。');
  process.exit(1);
}

const css = `
.autoFrequentWorks{display:grid;gap:10px;margin:14px 0;padding:12px;border:1px solid rgba(167,123,209,.34);border-radius:14px;background:rgba(167,123,209,.08)}
.autoFrequentWorksTitle{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:5px 10px}
.autoFrequentWorksTitle strong{font-size:15px}
.autoFrequentWorksTitle small{opacity:.7;font-size:11px}
.autoFrequentWorkButtons{display:flex;flex-wrap:wrap;gap:8px}
.autoFrequentWorkButton{display:grid;gap:2px;min-height:44px;padding:8px 12px;border:1px solid rgba(167,123,209,.42);border-radius:999px;background:rgba(255,255,255,.84);color:inherit;font:inherit;text-align:left;cursor:pointer}
.autoFrequentWorkButton span{font-weight:800}
.autoFrequentWorkButton small{opacity:.68;font-size:10px}
.theme-dark .autoFrequentWorkButton,.theme-cyber .autoFrequentWorkButton,.theme-luxury .autoFrequentWorkButton,.theme-retro .autoFrequentWorkButton,.theme-galaxy .autoFrequentWorkButton{background:rgba(5,12,24,.78)}
`;
source = source.replace(styleAnchor, styleAnchor + '\n      <style>{`' + css + '`}</style>');

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: 最近よく使う項目・自動学習V1を追加しました。');
console.log('保存済み追加作業を使用回数順、同数なら最近使用順で最大8件表示します。');
console.log('候補を押すと作業名、直近単価、単位を入力します。登録は自動では行いません。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev で確認してください。');
