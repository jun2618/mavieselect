const fs = require("fs");
const cp = require("child_process");
const file = "./src/App.jsx";
const marker = "M-CROSS_COMPLETE_PRICEBOOK_DATA_V3_SAFE";
const backup = file + ".complete-v3-backup-" + Date.now();
function fail(message){console.error("ERROR: "+message);console.error("App.jsx は変更していません。");process.exit(1)}
if(!fs.existsSync(file))fail("src/App.jsx が見つかりません。");
const original=fs.readFileSync(file,"utf8");
if(original.includes(marker))fail("完全版V3はすでに適用されています。");
const startToken="  const materialReferencePriceBooks = [";
const endToken="  const mergeMaterialReferencePrices = contractorList => {";
const start=original.indexOf(startToken);
const end=original.indexOf(endToken);
if(start<0||end<0||end<=start)fail("既存の単価データ範囲を特定できません。");
const books=[
  {
    "aliases": [
      "株式会社 小倉クロス",
      "小倉クロス",
      "小倉クロスオグラ"
    ],
    "trade": "材料",
    "rows": [
      [
        "クロス (#1000) サンゲツ・リリカラ",
        "m",
        "fixed",
        515,
        ""
      ],
      [
        "クロス (#500) サンゲツ・リリカラ",
        "m",
        "fixed",
        285,
        ""
      ],
      [
        "クロス（得値）",
        "m",
        "fixed",
        280,
        "SP2564 / LB9882 / LB9884"
      ],
      [
        "住宅用CF サンゲツ・リリカラ",
        "m",
        "fixed",
        1800,
        ""
      ],
      [
        "店舗用CF（1.82m巾）サンゲツ",
        "m",
        "rate",
        55,
        ""
      ],
      [
        "ソフト巾木 H-40/60 ケース売",
        "枚",
        "fixed",
        175,
        ""
      ],
      [
        "ソフト巾木 H-60 バラ",
        "枚",
        "fixed",
        225,
        ""
      ],
      [
        "ソフト巾木 H-75 ケース売",
        "枚",
        "fixed",
        215,
        ""
      ],
      [
        "ソフト巾木 H-75 バラ",
        "枚",
        "fixed",
        280,
        ""
      ],
      [
        "ソフト巾木 H-100 バラ",
        "枚",
        "fixed",
        260,
        ""
      ],
      [
        "ソフト巾木 H-100 ケース売",
        "枚",
        "fixed",
        330,
        ""
      ],
      [
        "リアテック サンゲツ",
        "m",
        "rate",
        48,
        ""
      ],
      [
        "フロアタイル サンゲツ・リリカラ",
        "ケース・枚",
        "rate",
        70,
        ""
      ],
      [
        "カーペット（巾成）サンゲツ",
        "m",
        "rate",
        66,
        ""
      ],
      [
        "カーペット（フリー）サンゲツ",
        "m²",
        "rate",
        74,
        ""
      ],
      [
        "NT-350・350V/L サンゲツ",
        "枚",
        "fixed",
        600,
        "旧価格に誤記の可能性あり"
      ],
      [
        "エスリュームプレーン 2mm",
        "m",
        "fixed",
        3300,
        ""
      ],
      [
        "エスリュームマーブル 2mm",
        "m",
        "fixed",
        3400,
        ""
      ],
      [
        "エスリュームミスト/ルーミー/カルド/ウッドⅡ 2mm",
        "m",
        "fixed",
        4200,
        ""
      ],
      [
        "ストロング サンゲツ",
        "m",
        "rate",
        68,
        ""
      ],
      [
        "ノンスキッド サンゲツ",
        "m",
        "rate",
        76,
        ""
      ],
      [
        "溶接棒 サンゲツ",
        "巻",
        "fixed",
        2650,
        ""
      ],
      [
        "アクアマイルド 18kg",
        "個",
        "fixed",
        4100,
        ""
      ],
      [
        "アクアノール 18kg",
        "個",
        "fixed",
        3500,
        ""
      ],
      [
        "ハイライトスーパー（パテ）",
        "個",
        "fixed",
        5200,
        "3kg×4"
      ],
      [
        "ヤヨイ 水性巾木糊スーパー 3kg",
        "個",
        "fixed",
        4000,
        ""
      ],
      [
        "FL18K",
        "個",
        "fixed",
        8500,
        ""
      ],
      [
        "クロス貼施工代（賃貸空室）",
        "m²",
        "fixed",
        450,
        ""
      ],
      [
        "クロス貼施工代（分譲・戸建）",
        "m²",
        "fixed",
        500,
        ""
      ],
      [
        "クロス貼施工代（人工精算物件）",
        "式",
        "fixed",
        23000,
        ""
      ],
      [
        "への字 シルバー",
        "本",
        "fixed",
        2976,
        ""
      ],
      [
        "への字 アンバー",
        "本",
        "fixed",
        2208,
        ""
      ],
      [
        "東リ FS（長尺）",
        "m",
        "fixed",
        5800,
        ""
      ],
      [
        "ダイノックシート",
        "m",
        "rate",
        54,
        ""
      ],
      [
        "ガラスフィルム（GF）",
        "m",
        "fixed",
        3240,
        ""
      ],
      [
        "タジマ Pタイル 50枚",
        "ケース",
        "fixed",
        8100,
        ""
      ],
      [
        "マチコV 50枚",
        "ケース",
        "fixed",
        8100,
        ""
      ]
    ]
  },
  {
    "aliases": [
      "札幌ベニヤ商会",
      "株式会社 札幌ベニヤ商会",
      "株式会社札幌ベニヤ商会"
    ],
    "trade": "材料",
    "rows": [
      [
        "キッチンパネル 3×6 BKP-6",
        "枚",
        "fixed",
        7400,
        ""
      ],
      [
        "ジョイナー H型",
        "本",
        "fixed",
        310,
        ""
      ],
      [
        "ジョイナー コ型",
        "本",
        "fixed",
        380,
        ""
      ],
      [
        "アイカ ボンド",
        "本",
        "fixed",
        590,
        ""
      ],
      [
        "アイカ テープ",
        "巻",
        "fixed",
        420,
        ""
      ]
    ]
  },
  {
    "aliases": [
      "株式会社 上坂紙店",
      "上坂紙店",
      "上坂紙店コウサカカミテン"
    ],
    "trade": "材料",
    "rows": [
      [
        "SP/LB",
        "m",
        "fixed",
        285,
        ""
      ],
      [
        "掲示板クロス",
        "m",
        "rate",
        70,
        ""
      ],
      [
        "リアテックシート",
        "m",
        "rate",
        58,
        ""
      ],
      [
        "サンゲツ CF 2.3mm・3.5mm・消臭快適",
        "m",
        "rate",
        57,
        ""
      ],
      [
        "サンゲツ ソフト巾木 40mm",
        "ケース",
        "fixed",
        3090,
        ""
      ],
      [
        "サンゲツ ソフト巾木 60mm",
        "ケース",
        "fixed",
        3280,
        ""
      ],
      [
        "サンゲツ ソフト巾木 75mm",
        "ケース",
        "fixed",
        3690,
        ""
      ],
      [
        "サンゲツ ソフト巾木 100mm",
        "ケース",
        "fixed",
        4490,
        ""
      ],
      [
        "リリカラ ソフト巾木 40mm",
        "ケース",
        "fixed",
        3900,
        ""
      ],
      [
        "リリカラ ソフト巾木 60mm",
        "ケース",
        "fixed",
        4150,
        ""
      ],
      [
        "リリカラ ソフト巾木 75mm",
        "ケース",
        "fixed",
        4800,
        ""
      ],
      [
        "リリカラ ソフト巾木 100mm",
        "ケース",
        "fixed",
        6200,
        ""
      ],
      [
        "サンゲツ フロアタイル",
        "ケース・枚",
        "rate",
        57,
        ""
      ],
      [
        "サンゲツ カーペット フリー",
        "m²",
        "rate",
        57,
        ""
      ],
      [
        "サンゲツ カーペット ロール",
        "m",
        "rate",
        53,
        ""
      ],
      [
        "ストロング・ナーシングフロア",
        "m",
        "rate",
        56,
        ""
      ],
      [
        "ノンスキッド",
        "m",
        "rate",
        62,
        ""
      ],
      [
        "NT-350",
        "枚",
        "fixed",
        490,
        ""
      ],
      [
        "NT-350G",
        "枚",
        "fixed",
        520,
        ""
      ],
      [
        "NT-350S",
        "枚",
        "fixed",
        590,
        ""
      ],
      [
        "NT-700",
        "枚",
        "fixed",
        680,
        ""
      ],
      [
        "NT-700S",
        "枚",
        "fixed",
        720,
        ""
      ],
      [
        "NT-700H",
        "枚",
        "fixed",
        720,
        ""
      ],
      [
        "NT-8000",
        "枚",
        "rate",
        50,
        ""
      ]
    ]
  },
  {
    "aliases": [
      "北川",
      "株式会社 北川",
      "株式会社北川",
      "北川商店",
      "株式会社 北川商店",
      "株式会社北川商店"
    ],
    "trade": "材料",
    "rows": [
      [
        "サンゲツ・リリカラ #500",
        "m",
        "fixed",
        245,
        ""
      ],
      [
        "サンゲツ・リリカラ #1000",
        "m",
        "rate",
        45,
        ""
      ],
      [
        "サンゲツ 掲示板クロス",
        "m",
        "rate",
        60,
        ""
      ],
      [
        "リアテック",
        "m",
        "rate",
        47,
        ""
      ],
      [
        "サンゲツ／リリカラ CF",
        "m",
        "fixed",
        1780,
        ""
      ],
      [
        "Hフロア 1.8mm",
        "m",
        "fixed",
        1540,
        ""
      ],
      [
        "Hフロア 2.3mm・3.5mm・消臭快適",
        "m",
        "rate",
        45,
        ""
      ],
      [
        "Hフロア 2m巾",
        "m",
        "fixed",
        2050,
        ""
      ],
      [
        "L45遮音フロア",
        "m",
        "rate",
        64,
        ""
      ],
      [
        "エスリュームプレーン 2.0mm",
        "m",
        "fixed",
        2550,
        ""
      ],
      [
        "エスリュームプレーン 2.5mm",
        "m",
        "fixed",
        2700,
        ""
      ],
      [
        "エスリュームマーブル 2.0mm",
        "m",
        "fixed",
        2650,
        ""
      ],
      [
        "エスリュームマーブル 2.5mm",
        "m",
        "fixed",
        2800,
        ""
      ],
      [
        "東リ FS（長尺）",
        "m",
        "fixed",
        5800,
        ""
      ],
      [
        "サンゲツ 巾木 40mm",
        "ケース",
        "fixed",
        2700,
        ""
      ],
      [
        "サンゲツ 巾木 60mm",
        "ケース",
        "fixed",
        2900,
        ""
      ],
      [
        "サンゲツ 巾木 75mm",
        "ケース",
        "fixed",
        3200,
        ""
      ],
      [
        "サンゲツ 巾木 100mm",
        "ケース",
        "fixed",
        3900,
        ""
      ],
      [
        "リリカラ 巾木 40mm",
        "ケース",
        "fixed",
        3375,
        ""
      ],
      [
        "リリカラ 巾木 60mm",
        "ケース",
        "fixed",
        3625,
        ""
      ],
      [
        "リリカラ 巾木 75mm",
        "ケース",
        "fixed",
        4000,
        ""
      ],
      [
        "リリカラ 巾木 100mm",
        "ケース",
        "fixed",
        4875,
        ""
      ],
      [
        "への字 シルバー 3.64m",
        "本",
        "fixed",
        1850,
        ""
      ],
      [
        "への字 シルバー 1.82m",
        "本",
        "fixed",
        1540,
        ""
      ],
      [
        "への字 シルバー 0.91m",
        "本",
        "fixed",
        900,
        ""
      ],
      [
        "への字 アンバー 3.64m",
        "本",
        "fixed",
        2600,
        ""
      ],
      [
        "への字 アンバー 1.82m",
        "本",
        "fixed",
        2100,
        ""
      ],
      [
        "への字 アンバー 0.91m",
        "本",
        "fixed",
        1180,
        ""
      ],
      [
        "障子 ワーロン 雲竜 15m",
        "巻",
        "fixed",
        6500,
        ""
      ],
      [
        "障子 ワーロン 雲竜 30m",
        "巻",
        "fixed",
        11700,
        ""
      ]
    ]
  },
  {
    "aliases": [
      "シンコール",
      "シンコール株式会社",
      "シンコール 株式会社"
    ],
    "trade": "材料",
    "rows": [
      [
        "SLクロス",
        "m",
        "fixed",
        269,
        ""
      ],
      [
        "ベストクロス",
        "m²",
        "rate",
        55,
        ""
      ],
      [
        "ビッグエース",
        "m",
        "fixed",
        465,
        ""
      ],
      [
        "ポンリューム住宅用",
        "m",
        "fixed",
        1550,
        ""
      ],
      [
        "E2（2m幅）",
        "m",
        "fixed",
        2120,
        ""
      ],
      [
        "ソフト巾木 40mm（25枚入）",
        "箱",
        "fixed",
        3000,
        ""
      ],
      [
        "ソフト巾木 75mm（25枚入）",
        "箱",
        "fixed",
        4100,
        ""
      ],
      [
        "ロール巾木 60mm（25m巻）",
        "箱",
        "fixed",
        4300,
        ""
      ],
      [
        "ガード巾木 200mm（10m巻）",
        "箱",
        "fixed",
        9500,
        ""
      ],
      [
        "木目巾木 60mm（25枚入）",
        "箱",
        "fixed",
        5600,
        ""
      ],
      [
        "ニューウッディワイド巾木 300mm（10m巻）",
        "巻",
        "fixed",
        13500,
        ""
      ],
      [
        "巾木 100mm（25m巻）",
        "巻",
        "fixed",
        5800,
        ""
      ],
      [
        "巾木 60mm（25枚入）",
        "箱",
        "fixed",
        3550,
        ""
      ],
      [
        "巾木 100mm（25枚入）",
        "箱",
        "fixed",
        4900,
        ""
      ]
    ]
  }
];
const replacement=`  /* ${marker} */\n  const materialReferencePriceBooks = ${JSON.stringify(books,null,2)}\n\n`;
let next=original.slice(0,start)+replacement+original.slice(end);

