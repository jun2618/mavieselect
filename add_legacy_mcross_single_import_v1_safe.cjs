const fs=require('fs');
const path=require('path');
const root=process.cwd();
const f=path.join(root,'src','App.jsx');
const backup=f+'.legacy-single-import-v1-backup';
const marker='M-CROSS_LEGACY_SINGLE_IMPORT_V1_SAFE';
if(!fs.existsSync(f)){console.error('ERROR: src/App.jsx が見つかりません');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
if(s.includes(marker)){console.log('ALREADY APPLIED');process.exit(0)}
const start=s.indexOf('  async function importMCrossData(event) {');
const end=s.indexOf('\n  function loadSavedEntry(entry) {',start);
if(start<0||end<0){console.error('ERROR: importMCrossData を特定できません。変更していません。');process.exit(1)}
const original=s.slice(start,end);
const replacement=`  /* ${marker} */
  async function importMCrossData(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!/\\.(mcross|json|txt)$/i.test(file.name)) { window.alert('M-Cross用の .mcross、.json、または .txt ファイルを選択してください。'); return }
    try {
      const packageData = JSON.parse(await file.text())

      let imported
      let legacyImport = false
      if (packageData?.schema === 'm-cross-legacy-import:v1' && packageData?.entry && typeof packageData.entry === 'object') {
        legacyImport = true
        imported = normalizeImportedEntry({
          ...packageData.entry,
          importSource: '旧工事カード',
          legacyImportFileName: packageData?.source?.fileName || file.name,
          legacyImportedAt: new Date().toISOString(),
        })
      } else {
        if (packageData?.fileType !== mCrossFileType || packageData?.version !== mCrossFileVersion) throw new Error('M-Cross用ファイルではないか、対応していないバージョンです。')
        imported = normalizeImportedEntry(packageData.data)
      }

      if (!imported.company || !imported.propertyName || !String(imported.unit || '').trim()) {
        throw new Error('管理会社・物件名・号室を読み取れません。')
      }
      if (legacyImport && !Array.isArray(imported.additionalWorks)) {
        throw new Error('旧工事カードの明細を読み取れません。')
      }

      const storageKey = getSaveKey(imported.company, { name: imported.propertyName, address: imported.address }, imported.unit, imported.workName || '原状回復工事')
      const exists = localStorage.getItem(storageKey) !== null
      if (exists) {
        const label = imported.propertyName + ' ' + imported.unit + '号室 / ' + (imported.workName || '原状回復工事')
        if (legacyImport) {
          window.alert('「' + label + '」はすでに保存されています。\\n旧工事カード取込では既存案件を上書きしません。')
          return
        }
        if (!window.confirm('「' + imported.propertyName + ' ' + imported.unit + '号室」はすでに保存されています。\\n\\n上書きして読み込みますか？')) return
      }

      localStorage.setItem(storageKey, JSON.stringify(imported))
      setSavedEntries(readSavedEntries())
      setSelectedSavedKeys([])
      if (legacyImport) {
        const count = Array.isArray(imported.additionalWorks) ? imported.additionalWorks.length : 0
        window.alert('旧工事カードから「' + imported.propertyName + ' ' + imported.unit + '号室 / ' + (imported.workName || '原状回復工事') + '」を1件取り込みました。\\n明細: ' + count + '件')
      } else {
        window.alert('「' + imported.propertyName + ' ' + imported.unit + '号室」を読み込みました。')
      }
    } catch (error) {
      console.error(error)
      window.alert(error instanceof Error ? error.message : 'M-Crossデータを読み込めませんでした。')
    }
  }
`;
fs.copyFileSync(f,backup);
s=s.slice(0,start)+replacement+s.slice(end);
fs.writeFileSync(f,s,'utf8');
console.log('OK: 旧工事カードJSONの1件インポートに対応しました');
console.log('BACKUP: '+backup);
