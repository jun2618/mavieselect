const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-step4-backup'

let s = fs.readFileSync(file, 'utf8')

if (s.includes('/* M-CROSS_CF_MATERIAL_UI_V1 */')) {
  console.log('STEP4はすでに適用済みです')
  process.exit(0)
}

if (!s.includes('const [cfMaterialGroups, setCfMaterialGroups]')) {
  console.error('cfMaterialGroupsが見つかりません。変更しませんでした。')
  process.exit(1)
}

let changes = 0

function replaceOne(search, replacement, label) {
  const count = s.split(search).length - 1

  if (count !== 1) {
    console.error(`${label}の対象が${count}件でした。変更しませんでした。`)
    process.exit(1)
  }

  s = s.replace(search, replacement)
  changes++
  console.log('追加:', label)
}

/* ---------------------------------------------------------
   1. LengthMeasurementPageの引数へ材料グループを追加
--------------------------------------------------------- */

replaceOne(
`  onRoomRecordsChanged,
  onRegistered,
}) {`,
`  onRoomRecordsChanged,
  onRegistered,
  materialGroups = [],
  setMaterialGroups,
  onMaterialGroupsChanged,
}) {`,
  'LengthMeasurementPageの引数'
)

/* ---------------------------------------------------------
   2. CF材料まとめ用の画面状態と処理
--------------------------------------------------------- */

replaceOne(
`  const [activeInput, setActiveInput] = useState('')
  const memoInputRef = useRef(null)`,
`  const [activeInput, setActiveInput] = useState('')

  /* M-CROSS_CF_MATERIAL_UI_V1 */
  const [selectedMaterialRecordIds, setSelectedMaterialRecordIds] = useState([])
  const [materialOrderLength, setMaterialOrderLength] = useState('')
  const [materialProductCode, setMaterialProductCode] = useState('')

  const groupedMaterialRecordIds = new Set(
    materialGroups.flatMap(group =>
      Array.isArray(group.recordIds) ? group.recordIds : []
    )
  )

  const availableMaterialRecords = records.filter(
    record => !groupedMaterialRecordIds.has(record.id)
  )

  const selectedMaterialRecords = records.filter(
    record => selectedMaterialRecordIds.includes(record.id)
  )

  const selectedMaterialLength = selectedMaterialRecords.reduce(
    (sum, record) => sum + getLengthQuantity(record),
    0
  )

  function toggleMaterialRecord(recordId) {
    setSelectedMaterialRecordIds(previous =>
      previous.includes(recordId)
        ? previous.filter(id => id !== recordId)
        : [...previous, recordId]
    )
  }

  function createMaterialGroup() {
    if (!setMaterialGroups || selectedMaterialRecordIds.length === 0) return

    const numericOrderLength = Number(
      String(materialOrderLength).replace(/[。．]/g, '.')
    )

    const nextOrderLength =
      Number.isFinite(numericOrderLength) && numericOrderLength > 0
        ? numericOrderLength
        : selectedMaterialLength

    setMaterialGroups(previous => [
      ...previous,
      {
        id: createRecordId(),
        recordIds: [...selectedMaterialRecordIds],
        orderLength: nextOrderLength,
        productCode: materialProductCode.trim(),
      },
    ])

    setSelectedMaterialRecordIds([])
    setMaterialOrderLength('')
    setMaterialProductCode('')
    onMaterialGroupsChanged?.()
  }

  function updateMaterialGroup(groupId, patch) {
    if (!setMaterialGroups) return

    setMaterialGroups(previous =>
      previous.map(group =>
        group.id === groupId ? { ...group, ...patch } : group
      )
    )

    onMaterialGroupsChanged?.()
  }

  function deleteMaterialGroup(groupId) {
    if (!setMaterialGroups) return

    setMaterialGroups(previous =>
      previous.filter(group => group.id !== groupId)
    )

    onMaterialGroupsChanged?.()
  }

  const memoInputRef = useRef(null)`,
  'CF材料まとめ処理'
)

/* ---------------------------------------------------------
   3. 全室合計画面へ材料まとめUIを追加
--------------------------------------------------------- */

