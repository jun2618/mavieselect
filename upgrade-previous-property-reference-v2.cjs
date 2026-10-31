const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-previous-property-reference-v2');
const MARKER = '/* M-CROSS_PREVIOUS_PROPERTY_REFERENCE_V2 */';

if (!fs.existsSync(appPath)) { console.error('ERROR: src/App.jsx が見つかりません。'); process.exit(1); }
let s = fs.readFileSync(appPath, 'utf8');
if (s.includes(MARKER)) { console.log('SKIP: 前回この物件ではV2は適用済みです。'); process.exit(0); }
if (!s.includes('M-CROSS_PREVIOUS_PROPERTY_REFERENCE_V1')) { console.error('ERROR: V1が見つからないため中止しました。'); process.exit(1); }

// Add state near similar-sites state.
const stateNeedle = "  const [showSimilarSites, setShowSimilarSites] = useState(false)";
if (!s.includes(stateNeedle)) { console.error('ERROR: 履歴表示stateの追加位置が見つかりません。'); process.exit(1); }
s = s.replace(stateNeedle, stateNeedle + "\n  const [showAllPropertyHistory, setShowAllPropertyHistory] = useState(false)\n  const [propertyHistoryOrder, setPropertyHistoryOrder] = useState('newest')");

// Change V1 slice(0,3) to preserve all matching history.
const sliceNeedle = "      .slice(0, 3)\n      .map(entry => {";
if (!s.includes(sliceNeedle)) { console.error('ERROR: V1の3件制限が見つかりません。'); process.exit(1); }
s = s.replace(sliceNeedle, "      .map(entry => {");

// Reset all-history state with fresh screen.
const resetNeedle = "      setShowSimilarSites(false)\n      setCurrentStorageKey('')";
if (s.includes(resetNeedle)) {
  s = s.replace(resetNeedle, "      setShowSimilarSites(false)\n      setShowAllPropertyHistory(false)\n      setPropertyHistoryOrder('newest')\n      setCurrentStorageKey('')");
}

// Replace the entire V1 panel using stable boundaries.
const panelStart = "              {selectedProperty && previousPropertyEntries.length > 0 && (\n                <section className=\"previousPropertyPanel\">";
const panelEnd = "              )}\n\n              <button className=\"primary\" disabled={!selectedProperty || !unit.trim()} onClick={startMeasurement}>採寸を開始する →</button>";
const startIndex = s.indexOf(panelStart);
const endIndex = s.indexOf(panelEnd, startIndex);
if (startIndex < 0 || endIndex < 0) { console.error('ERROR: V1表示パネルの範囲を特定できません。'); process.exit(1); }

const panel = `              ${MARKER}
              {selectedProperty && previousPropertyEntries.length > 0 && (
                <section className="previousPropertyPanel">
                  <div className="previousPropertyHeading">
                    <strong>💡 前回この物件では</strong>
                    <small>{previousPropertyEntries.length}件の履歴</small>
                  </div>
                  <div className="propertyHistoryControls">
                    <button type="button" onClick={() => setShowAllPropertyHistory(value => !value)}>
                      {showAllPropertyHistory ? '直近3件だけ表示' : '過去の履歴をすべて見る'}
                    </button>
                    {showAllPropertyHistory && (
                      <select value={propertyHistoryOrder} onChange={event => setPropertyHistoryOrder(event.target.value)} aria-label="履歴の並び順">
                        <option value="newest">新しい順</option>
                        <option value="oldest">古い順</option>
                      </select>
                    )}
                  </div>
                  <div className="previousPropertyList">
                    {(showAllPropertyHistory
                      ? [...previousPropertyEntries].sort((a, b) => propertyHistoryOrder === 'oldest'
                          ? new Date(a.entry.updatedAt || 0) - new Date(b.entry.updatedAt || 0)
                          : new Date(b.entry.updatedAt || 0) - new Date(a.entry.updatedAt || 0))
                      : previousPropertyEntries.slice(0, 3)
                    ).map(({ entry, crossTotalValue, cfTotalValue, softTotalValue, trimTotalValue, workNames }) => (
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

              <button className="primary" disabled={!selectedProperty || !unit.trim()} onClick={startMeasurement}>採寸を開始する →</button>`;

s = s.slice(0, startIndex) + panel + s.slice(endIndex + panelEnd.length);

const styleAnchor = s.includes('<style>{appStyles}</style>') ? '<style>{appStyles}</style>' : (s.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);
if (!styleAnchor) { console.error('ERROR: style要素を特定できません。'); process.exit(1); }
const css = `
.propertyHistoryControls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.propertyHistoryControls button,.propertyHistoryControls select{min-height:42px;border:1px solid rgba(99,190,161,.48);border-radius:10px;background:rgba(255,255,255,.82);color:inherit;font:inherit;font-weight:800;padding:7px 10px}.theme-dark .propertyHistoryControls button,.theme-dark .propertyHistoryControls select,.theme-cyber .propertyHistoryControls button,.theme-cyber .propertyHistoryControls select,.theme-luxury .propertyHistoryControls button,.theme-luxury .propertyHistoryControls select,.theme-retro .propertyHistoryControls button,.theme-retro .propertyHistoryControls select,.theme-galaxy .propertyHistoryControls button,.theme-galaxy .propertyHistoryControls select{background:rgba(5,12,24,.82)}@media(max-width:520px){.propertyHistoryControls{grid-template-columns:1fr}.propertyHistoryControls select{width:100%}}
`;
s = s.replace(styleAnchor, styleAnchor + '\n      <style>{`' + css + '`}</style>');

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, s, 'utf8');
console.log('OK: 「直近3件＋全履歴」V2へ更新しました。');
console.log('全履歴では新しい順・古い順を切り替えできます。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
