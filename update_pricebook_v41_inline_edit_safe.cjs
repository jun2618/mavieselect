const fs=require("fs");
const cp=require("child_process");
const file="./src/App.jsx";
const marker="M-CROSS_PRICEBOOK_V41_INLINE_EDIT_SAFE";
const backup=file+".v41-backup-"+Date.now();
function fail(m){console.error("ERROR: "+m);console.error("App.jsx は変更していません。");process.exit(1)}
if(!fs.existsSync(file))fail("src/App.jsx が見つかりません。");
const original=fs.readFileSync(file,"utf8");
if(original.includes(marker))fail("V4.1はすでに適用されています。");
let next=original;

// 閲覧用priceBookのmapを一意に捕まえる
const mapNeedle="{priceBook.map((row, index) => (";
const mapPos=next.indexOf(mapNeedle);
if(mapPos<0)fail("材料確認用のpriceBook.mapが見つかりません。");
const nextMapPos=next.indexOf(mapNeedle,mapPos+1);
if(nextMapPos>=0)fail("材料確認用priceBook.mapが複数あります。安全のため中止しました。");

// priceBook の各行表示ブロックの終了までを探す
const closeNeedle="                                        ))}";
const closePos=next.indexOf(closeNeedle,mapPos);
if(closePos<0)fail("材料確認用priceBook.mapの終了を特定できません。");
const oldBlock=next.slice(mapPos,closePos+closeNeedle.length);

const newBlock=`{/* ${marker} */}
                                        {priceBook.map((row, index) => (
                                          <div
                                            key={row.id || index}
                                            style={{
                                              display:'grid',
                                              gridTemplateColumns:'minmax(180px,2fr) 70px minmax(125px,.9fr) minmax(110px,1fr) auto',
                                              gap:'8px',
                                              padding:'8px',
                                              alignItems:'center',
                                              border:'1px solid rgba(120,120,120,.2)',
                                              borderRadius:'8px'
                                            }}
                                          >
                                            <strong>{row.name || ''}</strong>
                                            <span>{row.unit || ''}</span>

                                            {row.priceType === 'rate' ? (
                                              <label style={{display:'flex',alignItems:'center',gap:'4px'}}>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  step="0.1"
                                                  value={row.rate ?? ''}
                                                  onChange={event=>{
                                                    const value=event.target.value
                                                    const nextPriceBook=priceBook.map((current,rowIndex)=>rowIndex===index?{...current,priceType:'rate',rate:value===''?'':Math.max(0,Number(value)||0),price:''}:current)
                                                    saveContractors(contractors.map(current=>current.id===supplier.id?{...current,priceBook:nextPriceBook,updatedAt:new Date().toISOString()}:current))
                                                  }}
                                                  style={{width:'82px'}}
                                                />
                                                <b>%</b>
                                              </label>
                                            ) : (
                                              <label style={{display:'flex',alignItems:'center',gap:'4px'}}>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  step="1"
                                                  value={row.price ?? ''}
                                                  onChange={event=>{
                                                    const value=event.target.value
                                                    const nextPriceBook=priceBook.map((current,rowIndex)=>rowIndex===index?{...current,priceType:'fixed',price:value===''?'':Math.max(0,Number(value)||0),rate:''}:current)
                                                    saveContractors(contractors.map(current=>current.id===supplier.id?{...current,priceBook:nextPriceBook,updatedAt:new Date().toISOString()}:current))
                                                  }}
                                                  style={{width:'92px'}}
                                                />
                                                <b>円</b>
                                              </label>
                                            )}

                                            <small>{row.note || ''}</small>

                                            <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                                              {row.priceType==='fixed' && row.price!=='' && row.price!=null && typeof setCopiedMaterialRate==='function' && (
                                                <button type="button" onClick={()=>setCopiedMaterialRate(Number(row.price)||0)}>単価コピー</button>
                                              )}
                                              <button
                                                type="button"
                                                className="danger"
                                                onClick={()=>{
                                                  if(!window.confirm(String(row.name||'')+'を単価表から削除しますか？'))return
                                                  const nextPriceBook=priceBook.filter((_,rowIndex)=>rowIndex!==index)
                                                  saveContractors(contractors.map(current=>current.id===supplier.id?{...current,priceBook:nextPriceBook,updatedAt:new Date().toISOString()}:current))
                                                }}
                                              >削除</button>
                                            </div>
                                          </div>
                                        ))}`;

// setCopiedMaterialRate がない版でもbuildできるよう state を保証
if(!next.includes("const [copiedMaterialRate,setCopiedMaterialRate]")){
  const stateAnchor="const [showMaterialPriceBook, setShowMaterialPriceBook] = useState(false)";
  if(!next.includes(stateAnchor))fail("単価表stateが見つかりません。");
  next=next.replace(stateAnchor,stateAnchor+"\n  const [copiedMaterialRate,setCopiedMaterialRate]=useState(null)");
}

next=next.replace(oldBlock,newBlock);

// 「単価表を編集」導線がV4で入っていれば除去
next=next.replace(/<button type="button" onClick=\{\(\)=>\{setEditingContractorId\(supplier\.id\);[\s\S]*?\}\}>単価表を編集<\/button>\s*/g,"");

if(next===original||!next.includes(marker))fail("V4.1の置換に失敗しました。");
fs.copyFileSync(file,backup);
fs.writeFileSync(file,next,"utf8");
try{
  cp.execSync("npm run build",{stdio:"inherit",shell:true});
  console.log("");
  console.log("OK: 単価表V4.1を適用しました。");
  console.log("・固定単価は金額をその場で直接編集");
  console.log("・掛率は%をその場で直接編集");
  console.log("・各項目をその場で削除");
  console.log("・固定単価の単価コピーは維持");
  console.log("・業者情報全体の編集画面は開きません");
  console.log("BACKUP: "+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error("ERROR: build失敗。App.jsxを自動復旧しました。");
  process.exit(1);
}
