const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");
const outputPath = path.join(process.cwd(), "purchase_order_structure.txt");

function fail(message) {
  console.error("ERROR: " + message);
  process.exit(1);
}

if (!fs.existsSync(appPath)) {
  fail("src/App.jsx が見つかりません。crossmeasure フォルダで実行してください。");
}

const source = fs.readFileSync(appPath, "utf8");
const lines = source.split(/\r?\n/);

const patterns = [
  "発注書作成",
  "発注書を作成",
  "施工発注",
  "材料発注",
  "発注先",
  "協力業者を選択",
  "クロス品番",
  "参考数量",
  "業者単価表",
  "×1.00",
  "0.90",
  "0.85",
  "showTradeManager",
  "purchaseOrder",
  "orderType",
  "orderMode",
  "selectedTrade",
  "selectedContractor",
  "selectedSupplier",
  "setShow",
];

const matches = [];

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];

  if (patterns.some((pattern) => line.includes(pattern))) {
    matches.push(i);
  }
}

if (matches.length === 0) {
  fail("発注画面に関係するコードを検出できませんでした。変更はしていません。");
}

const ranges = [];
const contextBefore = 18;
const contextAfter = 30;

for (const index of matches) {
  const start = Math.max(0, index - contextBefore);
  const end = Math.min(lines.length - 1, index + contextAfter);

  const previous = ranges[ranges.length - 1];

  if (previous && start <= previous.end + 1) {
    previous.end = Math.max(previous.end, end);
  } else {
    ranges.push({ start, end });
  }
}

const stateMatches = [];

for (let i = 0; i < lines.length; i += 1) {
  if (
    lines[i].includes("useState(") &&
    (
      lines[i].toLowerCase().includes("order") ||
      lines[i].toLowerCase().includes("trade") ||
      lines[i].toLowerCase().includes("contractor") ||
      lines[i].toLowerCase().includes("supplier") ||
      lines[i].includes("発注")
    )
  ) {
    stateMatches.push(i);
  }
}

const output = [];

output.push("M-CROSS 発注書分岐・構造確認");
output.push("対象: " + appPath);
output.push("総行数: " + lines.length);
output.push("検出位置数: " + matches.length);
output.push("");
output.push("このファイルは確認専用です。App.jsx は変更していません。");
output.push("");

if (stateMatches.length > 0) {
  output.push("========== 発注関連 useState ==========");

  for (const index of stateMatches) {
    output.push(
      String(index + 1).padStart(6, " ") +
      " | " +
      lines[index]
    );
  }

  output.push("");
}

ranges.forEach((range, rangeIndex) => {
  output.push(
    `========== 発注関連ブロック ${rangeIndex + 1} ` +
    `(${range.start + 1}-${range.end + 1}行) ==========`
  );

  for (let i = range.start; i <= range.end; i += 1) {
    output.push(
      String(i + 1).padStart(6, " ") +
      " | " +
      lines[i]
    );
  }

  output.push("");
});

fs.writeFileSync(outputPath, output.join("\n"), "utf8");

console.log("OK: App.jsx は変更していません。");
console.log("発注関連コードを次のファイルへ抽出しました。");
console.log(outputPath);
console.log("");
console.log("次のコマンドで内容を表示できます。");
console.log("Get-Content .\\purchase_order_structure.txt");
