const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-similar-sites-v1');
const MARKER = '/* M-CROSS_SIMILAR_SITES_V1 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: 似た現場V1は適用済みです。');
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

// State: show/hide similar-site results.
replaceOnce(
  '現場メモstate',
  "  const [siteMemo, setSiteMemo] = useState('')",
  "  const [siteMemo, setSiteMemo] = useState('')\n  const [showSimilarSites, setShowSimilarSites] = useState(false)"
);

// Computation: similarity score from the user's own saved data only.
const computeAnchor = '  const visibleSavedEntries = useMemo(() => {';
if (!source.includes(computeAnchor)) {
  console.error('ERROR: 保存済み一覧の計算位置が見つかりません。');
  process.exit(1);
}

const computeCode = `  ${MARKER}
  const similarSiteCandidates = useMemo(() => {
    const currentPropertyName = String(selectedProperty?.name || propertySearch || '').trim()
    const currentAddress = String(selectedProperty?.address || '').trim()
    const currentCompany = String(company || '').trim()
    const currentMemo = String(siteMemo || '').trim()

    const normalize = value => String(value || '')
      .toLocaleLowerCase('ja')
      .replace(/[\\s　]+/g, '')
      .replace(/[()（）［］\\[\\]・,，.。:：/\\\\_-]+/g, '')

    const memoTokens = currentMemo
      .split(/[\\s　,，、。・/]+/)
      .map(normalize)
      .filter(token => token.length >= 2)

    return readSavedEntries()
      .map(entry => {
        let score = 0
        const reasons = []
        const entryName = normalize(entry.propertyName)
        const entryAddress = normalize(entry.address)
        const entryCompany = normalize(entry.company)
        const entryMemo = normalize(entry.siteMemo)

        if (currentPropertyName && entryName === normalize(currentPropertyName)) {
          score += 8
          reasons.push('同じ物件')
        } else if (currentPropertyName && (entryName.includes(normalize(currentPropertyName)) || normalize(currentPropertyName).includes(entryName))) {
          score += 5
          reasons.push('物件名が近い')
        }

        if (currentCompany && entryCompany === normalize(currentCompany)) {
          score += 3
          reasons.push('同じ管理会社')
        }

        if (currentAddress && entryAddress === normalize(currentAddress)) {
          score += 5
          reasons.push('同じ住所')
        }

        const matchedMemoTokens = memoTokens.filter(token => entryMemo.includes(token))
        if (matchedMemoTokens.length > 0) {
          score += Math.min(matchedMemoTokens.length * 2, 6)
          reasons.push('現場メモ: ' + matchedMemoTokens.slice(0, 3).join('・'))
        }

        const hasCross = (entry.records || []).length > 0
        const hasCf = (entry.cfRecords || []).length > 0
        const hasSoft = (entry.softRecords || []).length > 0
        const hasTrim = (entry.floorTrimRecords || []).length > 0
        const workCount = (entry.additionalWorks || []).length
        const summary = [
          hasCross ? 'クロス' : '',
          hasCf ? 'CF' : '',
          hasSoft ? 'ソフト巾木' : '',
          hasTrim ? '床見切り' : '',
          workCount ? '追加作業' + workCount + '件' : '',
        ].filter(Boolean)

        return { entry, score, reasons, summary }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || new Date(b.entry.updatedAt || 0) - new Date(a.entry.updatedAt || 0))
      .slice(0, 5)
  }, [company, propertySearch, selectedProperty, siteMemo, savedEntries])

`;
source = source.replace(computeAnchor, computeCode + computeAnchor);

// Reset results when returning to a fresh property screen.
replaceOnce(
  '新規画面リセット',
  "      setSiteMemo('')\n      setCurrentStorageKey('')",
  "      setSiteMemo('')\n      setShowSimilarSites(false)\n      setCurrentStorageKey('')"
);

