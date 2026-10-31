const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'src', 'App.jsx')
const backup = path.join(process.cwd(), 'src', 'App.jsx.before-property-list-picker-v1')
const marker = 'M-CROSS_PROPERTY_LIST_PICKER_V1'

if (!fs.existsSync(target)) {
  console.error('ERROR: src/App.jsx が見つかりません。M-Crossフォルダで実行してください。')
  process.exit(1)
}

let source = fs.readFileSync(target, 'utf8')
if (source.includes(marker)) {
  console.log('SKIP: 物件一覧選択V1は適用済みです。')
  process.exit(0)
}

const stateAnchor = `  const [propertySearch, setPropertySearch] = useState('')
  const [selectedProperty, setSelectedProperty] = useState(null)`

const inputAnchor = `              </label>

              {propertySearch.trim() && !selectedProperty && (`

if (!source.includes(stateAnchor)) {
  console.error('ERROR: 物件検索stateが見つかりません。App.jsxは変更していません。')
  process.exit(1)
}
if (!source.includes(inputAnchor)) {
  console.error('ERROR: 物件検索入力欄の直後が見つかりません。App.jsxは変更していません。')
  process.exit(1)
}

fs.copyFileSync(target, backup)

source = source.replace(stateAnchor, `  const [propertySearch, setPropertySearch] = useState('')
  const [selectedProperty, setSelectedProperty] = useState(null)
  /* ${marker} */
  const [showPropertyListPicker, setShowPropertyListPicker] = useState(false)
  const [propertyListSearch, setPropertyListSearch] = useState('')`)

const picker = `              </label>

              {/* ${marker} */}
              <button
                className="secondaryButton propertyListOpenButton"
                type="button"
                disabled={!company}
                onClick={() => {
                  setPropertyListSearch('')
                  setShowPropertyListPicker(true)
                }}
              >
                📋 物件一覧から選ぶ
              </button>

              {showPropertyListPicker && (
                <div className="propertyListPickerBackdrop" role="presentation" onClick={() => setShowPropertyListPicker(false)}>
                  <section
                    className="propertyListPickerPanel"
                    role="dialog"
                    aria-modal="true"
                    aria-label="物件一覧から選ぶ"
                    onClick={event => event.stopPropagation()}
                  >
                    <div className="propertyListPickerHeader">
                      <div>
                        <strong>物件一覧から選ぶ</strong>
                        <small>{company}　{companyProperties.length}件</small>
                      </div>
                      <button type="button" onClick={() => setShowPropertyListPicker(false)} aria-label="閉じる">×</button>
                    </div>
                    <label className="propertyListPickerSearch">
                      <span>一覧を絞り込む</span>
                      <input
                        autoFocus
                        value={propertyListSearch}
                        onChange={event => setPropertyListSearch(event.target.value)}
                        placeholder="物件名・住所を入力"
                      />
                    </label>
                    <div className="propertyListPickerItems">
                      {companyProperties
                        .filter(item => {
                          const query = String(propertyListSearch || '').trim().toLocaleLowerCase('ja')
                          if (!query) return true
                          return [item.name, item.reading, item.address, item.alias, ...(Array.isArray(item.aliases) ? item.aliases : [])]
                            .filter(Boolean)
                            .some(value => String(value).toLocaleLowerCase('ja').includes(query))
                        })
                        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ja'))
                        .map((item, index) => (
                          <button
                            className="propertyListPickerItem"
                            key={item.id || [item.name, item.address, index].join('|')}
                            type="button"
                            onClick={() => {
                              setSelectedProperty(item)
                              setPropertySearch(item.name)
                              setSaveStatus('')
                              setShowPropertyListPicker(false)
                            }}
                          >
                            <strong>{item.name}</strong>
                            <small>{item.address || '住所未登録'}</small>
                          </button>
                        ))}
                      {companyProperties.filter(item => {
                        const query = String(propertyListSearch || '').trim().toLocaleLowerCase('ja')
                        if (!query) return true
                        return [item.name, item.reading, item.address, item.alias, ...(Array.isArray(item.aliases) ? item.aliases : [])]
                          .filter(Boolean)
                          .some(value => String(value).toLocaleLowerCase('ja').includes(query))
                      }).length === 0 && <p className="empty">該当する物件がありません</p>}
                    </div>
                    <style>{\`
                      .propertyListOpenButton{width:100%;margin-top:10px}
                      .propertyListPickerBackdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.52)}
                      .propertyListPickerPanel{width:min(680px,100%);max-height:min(82vh,760px);display:grid;grid-template-rows:auto auto minmax(0,1fr);gap:12px;padding:18px;border-radius:18px;background:var(--card-bg,#fff);color:inherit;box-shadow:0 24px 70px rgba(0,0,0,.30)}
                      .propertyListPickerHeader{display:flex;align-items:center;justify-content:space-between;gap:12px}
                      .propertyListPickerHeader strong{display:block;font-size:1.15rem}.propertyListPickerHeader small{display:block;margin-top:3px;opacity:.7}
                      .propertyListPickerHeader button{width:42px;height:42px;border:0;border-radius:50%;font-size:24px;background:rgba(127,127,127,.16);color:inherit}
                      .propertyListPickerSearch span{display:block;margin-bottom:6px;font-weight:700}.propertyListPickerSearch input{width:100%;box-sizing:border-box}
                      .propertyListPickerItems{min-height:0;overflow:auto;display:grid;gap:8px;padding-right:3px}
                      .propertyListPickerItem{display:block;width:100%;text-align:left;padding:13px 14px;border:1px solid rgba(90,120,170,.24);border-radius:12px;background:rgba(255,255,255,.78);color:inherit}
                      .propertyListPickerItem strong,.propertyListPickerItem small{display:block}.propertyListPickerItem small{margin-top:4px;opacity:.68}
                      .propertyListPickerItem:focus-visible{outline:3px solid #2672ec;outline-offset:2px}
                      .theme-dark .propertyListPickerPanel,.theme-cyber .propertyListPickerPanel,.theme-luxury .propertyListPickerPanel,.theme-retro .propertyListPickerPanel,.theme-galaxy .propertyListPickerPanel{background:#101827}
                      .theme-dark .propertyListPickerItem,.theme-cyber .propertyListPickerItem,.theme-luxury .propertyListPickerItem,.theme-retro .propertyListPickerItem,.theme-galaxy .propertyListPickerItem{background:rgba(255,255,255,.07)}
                      @media(max-width:620px){.propertyListPickerBackdrop{padding:0;place-items:stretch}.propertyListPickerPanel{width:100%;max-height:none;height:100%;border-radius:0;padding:16px;box-sizing:border-box}}
                    \`}</style>
                  </section>
                </div>
              )}

              {propertySearch.trim() && !selectedProperty && (`

source = source.replace(inputAnchor, picker)


fs.writeFileSync(target, source, 'utf8')
console.log('OK: 物件検索に「物件一覧から選ぶ」を追加しました。')
console.log('  - 選択中の管理会社に属する物件を一覧表示')
console.log('  - 物件名・読み・住所・別名で絞り込み')
console.log('  - PCは中央ダイアログ、スマホは全画面')
console.log('  - 既存の文字入力検索はそのまま維持')
console.log('BACKUP: ' + backup)
console.log('NEXT: npm run build')
