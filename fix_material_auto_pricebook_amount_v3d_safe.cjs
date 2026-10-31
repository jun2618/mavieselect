const fs = require("fs");
const cp = require("child_process");

const file = "./src/App.jsx";
const backup = file + ".v3d-backup-" + Date.now();
const marker = "M-CROSS_MATERIAL_AUTO_PRICEBOOK_AMOUNT_V3D_SAFE";

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
  fail("V3-Dはすでに適用されています。");
}

let next = original;

/* 1. 発注先を選んだら単価表を自動表示 */

const selectOld = `setMaterialSupplierId(item.id)
                                        setShowMaterialSupplierPicker(false)
                                        setShowMaterialPriceBook(false)`;

const selectNew = `setMaterialSupplierId(item.id)
                                        setShowMaterialSupplierPicker(false)
                                        setShowMaterialPriceBook(true)`;

const selectCount = next.split(selectOld).length - 1;

if (selectCount !== 1) {
  fail(
    "材料発注先の選択処理を一意に特定できません。検出数: " +
    selectCount
  );
}

next = next.replace(selectOld, selectNew);

/* 2. 材料明細を5列へ変更 */

const gridOld =
  "gridTemplateColumns:'minmax(200px,2fr) minmax(100px,.75fr) minmax(80px,.6fr) minmax(110px,.8fr)'";

const gridNew =
  "gridTemplateColumns:'minmax(190px,2fr) minmax(90px,.7fr) minmax(70px,.55fr) minmax(100px,.75fr) minmax(115px,.85fr)'";

const gridCount = next.split(gridOld).length - 1;

if (gridCount !== 1) {
  fail(
    "材料明細の4列レイアウトを特定できません。検出数: " +
    gridCount
  );
}

next = next.replace(gridOld, gridNew);

/* 3. 単価入力欄の直後に金額表示を追加 */

const priceStart = next.indexOf(
  "value={item.unitPrice ?? ''}"
);

if (priceStart < 0) {
  fail("材料明細の単価入力欄が見つかりません。");
}

const priceLabelEnd = next.indexOf(
  "</label>",
  priceStart
);

if (priceLabelEnd < 0) {
  fail("単価入力欄の終了位置が見つかりません。");
}

const amountField = `</label>

                                {/* ${marker} */}
                                <div>
                                  <span style={{
                                    display:'block',
                                    marginBottom:'6px',
                                    fontSize:'13px',
                                    color:'#777'
                                  }}>
                                    金額
                                  </span>

                                  <strong style={{
                                    display:'block',
                                    padding:'11px 8px',
                                    whiteSpace:'nowrap'
                                  }}>
                                    {
                                      item.unitPrice === '' ||
                                      item.unitPrice == null
                                        ? '未設定'
                                        : formatYen(
                                            (Number(item.quantity) || 0) *
                                            (Number(item.unitPrice) || 0)
                                          )
                                    }
                                  </strong>
                                </div>`;

next =
  next.slice(0, priceLabelEnd) +
  amountField +
  next.slice(priceLabelEnd + "</label>".length);

/* 4. 安全確認 */

if (next === original) {
  fail("変更内容がありません。");
}

if (!next.includes(marker)) {
  fail("V3-Dマーカーを確認できません。");
}

/* 5. バックアップ後に書き込み */

fs.copyFileSync(file, backup);
fs.writeFileSync(file, next, "utf8");

/* 6. build */

try {
  cp.execSync("npm run build", {
    stdio: "inherit",
    shell: true
  });

  console.log("");
  console.log("OK: 材料発注 V3-D を適用しました。");
  console.log("・発注先選択後に単価表を自動表示");
  console.log("・単価の横に金額を追加");
  console.log("・金額は数量 x 単価で自動計算");
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