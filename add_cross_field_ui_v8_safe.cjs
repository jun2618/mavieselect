const fs=require('fs');
const p='./src/App.jsx';
const marker='M-CROSS_CROSS_FIELD_UI_V8_SAFE';
let text=fs.readFileSync(p,'utf8');
if(text.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
if(!text.includes('M-CROSS_CROSS_BURDEN_DATA_V1_SAFE'))throw new Error('負担区分の保存土台がありません');
const eol=text.includes('\r\n')?'\r\n':'\n';
let lines=text.split(/\r?\n/);
const findAll=fn=>{const out=[];lines.forEach((line,index)=>{if(fn(line,index))out.push(index)});return out};
const one=(fn,label)=>{const out=findAll(fn);if(out.length!==1)throw new Error(label+' MATCH='+out.length);return out[0]};
const replaceOne=(fn,from,to,label)=>{const i=one(fn,label);if(!lines[i].includes(from))throw new Error(label+' TEXT');lines[i]=lines[i].replace(from,to);return i};

// 見積集計: 部分張替も施工面を使い、負担区分ごとに別明細へ分ける
replaceOne(line=>line.includes("String(record.surfaceName || '').trim()"),"finish === 'color'","(finish === 'color' || finish === 'partial')",'record surface');
let i=one(line=>line.includes("const key = [finish, surface, recordMemo].join('||')"),'group key');
lines.splice(i,0,"        const burden = String(record.burden || 'landlord')");
lines[i+1]=lines[i+1].replace('[finish, surface, recordMemo]','[finish, surface, recordMemo, burden]');
replaceOne(line=>line.includes("String(first.surfaceName || '').trim()"),"finish === 'color'","(finish === 'color' || finish === 'partial')",'first surface');
i=one(line=>line.includes("const inputMemo = String(first.memo || '').trim()"),'input memo');
lines.splice(i+1,0,"        const burden = String(first.burden || 'landlord')");
replaceOne(line=>line.includes("finish === 'partial' ? [roomName, '壁', 'クロス部分張替']"),"[roomName, '壁', 'クロス部分張替']","[roomName, surface || '壁', 'クロス部分張替']",'partial wording');
const push=one(line=>line.includes('crossRows.push({'),'crossRows push');
let category=-1;
for(let k=push;k<Math.min(push+15,lines.length);k++){if(lines[k].trim()==="category: 'cross',"){category=k;break}}
if(category<0)throw new Error('crossRows category位置なし');
lines.splice(category+1,0,'          burden,');

// 部分張替も場所の入力を必須にする
const validation=one(line=>line.includes("if (measurementType === '壁' && crossFinish === 'color' && !surfaceName.trim())"),'validation');
lines.splice(validation,4,
"    if (measurementType === '壁' && (crossFinish === 'color' || crossFinish === 'partial') && !surfaceName.trim()) {",
"      window.alert(crossFinish === 'color' ? 'カラークロスの施工面を入力してください。' : '部分張替の貼替場所・面数を入力してください。')",
'      return',
'    }');

// 現在の壁クロスパネルだけを置換
const panelStart=one(line=>line.trim()==="{measurementType === '壁' && (",'panel start');
let panelEnd=-1;
for(let k=panelStart;k<Math.min(panelStart+35,lines.length);k++){
  if(lines[k].trim()===')}' && lines[k-1]?.trim()==='</section>'){panelEnd=k;break}
}
if(panelEnd<0)throw new Error('panel end位置なし');
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
'                            <div className="crossBurdenPanel"><span>③ 誰の負担？</span><div>',
"                              <button type=\"button\" className={crossBurden === 'landlord' ? 'active landlord' : ''} onClick={() => { setCrossBurden('landlord'); markUnsaved() }}>🔵 貸主</button>",
"                              <button type=\"button\" className={crossBurden === 'tenant' ? 'active tenant' : ''} onClick={() => { setCrossBurden('tenant'); markUnsaved() }}>🟠 借主</button>",
"                              <button type=\"button\" className={crossBurden === 'split' ? 'active split' : ''} onClick={() => { setCrossBurden('split'); markUnsaved() }}>🟣 按分</button>",
'                            </div></div>',
"                            <div className=\"crossEstimatePreview\"><small>📄 見積書ではこう表示</small><strong>{crossFinish === 'color' ? [room, surfaceName || '施工面未入力', 'カラークロス施工'].join('　') : crossFinish === 'partial' ? [room, surfaceName || '貼替場所未入力', 'クロス部分張替'].join('　') : [room, '壁', 'クロス張替'].join('　')}</strong><span>負担：{crossBurden === 'tenant' ? '借主' : crossBurden === 'split' ? '按分' : '貸主'}</span></div>",
'                          </section>',
'                        )}'
];
lines.splice(panelStart,panelEnd-panelStart+1,...panel);

