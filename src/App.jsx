import { useEffect, useMemo, useRef, useState } from 'react'
import properties from './m-cross-properties.json'
import './App.css'

const defaultRooms = [
  '居間', 'LDK', '台所', '洋間', '洋間2', '洋間3', '和室',
  '階段', 'ホール', '玄関', '脱衣所', 'トイレ',
]
const measurementTypes = ['天井', '収納天井', '壁', '収納壁']
const storagePrefix = 'm-cross:'
const workingDraftKey = 'm-cross-working-draft:v1'
const fontSizeKey = 'm-cross-font-size'
const themeKey = 'm-cross-theme'
const propertyMasterKey = 'm-cross:property-master:v1'
const pricingSettingsKey = 'm-cross:pricing-settings:v1'
const pricingSettingsVersionKey = 'm-cross:pricing-settings-version'
const currentPricingSettingsVersion = '2'
const estimateCopyFormatKey = 'm-cross-estimate-copy-format'
const commonAdditionalWorksKey = 'm-cross:common-additional-works:v1'
const defaultCommonAdditionalWorks = ['畳表替え', '電球交換', 'ドア簡易着色補修', '戸当たりゴム取付', '建具調整', 'コーキング']
const quickMemos = ['窓面', '窓向かって右面', '窓向かって左面', '正面', '右面', '左面', 'シンク背面', 'シンク向かって右面', 'シンク向かって左面', '梁含む', '梁除く', '下がり天井']
const defaultPricingSettings = {
  crossRates: {
    '天井': 990,
    '収納天井': 990,
    '壁': 990,
    '収納壁': 990,
  },
  cfRate: 2300,
  softRate: 420,
  floorTrimRate: 3500,
  crossFactor: 1,
}

function loadPricingSettings() {
  try {
    const version = localStorage.getItem(pricingSettingsVersionKey)
    if (version !== currentPricingSettingsVersion) {
      localStorage.setItem(pricingSettingsKey, JSON.stringify(defaultPricingSettings))
      localStorage.setItem(pricingSettingsVersionKey, currentPricingSettingsVersion)
      return defaultPricingSettings
    }
    const stored = JSON.parse(localStorage.getItem(pricingSettingsKey) || 'null')
    if (!stored || typeof stored !== 'object') return defaultPricingSettings
    return {
      ...defaultPricingSettings,
      ...stored,
      crossRates: {
        ...defaultPricingSettings.crossRates,
        ...(stored.crossRates || {}),
      },
    }
  } catch {
    return defaultPricingSettings
  }
}

function formatYen(value) {
  return new Intl.NumberFormat('ja-JP').format(Math.round(Number(value) || 0)) + '円'
}
function splitMeasurementType(type) {
  return type.startsWith('収納') ? ['収納', type.replace('収納', '')] : [type]
}
function buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings) {
  const crossRows = []
  const cfRows = []
  const softRows = []
  const floorTrimRows = []
  const roomPriority = ['居間', 'LDK', '台所', '洋間', '和室', '階段', 'ホール', '玄関', '脱衣所', 'トイレ']

  function roomBaseName(roomName) {
    if (/^洋間\d+$/.test(roomName)) return '洋間'
    if (/^和室\d+$/.test(roomName)) return '和室'
    return roomName
  }

  function roomNumber(roomName) {
    const match = String(roomName).match(/(\d+)$/)
    return match ? Number(match[1]) : 0
  }

  const orderedRooms = [...rooms].sort((a, b) => {
    const aIndex = roomPriority.indexOf(roomBaseName(a))
    const bIndex = roomPriority.indexOf(roomBaseName(b))
    const aRank = aIndex === -1 ? roomPriority.length : aIndex
    const bRank = bIndex === -1 ? roomPriority.length : bIndex
    if (aRank !== bRank) return aRank - bRank
    const numberDifference = roomNumber(a) - roomNumber(b)
    if (numberDifference !== 0) return numberDifference
    return String(a).localeCompare(String(b), 'ja')
  })

  function groupByMemo(targetRecords) {
    const groups = new Map()
    targetRecords.forEach(record => {
      const memo = String(record.memo || '').trim()
      if (!groups.has(memo)) groups.set(memo, [])
      groups.get(memo).push(record)
    })
    return groups
  }

  // 1. クロスを全部屋分、指定した部屋順で先に並べます。
  orderedRooms.forEach(roomName => {
    const definitions = [
      {
        parts: [roomName, '天井', 'クロス貼替'],
        records: records.filter(record => record.room === roomName && record.type === '天井'),
        amountForRecord: record => getRecordQuantity(record) * factor * Number(pricingSettings.crossRates['天井'] || 0),
      },
      {
        parts: [roomName, '壁', 'クロス貼替'],
        records: records.filter(record => record.room === roomName && record.type === '壁'),
        amountForRecord: record => getRecordQuantity(record) * factor * Number(pricingSettings.crossRates['壁'] || 0),
      },
      {
        parts: [roomName, '収納', 'クロス貼替'],
        records: records.filter(record => record.room === roomName && (record.type === '収納天井' || record.type === '収納壁')),
        amountForRecord: record => getRecordQuantity(record) * factor * Number(pricingSettings.crossRates[record.type] || 0),
        storage: true,
      },
    ]

    definitions.forEach(definition => {
      groupByMemo(definition.records).forEach((groupRecords, inputMemo) => {
        const quantity = groupRecords.reduce((sum, record) => sum + getRecordQuantity(record), 0) * factor
        if (quantity <= 0) return
        const amount = groupRecords.reduce((sum, record) => sum + definition.amountForRecord(record), 0)
        crossRows.push({
          room: roomName,
          parts: definition.parts,
          memo: definition.storage ? ['天井壁', inputMemo].filter(Boolean).join('・') : inputMemo,
          category: 'cross',
          quantity,
          unit: '㎡',
          rate: quantity > 0 ? amount / quantity : 0,
          amount,
        })
      })
    })
  })

  // 2. クロスが終わった後に、CFを全部屋分並べます。
  const cfRooms = [...orderedRooms]
  if (cfRecords.some(record => record.room === '土間') && !cfRooms.includes('土間')) cfRooms.push('土間')
  cfRooms.forEach(roomName => {
    const roomCfRecords = cfRecords.filter(record => record.room === roomName)
    groupByMemo(roomCfRecords).forEach((groupRecords, memo) => {
      const measuredLength = groupRecords.reduce((sum, record) => sum + getLengthQuantity(record), 0)
      const quantity = measuredLength * 1.8
      if (quantity <= 0) return
      const rate = Number(pricingSettings.cfRate || 0)
      cfRows.push({
        room: roomName,
        parts: [roomName, '床', 'CF貼り'],
        memo,
        category: 'cf',
        quantity,
        unit: '㎡',
        rate,
        amount: quantity * rate,
      })
    })
  })
  // 3. 最後にソフト巾木。メモなしは全室合計、メモありはメモ別です。
  groupByMemo(softRecords).forEach((groupRecords, memo) => {
    const quantity = groupRecords.reduce((sum, record) => sum + getSoftBaseboardQuantity(record), 0)
    if (quantity <= 0) return
    const rate = Number(pricingSettings.softRate || 0)
    softRows.push({
      room: '__ALL_ROOMS__',
      parts: ['ソフト巾木貼替'],
      memo,
      category: 'soft',
      quantity,
      unit: '枚',
      rate,
      amount: quantity * rate,
    })
  })

  const floorTrimGroups = new Map()
  floorTrimRecords.forEach(record => {
    const roomA = String(record.roomA || '').trim()
    const roomB = String(record.roomB || '').trim()
    const color = String(record.color || '').trim()
    if (!roomA || !roomB || roomA === roomB) return
    const key = [roomA, roomB, color].join('||')
    const current = floorTrimGroups.get(key) || { roomA, roomB, color, quantity: 0 }
    current.quantity += Math.max(0, Number(record.quantity) || 0)
    floorTrimGroups.set(key, current)
  })
  floorTrimGroups.forEach(group => {
    if (group.quantity <= 0) return
    const rate = Number(pricingSettings.floorTrimRate || 0)
    floorTrimRows.push({
      room: '__FLOOR_TRIM__',
      parts: [`${group.roomA}⇔${group.roomB}`, '床見切り取付'],
      memo: group.color,
      category: 'floorTrim',
      quantity: group.quantity,
      unit: '本',
      rate,
      amount: group.quantity * rate,
    })
  })

  return [...crossRows, ...cfRows, ...softRows, ...floorTrimRows].map(row => ({
    ...row,
    label: row.parts.join(' '),
  }))
}

function estimateRowsToClipboardText(rows, format) {
  return rows.map(row => {
    const itemCells = format === 'split' ? row.parts : [row.parts.join(' ')]
    return [...itemCells, formatQuantity(row.quantity), row.unit].join('\t')
  }).join('\n')
}


