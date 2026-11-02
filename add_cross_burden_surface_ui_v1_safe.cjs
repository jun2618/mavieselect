const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const marker='M-CROSS_CROSS_BURDEN_SURFACE_UI_V1_SAFE';
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const original=s;
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

const stateAnchor="  const [surfaceName, setSurfaceName] = useState('')";
must(s.includes(stateAnchor),'surfaceName state位置なし');
s=s.replace(stateAnchor,stateAnchor+"\n  /* "+marker+" */\n  const [crossBurden,setCrossBurden]=useState('landlord')");

const groupOld="const surface = finish === 'color' ? String(record.surfaceName || '').trim() : ''";
const groupNew="const surface = (finish === 'color' || finish === 'partial') ? String(record.surfaceName || '').trim() : ''";
must((s.match(new RegExp(groupOld.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length>=2,'surface集約位置不足');
s=s.replaceAll(groupOld,groupNew);

const keyOld="const key = [finish, surface, recordMemo].join('||')";
const keyNew="const burden=String(record.burden||'landlord'); const key = [finish, surface, recordMemo, burden].join('||')";
must(s.includes(keyOld),'group key位置なし');
s=s.replace(keyOld,keyNew);

const memoOld="const inputMemo = String(first.memo || '').trim()";
const memoNew="const inputMemo = String(first.memo || '').trim()\n        const burden = String(first.burden || 'landlord')";
must(s.includes(memoOld),'inputMemo位置なし');
s=s.replace(memoOld,memoNew);

const wordingOld="? [roomName, surface || '壁', 'カラークロス施工']\n            : finish === 'partial' ? [roomName, '壁', 'クロス部分張替'] : [roomName, '壁', 'クロス張替']";
const wordingNew="? [roomName, surface || '壁', 'カラークロス施工']\n            : finish === 'partial' ? [roomName, surface || '壁', 'クロス部分張替'] : [roomName, '壁', 'クロス張替']";
must(s.includes(wordingOld),'見積表記位置なし');
s=s.replace(wordingOld,wordingNew);

const rowOld="category: 'cross',\n          quantity,";
const rowNew="category: 'cross',\n          burden,\n          quantity,";
must(s.includes(rowOld),'cross row位置なし');
s=s.replace(rowOld,rowNew);

const validateOld="if (measurementType === '壁' && crossFinish === 'color' && !surfaceName.trim()) {\n      window.alert('カラークロスの施工面を入力してください。')\n      return\n    }";
const validateNew="if (measurementType === '壁' && (crossFinish === 'color' || crossFinish === 'partial') && !surfaceName.trim()) {\n      window.alert(crossFinish === 'color' ? 'カラークロスの施工面を入力してください。' : '部分張替の施工面または面数を入力してください。')\n      return\n    }";
must(s.includes(validateOld),'施工面バリデーション位置なし');
s=s.replace(validateOld,validateNew);

const recordOld="crossFinish: measurementType === '壁' ? crossFinish : 'normal',\n      surfaceName: measurementType === '壁' && crossFinish === 'color' ? surfaceName.trim() : '',\n      memo: memo.trim(),";
const recordNew="crossFinish: measurementType === '壁' ? crossFinish : 'normal',\n      surfaceName: measurementType === '壁' && (crossFinish === 'color' || crossFinish === 'partial') ? surfaceName.trim() : '',\n      burden: crossBurden,\n      memo: memo.trim(),";
must(s.includes(recordOld),'record保存位置なし');
s=s.replace(recordOld,recordNew);

const panelOld="{crossFinish === 'color' && <label><span>施工面</span><input value={surfaceName} onChange={event => { setSurfaceName(event.target.value); markUnsaved() }} placeholder=\"例：バルコニー面、正面\"/></label>}<div style={{padding:'10px 12px',borderRadius:'11px',background:'rgba(110,145,232,.08)',fontWeight:800}}><small>📄 見積書ではこう表示</small><div>{crossFinish==='color' ? [room,surfaceName||'施工面未入力','カラークロス施工'].join('　') : crossFinish==='partial' ? [room,'壁','クロス部分張替'].join('　') : [room,'壁','クロス張替'].join('　')}</div></div>";
const panelNew=`{(crossFinish === 'color' || crossFinish === 'partial') && <><label><span>{crossFinish==='color'?'施工面':'貼替場所・面数'}</span><input value={surfaceName} onChange={event => { setSurfaceName(event.target.value); markUnsaved() }} placeholder={crossFinish==='color'?'例：バルコニー面、正面':'例：窓面、窓向かって左面、壁2面'}/></label><div className="crossSurfaceQuick">{['窓面','窓向かって右面','窓向かって左面','入口面','正面','右面','左面','壁1面','壁2面','壁3面'].map(value=><button type="button" key={value} className={surfaceName===value?'active':''} onClick={()=>{setSurfaceName(value);markUnsaved()}}>{value}</button>)}</div></>}
                          <div className="crossBurdenPanel"><span>負担区分（この場で切替）</span><div>{[['landlord','🔵 貸主'],['tenant','🟠 借主'],['split','🟣 按分']].map(([value,label])=><button type="button" key={value} className={crossBurden===value?'active':''} onClick={()=>{setCrossBurden(value);markUnsaved()}}>{label}</button>)}</div></div>
                          <div className="crossEstimatePreview"><small>📄 見積書ではこう表示</small><strong>{crossFinish==='color' ? [room,surfaceName||'施工面未入力','カラークロス施工'].join('　') : crossFinish==='partial' ? [room,surfaceName||'貼替場所未入力','クロス部分張替'].join('　') : [room,'壁','クロス張替'].join('　')}</strong><span>負担：{crossBurden==='tenant'?'借主':crossBurden==='split'?'按分':'貸主'}</span></div>`;
must(s.includes(panelOld),'既存プレビュー位置なし');
s=s.replace(panelOld,panelNew);

const resetOld="setSurfaceName('')\n    setActiveInput('height')";
const resetNew="setSurfaceName('')\n    setCrossBurden('landlord')\n    setActiveInput('height')";
must(s.includes(resetOld),'登録後リセット位置なし');
s=s.replace(resetOld,resetNew);

const cssAnchor="  .crossFinishPanel{display:grid;gap:10px;margin:0 0 18px;padding:14px;border:1px solid #ead8cb;border-radius:14px;background:#fffaf5}";
must(s.includes(cssAnchor),'crossFinish CSS位置なし');
const css=`  /* ${marker} */
  .crossFinishButtons{grid-template-columns:repeat(3,minmax(0,1fr))!important}.crossSurfaceQuick{display:flex;flex-wrap:wrap;gap:7px}.crossSurfaceQuick button{min-height:38px;padding:6px 9px;border:1px solid #d8c9df;border-radius:999px;background:#fff;color:#65596a;font:inherit;font-size:13px;font-weight:800}.crossSurfaceQuick button.active{color:#fff;background:#6e91e8}.crossBurdenPanel{display:grid;gap:7px;padding:11px;border:1px solid #dbcfea;border-radius:12px;background:#faf7ff}.crossBurdenPanel>span{font-weight:900}.crossBurdenPanel>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.crossBurdenPanel button{min-height:44px;border:1px solid #d8c9df;border-radius:11px;background:#fff;color:#65596a;font:inherit;font-weight:900}.crossBurdenPanel button.active{color:#fff;background:#7058ed}.crossEstimatePreview{display:grid;gap:4px;padding:12px;border-radius:12px;background:rgba(110,145,232,.1)}.crossEstimatePreview strong{font-size:17px;line-height:1.5}.crossEstimatePreview span{color:#756a78;font-size:13px;font-weight:900}@media(max-width:520px){.crossFinishButtons,.crossBurdenPanel>div{grid-template-columns:1fr}.crossFinishButtons button,.crossBurdenPanel button{min-height:48px}.crossSurfaceQuick button{flex:1 1 calc(50% - 7px)}}
`;
s=s.replace(cssAnchor,css+cssAnchor);

must(s!==original,'変更なし');
fs.copyFileSync(p,'./src/App.before_cross_burden_surface_ui_v1.jsx');
fs.writeFileSync(p,s,'utf8');
console.log('OK: 部分張替の施工面・面数選択、貸主/借主/按分の常時切替、見積プレビューを追加しました');
