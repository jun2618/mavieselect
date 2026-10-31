const fs = require("fs");
const cp = require("child_process");

const file = "./src/App.jsx";
const backup = file + ".reference-price-backup-" + Date.now();
const marker = "M-CROSS_MATERIAL_REFERENCE_PRICES_V1_SAFE";

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
  fail("確認用単価表V1はすでに適用されています。");
}

const initAnchor = `  const [contractors, setContractors] = useState(() => {
    try {
      const stored=JSON.parse(localStorage.getItem(contractorMasterStorageKey)||'[]')
      const existing=Array.isArray(stored)?stored:[]
      const normalizedNames=new Set(existing.map(item=>String(item?.name||'').trim()).filter(Boolean))
      const missing=defaultContractors.filter(item=>!normalizedNames.has(item.name))
      const merged=[...existing,...missing]
      if(missing.length) localStorage.setItem(contractorMasterStorageKey,JSON.stringify(merged))
      return merged
    } catch { return defaultContractors }
  })`;

const count = original.split(initAnchor).length - 1;

if (count !== 1) {
  fail(
    "contractors初期化処理を一意に特定できません。検出数: " +
    count
  );
}

const replacement = `  /* ${marker} */
  const materialReferencePriceBooks = [
    {
      aliases:['株式会社 小倉クロス','小倉クロス','小倉クロスオグラ'],
      rows:[
        {name:'クロス (#1000) サンゲツ・リリカラ',unit:'m',priceType:'fixed',price:515,rate:'',note:''},
        {name:'クロス (#500) サンゲツ・リリカラ',unit:'m',priceType:'fixed',price:285,rate:'',note:''},
        {name:'クロス（得値）',unit:'m',priceType:'fixed',price:280,rate:'',note:'SP2564 / LB9882 / LB9884'},
        {name:'住宅用CF サンゲツ・リリカラ',unit:'m',priceType:'fixed',price:1800,rate:'',note:''},
        {name:'店舗用CF（1.82m巾）サンゲツ',unit:'m',priceType:'rate',price:'',rate:55,note:''},
        {name:'ソフト巾木 H-40/60 ケース売',unit:'枚',priceType:'fixed',price:175,rate:'',note:''},
        {name:'ソフト巾木 H-60 バラ',unit:'枚',priceType:'fixed',price:225,rate:'',note:''},
        {name:'ソフト巾木 H-75 ケース売',unit:'枚',priceType:'fixed',price:215,rate:'',note:''},
        {name:'ソフト巾木 H-75 バラ',unit:'枚',priceType:'fixed',price:280,rate:'',note:''},
        {name:'ソフト巾木 H-100 バラ',unit:'枚',priceType:'fixed',price:260,rate:'',note:''},
        {name:'ソフト巾木 H-100 ケース売',unit:'枚',priceType:'fixed',price:330,rate:'',note:''},
        {name:'リアテック サンゲツ',unit:'m',priceType:'rate',price:'',rate:48,note:''},
        {name:'フロアタイル サンゲツ・リリカラ',unit:'ケース・枚',priceType:'rate',price:'',rate:70,note:''},
        {name:'NT-350・350V/L サンゲツ',unit:'枚',priceType:'fixed',price:600,rate:'',note:'旧価格に誤記の可能性あり'},
        {name:'エスリュームプレーン 2mm',unit:'m',priceType:'fixed',price:3300,rate:'',note:''},
        {name:'エスリュームマーブル 2mm',unit:'m',priceType:'fixed',price:3400,rate:'',note:''},
        {name:'ストロング サンゲツ',unit:'m',priceType:'rate',price:'',rate:68,note:''},
        {name:'ノンスキッド サンゲツ',unit:'m',priceType:'rate',price:'',rate:76,note:''}
      ]
    },
    {
      aliases:['株式会社 上坂紙店','上坂紙店','上坂紙店コウサカカミテン'],
      rows:[
        {name:'SP/LB',unit:'m',priceType:'fixed',price:285,rate:'',note:''},
        {name:'掲示板クロス',unit:'m',priceType:'rate',price:'',rate:70,note:''},
        {name:'リアテックシート',unit:'m',priceType:'rate',price:'',rate:58,note:''},
        {name:'サンゲツ CF 2.3mm・3.5mm・消臭快適',unit:'m',priceType:'rate',price:'',rate:57,note:''},
        {name:'サンゲツ ソフト巾木 40mm',unit:'ケース',priceType:'fixed',price:3090,rate:'',note:''},
        {name:'サンゲツ ソフト巾木 60mm',unit:'ケース',priceType:'fixed',price:3280,rate:'',note:''},
        {name:'サンゲツ ソフト巾木 75mm',unit:'ケース',priceType:'fixed',price:3690,rate:'',note:''},
        {name:'サンゲツ ソフト巾木 100mm',unit:'ケース',priceType:'fixed',price:4490,rate:'',note:''},
        {name:'リリカラ ソフト巾木 40mm',unit:'ケース',priceType:'fixed',price:3900,rate:'',note:''},
        {name:'リリカラ ソフト巾木 60mm',unit:'ケース',priceType:'fixed',price:4150,rate:'',note:''},
        {name:'リリカラ ソフト巾木 75mm',unit:'ケース',priceType:'fixed',price:4800,rate:'',note:''},
        {name:'リリカラ ソフト巾木 100mm',unit:'ケース',priceType:'fixed',price:6200,rate:'',note:''},
        {name:'サンゲツ フロアタイル',unit:'ケース・枚',priceType:'rate',price:'',rate:57,note:''},
        {name:'サンゲツ カーペット フリー',unit:'m²',priceType:'rate',price:'',rate:57,note:''},
        {name:'サンゲツ カーペット ロール',unit:'m',priceType:'rate',price:'',rate:53,note:''},
        {name:'ストロング・ナーシングフロア',unit:'m',priceType:'rate',price:'',rate:56,note:''},
        {name:'ノンスキッド',unit:'m',priceType:'rate',price:'',rate:62,note:''},
        {name:'カーペットタイル NT-350',unit:'枚',priceType:'fixed',price:490,rate:'',note:''},
        {name:'カーペットタイル NT-350G',unit:'枚',priceType:'fixed',price:520,rate:'',note:''},
        {name:'カーペットタイル NT-350S',unit:'枚',priceType:'fixed',price:590,rate:'',note:''},
        {name:'カーペットタイル NT-700',unit:'枚',priceType:'fixed',price:680,rate:'',note:''},
        {name:'カーペットタイル NT-700S',unit:'枚',priceType:'fixed',price:720,rate:'',note:''}
      ]
    },
    {
      aliases:['シンコール','シンコール株式会社'],
      rows:[
        {name:'SLクロス',unit:'m',priceType:'fixed',price:269,rate:'',note:''},
        {name:'ベストクロス',unit:'m²',priceType:'rate',price:'',rate:55,note:''},
        {name:'ビッグエース',unit:'m',priceType:'fixed',price:465,rate:'',note:''},
        {name:'ポンリューム住宅用',unit:'m',priceType:'fixed',price:1550,rate:'',note:''},
        {name:'E2（2m幅）',unit:'m',priceType:'fixed',price:2120,rate:'',note:''},
        {name:'ソフト巾木 40mm（25枚入）',unit:'箱',priceType:'fixed',price:3000,rate:'',note:''},
        {name:'ソフト巾木 75mm（25枚入）',unit:'箱',priceType:'fixed',price:4100,rate:'',note:''},
        {name:'ロール巾木 60mm（25m巻）',unit:'箱',priceType:'fixed',price:4300,rate:'',note:''},
        {name:'ガード巾木 200mm（10m巻）',unit:'箱',priceType:'fixed',price:9500,rate:'',note:''},
        {name:'木目巾木 60mm（25枚入）',unit:'箱',priceType:'fixed',price:5600,rate:'',note:''},
        {name:'ニューウッディワイド巾木 300mm（10m巻）',unit:'巻',priceType:'fixed',price:13500,rate:'',note:''},
        {name:'巾木 100mm（25m巻）',unit:'巻',priceType:'fixed',price:5800,rate:'',note:''},
        {name:'巾木 60mm（25枚入）',unit:'箱',priceType:'fixed',price:3550,rate:'',note:''},
        {name:'巾木 100mm（25枚入）',unit:'箱',priceType:'fixed',price:4900,rate:'',note:''}
      ]
    }
  ]

  const mergeMaterialReferencePrices = contractorList => {
    let changed=false

    const merged=contractorList.map(contractor => {
      const contractorName=String(contractor?.name||'').trim()

      const source=materialReferencePriceBooks.find(book =>
        book.aliases.some(alias =>
          contractorName === alias ||
          contractorName.includes(alias) ||
          alias.includes(contractorName)
        )
      )

      if(!source) return contractor

      const currentRows=Array.isArray(contractor.priceBook)
        ? contractor.priceBook
        : []

      const knownNames=new Set(
        currentRows
          .map(row=>String(row?.name||'').trim())
          .filter(Boolean)
      )

      const additions=source.rows
        .filter(row=>!knownNames.has(row.name))
        .map((row,index)=>({
          id:
            'reference-price-' +
            String(contractor.id||'supplier') +
            '-' +
            Date.now() +
            '-' +
            index,
          ...row,
          referenceOnly:true
        }))

      if(!additions.length) return contractor

      changed=true

      return {
        ...contractor,
        priceBook:[...currentRows,...additions]
      }
    })

    return {merged,changed}
  }

  const [contractors, setContractors] = useState(() => {
    try {
      const stored=JSON.parse(localStorage.getItem(contractorMasterStorageKey)||'[]')
      const existing=Array.isArray(stored)?stored:[]
      const normalizedNames=new Set(existing.map(item=>String(item?.name||'').trim()).filter(Boolean))
      const missing=defaultContractors.filter(item=>!normalizedNames.has(item.name))
      const base=[...existing,...missing]
      const result=mergeMaterialReferencePrices(base)

      if(missing.length||result.changed){
        localStorage.setItem(
          contractorMasterStorageKey,
          JSON.stringify(result.merged)
        )
      }

      return result.merged
    } catch {
      const result=mergeMaterialReferencePrices(defaultContractors)
      return result.merged
    }
  })`;

const next = original.replace(initAnchor, replacement);

if (next === original) {
  fail("変更内容がありません。");
}

if (!next.includes(marker)) {
  fail("適用マーカーを確認できません。");
}

fs.copyFileSync(file, backup);
fs.writeFileSync(file, next, "utf8");

try {
  cp.execSync("npm run build", {
    stdio:"inherit",
    shell:true
  });

  console.log("");
  console.log("OK: 確認用の業者別材料単価を登録しました。");
  console.log("対象: 株式会社 小倉クロス、上坂紙店、シンコール");
  console.log("既存の単価表は維持しています。");
  console.log("同じ品名は重複登録していません。");
  console.log("発注明細への自動反映は追加していません。");
  console.log("BACKUP:", backup);
} catch(error) {
  fs.copyFileSync(backup,file);

  console.error("");
  console.error(
    "ERROR: build失敗。App.jsxを自動復旧しました。"
  );

  process.exit(1);
}