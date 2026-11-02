const fs=require('fs');
const p='./src/App.jsx';
const marker='M-CROSS_CROSS_BURDEN_SURFACE_UI_V7_SAFE';
let text=fs.readFileSync(p,'utf8');
if(text.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const eol=text.includes('\r\n')?'\r\n':'\n';
let L=text.split(/\r?\n/);
function matches(fn){const a=[];L.forEach((x,i)=>{if(fn(x,i))a.push(i)});return a}
function one(fn,label){const a=matches(fn);if(a.length!==1)throw new Error(label+' MATCH='+a.length);return a[0]}
function replaceLine(fn,from,to,label){const i=one(fn,label);if(!L[i].includes(from))throw new Error(label+' TEXT');L[i]=L[i].replace(from,to);return i}

let i=one(x=>x.includes("const [surfaceName, setSurfaceName] = useState('')"),'state');
L.splice(i+1,0,'  /* '+marker+' */',"  const [crossBurden, setCrossBurden] = useState('landlord')");
replaceLine(x=>x.includes("String(record.surfaceName || '').trim()"),"finish === 'color'","(finish === 'color' || finish === 'partial')",'record surface');
i=one(x=>x.includes("const key = [finish, surface, recordMemo].join('||')"),'group key');L.splice(i,0,"        const burden = String(record.burden || 'landlord')");L[i+1]=L[i+1].replace('[finish, surface, recordMemo]','[finish, surface, recordMemo, burden]');
replaceLine(x=>x.includes("String(first.surfaceName || '').trim()"),"finish === 'color'","(finish === 'color' || finish === 'partial')",'first surface');
i=one(x=>x.includes("const inputMemo = String(first.memo || '').trim()"),'input memo');L.splice(i+1,0,"        const burden = String(first.burden || 'landlord')");
replaceLine(x=>x.includes("finish === 'partial' ? [roomName, '壁', 'クロス部分張替']"),"[roomName, '壁', 'クロス部分張替']","[roomName, surface || '壁', 'クロス部分張替']",'partial wording');
// only category cross inside crossRows.push block
const push=one(x=>x.includes('crossRows.push({'),'crossRows push');
let cat=-1;for(let k=push;k<Math.min(push+15,L.length);k++){if(L[k].trim()==="category: 'cross',"){cat=k;break}}if(cat<0)throw new Error('cross row categoryなし');L.splice(cat+1,0,'          burden,');

// validation
const valStart=one(x=>x.includes("if (measurementType === '壁' && crossFinish === 'color' && !surfaceName.trim())"),'validation');
L.splice(valStart,4,
"    if (measurementType === '壁' && (crossFinish === 'color' || crossFinish === 'partial') && !surfaceName.trim()) {",
"      window.alert(crossFinish === 'color' ? 'カラークロスの施工面を入力してください。' : '部分張替の施工面または面数を入力してください。')",
'      return','    }');
// save record
replaceLine(x=>x.includes("surfaceName: measurementType === '壁' && crossFinish === 'color'"),"measurementType === '壁' && crossFinish === 'color'","measurementType === '壁' && (crossFinish === 'color' || crossFinish === 'partial')",'save surface');
i=one(x=>x.trim()==='memo: memo.trim(),','memo save');L.splice(i,0,'      burden: crossBurden,');

// wall input panel by exact line block boundaries
const ps=one(x=>x.trim()==="{measurementType === '壁' && (",'panel start');
let pe=-1;for(let k=ps;k<ps+30;k++){if(L[k].trim()===')}' && L[k-1]?.trim()==='</section>'){pe=k;break}}if(pe<0)throw new Error('panel endなし');
const panel=[
"                        {measurementType === '壁' && (",
'                          <section className="crossFinishPanel" aria-label="クロス種別">',
'                            <span>① クロス種別を選ぶ</span>',
'                            <div className="crossFinishButtons">',
"                              <button type=\"button\" className={crossFinish === 'normal' ? 'active' : ''} onClick={() => { setCrossFinish('normal'); setSurfaceName(''); markUnsaved() }}>通常クロス</button>",
"                              <button type=\"button\" className={crossFinish === 'partial' ? 'active' : ''} onClick={() => { setCrossFinish('partial'); setSurfaceName(''); markUnsaved() }}>部分張替</button>",
"                              <button type=\"button\" className={crossFinish === 'color' ? 'active' : ''} onClick={() => { setCrossFinish('color'); setSurfaceName(''); markUnsaved() }}>カラークロス</button>",
'                            </div>',
"                            {(crossFinish === 'partial' || crossFinish === 'color') && <>",
"                              <label><span>② {crossFinish === 'partial' ? '貼替場所・面数' : '施工面'}</span><input value={surfaceName} onChange={event => { setSurfaceName(event.target.value); markUnsaved() }} placeholder={crossFinish === 'partial' ? '例：窓面、窓向かって左面、壁2面' : '例：バルコニー面、正面'} /></label>",
"                              <div className=\"crossSurfaceQuick\">{['窓面','窓向かって右面','窓向かって左面','入口面','正面','右面','左面','壁1面','壁2面','壁3面'].map(value => <button type=\"button\" key={value} className={surfaceName === value ? 'active' : ''} onClick={() => { setSurfaceName(value); markUnsaved() }}>{value}</button>)}</div>",
'                            </>}',
'                            <div className="crossBurdenPanel"><span>③ 負担区分を選ぶ</span><div>',
"                              <button type=\"button\" className={crossBurden === 'landlord' ? 'active landlord' : ''} onClick={() => { setCrossBurden('landlord'); markUnsaved() }}>🔵 貸主</button>",
"                              <button type=\"button\" className={crossBurden === 'tenant' ? 'active tenant' : ''} onClick={() => { setCrossBurden('tenant'); markUnsaved() }}>🟠 借主</button>",
"                              <button type=\"button\" className={crossBurden === 'split' ? 'active split' : ''} onClick={() => { setCrossBurden('split'); markUnsaved() }}>🟣 按分</button>",
'                            </div></div>',
"                            <div className=\"crossEstimatePreview\"><small>📄 見積書ではこう表示</small><strong>{crossFinish === 'color' ? [room, surfaceName || '施工面未入力', 'カラークロス施工'].join('　') : crossFinish === 'partial' ? [room, surfaceName || '貼替場所未入力', 'クロス部分張替'].join('　') : [room, '壁', 'クロス張替'].join('　')}</strong><span>負担：{crossBurden === 'tenant' ? '借主' : crossBurden === 'split' ? '按分' : '貸主'}</span></div>",
'                          </section>',
'                        )}'
];
L.splice(ps,pe-ps+1,...panel);

// registered row display - insert burden just after surface line
const surfDisplay=one(x=>x.includes("item.crossFinish === 'color' && item.surfaceName && <small>施工面"),'saved surface display');
L[surfDisplay]=L[surfDisplay].replace("item.crossFinish === 'color'","(item.crossFinish === 'color' || item.crossFinish === 'partial')").replace('<small>施工面：{item.surfaceName}</small>',"<small>{item.crossFinish === 'partial' ? '貼替場所' : '施工面'}：{item.surfaceName}</small>");
L.splice(surfDisplay+1,0,"                              {item.type === '壁' && <small>負担：{item.burden === 'tenant' ? '借主' : item.burden === 'split' ? '按分' : '貸主'}</small>}");

// CSS
const ca=one(x=>x.includes('.crossFinishPanel{display:grid;gap:10px;margin:0 0 18px'),'CSS anchor');
L.splice(ca,0,'  .crossFinishButtons{grid-template-columns:repeat(3,minmax(0,1fr))!important}.crossSurfaceQuick{display:flex;flex-wrap:wrap;gap:7px}.crossSurfaceQuick button{min-height:38px;padding:6px 9px;border:1px solid #d8c9df;border-radius:999px;background:#fff;color:#65596a;font:inherit;font-size:13px;font-weight:800}.crossSurfaceQuick button.active{color:#fff;background:#6e91e8}.crossBurdenPanel{display:grid;gap:7px;padding:11px;border:1px solid #dbcfea;border-radius:12px;background:#faf7ff}.crossBurdenPanel>span{font-weight:900}.crossBurdenPanel>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.crossBurdenPanel button{min-height:46px;border:1px solid #d8c9df;border-radius:11px;background:#fff;color:#65596a;font:inherit;font-weight:900}.crossBurdenPanel button.active{color:#fff}.crossBurdenPanel button.active.landlord{background:#3579d0}.crossBurdenPanel button.active.tenant{background:#df7a28}.crossBurdenPanel button.active.split{background:#7656bd}.crossEstimatePreview{display:grid;gap:5px;padding:12px;border:2px solid rgba(110,145,232,.35);border-radius:12px;background:rgba(110,145,232,.1)}.crossEstimatePreview strong{font-size:17px;line-height:1.5}.crossEstimatePreview span{color:#756a78;font-size:13px;font-weight:900}@media(max-width:520px){.crossFinishButtons,.crossBurdenPanel>div{grid-template-columns:1fr}.crossFinishButtons button,.crossBurdenPanel button{min-height:50px}.crossSurfaceQuick button{flex:1 1 calc(50% - 7px)}}');

fs.copyFileSync(p,'./src/App.before_cross_burden_surface_ui_v7.jsx');
fs.writeFileSync(p,L.join(eol),'utf8');
console.log('OK: V7 現場向けクロス入力UIを追加しました');
