const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-request-content-overlay-v1';
const marker='M-CROSS_REQUEST_CONTENT_OVERLAY_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: 依頼内容オーバーレイV1は適用済みです。');process.exit(0)}

const anchors={
 state:"  const [siteMemo, setSiteMemo] = useState('')",
 normalize:"    siteMemo: typeof value.siteMemo === 'string' ? value.siteMemo : '',",
 draft:"      siteMemo: siteMemo.trim(),",
 load:"    setSiteMemo(entry.siteMemo || '')",
 reset:"    setSiteMemo('')",
 save:"      siteMemo: siteMemo.trim(),",
 property:"            <p className=\"propertyLine\">{selectedProperty?.name}　{unit}号室　{workName}</p>",
 actions:'            <div className="measurementActions">',
 rootEnd:'      </main>\n'
};
for(const [k,v] of Object.entries(anchors)) if(!s.includes(v)) fail(k+' の対象コードが見つかりません。変更していません。');
if((s.split(anchors.draft).length-1)<2) fail('draft/save の siteMemo 保存位置が不足しています。');
fs.copyFileSync(p,b);
try{
  s=s.replace(anchors.state,`${anchors.state}\n  /* ${marker} */\n  const [requestContent, setRequestContent] = useState('')\n  const [showRequestContent, setShowRequestContent] = useState(false)`);
  s=s.replace(anchors.normalize,`${anchors.normalize}\n    requestContent: typeof value.requestContent === 'string' ? value.requestContent : '',`);
  // draft and saveData both already contain the same siteMemo line. Add requestContent after all exact matches.
  s=s.replaceAll(anchors.draft,`${anchors.draft}\n      requestContent: requestContent.trim(),`);
  s=s.replace(anchors.load,`${anchors.load}\n    setRequestContent(entry.requestContent || '')`);
  // resetForNewRegistration and showNewPropertyScreen both reset siteMemo. Reset request text with both.
  s=s.replaceAll(anchors.reset,`${anchors.reset}\n    setRequestContent('')`);
  // draft recovery has its own setSiteMemo line.
  s=s.replace("    setSiteMemo(draft.siteMemo || '')","    setSiteMemo(draft.siteMemo || '')\n    setRequestContent(draft.requestContent || '')");
  // startMeasurement load savedData.
  s=s.replace("      setSiteMemo(savedData?.siteMemo || '')","      setSiteMemo(savedData?.siteMemo || '')\n      setRequestContent(savedData?.requestContent || '')");
  // overwrite saved entry preserves request content.
  s=s.replace("        siteMemo: entry.siteMemo || '',","        siteMemo: entry.siteMemo || '',\n        requestContent: entry.requestContent || '',");
  // Add button at top of actions.
  s=s.replace(anchors.actions,`${anchors.actions}\n              <button className=\"secondaryButton requestContentButton\" type=\"button\" onClick={() => setShowRequestContent(true)}>📋 依頼内容</button>`);
  // Overlay immediately after property line.
  s=s.replace(anchors.property,`${anchors.property}\n            {showRequestContent && (\n              <div className=\"requestContentBackdrop\" role=\"dialog\" aria-modal=\"true\" aria-label=\"依頼内容\">\n                <section className=\"requestContentPanel\">\n                  <div className=\"requestContentHeader\"><h2>📋 依頼内容</h2><button type=\"button\" onClick={() => setShowRequestContent(false)}>× 閉じる</button></div>\n                  <p className=\"requestContentProperty\">{selectedProperty?.name} {unit}号室</p>\n                  <textarea value={requestContent} onChange={event => { setRequestContent(event.target.value); markUnsaved() }} placeholder=\"TimeTreeの依頼内容をここへ貼り付け\" rows={14} />\n                  <button className=\"primary\" type=\"button\" onClick={() => setShowRequestContent(false)}>入力画面へ戻る</button>\n                </section>\n              </div>\n            )}`);
  // CSS before end of main template string.
  const cssAnchor='  .measurementActions { display:grid; grid-template-columns:minmax(0,1fr); gap:14px; margin:16px 0 20px; }';
  if(!s.includes(cssAnchor)) throw new Error('CSS挿入位置が見つかりません。');
  const css=`\n  .requestContentButton { background:linear-gradient(180deg,#ffbf66,#ee9638); box-shadow:0 5px 0 #bd6d25; }\n  .requestContentBackdrop { position:fixed; z-index:1900; inset:0; display:grid; place-items:center; padding:14px; background:rgba(15,12,20,.72); backdrop-filter:blur(7px); }\n  .requestContentPanel { width:min(100%,620px); max-height:92vh; overflow:auto; padding:20px; border-radius:22px; background:#fffaf5; box-shadow:0 20px 60px rgba(0,0,0,.35); }\n  .requestContentHeader { display:flex; align-items:center; justify-content:space-between; gap:12px; }\n  .requestContentHeader h2 { margin:0; }\n  .requestContentHeader button { min-height:42px; padding:8px 12px; border:0; border-radius:11px; color:#fff; background:#8a7584; font:inherit; font-weight:800; }\n  .requestContentProperty { margin:10px 0; color:#d27f6d; font-weight:800; }\n  .requestContentPanel textarea { width:100%; min-height:48vh; padding:14px; border:2px solid #ead8cb; border-radius:14px; box-sizing:border-box; font:inherit; font-size:16px; line-height:1.65; resize:vertical; background:#fff; }\n  .requestContentPanel .primary { margin-top:14px; }`;
  s=s.replace(cssAnchor,cssAnchor+css);
  fs.writeFileSync(p,s,'utf8');
  console.log('依頼内容の保存・表示・復帰機能を追加しました。自動ビルド確認を行います。');
  cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 依頼内容オーバーレイV1を適用しました。');
  console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
