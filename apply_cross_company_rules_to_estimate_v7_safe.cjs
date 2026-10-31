const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-cross-company-rules-estimate-v7';
const mark='M-CROSS_CROSS_COMPANY_RULES_ESTIMATE_V7_SAFE';
function die(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))die('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: V7適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_CROSS_FINISH_STEP1_V4_SAFE'))die('クロス種別STEP1が見つかりません。');

const fnStart=s.indexOf('function buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings) {');
const crossStart=s.indexOf('  // 1. クロスを全部屋分、指定した部屋順で先に並べます。',fnStart);
const cfStart=s.indexOf('  // 2. クロスが終わった後に、CFを全部屋分並べます。',crossStart);
if(fnStart<0||crossStart<0||cfStart<0)die('buildEstimateRowsのクロス範囲を特定できません。変更していません。');

const oldCross=s.slice(crossStart,cfStart);
if(!oldCross.includes("record.type === '壁'"))die('壁クロス処理が見つかりません。');
if(!oldCross.includes('crossRows.push({'))die('crossRows生成処理が見つかりません。');

const newCross=`  // 1. クロスを全部屋分、指定した部屋順で先に並べます。\n  /* ${mark} */\n  orderedRooms.forEach(roomName => {\n    const definitions = [\n      {\n        kind: 'ceiling',\n        records: records.filter(record => record.room === roomName && record.type === '天井'),\n        amountForRecord: record => getRecordQuantity(record) * factor * Number(pricingSettings.crossRates['天井'] || 0),\n      },\n      {\n        kind: 'wall',\n        records: records.filter(record => record.room === roomName && record.type === '壁'),\n        amountForRecord: record => getRecordQuantity(record) * factor * Number(pricingSettings.crossRates['壁'] || 0),\n      },\n      {\n        kind: 'storage',\n        records: records.filter(record => record.room === roomName && (record.type === '収納天井' || record.type === '収納壁')),\n        amountForRecord: record => getRecordQuantity(record) * factor * Number(pricingSettings.crossRates[record.type] || 0),\n      },\n    ]\n\n    definitions.forEach(definition => {\n      const groups = new Map()\n      definition.records.forEach(record => {\n        const finish = definition.kind === 'wall' && record.crossFinish === 'color' ? 'color' : 'normal'\n        const surface = finish === 'color' ? String(record.surfaceName || '').trim() : ''\n        const recordMemo = String(record.memo || '').trim()\n        const key = [finish, surface, recordMemo].join('||')\n        if (!groups.has(key)) groups.set(key, [])\n        groups.get(key).push(record)\n      })\n\n      groups.forEach(groupRecords => {\n        const first = groupRecords[0] || {}\n        const finish = definition.kind === 'wall' && first.crossFinish === 'color' ? 'color' : 'normal'\n        const surface = finish === 'color' ? String(first.surfaceName || '').trim() : ''\n        const inputMemo = String(first.memo || '').trim()\n        const quantity = groupRecords.reduce((sum, record) => sum + getRecordQuantity(record), 0) * factor\n        if (quantity <= 0) return\n        const amount = groupRecords.reduce((sum, record) => sum + definition.amountForRecord(record), 0)\n\n        let parts\n        let outputMemo = inputMemo\n        if (definition.kind === 'wall') {\n          parts = finish === 'color'\n            ? [roomName, surface || '壁', 'カラークロス施工']\n            : [roomName, '壁', 'クロス部分張替']\n        } else if (definition.kind === 'storage') {\n          parts = [roomName, '収納', 'クロス貼替']\n          outputMemo = ['天井壁', inputMemo].filter(Boolean).join('・')\n        } else {\n          parts = [roomName, '天井', 'クロス貼替']\n        }\n\n        crossRows.push({\n          room: roomName,\n          parts,\n          memo: outputMemo,\n          category: 'cross',\n          quantity,\n          unit: '㎡',\n          rate: quantity > 0 ? amount / quantity : 0,\n          amount,\n        })\n      })\n    })\n  })\n\n`;

fs.copyFileSync(p,b);
try{
 s=s.slice(0,crossStart)+newCross+s.slice(cfStart);
 fs.writeFileSync(p,s,'utf8');
 console.log('見積生成へ社内クロス表記ルールを反映しました。自動ビルド確認を行います。');
 cp.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 見積画面/Excel用データへクロス種別を反映しました。');
 console.log('通常壁 -> 部屋 | 壁 | クロス部分張替');
 console.log('カラー -> 部屋 | 施工面 | カラークロス施工');
 console.log('既存データ -> 通常クロス扱い');
 console.log('BACKUP: '+b);
}catch(err){
 console.error('適用またはビルド失敗のため自動復旧します。');
 console.error(err.message||String(err));
 if(fs.existsSync(b))fs.copyFileSync(b,p);
 process.exit(1);
}
