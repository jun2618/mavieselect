const fs = require("fs");
const cp = require("child_process");

const appFile = "./src/App.jsx";
const marker = "M-CROSS_MATERIAL_MOBILE_CYBER_CSS_V2_SAFE";
const stamp = Date.now();

function fail(message) {
  console.error("ERROR: " + message);
  process.exit(1);
}

if (!fs.existsSync(appFile)) fail("src/App.jsx が見つかりません。");
const originalApp = fs.readFileSync(appFile, "utf8");
if (originalApp.includes(marker)) fail("V2はすでに適用されています。");

// CSS entryを自動検出
const cssCandidates = ["./src/App.css", "./src/index.css", "./src/main.css"];
const cssFile = cssCandidates.find(p => fs.existsSync(p));
if (!cssFile) fail("src/App.css / src/index.css / src/main.css が見つかりません。");
const originalCss = fs.readFileSync(cssFile, "utf8");
if (originalCss.includes(marker)) fail("CSS側V2はすでに適用されています。");

let app = originalApp;

// 材料発注パネルに専用classを追加
const panelOld = '<section className="orderDraftPanel" aria-label="材料発注">';
const panelCount = app.split(panelOld).length - 1;
if (panelCount !== 1) fail("材料発注パネルの検出数が " + panelCount + " 件です。変更していません。");
app = app.replace(panelOld, '<section className="orderDraftPanel materialMobilePanel" aria-label="材料発注">');

// 数量input: 空欄を許可 + focus時全選択
const materialPos = app.indexOf('aria-label="材料発注"');
const quantityLabelPos = app.indexOf('<span>発注数量</span>', materialPos);
if (quantityLabelPos < 0) fail("材料発注の数量欄が見つかりません。変更していません。");
const quantityInputStart = app.indexOf('<input', quantityLabelPos);
const quantityInputEnd = app.indexOf('/>', quantityInputStart);
if (quantityInputStart < 0 || quantityInputEnd < 0) fail("数量inputを特定できません。変更していません。");
const oldQuantityInput = app.slice(quantityInputStart, quantityInputEnd + 2);
const newQuantityInput = `<input
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
app = app.slice(0, quantityInputStart) + newQuantityInput + app.slice(quantityInputEnd + 2);

// 単価input: focus時全選択（未導入なら）
const priceValuePos = app.indexOf("value={item.unitPrice ?? ''}", materialPos);
if (priceValuePos >= 0) {
  const priceInputStart = app.lastIndexOf('<input', priceValuePos);
  const segment = app.slice(priceInputStart, priceValuePos);
  if (priceInputStart >= 0 && !segment.includes('onFocus=')) {
    app = app.slice(0, priceValuePos) + 'onFocus={event => event.target.select()}\n                                    ' + app.slice(priceValuePos);
  }
}

// JSX側マーカーを安全なコメントで追加
const classNeedle = '<section className="orderDraftPanel materialMobilePanel" aria-label="材料発注">';
app = app.replace(classNeedle, classNeedle + '\n                      {/* ' + marker + ' */}');

const css = originalCss + `

