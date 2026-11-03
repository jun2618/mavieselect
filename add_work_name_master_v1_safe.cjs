const fs=require("fs");
const p="./src/App.jsx";
let s=fs.readFileSync(p,"utf8");
const mark="M-CROSS_WORK_NAME_MASTER_V1_SAFE";
if(s.includes(mark)){console.log("OK: 工事名マスターは追加済みです");process.exit(0)}
const stateAnchor="  const [workName, setWorkName] = useState('原状回復工事')";
const state=stateAnchor+"\n  /* "+mark+" */\n  const workNameMasterKey='mcross_work_name_master_v1'\n  const defaultWorkNames=['原状回復工事','内装工事','修繕工事','設備工事']\n  const [workNameMaster,setWorkNameMaster]=useState(()=>{try{const v=JSON.parse(localStorage.getItem(workNameMasterKey)||'null');return Array.isArray(v)&&v.length?v:defaultWorkNames}catch{return defaultWorkNames}})";
const titleOld="settingsPage === 'rooms' ? '初期部屋設定' : settingsPage === 'pricing' ? '単価・概算設定' : '管理会社・物件管理'";
const titleNew="settingsPage === 'rooms' ? '初期部屋設定' : settingsPage === 'worknames' ? '工事名マスター' : settingsPage === 'pricing' ? '単価・概算設定' : '管理会社・物件管理'";
const menuAnchor="<button className=\"settingsMenuButton\" type=\"button\" onClick={() => setSettingsPage('rooms')}><span>🏠 新規物件の初期部屋</span><span>›</span></button>";
const menuNew=menuAnchor+"\n                <button className=\"settingsMenuButton\" type=\"button\" onClick={() => setSettingsPage('worknames')}><span>🏷️ 工事名マスター</span><span>›</span></button>";
const pageAnchor="{settingsPage === 'pricing' && (<>";
const pageNew="{settingsPage === 'worknames' && (<>\n              <GlobalListEditor title=\"🏷️ 工事名マスター\" description=\"案件・見積書・Excelで使用する工事名候補を編集します。\" items={workNameMaster} storageKey={workNameMasterKey} setter={setWorkNameMaster} fallback={defaultWorkNames} />\n              </>)}\n              "+pageAnchor;
const listOld="<datalist id=\"mcross-work-name-options\">\n                  <option value=\"原状回復工事\" />\n                  <option value=\"内装工事\" />\n                  <option value=\"修繕工事\" />\n                  <option value=\"設備工事\" />\n                </datalist>";
const listNew="<datalist id=\"mcross-work-name-options\">{workNameMaster.map(name=><option key={name} value={name} />)}</datalist>";
const checks=[[stateAnchor,state],[titleOld,titleNew],[menuAnchor,menuNew],[pageAnchor,pageNew],[listOld,listNew]];
for(const [oldText] of checks){if(!s.includes(oldText)){console.error("ERROR: 挿入位置が見つかりません。変更していません");process.exit(1)}}
fs.copyFileSync(p,p+".backup_before_work_name_master_"+Date.now());
for(const [oldText,newText] of checks)s=s.replace(oldText,newText);
fs.writeFileSync(p,s,"utf8");
console.log("OK: 工事名マスターを追加しました");