// 既存localStorageにも毎回不足分をマージできるよう、照合を強化
const oldMatch=`      const source=materialReferencePriceBooks.find(book =>\n        book.aliases.some(alias =>\n          contractorName === alias ||\n          contractorName.includes(alias) ||\n          alias.includes(contractorName)\n        )\n      )`;
const newMatch=`      const normalize=value=>String(value||'').replace(/[\\s　・＆&()（）]/g,'').toLowerCase()\n      const normalizedContractorName=normalize(contractorName)\n      const source=materialReferencePriceBooks.find(book =>\n        book.aliases.some(alias => {\n          const normalizedAlias=normalize(alias)\n          return normalizedContractorName===normalizedAlias || normalizedContractorName.includes(normalizedAlias) || normalizedAlias.includes(normalizedContractorName)\n        })\n      )`;
if(next.includes(oldMatch))next=next.replace(oldMatch,newMatch);

// 完全版の行を有効なpriceBook形式へ変換する互換処理
const oldAdd=`      const additions=source.rows\n        .filter(row=>!knownNames.has(row.name))\n        .map((row,index)=>({\n          id:\n            'reference-price-' +\n            String(contractor.id||'supplier') +\n            '-' +\n            Date.now() +\n            '-' +\n            index,\n          ...row,\n          referenceOnly:true\n        }))`;
const newAdd=`      const normalizedRows=source.rows.map(row=>Array.isArray(row)?{name:row[0],unit:row[1],priceType:row[2],price:row[2]==='fixed'?row[3]:'',rate:row[2]==='rate'?row[3]:'',note:row[4]||''}:row)\n      const additions=normalizedRows\n        .filter(row=>!knownNames.has(row.name))\n        .map((row,index)=>({id:'reference-price-'+String(contractor.id||'supplier')+'-'+Date.now()+'-'+index,...row,referenceOnly:true}))`;
if(!next.includes(oldAdd))fail("既存の単価マージ処理を特定できません。");
next=next.replace(oldAdd,newAdd);