/* ${marker} */
@media (max-width: 640px) {
  .materialMobilePanel {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }

  .materialMobilePanel,
  .materialMobilePanel * {
    box-sizing: border-box !important;
  }

  .materialMobilePanel > div,
  .materialMobilePanel section,
  .materialMobilePanel article {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }

  .materialMobilePanel article {
    display: block !important;
    margin: 0 0 10px !important;
    padding: 12px !important;
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
    font-size: 16px !important;
  }

  .materialMobilePanel button {
    max-width: 100% !important;
  }

  .materialMobilePanel [style*="display:'flex'"] {
    max-width: 100% !important;
    flex-wrap: wrap !important;
  }

  /* Cyber / dark theme readability */
  [data-theme="cyber"] .materialMobilePanel,
  .theme-cyber .materialMobilePanel,
  body.cyber .materialMobilePanel {
    background: #050b14 !important;
    color: #f4f8ff !important;
  }

  [data-theme="cyber"] .materialMobilePanel article,
  [data-theme="cyber"] .materialMobilePanel section,
  .theme-cyber .materialMobilePanel article,
  .theme-cyber .materialMobilePanel section,
  body.cyber .materialMobilePanel article,
  body.cyber .materialMobilePanel section {
    background-color: #101b27 !important;
    color: #f4f8ff !important;
    border-color: #26d9ff !important;
  }

  [data-theme="cyber"] .materialMobilePanel input,
  [data-theme="cyber"] .materialMobilePanel select,
  [data-theme="cyber"] .materialMobilePanel textarea,
  .theme-cyber .materialMobilePanel input,
  .theme-cyber .materialMobilePanel select,
  .theme-cyber .materialMobilePanel textarea,
  body.cyber .materialMobilePanel input,
  body.cyber .materialMobilePanel select,
  body.cyber .materialMobilePanel textarea {
    background: #071522 !important;
    color: #ffffff !important;
    -webkit-text-fill-color: #ffffff !important;
    border: 1px solid #26d9ff !important;
    border-radius: 10px !important;
    opacity: 1 !important;
  }

  [data-theme="cyber"] .materialMobilePanel input::placeholder,
  [data-theme="cyber"] .materialMobilePanel textarea::placeholder,
  .theme-cyber .materialMobilePanel input::placeholder,
  .theme-cyber .materialMobilePanel textarea::placeholder,
  body.cyber .materialMobilePanel input::placeholder,
  body.cyber .materialMobilePanel textarea::placeholder {
    color: #9edff2 !important;
    -webkit-text-fill-color: #9edff2 !important;
    opacity: .88 !important;
  }

  [data-theme="cyber"] .materialMobilePanel strong,
  [data-theme="cyber"] .materialMobilePanel h2,
  [data-theme="cyber"] .materialMobilePanel h3,
  [data-theme="cyber"] .materialMobilePanel b,
  .theme-cyber .materialMobilePanel strong,
  .theme-cyber .materialMobilePanel h2,
  .theme-cyber .materialMobilePanel h3,
  .theme-cyber .materialMobilePanel b,
  body.cyber .materialMobilePanel strong,
  body.cyber .materialMobilePanel h2,
  body.cyber .materialMobilePanel h3,
  body.cyber .materialMobilePanel b {
    color: #f4f8ff !important;
  }

  [data-theme="cyber"] .materialMobilePanel small,
  [data-theme="cyber"] .materialMobilePanel label > span,
  .theme-cyber .materialMobilePanel small,
  .theme-cyber .materialMobilePanel label > span,
  body.cyber .materialMobilePanel small,
  body.cyber .materialMobilePanel label > span {
    color: #9edff2 !important;
    opacity: 1 !important;
  }

  [data-theme="cyber"] .materialMobilePanel button,
  .theme-cyber .materialMobilePanel button,
  body.cyber .materialMobilePanel button {
    background: #12283a !important;
    color: #f4f8ff !important;
    border-color: #26d9ff !important;
  }
}
`;

const appBackup = appFile + ".mobile-css-v2-backup-" + stamp;
const cssBackup = cssFile + ".mobile-css-v2-backup-" + stamp;
fs.copyFileSync(appFile, appBackup);
fs.copyFileSync(cssFile, cssBackup);
fs.writeFileSync(appFile, app, "utf8");
fs.writeFileSync(cssFile, css, "utf8");

try {
  cp.execSync("npm run build", {stdio:"inherit", shell:true});
  console.log("");
  console.log("OK: スマホ材料発注・CSS修正版V2を適用しました。");
  console.log("CSS: " + cssFile);
  console.log("・スマホ材料明細を2列カード化（品番は全幅）");
  console.log("・横はみ出し抑制");
  console.log("・サイバー文字／入力欄のコントラスト改善");
  console.log("・数量は空欄を許可し、0を消して入力可能");
  console.log("・数量／単価はタップ時に全選択");
  console.log("・PC表示と施工発注は変更していません。");
  console.log("APP BACKUP: " + appBackup);
  console.log("CSS BACKUP: " + cssBackup);
} catch (error) {
  fs.copyFileSync(appBackup, appFile);
  fs.copyFileSync(cssBackup, cssFile);
  console.error("");
  console.error("ERROR: build失敗。App.jsxとCSSを自動復旧しました。");
  process.exit(1);
}
