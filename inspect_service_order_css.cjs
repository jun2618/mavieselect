const fs=require("fs");
const s=fs.readFileSync("./src/App.jsx","utf8");
const p=s.indexOf(".orderExcelSheet,.contractorPriceBookPane");
if(p<0)throw new Error("対象CSSが見つかりません");
console.log(s.slice(p,p+1800));