// 材料問屋として扱う
const oldReturn=`      return {\n        ...contractor,\n        priceBook:[...currentRows,...additions]\n      }`;
const newReturn=`      return {\n        ...contractor,\n        trade:source.trade||contractor.trade||'材料',\n        orderMode:'material',\n        priceBook:[...currentRows,...additions]\n      }`;
if(!next.includes(oldReturn))fail("業者更新処理を特定できません。");
next=next.replace(oldReturn,newReturn);

// 掛率を「未設定」ではなく表示
const oldDisplay=`row.price === '' ||\n                                                row.price == null\n                                                  ? '未設定'\n                                                  : formatYen(\n                                                      Number(\n                                                        row.price\n                                                      ) || 0\n                                                    )`;
const newDisplay=`row.priceType === 'rate'\n                                                  ? '掛率 ' + formatQuantity(Number(row.rate || 0)) + '%'\n                                                  : row.price === '' || row.price == null\n                                                    ? '未設定'\n                                                    : formatYen(Number(row.price) || 0)`;
if(next.includes(oldDisplay))next=next.replace(oldDisplay,newDisplay);

if(next===original||!next.includes(marker))fail("置換に失敗しました。");
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,"utf8");
try{cp.execSync("npm run build",{stdio:"inherit",shell:true});console.log("");console.log("OK: 業者別単価データ完全版V3を適用しました。");console.log("小倉クロスはマチコVまで、北川・上坂紙店・シンコール等も不足分を追加します。");console.log("単価表は確認用で、発注明細へ自動反映しません。");console.log("BACKUP: "+backup)}catch(e){fs.copyFileSync(backup,file);console.error("ERROR: build失敗。App.jsxを自動復旧しました。");process.exit(1)}
