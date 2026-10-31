const fs = require("fs");
const cp = require("child_process");

const file = "./src/App.jsx";
const marker = "M-CROSS_MATERIAL_ORDER_SCREEN_V1_SAFE";
const backup = `./src/App.jsx.material-order-backup-${Date.now()}`;

function fail(message) {
  console.error("ERROR: " + message);
  console.error("App.jsx は変更していません。");
  process.exit(1);
}

if (!fs.existsSync(file)) {
  fail("src/App.jsx が見つかりません。crossmeasureフォルダで実行してください。");
}

const original = fs.readFileSync(file, "utf8");

if (original.includes(marker)) {
  fail("材料発注専用画面V1はすでに適用されています。");
}

const stateAnchor =
  "const [pendingPurchaseOrderItems, setPendingPurchaseOrderItems] = useState([])";

const oldMaterialButton =
  "onClick={() => setPurchaseOrderBranch('material')}";

const oldMaterialScreen = `                  {purchaseOrderBranch === 'material' && (
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
                  )}`;

const checks = [
  ["材料発注用state追加位置", stateAnchor],
  ["材料発注ボタン", oldMaterialButton],
  ["材料発注仮画面", oldMaterialScreen],
  ["クロス品番集計", "const crossProductReferences=(()=>{"],
  ["CF裁断集計", "const cfCutReferences=(cfRecords||[]).flatMap(record=>{"],
  ["巾木数量集計", "const softReferenceQuantity=(softRecords||[]).reduce("],
];

for (const [name, text] of checks) {
  const count = original.split(text).length - 1;

  if (count !== 1) {
    fail(`${name}の検出数が${count}件です。安全のため処理を中止しました。`);
  }
}

let next = original.replace(
  stateAnchor,
  `${stateAnchor}
  /* ${marker} */
  const [materialOrderItems, setMaterialOrderItems] = useState([])`
);

const newMaterialButton = `onClick={() => {
                            const now = Date.now()

                            const crossItems = crossProductReferences.map((item, index) => ({
                              id: 'material-cross-' + now + '-' + index,
                              materialType: 'cross',
                              productCode: item.code || '',
                              description: item.label || 'クロス',
                              quantity: Number(item.quantity || 0),
                              unit: 'm'
                            }))

                            const cfItems = cfCutReferences.map((item, index) => ({
                              id: 'material-cf-' + now + '-' + index,
                              materialType: 'cf',
                              productCode: '',
                              description: [
                                item.room || 'CF',
                                item.memo || ''
                              ].filter(Boolean).join(' '),
                              quantity: Number(item.length || 0),
                              unit: 'm'
                            }))

                            const softItems = Number(softReferenceQuantity || 0) > 0
                              ? [{
                                  id: 'material-soft-' + now,
                                  materialType: 'soft',
                                  productCode: '',
                                  description: 'ソフト巾木',
                                  quantity: Number(softReferenceQuantity || 0),
                                  unit: '枚'
                                }]
                              : []

                            const initialItems = [
                              ...crossItems,
                              ...cfItems,
                              ...softItems
                            ]

                            setMaterialOrderItems(
                              initialItems.length
                                ? initialItems
                                : [{
                                    id: 'material-free-' + now,
                                    materialType: 'other',
                                    productCode: '',
                                    description: '',
                                    quantity: 1,
                                    unit: ''
                                  }]
                            )

                            setPurchaseOrderBranch('material')
                          }}`;

next = next.replace(oldMaterialButton, newMaterialButton);

