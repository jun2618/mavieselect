const fs = require("fs");
const cp = require("child_process");

const file = "./src/App.jsx";
const backup = file + ".cf-location-backup-" + Date.now();
const marker = "M-CROSS_CF_LOCATION_PLACEHOLDER_V1_SAFE";

if (!fs.existsSync(file)) {
  console.error("ERROR: src/App.jsx が見つかりません。");
  process.exit(1);
}

const original = fs.readFileSync(file, "utf8");

if (original.includes(marker)) {
  console.error("ERROR: すでに適用されています。");
  process.exit(1);
}

const oldText = `placeholder="例：LB-9882"`;

const count = original.split(oldText).length - 1;

if (count !== 1) {
  console.error(
    "ERROR: placeholder の検出数が " +
    count +
    " 件です。変更していません。"
  );
  process.exit(1);
}

const newText = `/* ${marker} */
                                    placeholder={
                                      item.materialType === 'cf'
                                        ? String(item.description || '')
                                        : ''
                                    }`;

const next = original.replace(oldText, newText);

fs.copyFileSync(file, backup);
fs.writeFileSync(file, next, "utf8");

try {
  cp.execSync("npm run build", {
    stdio: "inherit",
    shell: true
  });

  console.log("");
  console.log("OK: CFの品番欄を採寸箇所表示に変更しました。");
  console.log("クロスの品番未入力欄は空白になります。");
  console.log("施工発注・単価表は変更していません。");
  console.log("BACKUP:", backup);

} catch (error) {
  fs.copyFileSync(backup, file);

  console.error("");
  console.error("ERROR: build失敗。App.jsxを自動復旧しました。");
  process.exit(1);
}