async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {
  try {
    if (!rows.length && !additionalWorks.length) {
      window.alert('出力できる見積項目がありません。')
      return
    }
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'MavieSelect'
    workbook.created = new Date()
    const worksheet = workbook.addWorksheet('見積用', {
      views: [{ state: 'frozen', ySplit: 8 }],
    })
    worksheet.properties.defaultRowHeight = 21
    worksheet.views = [{ showGridLines: false, state: 'frozen', ySplit: 8 }]

    const estimateOutputRows = [
      ...rows,
      ...additionalWorks.map(item => ({
        room: item.room || '',
        parts: [item.room || '', item.work || '', ''],
        memo: item.memo || '',
        category: 'additionalWork',
        quantity: Number(item.quantity || 0),
        unit: item.unit || '式',
        rate: Number(item.unitPrice || 0),
        amount: Number(item.amount || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
      })),
    ]
    const maxParts = format === 'split'
      ? Math.max(1, ...estimateOutputRows.map(row => row.parts.length))
      : 1
    // 「項目を分ける」場合だけ、項目3とメモの間へ空白の調整列を1列入れる。
    const spacerCount = format === 'split' ? 1 : 2
    const firstSpacerColumnIndex = maxParts + 1
    const memoColumnIndex = maxParts + spacerCount + 1
    const quantityColumnIndex = maxParts + spacerCount + 2
    const unitColumnIndex = maxParts + spacerCount + 3
    const unitPriceColumnIndex = unitColumnIndex + 1
    const amountColumnIndex = unitColumnIndex + 2
    const lastColumn = amountColumnIndex
    const outputRows = estimateOutputRows.map(row => {
      const splitParts = row.category === 'cf'
        ? row.parts
        : row.category === 'floorTrim'
          ? [row.parts[0], '床', '見切り取付']
          : row.parts
      const itemCells = format === 'split' ? splitParts : [row.parts.join(' ')]
      const emptyFill = Array(Math.max(0, maxParts - itemCells.length)).fill('')
      return [
        ...itemCells,
        ...emptyFill,
        ...Array(spacerCount).fill(''),
        row.memo || '',
        Number(formatQuantity(row.quantity)),
        row.unit,
        Number(row.rate || 0),
        Number(row.amount || 0),
      ]
    })

    worksheet.mergeCells(1, 1, 1, lastColumn)
    const titleCell = worksheet.getCell(1, 1)
    titleCell.value = '見積用データ'
    titleCell.font = { name: 'Yu Gothic', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9B72CF' } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
    worksheet.getRow(1).height = 30

    const metadata = [
      ['管理会社', entry.company || ''],
      ['物件名', entry.propertyName || ''],
      ['住所', entry.address || ''],
      ['号室', entry.unit || ''],
      ['出力日', new Intl.DateTimeFormat('ja-JP').format(new Date())],
    ]
    metadata.forEach(([label, value], index) => {
      const rowNumber = index + 3
      worksheet.getCell(rowNumber, 1).value = label
      worksheet.getCell(rowNumber, 1).font = { name: 'Yu Gothic', bold: true, color: { argb: 'FF666666' } }
      worksheet.getCell(rowNumber, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F7' } }
      worksheet.mergeCells(rowNumber, 2, rowNumber, lastColumn)
      worksheet.getCell(rowNumber, 2).value = value
      worksheet.getCell(rowNumber, 2).font = { name: 'Yu Gothic', color: { argb: 'FF008000' } }
      worksheet.getCell(rowNumber, 2).alignment = { vertical: 'middle', wrapText: true }
    })

    const headers = format === 'split'
      ? [...Array(maxParts)].map((_, index) => '項目' + (index + 1))
      : ['工事項目']
    headers.push(...Array(spacerCount).fill(''))
    headers.push('メモ', '数量', '単位', '単価', '金額')
    const headerRow = worksheet.getRow(8)
    headerRow.values = headers
    headerRow.height = 24
    headerRow.eachCell(cell => {
      cell.font = { name: 'Yu Gothic', bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9B72CF' } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
    worksheet.autoFilter = {
      from: { row: 8, column: 1 },
      to: { row: 8, column: lastColumn },
    }

    outputRows.forEach((values, rowIndex) => {
      const dataRow = worksheet.addRow(values)
      dataRow.height = 23
      dataRow.eachCell((cell, columnIndex) => {
        cell.font = {
          name: 'Yu Gothic',
          size: 11,
          color: { argb: columnIndex >= memoColumnIndex ? 'FF000000' : 'FF008000' },
        }
        cell.alignment = {
          vertical: 'middle',
          horizontal: columnIndex === quantityColumnIndex ? 'right' : 'left',
          wrapText: true,
        }
        if (rowIndex % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBF8FD' } }
        }
      })
      dataRow.getCell(quantityColumnIndex).numFmt = '0.0'
      dataRow.getCell(unitPriceColumnIndex).numFmt = '#,##0'
      dataRow.getCell(amountColumnIndex).numFmt = '#,##0'
    })

    function getDisplayLength(value) {
      return [...String(value ?? '')].reduce((length, character) => {
        const code = character.charCodeAt(0)
        return length + (code > 0xff ? 2 : 1)
      }, 0)
    }

    for (let columnIndex = 1; columnIndex <= lastColumn; columnIndex += 1) {
      const column = worksheet.getColumn(columnIndex)
      const maxLength = column.values.reduce(
        (max, value) => Math.max(max, getDisplayLength(value)),
        0
      )
      const isSpacerColumn = columnIndex >= firstSpacerColumnIndex && columnIndex < memoColumnIndex
      const isMemoColumn = columnIndex === memoColumnIndex
      const isQuantityColumn = columnIndex === quantityColumnIndex
      const isUnitColumn = columnIndex === unitColumnIndex

      let minimumWidth = 6
      let maximumWidth = 24
      let extraWidth = 1.5

      if (isSpacerColumn) {
        minimumWidth = 3
        maximumWidth = 3
        extraWidth = 0
      } else if (isMemoColumn) {
        minimumWidth = 12
        maximumWidth = 28
        extraWidth = 2
      } else if (isQuantityColumn) {
        minimumWidth = 8
        maximumWidth = 10
        extraWidth = 1
      } else if (isUnitColumn) {
        minimumWidth = 5
        maximumWidth = 6
        extraWidth = 1
      } else if (format === 'merged' && columnIndex === 1) {
        minimumWidth = 18
        maximumWidth = 36
        extraWidth = 2
      }

      column.width = Math.max(
        minimumWidth,
        Math.min(maximumWidth, maxLength + extraWidth)
      )
      if (isSpacerColumn) column.width = 3
      column.alignment = {
        vertical: 'middle',
        horizontal: isQuantityColumn ? 'right' : 'left',
        wrapText: maxLength + extraWidth > maximumWidth,
      }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const safeName = `${entry.propertyName || '物件'}_${entry.unit || '号室'}`
      .replace(/[\\/:*?"<>|]/g, '_')
    const fileName = `${safeName}_見積用.xlsx`
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    console.error('見積用Excelを出力できませんでした。', error)
    window.alert('見積用Excelを出力できませんでした。')
  }
}

function createRecordId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function readPreference(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function toHiragana(value) {
  return value.replace(/[\u30a1-\u30f6]/g, char =>
    String.fromCharCode(char.charCodeAt(0) - 0x60)
  )
}

const kanaToRomajiMap = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo',
  うぁ: 'wha', うぃ: 'whi', うぇ: 'whe', うぉ: 'who',
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
  ゃ: 'ya', ゅ: 'yu', ょ: 'yo', っ: '', ー: '',
}

const romajiToKanaMap = {
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
  sha: 'しゃ', shu: 'しゅ', sho: 'しょ',
  sya: 'しゃ', syu: 'しゅ', syo: 'しょ',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ',
  cya: 'ちゃ', cyu: 'ちゅ', cyo: 'ちょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
  hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  gya: 'ぎゃ', gyu: 'gyu', gyo: 'ぎょ',
  ja: 'じゃ', ju: 'じゅ', jo: 'じょ',
  jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
  shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  sa: 'さ', si: 'し', su: 'す', se: 'せ', so: 'そ',
  ta: 'た', ti: 'ち', tu: 'つ', te: 'て', to: 'と',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', hu: 'ふ', he: 'へ', ho: 'ほ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  wa: 'わ', wo: 'を', nn: 'ん',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  za: 'ざ', zi: 'じ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
}

function toRomaji(value) {
  const text = toHiragana(value.normalize('NFKC').toLowerCase())
  let result = ''

  for (let index = 0; index < text.length;) {
    const current = text[index]
    const next = text[index + 1] || ''
    const pair = current + next

    if (current === 'っ') {
      const following = text.slice(index + 1).match(/^[ぁ-ん]/)?.[0]
      const consonant = following ? kanaToRomajiMap[following]?.[0] : ''
      if (consonant && consonant !== 'n') result += consonant
      index += 1
      continue
    }

    if (kanaToRomajiMap[pair]) {
      result += kanaToRomajiMap[pair]
      index += 2
      continue
    }

    result += kanaToRomajiMap[current] ?? current
    index += 1
  }

  return result
}

function toKana(value) {
  const text = value.normalize('NFKC').toLowerCase()
  let result = ''
  let index = 0

  while (index < text.length) {
    const remainder = text.slice(index)
    const doubled = remainder.match(/^([bcdfghjklmpqrstvwxyz])\1/i)

    if (doubled && doubled[1].toLowerCase() !== 'n') {
      result += 'っ'
      index += 1
      continue
    }

    if (/^n(?=[^aiueoyn]|$)/i.test(remainder)) {
      result += 'ん'
      index += 1
      continue
    }

    let matched = false
    for (const length of [3, 2, 1]) {
      const part = text.slice(index, index + length)
      if (romajiToKanaMap[part]) {
        result += romajiToKanaMap[part]
        index += length
        matched = true
        break
      }
    }

    if (!matched) {
      result += text[index]
      index += 1
    }
  }

  return result
}

function searchForms(value) {
  const normalized = toHiragana(
    String(value ?? '').normalize('NFKC').toLowerCase()
  ).replace(/\s+/g, '')

  if (!normalized) return []

  const forms = new Set([normalized])
  const kana = toKana(normalized)

  if (kana !== normalized) forms.add(toHiragana(kana))

  const romanized = toRomaji(normalized)
  if (romanized) forms.add(romanized)

  const kanaRomanized = toRomaji(kana)
  if (kanaRomanized) forms.add(kanaRomanized)

  const aliases = {
    chouchou: 'shushu',
    shushu: 'chouchou',
  }

  for (const form of [...forms]) {
    if (aliases[form]) forms.add(aliases[form])
  }

  return [...forms].filter(Boolean)
}

const propertySearchCache = new WeakMap()

function getPropertySearchForms(property) {
  if (!property || typeof property !== 'object') return []

  const cached = propertySearchCache.get(property)
  if (cached) return cached

  const aliasValues = [property.alias, property.aliases].flatMap(value =>
    Array.isArray(value) ? value : value ? [value] : []
  )
  const values = [property.name, property.reading, ...aliasValues].filter(
    value => typeof value === 'string' && value.trim()
  )
  const forms = new Set(values.flatMap(searchForms))
  const result = [...forms]

  propertySearchCache.set(property, result)
  return result
}

function matchesProperty(property, queryForms) {
  if (queryForms.length === 0) return false

  const propertyForms = getPropertySearchForms(property)
  return propertyForms.some(propertyForm =>
    queryForms.some(queryForm => propertyForm.includes(queryForm))
  )
}

function emptyPropertyMaster() {
  return {
    addedCompanies: [],
    companyNames: {},
    deletedCompanyIds: [],
    addedProperties: [],
    propertyOverrides: {},
    deletedPropertyIds: [],
  }
}

function loadPropertyMaster() {
  try {
    const stored = localStorage.getItem(propertyMasterKey)
    if (!stored) return { master: emptyPropertyMaster(), error: '' }
    const parsed = JSON.parse(stored)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Invalid property master data')
    }
    return {
      master: {
        ...emptyPropertyMaster(),
        ...parsed,
        addedCompanies: Array.isArray(parsed.addedCompanies) ? parsed.addedCompanies : [],
        companyNames: parsed.companyNames && typeof parsed.companyNames === 'object' ? parsed.companyNames : {},
        deletedCompanyIds: Array.isArray(parsed.deletedCompanyIds) ? parsed.deletedCompanyIds : [],
        addedProperties: Array.isArray(parsed.addedProperties) ? parsed.addedProperties : [],
        propertyOverrides: parsed.propertyOverrides && typeof parsed.propertyOverrides === 'object' ? parsed.propertyOverrides : {},
        deletedPropertyIds: Array.isArray(parsed.deletedPropertyIds) ? parsed.deletedPropertyIds : [],
      },
      error: '',
    }
  } catch {
    return {
      master: emptyPropertyMaster(),
      error: '保存済みの管理会社・物件データを読み込めませんでした。データを確認してください。',
    }
  }
}

function getBaseCompanyId(companyName) {
  return `base-company:${encodeURIComponent(companyName)}`
}

function getBasePropertyId(companyName, district, index) {
  return `base-property:${encodeURIComponent(companyName)}:${encodeURIComponent(district)}:${index}`
}

function getMergedPropertyMaster(master) {
  const baseCompanies = Object.keys(properties).map(name => ({
    id: getBaseCompanyId(name),
    name: master.companyNames[getBaseCompanyId(name)] || name,
    originalName: name,
  }))
  const allCompanies = [...baseCompanies, ...master.addedCompanies]
  const deletedCompanyIds = new Set(master.deletedCompanyIds)
  const activeCompanies = allCompanies.filter(company => !deletedCompanyIds.has(company.id))
  const deletedPropertyIds = new Set(master.deletedPropertyIds)
  const allProperties = []

  Object.entries(properties).forEach(([originalCompanyName, districts]) => {
    const companyId = getBaseCompanyId(originalCompanyName)
    Object.entries(districts).forEach(([district, districtProperties]) => {
      districtProperties.forEach((property, index) => {
        const id = getBasePropertyId(originalCompanyName, district, index)
        if (deletedPropertyIds.has(id) || deletedCompanyIds.has(companyId)) return
        allProperties.push({
          ...property,
          ...(master.propertyOverrides[id] || {}),
          id,
          companyId,
          company: master.companyNames[companyId] || originalCompanyName,
        })
      })
    })
  })

  master.addedProperties.forEach(property => {
    if (deletedCompanyIds.has(property.companyId)) return
    const company = allCompanies.find(item => item.id === property.companyId)
    if (!company || deletedPropertyIds.has(property.id)) return
    allProperties.push({
      ...property,
      company: master.companyNames[property.companyId] || company.name,
    })
  })

  return {
    companies: activeCompanies,
    properties: allProperties,
  }
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Zen+Maru+Gothic:wght@400;500;600;700;800;900&display=swap');
  .app { min-height:100vh; padding-bottom:max(36px,env(safe-area-inset-bottom)); color:#514751; background:radial-gradient(circle at 8% 10%,rgba(255,211,180,.45),transparent 24%),radial-gradient(circle at 95% 30%,rgba(202,224,255,.55),transparent 27%),#fff9f1; font-family:"Zen Maru Gothic","Yu Gothic",Meiryo,sans-serif; font-size:16px; }
  .app * { box-sizing:border-box; }
  .header { width:min(100% - 32px,760px); min-height:82px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; border-bottom:2px dashed #eed9c6; }
  .brandGroup { display:flex; align-items:center; justify-content:flex-start; gap:10px; line-height:1; min-width:0; }
  .brandLogo { width:62px; height:62px; object-fit:contain; flex:0 0 auto; filter:drop-shadow(0 5px 10px rgba(148,76,196,.18)); transition:filter .2s ease,transform .2s ease; }
  .theme-dark .brandLogo { filter:drop-shadow(0 0 8px rgba(240,160,141,.35)); }
  .theme-pop .brandLogo { filter:drop-shadow(0 5px 9px rgba(231,93,145,.22)); }
  .theme-cyber .brandLogo { filter:drop-shadow(0 0 7px rgba(0,234,255,.8)) drop-shadow(0 0 11px rgba(255,37,216,.45)); }
  @media (max-width:520px) { .brandLogo { width:54px; height:54px; } }
  .mavieBrand { margin:0 0 2px 2px; color:#d98278; font-family:"Dancing Script","Segoe Script",cursive; font-size:21px; font-weight:700; letter-spacing:.035em; line-height:1.15; }
  .brand { color:#f08b78; font-family:"Zen Maru Gothic",sans-serif; font-size:32px; font-weight:900; letter-spacing:.04em; text-shadow:0 3px 0 #ffe3d4; }
  .settingsButton { width:46px; height:46px; border:1px solid #efd8ca; border-radius:14px; color:#d27f6d; background:#fffaf5; font:inherit; font-size:22px; cursor:pointer; -webkit-tap-highlight-color:transparent; }
  .main { width:min(100% - 32px,620px); margin:28px auto 0; }
  .settingsMain.managementPropertyOpen { padding-bottom:calc(100vh - 48px); }
  .eyebrow { margin:0 0 10px; color:#e58a75; font-size:14px; font-weight:800; letter-spacing:.1em; }
  .main h1,.card h2 { color:#514751; font-family:"Zen Maru Gothic","Yu Gothic",Meiryo,sans-serif; font-weight:800; letter-spacing:.04em; }
  .main h1 { margin:0 0 12px; font-size:clamp(32px,8vw,42px); }
  .subtitle,.propertyLine { color:#8e8190; font-size:16px; line-height:1.8; }
  .propertyLine { margin:18px 0 8px; color:#d27f6d; font-family:"Zen Maru Gothic","Yu Gothic",Meiryo,sans-serif; font-size:21px; font-weight:800; letter-spacing:.035em; line-height:1.55; text-align:left; text-shadow:0 2px 0 rgba(255,227,212,.7); }
  .measurementBackButton { display:inline-flex; align-items:center; justify-content:center; min-height:46px; margin:0 0 4px; padding:9px 16px; border:1px solid #efc7b4; border-radius:14px; color:#c96e69; background:linear-gradient(180deg,#fff,#fff3e9); box-shadow:0 4px 0 #ead8cb; font:inherit; font-size:15px; font-weight:800; cursor:pointer; -webkit-tap-highlight-color:transparent; }
  .card { margin-top:20px; padding:clamp(20px,5vw,30px); border:1px solid rgba(230,202,184,.85); border-radius:24px; background:rgba(255,255,255,.82); box-shadow:0 12px 0 #ead8cb,0 18px 36px rgba(111,82,88,.12); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); }
  .masterCompanyForm,.masterPropertySection,.masterPropertyForm { scroll-margin-top:24px; }
  .card h2 { margin:0 0 22px; text-align:center; font-size:26px; }
  .card label { display:grid; gap:10px; min-width:0; margin:0 0 18px; }
  .card label>span { color:#817183; font-size:15px; font-weight:800; }
  .card input,.card select { width:100%; min-height:54px; padding:0 15px; border:2px solid #efe4dc; border-radius:14px; outline:none; color:#514751; background:#fffdfa; font:inherit; }
  .card input.memoInput { height:56px; min-height:56px; padding:14px 15px; line-height:26px; }
  .card input:focus,.card select:focus { border-color:#f0a48f; box-shadow:0 0 0 4px rgba(240,164,143,.18); }
  .address { display:grid; gap:8px; margin:8px 0 20px; padding:15px; border:1px dashed #efc7b4; border-radius:15px; background:#fff7ed; }
  .address small { color:#dd8a73; font-size:13px; font-weight:800; }
  .address strong { color:#635865; font-size:15px; font-weight:500; line-height:1.7; }
  .primary,.add,.saveButton,.secondaryButton,.room,.measurementType,.keypadButton,.actionButton,.savedItem,.settingsOption { font-family:"Zen Maru Gothic","Yu Gothic",Meiryo,sans-serif; font-weight:800; cursor:pointer; -webkit-tap-highlight-color:transparent; }
  .primary,.add,.saveButton,.secondaryButton { min-height:54px; border:0; border-radius:15px; color:#fff; letter-spacing:.04em; font-size:17px; }
  .primary { width:100%; margin-top:4px; background:linear-gradient(180deg,#ffad92,#f08a79); box-shadow:0 5px 0 #d26e66; }
  .add { width:100%; margin-top:18px; background:linear-gradient(180deg,#94d9bd,#63bea1); box-shadow:0 5px 0 #42987f; }
  .crossRegister { min-height:62px; margin:12px 0 20px; font-size:18px; touch-action:manipulation; }
  .crossInputArea { scroll-margin-block:16px; }
  .crossInputArea .numberKeypad { gap:6px; margin-top:10px; padding:8px; }
  .crossInputArea .keypadButton { min-height:42px; }
  .crossInputArea .crossRegister { min-height:50px; margin:10px 0 0; }
  .measurementActions { display:grid; grid-template-columns:minmax(0,1fr); gap:14px; margin:16px 0 20px; }
  .measurementActions .saveButton,.measurementActions .secondaryButton { width:100%; margin:0; }
  .saveState { margin:8px 0 0; padding:6px 10px; border-radius:10px; font-size:13px; font-weight:800; text-align:center; }
  .saveState.saved { color:#548c73; background:#edf8f0; }
  .saveState.dirty { color:#b14f4b; background:#fff0eb; }
  .saveButton { background:linear-gradient(180deg,#91baff,#6e91e8); box-shadow:0 5px 0 #526fc2; }
  .secondaryButton { width:100%; margin-top:12px; background:linear-gradient(180deg,#c6a4e8,#a77bd1); box-shadow:0 5px 0 #875bad; }
  .primary:disabled { opacity:.45; cursor:not-allowed; }
  .back { padding:9px 0; border:0; color:#d27f6d; background:transparent; font:inherit; font-size:16px; font-weight:800; cursor:pointer; }
  .roomTabs { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,96px),1fr)); gap:10px; margin:20px 0; }
  .customRoomControls { display:grid; gap:12px; margin:0 0 20px; }
  .customRoomControls > .secondaryButton { width:100%; margin:0; }
  .customRoomForm { display:grid; gap:8px; padding:14px; border:1px solid #f0d6c8; border-radius:14px; background:rgba(255,255,255,.7); }
  .customRoomForm label { display:grid; gap:8px; margin:0; }
  .customRoomForm label>span { color:#817183; font-size:15px; font-weight:800; }
  .customRoomForm .primary { margin:0; }
  .customRoomList { display:grid; gap:8px; }
  .customRoomItem { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:10px; padding:10px 12px; border:1px solid #f0d6c8; border-radius:12px; background:rgba(255,255,255,.7); }
  .customRoomItem > span { min-width:0; overflow-wrap:anywhere; font-weight:700; }
  .roomManagementActions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
  .roomManagementActions > button { width:auto; min-width:76px; min-height:42px; margin:0; padding:8px 12px; font-size:14px; }
  .roomEditForm,.roomDeleteConfirmation { grid-column:1 / -1; display:grid; gap:8px; width:100%; }
  .roomEditForm label { display:grid; gap:8px; margin:0; }
  .roomEditForm label>span { color:#817183; font-size:15px; font-weight:800; }
  .roomEditForm .primary { margin:0; }
  .roomDeleteConfirmation p { margin:0; line-height:1.7; }
  .roomDeleteConfirmation .roomManagementActions { justify-content:stretch; }
  .roomDeleteConfirmation .roomManagementActions > button { flex:1 1 120px; }
  .room,.measurementType { min-width:0; min-height:50px; padding:8px 5px; border:1px solid #e9dce8; border-radius:14px; color:#75697a; background:linear-gradient(180deg,#fff,#f8f1f8); box-shadow:0 4px 0 #e3d4e1; font-size:15px; overflow-wrap:anywhere; }
  .room.active,.measurementType.active { border-color:#f3a18f; color:#fff; background:linear-gradient(180deg,#ffb49b,#f18c7d); box-shadow:0 4px 0 #d6756c; }
  .measurementTypes,.inputRow { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
  .measurementTypes { grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr)); gap:12px; margin:18px 0 20px; }
  .measurementTypes .measurementType { white-space:normal; }
  .measurementCheckButton { width:100%; min-height:54px; margin:0 0 20px; padding:10px 14px; border:1px solid #efc7b4; border-radius:15px; color:#c96e69; background:linear-gradient(180deg,#fff,#fff3e9); box-shadow:0 4px 0 #ead8cb; font:inherit; font-size:17px; font-weight:800; cursor:pointer; -webkit-tap-highlight-color:transparent; }
  .roomCheckSection { display:grid; gap:14px; }
  .roomCheckTotals { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr)); gap:10px; padding:14px; border:1px solid #f0e3dc; border-radius:14px; background:#fff5e7; color:#806f7b; font-weight:800; text-align:center; }
  .roomCheckList { display:grid; gap:14px; }
  .roomCheckItem { display:grid; gap:10px; padding:14px; border:1px solid #f0d6c8; border-radius:16px; background:rgba(255,255,255,.82); box-shadow:0 4px 0 #ead8cb; }
  .roomCheckItem.confirmed { border-color:#a9d8bd; background:#f5fff8; }
  .roomCheckName { display:flex; min-width:0; min-height:44px; align-items:center; justify-content:space-between; gap:8px; padding:4px 2px; border:0; color:#514751; background:transparent; font:inherit; font-size:18px; font-weight:800; text-align:left; cursor:pointer; }
  .roomCheckName span:last-child { flex:none; color:#548c73; font-size:14px; }
  .roomCheckDetails { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,130px),1fr)); gap:8px; color:#806f7b; font-size:14px; }
  .roomConfirmButton { width:100%; min-height:44px; padding:8px 12px; border:1px solid #efc7b4; border-radius:12px; color:#c96e69; background:#fff7f0; font:inherit; font-weight:800; cursor:pointer; }
  .roomCheckItem.confirmed .roomConfirmButton { border-color:#a9d8bd; color:#438464; background:#edfbf2; }
  .roomNavigation { display:flex; flex-wrap:wrap; align-items:center; gap:12px; margin-top:20px; }
  .roomNavigation > button { flex:1 1 140px; min-width:0; min-height:54px; }
  .roomNavigation .roomNavigationNext { width:auto; padding:0 18px; }
  .inputRow label { display:grid; grid-template-rows:38px 60px; width:100%; min-width:0; margin:0; text-align:center; }
  .inputRow label>span { display:flex; align-items:center; justify-content:center; white-space:nowrap; }
  .inputRow input { display:block; width:100%; height:60px; min-height:60px; padding:0 10px; font-size:21px; text-align:center; }
  .numberKeypad { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; margin-top:16px; padding:13px; border:1px solid #f0dfd1; border-radius:17px; background:#fff9f1; }
  .keypadButton { min-height:50px; border:1px solid #e6d8e6; border-radius:12px; color:#65596a; background:linear-gradient(180deg,#fff,#f5edf7); box-shadow:0 4px 0 #ded0df; font-size:19px; }
  .keypadButton.utility { color:#d27f6d; background:#fff1e9; }
  .records { margin-top:20px; }
  .record { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:15px 2px; border-bottom:1px solid #f0e7e1; color:#5b505b; }
  .record>div { display:grid; gap:5px; }
  .record strong { font-size:16px; }
  .record small { color:#958896; font-size:14px; }
  .record b { margin-left:auto; color:#d47e68; font-size:19px; white-space:nowrap; }
  .record button { min-width:40px; min-height:40px; border:0; border-radius:12px; color:#b18e9c; background:#fff2f0; font-size:23px; cursor:pointer; }
  .summary,.roomSummary { padding:15px; border:1px solid #f0e3dc; border-radius:14px; background:rgba(255,255,255,.65); }
  .roomSummary { margin-bottom:14px; }
  .roomSummary h3 { margin:0 0 10px; color:#514751; font-size:19px; }
  .summary { display:grid; gap:10px; margin-top:20px; background:#fff5e7; }
  .summaryLine { display:flex; align-items:center; justify-content:space-between; gap:12px; color:#806f7b; font-size:16px; }
  .summaryLine strong { color:#d77968; font-size:20px; }
  .roomSummary .summaryLine { padding:4px 0; }
  .summaryGrand { margin-top:4px; padding-top:12px; border-top:1px solid #f1d2bd; font-weight:800; }
  .summaryGrand strong { font-size:25px; }
  .estimateSettings { display:grid; gap:14px; }
  .estimateSettingsGrid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr)); gap:12px; }
  .estimateSettingsGrid label { margin:0; }
  .estimateIntro { margin:0 0 14px; color:#8e8190; line-height:1.7; }
  .estimateRoom { display:grid; gap:10px; margin-bottom:16px; padding:15px; border:1px solid #f0d6c8; border-radius:16px; background:rgba(255,255,255,.82); }
  .estimateRoom h3 { margin:0; color:#514751; font-size:20px; text-align:left; }
  .estimateRow { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(70px,.7fr) minmax(80px,.7fr) minmax(96px,.8fr); gap:8px; align-items:center; padding:10px 0; border-bottom:1px solid #f0e7e1; text-align:left; }
  .estimateRow:last-child { border-bottom:0; }
  .estimateRow strong { color:#514751; }
  .estimateNumber { text-align:left; white-space:nowrap; }
  .estimateTotal { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:18px; padding:18px; border-radius:16px; color:#6d5865; background:#fff0d8; font-size:20px; font-weight:900; }
  .estimateTotal strong { color:#c96358; font-size:28px; }
  .estimateNote { margin:16px 0 0; padding:14px; border:1px dashed #efc7b4; border-radius:14px; color:#806f7b; background:#fff9f1; line-height:1.7; }
  .estimateFactor { display:grid; gap:8px; margin-bottom:16px; }
  .estimateFactor input { width:100%; min-height:54px; padding:0 15px; border:2px solid #efe4dc; border-radius:14px; font:inherit; }
  .quickMemos { display:flex; flex-wrap:wrap; gap:8px; margin:-8px 0 18px; }
  .quickMemoButton { min-height:40px; padding:7px 11px; border:1px solid #efc7b4; border-radius:999px; color:#c96e69; background:#fff7f0; font:inherit; font-size:13px; font-weight:800; cursor:pointer; }
  .floorTrimSection { margin-top:20px; }
  .floorTrimGrid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
  .floorTrimColorOptions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-bottom:18px; }
  .floorTrimColorButton { min-height:46px; border:1px solid #e9dce8; border-radius:13px; color:#75697a; background:#fff; font:inherit; font-weight:800; }
  .floorTrimColorButton.active { border-color:#f3a18f; color:#fff; background:linear-gradient(180deg,#ffb49b,#f18c7d); }
  .reviewTotals { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin:16px 0 24px; }
  .reviewTotal { padding:16px; border:1px solid #eadce9; border-radius:18px; background:#fffafc; box-shadow:0 5px 0 #eee2e9; }
  .reviewTotal span { display:block; color:#8a7b8d; font-size:13px; font-weight:800; }
  .reviewTotal strong { display:block; margin-top:5px; color:#cf716f; font-size:23px; }
  .additionalWorkForm { margin-top:16px; padding:16px; border:1px dashed #efc7b4; border-radius:20px; background:#fffaf5; }
  .additionalWorkGrid { display:grid; grid-template-columns:1fr 90px 90px; gap:10px; }
  .commonWorkButtons { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0 16px; }
  .additionalWorkItem { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:10px; align-items:center; padding:14px 0; border-bottom:1px solid #eee5ec; }
  .additionalWorkItem:last-child { border-bottom:0; }
  .additionalWorkItem small { display:block; margin-top:4px; color:#988b99; }
  @media (max-width:520px) { .reviewTotals { grid-template-columns:1fr 1fr; } .additionalWorkGrid { grid-template-columns:1fr 78px; } .additionalWorkGrid label:last-child { grid-column:1 / -1; } }
  .copyFormatPreview { margin:10px 0 0; color:#8e8190; font-size:13px; line-height:1.7; }
  .copyStatus { margin:12px 0 0; color:#548c73; font-weight:800; text-align:center; }
  @media (max-width:520px) {
    .estimateRow { grid-template-columns:minmax(0,1fr) 52px 68px 72px; gap:5px; align-items:center; }
    .estimateRow .estimateUnit,.estimateRow .estimateRate { grid-column:auto; text-align:right; color:#958896; white-space:nowrap; }
    .estimateRow .estimateNumber { text-align:right; white-space:nowrap; }
    .estimateRow > strong { min-width:0; overflow-wrap:anywhere; font-size:12px; line-height:1.35; }
    .estimateRow > .estimateNumber > strong { white-space:nowrap; font-size:12px; }
    .estimateMemo { display:block; margin-top:3px; color:#b07c9c; font-size:11px; font-weight:700; line-height:1.25; }
  }
  .saveStatus { margin:8px 0 0; color:#548c73; font-size:15px; font-weight:700; text-align:center; }
  .leaveConfirmBackdrop { position:fixed; z-index:1000; inset:0; display:grid; place-items:center; padding:20px; background:rgba(35,28,34,.48); }
  .leaveConfirmDialog { display:grid; gap:12px; width:min(100%,420px); padding:22px; border:1px solid #f0d6c8; border-radius:20px; background:#fffdfa; box-shadow:0 16px 44px rgba(35,28,34,.24); }
  .leaveConfirmDialog h2 { margin:0; color:#514751; font-size:20px; }
  .leaveConfirmDialog p { margin:0; color:#65596a; line-height:1.7; }
  .leaveConfirmDialog button { margin:0; }
  .leaveConfirmDialog .secondaryButton { width:100%; }
  .empty { padding:15px 0; color:#a89ba7; font-size:15px; text-align:center; }
  .propertyResults,.savedList { display:grid; gap:12px; max-height:60vh; overflow-y:auto; }
  .propertyResults { margin:-8px 0 18px; }
  .propertyOption { width:100%; padding:13px 15px; border:1px solid #f0d6c8; border-radius:12px; color:#635865; background:#fffaf5; text-align:left; font:inherit; cursor:pointer; }
  .savedItem { display:grid; gap:8px; padding:15px; border:1px solid #f0d6c8; border-radius:16px; background:linear-gradient(180deg,#fff,#fff7f0); box-shadow:0 4px 0 #ead8cb; }
  .savedProperty { color:#514751; font-size:18px; font-weight:800; }
  .savedUnit { color:#d27f6d; font-size:16px; font-weight:800; }
  .savedMeta { color:#958896; font-size:14px; }
  .savedActions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:5px; }
  .actionButton { min-height:44px; padding:7px 6px; border:0; border-radius:11px; color:#fff; font-size:14px; }
  .actionOpen { background:#f08a79; }
  .actionOverwrite { background:#6e91e8; }
  .actionCsv { background:#63bea1; }
  .actionDelete { background:#d87883; }
  .settingsOptions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
  .settingsOption { min-height:50px; border:1px solid #e9dce8; border-radius:14px; color:#75697a; background:#fff; font-size:16px; }
  .settingsOption.active { border-color:#f3a18f; color:#fff; background:linear-gradient(180deg,#ffb49b,#f18c7d); }
  .theme-dark { color:#eee8e2; background:#211f22; }
  .theme-dark .header { border-color:#51484d; }
  .theme-dark .brand,.theme-dark .mavieBrand { color:#f0a08d; }
  .theme-dark .brand { text-shadow:none; }
  .theme-dark .settingsButton,.theme-dark .card input,.theme-dark .card select,.theme-dark .propertyOption,.theme-dark .settingsOption { color:#eee8e2; border-color:#51484d; background:#39343a; }
  .theme-dark .card,.theme-dark .savedItem,.theme-dark .roomSummary,.theme-dark .summary { color:#eee8e2; border-color:#51484d; background:#302c31; box-shadow:none; }
  .theme-dark .main h1,.theme-dark .card h2,.theme-dark .roomSummary h3,.theme-dark .savedProperty,.theme-dark .record { color:#eee8e2; }
  .theme-dark .card label>span,.theme-dark .summaryLine,.theme-dark .record small,.theme-dark .savedMeta { color:#c3b8c0; }
  .theme-dark .address,.theme-dark .numberKeypad { border-color:#51484d; background:#29262a; }
  .theme-dark .room,.theme-dark .measurementType,.theme-dark .keypadButton { color:#eee8e2; border-color:#51484d; background:#39343a; box-shadow:0 4px 0 #282428; }
  .theme-dark .room.active,.theme-dark .measurementType.active,.theme-dark .settingsOption.active { color:#fff; background:#c87568; }
  .theme-dark .empty { color:#b9acb5; }
  .theme-dark .measurementBackButton { color:#f0a08d; border-color:#51484d; background:#39343a; box-shadow:0 4px 0 #282428; }
  .theme-dark .propertyLine { color:#f0a08d; text-shadow:none; }
  .theme-dark .roomCheckTotals,.theme-dark .roomCheckItem { color:#eee8e2; border-color:#51484d; background:#302c31; }
  .theme-dark .roomCheckName { color:#eee8e2; }
  .theme-dark .roomCheckDetails { color:#c3b8c0; }
  .theme-dark .customRoomForm,.theme-dark .customRoomItem { color:#eee8e2; border-color:#51484d; background:#302c31; }
  .theme-dark .customRoomForm label>span,.theme-dark .roomEditForm label>span { color:#c3b8c0; }
  .theme-dark .roomConfirmButton { color:#f0a08d; border-color:#51484d; background:#39343a; }
  .theme-dark .roomCheckItem.confirmed { border-color:#52866b; background:#29392f; }
  .theme-dark .roomCheckItem.confirmed .roomConfirmButton { color:#a5dfbb; border-color:#52866b; background:#29392f; }
  .theme-dark .record { border-color:#51484d; }
  .theme-pop { color:#51414b; background:radial-gradient(circle at 8% 10%,rgba(255,190,215,.65),transparent 25%),radial-gradient(circle at 95% 28%,rgba(185,221,255,.65),transparent 28%),linear-gradient(145deg,#fff8e9,#fff0e6); }
  .theme-pop .header { border-color:#f4b9c9; }
  .theme-pop .measurementBackButton { color:#bc557e; border-color:#f2c5d1; background:#fff0f4; box-shadow:0 4px 0 #f0c7d4; }
  .theme-pop .propertyLine { color:#d95386; text-shadow:0 2px 0 #ffe0e9; }
  .theme-pop .brand { color:#e75d91; text-shadow:0 3px 0 #ffe0e9; }
  .theme-pop .mavieBrand { color:#d95386; }
  .theme-pop .card { border-color:#f3c5ce; background:rgba(255,252,241,.9); box-shadow:0 12px 0 #f5d8c3,0 18px 36px rgba(170,95,130,.12); }
  .theme-pop .main h1,.theme-pop .card h2,.theme-pop .roomSummary h3 { color:#573e50; }
  .theme-pop .settingsButton,.theme-pop .card input,.theme-pop .card select { border-color:#f2c5d1; background:#fffdf5; }
  .theme-pop .address { border-color:#f4bd9c; background:#fff1e4; }
  .theme-pop .room,.theme-pop .measurementType { border-color:#d7c9ed; background:linear-gradient(180deg,#fff,#f4efff); box-shadow:0 4px 0 #ded3f0; }
  .theme-pop .room.active,.theme-pop .measurementType.active { border-color:#ed8db0; background:linear-gradient(180deg,#f7a8c6,#e879a5); box-shadow:0 4px 0 #cc628d; }
  .theme-pop .numberKeypad { border-color:#f4c9ae; background:#fff3e7; }
  .theme-pop .keypadButton { border-color:#c9dcf5; background:linear-gradient(180deg,#fff,#edf5ff); box-shadow:0 4px 0 #cbdcf1; }
  .theme-pop .keypadButton.utility { color:#bc557e; background:#fff0f4; }
  .theme-pop .summary,.theme-pop .roomSummary { border-color:#f2d2bd; background:rgba(255,247,230,.85); }
  .theme-pop .summaryLine { color:#715b6a; }
  .theme-pop .summaryLine strong { color:#d65e88; }
  .theme-pop .settingsOption { border-color:#edcbd9; background:#fffdf7; }
  .theme-pop .settingsOption.active { border-color:#e77ca2; background:linear-gradient(180deg,#f7a8c6,#e879a5); }
  .theme-pop .roomCheckTotals { border-color:#f2d2bd; background:#fff5e7; }
  .theme-pop .roomCheckItem { border-color:#f2d2bd; background:rgba(255,252,241,.9); }
  .theme-pop .roomCheckItem.confirmed { border-color:#a9d8bd; background:#f5fff8; }

  .theme-cyber {
    color:#dafcff;
    background:
      linear-gradient(rgba(0,255,255,.032) 1px,transparent 1px),
      linear-gradient(90deg,rgba(255,0,220,.026) 1px,transparent 1px),
      radial-gradient(circle at 14% 10%,rgba(0,245,255,.16),transparent 25%),
      radial-gradient(circle at 88% 28%,rgba(255,0,214,.14),transparent 26%),
      #05070d;
    background-size:28px 28px,28px 28px,auto,auto,auto;
  }
  .theme-cyber .header { border-color:#00eaff; filter:drop-shadow(0 0 5px rgba(0,234,255,.6)); }
  .theme-cyber .brandGroup { position:relative; }
  .theme-cyber .mavieBrand { color:#ff4fdf; font-family:"Dancing Script","Segoe Script",cursive; text-shadow:0 0 7px #ff00d4; }
  .theme-cyber .brand { color:#8cffff; text-shadow:1px 0 #ff25d8,-1px 0 #00f6ff,0 0 10px rgba(0,246,255,.95); }
  .theme-cyber .main h1,.theme-cyber .card h2,.theme-cyber .roomSummary h3,.theme-cyber .savedProperty,.theme-cyber .record { color:#e8feff; text-shadow:0 0 6px rgba(0,238,255,.34); }
  .theme-cyber .eyebrow,.theme-cyber .propertyLine { color:#61f8ff; text-shadow:0 0 7px rgba(0,238,255,.8); }
  .theme-cyber .subtitle,.theme-cyber .savedMeta,.theme-cyber .record small,.theme-cyber .card label>span,.theme-cyber .summaryLine { color:#9fc6d0; }
  .theme-cyber .card,.theme-cyber .savedItem,.theme-cyber .roomSummary,.theme-cyber .summary,.theme-cyber .customRoomForm,.theme-cyber .customRoomItem,.theme-cyber .estimateRoom {
    color:#dafcff;
    border:1px solid rgba(0,238,255,.58);
    background:linear-gradient(145deg,rgba(5,14,24,.94),rgba(16,5,25,.92));
    box-shadow:0 0 0 1px rgba(255,0,214,.15),0 0 18px rgba(0,238,255,.23),inset 0 0 25px rgba(0,238,255,.025);
    backdrop-filter:blur(10px);
  }
  .theme-cyber .card input,.theme-cyber .card select,.theme-cyber .propertyOption,.theme-cyber .settingsOption,.theme-cyber .estimateFactor input {
    color:#eaffff;
    border:1px solid #00cfe6;
    background:#07111a;
    box-shadow:inset 0 0 8px rgba(0,237,255,.09),0 0 7px rgba(0,237,255,.12);
  }
  .theme-cyber .card input::placeholder { color:#648894; }
  .theme-cyber .card input:focus,.theme-cyber .card select:focus { border-color:#ff37d7; box-shadow:0 0 0 2px rgba(255,55,215,.2),0 0 14px rgba(255,55,215,.38); }
  .theme-cyber .settingsButton,.theme-cyber .measurementBackButton {
    color:#72f9ff; border:1px solid #00e6f6; background:#071019; box-shadow:0 0 9px rgba(0,230,246,.35);
  }
  .theme-cyber .primary,.theme-cyber .add,.theme-cyber .saveButton,.theme-cyber .secondaryButton {
    color:#eaffff;
    border:1px solid #00ebff;
    background:linear-gradient(135deg,#06151d,#11122a 58%,#260c2c);
    box-shadow:0 0 0 1px rgba(255,0,214,.22),0 0 11px rgba(0,235,255,.42),0 4px 0 #001b24;
    text-shadow:0 0 5px rgba(0,241,255,.75);
  }
  .theme-cyber .primary:active,.theme-cyber .add:active,.theme-cyber .saveButton:active,.theme-cyber .secondaryButton:active { transform:translateY(2px); box-shadow:0 0 12px rgba(255,0,214,.48); }
  .theme-cyber .room,.theme-cyber .measurementType,.theme-cyber .keypadButton {
    color:#aafcff;
    border:1px solid rgba(0,230,247,.72);
    background:linear-gradient(180deg,#08131d,#090b15);
    box-shadow:0 3px 0 #001c25,0 0 8px rgba(0,230,247,.2);
  }
  .theme-cyber .room.active,.theme-cyber .measurementType.active,.theme-cyber .settingsOption.active {
    color:#fff;
    border-color:#ff34d6;
    background:linear-gradient(135deg,#08222c,#30102e);
    box-shadow:0 0 12px rgba(255,52,214,.6),inset 0 0 12px rgba(0,238,255,.13);
    text-shadow:0 0 6px #ff7be5;
  }
  .theme-cyber .numberKeypad,.theme-cyber .address { border-color:#176d78; background:#050c13; box-shadow:inset 0 0 18px rgba(0,238,255,.05); }
  .theme-cyber .keypadButton.utility { color:#ff80e6; border-color:#a42b91; background:#170b19; }
  .theme-cyber .record { border-color:#123f49; }
  .theme-cyber .record b,.theme-cyber .summaryLine strong { color:#63fbff; text-shadow:0 0 6px rgba(0,238,255,.65); }
  .theme-cyber .record button,.theme-cyber .dangerButton { color:#ffe8fb; border:1px solid #ff2acb; background:#210a20; box-shadow:0 0 8px rgba(255,42,203,.3); }
  .theme-cyber .summary,.theme-cyber .estimateTotal { border-color:#ff3ad5; background:linear-gradient(135deg,rgba(0,233,255,.07),rgba(255,38,207,.1)); }
  .theme-cyber .estimateTotal strong { color:#6cffff; text-shadow:0 0 9px rgba(0,238,255,.85); }
  .theme-cyber .estimateNote { color:#a9c7ce; border-color:#8d2a85; background:#0d0811; }
  .theme-cyber .saveState.saved { color:#74ffd5; background:#062019; border:1px solid #20c996; }
  .theme-cyber .saveState.dirty { color:#ff9bdc; background:#250816; border:1px solid #ff3ba8; }
  .theme-cyber .actionButton { border:1px solid rgba(0,238,255,.62); box-shadow:0 0 7px rgba(0,238,255,.2); }
  .theme-cyber .actionOpen,.theme-cyber .actionOverwrite { background:#0b1730; color:#8afaff; }
  .theme-cyber .actionCsv { background:#09251e; color:#8cffe0; }
  .theme-cyber .actionDelete { background:#260a20; color:#ff98df; border-color:#ff3ccf; }
  .theme-cyber .empty { color:#668d98; }
  @media (max-width:600px) {
    .measurementActions { gap:16px; margin:18px 0 22px; }
    .measurementTypes { grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr)); gap:12px; }
    .roomTabs { gap:10px; margin:20px 0; }
    .roomNavigation { gap:12px; }
    .crossInputArea .inputRow label { grid-template-rows:30px 52px; }
    .crossInputArea .inputRow input { height:52px; min-height:52px; }
    .crossInputArea .numberKeypad { gap:5px; padding:7px; }
    .crossInputArea .keypadButton { min-height:40px; }
  }
  @media (max-width:420px) {
    .main { width:min(100% - 24px,620px); margin-top:22px; }
    .propertyLine { font-size:19px; overflow-wrap:anywhere; }
    .measurementBackButton { width:100%; min-height:48px; }
    .header { width:calc(100% - 24px); }
    .brand { font-size:30px; }
    .mavieBrand { font-size:20px; }
    .room { font-size:14px; }
    .card { padding:18px; border-radius:20px; }
  }
`

function NumberKeypad({ activeInput, onKey, onDone, decimalInput }) {
  if (!activeInput) return null

  return (
    <div className="numberKeypad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(key => (
        <button key={key} type="button" className="keypadButton" onClick={() => onKey(key)}>{key}</button>
      ))}
      <button type="button" className="keypadButton utility" onClick={() => onKey('clear')}>クリア</button>
      <button type="button" className="keypadButton" onClick={() => onKey('0')}>0</button>
      <button type="button" className="keypadButton utility" onClick={() => onKey('backspace')} aria-label="1文字削除">⌫</button>
      {decimalInput && (
        <button type="button" className="keypadButton" style={{ gridColumn: 'span 2' }} onClick={() => onKey('decimal')}>.</button>
      )}
      <button
        type="button"
        className="keypadButton utility"
        style={{ gridColumn: decimalInput ? 'span 1' : 'span 3' }}
        onClick={onDone}
      >
        入力完了
      </button>
    </div>
  )
}

function RoomManagementControls({
  rooms,
  onAddRoom,
  onRenameRoom,
  onDeleteRoom,
  roomHasData,
}) {
  const [showForm, setShowForm] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [message, setMessage] = useState('')
  const [editingRoom, setEditingRoom] = useState('')
  const [editingName, setEditingName] = useState('')
  const [roomToDelete, setRoomToDelete] = useState('')

  function saveRoom(event) {
    event.preventDefault()
    const name = roomName.trim()
    if (!name) return
    if (rooms.some(room => room.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setMessage('同じ名前の部屋がすでにあります')
      return
    }
    onAddRoom(name)
    setRoomName('')
    setMessage('')
    setShowForm(false)
  }

  function saveEditedRoom(event) {
    event.preventDefault()
    const name = editingName.trim()
    if (!name) return
    if (name.toLocaleLowerCase() !== editingRoom.toLocaleLowerCase() &&
        rooms.some(room => room.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setMessage('同じ名前の部屋がすでにあります')
      return
    }
    onRenameRoom(editingRoom, name)
    setEditingRoom('')
    setEditingName('')
    setMessage('')
  }

  const pendingRoomHasData = roomToDelete ? roomHasData(roomToDelete) : false

  return (
    <section className="customRoomControls" aria-label="部屋の管理">
      <button
        className="secondaryButton"
        type="button"
        onClick={() => {
          setShowForm(previous => !previous)
          setMessage('')
        }}
      >
        ＋ 部屋を追加
      </button>
      {showForm && (
        <form className="customRoomForm" onSubmit={saveRoom}>
          <label>
            <span>部屋名</span>
            <input value={roomName} onChange={event => setRoomName(event.target.value)} />
          </label>
          {message && <p className="saveStatus" role="alert">{message}</p>}
          <button className="primary" type="submit">追加</button>
        </form>
      )}
      <div className="customRoomList">
        {rooms.map(name => (
          <div className="customRoomItem" key={name}>
            {editingRoom === name ? (
              <form className="roomEditForm" onSubmit={saveEditedRoom}>
                <label>
                  <span>部屋名</span>
                  <input value={editingName} onChange={event => setEditingName(event.target.value)} />
                </label>
                {message && <p className="saveStatus" role="alert">{message}</p>}
                <div className="roomManagementActions">
                  <button className="primary" type="submit">保存</button>
                  <button className="secondaryButton" type="button" onClick={() => {
                    setEditingRoom('')
                    setEditingName('')
                    setMessage('')
                  }}>キャンセル</button>
                </div>
              </form>
            ) : (
              <>
                <span>{name}</span>
                <div className="roomManagementActions">
                  <button className="secondaryButton" type="button" onClick={() => {
                    setEditingRoom(name)
                    setEditingName(name)
                    setRoomToDelete('')
                    setMessage('')
                  }}>編集</button>
                  <button className="dangerButton" type="button" onClick={() => {
                    setRoomToDelete(name)
                    setEditingRoom('')
                    setMessage('')
                  }}>削除</button>
                </div>
              </>
            )}
            {roomToDelete === name && (
              <div className="roomDeleteConfirmation" role="alertdialog" aria-label={`${name}の削除確認`}>
                <p>{pendingRoomHasData
                  ? `${name}には採寸データがあります。この部屋を削除すると、クロス・CF・ソフト巾木・メモも削除されます。本当に削除しますか？`
                  : 'この部屋を削除しますか？'}</p>
                <div className="roomManagementActions">
                  <button className="dangerButton" type="button" onClick={() => {
                    onDeleteRoom(name)
                    setRoomToDelete('')
                  }}>削除する</button>
                  <button className="secondaryButton" type="button" onClick={() => setRoomToDelete('')}>キャンセル</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function getRecordQuantity(record) {
  return Number(record.quantity) || Number(record.height || 0) * Number(record.count || 0)
}

function formatQuantity(value) {
  const quantity = Number(value)
  return (Math.round((quantity + Number.EPSILON) * 10) / 10).toFixed(1)
}

function getLengthQuantity(record) {
  if (typeof record.quantity === 'number' && Number.isFinite(record.quantity)) {
    return record.quantity
  }
  return Number(record.length || 0) * Number(record.count || 0)
}

function getSoftBaseboardQuantity(record) {
  return Number(record.quantity || 0)
}

function sumRecords(records, roomName, type) {
  return records
    .filter(record => record.room === roomName && record.type === type)
    .reduce((sum, record) => sum + getRecordQuantity(record), 0)
}

function getSaveKey(company, property, unit) {
  return `${storagePrefix}${JSON.stringify([
    company,
    property?.name || '',
    property?.address || '',
    unit.trim(),
  ])}`
}

function readSavedEntries() {
  try {
    const entries = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key?.startsWith(storagePrefix)) continue
      try {
        const data = JSON.parse(localStorage.getItem(key))
        if (data && Array.isArray(data.records)) {
          entries.push({ ...data, archived: Boolean(data.archived), storageKey: key })
        }
      } catch {
        // 読み込めないデータは一覧から除外
      }
    }
    return entries.sort(
      (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
    )
  } catch {
    return []
  }
}

function formatSavedDate(value) {
  if (!value) return '保存日時不明'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '保存日時不明'
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function escapeCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

const mCrossFileType = 'M-Cross saved property'
const mCrossFileVersion = 1

function makeSafeFileName(value) {
  return String(value || '物件')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeImportedEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('保存データの形式が正しくありません。')
  }
  const requiredText = ['company', 'propertyName', 'address', 'unit']
  for (const key of requiredText) {
    if (typeof value[key] !== 'string') {
      throw new Error('物件情報が不足しています。')
    }
  }
  if (!value.propertyName.trim() || !value.unit.trim()) {
    throw new Error('物件名または号室がありません。')
  }
  return {
    company: value.company,
    propertyName: value.propertyName,
    address: value.address,
    unit: value.unit.trim(),
    records: Array.isArray(value.records) ? value.records : [],
    cfRecords: Array.isArray(value.cfRecords) ? value.cfRecords : [],
    softRecords: Array.isArray(value.softRecords) ? value.softRecords : [],
    floorTrimRecords: Array.isArray(value.floorTrimRecords) ? value.floorTrimRecords : [],
    additionalWorks: Array.isArray(value.additionalWorks) ? value.additionalWorks : [],
    draftMemo: typeof value.draftMemo === 'string' ? value.draftMemo : '',
    rooms: Array.isArray(value.rooms) && value.rooms.length ? value.rooms : defaultRooms,
    roomConfirmations: value.roomConfirmations && typeof value.roomConfirmations === 'object' && !Array.isArray(value.roomConfirmations)
      ? value.roomConfirmations
      : {},
    pageIndex: Number.isInteger(value.pageIndex) ? value.pageIndex : 0,
    cfPageIndex: Number.isInteger(value.cfPageIndex) ? value.cfPageIndex : 0,
    softPageIndex: Number.isInteger(value.softPageIndex) ? value.softPageIndex : 0,
    activePage: typeof value.activePage === 'string' ? value.activePage : 'cross',
    measurementType: measurementTypes.includes(value.measurementType) ? value.measurementType : '天井',
    caseCrossFactor: Math.max(0, Number(value.caseCrossFactor) || 0),
    archived: Boolean(value.archived),
    updatedAt: new Date().toISOString(),
  }
}

function downloadMCrossData(entry) {
  try {
    const data = normalizeImportedEntry(entry)
    const packageData = {
      fileType: mCrossFileType,
      version: mCrossFileVersion,
      exportedAt: new Date().toISOString(),
      data,
    }
    const blob = new Blob([JSON.stringify(packageData, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${makeSafeFileName(data.propertyName)}_${makeSafeFileName(data.unit)}号室.mcross`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    console.error('M-Crossデータを書き出せませんでした。', error)
    window.alert('M-Crossデータを書き出せませんでした。')
  }
}

function downloadCsv(entry) {
  const headers = [
    '管理会社', '物件名', '住所', '号室', '部屋名',
    '採寸区分', '高さ', '本数', '数量', 'メモ',
  ]
  const rows = (entry.records || []).map(record => [
    entry.company,
    entry.propertyName,
    entry.address,
    entry.unit,
    record.room,
    record.type,
    record.height,
    record.count,
    getRecordQuantity(record),
    record.memo || '',
  ])
  const csv = [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\r\n')
  const bom = new Uint8Array([0xef, 0xbb, 0xbf])
  const blob = new Blob([bom, new TextEncoder().encode(csv)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const safeName = `${entry.propertyName || '物件'}_${entry.unit || '号室'}`.replace(/[\\\/:*?"<>|]/g, '_')
  link.href = url
  link.download = `${safeName}_採寸データ.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function downloadExcel(entry) {
  try {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'MavieSelect'
  workbook.created = new Date()

  const exportedAt = new Intl.DateTimeFormat('ja-JP').format(new Date())
  const metadata = [
    ['管理会社', entry.company || ''],
    ['物件名', entry.propertyName || ''],
    ['住所', entry.address || ''],
    ['号室', entry.unit || ''],
    ['出力日', exportedAt],
  ]

  function addWorksheet(name, tabColor, columns, rows) {
    const worksheet = workbook.addWorksheet(name, {
      properties: { tabColor: { argb: tabColor } },
      views: [{ state: 'frozen', ySplit: 8 }],
    })
    const lastColumn = columns.length
    const displayLastColumn = Math.max(lastColumn, 6)

    worksheet.mergeCells(1, 1, 1, displayLastColumn)
    const titleCell = worksheet.getCell(1, 1)
    titleCell.value = `${name} 採寸データ`
    titleCell.font = { name: 'Yu Gothic', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tabColor } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
    worksheet.getRow(1).height = 28

    metadata.forEach(([label, value], index) => {
      const rowNumber = index + 3
      worksheet.mergeCells(rowNumber, 2, rowNumber, displayLastColumn)
      const labelCell = worksheet.getCell(rowNumber, 1)
      labelCell.value = label
      labelCell.font = { name: 'Yu Gothic', bold: true }
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F7' } }
      const valueCell = worksheet.getCell(rowNumber, 2)
      valueCell.value = value
      valueCell.font = { name: 'Yu Gothic' }
      valueCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false }
      labelCell.alignment = { vertical: 'middle', horizontal: 'left' }
    })

    const headerRow = worksheet.getRow(8)
    headerRow.values = columns
    headerRow.height = 22
    headerRow.eachCell(cell => {
      cell.font = { name: 'Yu Gothic', bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tabColor } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
    worksheet.autoFilter = {
      from: { row: 8, column: 1 },
      to: { row: 8, column: lastColumn },
    }

    rows.forEach(row => {
      const dataRow = worksheet.addRow(row)
      dataRow.eachCell(cell => {
        cell.font = { name: 'Yu Gothic' }
        cell.alignment = { vertical: 'middle' }
      })
    })

    function getMeasurementDisplayLength(value) {
      return [...String(value ?? '')].reduce((length, character) => {
        const code = character.charCodeAt(0)
        return length + (code > 0xff ? 2 : 1)
      }, 0)
    }

    for (let columnIndex = 1; columnIndex <= lastColumn; columnIndex += 1) {
      const column = worksheet.getColumn(columnIndex)
      const headerText = String(columns[columnIndex - 1] || '')
      const maxLength = column.values.reduce(
        (max, value) => Math.max(max, getMeasurementDisplayLength(value)),
        getMeasurementDisplayLength(headerText)
      )

      let minimumWidth = 6
      let maximumWidth = 20
      let extraWidth = 1.5

      if (headerText === '部屋名') {
        minimumWidth = 8
        maximumWidth = 16
      } else if (headerText === '採寸区分') {
        minimumWidth = 10
        maximumWidth = 16
      } else if (headerText === 'メモ') {
        minimumWidth = 14
        maximumWidth = 30
        extraWidth = 2
      } else if (['長さ', '高さ', '本数', '枚数', '数量'].includes(headerText)) {
        minimumWidth = 10
        maximumWidth = 12
        extraWidth = 2
      } else if (headerText === '単位') {
        minimumWidth = 5
        maximumWidth = 6
        extraWidth = 1
      } else if (['部屋①', '部屋②'].includes(headerText)) {
        minimumWidth = 10
        maximumWidth = 18
      } else if (headerText === 'カラー') {
        minimumWidth = 10
        maximumWidth = 14
      }

      column.width = Math.max(
        minimumWidth,
        Math.min(maximumWidth, maxLength + extraWidth)
      )
      column.alignment = {
        vertical: 'middle',
        horizontal: ['長さ', '高さ', '本数', '枚数', '数量'].includes(headerText) ? 'right' : 'left',
        wrapText: maxLength + extraWidth > maximumWidth,
      }
    }

    if (name === 'ソフト巾木') {
      worksheet.getColumn(1).width = Math.max(12, worksheet.getColumn(1).width || 0)
      worksheet.getColumn(2).width = Math.max(10, worksheet.getColumn(2).width || 0)
      worksheet.getColumn(3).width = Math.max(10, worksheet.getColumn(3).width || 0)
    }

    // Final layout override: make property information visibly start at the left edge.
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
    metadata.forEach(([, value], index) => {
      const rowNumber = index + 3
      const labelCell = worksheet.getCell(rowNumber, 1)
      const valueCell = worksheet.getCell(rowNumber, 2)
      valueCell.value = value
      labelCell.alignment = { vertical: 'middle', horizontal: 'left' }
      valueCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false }
    })

    // Keep the soft-baseboard sheet as readable as the other measurement sheets.
    if (name === 'ソフト巾木') {
      worksheet.getColumn(1).width = 18
      worksheet.getColumn(2).width = 14
      worksheet.getColumn(3).width = 14
      worksheet.getColumn(4).width = 12
      worksheet.getColumn(5).width = 12
      worksheet.getColumn(6).width = 12
      worksheet.getRow(8).height = 24
      worksheet.getCell(8, 1).alignment = { vertical: 'middle', horizontal: 'left' }
      worksheet.getCell(8, 2).alignment = { vertical: 'middle', horizontal: 'center' }
      worksheet.getCell(8, 3).alignment = { vertical: 'middle', horizontal: 'center' }
    }
  }

  const crossRows = (entry.records || []).map(record => [
    record.room || '',
    record.type || '',
    record.memo || '',
    Number(record.height || 0),
    Number(record.count || 0),
    Number(formatQuantity(getRecordQuantity(record))),
  ])
  const cfRows = (entry.cfRecords || []).map(record => [
    record.room || '',
    record.memo || '',
    Number(record.length || 0),
    Number(record.count || 0),
    Number(formatQuantity(getLengthQuantity(record))),
  ])
  const softRows = (entry.softRecords || []).map(record => {
    const quantity = Number(formatQuantity(getSoftBaseboardQuantity(record)))
    return [record.room || '', quantity, quantity]
  })

  addWorksheet('クロス', 'FFF08A79', ['部屋名', '採寸区分', 'メモ', '長さ', '本数', '数量'], crossRows)
  addWorksheet('CF', 'FF6E91E8', ['部屋名', 'メモ', '長さ', '本数', '数量'], cfRows)
  addWorksheet('ソフト巾木', 'FF63BEA1', ['部屋名', '枚数', '数量'], softRows)
  const floorTrimRows = (entry.floorTrimRecords || []).map(record => [record.roomA || '', record.roomB || '', record.color || '', Number(record.quantity || 0), '本'])
  if (floorTrimRows.length > 0) addWorksheet('床見切り', 'FFC6A4E8', ['部屋①', '部屋②', 'カラー', '数量', '単位'], floorTrimRows)
  const additionalWorkRows = (entry.additionalWorks || []).map(item => [
    item.room || '', item.work || '', Number(item.quantity || 0), item.unit || '式',
    Number(item.unitPrice || 0), Number(item.amount || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), item.memo || '',
  ])
  if (additionalWorkRows.length > 0) addWorksheet('追加作業', 'FFF0A36E', ['部屋', '作業内容', '数量', '単位', '単価', '金額', 'メモ'], additionalWorkRows)

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const safeName = `${entry.propertyName || '物件'}_${entry.unit || '号室'}`.replace(/[\\/:*?"<>|]/g, '_')
  const fileName = `${safeName}_採寸データ.xlsx`
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    console.error('Excelファイルを出力できませんでした。', error)
    window.alert('Excelファイルを出力できませんでした。')
  }
}

function LengthMeasurementPage({
  title,
  rooms,
  records,
  setRecords,
  pageIndex,
  setPageIndex,
  countOnly = false,
  onRoomRecordsChanged,
}) {
  const [length, setLength] = useState('')
  const [count, setCount] = useState('')
  const [memo, setMemo] = useState('')
  const [activeInput, setActiveInput] = useState('')
  const memoInputRef = useRef(null)
  const lengthRoomAreaRef = useRef(null)
  const lengthEntryAreaRef = useRef(null)
  const lengthInputAreaRef = useRef(null)
  const isSummaryPage = pageIndex === rooms.length
  const room = isSummaryPage ? '' : rooms[pageIndex]
  const roomRecords = records.filter(item => item.room === room)
  const unit = countOnly ? '枚' : 'm'
  const getQuantity = countOnly ? getSoftBaseboardQuantity : getLengthQuantity
  const roomTotals = rooms.reduce((totals, roomName) => {
    totals[roomName] = records
      .filter(item => item.room === roomName)
      .reduce((sum, item) => sum + getQuantity(item), 0)
    return totals
  }, {})
  const total = Object.values(roomTotals).reduce((sum, value) => sum + value, 0)

  useEffect(() => {
    const firstFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        lengthRoomAreaRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      })
    })
    return () => cancelAnimationFrame(firstFrame)
  }, [])

  function goToPage(index) {
    const nextIndex = Math.max(0, Math.min(index, rooms.length))
    setPageIndex(nextIndex)
    setActiveInput('')
    setLength('')
    setCount('')
    setMemo('')

    if (nextIndex < rooms.length) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          lengthEntryAreaRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        })
      })
    }
  }

  function updateInput(key) {
    if (!activeInput) return
    const isLengthInput = activeInput === 'length'
    const currentValue = isLengthInput ? length : count
    const setValue = isLengthInput ? setLength : setCount
    if (key === 'clear') return setValue('')
    if (key === 'backspace') return setValue(currentValue.slice(0, -1))
    if (key === 'decimal') {
      if (!isLengthInput || currentValue.includes('.')) return
      return setValue(currentValue ? `${currentValue}.` : '0.')
    }
    setValue(`${currentValue}${key}`)
  }

  function addRecord(event) {
    event.preventDefault()
    if (countOnly) {
      const quantity = Number(count)
      if (!Number.isInteger(quantity) || quantity < 1) return
      setRecords(prev => [...prev, { id: createRecordId(), room, quantity, memo: memo.trim() }])
    } else {
      const numericLength = Number(length.replace(/[。．]/g, '.'))
      const numericCount = Number(count)
      if (!Number.isFinite(numericLength) || numericLength <= 0 || !Number.isInteger(numericCount) || numericCount < 1) return
      setRecords(prev => [...prev, {
        id: createRecordId(), room, length: numericLength, count: numericCount, memo: memo.trim(),
      }])
    }
    onRoomRecordsChanged(room)
    setLength('')
    setCount('')
    setMemo('')
    setActiveInput('')
  }
  function addQuickMemo(text) {
    const words = memo.trim() ? memo.trim().split(/\s+/) : []
    if (!words.includes(text)) setMemo([...words, text].join(' '))
  }
  return (
    <>
      <nav ref={lengthRoomAreaRef} className="roomTabs" aria-label={`${title}の部屋`}>
        {rooms.map((name, index) => (
          <button key={name} type="button" className={pageIndex === index ? 'room active' : 'room'} onClick={() => goToPage(index)}>{name}</button>
        ))}
        <button type="button" className={isSummaryPage ? 'room active' : 'room'} onClick={() => goToPage(rooms.length)}>全室合計</button>
      </nav>

      {isSummaryPage ? (
        <section className="card">
          <h2>部屋ごとの{title}合計</h2>
          {rooms.map(roomName => (
            <div className="roomSummary" key={roomName}>
              <h3>{roomName}</h3>
              <div className="summaryLine"><span>{title}</span><strong>{formatQuantity(roomTotals[roomName] || 0)}{unit}</strong></div>
            </div>
          ))}
          <div className="summary">
            <div className="summaryLine summaryGrand"><span>全室{title}合計</span><strong>{formatQuantity(total)}{unit}</strong></div>
          </div>
        </section>
      ) : (
        <>
          <section ref={lengthEntryAreaRef} className="card">
            <h2>{room}</h2>
            <form ref={lengthInputAreaRef} onSubmit={addRecord}>
              {countOnly ? (
                <div className="inputRow" style={{ gridTemplateColumns: '1fr' }}>
                  <label><span>枚数</span><input type="text" inputMode="none" readOnly value={count} onFocus={() => setActiveInput('count')} onClick={() => setActiveInput('count')} placeholder="タップ" /></label>
                </div>
              ) : (
                <div className="inputRow">
                  <label><span>長さ（メートル）</span><input type="text" inputMode="none" readOnly value={length} onFocus={() => setActiveInput('length')} onClick={() => setActiveInput('length')} placeholder="タップ" /></label>
                  <label><span>本数</span><input type="text" inputMode="none" readOnly value={count} onFocus={() => setActiveInput('count')} onClick={() => setActiveInput('count')} placeholder="タップ" /></label>
                </div>
              )}
              <NumberKeypad activeInput={activeInput} onKey={updateInput} onDone={() => setActiveInput('')} decimalInput={!countOnly && activeInput === 'length'} />
              <label>
                <span>メモ</span>
                <input ref={memoInputRef} className="memoInput" type="text" value={memo} onChange={event => setMemo(event.target.value)} placeholder="例：窓面、収納内" />
              </label>
              <button className="add" type="submit">{countOnly ? '＋ ソフト巾木登録' : `＋ ${title}の内容を登録`}</button>
            </form>
            <div className="records">
              {!countOnly && <h2>{room}の{title}登録</h2>}
              {roomRecords.length === 0 ? (
                <p className="empty">{room}の{title}登録内容はありません</p>
              ) : roomRecords.map(item => (
                <div className="record" key={item.id}>
                  <div>
                    <strong>{countOnly ? 'ソフト巾木登録' : title}</strong>
                    <small>{countOnly ? `${formatQuantity(item.quantity)}枚` : `${Number(item.length).toFixed(2)}m × ${item.count}本`}</small>
                    {item.memo && <small>メモ：{item.memo}</small>}
                  </div>
                  <b>{formatQuantity(getQuantity(item))}{unit}</b>
                  <button type="button" onClick={() => {
                    setRecords(prev => prev.filter(record => record.id !== item.id))
                    onRoomRecordsChanged(room)
                  }} aria-label={`${room}の${title}登録を削除`}>×</button>
                </div>
              ))}
            </div>
            <div className="summary">
              <div className="summaryLine summaryGrand"><span>{room}の{title}合計</span><strong>{formatQuantity(roomTotals[room] || 0)}{unit}</strong></div>
            </div>
          </section>
          <div className="roomNavigation">
            <button className="back" type="button" disabled={pageIndex === 0} onClick={() => goToPage(pageIndex - 1)}>← 前の部屋</button>
            <button className="primary roomNavigationNext" type="button" onClick={() => goToPage(pageIndex + 1)}>
              {pageIndex === rooms.length - 1 ? '全室合計へ →' : '次の部屋 →'}
            </button>
          </div>
        </>
      )}
    </>
  )
}

function FloorTrimSection({ rooms, records, setRecords, onChanged }) {
  const [roomA, setRoomA] = useState(rooms[0] || '')
  const [roomB, setRoomB] = useState(rooms[1] || rooms[0] || '')
  const [color, setColor] = useState('シルバー')
  const [quantity, setQuantity] = useState('1')

  useEffect(() => {
    if (!rooms.includes(roomA)) setRoomA(rooms[0] || '')
    if (!rooms.includes(roomB)) setRoomB(rooms[1] || rooms[0] || '')
  }, [rooms, roomA, roomB])

  function addFloorTrim(event) {
    event.preventDefault()
    const numericQuantity = Number(quantity)
    if (!roomA || !roomB || roomA === roomB || !Number.isInteger(numericQuantity) || numericQuantity < 1) return
    setRecords(previous => [...previous, {
      id: createRecordId(), roomA, roomB, color, quantity: numericQuantity,
    }])
    setQuantity('1')
    onChanged()
  }

  return (
    <section className="card floorTrimSection">
      <h2>床見切り</h2>
      <form onSubmit={addFloorTrim}>
        <div className="floorTrimGrid">
          <label><span>部屋①</span><select value={roomA} onChange={event => setRoomA(event.target.value)}>{rooms.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
          <label><span>部屋②</span><select value={roomB} onChange={event => setRoomB(event.target.value)}>{rooms.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
        </div>
        <label><span>カラー</span></label>
        <div className="floorTrimColorOptions">
          {['シルバー', 'アンバー'].map(value => <button key={value} type="button" className={`floorTrimColorButton${color === value ? ' active' : ''}`} onClick={() => setColor(value)}>{value}</button>)}
        </div>
        <label><span>数量（本）</span><input type="number" min="1" step="1" value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
        {roomA === roomB && <p className="saveStatus" role="alert">異なる部屋を選んでください</p>}
        <button className="add" type="submit">＋ 床見切りを登録</button>
      </form>
      <div className="records">
        {records.length === 0 ? <p className="empty">床見切りの登録はありません</p> : records.map(item => (
          <div className="record" key={item.id}>
            <div><strong>{item.roomA}⇔{item.roomB}</strong><small>床見切り取付・{item.color}</small></div>
            <b>{formatQuantity(item.quantity)}本</b>
            <button type="button" onClick={() => { setRecords(previous => previous.filter(record => record.id !== item.id)); onChanged() }} aria-label="床見切りを削除">×</button>
          </div>
        ))}
      </div>
    </section>
  )
}

function FinalReviewPage({
  rooms,
  crossTotal,
  cfTotal,
  softTotal,
  floorTrimTotal,
  additionalWorks,
  setAdditionalWorks,
  commonWorks,
  setCommonWorks,
  onChanged,
}) {
  const [room, setRoom] = useState(rooms[0] || '')
  const [work, setWork] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('式')
  const [unitPrice, setUnitPrice] = useState('')
  const [memo, setMemo] = useState('')

  function addWork(event) {
    event.preventDefault()
    const numericQuantity = Number(quantity)
    const numericUnitPrice = Math.max(0, Number(unitPrice) || 0)
    if (!room || !work.trim() || !Number.isFinite(numericQuantity) || numericQuantity <= 0) return
    setAdditionalWorks(previous => [...previous, {
      id: createRecordId(), room, work: work.trim(), quantity: numericQuantity, unit,
      unitPrice: numericUnitPrice, amount: numericQuantity * numericUnitPrice, memo: memo.trim(),
    }])
    setWork('')
    setQuantity('1')
    setUnitPrice('')
    setMemo('')
    onChanged()
  }

  function addCommonWork() {
    const value = window.prompt('よく使う項目名を入力してください')?.trim()
    if (!value || commonWorks.includes(value)) return
    const next = [...commonWorks, value]
    setCommonWorks(next)
    localStorage.setItem(commonAdditionalWorksKey, JSON.stringify(next))
  }

  function deleteCommonWork(value) {
    const next = commonWorks.filter(item => item !== value)
    setCommonWorks(next)
    localStorage.setItem(commonAdditionalWorksKey, JSON.stringify(next))
  }

  return (
    <>
      <section className="card">
        <h2>✅ 最終確認</h2>
        <p className="subtitle">内装数量と、内装以外の追加作業を確認してください。</p>
        <div className="reviewTotals">
          <div className="reviewTotal"><span>クロス合計</span><strong>{formatQuantity(crossTotal)}㎡</strong></div>
          <div className="reviewTotal"><span>CF合計</span><strong>{formatQuantity(cfTotal)}㎡</strong></div>
          <div className="reviewTotal"><span>ソフト巾木</span><strong>{formatQuantity(softTotal)}枚</strong></div>
          <div className="reviewTotal"><span>床見切り</span><strong>{formatQuantity(floorTrimTotal)}本</strong></div>
        </div>
      </section>

      <section className="card">
        <h2>🔧 内装以外の追加作業</h2>
        <div className="commonWorkButtons" aria-label="よく使う追加作業">
          {commonWorks.map(value => (
            <button key={value} className="quickMemoButton" type="button" onClick={() => setWork(value)} onContextMenu={event => { event.preventDefault(); deleteCommonWork(value) }}>{value}</button>
          ))}
          <button className="quickMemoButton" type="button" onClick={addCommonWork}>＋ よく使う項目</button>
        </div>

        <form className="additionalWorkForm" onSubmit={addWork}>
          <label><span>部屋</span><select value={room} onChange={event => setRoom(event.target.value)}>{rooms.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
          <label><span>作業内容</span><input value={work} onChange={event => setWork(event.target.value)} placeholder="例：畳表替え、電球交換" /></label>
          <div className="additionalWorkGrid">
            <label><span>数量</span><input type="number" min="0.1" step="0.1" value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
            <label><span>単位</span><select value={unit} onChange={event => setUnit(event.target.value)}>{['式','個','本','枚','台','箇所'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <label><span>単価（円）</span><input type="number" min="0" step="1" value={unitPrice} onChange={event => setUnitPrice(event.target.value)} placeholder="0" /></label>
            <label><span>金額</span><input type="text" readOnly value={formatYen((Number(quantity) || 0) * (Number(unitPrice) || 0))} /></label>
            <label><span>メモ</span><input value={memo} onChange={event => setMemo(event.target.value)} placeholder="任意" /></label>
          </div>
          <button className="add" type="submit">＋ 追加作業を登録</button>
        </form>

        <div className="records">
          {additionalWorks.length === 0 ? <p className="empty">追加作業はありません</p> : additionalWorks.map(item => (
            <div className="additionalWorkItem" key={item.id}>
              <div><strong>{item.room}　{item.work}</strong><small>{item.memo || 'メモなし'}</small></div>
              <div><b>{formatQuantity(item.quantity)}{item.unit}</b><small>{formatYen(Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</small></div>
              <button type="button" onClick={() => { setAdditionalWorks(previous => previous.filter(record => record.id !== item.id)); onChanged() }} aria-label="追加作業を削除">×</button>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [propertyMasterState, setPropertyMasterState] = useState(loadPropertyMaster)
  const [masterCompanyName, setMasterCompanyName] = useState('')
  const [editingCompanyId, setEditingCompanyId] = useState('')
  const [masterPropertyCompanyId, setMasterPropertyCompanyId] = useState('')
  const [showPropertyForm, setShowPropertyForm] = useState(false)
  const [editingPropertyId, setEditingPropertyId] = useState('')
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    address: '',
    reading: '',
    aliases: '',
  })
  const [managementScrollTarget, setManagementScrollTarget] = useState('')
  const companyFormRef = useRef(null)
  const propertyListRef = useRef(null)
  const propertyFormRef = useRef(null)
  const [masterStatus, setMasterStatus] = useState(propertyMasterState.error)
  const [fontSize, setFontSize] = useState(() => readPreference(fontSizeKey, 'medium'))
  const [theme, setTheme] = useState(() => readPreference(themeKey, 'beige'))
  const [pricingSettings, setPricingSettings] = useState(loadPricingSettings)

  const [company, setCompany] = useState('')
  const [propertySearch, setPropertySearch] = useState('')
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [unit, setUnit] = useState('')
  const [started, setStarted] = useState(false)
  const [showSavedList, setShowSavedList] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false)
  const [workingDraft, setWorkingDraft] = useState(null)
  const [showDraftRecovery, setShowDraftRecovery] = useState(false)
  const pendingNavigationRef = useRef(null)
  const importFileInputRef = useRef(null)
  const [savedEntries, setSavedEntries] = useState([])
  const [savedSearch, setSavedSearch] = useState('')
  const [savedCompanyFilter, setSavedCompanyFilter] = useState('')
  const [savedSortOrder, setSavedSortOrder] = useState('newest')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedSavedKeys, setSelectedSavedKeys] = useState([])
  const [currentStorageKey, setCurrentStorageKey] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [projectRooms, setProjectRooms] = useState(defaultRooms)
  const [roomConfirmations, setRoomConfirmations] = useState({})
  const [showMeasurementCheck, setShowMeasurementCheck] = useState(false)
  const [showRoomManagement, setShowRoomManagement] = useState(false)
  const [showEstimate, setShowEstimate] = useState(false)
  const [caseCrossFactor, setCaseCrossFactor] = useState(() => String(loadPricingSettings().crossFactor))
  const [returnToMeasurementCheck, setReturnToMeasurementCheck] = useState(false)
  const [estimateCopyFormat, setEstimateCopyFormat] = useState(() => readPreference(estimateCopyFormatKey, 'merged'))
  const [measurementType, setMeasurementType] = useState('天井')
  const [height, setHeight] = useState('')
  const [count, setCount] = useState('')
  const [memo, setMemo] = useState('')
  const [activeInput, setActiveInput] = useState('')
  const heightInputRef = useRef(null)
  const countInputRef = useRef(null)
  const crossInputAreaRef = useRef(null)
  const crossRoomAreaRef = useRef(null)
  const crossTypeAreaRef = useRef(null)
  const memoInputRef = useRef(null)
  const [records, setRecords] = useState([])
  const [saveStatus, setSaveStatus] = useState('')
  const [activePage, setActivePage] = useState('cross')
  const [cfPageIndex, setCfPageIndex] = useState(0)
  const [softPageIndex, setSoftPageIndex] = useState(0)
  const [cfRecords, setCfRecords] = useState([])
  const [softRecords, setSoftRecords] = useState([])
  const [floorTrimRecords, setFloorTrimRecords] = useState([])
  const [additionalWorks, setAdditionalWorks] = useState([])
  const [commonAdditionalWorks, setCommonAdditionalWorks] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(commonAdditionalWorksKey) || 'null')
      return Array.isArray(stored) && stored.length ? stored : defaultCommonAdditionalWorks
    } catch {
      return defaultCommonAdditionalWorks
    }
  })
  const rooms = projectRooms

  useEffect(() => {
    const showNewPropertyScreen = () => {
      setStarted(false)
      setShowSavedList(false)
      setSettingsOpen(false)
      setShowEstimate(false)
      setShowRoomManagement(false)
      setShowMeasurementCheck(false)
      setCompany('')
      setPropertySearch('')
      setSelectedProperty(null)
      setUnit('')
      setCurrentStorageKey('')
      setIsDirty(false)
    }
    showNewPropertyScreen()
    const handlePageShow = event => { if (event.persisted) showNewPropertyScreen() }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])
  useEffect(() => {
    try {
      const stored = localStorage.getItem(workingDraftKey)
      if (!stored) return

      const draft = JSON.parse(stored)
      if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
        localStorage.removeItem(workingDraftKey)
        return
      }

      setWorkingDraft(draft)
      setShowDraftRecovery(true)
    } catch {
      try { localStorage.removeItem(workingDraftKey) } catch { /* 復旧不能なデータは無視 */ }
    }
  }, [])
  useEffect(() => {
    if (!started || !isDirty) return
    if (!company || !selectedProperty || !unit.trim()) return

    const draft = {
      company,
      propertyName: selectedProperty.name || '',
      address: selectedProperty.address || '',
      unit: unit.trim(),
      records,
      cfRecords,
      softRecords,
      floorTrimRecords,
      additionalWorks,
      draftMemo: memo,
      rooms,
      roomConfirmations,
      pageIndex,
      cfPageIndex,
      softPageIndex,
      activePage,
      measurementType,
      caseCrossFactor,
      currentStorageKey,
      updatedAt: new Date().toISOString(),
    }

    try {
      localStorage.setItem(workingDraftKey, JSON.stringify(draft))
      setWorkingDraft(draft)
    } catch (error) {
      console.error('作業中データを自動保存できませんでした。', error)
    }
  }, [
    started,
    isDirty,
    company,
    selectedProperty,
    unit,
    records,
    cfRecords,
    softRecords,
    floorTrimRecords,
    additionalWorks,
    memo,
    rooms,
    roomConfirmations,
    pageIndex,
    cfPageIndex,
    softPageIndex,
    activePage,
    measurementType,
    caseCrossFactor,
    currentStorageKey,
  ])
  useEffect(() => {
    if (!activeInput) return

    const frame = requestAnimationFrame(() => {
      if (activeInput === 'height') heightInputRef.current?.focus()
      if (activeInput === 'count') countInputRef.current?.focus()

      crossInputAreaRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [activeInput])

  useEffect(() => {
    if (!managementScrollTarget) return

    const frame = requestAnimationFrame(() => {
      const target = {
        companyForm: companyFormRef.current,
        propertyList: propertyListRef.current,
        propertyForm: propertyFormRef.current,
      }[managementScrollTarget]

      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setManagementScrollTarget('')
    })

    return () => cancelAnimationFrame(frame)
  }, [managementScrollTarget, masterPropertyCompanyId, showPropertyForm, editingCompanyId])

  useEffect(() => {
    if (!started || !isDirty) return undefined

    const warnBeforeUnload = event => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [started, isDirty])

  const isSummaryPage = pageIndex === rooms.length
  const room = isSummaryPage ? '' : rooms[pageIndex]
  const mergedPropertyMaster = useMemo(
    () => getMergedPropertyMaster(propertyMasterState.master),
    [propertyMasterState.master]
  )
  const companies = mergedPropertyMaster.companies.map(item => item.name)
  const companyProperties = company
    ? mergedPropertyMaster.properties.filter(item => item.company === company)
    : []
  const queryForms = useMemo(() => searchForms(propertySearch), [propertySearch])
  const filteredProperties = queryForms.length
    ? companyProperties.filter(item => matchesProperty(item, queryForms))
    : []
  const roomRecords = records.filter(item => item.room === room && item.type === measurementType)
  const totalsByType = measurementTypes.reduce((totals, type) => {
    totals[type] = records.reduce(
      (sum, item) => sum + (item.type === type ? getRecordQuantity(item) : 0),
      0
    )
    return totals
  }, {})
  const grandTotal = Object.values(totalsByType).reduce((sum, value) => sum + value, 0)

  const visibleSavedEntries = useMemo(() => {
    const query = savedSearch.trim().toLocaleLowerCase()

    return savedEntries
      .filter(entry => Boolean(entry.archived) === showArchived)
      .filter(entry => !savedCompanyFilter || entry.company === savedCompanyFilter)
      .filter(entry =>
        !query || String(entry.propertyName || '').toLocaleLowerCase().includes(query)
      )
      .sort((a, b) => {
        if (savedSortOrder === 'property') {
          return String(a.propertyName || '').localeCompare(String(b.propertyName || ''), 'ja')
        }
        if (savedSortOrder === 'oldest') {
          return new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0)
        }
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      })
  }, [savedEntries, savedSearch, savedCompanyFilter, savedSortOrder, showArchived])

  const savedCompanyOptions = [...new Set(
    savedEntries.map(entry => entry.company).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'ja'))

  const savedCount = savedEntries.filter(
    entry => Boolean(entry.archived) === showArchived
  ).length
  const confirmedRoomCount = rooms.filter(roomName => roomConfirmations[roomName]).length

  function markRoomUnconfirmed(roomName) {
    setRoomConfirmations(previous => {
      if (!previous[roomName]) return previous
      const next = { ...previous }
      delete next[roomName]
      return next
    })
    markUnsaved()
  }

  function toggleRoomConfirmation(roomName) {
    setRoomConfirmations(previous => {
      const next = { ...previous }
      if (next[roomName]) delete next[roomName]
      else next[roomName] = true
      return next
    })
    markUnsaved()
  }

  function markUnsaved() {
    setIsDirty(true)
    setSaveStatus('')
  }

  function updatePricingSetting(field, value, crossType = '') {
    const numericValue = Math.max(0, Number(value) || 0)
    setPricingSettings(previous => {
      const next = crossType
        ? { ...previous, crossRates: { ...previous.crossRates, [crossType]: numericValue } }
        : { ...previous, [field]: numericValue }
      try { localStorage.setItem(pricingSettingsKey, JSON.stringify(next)) } catch { /* 任意設定 */ }
      return next
    })
  }

  function changeFontSize(value) {
    setFontSize(value)
    try { localStorage.setItem(fontSizeKey, value) } catch { /* 設定の保存は任意 */ }
  }

  function changeTheme(value) {
    setTheme(value)
    try { localStorage.setItem(themeKey, value) } catch { /* 設定の保存は任意 */ }
  }
  function changeEstimateCopyFormat(value) {
    setEstimateCopyFormat(value)
    try { localStorage.setItem(estimateCopyFormatKey, value) } catch { /* 設定の保存は任意 */ }
  }
  function savePropertyMaster(nextMaster, successMessage) {
    if (propertyMasterState.error) {
      setMasterStatus(propertyMasterState.error)
      return false
    }
    try {
      localStorage.setItem(propertyMasterKey, JSON.stringify(nextMaster))
      setPropertyMasterState({ master: nextMaster, error: '' })
      setMasterStatus(successMessage)
      return true
    } catch {
      setMasterStatus('保存できませんでした。端末の空き容量やブラウザーの保存設定をご確認ください。')
      return false
    }
  }

  function addMasterCompany(event) {
    event.preventDefault()
    const name = masterCompanyName.trim()
    if (!name) return
    if (mergedPropertyMaster.companies.some(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setMasterStatus('同じ管理会社名がすでに登録されています。')
      return
    }

    const company = { id: createRecordId(), name }
    if (savePropertyMaster({
      ...propertyMasterState.master,
      addedCompanies: [...propertyMasterState.master.addedCompanies, company],
    }, '管理会社を追加しました。')) {
      setMasterCompanyName('')
      setMasterPropertyCompanyId(company.id)
      setEditingCompanyId('')
    }
  }

  function renameMasterCompany(companyId) {
    const name = masterCompanyName.trim()
    if (!name) return
    const companyBeingRenamed = mergedPropertyMaster.companies.find(item => item.id === companyId)
    if (!companyBeingRenamed) return
    if (mergedPropertyMaster.companies.some(item =>
      item.id !== companyId && item.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    )) {
      setMasterStatus('同じ管理会社名がすでに登録されています。')
      return
    }

    if (savePropertyMaster({
      ...propertyMasterState.master,
      companyNames: { ...propertyMasterState.master.companyNames, [companyId]: name },
    }, '管理会社名を変更しました。')) {
      if (!started && company === companyBeingRenamed.name) setCompany(name)
      setMasterCompanyName('')
      setEditingCompanyId('')
    }
  }

  function deleteMasterCompany(masterCompany) {
    const propertyCount = mergedPropertyMaster.properties.filter(
      property => property.companyId === masterCompany.id
    ).length
    const confirmation = propertyCount
      ? `「${masterCompany.name}」には${propertyCount}件の物件があります。管理会社と物件を一覧から削除しますか？`
      : `管理会社「${masterCompany.name}」を削除しますか？`
    if (!window.confirm(confirmation)) return

    const nextMaster = {
      ...propertyMasterState.master,
      deletedCompanyIds: [...new Set([...propertyMasterState.master.deletedCompanyIds, masterCompany.id])],
    }
    if (savePropertyMaster(nextMaster, '管理会社を削除しました。')) {
      if (!started && company === masterCompany.name) {
        setCompany('')
        setPropertySearch('')
        setSelectedProperty(null)
      }
      if (masterPropertyCompanyId === masterCompany.id) setMasterPropertyCompanyId('')
      if (editingCompanyId === masterCompany.id) {
        setEditingCompanyId('')
        setMasterCompanyName('')
      }
    }
  }

  function startEditingCompany(company) {
    setEditingCompanyId(company.id)
    setMasterCompanyName(company.name)
    setManagementScrollTarget('companyForm')
  }

  function startAddingProperty(companyId = masterPropertyCompanyId) {
    setEditingPropertyId('')
    setShowPropertyForm(true)
    setMasterPropertyCompanyId(companyId)
    setPropertyForm({ name: '', address: '', reading: '', aliases: '' })
    setMasterStatus('')
    setManagementScrollTarget('propertyForm')
  }

  function startEditingProperty(property) {
    setEditingPropertyId(property.id)
    setShowPropertyForm(true)
    setMasterPropertyCompanyId(property.companyId)
    setPropertyForm({
      name: property.name || '',
      address: property.address || '',
      reading: property.reading || '',
      aliases: Array.isArray(property.aliases)
        ? property.aliases.join(', ')
        : String(property.aliases || property.alias || ''),
    })
    setManagementScrollTarget('propertyForm')
    setMasterStatus('')
  }

  function saveMasterProperty(event) {
    event.preventDefault()
    const name = propertyForm.name.trim()
    if (!name || !masterPropertyCompanyId) return
    const aliases = propertyForm.aliases.split(/[,、\n]/).map(alias => alias.trim()).filter(Boolean)
    const values = {
      name,
      address: propertyForm.address.trim(),
      reading: propertyForm.reading.trim(),
      aliases,
      alias: null,
    }
    const master = propertyMasterState.master
    let nextMaster

    if (editingPropertyId.startsWith('base-property:')) {
      const originalProperty = mergedPropertyMaster.properties.find(
        property => property.id === editingPropertyId
      )
      if (originalProperty && originalProperty.companyId !== masterPropertyCompanyId) {
        nextMaster = {
          ...master,
          deletedPropertyIds: [...new Set([...master.deletedPropertyIds, editingPropertyId])],
          addedProperties: [
            ...master.addedProperties,
            { id: createRecordId(), companyId: masterPropertyCompanyId, ...values },
          ],
        }
      } else {
        nextMaster = {
          ...master,
          propertyOverrides: {
            ...master.propertyOverrides,
            [editingPropertyId]: values,
          },
        }
      }
    } else if (editingPropertyId) {
      nextMaster = {
        ...master,
        addedProperties: master.addedProperties.map(property =>
          property.id === editingPropertyId
            ? { ...property, ...values, companyId: masterPropertyCompanyId }
            : property
        ),
      }
    } else {
      nextMaster = {
        ...master,
        addedProperties: [
          ...master.addedProperties,
          { id: createRecordId(), companyId: masterPropertyCompanyId, ...values },
        ],
      }
    }

    if (savePropertyMaster(nextMaster, editingPropertyId ? '物件情報を更新しました。' : '物件を追加しました。')) {
      setEditingPropertyId('')
      setShowPropertyForm(false)
      setPropertyForm({ name: '', address: '', reading: '', aliases: '' })
    }
  }

  function deleteMasterProperty(property) {
    if (!window.confirm(`物件「${property.name}」を削除しますか？`)) return
    const master = propertyMasterState.master
    const nextMaster = property.id.startsWith('base-property:')
      ? {
          ...master,
          deletedPropertyIds: [...new Set([...master.deletedPropertyIds, property.id])],
        }
      : {
          ...master,
          addedProperties: master.addedProperties.filter(item => item.id !== property.id),
        }
    if (savePropertyMaster(nextMaster, '物件を削除しました。')) {
      if (!started && selectedProperty?.id === property.id) {
        setSelectedProperty(null)
        setPropertySearch('')
      }
      if (editingPropertyId === property.id) startAddingProperty(property.companyId)
    }
  }

  function requestNavigation(action) {
    if (!started || !isDirty) {
      action()
      return
    }

    pendingNavigationRef.current = action
    setShowLeaveConfirmation(true)
  }

  function continuePendingNavigation() {
    const action = pendingNavigationRef.current
    pendingNavigationRef.current = null
    setShowLeaveConfirmation(false)
    action?.()
  }

  function discardAndNavigate() {
    try { localStorage.removeItem(workingDraftKey) } catch { /* 削除失敗は無視 */ }
    setWorkingDraft(null)
    setIsDirty(false)
    setSaveStatus('')
    continuePendingNavigation()
  }

  function saveAndNavigate() {
    if (!saveCurrentData()) return
    continuePendingNavigation()
  }

  function openSavedList() {
    requestNavigation(() => {
      setStarted(false)
      setIsDirty(false)
      setSavedEntries(readSavedEntries())
      setSelectedSavedKeys([])
      setSavedSearch('')
      setSavedCompanyFilter('')
      setShowArchived(false)
      setShowSavedList(true)
    })
  }

  async function importMCrossData(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.name.toLocaleLowerCase().endsWith('.mcross')) {
      window.alert('拡張子が .mcross のファイルを選択してください。')
      return
    }
    try {
      const text = await file.text()
      const packageData = JSON.parse(text)
      if (packageData?.fileType !== mCrossFileType || packageData?.version !== mCrossFileVersion) {
        throw new Error('M-Cross用ファイルではないか、対応していないバージョンです。')
      }
      const imported = normalizeImportedEntry(packageData.data)
      const propertyForKey = { name: imported.propertyName, address: imported.address }
      const storageKey = getSaveKey(imported.company, propertyForKey, imported.unit)
      const alreadyExists = localStorage.getItem(storageKey) !== null
      if (alreadyExists) {
        const overwrite = window.confirm(
          `「${imported.propertyName} ${imported.unit}号室」はすでに保存されています。\n\n上書きして読み込みますか？`
        )
        if (!overwrite) return
      }
      localStorage.setItem(storageKey, JSON.stringify(imported))
      setSavedEntries(readSavedEntries())
      setShowArchived(false)
      setSelectedSavedKeys([])
      window.alert(`「${imported.propertyName} ${imported.unit}号室」を読み込みました。`)
    } catch (error) {
      console.error('M-Crossデータを読み込めませんでした。', error)
      window.alert(error instanceof Error ? error.message : 'M-Crossデータを読み込めませんでした。')
    }
  }

  function loadSavedEntry(entry) {
    setCurrentStorageKey(entry.storageKey || '')
    setCompany(entry.company || '')
    setPropertySearch(entry.propertyName || '')
    setSelectedProperty({ name: entry.propertyName || '', address: entry.address || '' })
    setUnit(entry.unit || '')
    setRecords(Array.isArray(entry.records) ? entry.records : [])
    setCfRecords(Array.isArray(entry.cfRecords) ? entry.cfRecords : [])
    setSoftRecords(Array.isArray(entry.softRecords) ? entry.softRecords : [])
    setFloorTrimRecords(Array.isArray(entry.floorTrimRecords) ? entry.floorTrimRecords : [])
    setAdditionalWorks(Array.isArray(entry.additionalWorks) ? entry.additionalWorks : [])
    setProjectRooms(Array.isArray(entry.rooms)
      ? entry.rooms
      : [...defaultRooms, ...(Array.isArray(entry.customRooms) ? entry.customRooms : [])])
    setRoomConfirmations(
      entry.roomConfirmations && typeof entry.roomConfirmations === 'object'
        ? entry.roomConfirmations
        : {}
    )
    setPageIndex(Number.isInteger(entry.pageIndex) ? entry.pageIndex : 0)
    setCfPageIndex(Number.isInteger(entry.cfPageIndex) ? entry.cfPageIndex : 0)
    setSoftPageIndex(Number.isInteger(entry.softPageIndex) ? entry.softPageIndex : 0)
    setActivePage(entry.activePage || 'cross')
    setMeasurementType(entry.measurementType || '天井')
    setCaseCrossFactor(String(entry.caseCrossFactor ?? pricingSettings.crossFactor))
    setHeight('')
    setCount('')
    setMemo(entry.draftMemo || '')
    setActiveInput('')
    setSaveStatus('')
    setIsDirty(false)
    setShowSavedList(false)
    setShowMeasurementCheck(false)
    setShowRoomManagement(false)
    setShowEstimate(false)
    setReturnToMeasurementCheck(false)
    setStarted(true)
  }

  function openSavedEntry(entry) {
    requestNavigation(() => loadSavedEntry(entry))
  }

  function overwriteSavedEntry(entry) {
    if (!entry.storageKey) return
    try {
      const existing = JSON.parse(localStorage.getItem(entry.storageKey) || '{}')
      localStorage.setItem(entry.storageKey, JSON.stringify({
        ...existing,
        company: entry.company || '',
        propertyName: entry.propertyName || '',
        address: entry.address || '',
        unit: entry.unit || '',
        records: Array.isArray(entry.records) ? entry.records : [],
        cfRecords: Array.isArray(entry.cfRecords) ? entry.cfRecords : [],
        softRecords: Array.isArray(entry.softRecords) ? entry.softRecords : [],
        floorTrimRecords: Array.isArray(entry.floorTrimRecords) ? entry.floorTrimRecords : [],
        additionalWorks: Array.isArray(entry.additionalWorks) ? entry.additionalWorks : [],
        rooms: Array.isArray(entry.rooms)
          ? entry.rooms
          : [...defaultRooms, ...(Array.isArray(entry.customRooms) ? entry.customRooms : [])],
        roomConfirmations: entry.roomConfirmations && typeof entry.roomConfirmations === 'object'
          ? entry.roomConfirmations
          : {},
        pageIndex: Number.isInteger(entry.pageIndex) ? entry.pageIndex : 0,
        cfPageIndex: Number.isInteger(entry.cfPageIndex) ? entry.cfPageIndex : 0,
        softPageIndex: Number.isInteger(entry.softPageIndex) ? entry.softPageIndex : 0,
        activePage: entry.activePage || 'cross',
        measurementType: entry.measurementType || '天井',
        caseCrossFactor: Number(entry.caseCrossFactor ?? pricingSettings.crossFactor),
        archived: Boolean(entry.archived),
        updatedAt: new Date().toISOString(),
      }))
      setSavedEntries(readSavedEntries())
    } catch {
      window.alert('上書き保存できませんでした。端末の空き容量をご確認ください。')
    }
  }

  function deleteSavedEntry(entry) {
    if (!entry.storageKey) return
    const label = `${entry.propertyName || '物件名なし'} ${entry.unit || ''}号室`
    if (!window.confirm(`「${label}」の保存データを削除しますか？`)) return
    try {
      localStorage.removeItem(entry.storageKey)
      setSavedEntries(readSavedEntries())
      setSelectedSavedKeys(prev => prev.filter(key => key !== entry.storageKey))
    } catch {
      window.alert('データを削除できませんでした。')
    }
  }

  function setEntryArchived(entry, archived) {
    if (!entry.storageKey) return
    try {
      const stored = JSON.parse(localStorage.getItem(entry.storageKey) || '{}')
      localStorage.setItem(entry.storageKey, JSON.stringify({
        ...stored,
        archived,
      }))
      setSavedEntries(readSavedEntries())
      setSelectedSavedKeys(prev => prev.filter(key => key !== entry.storageKey))
    } catch {
      window.alert('アーカイブ状態を更新できませんでした。')
    }
  }

  function toggleSavedSelection(storageKey) {
    if (!storageKey) return
    setSelectedSavedKeys(prev =>
      prev.includes(storageKey)
        ? prev.filter(key => key !== storageKey)
        : [...prev, storageKey]
    )
  }

  function toggleSelectAllVisible() {
    const visibleKeys = visibleSavedEntries
      .map(entry => entry.storageKey)
      .filter(Boolean)
    const allSelected = visibleKeys.length > 0 &&
      visibleKeys.every(key => selectedSavedKeys.includes(key))

    setSelectedSavedKeys(prev => allSelected
      ? prev.filter(key => !visibleKeys.includes(key))
      : [...new Set([...prev, ...visibleKeys])]
    )
  }

  function bulkArchiveSelected() {
    if (selectedSavedKeys.length === 0) return
    const archiveValue = !showArchived

    selectedSavedKeys.forEach(key => {
      try {
        const stored = JSON.parse(localStorage.getItem(key) || '{}')
        localStorage.setItem(key, JSON.stringify({
          ...stored,
          archived: archiveValue,
        }))
      } catch {
        // 更新できないデータはスキップ
      }
    })

    setSavedEntries(readSavedEntries())
    setSelectedSavedKeys([])
  }

  function bulkDeleteSelected() {
    if (selectedSavedKeys.length === 0) return
    if (!window.confirm(`選択した${selectedSavedKeys.length}件を削除しますか？`)) return

    selectedSavedKeys.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch {
        // 削除できないデータはスキップ
      }
    })

    setSavedEntries(readSavedEntries())
    setSelectedSavedKeys([])
  }

  function startMeasurement() {
    const storageKey = getSaveKey(company, selectedProperty, unit)
    setCurrentStorageKey(storageKey)

    try {
      const saved = localStorage.getItem(storageKey)
      const savedData = saved ? JSON.parse(saved) : null
      setRecords(Array.isArray(savedData?.records) ? savedData.records : [])
      setCfRecords(Array.isArray(savedData?.cfRecords) ? savedData.cfRecords : [])
      setSoftRecords(Array.isArray(savedData?.softRecords) ? savedData.softRecords : [])
      setFloorTrimRecords(Array.isArray(savedData?.floorTrimRecords) ? savedData.floorTrimRecords : [])
      setAdditionalWorks(Array.isArray(savedData?.additionalWorks) ? savedData.additionalWorks : [])
      setProjectRooms(Array.isArray(savedData?.rooms)
        ? savedData.rooms
        : [...defaultRooms, ...(Array.isArray(savedData?.customRooms) ? savedData.customRooms : [])])
      setRoomConfirmations(
        savedData?.roomConfirmations && typeof savedData.roomConfirmations === 'object'
          ? savedData.roomConfirmations
          : {}
      )
      setPageIndex(Number.isInteger(savedData?.pageIndex) ? savedData.pageIndex : 0)
      setCfPageIndex(Number.isInteger(savedData?.cfPageIndex) ? savedData.cfPageIndex : 0)
      setSoftPageIndex(Number.isInteger(savedData?.softPageIndex) ? savedData.softPageIndex : 0)
      setActivePage(savedData?.activePage || 'cross')
      setMeasurementType(savedData?.measurementType || '天井')
      setCaseCrossFactor(String(savedData?.caseCrossFactor ?? pricingSettings.crossFactor))
      setMemo(savedData?.draftMemo || '')
      setSaveStatus('')
    } catch {
      setRecords([])
      setCfRecords([])
      setSoftRecords([])
      setFloorTrimRecords([])
      setAdditionalWorks([])
      setProjectRooms(defaultRooms)
      setRoomConfirmations({})
      setPageIndex(0)
      setCfPageIndex(0)
      setSoftPageIndex(0)
      setActivePage('cross')
      setMeasurementType('天井')
      setCaseCrossFactor(String(pricingSettings.crossFactor))
      setMemo('')
      setSaveStatus('保存データを読み込めませんでした')
    }
    setHeight('')
    setCount('')
    setActiveInput('')
    setIsDirty(false)
    setShowMeasurementCheck(false)
    setShowRoomManagement(false)
    setShowEstimate(false)
    setReturnToMeasurementCheck(false)
    setStarted(true)
  }

  function restoreWorkingDraft() {
    const draft = workingDraft
    if (!draft) return

    setCompany(draft.company || '')
    setPropertySearch(draft.propertyName || '')
    setSelectedProperty({
      name: draft.propertyName || '',
      address: draft.address || '',
    })
    setUnit(draft.unit || '')
    setRecords(Array.isArray(draft.records) ? draft.records : [])
    setCfRecords(Array.isArray(draft.cfRecords) ? draft.cfRecords : [])
    setSoftRecords(Array.isArray(draft.softRecords) ? draft.softRecords : [])
    setFloorTrimRecords(Array.isArray(draft.floorTrimRecords) ? draft.floorTrimRecords : [])
    setAdditionalWorks(Array.isArray(draft.additionalWorks) ? draft.additionalWorks : [])
    setProjectRooms(
      Array.isArray(draft.rooms) && draft.rooms.length ? draft.rooms : defaultRooms
    )
    setRoomConfirmations(
      draft.roomConfirmations && typeof draft.roomConfirmations === 'object'
        ? draft.roomConfirmations
        : {}
    )
    setPageIndex(Number.isInteger(draft.pageIndex) ? draft.pageIndex : 0)
    setCfPageIndex(Number.isInteger(draft.cfPageIndex) ? draft.cfPageIndex : 0)
    setSoftPageIndex(Number.isInteger(draft.softPageIndex) ? draft.softPageIndex : 0)
    setActivePage(draft.activePage || 'cross')
    setMeasurementType(draft.measurementType || '天井')
    setCaseCrossFactor(String(draft.caseCrossFactor ?? pricingSettings.crossFactor))
    setCurrentStorageKey(draft.currentStorageKey || '')
    setHeight('')
    setCount('')
    setMemo(draft.draftMemo || '')
    setActiveInput('')
    setSaveStatus('')
    setShowSavedList(false)
    setShowMeasurementCheck(false)
    setShowRoomManagement(false)
    setShowEstimate(false)
    setReturnToMeasurementCheck(false)
    setShowDraftRecovery(false)
    setIsDirty(true)
    setStarted(true)
  }
  function discardWorkingDraft() {
    try { localStorage.removeItem(workingDraftKey) } catch { /* 削除失敗は無視 */ }
    setWorkingDraft(null)
    setShowDraftRecovery(false)
  }
  function saveCurrentData() {
    if (!company || !selectedProperty || !unit.trim()) {
      setSaveStatus('管理会社・物件・号室を選択してください')
      return false
    }

    const storageKey = currentStorageKey || getSaveKey(company, selectedProperty, unit)
    let archived = false

    try {
      const existing = JSON.parse(localStorage.getItem(storageKey) || '{}')
      archived = Boolean(existing.archived)
    } catch {
      // 読み込みに失敗した場合は通常一覧に保存
    }

    const saveData = {
      company,
      propertyName: selectedProperty.name,
      address: selectedProperty.address,
      unit: unit.trim(),
      records,
      cfRecords,
      softRecords,
      floorTrimRecords,
      additionalWorks,
      draftMemo: memo,
      rooms,
      roomConfirmations,
      pageIndex,
      cfPageIndex,
      softPageIndex,
      activePage,
      measurementType,
      caseCrossFactor: Math.max(0, Number(caseCrossFactor) || 0),
      archived,
      updatedAt: new Date().toISOString(),
    }

    try {
      const serialized = JSON.stringify(saveData)
      localStorage.setItem(storageKey, serialized)
      localStorage.removeItem(workingDraftKey)
      setWorkingDraft(null)
      setCurrentStorageKey(storageKey)
      setSavedEntries(readSavedEntries())
      setIsDirty(false)
      setSaveStatus('')
      return true
    } catch {
      setSaveStatus('保存できませんでした。端末の空き容量をご確認ください')
      return false
    }
  }

  function addCustomRoom(roomName) {
    if (rooms.some(name => name.toLocaleLowerCase() === roomName.toLocaleLowerCase())) return
    setProjectRooms(previous => [...previous, roomName])
    if (pageIndex === rooms.length) setPageIndex(rooms.length)
    if (cfPageIndex === rooms.length) setCfPageIndex(rooms.length)
    if (softPageIndex === rooms.length) setSoftPageIndex(rooms.length)
    markUnsaved()
  }

  function renameRoom(oldName, newName) {
    if (oldName === newName) return
    if (rooms.some(name => name !== oldName && name.toLocaleLowerCase() === newName.toLocaleLowerCase())) return

    setProjectRooms(previous => previous.map(name => name === oldName ? newName : name))
    setRecords(previous => previous.map(record =>
      record.room === oldName ? { ...record, room: newName } : record
    ))
    setCfRecords(previous => previous.map(record =>
      record.room === oldName ? { ...record, room: newName } : record
    ))
    setSoftRecords(previous => previous.map(record =>
      record.room === oldName ? { ...record, room: newName } : record
    ))
    setFloorTrimRecords(previous => previous.map(record => ({
      ...record,
      roomA: record.roomA === oldName ? newName : record.roomA,
      roomB: record.roomB === oldName ? newName : record.roomB,
    })))
    setAdditionalWorks(previous => previous.map(record => record.room === oldName ? { ...record, room: newName } : record))
    setRoomConfirmations(previous => {
      if (!previous[oldName]) return previous
      const next = { ...previous }
      delete next[oldName]
      next[newName] = true
      return next
    })
    markUnsaved()
  }

  function roomHasData(roomName) {
    return records.some(record => record.room === roomName)
      || cfRecords.some(record => record.room === roomName)
      || softRecords.some(record => record.room === roomName)
      || floorTrimRecords.some(record => record.roomA === roomName || record.roomB === roomName)
  }

  function deleteRoom(roomName) {
    if (rooms.length <= 1) {
      window.alert('部屋をすべて削除することはできません')
      return
    }

    const roomIndex = rooms.indexOf(roomName)
    if (roomIndex === -1) return
    setProjectRooms(previous => previous.filter(name => name !== roomName))
    setRecords(previous => previous.filter(record => record.room !== roomName))
    setCfRecords(previous => previous.filter(record => record.room !== roomName))
    setSoftRecords(previous => previous.filter(record => record.room !== roomName))
    setFloorTrimRecords(previous => previous.filter(record => record.roomA !== roomName && record.roomB !== roomName))
    setAdditionalWorks(previous => previous.filter(record => record.room !== roomName))
    setRoomConfirmations(previous => {
      const next = { ...previous }
      delete next[roomName]
      return next
    })
    const adjustPageIndex = index => {
      if (index > roomIndex) return index - 1
      return Math.max(0, Math.min(index, rooms.length - 1))
    }
    setPageIndex(adjustPageIndex)
    setCfPageIndex(adjustPageIndex)
    setSoftPageIndex(adjustPageIndex)
    setMemo('')
    markUnsaved()
  }

  function goToPage(index) {
    const nextIndex = Math.max(0, Math.min(index, rooms.length))
    setPageIndex(nextIndex)
    setActiveInput('')
    setHeight('')
    setCount('')
    setMemo('')

    if (nextIndex < rooms.length) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          crossTypeAreaRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        })
      })
    }
  }

  function updateCrossInput(key) {
    if (!activeInput) return
    const isHeight = activeInput === 'height'
    const currentValue = isHeight ? height : count
    const setValue = isHeight ? setHeight : setCount
    if (key === 'clear') return setValue('')
    if (key === 'backspace') return setValue(currentValue.slice(0, -1))
    if (key === 'decimal') {
      if (!isHeight || currentValue.includes('.')) return
      return setValue(currentValue ? `${currentValue}.` : '0.')
    }
    setValue(`${currentValue}${key}`)
  }

  function addQuickMemo(text) {
    const words = memo.trim() ? memo.trim().split(/\s+/) : []
    if (!words.includes(text)) {
      setMemo([...words, text].join(' '))
      markUnsaved()
    }
  }
  function addCrossRecord(event) {
    event.preventDefault()
    const numericHeight = Number(height.replace(/[。．]/g, '.'))
    const numericCount = Number(count)
    if (!Number.isFinite(numericHeight) || numericHeight <= 0 || !Number.isInteger(numericCount) || numericCount < 1) return

    setRecords(prev => [...prev, {
      id: createRecordId(),
      room,
      type: measurementType,
      height: numericHeight,
      count: numericCount,
      quantity: numericHeight * numericCount,
      memo: memo.trim(),
    }])
    markRoomUnconfirmed(room)
    setHeight('')
    setCount('')
    setMemo('')
    setActiveInput('height')
    requestAnimationFrame(() => {
      heightInputRef.current?.focus()
      crossInputAreaRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
    markUnsaved()
  }

  function deleteCrossRecord(id) {
    const deletedRecord = records.find(item => item.id === id)
    setRecords(prev => prev.filter(item => item.id !== id))
    if (deletedRecord) markRoomUnconfirmed(deletedRecord.room)
    markUnsaved()
  }

  function getRoomInputStatus(roomName) {
    const roomCrossRecords = records.filter(record => record.room === roomName)
    return {
      cross: roomCrossRecords.length > 0,
      cf: cfRecords.some(record => record.room === roomName),
      soft: softRecords.some(record => record.room === roomName),
      memo: roomCrossRecords.some(record => Boolean(record.memo?.trim())),
      confirmed: Boolean(roomConfirmations[roomName]),
    }
  }

  const fontScales = { small: 0.8, medium: 0.9, large: 1 }
  const fontOptions = [
    ['small', '小'], ['medium', '中'], ['large', '大'],
  ]
  const themeOptions = [
    ['beige', 'ベージュ'], ['dark', 'ダーク'], ['pop', 'ポップ'], ['cyber', 'サイバー'],
  ]
  return (
    <>
      <style>{styles}</style>
      <div
        className={`app${theme === 'dark' ? ' theme-dark' : theme === 'pop' ? ' theme-pop' : theme === 'cyber' ? ' theme-cyber' : ''}`}
        style={{ zoom: fontScales[fontSize] || 1 }}
      >
        <header className="header">
          <div className="brandGroup">
            <img className="brandLogo" src="/m-cross-logo.png" alt="M-Cross" />
            <div>
              <div className="mavieBrand">MavieSelect</div>
              <div className="brand">M-Cross</div>
            </div>
          </div>
          <button className="settingsButton" type="button" aria-label="設定" onClick={() => setSettingsOpen(true)}>⚙️</button>
        </header>

        {settingsOpen ? (
          <main className={`main settingsMain${masterPropertyCompanyId ? ' managementPropertyOpen' : ''}`}>
            <button className="back" type="button" onClick={() => setSettingsOpen(false)}>← 戻る</button>
            <p className="eyebrow">アプリの表示設定</p>
            <h1>設定</h1>
            <section className="card">
              <h2>フォントサイズ</h2>
              <div className="settingsOptions">
                {fontOptions.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`settingsOption${fontSize === value ? ' active' : ''}`}
                    aria-pressed={fontSize === value}
                    onClick={() => changeFontSize(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <h2 style={{ marginTop: 28 }}>テーマカラー</h2>
              <div className="settingsOptions">
                {themeOptions.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`settingsOption${theme === value ? ' active' : ''}`}
                    aria-pressed={theme === value}
                    onClick={() => changeTheme(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <h2 style={{ marginTop: 28 }}>見積コピー形式</h2>
              <div className="settingsOptions">
                <button type="button" className={`settingsOption${estimateCopyFormat === 'split' ? ' active' : ''}`} onClick={() => changeEstimateCopyFormat('split')}>項目を分ける</button>
                <button type="button" className={`settingsOption${estimateCopyFormat === 'merged' ? ' active' : ''}`} onClick={() => changeEstimateCopyFormat('merged')}>項目をまとめる</button>
              </div>
              <p className="copyFormatPreview">
                {estimateCopyFormat === 'split' ? '社員用：居間｜収納｜壁｜クロス貼替｜8.6｜㎡' : '自分用：居間 収納 壁 クロス貼替｜8.6｜㎡'}
              </p>
              <h2 style={{ marginTop: 28 }}>概算金額の基本設定</h2>
              <div className="estimateSettings">
                <p className="estimateIntro">ここで設定した単価と換算率を、新しい案件の概算金額に使用します。</p>
                <div className="estimateSettingsGrid">
                  {measurementTypes.map(type => (
                    <label key={type}>
                      <span>クロス {type}（円／㎡）</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={pricingSettings.crossRates[type]}
                        onChange={event => updatePricingSetting('', event.target.value, type)}
                      />
                    </label>
                  ))}
                  <label>
                    <span>CF（円／㎡・概算数量は実測m×1.8）</span>
                    <input type="number" min="0" step="1" value={pricingSettings.cfRate} onChange={event => updatePricingSetting('cfRate', event.target.value)} />
                  </label>
                  <label>
                    <span>ソフト巾木（円／枚）</span>
                    <input type="number" min="0" step="1" value={pricingSettings.softRate} onChange={event => updatePricingSetting('softRate', event.target.value)} />
                  </label>
                  <label>
                    <span>床見切り（円／本）</span>
                    <input type="number" min="0" step="1" value={pricingSettings.floorTrimRate} onChange={event => updatePricingSetting('floorTrimRate', event.target.value)} />
                  </label>
                  <label>
                    <span>クロス基本換算率</span>
                    <input type="number" min="0" step="0.01" value={pricingSettings.crossFactor} onChange={event => updatePricingSetting('crossFactor', event.target.value)} />
                  </label>
                </div>
              </div>

              <h2 style={{ marginTop: 28 }}>管理会社・物件管理</h2>
              {masterStatus && <p className="saveStatus" role="status">{masterStatus}</p>}
              <form
                className="masterCompanyForm"
                ref={companyFormRef}
                onSubmit={event => {
                if (editingCompanyId) {
                  event.preventDefault()
                  renameMasterCompany(editingCompanyId)
                } else {
                  addMasterCompany(event)
                }
              }}>
                <label>
                  <span>{editingCompanyId ? '管理会社名を編集' : '新しい管理会社'}</span>
                  <input
                    value={masterCompanyName}
                    onChange={event => setMasterCompanyName(event.target.value)}
                    placeholder="管理会社名"
                    required
                  />
                </label>
                <div className="masterActions">
                  <button
                    className="primary"
                    type="submit"
                    onClick={() => setManagementScrollTarget('companyForm')}
                  >
                    {editingCompanyId ? '管理会社名を保存' : '管理会社を追加'}
                  </button>
                  {editingCompanyId && (
                    <button className="secondaryButton" type="button" onClick={() => {
                      setEditingCompanyId('')
                      setMasterCompanyName('')
                    }}>
                      編集をキャンセル
                    </button>
                  )}
                </div>
              </form>

              <div className="masterCompanyList">
                {mergedPropertyMaster.companies.map(masterCompany => (
                  <div className="masterCompanyItem" key={masterCompany.id}>
                    <strong>{masterCompany.name}</strong>
                    <div className="masterActions">
                      <button type="button" className="secondaryButton" onClick={() => {
                        setMasterPropertyCompanyId(masterCompany.id)
                        setShowPropertyForm(false)
                        setEditingPropertyId('')
                        setManagementScrollTarget('propertyList')
                      }}>
                        物件一覧
                      </button>
                      <button type="button" className="secondaryButton" onClick={() => startEditingCompany(masterCompany)}>
                        編集
                      </button>
                      <button type="button" className="dangerButton" onClick={() => deleteMasterCompany(masterCompany)}>
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {masterPropertyCompanyId && (
                <section className="masterPropertySection" ref={propertyListRef}>
                  <h3>
                    {mergedPropertyMaster.companies.find(item => item.id === masterPropertyCompanyId)?.name || ''}
                    の物件
                  </h3>
                  <button className="secondaryButton" type="button" onClick={() => startAddingProperty()}>
                    ＋ 新規物件追加
                  </button>
                  <div className="masterPropertyList">
                    {mergedPropertyMaster.properties
                      .filter(property => property.companyId === masterPropertyCompanyId)
                      .map(property => (
                        <article className="masterPropertyItem" key={property.id}>
                          <strong>{property.name}</strong>
                          <span>{property.address || '住所未登録'}</span>
                          <span>読み方：{property.reading || '未登録'}</span>
                          <span>
                            別名：{(Array.isArray(property.aliases)
                              ? property.aliases
                              : property.aliases ? [property.aliases] : property.alias ? [property.alias] : []
                            ).join('、') || '未登録'}
                          </span>
                          <div className="masterActions">
                            <button className="secondaryButton" type="button" onClick={() => startEditingProperty(property)}>
                              編集
                            </button>
                            <button className="dangerButton" type="button" onClick={() => deleteMasterProperty(property)}>
                              削除
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>

                  {showPropertyForm && (
                    <form
                      className="masterPropertyForm"
                      ref={propertyFormRef}
                      onSubmit={saveMasterProperty}
                    >
                      <h3>{editingPropertyId ? '物件を編集' : '物件を追加'}</h3>
                      <label>
                        <span>管理会社</span>
                        <select
                          value={masterPropertyCompanyId}
                          onChange={event => {
                            setMasterPropertyCompanyId(event.target.value)
                            setEditingPropertyId('')
                          }}
                          required
                        >
                          <option value="">管理会社を選択</option>
                          {mergedPropertyMaster.companies.map(item => (
                            <option value={item.id} key={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>物件名</span>
                        <input
                          value={propertyForm.name}
                          onChange={event => setPropertyForm(prev => ({ ...prev, name: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        <span>住所</span>
                        <input
                          value={propertyForm.address}
                          onChange={event => setPropertyForm(prev => ({ ...prev, address: event.target.value }))}
                        />
                      </label>
                      <label>
                        <span>検索用の読み方</span>
                        <input
                          value={propertyForm.reading}
                          onChange={event => setPropertyForm(prev => ({ ...prev, reading: event.target.value }))}
                          placeholder="例：しゅしゅ"
                        />
                      </label>
                      <label>
                        <span>検索用の別名（カンマ区切り）</span>
                        <input
                          value={propertyForm.aliases}
                          onChange={event => setPropertyForm(prev => ({ ...prev, aliases: event.target.value }))}
                          placeholder="例：CHOUCHOU, chou"
                        />
                      </label>
                      <div className="masterActions">
                        <button className="primary" type="submit">
                          {editingPropertyId ? '物件を保存' : '物件を追加'}
                        </button>
                        <button className="secondaryButton" type="button" onClick={() => {
                          setEditingPropertyId('')
                          setShowPropertyForm(false)
                          setPropertyForm({ name: '', address: '', reading: '', aliases: '' })
                        }}>キャンセル</button>
                      </div>
                    </form>
                  )}
                </section>
              )}
            </section>
          </main>
        ) : showSavedList && !started ? (
          <main className="main">
            <button className="back" type="button" onClick={() => setShowSavedList(false)}>← 物件情報へ戻る</button>
            <p className="eyebrow">保存した採寸データ</p>
            <h1>{showArchived ? 'アーカイブ一覧' : '保存済み一覧'}</h1>

            <section className="card">
              <div className="settingsOptions" style={{ marginBottom: 18 }}>
                <button
                  type="button"
                  className={`settingsOption${!showArchived ? ' active' : ''}`}
                  aria-pressed={!showArchived}
                  onClick={() => {
                    setShowArchived(false)
                    setSelectedSavedKeys([])
                  }}
                >
                  保存済み
                </button>
                <button
                  type="button"
                  className={`settingsOption${showArchived ? ' active' : ''}`}
                  aria-pressed={showArchived}
                  onClick={() => {
                    setShowArchived(true)
                    setSelectedSavedKeys([])
                  }}
                >
                  アーカイブ
                </button>
              </div>

              <input
                ref={importFileInputRef}
                type="file"
                accept=".mcross,application/json"
                onChange={importMCrossData}
                style={{ display: 'none' }}
              />
              <button
                className="secondaryButton"
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                style={{ marginTop: 0, marginBottom: 18 }}
              >
                📥 M-Crossデータを読み込む
              </button>
              <p className="saveStatus">
                {showArchived ? 'アーカイブ件数' : '保存済み件数'}：{savedCount}件
              </p>
              <p className="savedMeta" style={{ textAlign: 'center', margin: '6px 0 18px' }}>
                表示中：{visibleSavedEntries.length}件
              </p>

              <label>
                <span>物件名検索</span>
                <input
                  type="search"
                  value={savedSearch}
                  onChange={event => setSavedSearch(event.target.value)}
                  placeholder="物件名で検索"
                />
              </label>

              <label>
                <span>管理会社で絞り込み</span>
                <select
                  value={savedCompanyFilter}
                  onChange={event => setSavedCompanyFilter(event.target.value)}
                >
                  <option value="">すべての管理会社</option>
                  {savedCompanyOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>並び替え</span>
                <select
                  value={savedSortOrder}
                  onChange={event => setSavedSortOrder(event.target.value)}
                >
                  <option value="newest">最新更新順</option>
                  <option value="oldest">古い更新順</option>
                  <option value="property">物件名順</option>
                </select>
              </label>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0 18px' }}>
                <button className="actionButton actionOverwrite" type="button" onClick={toggleSelectAllVisible}>
                  {visibleSavedEntries.length > 0 &&
                  visibleSavedEntries.every(entry => selectedSavedKeys.includes(entry.storageKey))
                    ? '表示中の選択解除'
                    : '表示中を全選択'}
                </button>
                <button
                  className="actionButton actionCsv"
                  type="button"
                  onClick={bulkArchiveSelected}
                  disabled={selectedSavedKeys.length === 0}
                >
                  {showArchived ? '選択を通常一覧へ戻す' : '選択をアーカイブ'}
                </button>
                <button
                  className="actionButton actionDelete"
                  type="button"
                  onClick={bulkDeleteSelected}
                  disabled={selectedSavedKeys.length === 0}
                >
                  選択を削除（{selectedSavedKeys.length}）
                </button>
              </div>

              {visibleSavedEntries.length === 0 ? (
                <p className="empty">
                  {showArchived ? 'アーカイブされたデータはありません' : '保存済みデータはありません'}
                </p>
              ) : (
                <div className="savedList">
                  {visibleSavedEntries.map((entry, index) => (
                    <article
                      className="savedItem"
                      key={entry.storageKey || `${entry.propertyName}-${entry.unit}-${index}`}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={selectedSavedKeys.includes(entry.storageKey)}
                          onChange={() => toggleSavedSelection(entry.storageKey)}
                          aria-label={`${entry.propertyName || '物件名なし'}を選択`}
                          style={{ width: 22, minHeight: 22, padding: 0, flex: '0 0 22px' }}
                        />
                        <span className="savedProperty">{entry.propertyName || '物件名なし'}</span>
                      </label>

                      <span className="savedMeta">管理会社：{entry.company || '未設定'}</span>
                      <span className="savedUnit">{entry.unit || ''}号室</span>
                      <span className="savedMeta">保存日時：{formatSavedDate(entry.updatedAt)}</span>

                      <div className="savedActions">
                        <button className="actionButton actionOpen" type="button" onClick={() => openSavedEntry(entry)}>開く</button>
                        <button className="actionButton actionOverwrite" type="button" onClick={() => openSavedEntry(entry)}>編集</button>
                        <button className="actionButton actionOverwrite" type="button" onClick={() => overwriteSavedEntry(entry)}>上書き保存</button>
                        <button className="actionButton actionCsv" type="button" onClick={() => downloadCsv(entry)}>CSV出力</button>
                        <button className="actionButton actionCsv" type="button" onClick={() => downloadExcel(entry)}>Excel出力</button>
                        <button className="actionButton actionOverwrite" type="button" onClick={() => downloadMCrossData(entry)}>📦 M-Cross出力</button>
                        <button className="actionButton actionDelete" type="button" onClick={() => deleteSavedEntry(entry)}>削除</button>
                        <button
                          className="actionButton actionOverwrite"
                          type="button"
                          onClick={() => setEntryArchived(entry, !showArchived)}
                        >
                          {showArchived ? '一覧に戻す' : 'アーカイブ'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </main>
        ) : !started ? (
          <main className="main">
            <p className="eyebrow">お部屋の採寸を、かんたんに</p>
            <h1>物件情報</h1>
            <p className="subtitle">採寸する物件を選択してください。</p>
            <section className="card">
              <label>
                <span>管理会社</span>
                <select value={company} onChange={event => {
                  setCompany(event.target.value)
                  setPropertySearch('')
                  setSelectedProperty(null)
                  setSaveStatus('')
                }}>
                  <option value="">管理会社を選択</option>
                  {companies.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>

              <label>
                <span>物件名検索</span>
                <input
                  value={propertySearch}
                  disabled={!company}
                  onChange={event => {
                    setPropertySearch(event.target.value)
                    setSelectedProperty(null)
                  }}
                  placeholder={company ? '物件名を入力' : '先に管理会社を選択'}
                />
              </label>

              {propertySearch.trim() && !selectedProperty && (
                <div className="propertyResults">
                  {filteredProperties.length > 0 ? filteredProperties.map((item, index) => (
                    <button
                      className="propertyOption"
                      key={`${item.name}-${item.address}-${index}`}
                      type="button"
                      onClick={() => {
                        setSelectedProperty(item)
                        setPropertySearch(item.name)
                      }}
                    >
                      {item.name}
                    </button>
                  )) : <p className="empty">該当する物件がありません</p>}
                </div>
              )}

              <div className="address">
                <small>物件住所</small>
                <strong>{selectedProperty?.address || '物件を選択すると住所が表示されます'}</strong>
              </div>
              <button
                className="secondaryButton"
                type="button"
                disabled={!selectedProperty?.address?.trim()}
                onClick={() => {
                  const address = selectedProperty?.address?.trim()
                  if (!address) return
                  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
                  window.open(mapUrl, '_blank', 'noopener,noreferrer')
                }}
              >
                地図・ナビを開く
              </button>
              <label>
                <span>号室</span>
                <input value={unit} onChange={event => setUnit(event.target.value)} placeholder="例：501" />
              </label>
              <button className="primary" disabled={!selectedProperty || !unit.trim()} onClick={startMeasurement}>採寸を開始する →</button>
              <button className="secondaryButton" type="button" onClick={openSavedList}>保存済み一覧を見る</button>
            </section>
          </main>
        ) : (
          <main className="main">
            <button
              className="measurementBackButton"
              type="button"
              onClick={() => requestNavigation(() => {
                setStarted(false)
                setShowSavedList(false)
                setIsDirty(false)
              })}
            >
              ← 物件情報へ戻る
            </button>
            <p className="propertyLine">{selectedProperty?.name}　{unit}号室</p>
            <h1>
              {showEstimate
                ? '概算金額'
                : showRoomManagement
                  ? '部屋管理'
                  : activePage === 'cross'
                ? isSummaryPage ? '全室の合計' : '採寸入力'
                : activePage === 'cf' ? 'CF採寸' : activePage === 'soft' ? 'ソフト巾木' : activePage === 'floorTrim' ? '床見切り' : '最終確認'}
            </h1>
            <div className="measurementActions">
              <button className="saveButton" type="button" onClick={saveCurrentData}>保存する</button>
              <button
                className="secondaryButton"
                type="button"
                onClick={() => downloadExcel({
                  company,
                  propertyName: selectedProperty?.name || '',
                  address: selectedProperty?.address || '',
                  unit,
                  records,
                  cfRecords,
                  softRecords,
                  floorTrimRecords,
                  additionalWorks,
                })}
              >
                Excel出力
              </button>
              <button
                className="secondaryButton"
                type="button"
                onClick={() => {
                  setShowEstimate(previous => !previous)
                  setShowRoomManagement(false)
                }}
              >
                {showEstimate ? '← 採寸画面へ戻る' : '💰 概算金額'}
              </button>
            </div>
            <p className={`saveState ${isDirty ? 'dirty' : 'saved'}`} role="status" aria-live="polite">
              {isDirty ? '未保存' : '保存済み'}
            </p>
            {saveStatus && <p className="saveStatus" role="status">{saveStatus}</p>}

            {!showRoomManagement && !showEstimate && (
              <div className="measurementTypes" aria-label="採寸機能">
                <button type="button" className={activePage === 'cross' ? 'measurementType active' : 'measurementType'} onClick={() => {
                  setActivePage('cross')
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      crossRoomAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    })
                  })
                }}>クロス採寸</button>
                <button type="button" className={activePage === 'cf' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('cf')}>CF採寸</button>
                <button type="button" className={activePage === 'soft' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('soft')}>ソフト巾木</button>
                <button type="button" className={activePage === 'floorTrim' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('floorTrim')}>床見切り</button>
                <button type="button" className={activePage === 'review' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('review')}>✅ 最終確認</button>
              </div>
            )}

            {!showEstimate && (
              <button
                className="measurementCheckButton"
                type="button"
                onClick={() => setShowRoomManagement(previous => !previous)}
            >
                {showRoomManagement ? '← 採寸画面へ戻る' : '⚙ 部屋管理'}
              </button>
            )}

            {showEstimate ? (() => {
              // お客様向け画面には換算率を表示せず、設定済みの案件換算率だけを計算に使用します。
              const factor = Math.max(0, Number(caseCrossFactor) || Number(pricingSettings.crossFactor) || 0)
              const estimateRows = buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings)
              const additionalWorkTotal = additionalWorks.reduce((sum, item) => sum + (Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0)
              const totalAmount = estimateRows.reduce((sum, row) => sum + row.amount, 0) + additionalWorkTotal
              return (
                <section className="card">
                  <h2>{selectedProperty?.name} {unit}号室</h2>
                  <p className="estimateIntro">退去時にお客様へ提示するための概算です。正式見積ではありません。</p>

                  {estimateRows.length === 0 && additionalWorks.length === 0 ? (
                    <p className="empty">概算できる採寸データがありません</p>
                  ) : [
                    ...rooms.map(roomName => ({ title: roomName, key: roomName, rows: estimateRows.filter(row => row.room === roomName) })),
                    { title: 'ソフト巾木', key: '__ALL_ROOMS__', rows: estimateRows.filter(row => row.room === '__ALL_ROOMS__') },
                    { title: '床見切り', key: '__FLOOR_TRIM__', rows: estimateRows.filter(row => row.room === '__FLOOR_TRIM__') },
                    {
                      title: '内装工事以外',
                      key: '__ADDITIONAL_WORKS__',
                      rows: additionalWorks.map(item => ({
                        category: 'additionalWork',
                        label: [item.room, item.work].filter(Boolean).join(' '),
                        memo: item.memo || '',
                        quantity: Number(item.quantity || 0),
                        unit: item.unit || '式',
                        rate: Number(item.unitPrice || 0),
                        amount: Number(item.amount || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
                      })),
                    },
                  ].map(section => {
                    if (section.rows.length === 0) return null
                    return (
                      <section className="estimateRoom" key={section.key}>
                        <h3>{section.title}</h3>
                        {section.rows.map((row, index) => (
                          <div className="estimateRow" key={row.category + '-' + row.label + '-' + row.memo + '-' + index}>
                            <strong>{row.label}{row.memo && <small className="estimateMemo">{row.memo}</small>}</strong>
                            <span className="estimateNumber estimateUnit">{formatQuantity(row.quantity)}{row.unit}</span>
                            <span className="estimateNumber estimateRate">× {formatYen(row.rate)}</span>
                            <span className="estimateNumber"><strong>{formatYen(row.amount)}</strong></span>
                          </div>
                        ))}
                      </section>
                    )
                  })}
                  <button
                    className="secondaryButton"
                    type="button"
                    onClick={() => downloadEstimateExcel({
                      company,
                      propertyName: selectedProperty?.name || '',
                      address: selectedProperty?.address || '',
                      unit,
                    }, estimateRows, estimateCopyFormat, additionalWorks)}
                  >
                    📊 見積用Excel出力
                  </button>
                  <div className="estimateTotal">
                    <span>概算合計</span>
                    <strong>{formatYen(totalAmount)}</strong>
                  </div>
                  <p className="estimateNote">概算金額です。実際の施工内容、使用材料、下地の状態、現場状況などにより金額が変更となる場合があります。</p>
                </section>
              )
            })() : showRoomManagement ? (
              <section className="card">
                <h2>部屋管理</h2>
                <RoomManagementControls
                  rooms={rooms}
                  onAddRoom={addCustomRoom}
                  onRenameRoom={renameRoom}
                  onDeleteRoom={deleteRoom}
                  roomHasData={roomHasData}
                />
              </section>
            ) : activePage === 'review' ? (
              <FinalReviewPage
                rooms={rooms}
                crossTotal={records.reduce((sum, record) => sum + getRecordQuantity(record), 0) * Math.max(0, Number(caseCrossFactor) || Number(pricingSettings.crossFactor) || 0)}
                cfTotal={cfRecords.reduce((sum, record) => sum + getLengthQuantity(record), 0) * 1.8}
                softTotal={softRecords.reduce((sum, record) => sum + getSoftBaseboardQuantity(record), 0)}
                floorTrimTotal={floorTrimRecords.reduce((sum, record) => sum + Math.max(0, Number(record.quantity) || 0), 0)}
                additionalWorks={additionalWorks}
                setAdditionalWorks={setAdditionalWorks}
                commonWorks={commonAdditionalWorks}
                setCommonWorks={setCommonAdditionalWorks}
                onChanged={markUnsaved}
              />
            ) : activePage === 'floorTrim' ? (
              <FloorTrimSection rooms={rooms} records={floorTrimRecords} setRecords={setFloorTrimRecords} onChanged={markUnsaved} />
            ) : activePage === 'cf' ? (
              <LengthMeasurementPage
                key="cf"
                title="CF"
                rooms={rooms.includes('土間') ? rooms : [...rooms, '土間']}
                records={cfRecords}
                setRecords={setCfRecords}
                pageIndex={cfPageIndex}
                setPageIndex={setCfPageIndex}
                onRoomRecordsChanged={markRoomUnconfirmed}
              />
              ) : activePage === 'soft' ? (
              <LengthMeasurementPage
                key="soft"
                title="ソフト巾木"
                rooms={rooms}
                records={softRecords}
                setRecords={setSoftRecords}
                pageIndex={softPageIndex}
                setPageIndex={setSoftPageIndex}
                countOnly
                onRoomRecordsChanged={markRoomUnconfirmed}
              />
            ) : (
              <>
                <nav ref={crossRoomAreaRef} className="roomTabs" aria-label="クロスの部屋">
                  {rooms.map((name, index) => (
                    <button key={name} type="button" className={pageIndex === index ? 'room active' : 'room'} onClick={() => goToPage(index)}>{name}</button>
                  ))}
                  <button type="button" className={isSummaryPage ? 'room active' : 'room'} onClick={() => goToPage(rooms.length)}>全室合計</button>
                </nav>
                {isSummaryPage ? (
                  <section className="card">
                    <h2>部屋ごとの合計</h2>
                    {rooms.map(roomName => {
                      const roomTotalsByType = measurementTypes.reduce((totals, type) => {
                        totals[type] = sumRecords(records, roomName, type)
                        return totals
                      }, {})
                      const roomTotal = Object.values(roomTotalsByType)
                        .reduce((sum, value) => sum + value, 0)

                      return (
                        <div className="roomSummary" key={roomName}>
                          <h3>{roomName}</h3>
                          {measurementTypes.map(type => (
                            <div className="summaryLine" key={type}>
                              <span>{type}</span>
                              <strong>{formatQuantity(roomTotalsByType[type])}m</strong>
                            </div>
                          ))}
                          <div className="summaryLine">
                            <span>部屋合計</span>
                            <strong>{formatQuantity(roomTotal)}m</strong>
                          </div>
                        </div>
                      )
                    })}
                    <div className="summary">
                      {measurementTypes.map(type => (
                        <div className="summaryLine" key={type}>
                          <span>{type}合計</span>
                          <strong>{formatQuantity(totalsByType[type])}m</strong>
                        </div>
                      ))}
                      <div className="summaryLine summaryGrand">
                        <span>全区分合計</span>
                        <strong>{formatQuantity(grandTotal)}m</strong>
                      </div>
                    </div>
                  </section>
                ) : (
                  <>
                    <section className="card">
                      <h2>{room}</h2>
                      <div ref={crossTypeAreaRef} className="measurementTypes" aria-label="採寸区分">
                        {measurementTypes.map(type => (
                          <button key={type} type="button" className={measurementType === type ? 'measurementType active' : 'measurementType'} onClick={() => {
                            setMeasurementType(type)
                            setActiveInput('')
                          }}>{type}</button>
                        ))}
                      </div>

                      <form onSubmit={addCrossRecord}>
                        <div className="crossInputArea" ref={crossInputAreaRef}>
                          <div className="inputRow">
                            <label>
                              <span>高さ</span>
                              <input
                                ref={heightInputRef}
                                type="text"
                                inputMode="none"
                                readOnly
                                value={height}
                                onFocus={() => setActiveInput('height')}
                                onClick={() => setActiveInput('height')}
                                placeholder="タップ"
                              />
                            </label>
                            <label>
                              <span>本数</span>
                              <input
                                ref={countInputRef}
                                type="text"
                                inputMode="none"
                                readOnly
                                value={count}
                                onFocus={() => setActiveInput('count')}
                                onClick={() => setActiveInput('count')}
                                placeholder="タップ"
                              />
                            </label>
                          </div>

                          <NumberKeypad
                            activeInput={activeInput}
                            onKey={updateCrossInput}
                            onDone={() => setActiveInput(activeInput === 'height' ? 'count' : '')}
                            decimalInput={activeInput === 'height'}
                          />

                          <button className="add crossRegister" type="submit">
                            ＋ {measurementType}の内容を登録
                          </button>
                        </div>

                        <label>
                          <span>メモ</span>
                          <input
                            ref={memoInputRef}
                            className="memoInput"
                            type="text"
                            value={memo}
                            onChange={event => {
                              setMemo(event.target.value)
                              markUnsaved()
                            }}
                            placeholder="例：窓面、部分張替え"
                          />
                        </label>
                        <div className="quickMemos" aria-label="よく使うメモ">
                          {quickMemos.map(text => <button key={text} className="quickMemoButton" type="button" onClick={() => addQuickMemo(text)}>{text}</button>)}
                          <button className="quickMemoButton" type="button" onClick={() => memoInputRef.current?.focus()}>その他</button>
                        </div>
                      </form>
                      <div className="records">
                        {roomRecords.length === 0 ? (
                          <p className="empty">{room}の{measurementType}の登録内容はありません</p>
                        ) : roomRecords.map(item => (
                          <div className="record" key={item.id}>
                            <div>
                              <strong>{item.type}</strong>
                              <small>{Number(item.height).toFixed(2)}m × {item.count}本</small>
                              {item.memo && <small>メモ：{item.memo}</small>}
                            </div>
                            <b>{formatQuantity(getRecordQuantity(item))}m</b>
                            <button type="button" onClick={() => deleteCrossRecord(item.id)} aria-label={`${room}の${item.type}の登録を削除`}>×</button>
                          </div>
                        ))}
                      </div>
                    </section>

                    <div className="roomNavigation">
                      <button className="back" type="button" disabled={pageIndex === 0} onClick={() => goToPage(pageIndex - 1)}>← 前の部屋</button>
                      <button className="primary roomNavigationNext" type="button" onClick={() => goToPage(pageIndex + 1)}>
                        {pageIndex === rooms.length - 1 ? '全室合計へ →' : '次の部屋 →'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </main>
        )}
        {showDraftRecovery && workingDraft && (
          <div className="leaveConfirmBackdrop">
            <section
              className="leaveConfirmDialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="draft-recovery-title"
            >
              <h2 id="draft-recovery-title">前回の作業中データがあります</h2>
              <p>
                保存する前にM-Crossが終了した可能性があります。<br />
                続きから再開できます。
              </p>
              <p className="savedMeta">
                {workingDraft.propertyName || '物件名なし'}
                {workingDraft.unit ? `　${workingDraft.unit}号室` : ''}
              </p>
              <button className="saveButton" type="button" onClick={restoreWorkingDraft}>
                続きから再開
              </button>
              <button className="dangerButton" type="button" onClick={discardWorkingDraft}>
                破棄して新規開始
              </button>
            </section>
          </div>
        )}
        {showLeaveConfirmation && (
          <div className="leaveConfirmBackdrop">
            <section
              className="leaveConfirmDialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="leave-confirm-title"
              aria-describedby="leave-confirm-description"
            >
              <h2 id="leave-confirm-title">未保存の変更</h2>
              <p id="leave-confirm-description">
                変更内容が保存されていません。<br />
                保存せずに移動しますか？
              </p>
              <button className="saveButton" type="button" onClick={saveAndNavigate}>
                保存して移動
              </button>
              <button className="dangerButton" type="button" onClick={discardAndNavigate}>
                保存せずに移動
              </button>
              {saveStatus && <p className="saveStatus" role="alert">{saveStatus}</p>}
              <button
                className="secondaryButton"
                type="button"
                onClick={() => {
                  pendingNavigationRef.current = null
                  setShowLeaveConfirmation(false)
                }}
              >
                キャンセル
              </button>
            </section>
          </div>
        )}
      </div>
    </>
  )
}
