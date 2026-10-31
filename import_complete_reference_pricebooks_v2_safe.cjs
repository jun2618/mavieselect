const fs = require("fs");
const cp = require("child_process");

const file = "./src/App.jsx";
const marker = "M-CROSS_COMPLETE_REFERENCE_PRICEBOOKS_V2_SAFE";
const backup = file + ".complete-pricebooks-v2-backup-" + Date.now();

function fail(message) {
  console.error("ERROR: " + message);
  console.error("App.jsx は変更していません。");
  process.exit(1);
}

if (!fs.existsSync(file)) fail("src/App.jsx が見つかりません。");
const original = fs.readFileSync(file, "utf8");
if (original.includes(marker)) fail("完全版V2はすでに適用されています。");

const anchor = "  const [contractors, setContractors] = useState(() => {";
const anchorCount = original.split(anchor).length - 1;
if (anchorCount !== 1) fail("contractors初期化位置の検出数が " + anchorCount + " 件です。");

const data = [
  {
    aliases:["株式会社 小倉クロス","小倉クロス","小倉クロスオグラ"],
    trade:"材料",
    rows:[
      ["クロス (#1000) サンゲツ・リリカラ","m","fixed",515,""],
      ["クロス (#500) サンゲツ・リリカラ","m","fixed",285,""],
      ["クロス（得値）","m","fixed",280,"SP2564 / LB9882 / LB9884"],
      ["住宅用CF サンゲツ・リリカラ","m","fixed",1800,""],
      ["店舗用CF（1.82m巾）サンゲツ","m","rate",55,""],
      ["ソフト巾木 H-40/60 ケース売","枚","fixed",175,""],
      ["ソフト巾木 H-60 バラ","枚","fixed",225,""],
      ["ソフト巾木 H-75 ケース売","枚","fixed",215,""],
      ["ソフト巾木 H-75 バラ","枚","fixed",280,""],
      ["ソフト巾木 H-100 バラ","枚","fixed",260,""],
      ["ソフト巾木 H-100 ケース売","枚","fixed",330,""],
      ["リアテック サンゲツ","m","rate",48,""],
      ["フロアタイル サンゲツ・リリカラ","ケース・枚","rate",70,""],
      ["カーペット（巾成）サンゲツ","m","rate",66,""],
      ["カーペット（フリー）サンゲツ","m²","rate",74,""],
      ["NT-350・350V/L サンゲツ","枚","fixed",600,"旧価格に誤記の可能性あり"],
      ["エスリュームプレーン 2mm","m","fixed",3300,""],
      ["エスリュームマーブル 2mm","m","fixed",3400,""],
      ["エスリュームミスト/ルーミー/カルド/ウッドⅡ 2mm","m","fixed",4200,""],
      ["ストロング サンゲツ","m","rate",68,""],
      ["ノンスキッド サンゲツ","m","rate",76,""],
      ["溶接棒 サンゲツ","巻","fixed",2650,""],
      ["アクアマイルド 18kg","個","fixed",4100,""],
      ["アクアノール 18kg","個","fixed",3500,""],
      ["ハイライトスーパー（パテ）","個","fixed",5200,"3kg×4"],
      ["ヤヨイ 水性巾木糊スーパー 3kg","個","fixed",4000,""],
      ["FL18K","個","fixed",8500,""],
      ["クロス貼施工代（賃貸空室）","m²","fixed",450,""],
      ["クロス貼施工代（分譲・戸建）","m²","fixed",500,""],
      ["クロス貼施工代（人工精算物件）","式","fixed",23000,""],
      ["への字 シルバー","本","fixed",2976,""],
      ["への字 アンバー","本","fixed",2208,""],
      ["東リ FS（長尺）","m","fixed",5800,""],
      ["ダイノックシート","m","rate",54,""],
      ["ガラスフィルム（GF）","m","fixed",3240,""],
      ["タジマ Pタイル 50枚","ケース","fixed",8100,""],
      ["マチコV 50枚","ケース","fixed",8100,""]
    ]
  },
  {
    aliases:["札幌ベニヤ商会","株式会社 札幌ベニヤ商会","株式会社札幌ベニヤ商会"],
    trade:"材料",
    rows:[
      ["キッチンパネル 3×6 BKP-6","枚","fixed",7400,""],
      ["ジョイナー H型","本","fixed",310,""],
      ["ジョイナー コ型","本","fixed",380,""],
      ["アイカ ボンド","本","fixed",590,""],
      ["アイカ テープ","巻","fixed",420,""]
    ]
  },
  {
    aliases:["株式会社 上坂紙店","上坂紙店","上坂紙店コウサカカミテン"],
    trade:"材料",
    rows:[
      ["SP/LB","m","fixed",285,""],
      ["掲示板クロス","m","rate",70,""],
      ["リアテックシート","m","rate",58,""],
      ["サンゲツ CF 2.3mm・3.5mm・消臭快適","m","rate",57,""],
      ["サンゲツ ソフト巾木 40mm","ケース","fixed",3090,""],
      ["サンゲツ ソフト巾木 60mm","ケース","fixed",3280,""],
      ["サンゲツ ソフト巾木 75mm","ケース","fixed",3690,""],
      ["サンゲツ ソフト巾木 100mm","ケース","fixed",4490,""],
      ["リリカラ ソフト巾木 40mm","ケース","fixed",3900,""],
      ["リリカラ ソフト巾木 60mm","ケース","fixed",4150,""],
      ["リリカラ ソフト巾木 75mm","ケース","fixed",4800,""],
      ["リリカラ ソフト巾木 100mm","ケース","fixed",6200,""],
      ["サンゲツ フロアタイル","ケース・枚","rate",57,""],
      ["サンゲツ カーペット フリー","m²","rate",57,""],
      ["サンゲツ カーペット ロール","m","rate",53,""],
      ["ストロング・ナーシングフロア","m","rate",56,""],
      ["ノンスキッド","m","rate",62,""],
      ["NT-350","枚","fixed",490,""],
      ["NT-350G","枚","fixed",520,""],
      ["NT-350S","枚","fixed",590,""],
      ["NT-700","枚","fixed",680,""],
      ["NT-700S","枚","fixed",720,""],
      ["NT-700H","枚","fixed",720,""],
      ["NT-8000","枚","rate",50,""],
      ["クロス施工代","m²","fixed",450,"2024年12月1日より改定"],
      ["フロアタイル施工代","m²","fixed",920,"2024年12月1日より改定"],
      ["CF施工代","m²","fixed",650,"2024年12月1日より改定"],
      ["巾木施工代","m²","fixed",130,"2024年12月1日より改定"]
    ]
  },
  {
    aliases:["北川","株式会社 北川","株式会社北川"],
    trade:"材料",
    rows:[
      ["サンゲツ・リリカラ #500","m","fixed",245,""],
      ["サンゲツ・リリカラ #1000","m","rate",45,""],
      ["サンゲツ 掲示板クロス","m","rate",60,""],
      ["リアテック","m","rate",47,""],
      ["サンゲツ／リリカラ CF","m","fixed",1780,""],
      ["Hフロア 1.8mm","m","fixed",1540,""],
      ["Hフロア 2.3mm・3.5mm・消臭快適","m","rate",45,""],
      ["Hフロア 2m巾","m","fixed",2050,""],
      ["L45遮音フロア","m","rate",64,""],
      ["エスリュームプレーン 2.0mm","m","fixed",2550,""],
      ["エスリュームプレーン 2.5mm","m","fixed",2700,""],
      ["エスリュームマーブル 2.0mm","m","fixed",2650,""],
      ["エスリュームマーブル 2.5mm","m","fixed",2800,""],
      ["東リ FS（長尺）","m","fixed",5800,""],
      ["サンゲツ 巾木 40mm","ケース","fixed",2700,""],
      ["サンゲツ 巾木 60mm","ケース","fixed",2900,""],
      ["サンゲツ 巾木 75mm","ケース","fixed",3200,""],
      ["サンゲツ 巾木 100mm","ケース","fixed",3900,""],
      ["リリカラ 巾木 40mm","ケース","fixed",3375,""],
      ["リリカラ 巾木 60mm","ケース","fixed",3625,""],
      ["リリカラ 巾木 75mm","ケース","fixed",4000,""],
      ["リリカラ 巾木 100mm","ケース","fixed",4875,""],
      ["への字 シルバー 3.64m","本","fixed",1850,""],
      ["への字 シルバー 1.82m","本","fixed",1540,""],
      ["への字 シルバー 0.91m","本","fixed",900,""],
      ["への字 アンバー 3.64m","本","fixed",2600,""],
      ["への字 アンバー 1.82m","本","fixed",2100,""],
      ["への字 アンバー 0.91m","本","fixed",1180,""],
      ["への字 アンバー","本","fixed",1800,""],
      ["障子 ワーロン 雲竜 15m","巻","fixed",6500,""],
      ["障子 ワーロン 雲竜 30m","巻","fixed",11700,""]
    ]
  },
  {
    aliases:["シンコール","シンコール株式会社","シンコール 株式会社"],
    trade:"材料",
    rows:[
      ["SLクロス","m","fixed",269,""],
      ["ベストクロス","m²","rate",55,""],
      ["ビッグエース","m","fixed",465,""],
      ["ポンリューム住宅用","m","fixed",1550,""],
      ["E2（2m幅）","m","fixed",2120,""],
      ["ソフト巾木 40mm（25枚入）","箱","fixed",3000,""],
      ["ソフト巾木 75mm（25枚入）","箱","fixed",4100,""],
      ["ロール巾木 60mm（25m巻）","箱","fixed",4300,""],
      ["ガード巾木 200mm（10m巻）","箱","fixed",9500,""],
      ["木目巾木 60mm（25枚入）","箱","fixed",5600,""],
      ["ニューウッディワイド巾木 300mm（10m巻）","巻","fixed",13500,""],
      ["巾木 100mm（25m巻）","巻","fixed",5800,""],
      ["巾木 60mm（25枚入）","箱","fixed",3550,""],
      ["巾木 100mm（25枚入）","箱","fixed",4900,""]
    ]
  },
  {
    aliases:["泰平建材","株式会社 泰平建材","株式会社泰平建材"],
    trade:"材料",
    rows:[
      ["シャンプードレッサー W600","台","fixed",29500,""],
      ["シャンプードレッサー W750","台","fixed",32500,""],
      ["シャンプードレッサー キャビネット W600","台","fixed",8000,""],
      ["シャンプードレッサー キャビネット W750","台","fixed",9000,""],
      ["シャンプードレッサー 洗面台 W600","台","fixed",21500,""],
      ["シャンプードレッサー 洗面台 W750","台","fixed",23500,""]
    ]
  }
];

