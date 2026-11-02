const fs=require('fs'),path=require('path');
const f=path.join(process.cwd(),'src','App.jsx');
const backup=f+'.legacy-memo-tab-v3-backup';
const marker='M-CROSS_LEGACY_MEMO_TAB_V3_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx が見つかりません');process.exit(1)}
let s=fs.readFileSync(f,'utf8');if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
try{
  // State only. normalizeImportedEntry already preserves legacyEstimateNotes.
  const state="  const [siteMemo, setSiteMemo] = useState('')";
  if(!s.includes(state))throw new Error('state位置なし');
  s=s.replace(state,state+`\n  /* ${marker} */\n  const [legacyEstimateNotes, setLegacyEstimateNotes] = useState([])\n  const [estimateViewTab, setEstimateViewTab] = useState('estimate')`);

  // Load saved entry.
  const load="    setSiteMemo(entry.siteMemo || '')";
  if(!s.includes(load))throw new Error('保存案件読込位置なし');
  s=s.replace(load,load+"\n    setLegacyEstimateNotes(Array.isArray(entry.legacyEstimateNotes) ? entry.legacyEstimateNotes : [])\n    setEstimateViewTab('estimate')");

  // Restore working draft.
  const draft="    setSiteMemo(draft.siteMemo || '')";
  if(!s.includes(draft))throw new Error('下書き復元位置なし');
  s=s.replace(draft,draft+"\n    setLegacyEstimateNotes(Array.isArray(draft.legacyEstimateNotes) ? draft.legacyEstimateNotes : [])\n    setEstimateViewTab('estimate')");

  // Reset all existing reset points.
  s=s.replaceAll("    setSiteMemo('')\n", "    setSiteMemo('')\n    setLegacyEstimateNotes([])\n    setEstimateViewTab('estimate')\n");

  // Save only inside saveCurrentData object using nearby workName/siteMemo sequence.
  const saveAnchor="      workName: String(workName || '').trim() || '原状回復工事',\n      siteMemo: siteMemo.trim(),";
  if(!s.includes(saveAnchor))throw new Error('saveCurrentData位置なし');
  s=s.replace(saveAnchor,saveAnchor+"\n      legacyEstimateNotes: JSON.parse(JSON.stringify(legacyEstimateNotes || [])),");

  // UI before estimate Excel button.
  const anchor=`                  <button
                    className="secondaryButton"
                    type="button"
                    onClick={() => downloadEstimateExcel({`;
  if(!s.includes(anchor))throw new Error('見積Excelボタン位置なし');
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

  const cssAnchor='  .address { display:grid; gap:8px; margin:8px 0 20px; padding:15px; border:1px dashed #efc7b4; border-radius:15px; background:#fff7ed; }';
  if(!s.includes(cssAnchor))throw new Error('CSS位置なし');
  const css=`  .legacyEstimateTabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0 12px}.legacyEstimateTabs button{min-height:44px;border:1px solid #e4d5cd;border-radius:12px;background:#fff;color:#665a62;font:inherit;font-weight:800}.legacyEstimateTabs button.active{background:#e98c76;color:#fff;border-color:#e98c76}.legacyEstimateMemoPanel{margin:0 0 16px;padding:14px;border:1px solid #ead8cb;border-radius:16px;background:#fffaf5}.legacyEstimateMemoPanel header{display:grid;gap:3px;margin-bottom:10px}.legacyEstimateMemoPanel header small{color:#817183}.legacyEstimateMemoList{display:grid;gap:8px}.legacyEstimateMemoList article{display:grid;grid-template-columns:58px minmax(0,1fr);gap:8px;padding:10px;border-radius:12px;background:#fff}.legacyEstimateMemoList article small{color:#d27f6d;font-weight:800}.legacyEstimateMemoList article div{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6}@media(max-width:520px){.legacyEstimateMemoList article{grid-template-columns:1fr}.legacyEstimateMemoList article small{font-size:12px}}\n`;
  s=s.replace(cssAnchor,css+cssAnchor);

  fs.copyFileSync(f,backup);fs.writeFileSync(f,s,'utf8');
  console.log('OK: 旧工事カードのメモタブV3を追加しました');console.log('BACKUP: '+backup);
}catch(e){console.error('ERROR: '+e.message);console.error('変更していません。');process.exit(1)}