const newMaterialScreen = `                  {/* ${marker} */}
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

                      <div style={{padding:'18px'}}>
                        <div style={{
                          display:'flex',
                          justifyContent:'space-between',
                          alignItems:'center',
                          gap:'12px',
                          flexWrap:'wrap',
                          marginBottom:'14px'
                        }}>
                          <div>
                            <strong style={{fontSize:'18px'}}>
                              材料明細
                            </strong>

                            <div style={{
                              marginTop:'4px',
                              color:'#666',
                              fontSize:'13px'
                            }}>
                              クロスは見積品番ごとに合算しています。CF・巾木・その他は品番を入力してください。
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const id =
                                'material-free-' +
                                Date.now() +
                                '-' +
                                Math.random().toString(36).slice(2, 7)

                              setMaterialOrderItems(previous => [
                                ...previous,
                                {
                                  id,
                                  materialType:'other',
                                  productCode:'',
                                  description:'',
                                  quantity:1,
                                  unit:''
                                }
                              ])
                            }}
                          >
                            ＋ 材料行を追加
                          </button>
                        </div>

                        <div style={{
                          display:'grid',
                          gap:'10px'
                        }}>
                          {materialOrderItems.map((item, itemIndex) => (
                            <article
                              key={item.id}
                              style={{
                                border:'1px solid rgba(120,120,120,.28)',
                                borderRadius:'12px',
                                padding:'14px',
                                background:'rgba(255,255,255,.56)'
                              }}
                            >
                              <div style={{
                                display:'flex',
                                justifyContent:'space-between',
                                alignItems:'center',
                                gap:'10px',
                                marginBottom:'10px'
                              }}>
                                <strong>
                                  {item.materialType === 'cross'
                                    ? 'クロス'
                                    : item.materialType === 'cf'
                                      ? 'CF'
                                      : item.materialType === 'soft'
                                        ? '巾木'
                                        : 'その他材料'}
                                </strong>

                                <button
                                  type="button"
                                  className="danger"
                                  onClick={() => {
                                    setMaterialOrderItems(previous =>
                                      previous.filter((_, index) =>
                                        index !== itemIndex
                                      )
                                    )
                                  }}
                                >
                                  削除
                                </button>
                              </div>

                              <div style={{
                                display:'grid',
                                gridTemplateColumns:'minmax(150px,1.3fr) minmax(180px,2fr) minmax(100px,.7fr) minmax(80px,.6fr)',
                                gap:'10px',
                                alignItems:'end'
                              }}>
                                <label>
                                  <span>品番・商品名</span>
                                  <input
                                    value={item.productCode}
                                    onChange={event => {
                                      const value = event.target.value

                                      setMaterialOrderItems(previous =>
                                        previous.map((current, index) =>
                                          index === itemIndex
                                            ? {
                                                ...current,
                                                productCode:value
                                              }
                                            : current
                                        )
                                      )
                                    }}
                                    placeholder="例：LB-9882"
                                  />
                                </label>

                                <label>
                                  <span>内容・使用場所</span>
                                  <input
                                    value={item.description}
                                    onChange={event => {
                                      const value = event.target.value

                                      setMaterialOrderItems(previous =>
                                        previous.map((current, index) =>
                                          index === itemIndex
                                            ? {
                                                ...current,
                                                description:value
                                              }
                                            : current
                                        )
                                      )
                                    }}
                                    placeholder="例：居間・洋間 壁"
                                  />
                                </label>

                                <label>
                                  <span>発注数量</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={item.quantity}
                                    onChange={event => {
                                      const value = Math.max(
                                        0,
                                        Number(event.target.value) || 0
                                      )

                                      setMaterialOrderItems(previous =>
                                        previous.map((current, index) =>
                                          index === itemIndex
                                            ? {
                                                ...current,
                                                quantity:value
                                              }
                                            : current
                                        )
                                      )
                                    }}
                                  />
                                </label>

                                <label>
                                  <span>単位</span>
                                  <input
                                    value={item.unit}
                                    onChange={event => {
                                      const value = event.target.value

                                      setMaterialOrderItems(previous =>
                                        previous.map((current, index) =>
                                          index === itemIndex
                                            ? {
                                                ...current,
                                                unit:value
                                              }
                                            : current
                                        )
                                      )
                                    }}
                                    placeholder="m・枚・箱"
                                  />
                                </label>
                              </div>

                              {item.materialType === 'cross' &&
                                !String(item.productCode || '').trim() && (
                                  <small style={{
                                    display:'block',
                                    marginTop:'8px',
                                    color:'#c25400',
                                    fontWeight:700
                                  }}>
                                    品番未入力です。発注前に品番を入力してください。
                                  </small>
                                )}
                            </article>
                          ))}
                        </div>

                        {materialOrderItems.length === 0 && (
                          <p
                            className="empty"
                            style={{marginTop:'14px'}}
                          >
                            材料明細がありません。「材料行を追加」から追加してください。
                          </p>
                        )}

                        <div style={{
                          marginTop:'16px',
                          padding:'12px',
                          borderRadius:'10px',
                          background:'rgba(100,100,100,.08)',
                          color:'#666',
                          fontSize:'13px'
                        }}>
                          現在は材料明細の作成・編集確認段階です。発注先選択と材料発注書の保存は次のSTEPで追加します。
                        </div>
                      </div>
                    </section>
                  )}`;

next = next.replace(oldMaterialScreen, newMaterialScreen);

if (next === original) {
  fail("置換後の内容が変化していません。");
}

if (!next.includes(marker)) {
  fail("適用マーカーを確認できません。");
}

fs.copyFileSync(file, backup);
fs.writeFileSync(file, next, "utf8");

try {
  cp.execSync("npm run build", {
    stdio: "inherit",
    shell: true
  });

  console.log("");
  console.log("OK: 材料発注専用画面V1を追加しました。");
  console.log("・クロス品番別合算");
  console.log("・CF裁断別の材料行");
  console.log("・巾木の必要枚数");
  console.log("・品番、数量、単位の編集");
  console.log("・材料行の追加、削除");
  console.log("");
  console.log("施工発注画面と既存保存処理は変更していません。");
  console.log("バックアップ: " + backup);
} catch (error) {
  fs.copyFileSync(backup, file);

  console.error("");
  console.error("ERROR: ビルド失敗のためApp.jsxを自動復旧しました。");
  console.error("バックアップから元の状態へ戻しています。");
  process.exit(1);
}