const injected = `\n  /* ${marker} */\n  const completeReferencePriceBooks = ${JSON.stringify(data, null, 2)}\n  const mergeCompleteReferencePriceBooks = contractorList => {\n    let changed = false\n    const normalized = value => String(value || '').replace(/[\\s　・＆&()（）]/g, '').toLowerCase()\n    const result = contractorList.map(contractor => {\n      const contractorName = normalized(contractor?.name)\n      const source = completeReferencePriceBooks.find(book =>\n        book.aliases.some(alias => {\n          const candidate = normalized(alias)\n          return contractorName === candidate || contractorName.includes(candidate) || candidate.includes(contractorName)\n        })\n      )\n      if (!source) return contractor\n      const currentRows = Array.isArray(contractor.priceBook) ? contractor.priceBook : []\n      const known = new Set(currentRows.map(row => normalized(row?.name)).filter(Boolean))\n      const additions = source.rows\n        .filter(row => !known.has(normalized(row[0])))\n        .map((row, index) => ({\n          id: 'complete-reference-' + String(contractor.id || 'supplier') + '-' + index,\n          name: row[0],\n          unit: row[1],\n          priceType: row[2],\n          price: row[2] === 'fixed' ? row[3] : '',\n          rate: row[2] === 'rate' ? row[3] : '',\n          note: row[4] || '',\n          referenceOnly: true\n        }))\n      if (!additions.length && contractor.trade === source.trade && contractor.orderMode === 'material') return contractor\n      changed = true\n      return {\n        ...contractor,\n        trade: source.trade,\n        orderMode: 'material',\n        priceBook: [...currentRows, ...additions]\n      }\n    })\n    return { result, changed }\n  }\n`;

