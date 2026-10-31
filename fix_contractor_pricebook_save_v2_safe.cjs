const fs = require('fs');
const cp = require('child_process');

const file = './src/App.jsx';
const marker = 'M-CROSS_CONTRACTOR_PRICEBOOK_SAVE_V2_SAFE';
const backup = file + '.pricebook-save-v2-backup-' + Date.now();

function fail(message) {
  console.error('ERROR: ' + message);
  console.error('App.jsx は変更していません。');
  process.exit(1);
}

if (!fs.existsSync(file)) fail('src/App.jsx が見つかりません。');
const original = fs.readFileSync(file, 'utf8');
if (original.includes(marker)) fail('保存修正V2はすでに適用されています。');

const oldLine = "                          const values={name,trade:contractorForm.trade||'その他',contact:contractorForm.contact.trim(),phone:contractorForm.phone.trim(),memo:contractorForm.memo.trim(),postalCode:String(contractorForm.postalCode||'').trim(),address:String(contractorForm.address||'').trim(),rates:{cross:contractorForm.rates?.cross??'',cf:contractorForm.rates?.cf??'',soft:contractorForm.rates?.soft??'',floorTrim:contractorForm.rates?.floorTrim??'',wallBase:contractorForm.rates?.wallBase??'',floorBase:contractorForm.rates?.floorBase??'',priceBook:(Array.isArray(contractorForm.priceBook)?contractorForm.priceBook:[]).map(row=>({...row,name:String(row.name||'').trim(),unit:String(row.unit||'').trim(),note:String(row.note||'').trim(),orderMode:contractorForm.orderMode||'service'})).filter(row=>row.name)}}";

const newLine = "                          /* " + marker + " */\n                          const values={name,trade:contractorForm.trade||'その他',contact:contractorForm.contact.trim(),phone:contractorForm.phone.trim(),memo:contractorForm.memo.trim(),postalCode:String(contractorForm.postalCode||'').trim(),address:String(contractorForm.address||'').trim(),rates:{cross:contractorForm.rates?.cross??'',cf:contractorForm.rates?.cf??'',soft:contractorForm.rates?.soft??'',floorTrim:contractorForm.rates?.floorTrim??'',wallBase:contractorForm.rates?.wallBase??'',floorBase:contractorForm.rates?.floorBase??''},priceBook:(Array.isArray(contractorForm.priceBook)?contractorForm.priceBook:[]).map(row=>({...row,name:String(row.name||'').trim(),unit:String(row.unit||'').trim(),note:String(row.note||'').trim()})).filter(row=>row.name),orderMode:contractorForm.orderMode||'service'}";

const count = original.split(oldLine).length - 1;
if (count !== 1) fail('保存処理の対象行を一意に特定できません。検出数: ' + count);

const next = original.replace(oldLine, newLine);
if (next === original || !next.includes(marker)) fail('保存修正の置換に失敗しました。');

fs.copyFileSync(file, backup);
fs.writeFileSync(file, next, 'utf8');

try {
  cp.execSync('npm run build', { stdio: 'inherit', shell: true });
  console.log('');
  console.log('OK: 業者単価表の保存修正V2を適用しました。');
  console.log('・priceBookをratesの外側へ移動');
  console.log('・orderModeを業者データ直下へ保存');
  console.log('・清掃費やエアコン洗浄が再編集時にも残ります');
  console.log('BACKUP: ' + backup);
} catch (error) {
  fs.copyFileSync(backup, file);
  console.error('');
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
