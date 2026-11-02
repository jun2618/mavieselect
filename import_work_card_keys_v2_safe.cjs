const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appPath = path.join(root, 'src', 'App.jsx');
const jsonPath = path.join(root, 'public', '工事カード鍵情報.json');
const backupPath = appPath + '.work-card-key-import-v2-backup';
const marker = 'M-CROSS_WORK_CARD_KEY_IMPORT_V2_SAFE';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。crossmeasureフォルダーで実行してください。');
  process.exit(1);
}
if (!fs.existsSync(jsonPath)) {
  console.error('ERROR: public/工事カード鍵情報.json が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(marker)) {
  console.log('ALREADY APPLIED');
  process.exit(0);
}

const anchorPattern = /  const mergedPropertyMaster = useMemo\(\r?\n\s*\(\) => getMergedPropertyMaster\(propertyMasterState\.master\),\r?\n\s*\[propertyMasterState\.master\]\r?\n\s*\)/;
const match = source.match(anchorPattern);
if (!match) {
  console.error('ERROR: mergedPropertyMaster の挿入位置が見つかりません。変更していません。');
  process.exit(1);
}

const block = `

  /* ${marker} */
  useEffect(() => {
    const importFlag = 'm-cross:work-card-key-import:v2'
    if (localStorage.getItem(importFlag) === 'done') return undefined
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch('/工事カード鍵情報.json', { cache: 'no-store' })
        if (!response.ok) throw new Error('鍵情報JSON読込失敗 HTTP ' + response.status)
        const payload = await response.json()
        if (cancelled) return

        const normalize = value => String(value || '')
          .normalize('NFKC')
          .toLocaleLowerCase('ja')
          .replace(/[\\s　・･,，.。()（）\\[\\]［］_ー-]+/g, '')

        const sourceMap = new Map()
        ;(Array.isArray(payload.rows) ? payload.rows : []).forEach(row => {
          const companyKey = normalize(row.company)
          const propertyKey = normalize(row.propertyName)
          if (!companyKey || !propertyKey) return
          const key = companyKey + '|' + propertyKey
          const current = sourceMap.get(key) || {}
          sourceMap.set(key, {
            autoLock: current.autoLock || String(row.autoLock || '').trim(),
            keyBox: current.keyBox || String(row.keyBox || '').trim(),
            joiner: current.joiner || String(row.joiner || '').trim(),
            myLock: current.myLock || String(row.myLock || '').trim(),
            entranceOpen: current.entranceOpen || String(row.entranceOpen || '').trim(),
          })
        })

        const master = propertyMasterState.master
        const nextOverrides = { ...(master.propertyOverrides || {}) }
        const nextAdded = (master.addedProperties || []).map(item => ({ ...item }))
        const matchedSourceKeys = new Set()
        let updated = 0

        mergedPropertyMaster.properties.forEach(property => {
          const sourceKey = normalize(property.company) + '|' + normalize(property.name)
          const card = sourceMap.get(sourceKey)
          if (!card) return
          matchedSourceKeys.add(sourceKey)

          const access = {
            autoLock: String(property.autoLock || card.autoLock || ''),
            keyBox: String(property.keyBox || property.accessNote || card.keyBox || ''),
            joiner: String(property.joiner || card.joiner || ''),
            myLock: String(property.myLock || card.myLock || ''),
            entranceOpen: String(property.entranceOpen || card.entranceOpen || ''),
          }
          const changed = ['autoLock', 'keyBox', 'joiner', 'myLock', 'entranceOpen']
            .some(key => String(property[key] || '') !== access[key])
          if (!changed) return

          updated += 1
          if (String(property.id || '').startsWith('base-property:')) {
            nextOverrides[property.id] = { ...(nextOverrides[property.id] || {}), ...access }
          } else {
            const index = nextAdded.findIndex(item => item.id === property.id)
            if (index >= 0) nextAdded[index] = { ...nextAdded[index], ...access }
          }
        })

        const nextMaster = {
          ...master,
          propertyOverrides: nextOverrides,
          addedProperties: nextAdded,
        }
        const report = {
          updated,
          matched: matchedSourceKeys.size,
          unmatched: sourceMap.size - matchedSourceKeys.size,
          importedAt: new Date().toISOString(),
        }

        localStorage.setItem('m-cross:property-master:v1:before-work-card-key-import-v2', JSON.stringify(master))
        localStorage.setItem(propertyMasterKey, JSON.stringify(nextMaster))
        localStorage.setItem(importFlag, 'done')
        localStorage.setItem(importFlag + ':report', JSON.stringify(report))
        setPropertyMasterState({ master: nextMaster, error: '' })
        setMasterStatus('工事カードから鍵情報を ' + updated + ' 件取り込みました。')
        console.log('WORK CARD KEY IMPORT V2', report)
      } catch (error) {
        console.error('工事カード鍵情報取込エラー', error)
        setMasterStatus('工事カードの鍵情報を取り込めませんでした。')
      }
    })()
    return () => { cancelled = true }
  }, [])`;

fs.copyFileSync(appPath, backupPath);
source = source.replace(anchorPattern, match[0] + block);
fs.writeFileSync(appPath, source, 'utf8');
console.log('OK: 工事カード鍵情報の一括取込V2を追加しました。');
console.log('BACKUP:', backupPath);
