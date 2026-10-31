const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-trade-master-edit-v2';
const mark='M-CROSS_TRADE_MASTER_EDIT_V2_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 業種マスターV2は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_CONTRACTOR_EDIT_V1_SAFE'))fail('業者編集V1が見つかりません。変更していません。');
const anchor="  const [editingContractorId, setEditingContractorId] = useState('')";
const ap=s.indexOf(anchor);if(ap<0)fail('業者編集stateを特定できません。');
const selectNeedle="<select value={contractorForm.trade} onChange={event => setContractorForm(previous => ({...previous,trade:event.target.value}))}>{['内装','設備','清掃','電気','畳','建具','ガラス','塗装','材料','その他'].map(value => <option key={value}>{value}</option>)}</select>";
if(!s.includes(selectNeedle))fail('業種selectを特定できません。');
fs.copyFileSync(p,b);
try{
 const states=`\n  /* ${mark} */\n  const contractorTradeStorageKey='mcross_contractor_trades_v1'\n  const defaultContractorTrades=['内装','設備','清掃','電気','畳','建具','ガラス','塗装','材料','その他']\n  const [contractorTrades,setContractorTrades]=useState(()=>{try{const saved=JSON.parse(localStorage.getItem(contractorTradeStorageKey)||'[]');const values=Array.isArray(saved)?saved:[];return [...new Set([...defaultContractorTrades,...values])]}catch{return defaultContractorTrades}})\n  const [newContractorTrade,setNewContractorTrade]=useState('')\n  const [showTradeManager,setShowTradeManager]=useState(false)\n  function saveContractorTrades(next){const clean=[...new Set(next.map(value=>String(value||'').trim()).filter(Boolean))];setContractorTrades(clean);try{localStorage.setItem(contractorTradeStorageKey,JSON.stringify(clean))}catch{}}`;
 s=s.slice(0,ap+anchor.length)+states+s.slice(ap+anchor.length);
 s=s.replace(selectNeedle,"<select value={contractorForm.trade} onChange={event => setContractorForm(previous => ({...previous,trade:event.target.value}))}>{contractorTrades.map(value => <option key={value}>{value}</option>)}</select>");
 const tradeLabel='<label><span>業種</span>';
 const tp=s.indexOf(tradeLabel,s.indexOf('className="contractorForm"'));if(tp<0)throw new Error('業種欄を再特定できません。');
 const tradeEnd=s.indexOf('</label>',tp)+8;
 const manage=`<div className="tradeManageRow"><button type="button" onClick={() => setShowTradeManager(previous => !previous)}>⚙ 業種管理</button></div>${showTradeManager?'' : ''}`;
 s=s.slice(0,tradeEnd)+manage+s.slice(tradeEnd);
 // Insert manager after contractor form, inside picker.
 const formClose=s.indexOf('</form>',tradeEnd)+7;if(formClose<7)throw new Error('業者フォーム終了を特定できません。');
 const manager=`\n                        {showTradeManager && <section className="tradeManager">\n                          <strong>業種マスター</strong>\n                          <div className="tradeAddRow"><input value={newContractorTrade} onChange={event=>setNewContractorTrade(event.target.value)} placeholder="新しい業種名"/><button type="button" onClick={()=>{const value=newContractorTrade.trim();if(!value)return;saveContractorTrades([...contractorTrades,value]);setNewContractorTrade('');setContractorForm(previous=>({...previous,trade:value}))}}>＋ 追加</button></div>\n                          <div className="tradeChipList">{contractorTrades.map(value=><div className="tradeChip" key={value}><span>{value}</span><button type="button" disabled={contractors.some(item=>item.trade===value)} title={contractors.some(item=>item.trade===value)?'この業種を使用中の業者があります':''} onClick={()=>{if(!window.confirm(value+'を業種マスターから削除しますか？'))return;const next=contractorTrades.filter(item=>item!==value);saveContractorTrades(next);if(contractorForm.trade===value)setContractorForm(previous=>({...previous,trade:next[0]||''}))}}>×</button></div>)}</div>\n                          <small>使用中の業種は、業者を別の業種へ変更してから削除できます。</small>\n                        </section>}`;
 s=s.slice(0,formClose)+manager+s.slice(formClose);
 const cssAnchor='.contractorFormWide{grid-column:1/-1}';if(!s.includes(cssAnchor))throw new Error('CSS位置が見つかりません。');
 s=s.replace(cssAnchor,cssAnchor+`.tradeManageRow{display:flex;align-items:end}.tradeManageRow button{min-height:42px;border:1px solid #d7c8d2;border-radius:9px;background:#fff;color:inherit;font:inherit;font-weight:800}.tradeManager{grid-column:1/-1;display:grid;gap:10px;padding:12px;border:1px solid rgba(110,145,232,.42);border-radius:12px;background:rgba(110,145,232,.06)}.tradeAddRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.tradeAddRow button{min-height:42px}.tradeChipList{display:flex;flex-wrap:wrap;gap:7px}.tradeChip{display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid #d7c8d2;border-radius:999px;background:#fff}.tradeChip button{width:28px;height:28px;border:0;border-radius:50%;background:#f5e9ed;color:#b73f53;font-weight:900}.tradeChip button:disabled{opacity:.3}@media(max-width:520px){.tradeAddRow{grid-template-columns:1fr}}`);
 fs.writeFileSync(p,s,'utf8');
 console.log('業者フォームに業種マスターの追加・削除機能を追加しました。');
 childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 業種マスターV2を適用しました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
