const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-property-list-picker-v2')
const marker = 'M-CROSS_PROPERTY_LIST_PICKER_V2'

if (!fs.existsSync(target)) {
  console.error('ERROR: src/App.jsx が見つかりません。')
  process.exit(1)
}
let source = fs.readFileSync(target, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 物件一覧選択V2は適用済みです。')
  process.exit(0)
}

const stateLine = "  const [selectedProperty, setSelectedProperty] = useState(null)"
const resultsAnchor = "              {propertySearch.trim() && !selectedProperty && ("
if (!source.includes(stateLine)) {
  console.error('ERROR: selectedProperty stateが見つかりません。変更していません。')
  process.exit(1)
}
if (!source.includes(resultsAnchor)) {
  console.error('ERROR: 物件検索結果の表示位置が見つかりません。変更していません。')
  process.exit(1)
}

fs.copyFileSync(target, backup)

source = source.replace(stateLine, stateLine + `\n  /* ${marker} */\n  const [showPropertyListPicker, setShowPropertyListPicker] = useState(false)\n  const [propertyListSearch, setPropertyListSearch] = useState('')`)

const picker = `              {/* ${marker} */}
              <button
                className="secondaryButton propertyListOpenButton"
                type="button"
                disabled={!company}
                onClick={() => { setPropertyListSearch(''); setShowPropertyListPicker(true) }}
              >
                📋 物件一覧から選ぶ
              </button>

              {showPropertyListPicker && (
                <div className="propertyListPickerBackdrop" onClick={() => setShowPropertyListPicker(false)}>
                  <section className="propertyListPickerPanel" role="dialog" aria-modal="true" aria-label="物件一覧から選ぶ" onClick={event => event.stopPropagation()}>
                    <div className="propertyListPickerHeader">
                      <div><strong>物件一覧から選ぶ</strong><small>{company}　{companyProperties.length}件</small></div>
                      <button type="button" onClick={() => setShowPropertyListPicker(false)} aria-label="閉じる">×</button>
                    </div>
                    <label className="propertyListPickerSearch">
                      <span>一覧を絞り込む</span>
                      <input autoFocus value={propertyListSearch} onChange={event => setPropertyListSearch(event.target.value)} placeholder="物件名・住所を入力" />
                    </label>
                    <div className="propertyListPickerItems">
                      {companyProperties
                        .filter(item => {
                          const query = String(propertyListSearch || '').trim().toLocaleLowerCase('ja')
                          if (!query) return true
                          return [item.name, item.reading, item.address, item.alias, ...(Array.isArray(item.aliases) ? item.aliases : [])]
                            .filter(Boolean).some(value => String(value).toLocaleLowerCase('ja').includes(query))
                        })
                        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ja'))
                        .map((item, index) => (
                          <button className="propertyListPickerItem" key={item.id || [item.name, item.address, index].join('|')} type="button" onClick={() => {
                            setSelectedProperty(item)
                            setPropertySearch(item.name)
                            setSaveStatus('')
                            setShowPropertyListPicker(false)
                          }}>
                            <strong>{item.name}</strong>
                            <small>{item.address || '住所未登録'}</small>
                          </button>
                        ))}
                    </div>
                    <style>{\`
                      .propertyListOpenButton{width:100%;margin-top:10px}
                      .propertyListPickerBackdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.52)}
                      .propertyListPickerPanel{width:min(680px,100%);max-height:min(82vh,760px);display:grid;grid-template-rows:auto auto minmax(0,1fr);gap:12px;padding:18px;border-radius:18px;background:#fff;color:#182230;box-shadow:0 24px 70px rgba(0,0,0,.3)}
                      .propertyListPickerHeader{display:flex;align-items:center;justify-content:space-between;gap:12px}.propertyListPickerHeader strong,.propertyListPickerHeader small{display:block}.propertyListPickerHeader small{margin-top:4px;opacity:.68}.propertyListPickerHeader button{width:42px;height:42px;border:0;border-radius:50%;font-size:24px}
                      .propertyListPickerSearch span{display:block;margin-bottom:6px;font-weight:700}.propertyListPickerSearch input{width:100%;box-sizing:border-box}
                      .propertyListPickerItems{min-height:0;overflow:auto;display:grid;gap:8px;padding-right:3px}.propertyListPickerItem{display:block;width:100%;text-align:left;padding:13px 14px;border:1px solid #d8e0eb;border-radius:12px;background:#fff;color:#182230}.propertyListPickerItem strong,.propertyListPickerItem small{display:block}.propertyListPickerItem small{margin-top:4px;opacity:.68}
                      @media(prefers-color-scheme:dark){.propertyListPickerPanel{background:#101827;color:#f4f7fb}.propertyListPickerItem{background:#172235;color:#f4f7fb;border-color:#34455f}}
                      @media(max-width:620px){.propertyListPickerBackdrop{padding:0;place-items:stretch}.propertyListPickerPanel{width:100%;height:100%;max-height:none;border-radius:0;box-sizing:border-box;padding:16px}}
                    \`}</style>
                  </section>
                </div>
              )}

`
source = source.replace(resultsAnchor, picker + resultsAnchor)
fs.writeFileSync(target, source, 'utf8')
console.log('OK: 物件一覧選択V2を適用しました。')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