let next = original.replace(anchor, injected + "\n" + anchor);

const baseLine = "      const merged=[...existing,...missing]";
const returnLine = "      return merged";
if ((next.split(baseLine).length - 1) !== 1 || (next.split(returnLine).length - 1) !== 1) {
  fail("contractors初期化内部を安全に特定できません。");
}
next = next.replace(baseLine, "      const base=[...existing,...missing]\n      const completeMerge=mergeCompleteReferencePriceBooks(base)\n      const merged=completeMerge.result");
next = next.replace("      if(missing.length) localStorage.setItem(contractorMasterStorageKey,JSON.stringify(merged))", "      if(missing.length||completeMerge.changed) localStorage.setItem(contractorMasterStorageKey,JSON.stringify(merged))");
next = next.replace("    } catch { return defaultContractors }", "    } catch { return mergeCompleteReferencePriceBooks(defaultContractors).result }");

if (next === original || !next.includes(marker)) fail("置換に失敗しました。");
fs.copyFileSync(file, backup);
fs.writeFileSync(file, next, "utf8");

try {
  cp.execSync("npm run build", { stdio:"inherit", shell:true });
  console.log("");
  console.log("OK: 業者別確認用単価表 完全版V2を適用しました。");
  console.log("対象: 小倉クロス、札幌ベニヤ商会、上坂紙店、北川、シンコール、泰平建材");
  console.log("既存単価表は保持し、同名項目は重複追加していません。");
  console.log("発注明細への自動反映は追加していません。");
  console.log("BACKUP: " + backup);
} catch (error) {
  fs.copyFileSync(backup, file);
  console.error("");
  console.error("ERROR: build失敗。App.jsxを自動復旧しました。");
  process.exit(1);
}
