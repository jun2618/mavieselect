const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-update-saved-version-on-edit-v1';
const marker='M-CROSS_UPDATE_SAVED_VERSION_ON_EDIT_V1_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');let s=fs.readFileSync(p,'utf8');
if(s.includes(marker)){console.log('SKIP: 保存版上書きV1は適用済みです。');process.exit(0)}
const anchor="                      setSaveStatus('見積明細を変更しました')";
if((s.split(anchor).length-1)!==1)fail('通常見積の保存完了位置を一意に特定できません。');
fs.copyFileSync(p,b);
try{
const patch=`                      /* ${marker} */
                      if (openedEstimateVersion) {
                        const savedVersionNumber = Number(openedEstimateVersion)
                        const updatedRows = allEstimateRows.map(row => {
                          if (estimateEditKey(row) !== form.key) return row
                          const numericAmount = amount === '' ? Number(quantity || 0) * Number(rate || 0) : Number(amount || 0)
                          return { ...row, parts: cleanParts, label: cleanParts.filter(Boolean).join(' '), memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), rate, amount: numericAmount }
                        }).filter(row => !estimateEdits[estimateEditKey(row)]?.excluded)
                        const updatedAdditionalTotal = additionalWorks.reduce((sum, item) => sum + (Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0)
                        const updatedTotal = updatedRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) + updatedAdditionalTotal
                        setEstimateVersions(previous => {
                          const next = previous.map(version => Number(version.version) === savedVersionNumber ? {
                            ...version,
                            rows: JSON.parse(JSON.stringify(updatedRows)),
                            additionalWorks: JSON.parse(JSON.stringify(additionalWorks)),
                            totalAmount: updatedTotal,
                            updatedAt: new Date().toISOString(),
                          } : version)
                          try { localStorage.setItem(estimateVersionStorageKey, JSON.stringify(next)) } catch {}
                          return next
                        })
                        setOpenedEstimateRows(updatedRows)
                      }
${anchor}`;
s=s.replace(anchor,patch);
fs.writeFileSync(p,s,'utf8');
console.log('変更を適用しました。自動ビルド確認を行います。');cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
console.log('OK: 保存済み②などを開いて編集保存した時、その版のrows・金額・更新日時も上書きするV1を適用しました。');console.log('BACKUP: '+b);
}catch(e){console.error('失敗したため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
