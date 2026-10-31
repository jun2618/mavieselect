const fs = require("fs");
const cp = require("child_process");

const file = "./src/App.jsx";
const backup = file + ".v3c-backup-" + Date.now();
const marker = "M-CROSS_MATERIAL_PRICEBOOK_V3C_SAFE";

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
  fail("V3-Cはすでに適用されています。");
}

let next = original;

/* --------------------------------
   1. 単価表編集用stateを追加
-------------------------------- */

const stateAnchor =
  "const [showMaterialPriceBook, setShowMaterialPriceBook] = useState(false)";

const stateCount = next.split(stateAnchor).length - 1;

if (stateCount !== 1) {
  fail(
    "showMaterialPriceBookの検出数が" +
    stateCount +
    "件です。"
  );
}

next = next.replace(
  stateAnchor,
  `${stateAnchor}
  /* ${marker} */
  const [materialPriceEditIndex, setMaterialPriceEditIndex] = useState(-1)
  const [materialPriceForm, setMaterialPriceForm] = useState({
    name:'',
    unit:'',
    price:'',
    note:''
  })`
);

/* --------------------------------
   2. V3-Bの単価表表示部分を特定
-------------------------------- */

const oldPriceBookView = `                                    {priceBook.length === 0 ? (
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
                                    )}`;

const viewCount = next.split(oldPriceBookView).length - 1;

if (viewCount !== 1) {
  fail(
    "V3-Bの単価表表示を一意に特定できません。検出数: " +
    viewCount
  );
}

/* --------------------------------
   3. 追加・編集・削除画面へ変更
-------------------------------- */

