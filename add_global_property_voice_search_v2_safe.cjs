const fs = require('fs');
const path = require('path');

const root = process.cwd();
const file = path.join(root, 'src', 'App.jsx');
const backup = file + '.global-property-voice-search-v1-backup';
const marker = 'M-CROSS_GLOBAL_PROPERTY_VOICE_SEARCH_V1_SAFE';

if (!fs.existsSync(file)) {
  console.error('ERROR: src/App.jsx が見つかりません。crossmeasureフォルダーで実行してください。');
  process.exit(1);
}

let s = fs.readFileSync(file, 'utf8');
if (s.includes(marker)) {
  console.log('ALREADY APPLIED');
  process.exit(0);
}

function replaceOnce(label, from, to) {
  const count = s.split(from).length - 1;
  if (count !== 1) throw new Error(label + ' MATCH=' + count);
  s = s.replace(from, to);
}

try {
  const aliasRe = /(\s*chouchou:\s*'shushu',\r?\n\s*shushu:\s*'chouchou',)/;
  if (!aliasRe.test(s)) throw new Error('INOVE alias MATCH=0');
  s = s.replace(aliasRe, `$1\n    inove: 'inobe',\n    inobe: 'inove',`);

  replaceOnce(
    'voice states',
    "  const [propertyListSearch, setPropertyListSearch] = useState('')",
    "  const [propertyListSearch, setPropertyListSearch] = useState('')\n  /* " + marker + " */\n  const [showGlobalPropertySearch, setShowGlobalPropertySearch] = useState(false)\n  const [globalPropertySearch, setGlobalPropertySearch] = useState('')\n  const [globalPropertyVoiceListening, setGlobalPropertyVoiceListening] = useState(false)\n  const [globalPropertyVoiceStatus, setGlobalPropertyVoiceStatus] = useState('')"
  );

  replaceOnce(
    'voice function',
    "  const [unit, setUnit] = useState('')",
    `  function startGlobalPropertyVoiceSearch() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      setGlobalPropertyVoiceStatus('このブラウザーでは音声検索を利用できません')
      setShowGlobalPropertySearch(true)
      return
    }
    try {
      const recognition = new Recognition()
      recognition.lang = 'ja-JP'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      setShowGlobalPropertySearch(true)
      setGlobalPropertyVoiceListening(true)
      setGlobalPropertyVoiceStatus('🎤 聞き取り中…')
      recognition.onresult = event => {
        const text = String(event.results?.[0]?.[0]?.transcript || '').trim()
        setGlobalPropertySearch(text)
        setGlobalPropertyVoiceStatus(text ? '検索：' + text : '音声を認識できませんでした')
      }
      recognition.onerror = event => setGlobalPropertyVoiceStatus('音声検索エラー: ' + (event.error || '認識できませんでした'))
      recognition.onend = () => setGlobalPropertyVoiceListening(false)
      recognition.start()
    } catch (error) {
      setGlobalPropertyVoiceListening(false)
      setShowGlobalPropertySearch(true)
      setGlobalPropertyVoiceStatus('音声検索を開始できませんでした')
      console.error(error)
    }
  }

  const [unit, setUnit] = useState('')`
  );

  const oldCompany = `              <label>
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
              </label>`;

  const newCompany = `              <div className="companyVoiceSearchRow">
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
                <button className="globalPropertyVoiceButton" type="button" disabled={globalPropertyVoiceListening} onClick={startGlobalPropertyVoiceSearch} aria-label="全物件を音声検索">
                  {globalPropertyVoiceListening ? '🎤…' : '🎤'}
                </button>
              </div>

              {showGlobalPropertySearch && <div className="globalPropertySearchBackdrop" onClick={() => setShowGlobalPropertySearch(false)}>
                <section className="globalPropertySearchPanel" role="dialog" aria-modal="true" aria-label="全物件検索" onClick={event => event.stopPropagation()}>
                  <div className="globalPropertySearchHeader"><div><strong>🎤 全物件検索</strong><small>管理会社を問わず、物件名・読み方・別名・住所を検索</small></div><button type="button" onClick={() => setShowGlobalPropertySearch(false)}>×</button></div>
                  <div className="globalPropertySearchInputRow">
                    <input autoFocus value={globalPropertySearch} onChange={event => setGlobalPropertySearch(event.target.value)} placeholder="例：シュシュ大曲／CHOUCHOU大曲／大曲／イノベ" />
                    <button type="button" disabled={globalPropertyVoiceListening} onClick={startGlobalPropertyVoiceSearch}>{globalPropertyVoiceListening ? '聞き取り中…' : '🎤'}</button>
                  </div>
                  {globalPropertyVoiceStatus && <small className="globalPropertyVoiceStatus">{globalPropertyVoiceStatus}</small>}
                  <div className="globalPropertySearchResults">
                    {(() => {
                      const forms = searchForms(globalPropertySearch)
                      const results = forms.length ? mergedPropertyMaster.properties.filter(item => matchesProperty(item, forms) || searchForms(item.address).some(value => forms.some(form => value.includes(form) || form.includes(value)))).slice(0, 50) : []
                      if (!globalPropertySearch.trim()) return <p className="empty">物件名を話すか入力してください</p>
                      if (!results.length) return <p className="empty">一致する物件がありません</p>
                      return results.map((item, index) => <button className="globalPropertySearchItem" type="button" key={item.id || [item.company,item.name,index].join('|')} onClick={() => {
                        setCompany(item.company || '')
                        setSelectedProperty(item)
                        setPropertySearch(item.name || '')
                        setSaveStatus('')
                        setShowGlobalPropertySearch(false)
                      }}><strong>{item.name}</strong><small>{item.company || '管理会社未設定'}</small><span>{item.address || '住所未登録'}</span></button>)
                    })()}
                  </div>
                </section>
              </div>}`;

  replaceOnce('company voice UI', oldCompany, newCompany);

  const styleAnchor = "  .address { display:grid; gap:8px; margin:8px 0 20px; padding:15px; border:1px dashed #efc7b4; border-radius:15px; background:#fff7ed; }";
  const styleBlock = `${styleAnchor}
  .companyVoiceSearchRow{display:grid;grid-template-columns:minmax(0,1fr) 56px;gap:10px;align-items:end}.companyVoiceSearchRow label{margin:0}.globalPropertyVoiceButton{min-height:54px;border:2px solid #efc7b4;border-radius:14px;background:#fff7ed;color:#c96e69;font-size:23px;font-weight:900}.globalPropertySearchBackdrop{position:fixed;z-index:2100;inset:0;display:grid;place-items:start center;padding:24px 14px;background:rgba(10,12,18,.72);overflow:auto}.globalPropertySearchPanel{width:min(100%,680px);padding:18px;border-radius:20px;background:#fffaf5;box-shadow:0 20px 60px rgba(0,0,0,.35)}.globalPropertySearchHeader{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.globalPropertySearchHeader>div{display:grid;gap:4px}.globalPropertySearchHeader button{min-width:42px;min-height:42px;border:0;border-radius:12px;background:#eee4de;font-size:22px}.globalPropertySearchInputRow{display:grid;grid-template-columns:minmax(0,1fr) 52px;gap:8px;margin-top:14px}.globalPropertySearchInputRow input{min-width:0;min-height:52px;padding:0 14px;border:2px solid #ead8cb;border-radius:14px;font:inherit}.globalPropertySearchInputRow button{border:0;border-radius:14px;background:#e98c76;color:#fff;font-size:20px}.globalPropertyVoiceStatus{display:block;margin:8px 2px;color:#7c6b75}.globalPropertySearchResults{display:grid;gap:8px;max-height:58vh;margin-top:12px;overflow:auto}.globalPropertySearchItem{display:grid;gap:3px;padding:12px 14px;border:1px solid #ead8cb;border-radius:14px;background:#fff;text-align:left}.globalPropertySearchItem strong{font-size:16px}.globalPropertySearchItem small{color:#d27f6d;font-weight:800}.globalPropertySearchItem span{color:#6d626d;font-size:13px}`;
  replaceOnce('voice styles', styleAnchor, styleBlock);

  fs.copyFileSync(file, backup);
  fs.writeFileSync(file, s, 'utf8');
  console.log('OK: 全管理会社対応の物件音声検索を追加しました。');
  console.log('BACKUP:', backup);
} catch (error) {
  console.error('ERROR:', error.message);
  console.error('変更していません。');
  process.exit(1);
}
