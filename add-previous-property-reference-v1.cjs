const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-previous-property-reference-v1');
const MARKER = '/* M-CROSS_PREVIOUS_PROPERTY_REFERENCE_V1 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: 前回この物件ではV1は適用済みです。');
  process.exit(0);
}

function findExactlyOnce(label, needle) {
  const count = source.split(needle).length - 1;
  if (count !== 1) {
    console.error(`ERROR: ${label} の対象が ${count} 件でした。安全のため中止しました。`);
    process.exit(1);
  }
}

// 保存済み一覧計算の直前へ、同じ物件の過去データ集計を追加。
const computeAnchor = '  const visibleSavedEntries = useMemo(() => {';
findExactlyOnce('保存済み一覧計算位置', computeAnchor);

const computeCode = `  ${MARKER}
  const previousPropertyEntries = useMemo(() => {
    const currentName = String(selectedProperty?.name || propertySearch || '').trim().toLocaleLowerCase('ja')
    const currentAddress = String(selectedProperty?.address || '').trim().toLocaleLowerCase('ja')
    if (!currentName && !currentAddress) return []

    return readSavedEntries()
      .filter(entry => {
        const entryName = String(entry.propertyName || '').trim().toLocaleLowerCase('ja')
        const entryAddress = String(entry.address || '').trim().toLocaleLowerCase('ja')
        const sameName = currentName && entryName === currentName
        const sameAddress = currentAddress && entryAddress === currentAddress
        return sameName || sameAddress
      })
      .filter(entry => !unit.trim() || String(entry.unit || '').trim() !== unit.trim())
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, 3)
      .map(entry => {
        const crossTotalValue = (entry.records || []).reduce((sum, record) => sum + getRecordQuantity(record), 0)
        const cfTotalValue = (entry.cfRecords || []).reduce((sum, record) => sum + getLengthQuantity(record), 0)
        const softTotalValue = (entry.softRecords || []).reduce((sum, record) => sum + (Number(record.quantity) || 0), 0)
        const trimTotalValue = (entry.floorTrimRecords || []).reduce((sum, record) => sum + (Number(record.quantity) || 0), 0)
        const workNames = [...new Set((entry.additionalWorks || []).map(item => String(item.work || '').trim()).filter(Boolean))]
        return {
          entry,
          crossTotalValue,
          cfTotalValue,
          softTotalValue,
          trimTotalValue,
          workNames: workNames.slice(0, 4),
        }
      })
  }, [propertySearch, selectedProperty, unit, savedEntries])

`;
source = source.replace(computeAnchor, computeCode + computeAnchor);

// 採寸開始ボタンの直前に参考表示を追加。
const startButton = '<button className="primary" disabled={!selectedProperty || !unit.trim()} onClick={startMeasurement}>採寸を開始する →</button>';
findExactlyOnce('採寸開始ボタン', startButton);

const ui = `              {selectedProperty && previousPropertyEntries.length > 0 && (
                <section className="previousPropertyPanel">
                  <div className="previousPropertyHeading">
                    <strong>💡 前回この物件では</strong>
                    <small>直近の別号室を最大3件表示</small>
                  </div>
                  <div className="previousPropertyList">
                    {previousPropertyEntries.map(({ entry, crossTotalValue, cfTotalValue, softTotalValue, trimTotalValue, workNames }) => (
                      <article className="previousPropertyItem" key={entry.storageKey || entry.propertyName + entry.unit + entry.updatedAt}>
                        <div className="previousPropertyTop">
                          <strong>{entry.unit || '号室未設定'}号室</strong>
                          <small>更新 {formatSavedDate(entry.updatedAt)}</small>
                        </div>
                        <div className="previousPropertyTotals">
                          {crossTotalValue > 0 && <span>クロス {formatQuantity(crossTotalValue)}㎡</span>}
                          {cfTotalValue > 0 && <span>CF {formatQuantity(cfTotalValue)}㎡</span>}
                          {softTotalValue > 0 && <span>ソフト巾木 {formatQuantity(softTotalValue)}枚</span>}
                          {trimTotalValue > 0 && <span>床見切り {formatQuantity(trimTotalValue)}本</span>}
                        </div>
                        {workNames.length > 0 && <small>追加作業：{workNames.join('・')}</small>}
                        <button type="button" onClick={() => loadSavedEntry(entry)}>過去データを開く</button>
                      </article>
                    ))}
                  </div>
                  <p>参考表示のみです。過去の数量・単価・工事内容は今回へ自動コピーしません。</p>
                </section>
              )}

`;
source = source.replace(startButton, ui + '              ' + startButton);

const styleAnchor = source.includes('<style>{appStyles}</style>')
  ? '<style>{appStyles}</style>'
  : (source.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);
if (!styleAnchor) {
  console.error('ERROR: style要素を特定できません。');
  process.exit(1);
}

const css = `
.previousPropertyPanel{display:grid;gap:10px;margin:12px 0;padding:13px;border:1px solid rgba(99,190,161,.45);border-radius:16px;background:rgba(99,190,161,.08)}
.previousPropertyHeading{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:5px 10px}
.previousPropertyHeading small,.previousPropertyPanel>p{margin:0;opacity:.72;font-size:11px;line-height:1.45}
.previousPropertyList{display:grid;gap:9px}
.previousPropertyItem{display:grid;gap:8px;padding:11px;border:1px solid rgba(99,190,161,.42);border-radius:12px;background:rgba(255,255,255,.82)}
.previousPropertyTop{display:flex;justify-content:space-between;gap:10px;align-items:baseline}.previousPropertyTop small{opacity:.7;font-size:11px}
.previousPropertyTotals{display:flex;flex-wrap:wrap;gap:6px}.previousPropertyTotals span{padding:3px 8px;border-radius:999px;background:rgba(99,190,161,.12);font-size:11px;font-weight:800}
.previousPropertyItem>small{opacity:.78;font-size:11px;line-height:1.45}
.previousPropertyItem>button{min-height:38px;border:0;border-radius:9px;background:#63bea1;color:#fff;font:inherit;font-weight:800;cursor:pointer}
.theme-dark .previousPropertyItem,.theme-cyber .previousPropertyItem,.theme-luxury .previousPropertyItem,.theme-retro .previousPropertyItem,.theme-galaxy .previousPropertyItem{background:rgba(5,12,24,.8)}
`;
source = source.replace(styleAnchor, styleAnchor + '\n      <style>{`' + css + '`}</style>');

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: 「前回この物件では」V1を追加しました。');
console.log('同じ物件名または住所の別号室を、直近順で最大3件表示します。');
console.log('過去データは自動コピーせず、参考表示と「開く」だけです。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
