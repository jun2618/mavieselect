const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-contractor-picker-invisible-v3';
const mark='M-CROSS_CONTRACTOR_PICKER_INVISIBLE_V3_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 業者ピッカー表示修正V3は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_CONTRACTOR_MASTER_PICKER_V2_SAFE'))fail('業者マスターV2が見つかりません。変更していません。');
const backdrop='.contractorPickerBackdrop{position:fixed;z-index:2200;inset:0;display:grid;place-items:center;padding:12px;background:rgba(8,10,18,.72);backdrop-filter:blur(6px)}';
const panel='.contractorPickerPanel{width:min(100%,720px);max-height:92vh;overflow:auto;padding:18px;border-radius:20px;background:#fffaf6;color:#514751;box-shadow:0 20px 60px rgba(0,0,0,.35)}';
if(!s.includes(backdrop)||!s.includes(panel))fail('現在の業者ピッカーCSSを特定できません。変更していません。');
fs.copyFileSync(p,b);
try{
 const fixedBackdrop=`.contractorPickerBackdrop{position:fixed;z-index:2200;inset:0;display:grid;grid-template-columns:minmax(0,1fr);align-items:start;justify-items:center;padding:18px 12px;background:rgba(8,10,18,.72);backdrop-filter:blur(6px);overflow:auto}`;
 const fixedPanel=`.contractorPickerPanel{position:relative;z-index:2201;width:min(100%,720px);max-height:none;overflow:visible;padding:18px;border-radius:20px;background:#fffaf6!important;color:#514751!important;box-shadow:0 20px 60px rgba(0,0,0,.35);opacity:1!important;filter:none!important;transform:none!important}`;
 s=s.replace(backdrop,fixedBackdrop).replace(panel,fixedPanel);
 // Add a bright outline so the dialog is unmistakably visible across themes.
 s=s.replace(fixedPanel,fixedPanel+`.contractorPickerPanel{border:2px solid rgba(99,190,161,.72)}/* ${mark} */`);
 fs.writeFileSync(p,s,'utf8');
 console.log('業者選択画面を中央配置依存から上部固定表示へ変更しました。');
 childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 業者ピッカー表示修正V3を適用しました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
