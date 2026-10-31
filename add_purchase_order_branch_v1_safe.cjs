const fs = require("fs");
const cp = require("child_process");

const file = "./src/App.jsx";
const backup = `./src/App.jsx.branch-backup-${Date.now()}`;

if (!fs.existsSync(file)) {
  console.error("ERROR: src/App.jsx が見つかりません。");
  process.exit(1);
}

const original = fs.readFileSync(file, "utf8");
const marker = "M-CROSS_PURCHASE_ORDER_BRANCH_V1_SAFE";

if (original.includes(marker)) {
  console.error("ERROR: この分岐はすでに適用されています。");
  process.exit(1);
}

const stateAnchor =
  "const [orderDraft, setOrderDraft] = useState(null)";

const oldStart =
  "setOrderDraft({ contractor:'', items })";

const renderAnchor =
  "{orderDraft && (";

for (const [name, text] of [
  ["orderDraft state", stateAnchor],
  ["発注開始処理", oldStart],
  ["orderDraft画面", renderAnchor],
]) {
  const count = original.split(text).length - 1;

  if (count !== 1) {
    console.error(`ERROR: ${name} の検出数が ${count} 件です。変更していません。`);
    process.exit(1);
  }
}

let next = original.replace(
  stateAnchor,
  `${stateAnchor}
  /* ${marker} */
  const [purchaseOrderBranch, setPurchaseOrderBranch] = useState(null)
  const [pendingPurchaseOrderItems, setPendingPurchaseOrderItems] = useState([])`
);

next = next.replace(
  oldStart,
  `setPendingPurchaseOrderItems(items)
                      setPurchaseOrderBranch('select')`
);

const branchUi = `
                  {/* ${marker} */}
                  {purchaseOrderBranch === 'select' && (
                    <section className="orderDraftPanel" aria-label="発注種類選択">
                      <div className="orderDraftHeader">
                        <div>
                          <small>ORDER TYPE</small>
                          <h3>発注書の種類を選択</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPurchaseOrderBranch(null)
                            setPendingPurchaseOrderItems([])
                          }}
                        >
                          × 閉じる
                        </button>
                      </div>

                      <div style={{
                        display:'grid',
                        gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',
                        gap:'14px',
                        padding:'18px'
                      }}>
                        <button
                          type="button"
                          style={{
                            minHeight:'110px',
                            fontSize:'20px',
                            fontWeight:800
                          }}
                          onClick={() => {
                            setOrderDraft({
                              contractor:'',
                              contractorId:'',
                              orderMode:'service',
                              items:pendingPurchaseOrderItems
                            })
                            setPurchaseOrderBranch(null)
                            setPendingPurchaseOrderItems([])
                          }}
                        >
                          🔨 施工発注
                        </button>

                        <button
                          type="button"
                          style={{
                            minHeight:'110px',
                            fontSize:'20px',
                            fontWeight:800
                          }}
                          onClick={() => setPurchaseOrderBranch('material')}
                        >
                          📦 材料発注
                        </button>
                      </div>
                    </section>
                  )}

                  {purchaseOrderBranch === 'material' && (
                    <section className="orderDraftPanel" aria-label="材料発注">
                      <div className="orderDraftHeader">
                        <div>
                          <small>MATERIAL ORDER</small>
                          <h3>材料発注書作成</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPurchaseOrderBranch('select')}
                        >
                          ← 種類選択へ戻る
                        </button>
                      </div>

                      <div style={{padding:'20px'}}>
                        <p style={{fontWeight:700,margin:0}}>
                          材料発注専用画面
                        </p>
                        <p style={{marginTop:'8px',color:'#666'}}>
                          次のSTEPで、クロス品番の合算と自由入力欄を追加します。
                        </p>
                      </div>
                    </section>
                  )}

                  `;

next = next.replace(renderAnchor, branchUi + renderAnchor);

fs.copyFileSync(file, backup);
fs.writeFileSync(file, next, "utf8");

try {
  cp.execSync("npm run build", {
    stdio: "inherit",
    shell: true,
  });

  console.log("");
  console.log("OK: 発注種類の分岐を追加しました。");
  console.log("施工発注は既存処理をそのまま使用します。");
  console.log("材料発注は現在、専用の仮画面です。");
  console.log("バックアップ: " + backup);
} catch (error) {
  fs.copyFileSync(backup, file);

  console.error("");
  console.error("ERROR: ビルド失敗のため App.jsx を自動復旧しました。");
  process.exit(1);
}