replaceOne(
`          <div className="summary">
            <div className="summaryLine summaryGrand"><span>全室{title}合計</span><strong>{formatQuantity(total)}{unit}</strong></div>
          </div>
        </section>`,
`          <div className="summary">
            <div className="summaryLine summaryGrand"><span>全室{title}合計</span><strong>{formatQuantity(total)}{unit}</strong></div>
          </div>

          {title === 'CF' && setMaterialGroups && (
            <div className="cfMaterialPanel">
              <h2>CF材料まとめ</h2>
              <p className="subtitle">
                施工面積は部屋ごとのまま残し、材料注文用の長さだけまとめます。
              </p>

              <div className="cfMaterialChoices">
                {availableMaterialRecords.length === 0 ? (
                  <p className="empty">
                    まとめられるCF登録はありません
                  </p>
                ) : availableMaterialRecords.map(record => (
                  <label className="cfMaterialChoice" key={record.id}>
                    <input
                      type="checkbox"
                      checked={selectedMaterialRecordIds.includes(record.id)}
                      onChange={() => toggleMaterialRecord(record.id)}
                    />

                    <span>
                      <strong>{record.room}</strong>
                      <small>
                        {Number(record.length || 0).toFixed(2)}m × {record.count}本
                        {' / 合計 '}
                        {formatQuantity(getLengthQuantity(record))}m
                      </small>

                      {record.memo && (
                        <small>メモ：{record.memo}</small>
                      )}
                    </span>
                  </label>
                ))}
              </div>

              {selectedMaterialRecordIds.length > 0 && (
                <div className="cfMaterialCreate">
                  <div className="summaryLine">
                    <span>選択中の計算長</span>
                    <strong>
                      {formatQuantity(selectedMaterialLength)}m
                    </strong>
                  </div>

                  <label>
                    <span>注文長（m）</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={materialOrderLength}
                      onChange={event =>
                        setMaterialOrderLength(event.target.value)
                      }
                      placeholder={formatQuantity(selectedMaterialLength)}
                    />
                  </label>

                  <label>
                    <span>品番・商品名</span>
                    <input
                      type="text"
                      value={materialProductCode}
                      onChange={event =>
                        setMaterialProductCode(event.target.value)
                      }
                      placeholder="例：HM-12001"
                    />
                  </label>

                  <button
                    className="add"
                    type="button"
                    onClick={createMaterialGroup}
                  >
                    選択したCFをまとめる
                  </button>
                </div>
              )}

              {materialGroups.length > 0 && (
                <div className="cfMaterialGroupList">
                  <h3>材料発注グループ</h3>

                  {materialGroups.map((group, index) => {
                    const groupRecords = records.filter(record =>
                      Array.isArray(group.recordIds)
                        && group.recordIds.includes(record.id)
                    )

                    const calculatedLength = groupRecords.reduce(
                      (sum, record) => sum + getLengthQuantity(record),
                      0
                    )

                    const roomNames = [
                      ...new Set(groupRecords.map(record => record.room)),
                    ]

                    return (
                      <div className="cfMaterialGroup" key={group.id}>
                        <div className="cfMaterialGroupHeader">
                          <strong>CF材料 {index + 1}</strong>

                          <button
                            type="button"
                            onClick={() => deleteMaterialGroup(group.id)}
                            aria-label={'CF材料' + (index + 1) + 'を削除'}
                          >
                            ×
                          </button>
                        </div>

                        <p>
                          {roomNames.join(' ＋ ') || '対象データなし'}
                        </p>

                        <div className="summaryLine">
                          <span>計算長</span>
                          <strong>
                            {formatQuantity(calculatedLength)}m
                          </strong>
                        </div>

                        <label>
                          <span>注文長（m）</span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={group.orderLength ?? ''}
                            onChange={event =>
                              updateMaterialGroup(group.id, {
                                orderLength: event.target.value,
                              })
                            }
                          />
                        </label>

                        <label>
                          <span>品番・商品名</span>
                          <input
                            type="text"
                            value={group.productCode || ''}
                            onChange={event =>
                              updateMaterialGroup(group.id, {
                                productCode: event.target.value,
                              })
                            }
                            placeholder="例：HM-12001"
                          />
                        </label>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </section>`,
  'CF全室合計画面'
)

