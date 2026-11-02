const fs=require('fs'),cp=require('child_process'),path=require('path');
const file=path.join(process.cwd(),'src','App.jsx');
const marker='M-CROSS_SIMPLIFY_MATERIAL_ORDER_SCREEN_V1_SAFE';
if(!fs.existsSync(file)){console.error('ERROR: src/App.jsx not found');process.exit(1)}
let s=fs.readFileSync(file,'utf8');
if(s.length<100000){console.error('ERROR: App.jsx size abnormal');process.exit(1)}
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const backup=file+'.before-simplify-material-order-screen-'+Date.now()+'.bak';
const nl=s.includes('\r\n')?'\r\n':'\n';

// Clearer labels. Replace all visible variants, including JSX string expressions.
s=s.replaceAll('＋ 材料行を追加','＋ その他材料を追加');
s=s.replaceAll('💰 工種別単価を一括設定','💰 クロス・CFなどの単価をまとめて入力');
s=s.replaceAll('📦 材料発注書を下書き保存','📦 材料発注書を保存');
s=s.replaceAll('材料明細がありません。「材料行を追加」から追加してください。','材料がありません。「その他材料を追加」から入力できます。');

// Add a compact first-time guide immediately before the material draft panel.
const panelAnchor=`                  {purchaseOrderBranch === 'material' && (`+nl+`                    <section className="orderDraftPanel materialMobilePanel" aria-label="材料発注">`;
const panelCount=s.split(panelAnchor).length-1;
if(panelCount!==1){console.error('ERROR: material panel anchor MATCH='+panelCount+'; no changes');process.exit(1)}
const panelReplacement=`                  {purchaseOrderBranch === 'material' && (`+nl+`                    <section className="orderDraftPanel materialMobilePanel" aria-label="材料発注">`+nl+`                      {/* ${marker} */}`+nl+`                      <div className="materialSimpleSteps" aria-label="材料発注の手順">`+nl+`                        <strong>材料発注は3ステップ</strong>`+nl+`                        <span>1. 発注先を選ぶ　2. 数量・単価を確認　3. 材料発注書を保存</span>`+nl+`                      </div>`;
s=s.replace(panelAnchor,panelReplacement);

// Use CSS only for presentation. Existing behavior and data flows remain intact.
const cssAnchor='  /* M-CROSS_MATERIAL_ORDER_QUICK_SUMMARY_V39_SAFE */';
const cssIndex=s.indexOf(cssAnchor);
if(cssIndex<0){console.error('ERROR: CSS anchor not found; no changes');process.exit(1)}
const css=`  /* ${marker} */${nl}  .materialSimpleSteps{display:grid;gap:4px;margin:0 0 12px;padding:11px 13px;border:1px solid rgba(99,190,161,.5);border-radius:12px;background:rgba(99,190,161,.09);color:inherit}.materialSimpleSteps strong{font-size:16px}.materialSimpleSteps span{font-size:13px;color:#756a78}.materialOrderTopPreview{display:none!important}.materialMobilePanel>.blankMaterialOrderGuide{margin-top:0}.materialMobilePanel .secondaryButton,.materialMobilePanel .materialAddTopButton,.materialMobilePanel .primary{border-radius:11px;font-weight:900}.theme-dark .materialSimpleSteps,.theme-cyber .materialSimpleSteps,.theme-luxury .materialSimpleSteps,.theme-retro .materialSimpleSteps,.theme-galaxy .materialSimpleSteps{background:rgba(5,12,24,.76);color:#f3ffff}.theme-dark .materialSimpleSteps span,.theme-cyber .materialSimpleSteps span,.theme-luxury .materialSimpleSteps span,.theme-retro .materialSimpleSteps span,.theme-galaxy .materialSimpleSteps span{color:#cfefff}@media(max-width:620px){.materialSimpleSteps{padding:9px 10px}.materialSimpleSteps span{line-height:1.55}.materialMobilePanel{padding-bottom:24px!important}}${nl}`;
s=s.slice(0,cssIndex)+css+s.slice(cssIndex);

fs.copyFileSync(file,backup);
fs.writeFileSync(file,s,'utf8');
console.log('OK: material order screen simplified');
console.log('BACKUP:',backup);
const r=cp.spawnSync('npm',['run','build'],{shell:true,stdio:'inherit'});
if(r.status!==0){fs.copyFileSync(backup,file);console.error('ERROR: build failed; App.jsx restored');process.exit(r.status||1)}
console.log('OK: BUILD SUCCESS');