const newPriceBookView = `                                    {/* ${marker} */}
                                    <div style={{
                                      display:'grid',
                                      gridTemplateColumns:
                                        'minmax(170px,2fr) 80px 110px minmax(130px,1.2fr)',
                                      gap:'8px',
                                      marginBottom:'10px'
                                    }}>
                                      <label>
                                        <span>品番・商品名</span>
                                        <input
                                          value={materialPriceForm.name}
                                          onChange={event =>
                                            setMaterialPriceForm(previous => ({
                                              ...previous,
                                              name:event.target.value
                                            }))
                                          }
                                        />
                                      </label>

                                      <label>
                                        <span>単位</span>
                                        <input
                                          value={materialPriceForm.unit}
                                          onChange={event =>
                                            setMaterialPriceForm(previous => ({
                                              ...previous,
                                              unit:event.target.value
                                            }))
                                          }
                                        />
                                      </label>

                                      <label>
                                        <span>単価</span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={materialPriceForm.price}
                                          onChange={event =>
                                            setMaterialPriceForm(previous => ({
                                              ...previous,
                                              price:event.target.value
                                            }))
                                          }
                                        />
                                      </label>

                                      <label>
                                        <span>備考</span>
                                        <input
                                          value={materialPriceForm.note}
                                          onChange={event =>
                                            setMaterialPriceForm(previous => ({
                                              ...previous,
                                              note:event.target.value
                                            }))
                                          }
                                        />
                                      </label>
                                    </div>

                                    <div style={{
                                      display:'flex',
                                      gap:'8px',
                                      flexWrap:'wrap',
                                      marginBottom:'12px'
                                    }}>
                                      <button
                                        type="button"
                                        className="primary"
                                        onClick={() => {
                                          const name =
                                            String(
                                              materialPriceForm.name || ''
                                            ).trim()

                                          if (!name) {
                                            window.alert(
                                              '品番・商品名を入力してください。'
                                            )
                                            return
                                          }

                                          const price =
                                            materialPriceForm.price === ''
                                              ? ''
                                              : Math.max(
                                                  0,
                                                  Number(
                                                    materialPriceForm.price
                                                  ) || 0
                                                )

                                          const savedRow = {
                                            id:
                                              materialPriceEditIndex >= 0
                                                ? (
                                                    priceBook[
                                                      materialPriceEditIndex
                                                    ]?.id ||
                                                    'price-' + Date.now()
                                                  )
                                                : (
                                                    'price-' +
                                                    Date.now() +
                                                    '-' +
                                                    Math.random()
                                                      .toString(36)
                                                      .slice(2, 7)
                                                  ),
                                            name,
                                            unit:String(
                                              materialPriceForm.unit || ''
                                            ).trim(),
                                            priceType:'fixed',
                                            price,
                                            rate:'',
                                            note:String(
                                              materialPriceForm.note || ''
                                            ).trim()
                                          }

                                          const nextPriceBook =
                                            materialPriceEditIndex >= 0
                                              ? priceBook.map(
                                                  (current, index) =>
                                                    index ===
                                                    materialPriceEditIndex
                                                      ? savedRow
                                                      : current
                                                )
                                              : [
                                                  ...priceBook,
                                                  savedRow
                                                ]

                                          saveContractors(
                                            contractors.map(current =>
                                              current.id === supplier.id
                                                ? {
                                                    ...current,
                                                    priceBook:nextPriceBook,
                                                    updatedAt:
                                                      new Date()
                                                        .toISOString()
                                                  }
                                                : current
                                            )
                                          )

                                          setMaterialPriceEditIndex(-1)
                                          setMaterialPriceForm({
                                            name:'',
                                            unit:'',
                                            price:'',
                                            note:''
                                          })
                                        }}
                                      >
                                        {
                                          materialPriceEditIndex >= 0
                                            ? '変更を保存'
                                            : '＋ 単価を追加'
                                        }
                                      </button>

                                      {materialPriceEditIndex >= 0 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMaterialPriceEditIndex(-1)
                                            setMaterialPriceForm({
                                              name:'',
                                              unit:'',
                                              price:'',
                                              note:''
                                            })
                                          }}
                                        >
                                          編集を取り消す
                                        </button>
                                      )}
                                    </div>

                                    {priceBook.length === 0 ? (
                                      <p className="empty">
                                        単価表は未登録です。
                                      </p>
                                    ) : (
                                      <div style={{
                                        display:'grid',
                                        gap:'7px'
                                      }}>
                                        {priceBook.map((row, index) => (
                                          <div
                                            key={row.id || index}
                                            style={{
                                              display:'grid',
                                              gridTemplateColumns:
                                                'minmax(160px,2fr) 70px 110px minmax(100px,1fr) auto',
                                              alignItems:'center',
                                              gap:'8px',
                                              padding:'9px',
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
                                                      Number(row.price) || 0
                                                    )
                                              }
                                            </span>

                                            <small>
                                              {row.note || ''}
                                            </small>

                                            <div style={{
                                              display:'flex',
                                              gap:'5px'
                                            }}>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setMaterialPriceEditIndex(
                                                    index
                                                  )
                                                  setMaterialPriceForm({
                                                    name:row.name || '',
                                                    unit:row.unit || '',
                                                    price:
                                                      row.price === '' ||
                                                      row.price == null
                                                        ? ''
                                                        : row.price,
                                                    note:row.note || ''
                                                  })
                                                }}
                                              >
                                                編集
                                              </button>

                                              <button
                                                type="button"
                                                className="danger"
                                                onClick={() => {
                                                  if (
                                                    !window.confirm(
                                                      String(
                                                        row.name || ''
                                                      ) +
                                                      'を単価表から削除しますか？'
                                                    )
                                                  ) {
                                                    return
                                                  }

                                                  const nextPriceBook =
                                                    priceBook.filter(
                                                      (_, rowIndex) =>
                                                        rowIndex !== index
                                                    )

                                                  saveContractors(
                                                    contractors.map(current =>
                                                      current.id === supplier.id
                                                        ? {
                                                            ...current,
                                                            priceBook:
                                                              nextPriceBook,
                                                            updatedAt:
                                                              new Date()
                                                                .toISOString()
                                                          }
                                                        : current
                                                    )
                                                  )

                                                  if (
                                                    materialPriceEditIndex ===
                                                    index
                                                  ) {
                                                    setMaterialPriceEditIndex(
                                                      -1
                                                    )
                                                    setMaterialPriceForm({
                                                      name:'',
                                                      unit:'',
                                                      price:'',
                                                      note:''
                                                    })
                                                  }
                                                }}
                                              >
                                                削除
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}`;

next = next.replace(
  oldPriceBookView,
  newPriceBookView
);

/* --------------------------------
   4. 安全確認
-------------------------------- */

if (next === original) {
  fail("変更箇所がありません。");
}

if (!next.includes(marker)) {
  fail("V3-Cマーカーを確認できません。");
}

/* --------------------------------
   5. バックアップと書き込み
-------------------------------- */

fs.copyFileSync(file, backup);
fs.writeFileSync(file, next, "utf8");

/* --------------------------------
   6. build
-------------------------------- */

try {
  cp.execSync("npm run build", {
    stdio: "inherit",
    shell: true
  });

  console.log("");
  console.log("OK: 材料単価表 V3-C を適用しました。");
  console.log("・業者別単価の追加");
  console.log("・業者別単価の編集");
  console.log("・業者別単価の削除");
  console.log("・既存priceBookへ保存");
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