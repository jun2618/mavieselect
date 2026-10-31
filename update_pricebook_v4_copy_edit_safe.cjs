const fs = require("fs");
const cp = require("child_process");

const file = "./src/App.jsx";
const marker = "M-CROSS_PRICEBOOK_V4_COPY_EDIT_SAFE";
const backup = file + ".v4-pricebook-backup-" + Date.now();

function fail(message){
  console.error("ERROR: " + message);
  console.error("App.jsx は変更していません。");
  process.exit(1);
}
if(!fs.existsSync(file)) fail("src/App.jsx が見つかりません。");
const original = fs.readFileSync(file,"utf8");
if(original.includes(marker)) fail("V4はすでに適用されています。");
let next = original;

// 1) コピー単価 state
const stateAnchor = "const [showMaterialPriceBook, setShowMaterialPriceBook] = useState(false)";
if((next.split(stateAnchor).length-1)!==1) fail("材料単価表stateを一意に特定できません。");
next = next.replace(stateAnchor, stateAnchor + `\n  /* ${marker} */\n  const [copiedMaterialRate,setCopiedMaterialRate]=useState(null)`);

// 2) 上坂紙店の旧ブックに正式名称／不足項目を追加するための補完データ
const mergeAnchor = "  const mergeMaterialReferencePrices = contractorList => {";
if(!next.includes(mergeAnchor)) fail("単価マージ関数が見つかりません。");
const supplemental = `  /* ${marker} */
  const kosakaV4Rows = [
    ['サンゲツ・リリカラ #500','m','fixed',285,''],
    ['サンゲツ・リリカラ #1000','m','rate',45,''],
    ['サンゲツ 掲示板クロス','m','rate',70,''],
    ['リアテック','m','rate',58,''],
    ['Hフロア 1.8mm','m','fixed',1540,''],
    ['Hフロア 2.3mm厚・3.5mm厚・消臭快適','m','rate',57,''],
    ['Hフロア 2m巾','m','fixed',2050,''],
    ['L45遮音フロア','m','rate',64,''],
    ['エスリュームプレーン 2.0mm','m','fixed',2550,''],
    ['エスリュームプレーン 2.5mm','m','fixed',2700,''],
    ['エスリュームマーブル 2.0mm','m','fixed',2650,''],
    ['エスリュームマーブル 2.5mm','m','fixed',2800,''],
    ['サンゲツ フロアタイル','ケース・枚','rate',57,''],
    ['サンゲツ カーペット フリー','m²','rate',57,''],
    ['サンゲツ カーペット ロール','m','rate',53,''],
    ['ストロング・ナーシングフロア','m','rate',56,''],
    ['ノンスキッド','m','rate',62,''],
    ['サンゲツ 巾木 40mm','ケース','fixed',3090,''],
    ['サンゲツ 巾木 60mm','ケース','fixed',3280,''],
    ['サンゲツ 巾木 75mm','ケース','fixed',3690,''],
    ['サンゲツ 巾木 100mm','ケース','fixed',4490,''],
    ['リリカラ 巾木 40mm','ケース','fixed',3900,''],
    ['リリカラ 巾木 60mm','ケース','fixed',4150,''],
    ['リリカラ 巾木 75mm','ケース','fixed',4800,''],
    ['リリカラ 巾木 100mm','ケース','fixed',6200,''],
    ['カーペットタイル NT-350','枚','fixed',490,''],
    ['カーペットタイル NT-350G','枚','fixed',520,''],
    ['カーペットタイル NT-350S','枚','fixed',590,''],
    ['カーペットタイル NT-700','枚','fixed',680,''],
    ['カーペットタイル NT-700S','枚','fixed',720,''],
    ['カーペットタイル NT-700H','枚','fixed',720,''],
    ['カーペットタイル NT-8000','枚','rate',50,''],
    ['クロス施工代','m²','fixed',450,''],
    ['フロアタイル施工代','m²','fixed',920,''],
    ['CF施工代','m²','fixed',650,''],
    ['巾木施工代','m²','fixed',130,''],
    ['への字 アンバー','本','fixed',1800,''],
    ['東リ FS（長尺）','m','fixed',5800,'']
  ]
  const kosakaAliasesV4=['株式会社 上坂紙店','上坂紙店','上坂紙店コウサカカミテン']
  const normalizePriceBookNameV4=value=>String(value||'').replace(/[\\s　・＆&()（）]/g,'').toLowerCase()

`;
next = next.replace(mergeAnchor, supplemental + mergeAnchor);

