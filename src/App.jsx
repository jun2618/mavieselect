import { useEffect, useMemo, useRef, useState } from 'react'
import properties from './m-cross-properties.json'
import './App.css'

const rooms = [
  '居間', '台所', '洋間', '洋間2', '洋間3', '和室',
  '脱衣所', 'トイレ', '玄関', '階段', 'ホール',
]
const measurementTypes = ['天井', '収納天井', '壁', '収納壁']
const storagePrefix = 'm-cross:'
const fontSizeKey = 'm-cross-font-size'
const themeKey = 'm-cross-theme'
const lastSessionKey = 'm-cross-last-session'
const propertyMasterKey = 'm-cross:property-master:v1'

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

function readLastSession() {
  try {
    const value = localStorage.getItem(lastSessionKey)
    return value ? JSON.parse(value) : null
  } catch {
    return null
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
  .brandGroup { display:grid; justify-items:start; gap:0; line-height:1; }
  .mavieBrand { margin:0 0 2px 2px; color:#d98278; font-family:"Dancing Script","Segoe Script",cursive; font-size:21px; font-weight:700; letter-spacing:.035em; line-height:1.15; }
  .brand { color:#f08b78; font-family:"Zen Maru Gothic",sans-serif; font-size:32px; font-weight:900; letter-spacing:.04em; text-shadow:0 3px 0 #ffe3d4; }
  .settingsButton { width:46px; height:46px; border:1px solid #efd8ca; border-radius:14px; color:#d27f6d; background:#fffaf5; font:inherit; font-size:22px; cursor:pointer; -webkit-tap-highlight-color:transparent; }
  .main { width:min(100% - 32px,620px); margin:28px auto 0; }
  .eyebrow { margin:0 0 10px; color:#e58a75; font-size:14px; font-weight:800; letter-spacing:.1em; }
  .main h1,.card h2 { color:#514751; font-family:"Zen Maru Gothic","Yu Gothic",Meiryo,sans-serif; font-weight:800; letter-spacing:.04em; }
  .main h1 { margin:0 0 12px; font-size:clamp(32px,8vw,42px); }
  .subtitle,.propertyLine { color:#8e8190; font-size:16px; line-height:1.8; }
  .propertyLine { margin:18px 0 5px; color:#d27f6d; font-weight:700; }
  .card { margin-top:20px; padding:clamp(20px,5vw,30px); border:1px solid rgba(230,202,184,.85); border-radius:24px; background:rgba(255,255,255,.82); box-shadow:0 12px 0 #ead8cb,0 18px 36px rgba(111,82,88,.12); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); }
  .card h2 { margin:0 0 22px; text-align:center; font-size:26px; }
  .card label { display:grid; gap:10px; min-width:0; margin:0 0 18px; }
  .card label>span { color:#817183; font-size:15px; font-weight:800; }
  .card input,.card select { width:100%; min-height:54px; padding:0 15px; border:2px solid #efe4dc; border-radius:14px; outline:none; color:#514751; background:#fffdfa; font:inherit; }
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
  .saveButton { width:100%; margin:12px 0 4px; background:linear-gradient(180deg,#91baff,#6e91e8); box-shadow:0 5px 0 #526fc2; }
  .secondaryButton { width:100%; margin-top:12px; background:linear-gradient(180deg,#c6a4e8,#a77bd1); box-shadow:0 5px 0 #875bad; }
  .primary:disabled { opacity:.45; cursor:not-allowed; }
  .back { padding:9px 0; border:0; color:#d27f6d; background:transparent; font:inherit; font-size:16px; font-weight:800; cursor:pointer; }
  .roomTabs { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:9px; margin:18px 0; }
  .room,.measurementType { min-height:50px; padding:8px 5px; border:1px solid #e9dce8; border-radius:14px; color:#75697a; background:linear-gradient(180deg,#fff,#f8f1f8); box-shadow:0 4px 0 #e3d4e1; font-size:15px; }
  .room.active,.measurementType.active { border-color:#f3a18f; color:#fff; background:linear-gradient(180deg,#ffb49b,#f18c7d); box-shadow:0 4px 0 #d6756c; }
  .measurementTypes,.inputRow { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
  .measurementTypes { margin:0 0 20px; }
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
  .saveStatus { margin:8px 0 0; color:#548c73; font-size:15px; font-weight:700; text-align:center; }
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
  .theme-dark .record { border-color:#51484d; }
  .theme-pop { color:#51414b; background:radial-gradient(circle at 8% 10%,rgba(255,190,215,.65),transparent 25%),radial-gradient(circle at 95% 28%,rgba(185,221,255,.65),transparent 28%),linear-gradient(145deg,#fff8e9,#fff0e6); }
  .theme-pop .header { border-color:#f4b9c9; }
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
  @media (max-width:600px) {
    .crossInputArea .inputRow label { grid-template-rows:30px 52px; }
    .crossInputArea .inputRow input { height:52px; min-height:52px; }
    .crossInputArea .numberKeypad { gap:5px; padding:7px; }
    .crossInputArea .keypadButton { min-height:40px; }
  }
  @media (max-width:420px) {
    .main { width:min(100% - 24px,620px); margin-top:22px; }
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

function getPhotoRoomKey(company, propertyName, address, unit, room) {
  return JSON.stringify([company, propertyName, address, unit, room])
}

function RoomPhotos({ roomName, photos, onAddFiles, onDeletePhoto }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  function handleFilesSelected(event) {
    const files = Array.from(event.currentTarget.files || [])
    event.currentTarget.value = ''
    if (files.length) onAddFiles(files)
  }

  function deletePhoto(photo) {
    if (!window.confirm('この写真を削除しますか？')) return
    onDeletePhoto(photo)
    setSelectedPhoto(null)
  }

  return (
    <section className="card photoRoomCard">
      <h2>{roomName}の写真</h2>
      <div className="photoAddActions">
        <label className="photoActionButton">
          カメラで撮影
          <input
            className="photoFileInput"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFilesSelected}
            aria-label={`${roomName}の写真をカメラで撮影`}
          />
        </label>
        <label className="photoActionButton">
          ギャラリーから追加
          <input
            className="photoFileInput"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            aria-label={`${roomName}の写真をギャラリーから選択`}
          />
        </label>
      </div>
      {photos.length ? (
        <div className="photoThumbnailGrid">
          {photos.map(photo => (
            <div className="photoThumbnailItem" key={photo.id}>
              <button
                className="photoThumbnailButton"
                type="button"
                onClick={() => setSelectedPhoto(photo)}
                aria-label="写真を拡大表示"
              >
                <img src={photo.url} alt={`${roomName}の写真`} />
              </button>
              <button className="photoDeleteButton" type="button" onClick={() => deletePhoto(photo)}>
                削除
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">この部屋の写真はありません</p>
      )}
      {selectedPhoto && (
        <div className="photoModalBackdrop photoPreviewBackdrop" onClick={() => setSelectedPhoto(null)}>
          <section
            className="photoModal photoPreviewModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-preview-title"
            onClick={event => event.stopPropagation()}
          >
            <h2 id="photo-preview-title">{roomName}の写真</h2>
            <img className="photoLargePreview" src={selectedPhoto.url} alt={`${roomName}の拡大写真`} />
            <button className="photoModalCancel" type="button" onClick={() => setSelectedPhoto(null)}>
              写真一覧へ戻る
            </button>
          </section>
        </div>
      )}
    </section>
  )
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

    worksheet.mergeCells(1, 1, 1, lastColumn)
    const titleCell = worksheet.getCell(1, 1)
    titleCell.value = `${name} 採寸データ`
    titleCell.font = { name: 'Yu Gothic', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tabColor } }
    titleCell.alignment = { vertical: 'middle' }
    worksheet.getRow(1).height = 28

    metadata.forEach(([label, value], index) => {
      const rowNumber = index + 3
      worksheet.mergeCells(rowNumber, 2, rowNumber, lastColumn)
      const labelCell = worksheet.getCell(rowNumber, 1)
      labelCell.value = label
      labelCell.font = { name: 'Yu Gothic', bold: true }
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F7' } }
      const valueCell = worksheet.getCell(rowNumber, 2)
      valueCell.value = value
      valueCell.font = { name: 'Yu Gothic' }
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

    for (let columnIndex = 1; columnIndex <= lastColumn; columnIndex += 1) {
      const maxLength = worksheet.getColumn(columnIndex).values.reduce((max, value) => {
        const text = String(value ?? '')
        const displayLength = [...text].reduce(
          (length, character) => length + (character.charCodeAt(0) > 0xff ? 2 : 1),
          0
        )
        return Math.max(max, displayLength)
      }, 10)
      worksheet.getColumn(columnIndex).width = Math.min(maxLength + 2, 50)
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
  records,
  setRecords,
  pageIndex,
  setPageIndex,
  countOnly = false,
}) {
  const [length, setLength] = useState('')
  const [count, setCount] = useState('')
  const [activeInput, setActiveInput] = useState('')
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

  function goToPage(index) {
    setPageIndex(Math.max(0, Math.min(index, rooms.length)))
    setActiveInput('')
    setLength('')
    setCount('')
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
      setRecords(prev => [...prev, { id: createRecordId(), room, quantity }])
    } else {
      const numericLength = Number(length.replace(/[。．]/g, '.'))
      const numericCount = Number(count)
      if (!Number.isFinite(numericLength) || numericLength <= 0 || !Number.isInteger(numericCount) || numericCount < 1) return
      setRecords(prev => [...prev, {
        id: createRecordId(), room, length: numericLength, count: numericCount,
      }])
    }
    setLength('')
    setCount('')
    setActiveInput('')
  }

  return (
    <>
      <nav className="roomTabs" aria-label={`${title}の部屋`}>
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
          <section className="card">
            <h2>{room}</h2>
            <form onSubmit={addRecord}>
              {countOnly ? (
                <div className="inputRow" style={{ gridTemplateColumns: '1fr' }}>
                  <label><span>枚数</span><input type="text" inputMode="none" readOnly value={count} onFocus={() => setActiveInput('count')} onClick={() => setActiveInput('count')} placeholder="タップして入力" /></label>
                </div>
              ) : (
                <div className="inputRow">
                  <label><span>長さ（メートル）</span><input type="text" inputMode="none" readOnly value={length} onFocus={() => setActiveInput('length')} onClick={() => setActiveInput('length')} placeholder="タップして入力" /></label>
                  <label><span>本数</span><input type="text" inputMode="none" readOnly value={count} onFocus={() => setActiveInput('count')} onClick={() => setActiveInput('count')} placeholder="タップして入力" /></label>
                </div>
              )}
              <NumberKeypad activeInput={activeInput} onKey={updateInput} onDone={() => setActiveInput('')} decimalInput={!countOnly && activeInput === 'length'} />
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
                  </div>
                  <b>{formatQuantity(getQuantity(item))}{unit}</b>
                  <button type="button" onClick={() => setRecords(prev => prev.filter(record => record.id !== item.id))} aria-label={`${room}の${title}登録を削除`}>×</button>
                </div>
              ))}
            </div>
            <div className="summary">
              <div className="summaryLine summaryGrand"><span>{room}の{title}合計</span><strong>{formatQuantity(roomTotals[room] || 0)}{unit}</strong></div>
            </div>
          </section>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 16 }}>
            <button className="back" type="button" disabled={pageIndex === 0} onClick={() => goToPage(pageIndex - 1)}>← 前の部屋</button>
            <button className="primary" type="button" style={{ width: 'auto', padding: '0 18px' }} onClick={() => goToPage(pageIndex + 1)}>
              {pageIndex === rooms.length - 1 ? '全室合計へ →' : '次の部屋 →'}
            </button>
          </div>
        </>
      )}
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
  const [masterStatus, setMasterStatus] = useState(propertyMasterState.error)
  const [fontSize, setFontSize] = useState(() => readPreference(fontSizeKey, 'medium'))
  const [theme, setTheme] = useState(() => readPreference(themeKey, 'beige'))

  const [company, setCompany] = useState('')
  const [propertySearch, setPropertySearch] = useState('')
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [unit, setUnit] = useState('')
  const [started, setStarted] = useState(false)
  const [showSavedList, setShowSavedList] = useState(false)
  const [savedEntries, setSavedEntries] = useState([])
  const [savedSearch, setSavedSearch] = useState('')
  const [savedCompanyFilter, setSavedCompanyFilter] = useState('')
  const [savedSortOrder, setSavedSortOrder] = useState('newest')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedSavedKeys, setSelectedSavedKeys] = useState([])
  const [currentStorageKey, setCurrentStorageKey] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [measurementType, setMeasurementType] = useState('天井')
  const [height, setHeight] = useState('')
  const [count, setCount] = useState('')
  const [memo, setMemo] = useState('')
  const [activeInput, setActiveInput] = useState('')
  const heightInputRef = useRef(null)
  const countInputRef = useRef(null)
  const crossInputAreaRef = useRef(null)
  const [records, setRecords] = useState([])
  const [saveStatus, setSaveStatus] = useState('')
  const [activePage, setActivePage] = useState('cross')
  const [showPhotoPage, setShowPhotoPage] = useState(false)
  const [photoListOpen, setPhotoListOpen] = useState(false)
  const [photoRoom, setPhotoRoom] = useState(rooms[0])
  const [cfPageIndex, setCfPageIndex] = useState(0)
  const [softPageIndex, setSoftPageIndex] = useState(0)
  const [cfRecords, setCfRecords] = useState([])
  const [softRecords, setSoftRecords] = useState([])
  const [photosByRoom, setPhotosByRoom] = useState({})
  const photosByRoomRef = useRef(photosByRoom)

  useEffect(() => {
    photosByRoomRef.current = photosByRoom
  }, [photosByRoom])

  useEffect(() => () => {
    Object.values(photosByRoomRef.current).flat().forEach(photo => URL.revokeObjectURL(photo.url))
  }, [])

  useEffect(() => {
    const saved = readLastSession()
    if (!saved) return

    setCompany(saved.company || '')
    setPropertySearch(saved.propertyName || '')
    setSelectedProperty(saved.propertyName
      ? { name: saved.propertyName, address: saved.address || '' }
      : null)
    setUnit(saved.unit || '')
    setRecords(Array.isArray(saved.records) ? saved.records : [])
    setCfRecords(Array.isArray(saved.cfRecords) ? saved.cfRecords : [])
    setSoftRecords(Array.isArray(saved.softRecords) ? saved.softRecords : [])
    setPageIndex(Number.isInteger(saved.pageIndex) ? saved.pageIndex : 0)
    setCfPageIndex(Number.isInteger(saved.cfPageIndex) ? saved.cfPageIndex : 0)
    setSoftPageIndex(Number.isInteger(saved.softPageIndex) ? saved.softPageIndex : 0)
    setActivePage(saved.activePage || 'cross')
    if (saved.company && saved.propertyName && saved.unit) {
      setCurrentStorageKey(getSaveKey(
        saved.company,
        { name: saved.propertyName, address: saved.address || '' },
        saved.unit
      ))
    }
    setStarted(Boolean(saved.propertyName && saved.unit))
  }, [])

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

  function changeFontSize(value) {
    setFontSize(value)
    try { localStorage.setItem(fontSizeKey, value) } catch { /* 設定の保存は任意 */ }
  }

  function changeTheme(value) {
    setTheme(value)
    try { localStorage.setItem(themeKey, value) } catch { /* 設定の保存は任意 */ }
  }

  function addRoomPhotos(roomName, files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length !== files.length) {
      window.alert('画像ファイルを選択してください。')
    }
    if (!imageFiles.length) return

    const roomKey = getPhotoRoomKey(
      company,
      selectedProperty?.name || '',
      selectedProperty?.address || '',
      unit,
      roomName
    )
    const addedPhotos = imageFiles.map(file => ({
      id: createRecordId(),
      name: file.name,
      url: URL.createObjectURL(file),
    }))
    setPhotosByRoom(previous => ({
      ...previous,
      [roomKey]: [...(previous[roomKey] || []), ...addedPhotos],
    }))
  }

  function deleteRoomPhoto(roomName, photoToDelete) {
    const roomKey = getPhotoRoomKey(
      company,
      selectedProperty?.name || '',
      selectedProperty?.address || '',
      unit,
      roomName
    )
    setPhotosByRoom(previous => ({
      ...previous,
      [roomKey]: (previous[roomKey] || []).filter(photo => photo.id !== photoToDelete.id),
    }))
    URL.revokeObjectURL(photoToDelete.url)
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
  }

  function startAddingProperty(companyId = masterPropertyCompanyId) {
    setEditingPropertyId('')
    setShowPropertyForm(true)
    setMasterPropertyCompanyId(companyId)
    setPropertyForm({ name: '', address: '', reading: '', aliases: '' })
    setMasterStatus('')
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

  function openSavedList() {
    setSavedEntries(readSavedEntries())
    setSelectedSavedKeys([])
    setSavedSearch('')
    setSavedCompanyFilter('')
    setShowArchived(false)
    setShowSavedList(true)
  }

  function openSavedEntry(entry) {
    setCurrentStorageKey(entry.storageKey || '')
    setCompany(entry.company || '')
    setPropertySearch(entry.propertyName || '')
    setSelectedProperty({ name: entry.propertyName || '', address: entry.address || '' })
    setUnit(entry.unit || '')
    setRecords(Array.isArray(entry.records) ? entry.records : [])
    setCfRecords(Array.isArray(entry.cfRecords) ? entry.cfRecords : [])
    setSoftRecords(Array.isArray(entry.softRecords) ? entry.softRecords : [])
    setPageIndex(Number.isInteger(entry.pageIndex) ? entry.pageIndex : 0)
    setCfPageIndex(Number.isInteger(entry.cfPageIndex) ? entry.cfPageIndex : 0)
    setSoftPageIndex(Number.isInteger(entry.softPageIndex) ? entry.softPageIndex : 0)
    setActivePage(entry.activePage || 'cross')
    setMeasurementType(entry.measurementType || '天井')
    setHeight('')
    setCount('')
    setMemo('')
    setActiveInput('')
    setSaveStatus('')
    setShowSavedList(false)
    setStarted(true)
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
        pageIndex: Number.isInteger(entry.pageIndex) ? entry.pageIndex : 0,
        cfPageIndex: Number.isInteger(entry.cfPageIndex) ? entry.cfPageIndex : 0,
        softPageIndex: Number.isInteger(entry.softPageIndex) ? entry.softPageIndex : 0,
        activePage: entry.activePage || 'cross',
        measurementType: entry.measurementType || '天井',
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
      setPageIndex(Number.isInteger(savedData?.pageIndex) ? savedData.pageIndex : 0)
      setCfPageIndex(Number.isInteger(savedData?.cfPageIndex) ? savedData.cfPageIndex : 0)
      setSoftPageIndex(Number.isInteger(savedData?.softPageIndex) ? savedData.softPageIndex : 0)
      setActivePage(savedData?.activePage || 'cross')
      setMeasurementType(savedData?.measurementType || '天井')
      setSaveStatus(savedData ? '保存済みデータを読み込みました' : '')
    } catch {
      setRecords([])
      setCfRecords([])
      setSoftRecords([])
      setPageIndex(0)
      setCfPageIndex(0)
      setSoftPageIndex(0)
      setActivePage('cross')
      setMeasurementType('天井')
      setSaveStatus('保存データを読み込めませんでした')
    }
    setHeight('')
    setCount('')
    setMemo('')
    setActiveInput('')
    setStarted(true)
  }

  function saveCurrentData() {
    if (!company || !selectedProperty || !unit.trim()) {
      setSaveStatus('管理会社・物件・号室を選択してください')
      return
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
      pageIndex,
      cfPageIndex,
      softPageIndex,
      activePage,
      measurementType,
      archived,
      updatedAt: new Date().toISOString(),
    }

    try {
      const serialized = JSON.stringify(saveData)
      localStorage.setItem(storageKey, serialized)
      localStorage.setItem(lastSessionKey, serialized)
      setCurrentStorageKey(storageKey)
      setSavedEntries(readSavedEntries())
      setSaveStatus('この物件・号室のデータを保存しました')
    } catch {
      setSaveStatus('保存できませんでした。端末の空き容量をご確認ください')
    }
  }

  function goToPage(index) {
    setPageIndex(Math.max(0, Math.min(index, rooms.length)))
    setActiveInput('')
    setHeight('')
    setCount('')
    setMemo('')
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
    setSaveStatus('未保存の変更があります')
  }

  function deleteCrossRecord(id) {
    setRecords(prev => prev.filter(item => item.id !== id))
    setSaveStatus('未保存の変更があります')
  }

  const fontScales = { small: 0.8, medium: 0.9, large: 1 }
  const fontOptions = [
    ['small', '小'], ['medium', '中'], ['large', '大'],
  ]
  const themeOptions = [
    ['beige', 'ベージュ'], ['dark', 'ダーク'], ['pop', 'ポップ'],
  ]
  function openPhotoPage() {
    const roomIndex = activePage === 'cf'
      ? cfPageIndex
      : activePage === 'soft'
        ? softPageIndex
        : pageIndex
    setPhotoRoom(rooms[roomIndex] || rooms[0])
    setPhotoListOpen(false)
    setShowPhotoPage(true)
  }

  function getPhotosForRoom(roomName) {
    const roomKey = getPhotoRoomKey(
      company,
      selectedProperty?.name || '',
      selectedProperty?.address || '',
      unit,
      roomName
    )
    return photosByRoom[roomKey] || []
  }

  return (
    <>
      <style>{styles}</style>
      <div
        className={`app${theme === 'dark' ? ' theme-dark' : theme === 'pop' ? ' theme-pop' : ''}`}
        style={{ zoom: fontScales[fontSize] || 1 }}
      >
        <header className="header">
          <div className="brandGroup">
            <div className="mavieBrand">MavieSelect</div>
            <div className="brand">M-Cross</div>
          </div>
          <button className="settingsButton" type="button" aria-label="設定" onClick={() => setSettingsOpen(true)}>⚙️</button>
        </header>

        {settingsOpen ? (
          <main className="main">
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
              <h2 style={{ marginTop: 28 }}>管理会社・物件管理</h2>
              {masterStatus && <p className="saveStatus" role="status">{masterStatus}</p>}
              <form onSubmit={event => {
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
                  <button className="primary" type="submit">
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
                <section className="masterPropertySection">
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
                    <form className="masterPropertyForm" onSubmit={saveMasterProperty}>
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
            <button className="back" onClick={() => setStarted(false)}>← 物件情報へ戻る</button>
            <p className="propertyLine">{selectedProperty?.name}　{unit}号室</p>
            <h1>
              {showPhotoPage
                ? photoListOpen ? '📷 写真一覧' : `${photoRoom}の写真`
                : activePage === 'cross'
                  ? isSummaryPage ? '全室の合計' : '採寸入力'
                  : activePage === 'cf' ? 'CF採寸' : 'ソフト巾木'}
            </h1>
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
              })}
            >
              Excel出力
            </button>
            {saveStatus && <p className="saveStatus" role="status">{saveStatus}</p>}

            {!showPhotoPage ? (
              <>
                <div className="measurementTypes" aria-label="採寸機能">
                  <button type="button" className={activePage === 'cross' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('cross')}>クロス採寸</button>
                  <button type="button" className={activePage === 'cf' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('cf')}>CF採寸</button>
                  <button type="button" className={activePage === 'soft' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('soft')}>ソフト巾木</button>
                </div>
                <button className="photoSectionButton" type="button" onClick={openPhotoPage}>
                  📷 写真
                </button>

                {activePage === 'cf' ? (
              <LengthMeasurementPage key="cf" title="CF" records={cfRecords} setRecords={setCfRecords} pageIndex={cfPageIndex} setPageIndex={setCfPageIndex} />
              ) : activePage === 'soft' ? (
              <LengthMeasurementPage key="soft" title="ソフト巾木" records={softRecords} setRecords={setSoftRecords} pageIndex={softPageIndex} setPageIndex={setSoftPageIndex} countOnly />
            ) : (
              <>
                <nav className="roomTabs" aria-label="クロスの部屋">
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
                      <div className="measurementTypes" aria-label="採寸区分">
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
                                placeholder="タップして入力"
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
                                placeholder="タップして入力"
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
                            type="text"
                            value={memo}
                            onChange={event => setMemo(event.target.value)}
                            placeholder="例：窓面、部分張替え"
                          />
                        </label>
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 16 }}>
                      <button className="back" type="button" disabled={pageIndex === 0} onClick={() => goToPage(pageIndex - 1)}>← 前の部屋</button>
                      <button className="primary" type="button" style={{ width: 'auto', padding: '0 18px' }} onClick={() => goToPage(pageIndex + 1)}>
                        {pageIndex === rooms.length - 1 ? '全室合計へ →' : '次の部屋 →'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
              </>
            ) : (
              <section className="photoPage">
                <button className="back" type="button" onClick={() => setShowPhotoPage(false)}>
                  ← 採寸画面へ戻る
                </button>
                {photoListOpen ? (
                  <div className="photoRoomList">
                    {rooms.map(roomName => (
                      <button
                        className="photoRoomListItem"
                        key={roomName}
                        type="button"
                        onClick={() => {
                          setPhotoRoom(roomName)
                          setPhotoListOpen(false)
                        }}
                      >
                        <span>{roomName}</span>
                        <strong>{getPhotosForRoom(roomName).length}枚　›</strong>
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <button className="back" type="button" onClick={() => setPhotoListOpen(true)}>
                      ← 写真一覧へ戻る
                    </button>
                    <RoomPhotos
                      key={getPhotoRoomKey(
                        company,
                        selectedProperty?.name || '',
                        selectedProperty?.address || '',
                        unit,
                        photoRoom
                      )}
                      roomName={photoRoom}
                      photos={getPhotosForRoom(photoRoom)}
                      onAddFiles={files => addRoomPhotos(photoRoom, files)}
                      onDeletePhoto={photo => deleteRoomPhoto(photoRoom, photo)}
                    />
                  </>
                )}
              </section>
            )}
          </main>
        )}
      </div>
    </>
  )
}