// UI: insert after the site memo field, before the start button.
const startButton = '<button className="primary" disabled={!selectedProperty || !unit.trim()} onClick={startMeasurement}>採寸を開始する →</button>';
if (!source.includes(startButton)) {
  console.error('ERROR: 採寸開始ボタンが見つかりません。');
  process.exit(1);
}

const ui = `              <button
                className="secondaryButton similarSitesButton"
                type="button"
                disabled={!selectedProperty}
                onClick={() => setShowSimilarSites(value => !value)}
              >
                🔍 似た現場を探す
              </button>

              {showSimilarSites && (
                <section className="similarSitesPanel">
                  <div className="similarSitesHeading">
                    <strong>似た現場候補</strong>
                    <small>保存済みデータから参考候補を表示</small>
                  </div>
                  {similarSiteCandidates.length === 0 ? (
                    <p className="empty">一致する過去現場がありません</p>
                  ) : (
                    <div className="similarSitesList">
                      {similarSiteCandidates.map(({ entry, score, reasons, summary }) => (
                        <article className="similarSiteItem" key={entry.storageKey || entry.id || entry.propertyName + entry.unit}>
                          <div>
                            <strong>{entry.propertyName || '物件名なし'}　{entry.unit || ''}</strong>
                            <small>{entry.company || '管理会社未設定'}</small>
                            <small>一致理由：{reasons.join(' / ')}</small>
                            {summary.length > 0 && <small>内容：{summary.join('・')}</small>}
                          </div>
                          <div className="similarSiteActions">
                            <span>近さ {score}</span>
                            <button type="button" onClick={() => loadSavedEntry(entry)}>開く</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                  <p className="similarSitesNote">過去の数量や工事内容は自動コピーしません。参考表示のみです。</p>
                </section>
              )}

`;
source = source.replace(startButton, ui + '              ' + startButton);

// Styling, inheriting the active theme.
const styleAnchor = source.includes('<style>{appStyles}</style>')
  ? '<style>{appStyles}</style>'
  : (source.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);
if (!styleAnchor) {
  console.error('ERROR: style要素を特定できません。');
  process.exit(1);
}

const css = `
.similarSitesButton{margin-top:0}
.similarSitesPanel{display:grid;gap:10px;margin:12px 0;padding:13px;border:1px solid rgba(110,145,232,.4);border-radius:16px;background:rgba(110,145,232,.08)}
.similarSitesHeading{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:5px 10px}
.similarSitesHeading small,.similarSitesNote{opacity:.72;font-size:11px;line-height:1.45}
.similarSitesList{display:grid;gap:9px}
.similarSiteItem{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:11px;border:1px solid rgba(110,145,232,.38);border-radius:12px;background:rgba(255,255,255,.8)}
.similarSiteItem strong,.similarSiteItem small{display:block}
.similarSiteItem small{margin-top:3px;opacity:.76;font-size:11px;line-height:1.4}
.similarSiteActions{display:grid;align-content:space-between;justify-items:end;gap:8px}
.similarSiteActions span{font-size:11px;font-weight:800;opacity:.75}
.similarSiteActions button{min-height:36px;padding:6px 12px;border:0;border-radius:9px;background:#6e91e8;color:#fff;font:inherit;font-weight:800;cursor:pointer}
.theme-dark .similarSiteItem,.theme-cyber .similarSiteItem,.theme-luxury .similarSiteItem,.theme-retro .similarSiteItem,.theme-galaxy .similarSiteItem{background:rgba(5,12,24,.8)}
@media(max-width:520px){.similarSiteItem{grid-template-columns:1fr}.similarSiteActions{grid-template-columns:1fr auto;align-items:center;justify-items:start}.similarSiteActions button{justify-self:end}}
`;
source = source.replace(styleAnchor, styleAnchor + '\n      <style>{`' + css + '`}</style>');

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: 「似た現場を探す」V1を追加しました。');
console.log('判定材料: 物件名・管理会社・住所・現場メモ。保存済み内容の概要も表示します。');
console.log('過去データは自動コピーせず、候補を開く操作だけ行います。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