// 3) merger の currentRows 後に上坂補完を差し込む
const rowsAnchor = `      const currentRows=Array.isArray(contractor.priceBook)
        ? contractor.priceBook
        : []`;
if(!next.includes(rowsAnchor)) fail("priceBook既存行処理が見つかりません。");
next = next.replace(rowsAnchor, rowsAnchor + `

      const isKosakaV4=kosakaAliasesV4.some(alias=>normalizePriceBookNameV4(alias)===normalizePriceBookNameV4(contractorName))
      if(isKosakaV4){
        const knownV4=new Set(currentRows.map(row=>normalizePriceBookNameV4(row?.name)))
        kosakaV4Rows.forEach((row,index)=>{
          if(knownV4.has(normalizePriceBookNameV4(row[0])))return
          currentRows.push({id:'kosaka-v4-'+index,name:row[0],unit:row[1],priceType:row[2],price:row[2]==='fixed'?row[3]:'',rate:row[2]==='rate'?row[3]:'',note:row[4]||'',referenceOnly:true})
        })
      }`);

// 4) 閲覧用priceBookの fixed 行へコピーbutton。適用箇所は最初の材料単価表だけ
const rowEnd = `<small>
                                              {row.note || ''}
                                            </small>`;
const pos = next.indexOf(rowEnd);
if(pos<0) fail("材料確認単価表の備考欄を特定できません。");
const replacement = rowEnd + `

                                            {row.priceType==='fixed' && row.price!=='' && row.price!=null && (
                                              <button type="button" onClick={()=>setCopiedMaterialRate(Number(row.price)||0)} title="この単価をコピー">単価コピー</button>
                                            )}`;
next = next.slice(0,pos) + next.slice(pos).replace(rowEnd,replacement);

// 5) 材料単価inputの直後に貼付buttonを追加
const priceInputNeedle = `value={item.unitPrice ?? ''}`;
const pricePos = next.indexOf(priceInputNeedle);
if(pricePos<0) fail("材料明細の単価入力欄が見つかりません。");
const labelEnd = next.indexOf("</label>", pricePos);
if(labelEnd<0) fail("単価入力欄の終了を特定できません。");
const pasteButton = `
                                  {copiedMaterialRate!=null && (
                                    <button type="button" onClick={()=>setMaterialOrderItems(previous=>previous.map((current,index)=>index===itemIndex?{...current,unitPrice:copiedMaterialRate}:current))}>貼付 {formatYen(copiedMaterialRate)}</button>
                                  )}
`;
next = next.slice(0,labelEnd) + pasteButton + next.slice(labelEnd);

// 6) 確認用単価表に編集導線。既存業者編集画面を再利用
const titleNeedle = `{supplier.name} 単価表`;
const titlePos = next.indexOf(titleNeedle);
if(titlePos<0) fail("材料単価表タイトルが見つかりません。");
const closeButtonPos = next.indexOf("<button", titlePos);
if(closeButtonPos<0) fail("単価表の閉じるボタン位置が見つかりません。");
const editButton = `<button type="button" onClick={()=>{setEditingContractorId(supplier.id);setContractorForm({name:supplier.name||'',trade:supplier.trade||'材料',contact:supplier.contact||'',phone:supplier.phone||'',memo:supplier.memo||'',postalCode:supplier.postalCode||'',address:supplier.address||'',priceBook:Array.isArray(supplier.priceBook)?supplier.priceBook.map(row=>({...row})):[],orderMode:supplier.orderMode||'material',rates:{cross:supplier.rates?.cross??'',cf:supplier.rates?.cf??'',soft:supplier.rates?.soft??'',floorTrim:supplier.rates?.floorTrim??'',wallBase:supplier.rates?.wallBase??'',floorBase:supplier.rates?.floorBase??''}});setShowContractorForm(true);setShowContractorPicker(true)}}>単価表を編集</button>\n                                      `;
next = next.slice(0,closeButtonPos) + editButton + next.slice(closeButtonPos);

if(next===original||!next.includes(marker)) fail("V4置換に失敗しました。");
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,"utf8");
try{
  cp.execSync("npm run build",{stdio:"inherit",shell:true});
  console.log("");
  console.log("OK: 単価表V4を適用しました。");
  console.log("・上坂紙店の正式品名／不足項目を補完");
  console.log("・確認単価表に単価コピーを追加");
  console.log("・材料明細へ連続貼付を追加");
  console.log("・単価表編集は既存の業者編集画面を再利用");
  console.log("・掛率はコピー対象外");
  console.log("BACKUP: "+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error("ERROR: build失敗。App.jsxを自動復旧しました。");
  process.exit(1);
}