/* ---------------------------------------------------------
   4. CF画面へcfMaterialGroupsを渡す
--------------------------------------------------------- */

replaceOne(
`                records={cfRecords}
                setRecords={setCfRecords}
                pageIndex={cfPageIndex}`,
`                records={cfRecords}
                setRecords={setCfRecords}
                materialGroups={cfMaterialGroups}
                setMaterialGroups={setCfMaterialGroups}
                onMaterialGroupsChanged={markUnsaved}
                pageIndex={cfPageIndex}`,
  'CF画面へのデータ受け渡し'
)

/* ---------------------------------------------------------
   5. 最低限のスタイル
--------------------------------------------------------- */

const styleMarker = `/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */`

if (!s.includes(styleMarker)) {
  console.error('スタイル追加位置が見つかりません。変更しませんでした。')
  process.exit(1)
}

s = s.replace(
  styleMarker,
`/* M-CROSS_CF_MATERIAL_UI_STYLE_V1 */
.cfMaterialPanel {
  display: grid;
  gap: 14px;
  margin-top: 20px;
  padding: 16px;
  border: 1px solid #cddbf4;
  border-radius: 18px;
  background: rgba(244, 248, 255, .92);
}

.cfMaterialPanel h2,
.cfMaterialPanel h3,
.cfMaterialPanel p {
  margin-top: 0;
}

.cfMaterialChoices,
.cfMaterialGroupList {
  display: grid;
  gap: 10px;
}

.cfMaterialChoice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #d8e2f4;
  border-radius: 14px;
  background: #ffffff;
}

.cfMaterialChoice input {
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
}

.cfMaterialChoice span {
  display: grid;
  gap: 4px;
}

.cfMaterialChoice small {
  display: block;
  color: #6b7280;
}

.cfMaterialCreate,
.cfMaterialGroup {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid #b9cdee;
  border-radius: 16px;
  background: #ffffff;
}

.cfMaterialGroupHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cfMaterialGroupHeader button {
  width: 36px;
  height: 36px;
  border: 1px solid #e7a9ad;
  border-radius: 50%;
  color: #b33d47;
  background: #fff2f3;
  font-size: 20px;
  font-weight: 900;
}

.theme-dark .cfMaterialPanel,
.theme-cyber .cfMaterialPanel,
.theme-luxury .cfMaterialPanel,
.theme-retro .cfMaterialPanel,
.theme-galaxy .cfMaterialPanel {
  color: inherit;
  border-color: rgba(0, 220, 240, .55);
  background: rgba(5, 12, 24, .86);
}

.theme-dark .cfMaterialChoice,
.theme-dark .cfMaterialCreate,
.theme-dark .cfMaterialGroup,
.theme-cyber .cfMaterialChoice,
.theme-cyber .cfMaterialCreate,
.theme-cyber .cfMaterialGroup,
.theme-luxury .cfMaterialChoice,
.theme-luxury .cfMaterialCreate,
.theme-luxury .cfMaterialGroup,
.theme-retro .cfMaterialChoice,
.theme-retro .cfMaterialCreate,
.theme-retro .cfMaterialGroup,
.theme-galaxy .cfMaterialChoice,
.theme-galaxy .cfMaterialCreate,
.theme-galaxy .cfMaterialGroup {
  color: inherit;
  border-color: rgba(0, 220, 240, .45);
  background: rgba(5, 12, 24, .9);
}

/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */`
)

changes++
console.log('追加: CF材料まとめスタイル')

/* ---------------------------------------------------------
   保存
--------------------------------------------------------- */

fs.copyFileSync(file, backup)
fs.writeFileSync(file, s, 'utf8')

console.log('')
console.log('STEP4 OK')
console.log('CF材料まとめ画面を追加しました')
console.log('変更箇所:', changes)
console.log('バックアップ:', backup)