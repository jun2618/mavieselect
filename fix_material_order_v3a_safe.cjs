const fs = require("fs");
const cp = require("child_process");

const file = "./src/App.jsx";
const backup = file + ".v3a-backup-" + Date.now();
const marker = "M-CROSS_MATERIAL_V3A_SAFE";

function fail(message) {
  console.error("ERROR:", message);
  console.error("App.jsx は変更していません。");
  process.exit(1);
}

if (!fs.existsSync(file)) fail("src/App.jsx が見つかりません。");

const original = fs.readFileSync(file, "utf8");

if (original.includes(marker)) {
  fail("V3-Aはすでに適用されています。");
}

let next = original;

/* -----------------------------
   1. 二重適用防止マーカー
----------------------------- */

const stateAnchor =
  "const [materialOrderItems, setMaterialOrderItems] = useState([])";

if (!next.includes(stateAnchor)) {
  fail("materialOrderItems が見つかりません。");
}

next = next.replace(
  stateAnchor,
  stateAnchor + "\n  /* " + marker + " */"
);

/* -----------------------------
   2. 「例：LB-9882」を廃止
   CFだけ場所を薄く表示
----------------------------- */

const placeholderOld = 'placeholder="例：LB-9882"';

if (!next.includes(placeholderOld)) {
  fail("現在の品番placeholderが見つかりません。");
}

next = next.replace(
  placeholderOld,
  `placeholder={
                                      item.materialType === 'cf'
                                        ? String(item.description || '')
                                        : ''
                                    }`
);

/* -----------------------------
   3. レイアウトを4列へ
   品番 / 数量 / 単位 / 単価
----------------------------- */

const gridOld =
  "gridTemplateColumns:'minmax(220px,2fr) minmax(120px,.8fr) minmax(100px,.7fr)'";

const gridNew =
  "gridTemplateColumns:'minmax(200px,2fr) minmax(100px,.75fr) minmax(80px,.6fr) minmax(110px,.8fr)'";

if (!next.includes(gridOld)) {
  fail("材料明細の3列レイアウトが見つかりません。");
}

next = next.replace(gridOld, gridNew);

/* -----------------------------
   4. 単位入力欄の直後に単価追加
----------------------------- */

const unitAnchor = `                                    placeholder="m・枚・箱"
                                  />
                                </label>
                              </div>`;

if (!next.includes(unitAnchor)) {
  fail("材料明細の単位欄を特定できません。");
}

const unitWithPrice = `                                    placeholder="m・枚・箱"
                                  />
                                </label>

                                <label>
                                  <span>単価</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={item.unitPrice ?? ''}
                                    onChange={event => {
                                      const value = event.target.value
                                      setMaterialOrderItems(previous =>
                                        previous.map((current, index) =>
                                          index === itemIndex
                                            ? {
                                                ...current,
                                                unitPrice:
                                                  value === ''
                                                    ? ''
                                                    : Math.max(0, Number(value) || 0)
                                              }
                                            : current
                                        )
                                      )
                                    }}
                                  />
                                </label>
                              </div>`;

next = next.replace(unitAnchor, unitWithPrice);

/* -----------------------------
   5. 書き込み前確認
----------------------------- */

if (next === original) {
  fail("変更箇所がありません。");
}

fs.copyFileSync(file, backup);
fs.writeFileSync(file, next, "utf8");

/* -----------------------------
   6. build
----------------------------- */

try {
  cp.execSync("npm run build", {
    stdio: "inherit",
    shell: true
  });

  console.log("");
  console.log("OK: 材料発注 V3-A を適用しました。");
  console.log("・例：LB-9882 を削除");
  console.log("・CFだけ採寸場所を薄く表示");
  console.log("・単価入力欄を追加");
  console.log("・施工発注側は変更していません。");
  console.log("");
  console.log("BACKUP:", backup);

} catch (error) {
  fs.copyFileSync(backup, file);

  console.error("");
  console.error("ERROR: build失敗。App.jsxを自動復旧しました。");
  process.exit(1);
}