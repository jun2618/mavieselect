const fs=require('fs');
const path=require('path');
const root=process.cwd();
const f=path.join(root,'src','App.jsx');
const backup=f+'.global-property-voice-search-v3-backup';
const marker='M-CROSS_GLOBAL_PROPERTY_VOICE_SEARCH_V3_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx が見つかりません');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const original=s;
function once(label,re,to){const m=s.match(re);if(!m||m.length!==1){console.error('ERROR: '+label+' MATCH='+(m?m.length:0));process.exit(1)}s=s.replace(re,to)}
// alias: insert before aliases object closing brace
if(!/\binove\s*:/.test(s)){
  const re=/(const aliases\s*=\s*\{[\s\S]*?shushu\s*:\s*'chouchou',)(\r?\n\s*\})/;
  if(!re.test(s)){console.error('ERROR: alias anchor not found');process.exit(1)}
  s=s.replace(re,"$1\n    inove: 'inobe',\n    inobe: 'inove',$2");
}
// states
const state="  const [propertyListSearch, setPropertyListSearch] = useState('')";
if(!s.includes(state)){console.error('ERROR: propertyListSearch state not found');process.exit(1)}
s=s.replace(state,state+"\n  /* "+marker+" */\n  const [showGlobalPropertySearch, setShowGlobalPropertySearch] = useState(false)\n  const [globalPropertySearch, setGlobalPropertySearch] = useState('')\n  const [globalPropertyVoiceListening, setGlobalPropertyVoiceListening] = useState(false)\n  const [globalPropertyVoiceStatus, setGlobalPropertyVoiceStatus] = useState('')");
// function before unit state
const unit="  const [unit, setUnit] = useState('')";
if(!s.includes(unit)){console.error('ERROR: unit state not found');process.exit(1)}
const fn=`  function startGlobalPropertyVoiceSearch() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setShowGlobalPropertySearch(true)
    if (!Recognition) { setGlobalPropertyVoiceStatus('このブラウザーでは音声検索を利用できません'); return }
    try {
      const recognition = new Recognition()
      recognition.lang = 'ja-JP'; recognition.continuous = false; recognition.interimResults = false; recognition.maxAlternatives = 1
      setGlobalPropertyVoiceListening(true); setGlobalPropertyVoiceStatus('🎤 聞き取り中…')
      recognition.onresult = event => { const text=String(event.results?.[0]?.[0]?.transcript||'').trim(); setGlobalPropertySearch(text); setGlobalPropertyVoiceStatus(text?'検索：'+text:'音声を認識できませんでした') }
      recognition.onerror = event => setGlobalPropertyVoiceStatus('音声検索エラー: '+(event.error||'認識できませんでした'))
      recognition.onend = () => setGlobalPropertyVoiceListening(false)
      recognition.start()
    } catch(error) { setGlobalPropertyVoiceListening(false); setGlobalPropertyVoiceStatus('音声検索を開始できませんでした'); console.error(error) }
  }

`;
s=s.replace(unit,fn+unit);
// company label exact structural regex, only first around 管理会社
const companyRe=/              <label>\r?\n\s*<span>管理会社<\/span>\r?\n\s*<select value=\{company\} onChange=\{event => \{[\s\S]*?\r?\n\s*<\/select>\r?\n\s*<\/label>/;
if(!companyRe.test(s)){console.error('ERROR: company label not found');process.exit(1)}
const ui=`              <div className="companyVoiceSearchRow">
                <label>
                  <span>管理会社</span>
                  <select value={company} onChange={event => {
                    setCompany(event.target.value)
                    setPropertySearch('')
                    setSelectedProperty(null)
                    setSaveStatus('')
                  }}>
                    <option value="">管理会社を選択</option>
                    {companies.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
                <button className="globalPropertyVoiceButton" type="button" disabled={globalPropertyVoiceListening} onClick={startGlobalPropertyVoiceSearch} aria-label="全物件を音声検索">{globalPropertyVoiceListening?'🎤…':'🎤'}</button>
              </div>
              {showGlobalPropertySearch && <div className="globalPropertySearchBackdrop" onClick={() => setShowGlobalPropertySearch(false)}>
                <section className="globalPropertySearchPanel" role="dialog" aria-modal="true" aria-label="全物件検索" onClick={event => event.stopPropagation()}>
                  <div className="globalPropertySearchHeader"><div><strong>🎤 全物件検索</strong><small>管理会社を問わず検索</small></div><button type="button" onClick={() => setShowGlobalPropertySearch(false)}>×</button></div>
                  <div className="globalPropertySearchInputRow"><input autoFocus value={globalPropertySearch} onChange={event=>setGlobalPropertySearch(event.target.value)} placeholder="シュシュ大曲／大曲／イノベ"/><button type="button" disabled={globalPropertyVoiceListening} onClick={startGlobalPropertyVoiceSearch}>🎤</button></div>
                  {globalPropertyVoiceStatus && <small className="globalPropertyVoiceStatus">{globalPropertyVoiceStatus}</small>}
                  <div className="globalPropertySearchResults">{(()=>{const forms=searchForms(globalPropertySearch);const results=forms.length?mergedPropertyMaster.properties.filter(item=>matchesProperty(item,forms)||searchForms(item.address).some(v=>forms.some(q=>v.includes(q)||q.includes(v)))).slice(0,50):[];if(!globalPropertySearch.trim())return <p className="empty">物件名を話すか入力してください</p>;if(!results.length)return <p className="empty">一致する物件がありません</p>;return results.map((item,index)=><button className="globalPropertySearchItem" type="button" key={item.id||[item.company,item.name,index].join('|')} onClick={()=>{setCompany(item.company||'');setSelectedProperty(item);setPropertySearch(item.name||'');setSaveStatus('');setShowGlobalPropertySearch(false)}}><strong>{item.name}</strong><small>{item.company||'管理会社未設定'}</small><span>{item.address||'住所未登録'}</span></button>)})()}</div>
                </section>
              </div>}`;
s=s.replace(companyRe,ui);
// styles append safely to styles template before .address rule
const styleAnchor='  .address { display:grid; gap:8px; margin:8px 0 20px; padding:15px; border:1px dashed #efc7b4; border-radius:15px; background:#fff7ed; }';
if(!s.includes(styleAnchor)){console.error('ERROR: style anchor not found');process.exit(1)}
const styles=`  .companyVoiceSearchRow{display:grid;grid-template-columns:minmax(0,1fr) 58px;gap:10px;align-items:end;margin-bottom:18px}.companyVoiceSearchRow label{margin:0}.globalPropertyVoiceButton{min-height:54px;border:2px solid #efc7b4;border-radius:14px;background:#fff7ed;color:#c96e69;font-size:24px;font-weight:900;cursor:pointer}.globalPropertySearchBackdrop{position:fixed;z-index:2200;inset:0;display:grid;place-items:start center;padding:24px 14px;background:rgba(10,12,18,.72);overflow:auto}.globalPropertySearchPanel{width:min(100%,680px);padding:18px;border-radius:20px;background:#fffaf5;box-shadow:0 20px 60px rgba(0,0,0,.35)}.globalPropertySearchHeader{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.globalPropertySearchHeader>div{display:grid;gap:4px}.globalPropertySearchHeader button{min-width:42px;min-height:42px;border:0;border-radius:12px}.globalPropertySearchInputRow{display:grid;grid-template-columns:minmax(0,1fr) 52px;gap:8px;margin-top:14px}.globalPropertySearchInputRow input{min-width:0;min-height:52px;padding:0 14px;border:2px solid #ead8cb;border-radius:14px;font:inherit}.globalPropertySearchInputRow button{border:0;border-radius:14px;background:#e98c76;color:#fff;font-size:20px}.globalPropertyVoiceStatus{display:block;margin:8px 2px}.globalPropertySearchResults{display:grid;gap:8px;max-height:58vh;margin-top:12px;overflow:auto}.globalPropertySearchItem{display:grid;gap:3px;padding:12px 14px;border:1px solid #ead8cb;border-radius:14px;background:#fff;text-align:left}.globalPropertySearchItem small{color:#d27f6d;font-weight:800}`;
s=s.replace(styleAnchor,styles+'\n'+styleAnchor);
fs.copyFileSync(f,backup);
fs.writeFileSync(f,s,'utf8');
console.log('OK: 全管理会社対応の物件音声検索V3を追加しました');
console.log('BACKUP: '+backup);
