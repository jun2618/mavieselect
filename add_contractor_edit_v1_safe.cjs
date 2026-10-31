const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-contractor-edit-v1';
const mark='M-CROSS_CONTRACTOR_EDIT_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 業者編集V1は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_CONTRACTOR_MASTER_PICKER_V2_SAFE'))fail('業者マスターV2が見つかりません。');
const stateAnchor="  const [showContractorForm, setShowContractorForm] = useState(false)";
const sp=s.indexOf(stateAnchor);
if(sp<0)fail('業者フォームstateを特定できません。');
const actions='<div className="contractorCardActions">';
const ap=s.indexOf(actions);
if(ap<0)fail('業者カード操作欄を特定できません。');
fs.copyFileSync(p,b);
try{
 s=s.slice(0,sp+stateAnchor.length)+`\n  /* ${mark} */\n  const [editingContractorId, setEditingContractorId] = useState('')`+s.slice(sp+stateAnchor.length);
 // New supplier button becomes an explicit reset into create mode.
 s=s.replace("onClick={() => setShowContractorForm(previous => !previous)}>＋ 新規業者</button>","onClick={() => { setEditingContractorId(''); setContractorForm({name:'',trade:'内装',contact:'',phone:'',memo:'',postalCode:'',address:''}); setShowContractorForm(true) }}>＋ 新規業者</button>");
 // Ensure form has postal and address fields in state if older shape is used.
 s=s.replace("useState({name:'',trade:'内装',contact:'',phone:'',memo:''})","useState({name:'',trade:'内装',contact:'',phone:'',memo:'',postalCode:'',address:''})");
 // Replace submit creation core with create/update branch.
 const submitOld="const item={id:'contractor-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),name,trade:contractorForm.trade||'その他',contact:contractorForm.contact.trim(),phone:contractorForm.phone.trim(),memo:contractorForm.memo.trim(),hidden:false,createdAt:new Date().toISOString()}\n                          saveContractors([...contractors,item]); setOrderDraft(previous => ({...previous,contractor:item.name,contractorId:item.id})); setContractorForm({name:'',trade:'内装',contact:'',phone:'',memo:''}); setShowContractorForm(false); setShowContractorPicker(false)";
 if(!s.includes(submitOld))throw new Error('業者登録submit処理を特定できません。');
 const submitNew="const values={name,trade:contractorForm.trade||'その他',contact:contractorForm.contact.trim(),phone:contractorForm.phone.trim(),memo:contractorForm.memo.trim(),postalCode:String(contractorForm.postalCode||'').trim(),address:String(contractorForm.address||'').trim()}\n                          if(editingContractorId){ const next=contractors.map(current=>current.id===editingContractorId?{...current,...values,updatedAt:new Date().toISOString()}:current); saveContractors(next); if(orderDraft?.contractorId===editingContractorId)setOrderDraft(previous=>({...previous,contractor:name})); } else { const item={id:'contractor-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),...values,hidden:false,createdAt:new Date().toISOString()}; saveContractors([...contractors,item]); setOrderDraft(previous=>({...previous,contractor:item.name,contractorId:item.id})); } setContractorForm({name:'',trade:'内装',contact:'',phone:'',memo:'',postalCode:'',address:''}); setEditingContractorId(''); setShowContractorForm(false)";
 s=s.replace(submitOld,submitNew);
 // Add postal/address inputs and dynamic submit label.
 const memoLabel=`<label className="contractorFormWide"><span>メモ</span><input value={contractorForm.memo} onChange={event => setContractorForm(previous => ({...previous,memo:event.target.value}))} /></label>`;
 if(!s.includes(memoLabel))throw new Error('業者メモ入力欄を特定できません。');
 s=s.replace(memoLabel,`<label><span>郵便番号</span><input value={contractorForm.postalCode || ''} onChange={event => setContractorForm(previous => ({...previous,postalCode:event.target.value}))} placeholder="〒000-0000" /></label>\n                          <label className="contractorFormWide"><span>住所</span><input value={contractorForm.address || ''} onChange={event => setContractorForm(previous => ({...previous,address:event.target.value}))} /></label>\n                          ${memoLabel}`);
 s=s.replace('<button className="primary contractorFormWide" type="submit">登録して発注先に選択</button>','<button className="primary contractorFormWide" type="submit">{editingContractorId ? \'変更を保存\' : \'登録して発注先に選択\'}</button>');
 // Add Edit button as the first card action.
 const ap2=s.indexOf(actions);
 const pos=ap2+actions.length;
 const edit=`<button type="button" onClick={() => { setEditingContractorId(item.id); setContractorForm({name:item.name||'',trade:item.trade||'その他',contact:item.contact||'',phone:item.phone||'',memo:item.memo||'',postalCode:item.postalCode||'',address:item.address||''}); setShowContractorForm(true); document.querySelector('.contractorForm')?.scrollIntoView({behavior:'smooth',block:'center'}) }}>編集</button>`;
 s=s.slice(0,pos)+edit+s.slice(pos);
 fs.writeFileSync(p,s,'utf8');
 console.log('協力業者マスターに編集機能を追加しました。');
 childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 業者編集V1を適用しました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
