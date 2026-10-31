const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-default-contractors-v1';
const mark='M-CROSS_DEFAULT_CONTRACTORS_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 協力業者デフォルトV1は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_CONTRACTOR_MASTER_PICKER_V2_SAFE'))fail('業者マスターV2が見つかりません。変更していません。');
const key="  const contractorMasterStorageKey = 'mcross_contractor_master_v1'";
const kp=s.indexOf(key);
if(kp<0)fail('業者マスター保存キーを特定できません。');
const stateStart='  const [contractors, setContractors] = useState(() => {';
const sp=s.indexOf(stateStart,kp);
const nextState=s.indexOf('  const [showContractorPicker, setShowContractorPicker]',sp);
if(sp<0||nextState<0)fail('contractors初期化範囲を特定できません。');
const defaults=`\n  /* ${mark} */\n  const defaultContractors = [\n    { id:'default-ogura-cross', name:'株式会社 小倉クロス', trade:'内装', postalCode:'', address:'', memo:'' },\n    { id:'default-uesaka-kamiten', name:'株式会社 上坂紙店', trade:'材料', postalCode:'', address:'', memo:'' },\n    { id:'default-sincol', name:'シンコール 株式会社', trade:'材料', postalCode:'', address:'', memo:'' },\n    { id:'default-interior-hisasue', name:'インテリアヒサスエ', trade:'内装', postalCode:'', address:'', memo:'' },\n    { id:'default-yamamoto-naiso', name:'山本内装', trade:'内装', postalCode:'', address:'', memo:'' },\n    { id:'default-nakano', name:'NAKANO', trade:'その他', postalCode:'〒003-0021', address:'北海道札幌市白石区栄通15丁目12-10 プロスト15-105号室', memo:'ドアノブにキーボックス 3956' },\n    { id:'default-tosho', name:'合同会社東勝', trade:'その他', postalCode:'〒', address:'札幌市北区新琴似1条11丁目3-12', memo:'' },\n    { id:'default-dream-interior', name:'ドリームインテリア', trade:'内装', postalCode:'', address:'', memo:'' },\n    { id:'default-idea-clean', name:'イデアトータルクリーン', trade:'清掃', postalCode:'', address:'', memo:'' },\n    { id:'default-eisei-senjo', name:'有限会社衛生洗浄設備', trade:'設備', postalCode:'', address:'', memo:'' },\n    { id:'default-itobiken', name:'ItoBiken', trade:'その他', postalCode:'', address:'', memo:'' },\n    { id:'default-kagawa-tategu', name:'株式会社香川建具製作所', trade:'建具', postalCode:'', address:'', memo:'' },\n    { id:'default-glass-freak', name:'株式会社ガラスフリーク', trade:'ガラス', postalCode:'', address:'', memo:'' },\n    { id:'default-narita-glass', name:'株式会社成田ガラス', trade:'ガラス', postalCode:'', address:'', memo:'' },\n    { id:'default-sapporo-veneer', name:'株式会社札幌ベニヤ商会', trade:'材料', postalCode:'', address:'', memo:'' },\n    { id:'default-taihei-kenzai', name:'泰平建材株式会社', trade:'材料', postalCode:'', address:'', memo:'' },\n    { id:'default-decos', name:'Deco’s', trade:'その他', postalCode:'', address:'', memo:'' },\n    { id:'default-kudo-tatami', name:'工藤畳商会', trade:'畳', postalCode:'', address:'', memo:'' },\n    { id:'default-hokusai', name:'合同会社塗装工房北彩', trade:'塗装', postalCode:'', address:'', memo:'' },\n    { id:'default-egas', name:'株式会社eガス', trade:'設備', postalCode:'', address:'', memo:'' },\n    { id:'default-yek', name:'YEK設備サービス', trade:'設備', postalCode:'', address:'', memo:'' },\n    { id:'default-benrys', name:'ベンリーズ札幌', trade:'その他', postalCode:'', address:'', memo:'' },\n    { id:'default-sclean', name:'S・Clean', trade:'清掃', postalCode:'', address:'', memo:'' },\n    { id:'default-tf-qreate', name:'合同会社TF Qreate', trade:'その他', postalCode:'', address:'', memo:'' },\n    { id:'default-kitagawa', name:'株式会社北川', trade:'その他', postalCode:'〒065-0020', address:'札幌市東区北20条東16丁目5-29', memo:'' },\n    { id:'default-rs', name:'R＆S', trade:'その他', postalCode:'〒063-0826', address:'札幌市西区発寒６条７丁目2-7 コーポ春日 102号室', memo:'' },\n    { id:'default-art-zeal', name:'アートジール', trade:'その他', postalCode:'〒', address:'', memo:'' },\n    { id:'default-reborn', name:'株式会社暮らしのReborn', trade:'その他', postalCode:'〒', address:'札幌市南区石山4条6丁目1-20', memo:'' },\n  ].map(item => ({...item,contact:'',phone:'',hidden:false,createdAt:'default'}))\n`;
const init=`  const [contractors, setContractors] = useState(() => {\n    try {\n      const stored=JSON.parse(localStorage.getItem(contractorMasterStorageKey)||'[]')\n      const existing=Array.isArray(stored)?stored:[]\n      const normalizedNames=new Set(existing.map(item=>String(item?.name||'').trim()).filter(Boolean))\n      const missing=defaultContractors.filter(item=>!normalizedNames.has(item.name))\n      const merged=[...existing,...missing]\n      if(missing.length) localStorage.setItem(contractorMasterStorageKey,JSON.stringify(merged))\n      return merged\n    } catch { return defaultContractors }\n  })\n`;
fs.copyFileSync(p,b);
try{
 s=s.slice(0,kp+key.length)+defaults+s.slice(kp+key.length);
 const sp2=s.indexOf(stateStart,kp), ns2=s.indexOf('  const [showContractorPicker, setShowContractorPicker]',sp2);
 if(sp2<0||ns2<0)throw new Error('contractors初期化範囲の再特定に失敗しました。');
 s=s.slice(0,sp2)+init+s.slice(ns2);
 // Expand trade options without assuming unknown firms' category beyond user-provided context.
 const old="{['内装','設備','清掃','電気','畳','建具','その他'].map(value => <option key={value}>{value}</option>)}";
 const neu="{['内装','設備','清掃','電気','畳','建具','ガラス','塗装','材料','その他'].map(value => <option key={value}>{value}</option>)}";
 if(s.includes(old))s=s.replace(old,neu);
 fs.writeFileSync(p,s,'utf8');
 console.log('現協力業者をデフォルト業者マスターとして追加しました。既存登録は維持し、同名は重複追加しません。');
 childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 協力業者デフォルトV1を適用しました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
