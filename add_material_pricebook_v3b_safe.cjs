const fs = require("fs");
const cp = require("child_process");

const file = "./src/App.jsx";
const backup = file + ".v3b-backup-" + Date.now();
const marker = "M-CROSS_MATERIAL_PRICEBOOK_V3B_SAFE";

function fail(message) {
  console.error("ERROR:", message);
  console.error("App.jsx は変更していません。");
  process.exit(1);
}

if (!fs.existsSync(file)) {
  fail("src/App.jsx が見つかりません。");
}

const original = fs.readFileSync(file, "utf8");

if (original.includes(marker)) {
  fail("V3-Bはすでに適用されています。");
}

let next = original;

/* state追加 */

const stateAnchor =
  "/* M-CROSS_MATERIAL_V3A_SAFE */";

if (!next.includes(stateAnchor)) {
  fail("V3-Aの適用位置が見つかりません。");
}

next = next.replace(
  stateAnchor,
  `${stateAnchor}
  /* ${marker} */
  const [materialSupplierId, setMaterialSupplierId] = useState('')
  const [showMaterialSupplierPicker, setShowMaterialSupplierPicker] = useState(false)
  const [showMaterialPriceBook, setShowMaterialPriceBook] = useState(false)`
);

/* 材料明細の直前に発注先UIを追加 */

const uiAnchor = `<strong style={{fontSize:'18px'}}>
                              材料明細
                            </strong>`;

if (!next.includes(uiAnchor)) {
  fail("材料明細ヘッダーが見つかりません。");
}

const supplierUi = `
                          {/* ${marker} */}
                          <div style={{
                            marginBottom:'14px',
                            padding:'12px',
                            border:'1px solid rgba(120,120,120,.25)',
                            borderRadius:'10px'
                          }}>
                            <div style={{
                              display:'flex',
                              justifyContent:'space-between',
                              alignItems:'center',
                              gap:'10px',
                              flexWrap:'wrap'
                            }}>
                              <div>
                                <small>材料発注先</small>
                                <div style={{
                                  fontWeight:700,
                                  marginTop:'3px'
                                }}>
                                  {
                                    contractors.find(
                                      item =>
                                        item.id === materialSupplierId
                                    )?.name || '未選択'
                                  }
                                </div>
                              </div>

                              <div style={{
                                display:'flex',
                                gap:'8px',
                                flexWrap:'wrap'
                              }}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowMaterialSupplierPicker(true)
                                  }
                                >
                                  発注先を選択
                                </button>

                                <button
                                  type="button"
                                  disabled={!materialSupplierId}
                                  onClick={() =>
                                    setShowMaterialPriceBook(
                                      previous => !previous
                                    )
                                  }
                                >
                                  単価表
                                </button>
                              </div>
                            </div>

                            {showMaterialSupplierPicker && (
                              <div style={{
                                marginTop:'12px',
                                display:'grid',
                                gap:'6px'
                              }}>
                                {contractors
                                  .filter(item => !item.hidden)
                                  .map(item => (
                                    <button
                                      type="button"
                                      key={item.id}
                                      style={{
                                        textAlign:'left',
                                        padding:'10px'
                                      }}
                                      onClick={() => {
                                        setMaterialSupplierId(item.id)
                                        setShowMaterialSupplierPicker(false)
                                        setShowMaterialPriceBook(false)
                                      }}
                                    >
                                      <strong>{item.name}</strong>
                                      <small style={{
                                        display:'block',
                                        marginTop:'2px'
                                      }}>
                                        {item.trade || ''}
                                      </small>
                                    </button>
                                  ))}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowMaterialSupplierPicker(false)
                                  }
                                >
                                  閉じる
                                </button>
                              </div>
                            )}

                            {showMaterialPriceBook &&
                              materialSupplierId && (() => {

                                const supplier =
                                  contractors.find(
                                    item =>
                                      item.id === materialSupplierId
                                  );

                                if (!supplier) return null;

                                const priceBook =
                                  Array.isArray(supplier.priceBook)
                                    ? supplier.priceBook
                                    : [];

                                return (
                                  <div style={{
                                    marginTop:'12px',
                                    paddingTop:'12px',
                                    borderTop:
                                      '1px solid rgba(120,120,120,.25)'
                                  }}>
                                    <div style={{
                                      display:'flex',
                                      justifyContent:'space-between',
                                      alignItems:'center',
                                      marginBottom:'8px'
                                    }}>
                                      <strong>
                                        {supplier.name} 単価表
                                      </strong>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setShowMaterialPriceBook(false)
                                        }
                                      >
                                        閉じる
                                      </button>
                                    </div>

                                    {priceBook.length === 0 ? (
                                      <p className="empty">
                                        単価表は未登録です。
                                      </p>
                                    ) : (
                                      <div style={{
                                        display:'grid',
                                        gap:'6px'
                                      }}>
                                        {priceBook.map((row, index) => (
                                          <div
                                            key={row.id || index}
                                            style={{
                                              display:'grid',
                                              gridTemplateColumns:
                                                'minmax(160px,2fr) 70px 110px minmax(100px,1fr)',
                                              gap:'8px',
                                              padding:'8px',
                                              border:
                                                '1px solid rgba(120,120,120,.2)',
                                              borderRadius:'8px'
                                            }}
                                          >
                                            <strong>
                                              {row.name || ''}
                                            </strong>

                                            <span>
                                              {row.unit || ''}
                                            </span>

                                            <span>
                                              {
                                                row.price === '' ||
                                                row.price == null
                                                  ? '未設定'
                                                  : formatYen(
                                                      Number(
                                                        row.price
                                                      ) || 0
                                                    )
                                              }
                                            </span>

                                            <small>
                                              {row.note || ''}
                                            </small>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                          </div>

`;

next = next.replace(
  uiAnchor,
  supplierUi + uiAnchor
);

/* 安全確認 */

if (next === original) {
  fail("変更箇所がありません。");
}

if (!next.includes(marker)) {
  fail("V3-Bマーカーを確認できません。");
}

/* バックアップ */

fs.copyFileSync(file, backup);
fs.writeFileSync(file, next, "utf8");

/* build */

try {
  cp.execSync("npm run build", {
    stdio: "inherit",
    shell: true
  });

  console.log("");
  console.log("OK: 材料発注 V3-B を適用しました。");
  console.log("・材料発注先の選択を追加");
  console.log("・選択業者の単価表ボタンを追加");
  console.log("・既存priceBookを表示");
  console.log("・施工発注側は変更していません。");
  console.log("");
  console.log("BACKUP:", backup);

} catch (error) {
  fs.copyFileSync(backup, file);

  console.error("");
  console.error(
    "ERROR: build失敗。App.jsxを自動復旧しました。"
  );

  process.exit(1);
}