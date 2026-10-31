const fs = require("fs");
const cp = require("child_process");

const file = "./src/App.jsx";
const marker = "M-CROSS_MATERIAL_MOBILE_CYBER_V1_SAFE";
const backup = file + ".mobile-cyber-v1-backup-" + Date.now();

function fail(message) {
  console.error("ERROR: " + message);
  console.error("App.jsx は変更していません。");
  process.exit(1);
}

if (!fs.existsSync(file)) fail("src/App.jsx が見つかりません。");
const original = fs.readFileSync(file, "utf8");
if (original.includes(marker)) fail("スマホ・サイバー修正V1はすでに適用されています。");

let next = original;

// 材料発注パネルだけに専用クラスを付与
const panelOld = '<section className="orderDraftPanel" aria-label="材料発注">';
const panelCount = next.split(panelOld).length - 1;
if (panelCount !== 1) fail("材料発注パネルの検出数が " + panelCount + " 件です。");

const mobileStyle = String.raw`<section className="orderDraftPanel materialMobilePanel" aria-label="材料発注">
                      {/* ${marker} */}
                      <style>{\`
                        @media (max-width: 640px) {
                          .materialMobilePanel {
                            width: 100% !important;
                            max-width: 100% !important;
                            min-width: 0 !important;
                            overflow-x: hidden !important;
                            box-sizing: border-box !important;
                            background: #050b14 !important;
                            color: #f4f8ff !important;
                          }
                          .materialMobilePanel * { box-sizing: border-box !important; }
                          .materialMobilePanel > div,
                          .materialMobilePanel section { max-width: 100% !important; min-width: 0 !important; }
                          .materialMobilePanel article {
                            display: block !important;
                            width: 100% !important;
                            min-width: 0 !important;
                            margin: 0 0 10px !important;
                            padding: 12px !important;
                            background: #101b27 !important;
                            border: 1px solid #26d9ff !important;
                            color: #f4f8ff !important;
                          }
                          .materialMobilePanel article > div[style*="grid-template-columns"] {
                            display: grid !important;
                            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
                            gap: 10px !important;
                            width: 100% !important;
                          }
                          .materialMobilePanel article > div[style*="grid-template-columns"] > label:first-child {
                            grid-column: 1 / -1 !important;
                          }
                          .materialMobilePanel input,
                          .materialMobilePanel select,
                          .materialMobilePanel textarea {
                            width: 100% !important;
                            min-width: 0 !important;
                            max-width: 100% !important;
                            min-height: 46px !important;
                            padding: 10px !important;
                            background: #071522 !important;
                            color: #ffffff !important;
                            border: 1px solid #26d9ff !important;
                            border-radius: 10px !important;
                            font-size: 16px !important;
                            -webkit-text-fill-color: #ffffff !important;
                            opacity: 1 !important;
                          }
                          .materialMobilePanel input::placeholder,
                          .materialMobilePanel textarea::placeholder {
                            color: #9edff2 !important;
                            -webkit-text-fill-color: #9edff2 !important;
                            opacity: .82 !important;
                          }
                          .materialMobilePanel label > span,
                          .materialMobilePanel small {
                            color: #9edff2 !important;
                            opacity: 1 !important;
                          }
                          .materialMobilePanel strong,
                          .materialMobilePanel h2,
                          .materialMobilePanel h3,
                          .materialMobilePanel b {
                            color: #f4f8ff !important;
                          }
                          .materialMobilePanel button {
                            max-width: 100% !important;
                            color: #f4f8ff !important;
                            background: #12283a !important;
                            border: 1px solid #26d9ff !important;
                          }
                          .materialMobilePanel button:disabled { opacity: .48 !important; }
                          .materialMobilePanel [style*="background:rgba(255,255,255"] {
                            background: #101b27 !important;
                          }
                          .materialMobilePanel [style*="display:'flex'"] {
                            max-width: 100% !important;
                            flex-wrap: wrap !important;
                          }
                        }
                      \`}</style>`;
next = next.replace(panelOld, mobileStyle);

// 発注数量は空欄を許可し、フォーカス時に全選択
const materialStart = next.indexOf(marker);
const quantityLabel = '<span>発注数量</span>';
const quantityPos = next.indexOf(quantityLabel, materialStart);
if (quantityPos < 0) fail("材料発注の数量欄が見つかりません。");
const inputPos = next.indexOf('<input', quantityPos);
const inputEnd = next.indexOf('/>', inputPos);
if (inputPos < 0 || inputEnd < 0) fail("材料発注の数量inputを特定できません。");
let quantityInput = next.slice(inputPos, inputEnd + 2);

const changeRegex = /onChange=\{event\s*=>\s*\{[\s\S]*?setMaterialOrderItems\([\s\S]*?\}\}\s*\/>/;
const inputRegion = next.slice(inputPos, Math.min(next.length, inputPos + 1800));
const match = inputRegion.match(changeRegex);
if (!match) fail("数量変更処理を安全に特定できません。");

const replacementInput = `<input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    inputMode="decimal"
                                    value={item.quantity ?? ''}
                                    onFocus={event => event.target.select()}
                                    onChange={event => {
                                      const raw = event.target.value
                                      setMaterialOrderItems(previous =>
                                        previous.map((current, index) =>
                                          index === itemIndex
                                            ? {...current, quantity: raw === '' ? '' : Math.max(0, Number(raw) || 0)}
                                            : current
                                        )
                                      )
                                    }}
                                  />`;
next = next.slice(0, inputPos) + inputRegion.replace(match[0], replacementInput) + next.slice(inputPos + inputRegion.length);

// 単価欄もフォーカス時全選択
const pricePos = next.indexOf("value={item.unitPrice ?? ''}", materialStart);
if (pricePos >= 0) {
  const priceInputStart = next.lastIndexOf('<input', pricePos);
  if (priceInputStart >= 0 && !next.slice(priceInputStart, pricePos).includes('onFocus=')) {
    next = next.slice(0, pricePos) + "onFocus={event => event.target.select()}\n                                    " + next.slice(pricePos);
  }
}

if (next === original || !next.includes(marker)) fail("変更に失敗しました。");
fs.copyFileSync(file, backup);
fs.writeFileSync(file, next, "utf8");

try {
  cp.execSync("npm run build", {stdio:"inherit", shell:true});
  console.log("");
  console.log("OK: スマホ材料発注・サイバーテーマ修正V1を適用しました。");
  console.log("・スマホは1カード2列、品番欄は全幅");
  console.log("・横はみ出しを抑制");
  console.log("・サイバー背景、文字、入力欄のコントラスト改善");
  console.log("・数量の空欄入力を許可");
  console.log("・数量と単価はタップ時に全選択");
  console.log("・PC表示と施工発注は変更していません。");
  console.log("BACKUP: " + backup);
} catch (error) {
  fs.copyFileSync(backup, file);
  console.error("ERROR: build失敗。App.jsxを自動復旧しました。");
  process.exit(1);
}
