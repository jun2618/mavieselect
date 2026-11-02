const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const marker='M-CROSS_CROSS_BURDEN_SURFACE_UI_V5_SAFE';
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const original=s;
const must=(n,msg)=>{if(n!==1)throw new Error(msg+' MATCH='+n)};
const rep=(re,repl,msg)=>{const m=s.match(re);must(m?m.length:0,msg);s=s.replace(re,repl)};

rep(/  const \[surfaceName, setSurfaceName\] = useState\('\'\)/,
`  const [surfaceName, setSurfaceName] = useState('')\n  /* ${marker} */\n  const [crossBurden, setCrossBurden] = useState('landlord')`,'state');

rep(/const surface = finish === 'color' \? String\(record\.surfaceName \|\| ''\)\.trim\(\) : ''/,
"const surface = (finish === 'color' || finish === 'partial') ? String(record.surfaceName || '').trim() : ''",'record surface');
rep(/const key = \[finish, surface, recordMemo\]\.join\('\|\|'\)/,
"const burden = String(record.burden || 'landlord')\n        const key = [finish, surface, recordMemo, burden].join('||')",'group key');
rep(/const surface = finish === 'color' \? String\(first\.surfaceName \|\| ''\)\.trim\(\) : ''/,
"const surface = (finish === 'color' || finish === 'partial') ? String(first.surfaceName || '').trim() : ''",'first surface');
rep(/const inputMemo = String\(first\.memo \|\| ''\)\.trim\(\)/,
"const inputMemo = String(first.memo || '').trim()\n        const burden = String(first.burden || 'landlord')",'burden read');
rep(/: finish === 'partial' \? \[roomName, '壁', 'クロス部分張替'\] : \[roomName, '壁', 'クロス張替'\]/,
": finish === 'partial' ? [roomName, surface || '壁', 'クロス部分張替'] : [roomName, '壁', 'クロス張替']",'partial wording');
rep(/(\s+category: 'cross',\r?\n)(\s+)(quantity,)/,
(m,a,indent,q)=>a+indent+'burden,\n'+indent+q,'row burden');

rep(/    if \(measurementType === '壁' && crossFinish === 'color' && !surfaceName\.trim\(\)\) \{\r?\n      window\.alert\('カラークロスの施工面を入力してください。'\)\r?\n      return\r?\n    \}/,
`    if (measurementType === '壁' && (crossFinish === 'color' || crossFinish === 'partial') && !surfaceName.trim()) {\n      window.alert(crossFinish === 'color' ? 'カラークロスの施工面を入力してください。' : '部分張替の施工面または面数を入力してください。')\n      return\n    }`,'validation');
rep(/      surfaceName: measurementType === '壁' && crossFinish === 'color' \? surfaceName\.trim\(\) : '',\r?\n      memo: memo\.trim\(\),/,
`      surfaceName: measurementType === '壁' && (crossFinish === 'color' || crossFinish === 'partial') ? surfaceName.trim() : '',\n      burden: crossBurden,\n      memo: memo.trim(),`,'save record');

const start=`                        {measurementType === '壁' && (`;
const end=`                        )}\n                        <label>`;
const i=s.indexOf(start), j=s.indexOf(end,i);
if(i<0||j<0)throw new Error('wall panel位置なし');
const panel=`                        {measurementType === '壁' && (\n                          <section className="crossFinishPanel" aria-label="クロス種別">\n                            <span>① クロス種別を選ぶ</span>\n                            <div className="crossFinishButtons">\n                              <button type="button" className={crossFinish === 'normal' ? 'active' : ''} onClick={() => { setCrossFinish('normal'); setSurfaceName(''); markUnsaved() }}>通常クロス</button>\n                              <button type="button" className={crossFinish === 'partial' ? 'active' : ''} onClick={() => { setCrossFinish('partial'); setSurfaceName(''); markUnsaved() }}>部分張替</button>\n                              <button type="button" className={crossFinish === 'color' ? 'active' : ''} onClick={() => { setCrossFinish('color'); setSurfaceName(''); markUnsaved() }}>カラークロス</button>\n                            </div>\n                            {(crossFinish === 'partial' || crossFinish === 'color') && <>\n                              <label><span>② {crossFinish === 'partial' ? '貼替場所・面数' : '施工面'}</span><input value={surfaceName} onChange={event => { setSurfaceName(event.target.value); markUnsaved() }} placeholder={crossFinish === 'partial' ? '例：窓面、窓向かって左面、壁2面' : '例：バルコニー面、正面'} /></label>\n                              <div className="crossSurfaceQuick">{['窓面','窓向かって右面','窓向かって左面','入口面','正面','右面','左面','壁1面','壁2面','壁3面'].map(value => <button type="button" key={value} className={surfaceName === value ? 'active' : ''} onClick={() => { setSurfaceName(value); markUnsaved() }}>{value}</button>)}</div>\n                            </>}\n                            <div className="crossBurdenPanel"><span>③ 負担区分を選ぶ</span><div>\n                              <button type="button" className={crossBurden === 'landlord' ? 'active landlord' : ''} onClick={() => { setCrossBurden('landlord'); markUnsaved() }}>🔵 貸主</button>\n                              <button type="button" className={crossBurden === 'tenant' ? 'active tenant' : ''} onClick={() => { setCrossBurden('tenant'); markUnsaved() }}>🟠 借主</button>\n                              <button type="button" className={crossBurden === 'split' ? 'active split' : ''} onClick={() => { setCrossBurden('split'); markUnsaved() }}>🟣 按分</button>\n                            </div></div>\n                            <div className="crossEstimatePreview"><small>📄 見積書ではこう表示</small><strong>{crossFinish === 'color' ? [room, surfaceName || '施工面未入力', 'カラークロス施工'].join('　') : crossFinish === 'partial' ? [room, surfaceName || '貼替場所未入力', 'クロス部分張替'].join('　') : [room, '壁', 'クロス張替'].join('　')}</strong><span>負担：{crossBurden === 'tenant' ? '借主' : crossBurden === 'split' ? '按分' : '貸主'}</span></div>\n                          </section>\n                        )}\n`;
s=s.slice(0,i)+panel+s.slice(j+end.length-'<label>'.length);

rep(/\{item\.type === '壁' && item\.crossFinish === 'color' && item\.surfaceName && <small>施工面：\{item\.surfaceName\}<\/small>\}/,
`{item.type === '壁' && (item.crossFinish === 'color' || item.crossFinish === 'partial') && item.surfaceName && <small>{item.crossFinish === 'partial' ? '貼替場所' : '施工面'}：{item.surfaceName}</small>}\n                              {item.type === '壁' && <small>負担：{item.burden === 'tenant' ? '借主' : item.burden === 'split' ? '按分' : '貸主'}</small>}`,'saved display');

const cssAnchor='  .crossFinishPanel{display:grid;gap:10px;margin:0 0 18px;padding:14px;border:1px solid #ead8cb;border-radius:14px;background:#fffaf5}';
if(!s.includes(cssAnchor))throw new Error('CSS位置なし');
const css=`  .crossFinishButtons{grid-template-columns:repeat(3,minmax(0,1fr))!important}.crossSurfaceQuick{display:flex;flex-wrap:wrap;gap:7px}.crossSurfaceQuick button{min-height:38px;padding:6px 9px;border:1px solid #d8c9df;border-radius:999px;background:#fff;color:#65596a;font:inherit;font-size:13px;font-weight:800}.crossSurfaceQuick button.active{color:#fff;background:#6e91e8}.crossBurdenPanel{display:grid;gap:7px;padding:11px;border:1px solid #dbcfea;border-radius:12px;background:#faf7ff}.crossBurdenPanel>span{font-weight:900}.crossBurdenPanel>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.crossBurdenPanel button{min-height:46px;border:1px solid #d8c9df;border-radius:11px;background:#fff;color:#65596a;font:inherit;font-weight:900}.crossBurdenPanel button.active{color:#fff}.crossBurdenPanel button.active.landlord{background:#3579d0}.crossBurdenPanel button.active.tenant{background:#df7a28}.crossBurdenPanel button.active.split{background:#7656bd}.crossEstimatePreview{display:grid;gap:5px;padding:12px;border:2px solid rgba(110,145,232,.35);border-radius:12px;background:rgba(110,145,232,.1)}.crossEstimatePreview strong{font-size:17px;line-height:1.5}.crossEstimatePreview span{color:#756a78;font-size:13px;font-weight:900}@media(max-width:520px){.crossFinishButtons,.crossBurdenPanel>div{grid-template-columns:1fr}.crossFinishButtons button,.crossBurdenPanel button{min-height:50px}.crossSurfaceQuick button{flex:1 1 calc(50% - 7px)}}\n`;
s=s.replace(cssAnchor,css+cssAnchor);

if(s===original)throw new Error('変更なし');
fs.copyFileSync(p,'./src/App.before_cross_burden_surface_ui_v5.jsx');
fs.writeFileSync(p,s,'utf8');
console.log('OK: V5 現場向けクロス入力UIを追加しました');
