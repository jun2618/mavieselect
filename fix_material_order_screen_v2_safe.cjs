const fs = require("fs");
const cp = require("child_process");

const file = "./src/App.jsx";
const backup = `./src/App.jsx.material-v2-backup-${Date.now()}`;
const marker = "M-CROSS_MATERIAL_ORDER_SCREEN_V2_SIMPLE_SAFE";

function fail(message) {
  console.error("ERROR: " + message);
  console.error("変更していません。");
  process.exit(1);
}

if (!fs.existsSync(file)) {
  fail("src/App.jsx が見つかりません。");
}

const original = fs.readFileSync(file, "utf8");

if (original.includes(marker)) {
  fail("V2はすでに適用されています。");
}

/*
 * V1で作った crossItems 部分だけ変更する。
 *
 * codeあり:
 * crossProductReferences側ですでに同一品番合算済み。
 *
 * codeなし:
 * crossProductReferencesでは部位別になっているため、
 * ここで全品番未入力クロスを1行へまとめる。
 */

const oldCrossBlock = `const crossItems = crossProductReferences.map((item, index) => ({
                              id: 'material-cross-' + now + '-' + index,
                              materialType: 'cross',
                              productCode: item.code || '',
                              description: item.label || 'クロス',
                              quantity: Number(item.quantity || 0),
                              unit: 'm'
                            }))`;

const newCrossBlock = `/* ${marker} */
                            const codedCrossItems = crossProductReferences
                              .filter(item => String(item.code || '').trim())
                              .map((item, index) => ({
                                id: 'material-cross-' + now + '-' + index,
                                materialType: 'cross',
                                productCode: String(item.code || '').trim(),
                                description: '',
                                quantity: Number(item.quantity || 0),
                                unit: 'm'
                              }))

                            const noCodeCrossQuantity = crossProductReferences
                              .filter(item => !String(item.code || '').trim())
                              .reduce(
                                (sum, item) => sum + Number(item.quantity || 0),
                                0
                              )

                            const crossItems = [
                              ...codedCrossItems,
                              ...(noCodeCrossQuantity > 0
                                ? [{
                                    id: 'material-cross-no-code-' + now,
                                    materialType: 'cross',
                                    productCode: '',
                                    description: '',
                                    quantity: noCodeCrossQuantity,
                                    unit: 'm'
                                  }]
                                : [])
                            ]`;

const count = original.split(oldCrossBlock).length - 1;

if (count !== 1) {
  fail(
    "V1のクロス材料作成処理を一意に特定できません。検出数: " +
    count
  );
}

let next = original.replace(oldCrossBlock, newCrossBlock);

/*
 * UIから「内容・使用場所」列を削除。
 */

const oldGrid = `gridTemplateColumns:'minmax(150px,1.3fr) minmax(180px,2fr) minmax(100px,.7fr) minmax(80px,.6fr)'`;

const newGrid = `gridTemplateColumns:'minmax(220px,2fr) minmax(120px,.8fr) minmax(100px,.7fr)'`;

if (!next.includes(oldGrid)) {
  fail("V1の材料明細レイアウトを検出できません。");
}

next = next.replace(oldGrid, newGrid);

const descriptionField = `                                <label>
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

`;

const descriptionCount =
  next.split(descriptionField).length - 1;

if (descriptionCount !== 1) {
  fail(
    "「内容・使用場所」入力欄を一意に特定できません。検出数: " +
    descriptionCount
  );
}

next = next.replace(descriptionField, "");

/*
 * 説明文も材料屋向けに変更。
 */

const oldHelp =
  "クロスは見積品番ごとに合算しています。CF・巾木・その他は品番を入力してください。";

const newHelp =
  "クロスは同じ品番を1行に合算します。品番未入力のクロスも数量を1行にまとめます。";

if (!next.includes(oldHelp)) {
  fail("材料発注の説明文を検出できません。");
}

next = next.replace(oldHelp, newHelp);

/*
 * productCode入力欄の見出しを、
 * 見本発注書に近い「商品名」に変更。
 */

const oldLabel = "<span>品番・商品名</span>";
const newLabel = "<span>商品名・品番</span>";

if (!next.includes(oldLabel)) {
  fail("品番欄の見出しを検出できません。");
}

next = next.replace(oldLabel, newLabel);

/*
 * 安全確認。
 */

if (!next.includes(marker)) {
  fail("V2マーカーを確認できません。");
}

if (next === original) {
  fail("変更内容がありません。");
}

/*
 * バックアップしてから書き込み。
 */

fs.copyFileSync(file, backup);
fs.writeFileSync(file, next, "utf8");

try {
  cp.execSync("npm run build", {
    stdio: "inherit",
    shell: true
  });

  console.log("");
  console.log("OK: 材料発注画面V2を適用しました。");
  console.log("");
  console.log("変更内容:");
  console.log("・同じクロス品番は1行に集約");
  console.log("・品番未入力クロスも数量を1行に合算");
  console.log("・内容・使用場所欄を削除");
  console.log("・商品名/品番、数量、単位のシンプル表示");
  console.log("");
  console.log("施工発注側は変更していません。");
  console.log("バックアップ: " + backup);

} catch (error) {

  fs.copyFileSync(backup, file);

  console.error("");
  console.error(
    "ERROR: ビルド失敗のためApp.jsxを元に戻しました。"
  );
  console.error("施工発注を含め変更前の状態へ復旧しています。");

  process.exit(1);
}