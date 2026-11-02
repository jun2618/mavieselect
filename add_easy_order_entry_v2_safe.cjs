const fs=require('fs');
const p='./src/App.jsx';
let s=fs.readFileSync(p,'utf8');
const marker='M-CROSS_EASY_ORDER_ENTRY_V2_SAFE';
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const replaces=[
 ['<section className="orderSelectionPanel" aria-label="発注項目の選択">','<section className="orderSelectionPanel easyOrderPanel" aria-label="かんたん発注">\n                    {/* '+marker+' */}'],
 ['<strong>📦 発注する項目を選択</strong>','<div className="easyOrderTitle"><small>SMART ORDER</small><strong>📦 かんたん発注</strong><span>内装工事はまとめて選択。必要な時だけ個別変更できます。</span></div>'],
 ['>クロス・CF・巾木を一括選択</button>','>① 内装工事をまとめる</button>'],
 ['>クリア</button>','>選択をクリア</button>'],
 ['>📦 選択した項目から発注書を作成</button>','>② 職人を選んで発注書を作る →</button>'],
 ['>＋ 空の発注書を作成</button>','>📦 材料発注を開く</button>']
];
for(const [a,b] of replaces){const n=s.split(a).length-1;if(n!==1){console.error('ERROR: '+a.slice(0,35)+' MATCH='+n+' 変更していません。');process.exit(1)}s=s.replace(a,b)}
const anchor='  .orderSelectionPanel{display:grid;gap:12px;margin:14px 0 20px;padding:14px;border:1px solid rgba(110,145,232,.42);border-radius:16px;background:rgba(110,145,232,.08)}';
if(!s.includes(anchor)){console.error('ERROR: CSS位置なし。変更していません。');process.exit(1)}
const css=`  /* ${marker} */\n  .easyOrderTitle{display:grid;gap:3px}.easyOrderTitle small{font-size:10px;font-weight:900;letter-spacing:.15em;opacity:.65}.easyOrderTitle strong{font-size:20px}.easyOrderTitle span{font-size:12px;opacity:.75}.easyOrderPanel .orderSelectionQuickButtons{grid-template-columns:minmax(0,1fr) auto}.easyOrderPanel>.primary{min-height:54px;font-size:16px;font-weight:900}.easyOrderPanel .materialBlankOrderPrimary{min-height:46px}.easyOrderPanel .purchaseOrderExplorerOpen{order:8}.easyOrderPanel .orderSelectionIndividualNote{order:5}.easyOrderPanel .orderSelectionSummary{order:6}.easyOrderPanel>.primary{order:7}.easyOrderPanel .materialBlankOrderPrimary{order:9}@media(max-width:620px){.easyOrderPanel{padding:10px!important;margin:8px 0 12px!important;gap:9px!important}.easyOrderTitle span{display:none}.easyOrderPanel .orderSelectionQuickButtons{grid-template-columns:1fr}.easyOrderPanel .orderSelectionQuickButtons button{min-height:50px}.easyOrderPanel>.primary{width:100%}.easyOrderPanel .purchaseOrderExplorerOpen,.easyOrderPanel .materialBlankOrderPrimary{width:100%}}\n`;
s=s.replace(anchor,css+anchor);
fs.copyFileSync(p,'./src/App.before_easy_order_entry_v2.jsx');
fs.writeFileSync(p,s,'utf8');
console.log('OK: かんたん発注V2を追加しました。');
