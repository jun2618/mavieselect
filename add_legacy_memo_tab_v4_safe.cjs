const fs=require('fs'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const backup=f+'.legacy-memo-tab-v4-backup';
const marker='M-CROSS_LEGACY_MEMO_TAB_V4_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx が見つかりません');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
function must(label,needle){if(!s.includes(needle))throw new Error(label+' が見つかりません')}
try{
  // state
  const state="  const [siteMemo, setSiteMemo] = useState('')";
  must('siteMemo state',state);
  s=s.replace(state,state+`\n  /* ${marker} */\n  const [legacyEstimateNotes, setLegacyEstimateNotes] = useState([])\n  const [estimateViewTab, setEstimateViewTab] = useState('estimate')`);

  // saved entry load
  const load="    setSiteMemo(entry.siteMemo || '')";
  must('保存案件のsiteMemo復元',load);
  s=s.replace(load,load+"\n    setLegacyEstimateNotes(Array.isArray(entry.legacyEstimateNotes) ? entry.legacyEstimateNotes : [])\n    setEstimateViewTab('estimate')");

  // draft restore
  const draft="    setSiteMemo(draft.siteMemo || '')";
  must('下書きsiteMemo復元',draft);
  s=s.replace(draft,draft+"\n    setLegacyEstimateNotes(Array.isArray(draft.legacyEstimateNotes) ? draft.legacyEstimateNotes : [])\n    setEstimateViewTab('estimate')");

  // reset all new-project points
  s=s.replaceAll("    setSiteMemo('')\n", "    setSiteMemo('')\n    setLegacyEstimateNotes([])\n    setEstimateViewTab('estimate')\n");

  // save was already added by user; verify only
  must('legacyEstimateNotes save',"      legacyEstimateNotes: JSON.parse(JSON.stringify(legacyEstimateNotes || [])),");

  // tabs directly before Excel export button
  const anchor=`                  <button
                    className="secondaryButton"
                    type="button"
                    onClick={() => downloadEstimateExcel({`;
  must('見積Excelボタン',anchor);
  const ui=`                  <div className="legacyEstimateTabs" role="tablist" aria-label="見積表示切替">
                    <button type="button" className={estimateViewTab==='estimate'?'active':''} onClick={()=>setEstimateViewTab('estimate')}>見積</button>
                    <button type="button" className={estimateViewTab==='memo'?'active':''} onClick={()=>setEstimateViewTab('memo')}>メモ{legacyEstimateNotes.length ? ' '+legacyEstimateNotes.length+'件' : ''}</button>
                  </div>
                  {estimateViewTab==='memo' && <section className="legacyEstimateMemoPanel">
                    <header><strong>旧工事カード確認メモ</strong><small>見積金額・発注内容には影響しません。</small></header>
                    {legacyEstimateNotes.length===0 ? <p className="empty">旧工事カードの確認メモはありません。</p> : <div className="legacyEstimateMemoList">{[...legacyEstimateNotes].sort((a,b)=>(Number(a.row)||0)-(Number(b.row)||0)).map((note,index)=><article key={(note.cell||note.row||'memo')+'-'+index}><small>{note.cell || (note.row ? '行 '+note.row : '')}</small><div>{note.text}</div></article>)}</div>}
                  </section>}
                  ${anchor}`;
  s=s.replace(anchor,ui);

  // CSS
  const cssAnchor='  .address { display:grid; gap:8px; margin:8px 0 20px; padding:15px; border:1px dashed #efc7b4; border-radius:15px; background:#fff7ed; }';
  must('CSS anchor',cssAnchor);
  const css=`  .legacyEstimateTabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0 12px}.legacyEstimateTabs button{min-height:44px;border:1px solid #e4d5cd;border-radius:12px;background:#fff;color:#665a62;font:inherit;font-weight:800}.legacyEstimateTabs button.active{background:#e98c76;color:#fff;border-color:#e98c76}.legacyEstimateMemoPanel{margin:0 0 16px;padding:14px;border:1px solid #ead8cb;border-radius:16px;background:#fffaf5}.legacyEstimateMemoPanel header{display:grid;gap:3px;margin-bottom:10px}.legacyEstimateMemoPanel header small{color:#817183}.legacyEstimateMemoList{display:grid;gap:8px}.legacyEstimateMemoList article{display:grid;grid-template-columns:58px minmax(0,1fr);gap:8px;padding:10px;border-radius:12px;background:#fff}.legacyEstimateMemoList article small{color:#d27f6d;font-weight:800}.legacyEstimateMemoList article div{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6}@media(max-width:520px){.legacyEstimateMemoList article{grid-template-columns:1fr}.legacyEstimateMemoList article small{font-size:12px}}\n`;
  s=s.replace(cssAnchor,css+cssAnchor);

  fs.copyFileSync(f,backup);fs.writeFileSync(f,s,'utf8');
  console.log('OK: メモタブV4を追加しました');
  console.log('BACKUP: '+backup);
}catch(e){console.error('ERROR: '+e.message);console.error('変更していません。');process.exit(1)}
