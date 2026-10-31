const fs = require('fs')

const file = './src/App.jsx'
const backup = './src/App.jsx.cf-step4c2-backup'

let s = fs.readFileSync(file, 'utf8')

const marker = '/* M-CROSS_CF_MATERIAL_STEP4C2 */'

if (s.includes(marker)) {
  console.log('STEP4-C2はすでに適用済みです')
  process.exit(0)
}

if (!s.includes('/* M-CROSS_CF_MATERIAL_STEP4C1 */')) {
  console.error('STEP4-C1が見つかりません。変更しませんでした。')
  process.exit(1)
}

const componentStart = s.indexOf('function LengthMeasurementPage({')
const componentEnd = s.indexOf('\nfunction FloorTrimSection(', componentStart)

if (componentStart === -1 || componentEnd === -1) {
  console.error(
    'LengthMeasurementPageの範囲が見つかりません。変更しませんでした。'
  )
  process.exit(1)
}

const component = s.slice(componentStart, componentEnd)

/*
  複数行ではなく、実際に確認できた全室合計の1行だけを目印にします。
  改行コードの違いに影響されません。
*/
const target =
  '            <div className="summaryLine summaryGrand"><span>全室{title}合計</span><strong>{formatQuantity(total)}{unit}</strong></div>'

const count = component.split(target).length - 1

if (count !== 1) {
  console.error(
    '全室合計の追加位置が' +
    count +
    '件でした。変更しませんでした。'
  )
  process.exit(1)
}

const materialUi = `${target}

          {/* M-CROSS_CF_MATERIAL_STEP4C2 */}
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
                ) : (
                  availableMaterialRecords.map(record => (
                    <label
                      className="cfMaterialChoice"
                      key={record.id}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMaterialRecordIds.includes(record.id)}
                        onChange={() =>
                          toggleMaterialRecord(record.id)
                        }
                      />

                      <span>
                        <strong>{record.room}</strong>

                        <small>
                          {Number(record.length || 0).toFixed(2)}m
                          {' × '}
                          {formatQuantity(record.count)}本
                          {' / 合計 '}
                          {formatQuantity(
                            getLengthQuantity(record)
                          )}m
                        </small>

                        {record.memo && (
                          <small>メモ：{record.memo}</small>
                        )}
                      </span>
                    </label>
                  ))
                )}
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
                        setMaterialOrderLength(
                          event.target.value
                        )
                      }
                      placeholder={formatQuantity(
                        selectedMaterialLength
                      )}
                    />
                  </label>

                  <label>
                    <span>品番・商品名</span>

                    <input
                      type="text"
                      value={materialProductCode}
                      onChange={event =>
                        setMaterialProductCode(
                          event.target.value
                        )
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
                    const groupRecords = records.filter(
                      record =>
                        Array.isArray(group.recordIds) &&
                        group.recordIds.includes(record.id)
                    )

                    const calculatedLength =
                      groupRecords.reduce(
                        (sum, record) =>
                          sum + getLengthQuantity(record),
                        0
                      )

                    const roomNames = [
                      ...new Set(
                        groupRecords.map(
                          record => record.room
                        )
                      ),
                    ]

                    return (
                      <div
                        className="cfMaterialGroup"
                        key={group.id}
                      >
                        <div className="cfMaterialGroupHeader">
                          <strong>CF材料 {index + 1}</strong>

                          <button
                            type="button"
                            onClick={() =>
                              deleteMaterialGroup(group.id)
                            }
                            aria-label={
                              'CF材料' +
                              (index + 1) +
                              'を削除'
                            }
                          >
                            ×
                          </button>
                        </div>

                        <p>
                          {roomNames.join(' ＋ ') ||
                            '対象データなし'}
                        </p>

                        <div className="summaryLine">
                          <span>計算長</span>

                          <strong>
                            {formatQuantity(
                              calculatedLength
                            )}m
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
                              updateMaterialGroup(
                                group.id,
                                {
                                  orderLength:
                                    event.target.value,
                                }
                              )
                            }
                          />
                        </label>

                        <label>
                          <span>品番・商品名</span>

                          <input
                            type="text"
                            value={group.productCode || ''}
                            onChange={event =>
                              updateMaterialGroup(
                                group.id,
                                {
                                  productCode:
                                    event.target.value,
                                }
                              )
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
          )}`

const updatedComponent = component.replace(
  target,
  materialUi
)

fs.copyFileSync(file, backup)

s =
  s.slice(0, componentStart) +
  updatedComponent +
  s.slice(componentEnd)

fs.writeFileSync(file, s, 'utf8')

console.log('STEP4-C2 OK')
console.log('CF材料まとめ画面を追加しました')
console.log('バックアップ:', backup)