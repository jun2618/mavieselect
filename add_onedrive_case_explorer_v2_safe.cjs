const fs = require('fs');
const path = require('path');
const p = path.resolve('./src/OneDriveSyncPanel.jsx');
const marker = 'M-CROSS_ONEDRIVE_CASE_EXPLORER_V2_SAFE';
const backup = path.resolve('./src/OneDriveSyncPanel.before_cloud_explorer_v2.jsx');
const original = fs.readFileSync(p, 'utf8');
if (original.includes(marker)) { console.log('ALREADY APPLIED'); process.exit(0); }
let s = original;

function must(condition, message) { if (!condition) throw new Error(message); }

const stateAnchor = "  const [selectedKeys, setSelectedKeys] = useState([])";
must(s.includes(stateAnchor), 'state位置なし');
s = s.replace(stateAnchor, stateAnchor + `
  /* ${marker} */
  const [cloudSearch,setCloudSearch]=useState('')
  const [cloudPath,setCloudPath]=useState([])
  const [cloudVoiceListening,setCloudVoiceListening]=useState(false)
  const [cloudVoiceStatus,setCloudVoiceStatus]=useState('')`);

const functionAnchor = '  function importSelected() {';
must(s.includes(functionAnchor), 'importSelected位置なし');
const helpers = `  function startCloudVoiceSearch(){
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition
    if(!Recognition){setCloudVoiceStatus('このブラウザーでは音声検索を利用できません');return}
    try{
      const recognition=new Recognition()
      recognition.lang='ja-JP';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=1
      setCloudVoiceListening(true);setCloudVoiceStatus('🎤 聞き取り中…')
      recognition.onresult=event=>{const text=String(event.results?.[0]?.[0]?.transcript||'').trim();setCloudSearch(text);setCloudPath([]);setCloudVoiceStatus(text?'検索：'+text:'音声を認識できませんでした')}
      recognition.onerror=event=>setCloudVoiceStatus('音声検索エラー: '+(event.error||'認識できませんでした'))
      recognition.onend=()=>setCloudVoiceListening(false)
      recognition.start()
    }catch(error){console.error(error);setCloudVoiceListening(false);setCloudVoiceStatus('音声検索を開始できませんでした')}
  }

  async function restoreCloudEntry(entry){
    if(!entry?.storageKey){setStatus('復元できる保存キーがありません');return}
    const label=(entry.propertyName||'物件名なし')+' '+(entry.unit||'')+'号室'
    if(!window.confirm('「'+label+'」をこの端末へ復元しますか？'))return
    try{localStorage.setItem(entry.storageKey,JSON.stringify(entry));setStatus('復元成功: '+label+'。保存済み一覧を開き直してください。');await compareWithOneDrive()}catch(error){console.error(error);setStatus('復元失敗: '+(error?.message||String(error)))}
  }

  async function deleteCloudEntry(entry){
    const key=entryKey(entry)
    const label=(entry.propertyName||'物件名なし')+' '+(entry.unit||'')+'号室'
    if(!window.confirm('「'+label+'」をOneDriveバックアップから削除します。\\nこの操作は取り消せません。続けますか？'))return
    try{
      setStatus('OneDriveから削除しています…')
      const token=await getToken()
      const cloud=await fetchCloudBackup()
      const nextEntries=(Array.isArray(cloud.entries)?cloud.entries:[]).filter(item=>entryKey(item)!==key)
      const payload={...cloud,fileType:'m-cross-backup',version:Math.max(Number(cloud.version)||1,2),exportedAt:new Date().toISOString(),entries:nextEntries,entryCount:nextEntries.length}
      const response=await fetch(backupFileUrl,{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify(payload,null,2)})
      if(!response.ok)throw new Error('OneDrive削除失敗 HTTP '+response.status)
      setCloudBackup(payload);setComparison(compareEntries(readLocalEntries(),nextEntries));setCloudPath([]);setStatus('OneDriveから削除しました: '+label)
    }catch(error){console.error(error);setStatus('OneDrive削除失敗: '+(error?.message||String(error)))}
  }

`;
s = s.replace(functionAnchor, helpers + functionAnchor);

