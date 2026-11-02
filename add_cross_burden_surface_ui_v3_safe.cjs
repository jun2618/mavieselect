const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const marker='M-CROSS_CROSS_BURDEN_SURFACE_UI_V3_SAFE';
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const original=s;
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

// 1) state
const stateOld="  const [surfaceName, setSurfaceName] = useState('')";
must(s.includes(stateOld),'surfaceName state位置なし');
s=s.replace(stateOld,stateOld+"\n  /* "+marker+" */\n  const [crossBurden, setCrossBurden] = useState('landlord')");

// 2) estimate grouping: partial also uses surface, and burden keeps rows separate
const surface1="const surface = finish === 'color' ? String(record.surfaceName || '').trim() : ''";
const surface2="const surface = (finish === 'color' || finish === 'partial') ? String(record.surfaceName || '').trim() : ''";
must(s.includes(surface1),'record surface位置なし');
s=s.replace(surface1,surface2);
const keyOld="const key = [finish, surface, recordMemo].join('||')";
const keyNew="const burden = String(record.burden || 'landlord')\n        const key = [finish, surface, recordMemo, burden].join('||')";
must(s.includes(keyOld),'group key位置なし');
s=s.replace(keyOld,keyNew);
const surfaceFirst1="const surface = finish === 'color' ? String(first.surfaceName || '').trim() : ''";
const surfaceFirst2="const surface = (finish === 'color' || finish === 'partial') ? String(first.surfaceName || '').trim() : ''";
must(s.includes(surfaceFirst1),'first surface位置なし');
s=s.replace(surfaceFirst1,surfaceFirst2);
const memoOld="const inputMemo = String(first.memo || '').trim()";
const memoNew="const inputMemo = String(first.memo || '').trim()\n        const burden = String(first.burden || 'landlord')";
must(s.includes(memoOld),'inputMemo位置なし');
s=s.replace(memoOld,memoNew);
const partialOld="finish === 'partial' ? [roomName, '壁', 'クロス部分張替']";
const partialNew="finish === 'partial' ? [roomName, surface || '壁', 'クロス部分張替']";
must(s.includes(partialOld),'部分張替表記位置なし');
s=s.replace(partialOld,partialNew);
const rowOld="          category: 'cross',\n          quantity,";
const rowNew="          category: 'cross',\n          burden,\n          quantity,";
must(s.includes(rowOld),'cross row位置なし');
s=s.replace(rowOld,rowNew);

// 3) validation and persistence
const validateOld="    if (measurementType === '壁' && crossFinish === 'color' && !surfaceName.trim()) {\n      window.alert('カラークロスの施工面を入力してください。')\n      return\n    }";
const validateNew="    if (measurementType === '壁' && (crossFinish === 'color' || crossFinish === 'partial') && !surfaceName.trim()) {\n      window.alert(crossFinish === 'color' ? 'カラークロスの施工面を入力してください。' : '部分張替の施工面または面数を入力してください。')\n      return\n    }";
must(s.includes(validateOld),'施工面バリデーション位置なし');
s=s.replace(validateOld,validateNew);
const saveOld="      surfaceName: measurementType === '壁' && crossFinish === 'color' ? surfaceName.trim() : '',\n      memo: memo.trim(),";
const saveNew="      surfaceName: measurementType === '壁' && (crossFinish === 'color' || crossFinish === 'partial') ? surfaceName.trim() : '',\n      burden: crossBurden,\n      memo: memo.trim(),";
must(s.includes(saveOld),'record保存位置なし');
s=s.replace(saveOld,saveNew);

// 4) replace the wall options panel only
const panelOld=`                        {measurementType === '壁' && (
                          <section className="crossFinishPanel" aria-label="クロス種別">
                            <span>クロス種別</span>
                            <div className="crossFinishButtons">
                              <button type="button" className={crossFinish === 'normal' ? 'active' : ''} onClick={() => { setCrossFinish('normal'); setSurfaceName(''); markUnsaved() }}>通常クロス</button>
                              <button type="button" className={crossFinish === 'partial' ? 'active' : ''} onClick={() => { setCrossFinish('partial'); setSurfaceName(''); markUnsaved() }}>部分張替</button>
                              <button type="button" className={crossFinish === 'color' ? 'active' : ''} onClick={() => { setCrossFinish('color'); markUnsaved() }}>カラークロス</button>
                            </div>
                            {crossFinish === 'color' && <label><span>施工面</span><input value={surfaceName} onChange={event => { setSurfaceName(event.target.value); markUnsaved() }} placeholder="例：バルコニー、正面" /></label>}
                          </section>
                        )}`;