// 登録済み行にも場所と負担区分を表示
const savedSurface=one(line=>line.includes("item.crossFinish === 'color' && item.surfaceName && <small>施工面"),'saved surface');
lines[savedSurface]=lines[savedSurface]
  .replace("item.crossFinish === 'color'","(item.crossFinish === 'color' || item.crossFinish === 'partial')")
  .replace('<small>施工面：{item.surfaceName}</small>',"<small>{item.crossFinish === 'partial' ? '貼替場所' : '施工面'}：{item.surfaceName}</small>");
lines.splice(savedSurface+1,0,"                              {item.type === '壁' && <small>負担：{item.burden === 'tenant' ? '借主' : item.burden === 'split' ? '按分' : '貸主'}</small>}");

// 見た目。スマホでは縦1列で迷わない配置
const cssAt=one(line=>line.includes('.crossFinishPanel{display:grid;gap:10px;margin:0 0 18px'),'CSS anchor');
lines.splice(cssAt,0,
'  .crossFinishButtons{grid-template-columns:repeat(3,minmax(0,1fr))!important}.crossSurfaceQuick{display:flex;flex-wrap:wrap;gap:7px}.crossSurfaceQuick button{min-height:39px;padding:6px 9px;border:1px solid #d8c9df;border-radius:999px;background:#fff;color:#65596a;font:inherit;font-size:13px;font-weight:800}.crossSurfaceQuick button.active{color:#fff;background:#6e91e8}.crossBurdenPanel{display:grid;gap:8px;padding:11px;border:1px solid #dbcfea;border-radius:12px;background:#faf7ff}.crossBurdenPanel>span{font-weight:900}.crossBurdenPanel>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.crossBurdenPanel button{min-height:47px;border:1px solid #d8c9df;border-radius:11px;background:#fff;color:#65596a;font:inherit;font-weight:900}.crossBurdenPanel button.active{color:#fff}.crossBurdenPanel button.active.landlord{background:#3579d0}.crossBurdenPanel button.active.tenant{background:#df7a28}.crossBurdenPanel button.active.split{background:#7656bd}.crossEstimatePreview{display:grid;gap:5px;padding:12px;border:2px solid rgba(110,145,232,.35);border-radius:12px;background:rgba(110,145,232,.1)}.crossEstimatePreview strong{font-size:17px;line-height:1.5}.crossEstimatePreview span{color:#756a78;font-size:13px;font-weight:900}@media(max-width:520px){.crossFinishButtons,.crossBurdenPanel>div{grid-template-columns:1fr}.crossFinishButtons button,.crossBurdenPanel button{min-height:50px}.crossSurfaceQuick button{flex:1 1 calc(50% - 7px)}}');

fs.copyFileSync(p,'./src/App.before_cross_field_ui_v8.jsx');
fs.writeFileSync(p,lines.join(eol),'utf8');
console.log('OK: V8 貼替場所・負担区分・見積完成形プレビューを追加しました');
