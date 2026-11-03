const fs=require("fs");
const p="./src/App.jsx";
let s=fs.readFileSync(p,"utf8");
const mark="M-CROSS_CASE_EXCEL_LINK_V1_SAFE";
if(s.includes(mark)){console.log("OK: Excelリンク機能は追加済み");process.exit(0)}
const fnAnchor="  function deleteSavedEntry(entry) {";
const buttonAnchor='<button className="actionButton actionDelete savedExplorerDeleteButton" type="button" onClick={() => deleteSavedEntry(entry)}>削除</button>';
if(!s.includes(fnAnchor)||!s.includes(buttonAnchor)){console.error("ERROR: 挿入位置が見つかりません。変更していません");process.exit(1)}
const fn=`  /* ${mark} */\n  function registerSavedEntryExcel(entry){\n    if(!entry?.storageKey)return\n    const current=String(entry.excelUrl||"").trim()\n    const url=window.prompt("共有OneDriveのExcelリンクを貼り付けてください。",current)\n    if(url===null)return\n    const value=String(url).trim()\n    if(value&&!/^https?:\\/\\//i.test(value)){window.alert("http または https で始まる共有リンクを貼り付けてください。");return}\n    try{\n      const next={...entry,excelUrl:value,updatedAt:new Date().toISOString()}\n      localStorage.setItem(entry.storageKey,JSON.stringify(next))\n      setSavedEntries(readSavedEntries())\n      window.alert(value?"Excelリンクを登録しました。OneDriveバックアップにも含まれます。":"Excelリンクを解除しました。")\n    }catch(error){console.error(error);window.alert("Excelリンクを保存できませんでした。")}\n  }\n\n`;
const buttons='<button className="actionButton actionOverwrite savedExplorerExcelRegister" type="button" onClick={() => registerSavedEntryExcel(entry)}>{entry.excelUrl?"🔗 Excel変更":"🔗 Excel登録"}</button>{entry.excelUrl&&<button className="actionButton actionOverwrite savedExplorerExcelOpen" type="button" onClick={() => window.open(String(entry.excelUrl)," _blank","noopener,noreferrer")}>📗 Excelを開く</button>}'+buttonAnchor;
fs.copyFileSync(p,p+".backup_before_case_excel_link_"+Date.now());
s=s.replace(fnAnchor,fn+fnAnchor);
s=s.replace(buttonAnchor,buttons);
fs.writeFileSync(p,s,"utf8");
console.log("OK: 案件エクスプローラーへExcel登録・Excelを開くを追加しました");