const panelNew=`                        {measurementType === '壁' && (
                          <section className="crossFinishPanel" aria-label="クロス種別">
                            <span>① クロス種別を選ぶ</span>
                            <div className="crossFinishButtons">
                              <button type="button" className={crossFinish === 'normal' ? 'active' : ''} onClick={() => { setCrossFinish('normal'); setSurfaceName(''); markUnsaved() }}>通常クロス</button>
                              <button type="button" className={crossFinish === 'partial' ? 'active' : ''} onClick={() => { setCrossFinish('partial'); setSurfaceName(''); markUnsaved() }}>部分張替</button>
                              <button type="button" className={crossFinish === 'color' ? 'active' : ''} onClick={() => { setCrossFinish('color'); setSurfaceName(''); markUnsaved() }}>カラークロス</button>
                            </div>
                            {(crossFinish === 'partial' || crossFinish === 'color') && <>
                              <label><span>② {crossFinish === 'partial' ? '貼替場所・面数' : '施工面'}</span><input value={surfaceName} onChange={event => { setSurfaceName(event.target.value); markUnsaved() }} placeholder={crossFinish === 'partial' ? '例：窓面、窓向かって左面、壁2面' : '例：バルコニー面、正面'} /></label>
                              <div className="crossSurfaceQuick">{['窓面','窓向かって右面','窓向かって左面','入口面','正面','右面','左面','壁1面','壁2面','壁3面'].map(value => <button type="button" key={value} className={surfaceName === value ? 'active' : ''} onClick={() => { setSurfaceName(value); markUnsaved() }}>{value}</button>)}</div>
                            </>}
                            <div className="crossBurdenPanel"><span>③ 負担区分を選ぶ</span><div>
                              <button type="button" className={crossBurden === 'landlord' ? 'active landlord' : ''} onClick={() => { setCrossBurden('landlord'); markUnsaved() }}>🔵 貸主</button>
                              <button type="button" className={crossBurden === 'tenant' ? 'active tenant' : ''} onClick={() => { setCrossBurden('tenant'); markUnsaved() }}>🟠 借主</button>
                              <button type="button" className={crossBurden === 'split' ? 'active split' : ''} onClick={() => { setCrossBurden('split'); markUnsaved() }}>🟣 按分</button>
                            </div></div>
                            <div className="crossEstimatePreview"><small>📄 見積書ではこう表示</small><strong>{crossFinish === 'color' ? [room, surfaceName || '施工面未入力', 'カラークロス施工'].join('　') : crossFinish === 'partial' ? [room, surfaceName || '貼替場所未入力', 'クロス部分張替'].join('　') : [room, '壁', 'クロス張替'].join('　')}</strong><span>負担：{crossBurden === 'tenant' ? '借主' : crossBurden === 'split' ? '按分' : '貸主'}</span></div>
                          </section>
                        )}`;
must(s.includes(panelOld),'入力パネル位置なし');
s=s.replace(panelOld,panelNew);

// 5) show saved surface and burden on the registered row
const savedOld="                              {item.type === '壁' && item.crossFinish === 'color' && item.surfaceName && <small>施工面：{item.surfaceName}</small>}\n                              {item.memo && <small>メモ：{item.memo}</small>}";
const savedNew="                              {item.type === '壁' && (item.crossFinish === 'color' || item.crossFinish === 'partial') && item.surfaceName && <small>{item.crossFinish === 'partial' ? '貼替場所' : '施工面'}：{item.surfaceName}</small>}\n                              {item.type === '壁' && <small>負担：{item.burden === 'tenant' ? '借主' : item.burden === 'split' ? '按分' : '貸主'}</small>}\n                              {item.memo && <small>メモ：{item.memo}</small>}";
must(s.includes(savedOld),'登録済み明細表示位置なし');
s=s.replace(savedOld,savedNew);

// 6) styling
const cssAnchor="  .crossFinishPanel{display:grid;gap:10px;margin:0 0 18px;padding:14px;border:1px solid #ead8cb;border-radius:14px;background:#fffaf5}";
must(s.includes(cssAnchor),'crossFinish CSS位置なし');
const css=`  /* ${marker} */
  .crossFinishButtons{grid-template-columns:repeat(3,minmax(0,1fr))!important}.crossSurfaceQuick{display:flex;flex-wrap:wrap;gap:7px}.crossSurfaceQuick button{min-height:38px;padding:6px 9px;border:1px solid #d8c9df;border-radius:999px;background:#fff;color:#65596a;font:inherit;font-size:13px;font-weight:800}.crossSurfaceQuick button.active{color:#fff;background:#6e91e8}.crossBurdenPanel{display:grid;gap:7px;padding:11px;border:1px solid #dbcfea;border-radius:12px;background:#faf7ff}.crossBurdenPanel>span{font-weight:900}.crossBurdenPanel>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.crossBurdenPanel button{min-height:46px;border:1px solid #d8c9df;border-radius:11px;background:#fff;color:#65596a;font:inherit;font-weight:900}.crossBurdenPanel button.active{color:#fff}.crossBurdenPanel button.active.landlord{background:#3579d0}.crossBurdenPanel button.active.tenant{background:#df7a28}.crossBurdenPanel button.active.split{background:#7656bd}.crossEstimatePreview{display:grid;gap:5px;padding:12px;border:2px solid rgba(110,145,232,.35);border-radius:12px;background:rgba(110,145,232,.1)}.crossEstimatePreview strong{font-size:17px;line-height:1.5}.crossEstimatePreview span{color:#756a78;font-size:13px;font-weight:900}@media(max-width:520px){.crossFinishButtons,.crossBurdenPanel>div{grid-template-columns:1fr}.crossFinishButtons button,.crossBurdenPanel button{min-height:50px}.crossSurfaceQuick button{flex:1 1 calc(50% - 7px)}}
`;
s=s.replace(cssAnchor,css+cssAnchor);

must(s!==original,'変更なし');
fs.copyFileSync(p,'./src/App.before_cross_burden_surface_ui_v3.jsx');
fs.writeFileSync(p,s,'utf8');
console.log('OK: V3 現場向けクロス入力UIを追加しました');