const listStartToken = '          {comparison.length > 0 && (';
const listEndToken = '          {importCandidates.length > 0 && (';
const listStart = s.indexOf(listStartToken);
const listEnd = s.indexOf(listEndToken, listStart + 1);
must(listStart >= 0, '比較一覧開始位置なし');
must(listEnd > listStart, '比較一覧終了位置なし');
const explorer = `          {cloudBackup && Array.isArray(cloudBackup.entries) && cloudBackup.entries.length > 0 && (()=>{
            const q=cloudSearch.trim().toLocaleLowerCase('ja')
            const source=cloudBackup.entries.filter(entry=>!q||[entry.company,entry.propertyName,entry.address,entry.unit,entry.workName].join(' ').toLocaleLowerCase('ja').includes(q))
            const nodes=source.map(entry=>{const date=new Date(entry.updatedAt||entry.createdAt||cloudBackup.exportedAt||0);const valid=!Number.isNaN(date.getTime());return{entry,levels:[valid?date.getFullYear()+'年':'日付不明',valid?(date.getMonth()+1)+'月':'月不明',entry.company||'管理会社未設定',entry.propertyName||'物件名なし']}})
            const matching=nodes.filter(node=>cloudPath.every((part,index)=>node.levels[index]===part))
            const depth=cloudPath.length
            const folders=depth<4?[...new Set(matching.map(node=>node.levels[depth]))].sort((a,b)=>String(a).localeCompare(String(b),'ja',{numeric:true})):[]
            return <section className="cloudExplorer">
              <div className="cloudExplorerHead"><div><h3>☁ OneDrive案件エクスプローラー</h3><small>年 → 月 → 管理会社 → 物件</small></div></div>
              <div className="cloudExplorerSearch"><input value={cloudSearch} onChange={event=>{setCloudSearch(event.target.value);setCloudPath([])}} placeholder="物件名・号室・管理会社・工事名を検索"/><button type="button" disabled={cloudVoiceListening} onClick={startCloudVoiceSearch}>{cloudVoiceListening?'🎤…':'🎤'}</button></div>
              {cloudVoiceStatus&&<small className="cloudVoiceStatus">{cloudVoiceStatus}</small>}
              <div className="cloudCrumbs"><button type="button" onClick={()=>setCloudPath([])}>☁ OneDrive</button>{cloudPath.map((part,index)=><button type="button" key={index} onClick={()=>setCloudPath(cloudPath.slice(0,index+1))}>› {part}</button>)}</div>
              {depth<4?<div className="cloudFolders">{folders.map(folder=>{const count=matching.filter(node=>node.levels[depth]===folder).length;return <button className={'cloudFolder cloudFolder'+depth} type="button" key={folder} onClick={()=>setCloudPath(path=>[...path,folder])}><span>{depth<2?'📁':depth===2?'🗂️':'🏢'}</span><strong>{folder}</strong><small>{count}件</small></button>})}</div>:<div className="cloudFiles">{matching.map(({entry})=><article key={entryKey(entry)}><div><strong>📄 {entry.unit||''}号室 {entry.workName||'原状回復工事'}</strong><small>{entry.propertyName||'物件名なし'} ／ 更新 {entry.updatedAt?new Date(entry.updatedAt).toLocaleString('ja-JP'):'不明'}</small></div><div className="cloudFileActions"><button type="button" onClick={()=>restoreCloudEntry(entry)}>☁ この端末へ復元</button><button className="cloudDelete" type="button" onClick={()=>deleteCloudEntry(entry)}>🗑 OneDriveから削除</button></div></article>)}</div>}
            </section>
          })()}
`;
s = s.slice(0, listStart) + explorer + s.slice(listEnd);

const cssAnchor = '.oneDriveCompareList{display:grid;gap:8px}';
must(s.includes(cssAnchor), 'CSS位置なし');
const css = `.cloudExplorer{display:grid;gap:12px;padding:14px;border:1px solid rgba(115,92,190,.28);border-radius:18px;background:rgba(255,255,255,.55)}.cloudExplorerHead{display:flex;justify-content:space-between;gap:10px}.cloudExplorerHead h3{margin:0}.cloudExplorerHead small{opacity:.7}.cloudExplorerSearch{display:grid;grid-template-columns:minmax(0,1fr) 52px;gap:8px}.cloudExplorerSearch input{min-width:0;min-height:48px;padding:0 12px;border:1px solid #cfc2e8;border-radius:13px;font:inherit}.cloudExplorerSearch button{border:0;border-radius:13px;background:#b68bd7;color:#fff;font-size:21px}.cloudVoiceStatus{color:#8b5ea7;font-weight:800}.cloudCrumbs{display:flex;flex-wrap:wrap;gap:6px}.cloudCrumbs button{border:0;border-radius:999px;padding:7px 10px;background:#f1e8fb;color:#684c7e;font:inherit;font-weight:800}.cloudFolders{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px}.cloudFolder{display:grid;gap:4px;min-height:105px;padding:19px 13px 12px;border:0;border-radius:9px 17px 17px;color:#554b58;text-align:left;font:inherit;box-shadow:0 7px 16px rgba(67,55,75,.14)}.cloudFolder span{font-size:29px}.cloudFolder0{background:linear-gradient(145deg,#ffdbe8,#f4b9d0)}.cloudFolder1{background:linear-gradient(145deg,#dff4ff,#acdcef)}.cloudFolder2{background:linear-gradient(145deg,#eee2ff,#ceb8ed)}.cloudFolder3{background:linear-gradient(145deg,#ddf7e9,#aee2c9)}.cloudFiles{display:grid;gap:10px}.cloudFiles article{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:12px;border:1px solid rgba(38,114,236,.22);border-radius:13px;background:#fff}.cloudFiles article>div:first-child{display:grid;gap:4px}.cloudFiles small{opacity:.72}.cloudFileActions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.cloudFileActions button{min-height:42px;border:0;border-radius:10px;background:#2672ec;color:#fff;font:inherit;font-weight:800}.cloudFileActions .cloudDelete{background:#d75f72}@media(max-width:620px){.cloudFolders{grid-template-columns:1fr 1fr}.cloudFiles article{grid-template-columns:1fr}.cloudFileActions{grid-template-columns:1fr}}`;
s = s.replace(cssAnchor, css + cssAnchor);

must(s.includes(marker), 'マーカー未挿入');
fs.copyFileSync(p, backup);
fs.writeFileSync(p, s, 'utf8');
console.log('OK: OneDrive案件エクスプローラーV2を追加しました');
