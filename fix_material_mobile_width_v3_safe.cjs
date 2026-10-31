const fs=require("fs");
const cp=require("child_process");
const appFile="./src/App.jsx";
const marker="M-CROSS_MATERIAL_MOBILE_WIDTH_V3_SAFE";
const stamp=Date.now();
function fail(m){console.error("ERROR: "+m);process.exit(1)}
if(!fs.existsSync(appFile))fail("src/App.jsx が見つかりません。");
const cssCandidates=["./src/App.css","./src/index.css","./src/main.css"];
const cssFile=cssCandidates.find(p=>fs.existsSync(p));
if(!cssFile)fail("CSSファイルが見つかりません。");
const app=fs.readFileSync(appFile,"utf8");
const originalCss=fs.readFileSync(cssFile,"utf8");
if(originalCss.includes(marker))fail("V3はすでに適用されています。");
if(!app.includes('materialMobilePanel'))fail("materialMobilePanel が見つかりません。先にCSS版V2を適用してください。");

const css=originalCss+`\n\n/* ${marker} */
@media (max-width:640px){
  /* 材料発注パネルを親幅いっぱいに収める */
  .materialMobilePanel{
    position:relative !important;
    left:auto !important;
    right:auto !important;
    transform:none !important;
    width:calc(100% - 16px) !important;
    max-width:calc(100% - 16px) !important;
    min-width:0 !important;
    margin:8px !important;
    padding:10px !important;
    overflow-x:hidden !important;
  }
  .materialMobilePanel .orderDraftHeader{
    display:flex !important;
    align-items:flex-start !important;
    justify-content:space-between !important;
    gap:8px !important;
    width:100% !important;
  }
  .materialMobilePanel .orderDraftHeader>div{
    flex:1 1 auto !important;
    min-width:0 !important;
  }
  .materialMobilePanel .orderDraftHeader h3{
    font-size:18px !important;
    line-height:1.35 !important;
    white-space:normal !important;
    word-break:keep-all !important;
  }
  .materialMobilePanel .orderDraftHeader>button{
    flex:0 0 auto !important;
    max-width:118px !important;
    white-space:normal !important;
  }

  /* 発注先 / 単価表エリア */
  .materialMobilePanel [style*="grid-template-columns"]{
    max-width:100% !important;
    min-width:0 !important;
  }
  .materialMobilePanel [style*="grid-template-columns: 'minmax(160px,2fr) 70px 110px"] ,
  .materialMobilePanel [style*="grid-template-columns:'minmax(160px,2fr) 70px 110px"]{
    grid-template-columns:minmax(0,1fr) !important;
  }

  /* 単価表はスマホでは1項目1カード。品名が途中で切れない */
  .materialMobilePanel div[style*="border-radius:'8px'"][style*="grid-template-columns"]{
    display:grid !important;
    grid-template-columns:minmax(0,1fr) !important;
    gap:7px !important;
    width:100% !important;
    min-width:0 !important;
    min-height:0 !important;
    padding:10px !important;
  }
  .materialMobilePanel div[style*="border-radius:'8px'"][style*="grid-template-columns"] strong{
    width:100% !important;
    white-space:normal !important;
    overflow:visible !important;
    text-overflow:clip !important;
    word-break:break-word !important;
    line-height:1.45 !important;
  }

  /* 材料明細カード */
  .materialMobilePanel .orderDraftItems,
  .materialMobilePanel .orderExcelSheet,
  .materialMobilePanel .orderExcelWorkspace{
    width:100% !important;
    max-width:100% !important;
    min-width:0 !important;
    overflow:visible !important;
  }
  .materialMobilePanel .orderDraftItem{
    width:100% !important;
    max-width:100% !important;
    min-width:0 !important;
  }

  /* スマホで不要な最小幅を解除 */
  .materialMobilePanel input,
  .materialMobilePanel select,
  .materialMobilePanel button,
  .materialMobilePanel label,
  .materialMobilePanel span,
  .materialMobilePanel strong,
  .materialMobilePanel small{
    min-width:0 !important;
  }

  /* 確認単価表の操作ボタンは下へ折り返す */
  .materialMobilePanel button{
    white-space:normal !important;
  }
}
`;
const cssBackup=cssFile+".mobile-width-v3-backup-"+stamp;
fs.copyFileSync(cssFile,cssBackup);
fs.writeFileSync(cssFile,css,"utf8");
try{
 cp.execSync("npm run build",{stdio:"inherit",shell:true});
 console.log("");console.log("OK: スマホ材料発注 幅修正V3を適用しました。");
 console.log("・材料発注パネルを画面幅内に固定");
 console.log("・ヘッダー折返し改善");
 console.log("・単価表の品名を全表示");
 console.log("・スマホ単価表を1項目1カード化");
 console.log("・PC側は変更していません。");
 console.log("CSS BACKUP: "+cssBackup);
}catch(e){fs.copyFileSync(cssBackup,cssFile);console.error("ERROR: build失敗。CSSを自動復旧しました。");process.exit(1)}
