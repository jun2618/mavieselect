import { useEffect, useMemo, useRef, useState } from 'react'
import properties from './m-cross-properties.json'
import OneDriveSyncPanel from './OneDriveSyncPanel'
import EstimateRowEditor from './EstimateRowEditor'
import './App.css'

// M-CROSS_REMOVE_ESTIMATE_SNAPSHOT_VIEWER_STEP1_SAFE
import { openVoiceRecognitionReview, applyUserVoiceCorrections } from './voiceCorrectionDictionary' // M-CROSS_EDITABLE_VOICE_DICTIONARY_V2_SAFE
import './measurementMemoVoice' // M-CROSS_MEASUREMENT_MEMO_VOICE_V2_SAFE
const defaultRooms = [
  '螻・俣', 'LDK', '蜿ｰ謇', '豢矩俣', '豢矩俣2', '豢矩俣3', '蜥悟ｮ､',
  '髫取ｮｵ', '繝帙・繝ｫ', '邇・未', '閼ｱ陦｣謇', '繝医う繝ｬ',
]
const measurementTypes = ['螟ｩ莠・, '蜿守ｴ榊､ｩ莠・, '螢・, '蜿守ｴ榊｣・]
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
const defaultRoomsKey = 'm-cross:default-rooms:v1'
const quickMemosKey = 'm-cross:quick-memos:v1'
const playSettingsKey = 'm-cross:play-settings:v1'
const todayStatsKey = 'm-cross:today-stats:v1'
const galaxyUnlockedKey = 'm-cross:galaxy-unlocked:v1'
const defaultCommonAdditionalWorks = ['逡ｳ陦ｨ譖ｿ縺・, '髮ｻ逅・ｺ､謠・, '繝峨い邁｡譏鍋捩濶ｲ陬應ｿｮ', '謌ｸ蠖薙◆繧翫ざ繝蜿紋ｻ・, '蟒ｺ蜈ｷ隱ｿ謨ｴ', '繧ｳ繝ｼ繧ｭ繝ｳ繧ｰ']
const quickMemos = ['遯馴擇', '遯灘髄縺九▲縺ｦ蜿ｳ髱｢', '遯灘髄縺九▲縺ｦ蟾ｦ髱｢', '豁｣髱｢', '蜿ｳ髱｢', '蟾ｦ髱｢', '繧ｷ繝ｳ繧ｯ閭碁擇', '繧ｷ繝ｳ繧ｯ蜷代°縺｣縺ｦ蜿ｳ髱｢', '繧ｷ繝ｳ繧ｯ蜷代°縺｣縺ｦ蟾ｦ髱｢', '譴∝性繧', '譴・勁縺・, '荳九′繧雁､ｩ莠・]
function loadStringList(key, fallback) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || 'null')
    return Array.isArray(stored) && stored.length
      ? stored.map(value => String(value).trim()).filter(Boolean)
      : [...fallback]
  } catch {
    return [...fallback]
  }
}
const defaultPlaySettings = { effects: true, sound: 'off', splash: false }
function loadPlaySettings() {
  try { return { ...defaultPlaySettings, ...(JSON.parse(localStorage.getItem(playSettingsKey) || 'null') || {}) } }
  catch { return defaultPlaySettings }
}
function getLocalDateKey() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function loadTodayStats() {
  const today = getLocalDateKey()
  try {
    const stored = JSON.parse(localStorage.getItem(todayStatsKey) || 'null')
    return stored?.date === today ? stored : { date: today, completed: 0, registrations: 0 }
  } catch { return { date: today, completed: 0, registrations: 0 } }
}
const defaultPricingSettings = {
  crossRates: {
    '螟ｩ莠・: 990,
    '蜿守ｴ榊､ｩ莠・: 990,
    '螢・: 990,
    '蜿守ｴ榊｣・: 990,
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

/* M-CROSS_ROUND_ESTIMATE_AMOUNTS_V1_SAFE */
function formatYen(value) {
  return 'ﾂ･' + Math.round(Number(value) || 0).toLocaleString('ja-JP')
}
/* M-CROSS_RESIDENT_CASES_STEP1 */
const residentCasesStorageKey = 'mcross_resident_cases_v1'

const residentCaseStatuses = [
  '譛ｪ騾｣邨｡',
  '荳埼・,
  '荳埼夲ｼ医Γ繝ｼ繝ｫ騾∽ｿ｡・・,
  '騾｣邨｡貂茨ｼ育樟隱ｿ譌･遒ｺ螳夲ｼ・,
  '騾｣邨｡貂茨ｼ井ｽ懈･ｭ譌･遒ｺ螳夲ｼ・,
  '騾｣邨｡貂茨ｼ亥・螻・・・繧ｹ繧ｱ繧ｸ繝･繝ｼ繝ｫ遒ｺ隱榊ｾ・■・・,
  '隕狗ｩ肴署蜃ｺ貂茨ｼ育匱豕ｨ蠕・■・・,
  '菫晉蕗',
  '逋ｺ豕ｨ・域悴騾｣邨｡・・,
  '逋ｺ豕ｨ・井ｸ埼夲ｼ・,
  '逋ｺ豕ｨ・亥ｷ･莠区律遒ｺ螳夲ｼ・,
  '騾ｲ陦御ｸｭ',
  '螳御ｺ・ｼ域悴蝣ｱ蜻奇ｼ・,
  '螳御ｺ・,
]

function createResidentCaseId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'resident-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
}

/* M-CROSS_RESIDENT_CASES_STEP9 */
function getResidentNextAction(status) {
  const map = {
    '譛ｪ騾｣邨｡': '蜈･螻・・∈騾｣邨｡',
    '荳埼・: '蜈･螻・・∈蜀埼｣邨｡',
    '荳埼夲ｼ医Γ繝ｼ繝ｫ騾∽ｿ｡・・: '蜈･螻・・°繧峨・騾｣邨｡繧堤｢ｺ隱・,
    '騾｣邨｡貂茨ｼ育樟隱ｿ譌･遒ｺ螳夲ｼ・: '迴ｾ隱ｿ縺ｸ險ｪ蝠・,
    '騾｣邨｡貂茨ｼ井ｽ懈･ｭ譌･遒ｺ螳夲ｼ・: '蟾･莠九∈險ｪ蝠・,
    '騾｣邨｡貂茨ｼ亥・螻・・・繧ｹ繧ｱ繧ｸ繝･繝ｼ繝ｫ遒ｺ隱榊ｾ・■・・: '蜈･螻・・°繧画律遞句屓遲斐ｒ遒ｺ隱・,
    '隕狗ｩ肴署蜃ｺ貂茨ｼ育匱豕ｨ蠕・■・・: '逋ｺ豕ｨ迥ｶ豕√ｒ遒ｺ隱・,
    '菫晉蕗': '菫晉蕗荳ｭ',
    '逋ｺ豕ｨ・域悴騾｣邨｡・・: '蜈･螻・・∈蟾･莠区律繧帝｣邨｡',
    '逋ｺ豕ｨ・井ｸ埼夲ｼ・: '蜈･螻・・∈蜀埼｣邨｡',
    '逋ｺ豕ｨ・亥ｷ･莠区律遒ｺ螳夲ｼ・: '蟾･莠九∈險ｪ蝠・,
    '騾ｲ陦御ｸｭ': '蟾･莠九ｒ騾ｲ繧√ｋ',
    '螳御ｺ・ｼ域悴蝣ｱ蜻奇ｼ・: '邂｡逅・ｼ夂､ｾ縺ｸ螳御ｺ・ｱ蜻・,
    '螳御ｺ・: '蟇ｾ蠢懷ｮ御ｺ・,
  }
  return map[status] || ''
}

/* M-CROSS_RESIDENT_CASES_STEP12_QUICK_PASTE */
/* M-CROSS_RESIDENT_STEP12_COMPLETE_V1 */
function parseResidentRequestText(rawText, propertyMaster) {
  const source = String(rawText || '').split('\r\n').join('\n').trim()
  const lines = source.split('\n').map(line => line.trim()).filter(Boolean)
  const readLabel = labels => {
    for (const line of lines) {
      for (const label of labels) {
        for (const separator of ['・・, ':']) {
          const prefix = label + separator
          if (line.startsWith(prefix)) return line.slice(prefix.length).trim()
        }
      }
    }
    return ''
  }
  const rawProperty = readLabel(['迚ｩ莉ｶ', '迚ｩ莉ｶ蜷・])
  const typedAddress = readLabel(['菴乗園'])
  const residentName = readLabel(['豌丞錐', '蜈･螻・・, '縺雁錐蜑・])
  const residentContact = readLabel(['騾｣邨｡蜈・, '髮ｻ隧ｱ', '髮ｻ隧ｱ逡ｪ蜿ｷ'])
  const properties = Array.isArray(propertyMaster?.properties) ? propertyMaster.properties : []
  const matched = properties.find(item => item.name === rawProperty)
    || properties.filter(item => rawProperty && rawProperty.startsWith(item.name)).sort((a,b) => String(b.name||'').length - String(a.name||'').length)[0]
  let propertyName = matched?.name || rawProperty
  let unit = ''
  if (matched && rawProperty) unit = rawProperty.slice(matched.name.length).trim().replace(/蜿ｷ螳､$/u, '')
  else if (rawProperty) {
    const parts = rawProperty.split(' ').join('縲').split('縲').filter(Boolean)
    if (parts.length > 1) { unit = parts.pop().replace(/蜿ｷ螳､$/u, ''); propertyName = parts.join(' ') }
  }
  const labels = ['迚ｩ莉ｶ・・,'迚ｩ莉ｶ:','迚ｩ莉ｶ蜷搾ｼ・,'迚ｩ莉ｶ蜷・','菴乗園・・,'菴乗園:','豌丞錐・・,'豌丞錐:','蜈･螻・・ｼ・,'蜈･螻・・','縺雁錐蜑搾ｼ・,'縺雁錐蜑・','騾｣邨｡蜈茨ｼ・,'騾｣邨｡蜈・','髮ｻ隧ｱ・・,'髮ｻ隧ｱ:','髮ｻ隧ｱ逡ｪ蜿ｷ・・,'髮ｻ隧ｱ逡ｪ蜿ｷ:']
  const ignorePrefixes = ['縺・▽繧ゅ♀荳冶ｩｱ','譬ｪ蠑丈ｼ夂､ｾ','陦ｨ鬘後・莉ｶ','縺雁ｿ吶＠縺・→縺薙ｍ','繧医ｍ縺励￥縺企｡倥＞','縺泌ｯｾ蠢懊・縺ｻ縺ｩ','莉企ｱ荳ｭ','譚･騾ｱ荳ｭ','譛ｬ譌･荳ｭ','縺ｾ縺溘・,'蛻･縺ｧ','蟾･莠玖ｲｻ']
  const body = lines.filter(line => !labels.some(x => line.startsWith(x)) && !ignorePrefixes.some(x => line.startsWith(x)))
  const requestDetails = body.slice(0, 3).join('\n')
  const deadline = ['莉企ｱ荳ｭ','譚･騾ｱ荳ｭ','譛ｬ譌･荳ｭ','譏取律縺ｾ縺ｧ'].find(word => source.includes(word)) || ''
  const approvalLine = lines.find(line => (line.includes('蟾･莠玖ｲｻ') || line.includes('驥鷹｡・)) && line.includes('莉･蜀・) && line.includes('逋ｺ豕ｨ')) || ''
  const noteParts = []
  if (residentName) noteParts.push('蜈･螻・・ｼ・ + residentName)
  if (deadline) noteParts.push('騾｣邨｡譛滄剞・・ + deadline)
  if (approvalLine) noteParts.push('蜈郁｡檎匱豕ｨ譚｡莉ｶ・・ + approvalLine)
  return {
    requestDate: new Date().toLocaleDateString('sv-SE'), company: matched?.company || '',
    propertyName, unit, address: matched?.address || typedAddress, residentContact, requestDetails,
    note: noteParts.join('\n'), status: '譛ｪ騾｣邨｡',
    nextAction: deadline ? '蜈･螻・・∈騾｣邨｡・・ + deadline + '・・ : '蜈･螻・・∈騾｣邨｡',
    actionDueDate: '', caution: approvalLine, priority: 'normal'
  }
}

/* M-CROSS_RESIDENT_STEP15_1_ORDER_PDF_PARSER */
/* M-CROSS_RESIDENT_STEP15_2_PDF_PARSER_FIX */
/* M-CROSS_RESIDENT_STEP15_3_PDF_LAYOUT_FIX */
/* M-CROSS_RESIDENT_STEP15_4_PDF_FILENAME_PARSER */
function parseResidentOrderPdfText(rawText, propertyMaster, fileName = '') {
  const source = String(rawText || '').normalize('NFKC')
  const squash = value => String(value || '')
    .normalize('NFKC')
    .replace(/[\s縲]+/g, '')
    .replace(/[窶絶鯛停凪披輔・竏抵ｼ江/g, '-')
    .replace(/[繝ｻ・･]/g, '')
    .replace(/縺ｹ/g, '繝・)
    .toLocaleLowerCase('ja')

  const compact = squash(source)
  const compactFileName = squash(fileName)
  const properties = Array.isArray(propertyMaster?.properties) ? propertyMaster.properties : []
  const companies = Array.isArray(propertyMaster?.companies) ? propertyMaster.companies : []

  /* M-CROSS_RESIDENT_STEP15_5_FILENAME_PRIORITY */
  // 譛驥崎ｦ・ 譛ｬ譁・↓縺ｯ蜿り・・逵溘・蛻･迚ｩ莉ｶ蜷阪′蜷ｫ縺ｾ繧後ｋ蝣ｴ蜷医′縺ゅｋ縺溘ａ縲・
  // PDF繝輔ぃ繧､繝ｫ蜷阪↓荳閾ｴ縺吶ｋM-Cross迚ｩ莉ｶ繧呈怙蜆ｪ蜈医＠縺ｾ縺吶・
  const fileMatchedProperty = [...properties]
    .sort((a, b) => squash(b.name).length - squash(a.name).length)
    .find(item => {
      const name = squash(item.name)
      if (!name) return false
      const variants = [
        name,
        name.replace(/繝吶Ν/g, '縺ｹ繝ｫ'),
        name.replace(/縺ｹ繝ｫ/g, '繝吶Ν'),
      ]
      return variants.some(value => compactFileName.includes(value))
    })

  const bodyMatchedProperty = [...properties]
    .sort((a, b) => squash(b.name).length - squash(a.name).length)
    .find(item => {
      const name = squash(item.name)
      if (!name) return false
      const variants = [
        name,
        name.replace(/繝吶Ν/g, '縺ｹ繝ｫ'),
        name.replace(/縺ｹ繝ｫ/g, '繝吶Ν'),
      ]
      return variants.some(value => compact.includes(value))
    })

  let matchedProperty = fileMatchedProperty || bodyMatchedProperty

  // 蟶ｳ逾ｨPDF縺ｧ縺ｯ譁・ｭ鈴俣縺ｫ遨ｺ逋ｽ縺悟・繧九◆繧√∫ｩｺ逋ｽ髯､蜴ｻ蠕後・譁・ｭ怜・縺九ｉ逶ｴ謗･迚ｩ莉ｶ蜷阪ｒ諡ｾ縺・・
  let detectedPropertyName = ''
  const knownPatterns = [
    /繝ｪ繝舌ユ繧｣繝吶Ν譛亥ｯ・u,
    /inove[^0-9縲綻{2,30}/u,
  ]
  for (const pattern of knownPatterns) {
    const match = compactFileName.match(pattern) || compact.match(pattern)
    if (match) { detectedPropertyName = match[0].replace(/^inove/i, 'INOVE'); break }
  }

  if (!matchedProperty && detectedPropertyName) {
    matchedProperty = properties.find(item => {
      const left = squash(item.name)
      const right = squash(detectedPropertyName)
      return left === right || left.includes(right) || right.includes(left)
    })
  }

  const propertyName = matchedProperty?.name || detectedPropertyName || ''
  const company = matchedProperty?.company
    || companies.find(companyItem => properties.some(propertyItem => propertyItem.companyId === companyItem.id && matchedProperty?.id === propertyItem.id))?.name
    || ''
  const address = matchedProperty?.address || ''

  // 繝輔ぃ繧､繝ｫ蜷阪・縲檎黄莉ｶ蜷・101逋ｺ豕ｨ譖ｸ縲阪ｒ譛蜆ｪ蜈医＠縲∵悽譁・呵｣懊ｒ陬懷勧縺ｫ菴ｿ縺・∪縺吶・
  let unit = ''
  const fileUnitMatch = compactFileName.match(/(?:[竇竇｡竇｢竇｣竇､竇･竇ｦ竇ｧ竇ｨ竇ｩ]+-)?([0-9]{3,4})(?:逋ｺ豕ｨ譖ｸ|萓晞ｼ譖ｸ|pdf|$)/u)
  if (fileUnitMatch) unit = fileUnitMatch[1]
  const roomNearPhone = compact.match(/(?:\d{4,6})(?:[竇竇｡竇｢竇｣竇､竇･竇ｦ竇ｧ竇ｨ竇ｩ]+-)?(\d{3,4})011-\d{3}-\d{4}/u)
  if (!unit && roomNearPhone) unit = roomNearPhone[1]
  if (!unit && propertyName) {
    const p = compact.indexOf(squash(propertyName))
    if (p >= 0) {
      const near = compact.slice(Math.max(0, p - 50), p + squash(propertyName).length + 80)
      const candidates = near.match(/(?:[竇竇｡竇｢竇｣竇､竇･竇ｦ竇ｧ竇ｨ竇ｩ]+-)?\d{3,4}/gu) || []
      unit = candidates.find(value => !/^20\d{2}$/u.test(value)) || ''
    }
  }

  // 騾｣邨｡蜈医・蟶ｳ逾ｨ荳ｭ縺ｮ蜈･螻・・｣邨｡蜈亥呵｣懊ｒ蜆ｪ蜈医よ声蟶ｯ縺後≠繧後・譛蜆ｪ蜈医・
  const phones = source.replace(/[・阪・窶補絶鯛停凪披・]/g, '-').match(/(?:0[789]0-\d{4}-\d{4}|011-\d{3}-\d{4})/g) || []
  const residentContact = phones.find(phone => /^0[789]0-/u.test(phone)) || phones[0] || ''

  const hasDoor = compact.includes('邇・未繝峨い') || compact.includes('譛ｬ譌･邇・未')
  const hasChain = compact.includes('繝√ぉ繝ｼ繝ｳ') || compact.includes('繝峨い縺ｫ蠑墓寺縺代ｋ') || compact.includes('繝峨い縺ｫ蠑輔▲謗帙￠繧・)
  const hasParts = compact.includes('鮟偵＞繝懊ャ繝・) || compact.includes('鮟偵＞驛ｨ蜩・) || compact.includes('繝舌ロ') || compact.includes('繝阪ず縺上℃') || compact.includes('繝阪ず')

  let requestDetails = ''
  if (hasDoor && hasChain && hasParts) {
    requestDetails = [
      '邇・未繝峨い繝√ぉ繝ｼ繝ｳ縺ｮ繝峨い蛛ｴ驛ｨ蜩・ｼ磯ｻ偵＞繝懊ャ繝√・繝舌ロ繝ｻ繝阪ず・峨′螟悶ｌ縺溘・,
      '蜈･螻・・〒縺ｯ蜈・↓謌ｻ縺帙↑縺・◆繧∽ｿｮ逅・ｯｾ蠢懊・,
      compact.includes('菫ｮ逅・′荳榊庄縺ｮ蝣ｴ蜷医・莠､謠・) || compact.includes('菫ｮ逅・ｸ榊庄縺ｮ蝣ｴ蜷医・莠､謠・) ? '菫ｮ逅・ｸ榊庄縺ｮ蝣ｴ蜷医・莠､謠帛ｯｾ蠢懊・ : '',
    ].filter(Boolean).join('\n')
  }

  const caution = []
  if (compact.includes('蜈･螻・・∈逶ｴ謗･縺秘｣邨｡')) caution.push('蜈･螻・・∈逶ｴ謗･騾｣邨｡縺励※險ｪ蝠乗律譎ゅｒ隱ｿ謨ｴ')
  if (compact.includes('蜀咏悄繧帝√▲縺ｦ繧ゅｉ縺・ｈ縺・ｾ晞ｼ荳ｭ')) caution.push('蜀咏悄縺ｯ蜈･螻・・∈騾∽ｻ倅ｾ晞ｼ荳ｭ')
  if (compact.includes('蜿り・・逵・)) caution.push('蜿り・・逵溘≠繧・)
  if (compact.includes('菫ｮ逅・′荳榊庄縺ｮ蝣ｴ蜷医・莠､謠・) || compact.includes('菫ｮ逅・ｸ榊庄縺ｮ蝣ｴ蜷医・莠､謠・)) caution.push('菫ｮ逅・ｸ榊庄縺ｮ蝣ｴ蜷医・莠､謠帛ｯｾ蠢・)

  return {
    requestDate: new Date().toLocaleDateString('sv-SE'),
    company,
    propertyName,
    unit,
    address,
    residentContact,
    requestDetails,
    note: '',
    status: '譛ｪ騾｣邨｡',
    nextAction: '蜈･螻・・∈騾｣邨｡縺励※險ｪ蝠乗律譎ゅｒ隱ｿ謨ｴ',
    actionDueDate: '',
    caution: caution.join('\n'),
    priority: 'normal',
  }
}



/* M-CROSS_RESIDENT_STEP16_1_PHONE_PDF_AI */
function normalizeJapanesePhone(value) {
  let digits = String(value || '').normalize('NFKC').replace(/[^0-9+]/g, '')
  if (digits.startsWith('+81')) digits = '0' + digits.slice(3)
  digits = digits.replace(/[^0-9]/g, '')
  if (/^0[789]0\d{8}$/.test(digits)) return digits.slice(0,3) + '-' + digits.slice(3,7) + '-' + digits.slice(7)
  if (/^011\d{7}$/.test(digits)) return digits.slice(0,3) + '-' + digits.slice(3,6) + '-' + digits.slice(6)
  if (/^0\d{9,10}$/.test(digits)) return digits
  return String(value || '').trim()
}

/* M-CROSS_RESIDENT_STEP16_3_SAFE_FAST_AI */
function extractJapanesePhoneFromSource(value) {
  const source = String(value || '')
    .normalize('NFKC')
    .replace(/[・阪・窶補絶鯛停凪披・]/g, '-')

  const labeledLines = source
    .split(/\r?\n/)
    .filter(line => /(騾｣邨｡蜈・髮ｻ隧ｱ逡ｪ蜿ｷ|髮ｻ隧ｱ|TEL)/i.test(line))

  const findPhone = text => {
    const mobile = text.match(/0[789]0[\s-]*\d{4}[\s-]*\d{4}/)
    if (mobile) return normalizeJapanesePhone(mobile[0])
    const sapporo = text.match(/011[\s-]*\d{3}[\s-]*\d{4}/)
    if (sapporo) return normalizeJapanesePhone(sapporo[0])
    return ''
  }

  for (const line of labeledLines) {
    const phone = findPhone(line)
    if (phone) return phone
  }

  return findPhone(source)
}

function withResidentAiTimeout(promise, milliseconds = 45000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('AI隗｣譫舌′45遘偵ｒ雜・∴縺溘◆繧∽ｸｭ豁｢縺励∪縺励◆')), milliseconds)
    }),
  ])
}

/* M-CROSS_RESIDENT_STEP17_DUPLICATE_CHECK */
function normalizeResidentDuplicateText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('ja')
    .replace(/[\s縲繝ｻ・･縲√・.()・茨ｼ峨後阪弱上舌曾-]/g, '')
}

function residentRequestSimilarity(leftValue, rightValue) {
  const left = normalizeResidentDuplicateText(leftValue)
  const right = normalizeResidentDuplicateText(rightValue)
  if (!left || !right) return 0
  if (left === right) return 1
  if (left.includes(right) || right.includes(left)) return Math.min(left.length, right.length) / Math.max(left.length, right.length)
  const makeBigrams = text => {
    const result = new Set()
    for (let i = 0; i < text.length - 1; i += 1) result.add(text.slice(i, i + 2))
    return result
  }
  const a = makeBigrams(left)
  const b = makeBigrams(right)
  if (!a.size || !b.size) return 0
  let common = 0
  a.forEach(token => { if (b.has(token)) common += 1 })
  return (2 * common) / (a.size + b.size)
}

function findResidentDuplicate(cases, candidate) {
  const property = normalizeResidentDuplicateText(candidate?.propertyName)
  const unit = normalizeResidentDuplicateText(candidate?.unit).replace(/蜿ｷ螳､$/u, '')
  if (!property || !unit) return null

  const sameRoom = (Array.isArray(cases) ? cases : []).filter(item => {
    if (item.completed || item.status === '螳御ｺ・) return false
    return normalizeResidentDuplicateText(item.propertyName) === property
      && normalizeResidentDuplicateText(item.unit).replace(/蜿ｷ螳､$/u, '') === unit
  })
  if (!sameRoom.length) return null

  const ranked = sameRoom
    .map(item => ({ item, score: residentRequestSimilarity(item.requestDetails, candidate.requestDetails) }))
    .sort((a, b) => b.score - a.score)

  // Same room is always worth warning; similarity >= .35 is labelled as especially similar.
  return ranked[0] || null
}

/* M-CROSS_STEP19_WORK_ORDERS_BASE */
const workOrdersStorageKey = 'm-cross:work-orders:v1'

function normalizeWorkOrder(value) {
  const source = value && typeof value === 'object' ? value : {}
  const sales = Math.max(0, Number(source.estimateAmount) || 0)
  const contractorCost = Math.max(0, Number(source.contractorCost) || 0)
  const materialCost = Math.max(0, Number(source.materialCost) || 0)
  const otherCost = Math.max(0, Number(source.otherCost) || 0)
  const costTotal = contractorCost + materialCost + otherCost
  const profit = sales - costTotal
  return {
    id: source.id || createResidentCaseId(),
    company: source.company || '', propertyName: source.propertyName || '', unit: source.unit || '', address: source.address || '',
    workDetails: source.workDetails || '',
    estimateItems: Array.isArray(source.estimateItems) ? source.estimateItems : [],
    estimateAmount: sales,
    estimateStatus: source.estimateStatus || '譛ｪ菴懈・',
    orderStatus: source.orderStatus || '譛ｪ逋ｺ豕ｨ',
    contractor: source.contractor || '',
    startDate: source.startDate || '', completionDueDate: source.completionDueDate || '', completedDate: source.completedDate || '',
    contractorCost, materialCost, otherCost, costTotal, profit,
    profitRate: sales > 0 ? Number(((profit / sales) * 100).toFixed(1)) : 0,
    billingStatus: source.billingStatus || '譛ｪ隲区ｱ・,
    sourceType: source.sourceType || '', sourceId: source.sourceId || '',
    createdAt: source.createdAt || new Date().toISOString(), updatedAt: source.updatedAt || new Date().toISOString(),
  }
}

function loadWorkOrders() {
  try {
    const parsed = JSON.parse(localStorage.getItem(workOrdersStorageKey) || '[]')
    return Array.isArray(parsed) ? parsed.map(normalizeWorkOrder) : []
  } catch { return [] }
}

function saveWorkOrders(items) {
  try { localStorage.setItem(workOrdersStorageKey, JSON.stringify(items)); return true } catch { return false }
}

function normalizeResidentCase(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    id: source.id || createResidentCaseId(),
    requestDate: source.requestDate || '',
    company: source.company || '',
    propertyName: source.propertyName || '',
    unit: source.unit || '',
    address: source.address || '',
    residentContact: normalizeJapanesePhone(source.residentContact || ''),
    requestDetails: source.requestDetails || '',
    note: source.note || '',
    status: residentCaseStatuses.includes(source.status) ? source.status : '譛ｪ騾｣邨｡',
    nextAction: source.nextAction || getResidentNextAction(source.status || '譛ｪ騾｣邨｡'),
    actionDueDate: source.actionDueDate || '',
    waitingFor: source.waitingFor || '',
    priority: ['urgent', 'normal', 'low'].includes(source.priority) ? source.priority : 'normal',
    isOnHold: Boolean(source.isOnHold) || source.status === '菫晉蕗',
    holdReason: source.holdReason || '',
    lastActionAt: source.lastActionAt || source.updatedAt || source.createdAt || '',
    siteVisitAt: source.siteVisitAt || '',
    siteVisitEndAt: source.siteVisitEndAt || '',
    workVisitAt: source.workVisitAt || '',
    workVisitEndAt: source.workVisitEndAt || '',
    caution: source.caution || '',
    history: Array.isArray(source.history) ? source.history : [],
    completed: Boolean(source.completed),
    createdAt: source.createdAt || new Date().toISOString(),
    updatedAt: source.updatedAt || new Date().toISOString(),
  }
}

function loadResidentCases() {
  try {
    const raw = localStorage.getItem(residentCasesStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizeResidentCase) : []
  } catch (error) {
    console.error('蜈･螻・ｸｭ譯井ｻｶ繧定ｪｭ縺ｿ霎ｼ繧√∪縺帙ｓ縺ｧ縺励◆縲・, error)
    return []
  }
}

function saveResidentCases(cases) {
  try {
    localStorage.setItem(
      residentCasesStorageKey,
      JSON.stringify(Array.isArray(cases) ? cases : [])
    )
    /* M-CROSS_RESIDENT_AUTO_SAVE_V2_DIRTY */
    localStorage.setItem('mcross_resident_auto_save_dirty_v1', new Date().toISOString())
    /* M-CROSS_RESIDENT_AUTO_SAVE_V1 */
    window.dispatchEvent(new CustomEvent('mcross:resident-cases-saved', {
      detail: { count: Array.isArray(cases) ? cases.length : 0, savedAt: new Date().toISOString() },
    }))
    return true
  } catch (error) {
    console.error('蜈･螻・ｸｭ譯井ｻｶ繧剃ｿ晏ｭ倥〒縺阪∪縺帙ｓ縺ｧ縺励◆縲・, error)
    return false
  }
}

/* M-CROSS_RESIDENT_CASES_STEP6 */
function escapeIcsText(value) {
  return String(value || '')
    .split('\\').join('\\\\')
    .split('\r\n').join('\\n')
    .split('\n').join('\\n')
    .split(',').join('\\,')
    .split(';').join('\\;')
}

function formatIcsLocalDateTime(value) {
  const text = String(value || '').replace(/[-:]/g, '')
  return text ? text + '00' : ''
}

function addMinutesToLocalDateTime(value, minutes) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  date.setMinutes(date.getMinutes() + minutes)
  const pad = number => String(number).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes())
}

function downloadResidentCaseCalendar(item, visitType) {
  const isWork = visitType === 'work'
  const startValue = isWork ? item.workVisitAt : item.siteVisitAt
  const endValue = isWork ? item.workVisitEndAt : item.siteVisitEndAt
  if (!startValue || !endValue || new Date(endValue) <= new Date(startValue)) return false
  const title = '縲仙・螻・ｸｭ繝ｻ' + (isWork ? '蟾･莠・ : '迴ｾ隱ｿ') + '縲・
    + (item.propertyName || '迚ｩ莉ｶ蜷肴悴險ｭ螳・)
    + (item.unit ? ' ' + item.unit + '蜿ｷ螳､' : '')

  const description = [
    item.requestDetails ? '萓晞ｼ蜀・ｮｹ・・ + item.requestDetails : '',
    item.residentContact ? '蜈･螻・・｣邨｡蜈茨ｼ・ + item.residentContact : '',
    item.note ? '蛯呵・ｼ・ + item.note : '',
    item.caution ? '豕ｨ諢丈ｺ矩・ｼ・ + item.caution : '',
  ].filter(Boolean).join('\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//M-Cross//Resident Case//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + escapeIcsText(item.id) + '-' + visitType + '@mcross.local',
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'),
    'DTSTART:' + formatIcsLocalDateTime(startValue),
    'DTEND:' + formatIcsLocalDateTime(endValue),
    'SUMMARY:' + escapeIcsText(title),
    'LOCATION:' + escapeIcsText(item.address || ''),
    'DESCRIPTION:' + escapeIcsText(description),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = (title + '.ics').replace(/[\/:*?"<>|]/g, '_')
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return true
}

function splitMeasurementType(type) {
  return type.startsWith('蜿守ｴ・) ? ['蜿守ｴ・, type.replace('蜿守ｴ・, '')] : [type]
}
function buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings) {
  const crossRows = []
  const cfRows = []
  const softRows = []
  const floorTrimRows = []
  const roomPriority = ['螻・俣', 'LDK', '蜿ｰ謇', '豢矩俣', '蜥悟ｮ､', '髫取ｮｵ', '繝帙・繝ｫ', '邇・未', '閼ｱ陦｣謇', '繝医う繝ｬ']

  function roomBaseName(roomName) {
    if (/^豢矩俣\d+$/.test(roomName)) return '豢矩俣'
    if (/^蜥悟ｮ､\d+$/.test(roomName)) return '蜥悟ｮ､'
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

  // 1. 繧ｯ繝ｭ繧ｹ繧貞・驛ｨ螻句・縲∵欠螳壹＠縺滄Κ螻矩・〒蜈医↓荳ｦ縺ｹ縺ｾ縺吶・
  orderedRooms.forEach(roomName => {
    const definitions = [
      {
        parts: [roomName, '螟ｩ莠・, '繧ｯ繝ｭ繧ｹ雋ｼ譖ｿ'],
        records: records.filter(record => record.room === roomName && record.type === '螟ｩ莠・),
        amountForRecord: record => getRecordQuantity(record) * factor * Number(pricingSettings.crossRates['螟ｩ莠・] || 0),
      },
      {
        parts: [roomName, '螢・, '繧ｯ繝ｭ繧ｹ雋ｼ譖ｿ'],
        records: records.filter(record => record.room === roomName && record.type === '螢・),
        amountForRecord: record => getRecordQuantity(record) * factor * Number(pricingSettings.crossRates['螢・] || 0),
      },
      {
        parts: [roomName, '蜿守ｴ・, '繧ｯ繝ｭ繧ｹ雋ｼ譖ｿ'],
        records: records.filter(record => record.room === roomName && (record.type === '蜿守ｴ榊､ｩ莠・ || record.type === '蜿守ｴ榊｣・)),
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
          memo: definition.storage ? ['螟ｩ莠募｣・, inputMemo].filter(Boolean).join('繝ｻ') : inputMemo,
          category: 'cross',
          quantity,
          unit: '緕｡',
          rate: quantity > 0 ? amount / quantity : 0,
          amount,
        })
      })
    })
  })

  // 2. 繧ｯ繝ｭ繧ｹ縺檎ｵゅｏ縺｣縺溷ｾ後↓縲，F繧貞・驛ｨ螻句・荳ｦ縺ｹ縺ｾ縺吶・
  const cfRooms = [...orderedRooms]
  if (cfRecords.some(record => record.room === '蝨滄俣') && !cfRooms.includes('蝨滄俣')) cfRooms.push('蝨滄俣')
  cfRooms.forEach(roomName => {
    const roomCfRecords = cfRecords.filter(record => record.room === roomName)
    groupByMemo(roomCfRecords).forEach((groupRecords, memo) => {
      const measuredLength = groupRecords.reduce((sum, record) => sum + getLengthQuantity(record), 0)
      const quantity = measuredLength * 1.8
      if (quantity <= 0) return
      const rate = Number(pricingSettings.cfRate || 0)
      cfRows.push({
        room: roomName,
        parts: [roomName, '蠎・, 'CF雋ｼ繧・],
        memo,
        category: 'cf',
        quantity,
        unit: '緕｡',
        rate,
        amount: quantity * rate,
      })
    })
  })
  // 3. 譛蠕後↓繧ｽ繝輔ヨ蟾ｾ譛ｨ縲ゅΓ繝｢縺ｪ縺励・蜈ｨ螳､蜷郁ｨ医√Γ繝｢縺ゅｊ縺ｯ繝｡繝｢蛻･縺ｧ縺吶・
  groupByMemo(softRecords).forEach((groupRecords, memo) => {
    const quantity = groupRecords.reduce((sum, record) => sum + getSoftBaseboardQuantity(record), 0)
    if (quantity <= 0) return
    const rate = Number(pricingSettings.softRate || 0)
    softRows.push({
      room: '__ALL_ROOMS__',
      parts: ['繧ｽ繝輔ヨ蟾ｾ譛ｨ雋ｼ譖ｿ'],
      memo,
      category: 'soft',
      quantity,
      unit: '譫・,
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
      parts: [`${group.roomA}竍・{group.roomB}`, '蠎願ｦ句・繧雁叙莉・],
      memo: group.color,
      category: 'floorTrim',
      quantity: group.quantity,
      unit: '譛ｬ',
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


/* M-CROSS_CROSS_CF_PACKAGE_V3 */
const CROSS_PACKAGE_LIMIT_V3 = 35
const CF_SQUARE_METRE_START_V3 = 20

function areaTextV3(value) {
  const rounded = Math.round((Number(value || 0) + Number.EPSILON) * 10) / 10
  return rounded + '緕｡遞句ｺｦ'
}

function blankPriceV3(row) {
  return { ...row, rate: '', amount: '' }
}

function crossDetailRowV3(row) {
  const room = String(row?.room || row?.parts?.[0] || '').trim()
  const memo = String(row?.memo || '').trim()
  return {
    ...blankPriceV3(row),
    parts: [(room ? room : '') + '繧ｯ繝ｭ繧ｹ蠑ｵ譖ｿ'],
    memo,
    quantity: '',
    unit: '',
  }
}

function crossPackageRowV3(baseRow, totalArea) {
  return {
    ...blankPriceV3(baseRow || {}),
    room: baseRow?.room || '__CROSS_PACKAGE__',
    parts: ['荳願ｨ倥け繝ｭ繧ｹ蠑ｵ譖ｿ縲' + areaTextV3(totalArea)],
    memo: '',
    category: 'crossPackage',
    quantity: 1,
    unit: '蠑・,
  }
}

function cfPackageRowV3(cfRows, totalArea) {
  const rooms = [...new Set(cfRows
    .map(row => String(row?.room || row?.parts?.[0] || '').trim())
    .filter(Boolean))]
  const roomText = rooms.join('縲・)
  return {
    ...blankPriceV3(cfRows[cfRows.length - 1] || {}),
    room: cfRows[0]?.room || '__CF_PACKAGE__',
    parts: [(roomText ? roomText + '縲' : '') + 'CF雋ｼ繧翫' + areaTextV3(totalArea)],
    memo: '',
    category: 'cfPackage',
    quantity: 1,
    unit: '蠑・,
  }
}

function applyCrossCfPackageRulesV3(inputRows) {
  const rows = Array.isArray(inputRows) ? inputRows : []
  const crossRows = rows.filter(row => row?.category === 'cross')
  const cfRows = rows.filter(row => row?.category === 'cf')
  const crossArea = crossRows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)
  const cfArea = cfRows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)

  // 繧ｯ繝ｭ繧ｹ縺ｯ35緕｡莉･荳九ｒ荳蠑上・F縺ｯ20緕｡譛ｪ貅縺縺台ｸ蠑上〒縲・0緕｡縺｡繧・≧縺ｩ縺九ｉ緕｡蜊倅ｾ｡縲・
  const useCrossPackage = crossRows.length > 0 && crossArea > 0 && crossArea <= CROSS_PACKAGE_LIMIT_V3
  const useCfPackage = cfRows.length > 0 && cfArea > 0 && cfArea < CF_SQUARE_METRE_START_V3

  const result = []
  let crossSummaryAdded = false
  let cfSummaryAdded = false

  rows.forEach(row => {
    if (useCrossPackage && row?.category === 'cross') {
      result.push(crossDetailRowV3(row))
      if (!crossSummaryAdded && row === crossRows[crossRows.length - 1]) {
        result.push(crossPackageRowV3(row, crossArea))
        crossSummaryAdded = true
      }
      return
    }

    if (useCfPackage && row?.category === 'cf') {
      if (!cfSummaryAdded && row === cfRows[cfRows.length - 1]) {
        result.push(cfPackageRowV3(cfRows, cfArea))
        cfSummaryAdded = true
      }
      return
    }

    result.push(row)
  })

  return result
}

/* M-CROSS_ESTIMATE_TEMPLATE_OUTPUT_V2_SAFE */
async function downloadEstimateExcel(entry, rows, format, additionalWorks = []) {
  try {
    const baseRows = Array.isArray(rows) ? rows : []
    const convertedRows = applyCrossCfPackageRulesV3(baseRows)

    const additionalRows = (Array.isArray(additionalWorks) ? additionalWorks : []).map(item => ({
      parts: Array.isArray(item.estimateParts) && item.estimateParts.length
        ? [0, 1, 2, 3].map(index => String(item.estimateParts[index] || ''))
        : [item.room || '', '', item.work || '', ''],
      memo: item.memo || '',
      category: 'additionalWork',
      quantity: Number(item.quantity || 0),
      unit: item.unit || '蠑・,
      rate: item.unitPrice === '' || item.unitPrice == null ? '' : Number(item.unitPrice || 0),
      amount: item.unitPrice === '' || item.unitPrice == null
        ? ''
        : Number(item.amount || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
    }))

    const outputRows = [...convertedRows, ...additionalRows]
    if (!outputRows.length) {
      window.alert('蜃ｺ蜉帙〒縺阪ｋ隕狗ｩ埼・岼縺後≠繧翫∪縺帙ｓ縲・)
      return
    }
    if (outputRows.length > 32) {
      window.alert('隕狗ｩ肴・邏ｰ縺ｯ32陦後∪縺ｧ蜃ｺ蜉帙〒縺阪∪縺吶ら樟蝨ｨ ' + outputRows.length + '陦後≠繧翫∪縺吶・)
      return
    }

    const populateModule = await import('xlsx-populate/browser/xlsx-populate.min.js')
    const XlsxPopulate = populateModule.default || globalThis.XlsxPopulate || populateModule
    if (!XlsxPopulate?.fromDataAsync) throw new Error('xlsx-populate繝悶Λ繧ｦ繧ｶ迚医ｒ蛻晄悄蛹悶〒縺阪∪縺帙ｓ')

    const templateResponse = await fetch(
      new URL('/mcross-estimate-template.xlsx', window.location.origin),
      { cache: 'no-store' },
    )
    if (!templateResponse.ok) {
      throw new Error('隕狗ｩ肴嶌繝・Φ繝励Ξ繝ｼ繝医ｒ隱ｭ縺ｿ霎ｼ繧√∪縺帙ｓ HTTP ' + templateResponse.status)
    }

    const workbook = await XlsxPopulate.fromDataAsync(await templateResponse.arrayBuffer())
    const ws = workbook.sheet('隕狗ｩ肴嶌')
    if (!ws) throw new Error('縲瑚ｦ狗ｩ肴嶌縲阪す繝ｼ繝医′隕九▽縺九ｊ縺ｾ縺帙ｓ')

    // 蜈・ユ繝ｳ繝励Ξ繝ｼ繝医・譖ｸ蠑上√Ο繧ｴ縲∫ｽｫ邱壹∝・蟷・∬｡碁ｫ倥∝魂蛻ｷ險ｭ螳壹・邯ｭ謖√☆繧九・
    ws.cell('B5').value(entry?.company ? entry.company + '縲蠕｡荳ｭ' : '')
    ws.cell('J5').value(new Date()).style('numberFormat', 'yyyy蟷ｴm譛・譌･')
    ws.cell('D13').value(entry?.propertyName || '')
    ws.cell('F13').value(entry?.unit || '')
    ws.cell('G13').value(entry?.unit ? '蜿ｷ螳､' : '')
    ws.cell('D14').value(entry?.address || '')

    for (let rowNumber = 23; rowNumber <= 54; rowNumber += 1) {
      /* M-CROSS_TEMPLATE_SPLIT_MERGED_V1 */
      for (const column of ['C', 'D', 'E', 'F', 'H', 'I', 'J', 'K']) {
        ws.cell(column + rowNumber).value('')
      }
    }

    function joinedParts(row) {
      if (!Array.isArray(row?.parts)) return String(row?.label || row?.name || '').trim()
      return row.parts.map(value => String(value || '').trim()).filter(Boolean).join('縲')
    }

    function cellValue(value) {
      if (value === '' || value == null) return ''
      const numeric = Number(value)
      return Number.isFinite(numeric) ? numeric : value
    }

    outputRows.forEach((row, index) => {
      const rowNumber = 23 + index
      /* M-CROSS_TEMPLATE_PRESERVE_BLANK_PARTS_V2 */
      // 蛻・牡蠖｢蠑上〒縺ｯ縲碁・岼2縺縺醍ｩｺ谺・阪・繧医≧縺ｪ菴咲ｽｮ諠・ｱ繧堤ｶｭ謖√☆繧九・
      const rawParts = Array.isArray(row?.parts)
        ? row.parts.map(value => String(value || '').trim())
        : [String(row?.label || row?.name || '').trim()]
      const parts = format === 'split'
        ? [0, 1, 2, 3].map(index => rawParts[index] || '')
        : rawParts.filter(Boolean)
      const memo = String(row?.memo || '').trim()

      if (format === 'split') {
        // 遉ｾ蜩｡逕ｨ: 蟾･莠矩・岼繧辰・曦蛻励∈蛻・￠繧九・
        const splitParts = [0, 1, 2, 3].map(index => parts[index] || '')
        ;['C', 'D', 'E', 'F'].forEach((column, partIndex) => {
          ws.cell(column + rowNumber).value(splitParts[partIndex])
        })
        // 蛻・牡蠖｢蠑上〒縺ｯ遨ｺ逋ｽ蛻励ｒ隧ｰ繧√↑縺・ゅΓ繝｢縺ｯ遨ｺ縺・※縺・ｋ譛ｫ蟆ｾ蛻励∈蜈･繧後ｋ縲・
        if (memo) {
          let memoIndex = -1
          for (let index = 3; index >= 0; index -= 1) {
            if (!splitParts[index]) { memoIndex = index; break }
          }
          if (memoIndex >= 0) ws.cell(['C', 'D', 'E', 'F'][memoIndex] + rowNumber).value(memo)
          else ws.cell('F' + rowNumber).value(splitParts[3] + '縲' + memo)
        }
      } else {
        // 閾ｪ蛻・畑: 蟾･莠矩・岼繧辰蛻励∈縺ｾ縺ｨ繧√√Γ繝｢縺ｯF蛻励∈蜃ｺ縺吶・
        ws.cell('C' + rowNumber).value(parts.join(' '))
        ws.cell('D' + rowNumber).value('')
        ws.cell('E' + rowNumber).value('')
        ws.cell('F' + rowNumber).value(memo)
      }

      ws.cell('H' + rowNumber).value(cellValue(row?.quantity))
      ws.cell('I' + rowNumber).value(row?.unit || '')
      ws.cell('J' + rowNumber).value(cellValue(row?.rate))
      ws.cell('K' + rowNumber).value(cellValue(row?.amount))
    })

    const subtotal = outputRows.reduce((sum, row) => {
      if (row?.amount === '' || row?.amount == null) return sum
      const amount = Number(row.amount)
      return sum + (Number.isFinite(amount) ? amount : 0)
    }, 0)
    const tax = Math.floor(subtotal * 0.1)
    const total = subtotal + tax
    ws.cell('K55').value(subtotal)
    ws.cell('K56').value(tax)
    ws.cell('K57').value(total)
    ws.cell('E19').value(total)

    const output = await workbook.outputAsync()
    const blob = output instanceof Blob
      ? output
      : new Blob([output], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const safeName = [entry?.propertyName || '迚ｩ莉ｶ', entry?.unit ? entry.unit + '蜿ｷ螳､' : '']
      .filter(Boolean)
      .join('_')
      .replace(/[\/:*?"<>|]/g, '_')
    link.href = url
    link.download = '隕狗ｩ肴嶌_' + safeName + '.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error(error)
    window.alert(error instanceof Error ? error.message : '隕狗ｩ肴嶌繧貞・蜉帙〒縺阪∪縺帙ｓ縺ｧ縺励◆縲・)
  }
}

async function downloadEstimateExcelLegacy(entry, rows, format, additionalWorks = []) {
  rows = applyCrossCfPackageRulesV3(rows)
try {
    if (!rows.length && !additionalWorks.length) {
      window.alert('蜃ｺ蜉帙〒縺阪ｋ隕狗ｩ埼・岼縺後≠繧翫∪縺帙ｓ縲・)
      return
    }
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'MavieSelect'
    workbook.created = new Date()
    const worksheet = workbook.addWorksheet('隕狗ｩ咲畑', {
      views: [{ state: 'frozen', ySplit: 8 }],
    })
    worksheet.properties.defaultRowHeight = 21
    worksheet.views = [{ showGridLines: false, state: 'frozen', ySplit: 8 }]

    const estimateOutputRows = [
      ...rows,
      ...additionalWorks.map(item => ({
        room: item.room || '',
        parts: [item.room || '', '', item.work || ''],
        memo: item.memo || '',
        category: 'additionalWork',
        quantity: Number(item.quantity || 0),
        unit: item.unit || '蠑・,
        rate: Number(item.unitPrice || 0),
        amount: Number(item.amount || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
      })),
    ]
    const maxParts = format === 'split'
      ? Math.max(1, ...estimateOutputRows.map(row => row.parts.length))
      : 1
    // 縲碁・岼繧貞・縺代ｋ縲榊ｴ蜷医□縺代・・岼3縺ｨ繝｡繝｢縺ｮ髢薙∈遨ｺ逋ｽ縺ｮ隱ｿ謨ｴ蛻励ｒ1蛻怜・繧後ｋ縲・
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
          ? [row.parts[0], '蠎・, '隕句・繧雁叙莉・]
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
        row.rate === '' || row.rate == null ? '' : Number(row.rate === '' || row.rate == null ? '' : row.rate),
        row.amount === '' || row.amount == null ? '' : Number(row.amount === '' || row.amount == null ? '' : row.amount),
      ]
    })

    worksheet.mergeCells(1, 1, 1, lastColumn)
    const titleCell = worksheet.getCell(1, 1)
    titleCell.value = '隕狗ｩ咲畑繝・・繧ｿ'
    titleCell.font = { name: 'Yu Gothic', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9B72CF' } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
    worksheet.getRow(1).height = 30

    const metadata = [
      ['邂｡逅・ｼ夂､ｾ', entry.company || ''],
      ['迚ｩ莉ｶ蜷・, entry.propertyName || ''],
      ['菴乗園', entry.address || ''],
      ['蜿ｷ螳､', entry.unit || ''],
      ['蜃ｺ蜉帶律', new Intl.DateTimeFormat('ja-JP').format(new Date())],
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
      ? [...Array(maxParts)].map((_, index) => '鬆・岼' + (index + 1))
      : ['蟾･莠矩・岼']
    headers.push(...Array(spacerCount).fill(''))
    headers.push('繝｡繝｢', '謨ｰ驥・, '蜊倅ｽ・, '蜊倅ｾ｡', '驥鷹｡・)
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
    const safeName = `${entry.propertyName || '迚ｩ莉ｶ'}_${entry.unit || '蜿ｷ螳､'}`
      .replace(/[\\/:*?"<>|]/g, '_')
    const fileName = `${safeName}_隕狗ｩ咲畑.xlsx`
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    console.error('隕狗ｩ咲畑Excel繧貞・蜉帙〒縺阪∪縺帙ｓ縺ｧ縺励◆縲・, error)
    window.alert('隕狗ｩ咲畑Excel繧貞・蜉帙〒縺阪∪縺帙ｓ縺ｧ縺励◆縲・)
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
  縺阪ｃ: 'kya', 縺阪ｅ: 'kyu', 縺阪ｇ: 'kyo',
  縺励ｃ: 'sha', 縺励ｅ: 'shu', 縺励ｇ: 'sho',
  縺｡繧・ 'cha', 縺｡繧・ 'chu', 縺｡繧・ 'cho',
  縺ｫ繧・ 'nya', 縺ｫ繧・ 'nyu', 縺ｫ繧・ 'nyo',
  縺ｲ繧・ 'hya', 縺ｲ繧・ 'hyu', 縺ｲ繧・ 'hyo',
  縺ｿ繧・ 'mya', 縺ｿ繧・ 'myu', 縺ｿ繧・ 'myo',
  繧翫ｃ: 'rya', 繧翫ｅ: 'ryu', 繧翫ｇ: 'ryo',
  縺弱ｃ: 'gya', 縺弱ｅ: 'gyu', 縺弱ｇ: 'gyo',
  縺倥ｃ: 'ja', 縺倥ｅ: 'ju', 縺倥ｇ: 'jo',
  縺ｳ繧・ 'bya', 縺ｳ繧・ 'byu', 縺ｳ繧・ 'byo',
  縺ｴ繧・ 'pya', 縺ｴ繧・ 'pyu', 縺ｴ繧・ 'pyo',
  縺ｵ縺・ 'fa', 縺ｵ縺・ 'fi', 縺ｵ縺・ 'fe', 縺ｵ縺・ 'fo',
  縺・＝: 'wha', 縺・＜: 'whi', 縺・∞: 'whe', 縺・♂: 'who',
  縺・ 'a', 縺・ 'i', 縺・ 'u', 縺・ 'e', 縺・ 'o',
  縺・ 'ka', 縺・ 'ki', 縺・ 'ku', 縺・ 'ke', 縺・ 'ko',
  縺・ 'sa', 縺・ 'shi', 縺・ 'su', 縺・ 'se', 縺・ 'so',
  縺・ 'ta', 縺｡: 'chi', 縺､: 'tsu', 縺ｦ: 'te', 縺ｨ: 'to',
  縺ｪ: 'na', 縺ｫ: 'ni', 縺ｬ: 'nu', 縺ｭ: 'ne', 縺ｮ: 'no',
  縺ｯ: 'ha', 縺ｲ: 'hi', 縺ｵ: 'fu', 縺ｸ: 'he', 縺ｻ: 'ho',
  縺ｾ: 'ma', 縺ｿ: 'mi', 繧: 'mu', 繧・ 'me', 繧・ 'mo',
  繧・ 'ya', 繧・ 'yu', 繧・ 'yo',
  繧・ 'ra', 繧・ 'ri', 繧・ 'ru', 繧・ 're', 繧・ 'ro',
  繧・ 'wa', 繧・ 'o', 繧・ 'n',
  縺・ 'ga', 縺・ 'gi', 縺・ 'gu', 縺・ 'ge', 縺・ 'go',
  縺・ 'za', 縺・ 'ji', 縺・ 'zu', 縺・ 'ze', 縺・ 'zo',
  縺: 'da', 縺｢: 'ji', 縺･: 'zu', 縺ｧ: 'de', 縺ｩ: 'do',
  縺ｰ: 'ba', 縺ｳ: 'bi', 縺ｶ: 'bu', 縺ｹ: 'be', 縺ｼ: 'bo',
  縺ｱ: 'pa', 縺ｴ: 'pi', 縺ｷ: 'pu', 縺ｺ: 'pe', 縺ｽ: 'po',
  縺・ 'a', 縺・ 'i', 縺・ 'u', 縺・ 'e', 縺・ 'o',
  繧・ 'ya', 繧・ 'yu', 繧・ 'yo', 縺｣: '', 繝ｼ: '',
}

const romajiToKanaMap = {
  kya: '縺阪ｃ', kyu: '縺阪ｅ', kyo: '縺阪ｇ',
  sha: '縺励ｃ', shu: '縺励ｅ', sho: '縺励ｇ',
  sya: '縺励ｃ', syu: '縺励ｅ', syo: '縺励ｇ',
  cha: '縺｡繧・, chu: '縺｡繧・, cho: '縺｡繧・,
  cya: '縺｡繧・, cyu: '縺｡繧・, cyo: '縺｡繧・,
  nya: '縺ｫ繧・, nyu: '縺ｫ繧・, nyo: '縺ｫ繧・,
  hya: '縺ｲ繧・, hyu: '縺ｲ繧・, hyo: '縺ｲ繧・,
  mya: '縺ｿ繧・, myu: '縺ｿ繧・, myo: '縺ｿ繧・,
  rya: '繧翫ｃ', ryu: '繧翫ｅ', ryo: '繧翫ｇ',
  gya: '縺弱ｃ', gyu: 'gyu', gyo: '縺弱ｇ',
  ja: '縺倥ｃ', ju: '縺倥ｅ', jo: '縺倥ｇ',
  jya: '縺倥ｃ', jyu: '縺倥ｅ', jyo: '縺倥ｇ',
  bya: '縺ｳ繧・, byu: '縺ｳ繧・, byo: '縺ｳ繧・,
  pya: '縺ｴ繧・, pyu: '縺ｴ繧・, pyo: '縺ｴ繧・,
  fa: '縺ｵ縺・, fi: '縺ｵ縺・, fe: '縺ｵ縺・, fo: '縺ｵ縺・,
  shi: '縺・, chi: '縺｡', tsu: '縺､', fu: '縺ｵ',
  ka: '縺・, ki: '縺・, ku: '縺・, ke: '縺・, ko: '縺・,
  sa: '縺・, si: '縺・, su: '縺・, se: '縺・, so: '縺・,
  ta: '縺・, ti: '縺｡', tu: '縺､', te: '縺ｦ', to: '縺ｨ',
  na: '縺ｪ', ni: '縺ｫ', nu: '縺ｬ', ne: '縺ｭ', no: '縺ｮ',
  ha: '縺ｯ', hi: '縺ｲ', hu: '縺ｵ', he: '縺ｸ', ho: '縺ｻ',
  ma: '縺ｾ', mi: '縺ｿ', mu: '繧', me: '繧・, mo: '繧・,
  ya: '繧・, yu: '繧・, yo: '繧・,
  ra: '繧・, ri: '繧・, ru: '繧・, re: '繧・, ro: '繧・,
  wa: '繧・, wo: '繧・, nn: '繧・,
  ga: '縺・, gi: '縺・, gu: '縺・, ge: '縺・, go: '縺・,
  za: '縺・, zi: '縺・, ji: '縺・, zu: '縺・, ze: '縺・, zo: '縺・,
  da: '縺', di: '縺｢', du: '縺･', de: '縺ｧ', do: '縺ｩ',
  ba: '縺ｰ', bi: '縺ｳ', bu: '縺ｶ', be: '縺ｹ', bo: '縺ｼ',
  pa: '縺ｱ', pi: '縺ｴ', pu: '縺ｷ', pe: '縺ｺ', po: '縺ｽ',
  a: '縺・, i: '縺・, u: '縺・, e: '縺・, o: '縺・,
}

function toRomaji(value) {
  const text = toHiragana(value.normalize('NFKC').toLowerCase())
  let result = ''

  for (let index = 0; index < text.length;) {
    const current = text[index]
    const next = text[index + 1] || ''
    const pair = current + next

    if (current === '縺｣') {
      const following = text.slice(index + 1).match(/^[縺・繧転/)?.[0]
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
      result += '縺｣'
      index += 1
      continue
    }

    if (/^n(?=[^aiueoyn]|$)/i.test(remainder)) {
      result += '繧・
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

/* M-CROSS_SMART_SAVED_SEARCH_V4 */
const smartSearchSynonyms = [['cf','繧ｯ繝・す繝ｧ繝ｳ繝輔Ο繧｢'],['繧ｯ繝ｭ繧ｹ','螢∫ｴ・],['繧ｽ繝輔ヨ蟾ｾ譛ｨ','蟾ｾ譛ｨ'],['蠎願ｦ句・繧・,'隕句・繧・]]
function normalizeSmartSearchText(value) { return String(value ?? '').toLocaleLowerCase('ja').replace(/[\s縲]+/g,'').replace(/[()・茨ｼ会ｼｻ・ｽ\[\]繝ｻ,・・縲・・・\\_-]+/g,'') }
function expandSmartSearchToken(token) { const n=normalizeSmartSearchText(token); if(!n)return[]; const r=new Set([n]); smartSearchSynonyms.forEach(g=>{const v=g.map(normalizeSmartSearchText); if(v.includes(n))v.forEach(x=>r.add(x))}); return [...r] }
function getSavedEntrySearchParts(entry) { const p=[]; const add=(label,value)=>{const text=String(value??'').trim(); if(text)p.push({label,text})}; add('迚ｩ莉ｶ蜷・,entry.propertyName); add('邂｡逅・ｼ夂､ｾ',entry.company); add('菴乗園',entry.address); add('蜿ｷ螳､',entry.unit); add('繝｡繝｢',entry.draftMemo); add('迴ｾ蝣ｴ繝｡繝｢',entry.siteMemo); buildAutoTags(entry).forEach(tag=>add('繧ｿ繧ｰ',tag)); (entry.rooms||[]).forEach(v=>add('驛ｨ螻・,v)); (entry.records||[]).forEach(r=>{add('驛ｨ螻・,r.room);add('繧ｯ繝ｭ繧ｹ',r.type);add('繝｡繝｢',r.memo)}); (entry.cfRecords||[]).forEach(r=>{add('驛ｨ螻・,r.room);add('蟾･莠・,'CF 繧ｯ繝・す繝ｧ繝ｳ繝輔Ο繧｢');add('繝｡繝｢',r.memo)}); (entry.softRecords||[]).forEach(r=>{add('驛ｨ螻・,r.room);add('蟾･莠・,'繧ｽ繝輔ヨ蟾ｾ譛ｨ 蟾ｾ譛ｨ');add('繝｡繝｢',r.memo)}); (entry.floorTrimRecords||[]).forEach(r=>{add('驛ｨ螻・,r.roomA);add('驛ｨ螻・,r.roomB);add('蟾･莠・,'蠎願ｦ句・繧・隕句・繧・);add('繧ｫ繝ｩ繝ｼ',r.color)}); (entry.additionalWorks||[]).forEach(r=>{add('驛ｨ螻・,r.room);add('霑ｽ蜉菴懈･ｭ',r.work);add('繝｡繝｢',r.memo)}); return p }
function smartSavedEntryMatch(entry, query) { const tokens=String(query||'').trim().split(/[\s縲]+/).filter(Boolean); if(!tokens.length)return true; const parts=getSavedEntrySearchParts(entry).map(x=>({...x,normalized:normalizeSmartSearchText(x.text)})); return tokens.every(token=>{const alternatives=expandSmartSearchToken(token); return parts.some(part=>alternatives.some(term=>part.normalized.includes(term)))}) }

/* M-CROSS_AUTO_TAGS_V2 */
function buildAutoTags(entry) {
  const tags=new Set(); const cross=entry.records||[]; const cf=entry.cfRecords||[]; const soft=entry.softRecords||[]; const trim=entry.floorTrimRecords||[]; const works=entry.additionalWorks||[];
  if(cross.length)tags.add('繧ｯ繝ｭ繧ｹ縺ゅｊ'); if(cf.length)tags.add('CF縺ゅｊ'); if(soft.length)tags.add('繧ｽ繝輔ヨ蟾ｾ譛ｨ縺ゅｊ'); if(trim.length)tags.add('蠎願ｦ句・繧翫≠繧・); if(works.length)tags.add('霑ｽ蜉菴懈･ｭ縺ゅｊ');
  const text=[entry.siteMemo||'',...cross.flatMap(r=>[r.room||'',r.type||'',r.memo||'']),...cf.flatMap(r=>[r.room||'',r.memo||'']),...soft.flatMap(r=>[r.room||'',r.memo||'']),...works.flatMap(r=>[r.room||'',r.work||'',r.memo||''])].join(' ').toLocaleLowerCase('ja');
  [['謠帶ｰ玲援','謠帶ｰ玲援'],['逡ｳ','逡ｳ'],['繝医う繝ｬ','繝医う繝ｬ'],['繧ｨ繧｢繧ｳ繝ｳ','繧ｨ繧｢繧ｳ繝ｳ'],['邯ｲ謌ｸ','邯ｲ謌ｸ'],['辣ｧ譏・,'辣ｧ譏・],['髮ｻ逅・,'髮ｻ逅・],['豌ｴ貍上ｌ','豌ｴ貍上ｌ'],['遯灘床','遯灘床'],['繧ｫ繝ｼ繝・Φ','繧ｫ繝ｼ繝・Φ'],['繧ｳ繝ｼ繧ｭ繝ｳ繧ｰ','繧ｳ繝ｼ繧ｭ繝ｳ繧ｰ']].forEach(([w,t])=>{if(text.includes(w))tags.add(t)});
  return [...tags]
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
      error: '菫晏ｭ俶ｸ医∩縺ｮ邂｡逅・ｼ夂､ｾ繝ｻ迚ｩ莉ｶ繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ繧√∪縺帙ｓ縺ｧ縺励◆縲ゅョ繝ｼ繧ｿ繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲・,
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
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Dancing+Script:wght@600;700&family=Klee+One:wght@400;600&family=M+PLUS+Rounded+1c:wght@400;500;700;800;900&family=Noto+Serif+JP:wght@400;600;700;900&family=Zen+Kurenaido&family=Zen+Maru+Gothic:wght@400;500;600;700;800;900&family=DotGothic16&display=swap');
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
  .savedToolbar { display:grid; gap:12px; margin:16px 0 20px; padding:14px; border:1px solid #f0e3dc; border-radius:16px; background:#fffaf6; }
  .savedToolbar label { margin:0; }
  .savedToolbarGrid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:10px; }
  .savedListSummary { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:6px 0 0; color:#806f7b; font-size:14px; font-weight:800; }
  .savedCardTop { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:10px; }
  .savedCardTop input[type="checkbox"] { width:24px; min-height:24px; padding:0; margin:0; }
  .savedCardTitle { min-width:0; }
  .savedCardDate { color:#958896; font-size:12px; white-space:nowrap; }
  .savedPrimaryActions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:8px; }
  .savedMoreActions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:8px; padding-top:8px; border-top:1px dashed #ead8cb; }
  .savedMoreButton { width:100%; min-height:42px; margin-top:4px; border:1px solid #e6d8e6; border-radius:11px; color:#75697a; background:#fff; font:inherit; font-weight:800; cursor:pointer; }
  @media (max-width:520px) { .savedToolbarGrid { grid-template-columns:1fr; } .savedCardTop { grid-template-columns:auto minmax(0,1fr); } .savedCardDate { grid-column:2; white-space:normal; } }
  .actionButton { min-height:44px; padding:7px 6px; border:0; border-radius:11px; color:#fff; font-size:14px; }
  .actionOpen { background:#f08a79; }
  .actionOverwrite { background:#6e91e8; }
  .actionCsv { background:#63bea1; }
  .actionDelete { background:#d87883; }
  .settingsOptions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
  .settingsMenu { display:grid; gap:12px; margin-top:24px; }
  .settingsMenuButton { display:flex; align-items:center; justify-content:space-between; width:100%; min-height:62px; padding:14px 16px; border:1px solid #efc7d4; border-radius:15px; color:#65596a; background:linear-gradient(180deg,#fff,#fff8fa); box-shadow:0 4px 0 #ead8e0; font:inherit; font-size:17px; font-weight:800; text-align:left; cursor:pointer; }
  .settingsMenuButton span:last-child { color:#d27f91; font-size:22px; }
  .settingsPageIntro { margin:0 0 18px; color:#8e8190; line-height:1.7; text-align:center; }
  .globalListEditor { display:grid; gap:12px; margin-top:28px; padding:16px; border:1px solid #f0d6c8; border-radius:18px; background:rgba(255,255,255,.65); }
  .globalListEditor h3 { margin:0; color:#514751; font-size:20px; }
  .globalListEditor .primary,.globalListEditor .secondaryButton { margin:0; }
  .globalListItems { display:grid; gap:8px; }
  .globalListItem { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:10px; padding:10px 12px; border:1px solid #f0e3dc; border-radius:12px; background:#fffdfa; }
  .globalListItem > span { min-width:0; overflow-wrap:anywhere; font-weight:800; }
  .globalListItem .masterActions { display:flex; gap:6px; }
  .globalListItem .masterActions button { width:auto; min-width:64px; min-height:40px; margin:0; padding:6px 10px; font-size:13px; }
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
  /* Dark theme readability refinements */
  .theme-dark .subtitle,.theme-dark .eyebrow,.theme-dark .copyFormatPreview,.theme-dark .estimateIntro,.theme-dark .savedCardDate,.theme-dark .savedListSummary,.theme-dark .roomCheckDetails,.theme-dark .additionalWorkItem small { color:#ddd4dc; }
  .theme-dark .globalListEditor,.theme-dark .globalListItem,.theme-dark .savedToolbar,.theme-dark .settingsMenuButton,.theme-dark .savedMoreButton,.theme-dark .estimateRoom,.theme-dark .additionalWorkForm { color:#f7f3f6; border-color:#675c65; background:#302c31; }
  .theme-dark .globalListEditor h3,.theme-dark .globalListItem>span,.theme-dark .estimateRoom h3,.theme-dark .additionalWorkItem strong { color:#fff; }
  .theme-dark .settingsMenuButton,.theme-dark .savedMoreButton { color:#f4edf3; }
  .theme-dark .settingsMenuButton span:last-child { color:#ffb3c8; }
  .theme-dark .quickMemoButton,.theme-dark .floorTrimColorButton,.theme-dark .roomConfirmButton { color:#f2eaf0; border-color:#70646d; background:#3b353b; }
  .theme-dark .estimateTotal,.theme-dark .estimateNote { color:#f0e7ed; border-color:#675c65; background:#342e33; }
  .theme-dark .estimateMemo { color:#ffc0d3; }
  .theme-dark .savedUnit { color:#ffb3a2; }
  .theme-dark input::placeholder { color:#aaa0a8; opacity:1; }

  /* Cyber theme: higher contrast + stronger neon */
  .theme-cyber { color:#edffff; background:linear-gradient(rgba(0,255,255,.065) 1px,transparent 1px),linear-gradient(90deg,rgba(255,0,220,.055) 1px,transparent 1px),radial-gradient(circle at 12% 8%,rgba(0,246,255,.27),transparent 28%),radial-gradient(circle at 90% 25%,rgba(255,0,214,.24),transparent 30%),#02040a; background-size:25px 25px,25px 25px,auto,auto,auto; }
  .theme-cyber .brandLogo { filter:drop-shadow(0 0 6px #00f6ff) drop-shadow(0 0 16px #00f6ff) drop-shadow(0 0 20px #ff25d8); }
  .theme-cyber .header { border-color:#00f6ff; box-shadow:0 2px 0 rgba(255,37,216,.65); filter:drop-shadow(0 0 9px #00eaff); }
  .theme-cyber .brand { color:#d7ffff; text-shadow:1px 0 #ff25d8,-1px 0 #00f6ff,0 0 7px #00f6ff,0 0 18px rgba(0,246,255,.95); }
  .theme-cyber .mavieBrand { color:#ff8deb; text-shadow:0 0 6px #ff00d4,0 0 14px #ff00d4; }
  .theme-cyber .main h1,.theme-cyber .card h2,.theme-cyber .card h3,.theme-cyber .savedProperty,.theme-cyber .roomSummary h3,.theme-cyber .record,.theme-cyber .globalListItem>span,.theme-cyber .additionalWorkItem strong { color:#f4ffff; text-shadow:0 0 5px rgba(0,246,255,.65); }
  .theme-cyber .eyebrow,.theme-cyber .propertyLine,.theme-cyber .savedUnit { color:#6fffff; text-shadow:0 0 6px #00eaff,0 0 13px rgba(0,234,255,.75); }
  .theme-cyber .subtitle,.theme-cyber .savedMeta,.theme-cyber .savedCardDate,.theme-cyber .record small,.theme-cyber .card label>span,.theme-cyber .summaryLine,.theme-cyber .copyFormatPreview,.theme-cyber .estimateIntro,.theme-cyber .savedListSummary,.theme-cyber .roomCheckDetails,.theme-cyber .additionalWorkItem small { color:#c8f8ff; }
  .theme-cyber .card,.theme-cyber .savedItem,.theme-cyber .roomSummary,.theme-cyber .summary,.theme-cyber .customRoomForm,.theme-cyber .customRoomItem,.theme-cyber .estimateRoom,.theme-cyber .globalListEditor,.theme-cyber .globalListItem,.theme-cyber .savedToolbar,.theme-cyber .additionalWorkForm { border-color:#00eaff; background:linear-gradient(145deg,rgba(3,13,24,.98),rgba(21,3,26,.97)); box-shadow:0 0 0 1px rgba(255,0,214,.42),0 0 12px rgba(0,238,255,.5),0 0 28px rgba(255,0,214,.16),inset 0 0 24px rgba(0,238,255,.05); }
  .theme-cyber .card input,.theme-cyber .card select,.theme-cyber .propertyOption,.theme-cyber .settingsOption,.theme-cyber .estimateFactor input { color:#f3ffff; border-color:#00eaff; background:#020b13; box-shadow:inset 0 0 10px rgba(0,237,255,.13),0 0 8px rgba(0,237,255,.32); }
  .theme-cyber input::placeholder { color:#82b8c2; opacity:1; }
  .theme-cyber .settingsMenuButton,.theme-cyber .savedMoreButton { color:#dfffff; border:1px solid #00eaff; background:linear-gradient(135deg,#04121c,#130820); box-shadow:0 0 8px rgba(0,238,255,.5),inset 0 0 9px rgba(255,0,214,.08); text-shadow:0 0 5px rgba(0,238,255,.65); }
  .theme-cyber .settingsMenuButton span:last-child { color:#ff7be5; text-shadow:0 0 7px #ff25d8; }
  .theme-cyber .primary,.theme-cyber .add,.theme-cyber .saveButton,.theme-cyber .secondaryButton { color:#fff; border-color:#00f6ff; background:linear-gradient(135deg,#03212b,#101632 55%,#370b38); box-shadow:0 0 0 1px rgba(255,0,214,.5),0 0 10px #00dcea,0 0 22px rgba(255,0,214,.25),0 5px 0 #00151c; text-shadow:0 0 5px #00eaff; }
  .theme-cyber .room,.theme-cyber .measurementType,.theme-cyber .keypadButton { color:#d9ffff; border-color:#00dfee; background:linear-gradient(180deg,#061722,#060812); box-shadow:0 3px 0 #00151c,0 0 9px rgba(0,230,247,.46),inset 0 0 7px rgba(0,230,247,.08); text-shadow:0 0 4px rgba(0,238,255,.7); }
  .theme-cyber .room.active,.theme-cyber .measurementType.active,.theme-cyber .settingsOption.active { color:#fff; border-color:#ff38d9; background:linear-gradient(135deg,#062a35,#43103e); box-shadow:0 0 8px #ff25d8,0 0 18px rgba(255,52,214,.65),inset 0 0 12px rgba(0,238,255,.18); text-shadow:0 0 7px #ff80e6; }
  .theme-cyber .numberKeypad,.theme-cyber .address { border-color:#00cfe1; background:#020a11; box-shadow:inset 0 0 20px rgba(0,238,255,.12),0 0 10px rgba(0,238,255,.25); }
  .theme-cyber .keypadButton.utility,.theme-cyber .quickMemoButton,.theme-cyber .floorTrimColorButton,.theme-cyber .roomConfirmButton { color:#ffb6f2; border-color:#ff3bd7; background:#1c071d; box-shadow:0 0 8px rgba(255,42,203,.42); text-shadow:0 0 5px rgba(255,42,203,.85); }
  .theme-cyber .summaryLine strong,.theme-cyber .record b,.theme-cyber .estimateTotal strong { color:#86ffff; text-shadow:0 0 6px #00efff,0 0 14px rgba(0,238,255,.8); }
  .theme-cyber .estimateMemo { color:#ff9be9; text-shadow:0 0 4px rgba(255,42,203,.7); }
  .theme-cyber .estimateNote,.theme-cyber .estimateTotal { color:#e8fdff; border-color:#ff3ad5; background:linear-gradient(135deg,rgba(0,233,255,.12),rgba(255,38,207,.16)); }
  .theme-cyber .actionButton { border-color:#00eaff; box-shadow:0 0 8px rgba(0,238,255,.58); text-shadow:0 0 4px rgba(255,255,255,.55); }
  .theme-cyber .actionOpen,.theme-cyber .actionOverwrite { color:#dfffff; background:#071b35; }
  .theme-cyber .actionCsv { color:#b8ffe9; background:#073126; }
  .theme-cyber .actionDelete { color:#ffc5f1; border-color:#ff3ccf; background:#310829; box-shadow:0 0 9px rgba(255,60,207,.55); }
  .theme-cyber .back,.theme-cyber .measurementBackButton { color:#9effff; text-shadow:0 0 6px #00eaff; }
  .theme-cyber .empty { color:#9ccbd3; }
  /* Luxury Black: black, charcoal and gold with a refined serif display face */
  .theme-luxury { color:#f5ecd7; background:radial-gradient(circle at 85% 8%,rgba(205,164,70,.13),transparent 28%),linear-gradient(145deg,#080808,#17130d 58%,#050505); font-family:"Noto Serif JP","Yu Mincho",serif; }
  .theme-luxury .brand,.theme-luxury .main h1,.theme-luxury .card h2,.theme-luxury .card h3 { font-family:"Cinzel","Noto Serif JP",serif; color:#f1d78a; letter-spacing:.07em; text-shadow:0 1px 0 #4d3611,0 0 10px rgba(213,174,76,.22); }
  .theme-luxury .mavieBrand { color:#d7b866; text-shadow:none; }
  .theme-luxury .header { border-color:#8c6c2e; }
  .theme-luxury .card,.theme-luxury .savedItem,.theme-luxury .roomSummary,.theme-luxury .summary,.theme-luxury .estimateRoom,.theme-luxury .globalListEditor,.theme-luxury .globalListItem,.theme-luxury .savedToolbar { color:#f8f1df; border-color:#8d7139; background:linear-gradient(145deg,rgba(20,20,20,.97),rgba(34,28,17,.96)); box-shadow:0 0 0 1px rgba(232,199,112,.12),0 10px 28px rgba(0,0,0,.42); }
  .theme-luxury .card input,.theme-luxury .card select,.theme-luxury .propertyOption,.theme-luxury .settingsOption { color:#fff7df; border-color:#806832; background:#12110e; }
  .theme-luxury .subtitle,.theme-luxury .savedMeta,.theme-luxury .record small,.theme-luxury .card label>span,.theme-luxury .summaryLine,.theme-luxury .copyFormatPreview,.theme-luxury .estimateIntro,.theme-luxury .savedCardDate,.theme-luxury .savedListSummary { color:#d8ccb1; }
  .theme-luxury .primary,.theme-luxury .add,.theme-luxury .saveButton,.theme-luxury .secondaryButton,.theme-luxury .settingsOption.active { color:#171108; border:1px solid #f0d68a; background:linear-gradient(180deg,#f5dd97,#b78a31); box-shadow:0 5px 0 #6d4e18; text-shadow:none; }
  .theme-luxury .room,.theme-luxury .measurementType,.theme-luxury .keypadButton,.theme-luxury .settingsMenuButton,.theme-luxury .savedMoreButton { color:#f4e8c8; border-color:#7f6734; background:linear-gradient(180deg,#252117,#13110e); box-shadow:0 3px 0 #080705; }
  .theme-luxury .room.active,.theme-luxury .measurementType.active { color:#171108; background:linear-gradient(180deg,#f0d68a,#b4862c); }
  .theme-luxury .savedProperty,.theme-luxury .savedUnit,.theme-luxury .propertyLine,.theme-luxury .summaryLine strong,.theme-luxury .record b { color:#efd47f; }
  .theme-luxury input::placeholder { color:#9f947c; opacity:1; }

  /* SAKURA: soft Japanese spring palette and handwritten Japanese accents */
  .theme-sakura { color:#5d4651; background:radial-gradient(circle at 10% 8%,rgba(255,178,204,.48),transparent 25%),radial-gradient(circle at 88% 28%,rgba(255,221,230,.7),transparent 30%),linear-gradient(145deg,#fffafc,#fff0f4); font-family:"Klee One","Yu Gothic",sans-serif; }
  .theme-sakura .brand,.theme-sakura .main h1,.theme-sakura .card h2,.theme-sakura .card h3 { font-family:"Zen Kurenaido","Klee One",sans-serif; color:#b64670; letter-spacing:.07em; text-shadow:0 2px 0 #ffe0ea; }
  .theme-sakura .mavieBrand { color:#d96791; }
  .theme-sakura .header { border-color:#efb5c7; }
  .theme-sakura .card,.theme-sakura .savedItem,.theme-sakura .roomSummary,.theme-sakura .summary,.theme-sakura .estimateRoom,.theme-sakura .globalListEditor,.theme-sakura .globalListItem,.theme-sakura .savedToolbar { color:#5d4651; border-color:#efbfd0; background:rgba(255,255,255,.82); box-shadow:0 10px 0 #f3cfda,0 16px 32px rgba(164,75,111,.11); }
  .theme-sakura .card input,.theme-sakura .card select,.theme-sakura .propertyOption,.theme-sakura .settingsOption { color:#5b4450; border-color:#efc6d5; background:#fffafb; }
  .theme-sakura .primary,.theme-sakura .add,.theme-sakura .saveButton,.theme-sakura .secondaryButton { color:#fff; background:linear-gradient(180deg,#e985aa,#c85380); box-shadow:0 5px 0 #a53e66; }
  .theme-sakura .room,.theme-sakura .measurementType,.theme-sakura .keypadButton,.theme-sakura .settingsMenuButton,.theme-sakura .savedMoreButton { color:#844e65; border-color:#ecc3d2; background:linear-gradient(180deg,#fff,#fff1f6); box-shadow:0 3px 0 #efd1dc; }
  .theme-sakura .room.active,.theme-sakura .measurementType.active,.theme-sakura .settingsOption.active { color:#fff; background:linear-gradient(180deg,#e985aa,#c85380); }
  .theme-sakura .savedUnit,.theme-sakura .propertyLine,.theme-sakura .summaryLine strong,.theme-sakura .record b { color:#bd4e78; }

  /* Ice: glassy blue palette and rounded technical typography */
  .theme-ice { color:#23435b; background:radial-gradient(circle at 12% 8%,rgba(255,255,255,.95),transparent 22%),radial-gradient(circle at 90% 25%,rgba(127,219,255,.42),transparent 28%),linear-gradient(145deg,#f8fdff,#dff5ff 58%,#edfaff); font-family:"M PLUS Rounded 1c","Yu Gothic",sans-serif; }
  .theme-ice .brand,.theme-ice .main h1,.theme-ice .card h2,.theme-ice .card h3 { font-family:"M PLUS Rounded 1c",sans-serif; color:#176b9a; font-weight:800; letter-spacing:.045em; text-shadow:0 2px 0 #fff,0 0 10px rgba(55,174,224,.17); }
  .theme-ice .mavieBrand { color:#398ab4; }
  .theme-ice .header { border-color:#9ed8ef; }
  .theme-ice .card,.theme-ice .savedItem,.theme-ice .roomSummary,.theme-ice .summary,.theme-ice .estimateRoom,.theme-ice .globalListEditor,.theme-ice .globalListItem,.theme-ice .savedToolbar { color:#23435b; border-color:rgba(112,190,222,.72); background:rgba(255,255,255,.64); box-shadow:0 10px 0 rgba(134,201,226,.28),0 18px 38px rgba(40,119,154,.12); backdrop-filter:blur(16px); }
  .theme-ice .card input,.theme-ice .card select,.theme-ice .propertyOption,.theme-ice .settingsOption { color:#23435b; border-color:#a8dced; background:rgba(255,255,255,.8); }
  .theme-ice .primary,.theme-ice .add,.theme-ice .saveButton,.theme-ice .secondaryButton { color:#fff; background:linear-gradient(180deg,#64cbed,#2589bf); box-shadow:0 5px 0 #17668e; }
  .theme-ice .room,.theme-ice .measurementType,.theme-ice .keypadButton,.theme-ice .settingsMenuButton,.theme-ice .savedMoreButton { color:#2b6280; border-color:#a7d8e9; background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(220,245,255,.82)); box-shadow:0 3px 0 #abd7e7; }
  .theme-ice .room.active,.theme-ice .measurementType.active,.theme-ice .settingsOption.active { color:#fff; background:linear-gradient(180deg,#59c7ec,#278dbf); }
  .theme-ice .savedUnit,.theme-ice .propertyLine,.theme-ice .summaryLine strong,.theme-ice .record b { color:#1979a8; }

  /* Forest: calm green, ivory and wood tones with a humanist Japanese face */
  .theme-forest { color:#39463b; background:radial-gradient(circle at 12% 12%,rgba(141,181,132,.28),transparent 27%),radial-gradient(circle at 92% 28%,rgba(186,151,94,.2),transparent 28%),linear-gradient(145deg,#f6f3e8,#e7eee0); font-family:"Klee One","Yu Gothic",sans-serif; }
  .theme-forest .brand,.theme-forest .main h1,.theme-forest .card h2,.theme-forest .card h3 { font-family:"Noto Serif JP","Yu Mincho",serif; color:#285c3a; letter-spacing:.055em; text-shadow:0 2px 0 #e6f0df; }
  .theme-forest .mavieBrand { color:#80633d; }
  .theme-forest .header { border-color:#9db493; }
  .theme-forest .card,.theme-forest .savedItem,.theme-forest .roomSummary,.theme-forest .summary,.theme-forest .estimateRoom,.theme-forest .globalListEditor,.theme-forest .globalListItem,.theme-forest .savedToolbar { color:#39463b; border-color:#aec0a5; background:rgba(255,253,241,.88); box-shadow:0 10px 0 #cbd3be,0 18px 34px rgba(61,86,59,.11); }
  .theme-forest .card input,.theme-forest .card select,.theme-forest .propertyOption,.theme-forest .settingsOption { color:#39463b; border-color:#b6c5ac; background:#fffdf3; }
  .theme-forest .primary,.theme-forest .add,.theme-forest .saveButton,.theme-forest .secondaryButton { color:#fff; background:linear-gradient(180deg,#6f9f72,#3e744d); box-shadow:0 5px 0 #2d5638; }
  .theme-forest .room,.theme-forest .measurementType,.theme-forest .keypadButton,.theme-forest .settingsMenuButton,.theme-forest .savedMoreButton { color:#425846; border-color:#afbea6; background:linear-gradient(180deg,#fffdf4,#e8eee1); box-shadow:0 3px 0 #c4cbb9; }
  .theme-forest .room.active,.theme-forest .measurementType.active,.theme-forest .settingsOption.active { color:#fff; background:linear-gradient(180deg,#6f9f72,#3e744d); }
  .theme-forest .savedUnit,.theme-forest .propertyLine,.theme-forest .summaryLine strong,.theme-forest .record b { color:#3f754e; }
  .theme-forest .address,.theme-forest .numberKeypad { background:#f4efe1; border-color:#b9aa8b; }
  .todayStats { display:grid; grid-template-columns:auto 1fr 1fr; align-items:center; gap:10px; margin:14px 0 0; padding:12px 14px; border:1px solid rgba(155,114,207,.25); border-radius:16px; background:rgba(255,255,255,.58); text-align:center; }
  .todayStats strong { color:#a77bd1; letter-spacing:.14em; } .todayStats span { font-size:13px; font-weight:800; }
  .registrationEffect { position:fixed; z-index:1500; inset:0; overflow:hidden; pointer-events:none; }
  .registrationEffect span { --angle:calc(var(--i) * 45deg); position:absolute; left:50%; top:55%; font-size:30px; animation:burstEffect .7s ease-out forwards; filter:drop-shadow(0 0 8px currentColor); }
  @keyframes burstEffect { from { transform:translate(-50%,-50%) rotate(var(--angle)) translateY(0) scale(.4); opacity:1; } to { transform:translate(-50%,-50%) rotate(var(--angle)) translateY(-145px) scale(1.25); opacity:0; } }
  .completeBackdrop { position:fixed; z-index:1600; inset:0; display:grid; place-items:center; padding:20px; background:rgba(2,4,10,.72); backdrop-filter:blur(10px); }
  .completeCard { width:min(100%,420px); padding:28px; border:1px solid #9ddfea; border-radius:24px; color:#294855; background:linear-gradient(145deg,#fff,#eafaff); box-shadow:0 0 28px rgba(75,210,236,.45); text-align:center; }
  .completeCard small { letter-spacing:.2em; } .completeCard h2 { margin:8px 0 20px; font-size:28px; } .completeCard>div { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #cee9ef; } .completeCard p { font-weight:800; }
  .splashScreen { position:fixed; z-index:2000; inset:0; display:grid; place-content:center; gap:14px; color:#fff; background:#111; text-align:center; animation:splashOut 1.5s ease forwards; }
  .splashScreen strong { font-size:42px; letter-spacing:.18em; } .splashScreen span { font-size:12px; letter-spacing:.14em; }
  .splash-cyber { color:#8fffff; background:#02040a; text-shadow:0 0 9px #00eaff,0 0 22px #ff25d8; }
  .splash-luxury { color:#efd47f; background:#080808; font-family:"Cinzel",serif; }
  .splash-sakura { color:#c65380; background:#fff1f6; font-family:"Zen Kurenaido",sans-serif; }
  .splash-ice { color:#2589bf; background:#effbff; }
  .splash-forest { color:#3e744d; background:#eef2e7; font-family:"Noto Serif JP",serif; }
  .splash-galaxy { color:#d8c6ff; background:radial-gradient(circle,#33236d,#03020a); text-shadow:0 0 14px #7d5cff; }
  @keyframes splashOut { 0%,70% { opacity:1; } 100% { opacity:0; visibility:hidden; } }
  .galaxyUnlock { position:fixed; z-index:2100; inset:0; display:grid; place-content:center; gap:10px; color:#fff; background:radial-gradient(circle at center,#351c78,#05020d 65%); text-align:center; text-shadow:0 0 10px #8868ff; animation:splashOut 2.4s ease forwards; }
  .galaxyUnlock strong { font-size:30px; letter-spacing:.12em; } .galaxyUnlock span { font-size:52px; }
  .brandLogo { cursor:pointer; }
  .theme-galaxy { color:#eee8ff; background:radial-gradient(circle at 15% 12%,rgba(110,74,255,.35),transparent 25%),radial-gradient(circle at 87% 25%,rgba(255,64,218,.24),transparent 26%),linear-gradient(#05020d,#090822); font-family:"M PLUS Rounded 1c",sans-serif; }
  .theme-galaxy .brand,.theme-galaxy .main h1,.theme-galaxy .card h2,.theme-galaxy .card h3 { color:#d9ceff; text-shadow:0 0 8px #7d5cff; }
  .theme-galaxy .mavieBrand,.theme-galaxy .eyebrow,.theme-galaxy .propertyLine,.theme-galaxy .savedUnit { color:#ff9bed; text-shadow:0 0 7px #ff42d6; }
  .theme-galaxy .card,.theme-galaxy .savedItem,.theme-galaxy .roomSummary,.theme-galaxy .summary,.theme-galaxy .savedToolbar,.theme-galaxy .globalListEditor,.theme-galaxy .globalListItem { color:#f3efff; border-color:#765ce8; background:linear-gradient(145deg,rgba(11,8,35,.97),rgba(36,10,52,.94)); box-shadow:0 0 18px rgba(116,84,255,.38); }
  .theme-galaxy .card input,.theme-galaxy .card select,.theme-galaxy .settingsOption { color:#fff; border-color:#765ce8; background:#0c0925; }
  .theme-galaxy .subtitle,.theme-galaxy .savedMeta,.theme-galaxy .card label>span,.theme-galaxy .savedCardDate,.theme-galaxy .savedListSummary { color:#cdc4eb; }
  .theme-galaxy .primary,.theme-galaxy .add,.theme-galaxy .saveButton,.theme-galaxy .secondaryButton,.theme-galaxy .room.active,.theme-galaxy .measurementType.active,.theme-galaxy .settingsOption.active { color:#fff; background:linear-gradient(135deg,#7058ed,#e047bc); box-shadow:0 5px 0 #3a287f,0 0 12px rgba(216,67,193,.35); }
  .theme-galaxy .room,.theme-galaxy .measurementType,.theme-galaxy .keypadButton,.theme-galaxy .settingsMenuButton,.theme-galaxy .savedMoreButton { color:#ded7ff; border-color:#6955c9; background:#12102e; }
  /* RETRO SAFE: visual theme only. No event handlers or animation state. */
  .theme-retro {
    color:#f7fbff;
    background-color:#02040c;
    background-image:linear-gradient(180deg,rgba(1,3,12,.05),rgba(1,3,12,.28)),url('/retro-ny-bg.png');
    background-size:cover;
    background-position:center top;
    background-repeat:no-repeat;
    background-attachment:fixed;
    font-family:"DotGothic16","MS Gothic",monospace;
    image-rendering:pixelated;
  }
  .theme-retro .header { border-bottom:4px solid #00efff; box-shadow:0 4px 0 #ff2bd1; }
  .theme-retro .brandLogo { image-rendering:pixelated; filter:drop-shadow(3px 0 #ff2bd1) drop-shadow(-3px 0 #00efff); }
  .theme-retro .brand,.theme-retro .main h1,.theme-retro .card h2,.theme-retro .card h3 { color:#fff; font-family:"DotGothic16",monospace; text-shadow:3px 0 #00dffa,-3px 0 #ff27cc; }
  .theme-retro .mavieBrand { color:#ff67df; font-family:"DotGothic16",monospace; text-shadow:2px 2px #45104e; }
  .theme-retro .eyebrow,.theme-retro .propertyLine,.theme-retro .savedUnit { color:#36f6ff; text-shadow:2px 2px #064554; }
  .theme-retro .subtitle,.theme-retro .savedMeta,.theme-retro .record small,.theme-retro .card label>span,.theme-retro .summaryLine,.theme-retro .copyFormatPreview,.theme-retro .estimateIntro,.theme-retro .savedCardDate,.theme-retro .savedListSummary { color:#c8ddec; }
  .theme-retro .card,.theme-retro .savedItem,.theme-retro .roomSummary,.theme-retro .summary,.theme-retro .estimateRoom,.theme-retro .globalListEditor,.theme-retro .globalListItem,.theme-retro .savedToolbar,.theme-retro .additionalWorkForm,.theme-retro .todayStats { color:#f7fbff; border:3px solid #00eaff; border-radius:0; background:rgba(2,7,17,.87); box-shadow:4px 4px 0 #ff2bc9,-3px -3px 0 #19315d; backdrop-filter:blur(2px); }
  .theme-retro .card input,.theme-retro .card select,.theme-retro .propertyOption,.theme-retro .settingsOption,.theme-retro .estimateFactor input { color:#fff; border:2px solid #00eaff; border-radius:0; background:#030817; box-shadow:3px 3px 0 #14254b; font-family:"DotGothic16",monospace; }
  .theme-retro .primary,.theme-retro .add,.theme-retro .saveButton,.theme-retro .secondaryButton,.theme-retro .measurementCheckButton { color:#07101b; border:3px solid #00eaff; border-radius:0; background:#fff11c; box-shadow:5px 5px 0 #7b6600; font-family:"DotGothic16",monospace; text-shadow:none; }
  .theme-retro .secondaryButton,.theme-retro .saveButton { color:#f5ffff; background:#051125; box-shadow:5px 5px 0 #072f45; }
  .theme-retro .room,.theme-retro .measurementType,.theme-retro .keypadButton,.theme-retro .settingsMenuButton,.theme-retro .savedMoreButton,.theme-retro .quickMemoButton,.theme-retro .floorTrimColorButton,.theme-retro .roomConfirmButton { color:#fff; border:2px solid #00eaff; border-radius:0; background:#061020; box-shadow:4px 4px 0 #102048; font-family:"DotGothic16",monospace; text-shadow:2px 2px #07101f; }
  .theme-retro .room.active,.theme-retro .measurementType.active,.theme-retro .settingsOption.active { color:#fff; border-color:#ff32d2; background:#531044; box-shadow:4px 4px 0 #00eaff; }
  .theme-retro .keypadButton.utility { color:#ff70df; border-color:#ff32d2; }
  .theme-retro .add.crossRegister { color:#00160b; border-color:#5cff8d; background:#37f36f; box-shadow:5px 5px 0 #09712e; }
  .theme-retro .numberKeypad,.theme-retro .address { border:3px solid #00eaff; border-radius:0; background:rgba(2,7,20,.92); box-shadow:inset 0 0 0 2px #122047; }
  .theme-retro .record { color:#fff; border-color:#1b6f86; }
  .theme-retro .record b,.theme-retro .summaryLine strong,.theme-retro .estimateTotal strong { color:#fff11c; text-shadow:2px 2px #6d5800; }
  .theme-retro .settingsButton,.theme-retro .measurementBackButton,.theme-retro .back { color:#45f8ff; border-color:#00eaff; border-radius:0; background:#041020; box-shadow:3px 3px 0 #ff2bc9; font-family:"DotGothic16",monospace; }
  .theme-retro .propertyOption { position:relative; min-height:64px; padding-left:60px; }
  .theme-retro .propertyOption::before { content:""; position:absolute; left:9px; top:50%; width:42px; height:46px; transform:translateY(-50%); background:url('/retro-building-icon.png') center/contain no-repeat; image-rendering:pixelated; filter:drop-shadow(2px 2px 0 #ff2bc9); }
  .theme-retro .savedItem { position:relative; min-height:118px; padding-left:78px; }
  .theme-retro .savedItem::before { content:""; position:absolute; left:12px; top:17px; width:58px; height:68px; background:url('/retro-building-icon.png') center/contain no-repeat; image-rendering:pixelated; filter:drop-shadow(3px 3px 0 #ff2bc9) drop-shadow(-1px -1px 0 #00eaff); }
  .theme-retro .measurementTypes::before { content:"笘・FIELD QUEST 笘・; grid-column:1/-1; padding:7px; border:2px solid #fff22b; color:#fff22b; background:#0c0820; box-shadow:3px 3px 0 #ff2bc9; text-align:center; letter-spacing:.12em; }
  .theme-retro .completeCard { color:#fff; border:4px solid #00eaff; border-radius:0; background:#030817; box-shadow:6px 6px 0 #ff29cc; font-family:"DotGothic16",monospace; }
  .theme-retro .completeCard::before { content:"STAGE CLEAR!"; display:block; margin-bottom:12px; color:#ffef24; font-size:30px; text-shadow:3px 3px #ce238f; }
  @media(max-width:700px) { .theme-retro { background-size:auto 100vh; background-position:center top; } }
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
  /* 迴ｾ蝣ｴ蜈･蜉帶隼蝟・ 蜈･蜉帛ｮ御ｺ・ｒ蟒・ｭ｢縺励√ユ繝ｳ繧ｭ繝ｼ縺ｨ逋ｻ骭ｲ繝懊ち繝ｳ繧貞､ｧ蝙句喧 */
  .numberKeypad { gap:11px; padding:14px; }
  .keypadButton { min-height:60px; font-size:23px; border-radius:14px; }
  .crossInputArea .numberKeypad { gap:9px; padding:11px; }
  .crossInputArea .keypadButton { min-height:58px; font-size:23px; }
  .add.crossRegister { min-height:70px; margin:16px 0 22px; font-size:20px; }
  .card form > .add { min-height:66px; font-size:19px; }
  @media (max-width:600px) {
    .numberKeypad { gap:9px; padding:10px; }
    .keypadButton { min-height:60px; font-size:23px; }
    .crossInputArea .numberKeypad { gap:8px; padding:10px; }
    .crossInputArea .keypadButton { min-height:58px; font-size:23px; }
    .add.crossRegister { min-height:70px; font-size:20px; }
    .card form > .add { min-height:66px; font-size:19px; }
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

function NumberKeypad({ activeInput, onKey, decimalInput, showEnter = false, onEnter }) {
  if (!activeInput) return null

  return (
    <div className="numberKeypad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(key => (
        <button key={key} type="button" className="keypadButton" onClick={() => onKey(key)}>{key}</button>
      ))}
      <button type="button" className="keypadButton utility" onClick={() => onKey('clear')}>繧ｯ繝ｪ繧｢</button>
      <button type="button" className="keypadButton" onClick={() => onKey('0')}>0</button>
      <button type="button" className="keypadButton utility" onClick={() => onKey('backspace')} aria-label="1譁・ｭ怜炎髯､">竚ｫ</button>
      {decimalInput && (
        <div className="keypadEnterRow">
          <button type="button" className="keypadButton" onClick={() => onKey('decimal')}>.</button>
          {showEnter && <button type="button" className="keypadButton keypadEnterButton" onClick={onEnter}>Enter</button>}
        </div>
      )}
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
      setMessage('蜷後§蜷榊燕縺ｮ驛ｨ螻九′縺吶〒縺ｫ縺ゅｊ縺ｾ縺・)
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
      setMessage('蜷後§蜷榊燕縺ｮ驛ｨ螻九′縺吶〒縺ｫ縺ゅｊ縺ｾ縺・)
      return
    }
    onRenameRoom(editingRoom, name)
    setEditingRoom('')
    setEditingName('')
    setMessage('')
  }

  const pendingRoomHasData = roomToDelete ? roomHasData(roomToDelete) : false

  return (
    <section className="customRoomControls" aria-label="驛ｨ螻九・邂｡逅・>
      <button
        className="secondaryButton"
        type="button"
        onClick={() => {
          setShowForm(previous => !previous)
          setMessage('')
        }}
      >
        ・・驛ｨ螻九ｒ霑ｽ蜉
      </button>
      {showForm && (
        <form className="customRoomForm" onSubmit={saveRoom}>
          <label>
            <span>驛ｨ螻句錐</span>
            <input value={roomName} onChange={event => setRoomName(event.target.value)} />
          </label>
          {message && <p className="saveStatus" role="alert">{message}</p>}
          <button className="primary" type="submit">霑ｽ蜉</button>
        </form>
      )}
      <div className="customRoomList">
        {rooms.map(name => (
          <div className="customRoomItem" key={name}>
            {editingRoom === name ? (
              <form className="roomEditForm" onSubmit={saveEditedRoom}>
                <label>
                  <span>驛ｨ螻句錐</span>
                  <input value={editingName} onChange={event => setEditingName(event.target.value)} />
                </label>
                {message && <p className="saveStatus" role="alert">{message}</p>}
                <div className="roomManagementActions">
                  <button className="primary" type="submit">菫晏ｭ・/button>
                  <button className="secondaryButton" type="button" onClick={() => {
                    setEditingRoom('')
                    setEditingName('')
                    setMessage('')
                  }}>繧ｭ繝｣繝ｳ繧ｻ繝ｫ</button>
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
                  }}>邱ｨ髮・/button>
                  <button className="dangerButton" type="button" onClick={() => {
                    setRoomToDelete(name)
                    setEditingRoom('')
                    setMessage('')
                  }}>蜑企勁</button>
                </div>
              </>
            )}
            {roomToDelete === name && (
              <div className="roomDeleteConfirmation" role="alertdialog" aria-label={`${name}縺ｮ蜑企勁遒ｺ隱港}>
                <p>{pendingRoomHasData
                  ? `${name}縺ｫ縺ｯ謗｡蟇ｸ繝・・繧ｿ縺後≠繧翫∪縺吶ゅ％縺ｮ驛ｨ螻九ｒ蜑企勁縺吶ｋ縺ｨ縲√け繝ｭ繧ｹ繝ｻCF繝ｻ繧ｽ繝輔ヨ蟾ｾ譛ｨ繝ｻ繝｡繝｢繧ょ炎髯､縺輔ｌ縺ｾ縺吶よ悽蠖薙↓蜑企勁縺励∪縺吶°・歔
                  : '縺薙・驛ｨ螻九ｒ蜑企勁縺励∪縺吶°・・}</p>
                <div className="roomManagementActions">
                  <button className="dangerButton" type="button" onClick={() => {
                    onDeleteRoom(name)
                    setRoomToDelete('')
                  }}>蜑企勁縺吶ｋ</button>
                  <button className="secondaryButton" type="button" onClick={() => setRoomToDelete('')}>繧ｭ繝｣繝ｳ繧ｻ繝ｫ</button>
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

function getSaveKey(company, property, unit, workName = '') {
  return `${storagePrefix}${JSON.stringify([
    company,
    property?.name || '',
    property?.address || '',
    unit.trim(),
    String(workName || '').trim(),
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
        // 隱ｭ縺ｿ霎ｼ繧√↑縺・ョ繝ｼ繧ｿ縺ｯ荳隕ｧ縺九ｉ髯､螟・
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
  if (!value) return '菫晏ｭ俶律譎ゆｸ肴・'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '菫晏ｭ俶律譎ゆｸ肴・'
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
  return String(value || '迚ｩ莉ｶ').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim()
}

function normalizeImportedEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('菫晏ｭ倥ョ繝ｼ繧ｿ縺ｮ蠖｢蠑上′豁｣縺励￥縺ゅｊ縺ｾ縺帙ｓ縲・)
  for (const key of ['company', 'propertyName', 'address', 'unit']) {
    if (typeof value[key] !== 'string') throw new Error('迚ｩ莉ｶ諠・ｱ縺御ｸ崎ｶｳ縺励※縺・∪縺吶・)
  }
  if (!value.propertyName.trim() || !value.unit.trim()) throw new Error('迚ｩ莉ｶ蜷阪∪縺溘・蜿ｷ螳､縺後≠繧翫∪縺帙ｓ縲・)
  return {
    company: value.company, propertyName: value.propertyName, address: value.address, unit: value.unit.trim(),
    workName: typeof value.workName === 'string' && value.workName.trim() ? value.workName.trim() : '蜴溽憾蝗槫ｾｩ蟾･莠・,
    records: Array.isArray(value.records) ? value.records : [],
    cfRecords: Array.isArray(value.cfRecords) ? value.cfRecords : [],
    softRecords: Array.isArray(value.softRecords) ? value.softRecords : [],
    floorTrimRecords: Array.isArray(value.floorTrimRecords) ? value.floorTrimRecords : [],
    additionalWorks: Array.isArray(value.additionalWorks) ? value.additionalWorks : [],
    draftMemo: typeof value.draftMemo === 'string' ? value.draftMemo : '',
    siteMemo: typeof value.siteMemo === 'string' ? value.siteMemo : '',
    rooms: Array.isArray(value.rooms) && value.rooms.length ? value.rooms : defaultRooms,
    roomConfirmations: value.roomConfirmations && typeof value.roomConfirmations === 'object' && !Array.isArray(value.roomConfirmations) ? value.roomConfirmations : {},
    pageIndex: Number.isInteger(value.pageIndex) ? value.pageIndex : 0,
    cfPageIndex: Number.isInteger(value.cfPageIndex) ? value.cfPageIndex : 0,
    softPageIndex: Number.isInteger(value.softPageIndex) ? value.softPageIndex : 0,
    activePage: typeof value.activePage === 'string' ? value.activePage : 'cross',
    measurementType: measurementTypes.includes(value.measurementType) ? value.measurementType : '螟ｩ莠・,
    caseCrossFactor: Math.max(0, Number(value.caseCrossFactor) || 0),
    archived: Boolean(value.archived), updatedAt: new Date().toISOString(),
  }
}

function createMCrossShareFile(entry, extension = 'mcross') {
  const data = normalizeImportedEntry(entry)
  const packageData = { fileType: mCrossFileType, version: mCrossFileVersion, exportedAt: new Date().toISOString(), data }
  const safeExtension = ['json', 'txt'].includes(extension) ? extension : 'mcross'
  const fileName = `${makeSafeFileName(data.propertyName)}_${makeSafeFileName(data.unit)}蜿ｷ螳､.${safeExtension}`
  const mimeType = safeExtension === 'txt' ? 'text/plain' : 'application/json'
  const file = new File([JSON.stringify(packageData, null, 2)], fileName, { type: mimeType })
  return { data, file, fileName }
}

function downloadMCrossFile(file, fileName) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url; link.download = fileName; document.body.appendChild(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function downloadMCrossData(entry) {
  try { const { file, fileName } = createMCrossShareFile(entry); downloadMCrossFile(file, fileName) }
  catch (error) { console.error(error); window.alert('M-Cross繝・・繧ｿ繧呈嶌縺榊・縺帙∪縺帙ｓ縺ｧ縺励◆縲・) }
}

async function shareMCrossData(entry) {
  try {
    const { data, file, fileName } = createMCrossShareFile(entry, 'txt')
    const shareData = {
      title: `M-Cross ${data.propertyName} ${data.unit}蜿ｷ螳､`,
      text: 'M-Cross縺ｮ菫晏ｭ倥ョ繝ｼ繧ｿ縺ｧ縺吶・-Cross縺ｮ縲御ｿ晏ｭ俶ｸ医∩荳隕ｧ縲阪°繧芽ｪｭ縺ｿ霎ｼ繧薙〒縺上□縺輔＞縲・,
      files: [file],
    }
    if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try { await navigator.share(shareData); return }
      catch (error) { if (error?.name === 'AbortError') return; console.error(error) }
    }
    downloadMCrossFile(file, fileName)
    window.alert('縺薙・遶ｯ譛ｫ縺ｧ縺ｯ蜈ｱ譛臥判髱｢繧帝幕縺代↑縺九▲縺溘◆繧√√ヵ繧｡繧､繝ｫ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆縲・INE繧・Γ繝ｼ繝ｫ縺ｸ豺ｻ莉倥＠縺ｦ騾√▲縺ｦ縺上□縺輔＞縲・)
  } catch (error) { console.error(error); window.alert('M-Cross繝・・繧ｿ繧貞・譛峨〒縺阪∪縺帙ｓ縺ｧ縺励◆縲・) }
}

function downloadCsv(entry) {
  const headers = [
    '邂｡逅・ｼ夂､ｾ', '迚ｩ莉ｶ蜷・, '菴乗園', '蜿ｷ螳､', '驛ｨ螻句錐',
    '謗｡蟇ｸ蛹ｺ蛻・, '鬮倥＆', '譛ｬ謨ｰ', '謨ｰ驥・, '繝｡繝｢',
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
  const safeName = `${entry.propertyName || '迚ｩ莉ｶ'}_${entry.unit || '蜿ｷ螳､'}`.replace(/[\\\/:*?"<>|]/g, '_')
  link.href = url
  link.download = `${safeName}_謗｡蟇ｸ繝・・繧ｿ.csv`
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
    ['邂｡逅・ｼ夂､ｾ', entry.company || ''],
    ['迚ｩ莉ｶ蜷・, entry.propertyName || ''],
    ['菴乗園', entry.address || ''],
    ['蜿ｷ螳､', entry.unit || ''],
    ['蜃ｺ蜉帶律', exportedAt],
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
    titleCell.value = `${name} 謗｡蟇ｸ繝・・繧ｿ`
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

      if (headerText === '驛ｨ螻句錐') {
        minimumWidth = 8
        maximumWidth = 16
      } else if (headerText === '謗｡蟇ｸ蛹ｺ蛻・) {
        minimumWidth = 10
        maximumWidth = 16
      } else if (headerText === '繝｡繝｢') {
        minimumWidth = 14
        maximumWidth = 30
        extraWidth = 2
      } else if (['髟ｷ縺・, '鬮倥＆', '譛ｬ謨ｰ', '譫壽焚', '謨ｰ驥・].includes(headerText)) {
        minimumWidth = 10
        maximumWidth = 12
        extraWidth = 2
      } else if (headerText === '蜊倅ｽ・) {
        minimumWidth = 5
        maximumWidth = 6
        extraWidth = 1
      } else if (['驛ｨ螻銀蔵', '驛ｨ螻銀贈'].includes(headerText)) {
        minimumWidth = 10
        maximumWidth = 18
      } else if (headerText === '繧ｫ繝ｩ繝ｼ') {
        minimumWidth = 10
        maximumWidth = 14
      }

      column.width = Math.max(
        minimumWidth,
        Math.min(maximumWidth, maxLength + extraWidth)
      )
      column.alignment = {
        vertical: 'middle',
        horizontal: ['髟ｷ縺・, '鬮倥＆', '譛ｬ謨ｰ', '譫壽焚', '謨ｰ驥・].includes(headerText) ? 'right' : 'left',
        wrapText: maxLength + extraWidth > maximumWidth,
      }
    }

    if (name === '繧ｽ繝輔ヨ蟾ｾ譛ｨ') {
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
    if (name === '繧ｽ繝輔ヨ蟾ｾ譛ｨ') {
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
  /* M-CROSS_CF_EXCEL_ORDER_QUANTITY_V6 */
  const normalizedCfMaterialGroupsForExcel = normalizeCfMaterialGroups(
    entry.cfMaterialGroups || [],
    entry.cfRecords || []
  )

  const cfMaterialSummaryForExcel = getCfMaterialAllocationSummary(
    entry.cfRecords || [],
    normalizedCfMaterialGroupsForExcel
  )

  const cfExcelRoomPriority = [
    '螻・俣', 'LDK', '蜿ｰ謇', '豢矩俣', '蜥悟ｮ､', '髫取ｮｵ', '繝帙・繝ｫ',
    '邇・未', '閼ｱ陦｣謇', '豢鈴擇謇', '繝医う繝ｬ', '蜿守ｴ・, '蝨滄俣'
  ]

  const getCfRoomIndexForExcel = roomName => {
    const priorityIndex = cfExcelRoomPriority.indexOf(roomName)
    if (priorityIndex >= 0) return priorityIndex

    const projectRooms = Array.isArray(entry.rooms) ? entry.rooms : []
    const projectIndex = projectRooms.indexOf(roomName)
    return projectIndex >= 0
      ? cfExcelRoomPriority.length + projectIndex
      : Number.MAX_SAFE_INTEGER
  }

  const compareCfOrdersForExcel = (left, right) => {
    const sharedLength = Math.min(left.roomIndexes.length, right.roomIndexes.length)

    for (let index = 0; index < sharedLength; index += 1) {
      if (left.roomIndexes[index] !== right.roomIndexes[index]) {
        return left.roomIndexes[index] - right.roomIndexes[index]
      }
    }

    if (left.roomIndexes.length !== right.roomIndexes.length) {
      return left.roomIndexes.length - right.roomIndexes.length
    }

    if (left.usage !== right.usage) {
      return left.usage.localeCompare(right.usage, 'ja')
    }

    return left.orderLength - right.orderLength
  }

  const cfOrderItemsForExcel = [
    ...normalizedCfMaterialGroupsForExcel.map(group => {
      const pieces = getCfMaterialGroupPieces(group, entry.cfRecords || [])
      const roomNames = [
        ...new Set(pieces.map(piece => piece.room).filter(Boolean)),
      ].sort((left, right) =>
        getCfRoomIndexForExcel(left) - getCfRoomIndexForExcel(right)
      )

      const calculatedLength = getCfMaterialGroupLength(group, entry.cfRecords || [])
      const numericOrderLength = Number(group.orderLength)
      const orderLength =
        Number.isFinite(numericOrderLength) && numericOrderLength > 0
          ? numericOrderLength
          : calculatedLength

      return {
        usage: roomNames.join('・・) || '菴ｿ逕ｨ邂・園譛ｪ險ｭ螳・,
        roomIndexes: roomNames.map(getCfRoomIndexForExcel),
        breakdown: pieces
          .map(piece => formatQuantity(piece.pieceLength) + 'm')
          .join('・・),
        orderLength: Number(formatQuantity(orderLength)),
        productCode: group.productCode || '',
      }
    }),
    ...cfMaterialSummaryForExcel.unallocatedPieces.map(piece => ({
      usage: piece.room || '菴ｿ逕ｨ邂・園譛ｪ險ｭ螳・,
      roomIndexes: [getCfRoomIndexForExcel(piece.room || '')],
      breakdown: formatQuantity(piece.pieceLength) + 'm',
      orderLength: Number(formatQuantity(piece.pieceLength)),
      productCode: '',
    })),
  ].sort(compareCfOrdersForExcel)

  const combinedCfOrdersForExcel = []

  cfOrderItemsForExcel.forEach(item => {
    const existing = combinedCfOrdersForExcel.find(row =>
      row.usage === item.usage
      && row.breakdown === item.breakdown
      && row.orderLength === item.orderLength
      && row.productCode === item.productCode
    )

    if (existing) {
      existing.count += 1
      return
    }

    combinedCfOrdersForExcel.push({ ...item, count: 1 })
  })

  /* M-CROSS_CF_PRODUCT_FIRST_SOFT_NUMPAD_V3 */
  const cfRows = combinedCfOrdersForExcel.map(item => [
    item.productCode,
    item.usage,
    item.breakdown,
    item.orderLength,
    item.count,
    Number(formatQuantity(item.orderLength * item.count)),
  ])
  const softRows = (entry.softRecords || []).map(record => {
    const quantity = Number(formatQuantity(getSoftBaseboardQuantity(record)))
    return [record.room || '', quantity, quantity]
  })

  addWorksheet('繧ｯ繝ｭ繧ｹ', 'FFF08A79', ['驛ｨ螻句錐', '謗｡蟇ｸ蛹ｺ蛻・, '繝｡繝｢', '髟ｷ縺・, '譛ｬ謨ｰ', '謨ｰ驥・], crossRows)
  addWorksheet('CF', 'FF6E91E8', ['蜩∫分繝ｻ蝠・刀蜷・, '菴ｿ逕ｨ邂・園', '髟ｷ縺募・險ｳ', '豕ｨ譁・聞(m)', '譛ｬ謨ｰ', '豕ｨ譁・焚驥・m)'], cfRows)
  addWorksheet('繧ｽ繝輔ヨ蟾ｾ譛ｨ', 'FF63BEA1', ['驛ｨ螻句錐', '譫壽焚', '謨ｰ驥・], softRows)
  const floorTrimRows = (entry.floorTrimRecords || []).map(record => [record.roomA || '', record.roomB || '', record.color || '', Number(record.quantity || 0), '譛ｬ'])
  if (floorTrimRows.length > 0) addWorksheet('蠎願ｦ句・繧・, 'FFC6A4E8', ['驛ｨ螻銀蔵', '驛ｨ螻銀贈', '繧ｫ繝ｩ繝ｼ', '謨ｰ驥・, '蜊倅ｽ・], floorTrimRows)
  const additionalWorkRows = (entry.additionalWorks || []).map(item => [
    item.room || '', item.work || '', Number(item.quantity || 0), item.unit || '蠑・,
    Number(item.unitPrice || 0), Number(item.amount || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), item.memo || '',
  ])
  if (additionalWorkRows.length > 0) addWorksheet('霑ｽ蜉菴懈･ｭ', 'FFF0A36E', ['驛ｨ螻・, '菴懈･ｭ蜀・ｮｹ', '謨ｰ驥・, '蜊倅ｽ・, '蜊倅ｾ｡', '驥鷹｡・, '繝｡繝｢'], additionalWorkRows)

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const safeName = `${entry.propertyName || '迚ｩ莉ｶ'}_${entry.unit || '蜿ｷ螳､'}`.replace(/[\\/:*?"<>|]/g, '_')
  const fileName = `${safeName}_謗｡蟇ｸ繝・・繧ｿ.xlsx`
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    console.error('Excel繝輔ぃ繧､繝ｫ繧貞・蜉帙〒縺阪∪縺帙ｓ縺ｧ縺励◆縲・, error)
    window.alert('Excel繝輔ぃ繧､繝ｫ繧貞・蜉帙〒縺阪∪縺帙ｓ縺ｧ縺励◆縲・)
  }
}

/* M-CROSS_CF_MATERIAL_STEP4D1 */

function normalizeCfMaterialNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return 0
  return number
}

function roundCfMaterialNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.round((number + Number.EPSILON) * 10000) / 10000
}

function getCfPieceKey(recordId, pieceIndex) {
  return String(recordId || '') + ':' + String(pieceIndex)
}

function buildCfPieces(records) {
  if (!Array.isArray(records)) return []

  return records.flatMap(record => {
    if (!record || !record.id) return []

    const baseLength = normalizeCfMaterialNumber(record.length)
    const count = normalizeCfMaterialNumber(record.count)
    if (baseLength <= 0 || count <= 0) return []

    const wholeCount = Math.floor(count)
    const fractionalCount = roundCfMaterialNumber(count - wholeCount)
    const pieces = []

    for (let pieceIndex = 0; pieceIndex < wholeCount; pieceIndex += 1) {
      pieces.push({
        pieceKey: getCfPieceKey(record.id, pieceIndex),
        recordId: record.id,
        pieceIndex,
        room: record.room || '',
        memo: record.memo || '',
        sourceLength: baseLength,
        sourceCount: count,
        quantity: 1,
        pieceLength: roundCfMaterialNumber(baseLength),
        label: String(pieceIndex + 1) + '譛ｬ逶ｮ',
        isFractional: false,
      })
    }

    if (fractionalCount > 0) {
      const pieceIndex = wholeCount
      pieces.push({
        pieceKey: getCfPieceKey(record.id, pieceIndex),
        recordId: record.id,
        pieceIndex,
        room: record.room || '',
        memo: record.memo || '',
        sourceLength: baseLength,
        sourceCount: count,
        quantity: fractionalCount,
        pieceLength: roundCfMaterialNumber(baseLength * fractionalCount),
        label: '遶ｯ謨ｰ' + formatQuantity(fractionalCount) + '譛ｬ',
        isFractional: true,
      })
    }

    return pieces
  })
}

function getCfAllocationPieceKey(allocation) {
  if (!allocation || !allocation.recordId) return ''
  const pieceIndex = Number(allocation.pieceIndex)
  if (!Number.isInteger(pieceIndex) || pieceIndex < 0) return ''
  return getCfPieceKey(allocation.recordId, pieceIndex)
}

function getAllocatedCfPieceKeys(materialGroups) {
  const allocatedKeys = new Set()
  if (!Array.isArray(materialGroups)) return allocatedKeys

  materialGroups.forEach(group => {
    const allocations = Array.isArray(group?.allocations) ? group.allocations : []
    allocations.forEach(allocation => {
      const pieceKey = getCfAllocationPieceKey(allocation)
      if (pieceKey) allocatedKeys.add(pieceKey)
    })
  })

  return allocatedKeys
}

function getCfMaterialAllocationSummary(records, materialGroups) {
  const allPieces = buildCfPieces(records)
  const allocatedKeys = getAllocatedCfPieceKeys(materialGroups)
  const allocatedPieces = allPieces.filter(piece => allocatedKeys.has(piece.pieceKey))
  const unallocatedPieces = allPieces.filter(piece => !allocatedKeys.has(piece.pieceKey))

  const requiredLength = allPieces.reduce((sum, piece) => sum + piece.pieceLength, 0)
  const allocatedLength = allocatedPieces.reduce((sum, piece) => sum + piece.pieceLength, 0)
  const unallocatedLength = unallocatedPieces.reduce((sum, piece) => sum + piece.pieceLength, 0)

  return {
    allPieces,
    allocatedPieces,
    unallocatedPieces,
    requiredLength: roundCfMaterialNumber(requiredLength),
    allocatedLength: roundCfMaterialNumber(allocatedLength),
    unallocatedLength: roundCfMaterialNumber(unallocatedLength),
    isFullyAllocated: allPieces.length > 0 && unallocatedPieces.length === 0,
  }
}

/* M-CROSS_CF_MATERIAL_STEP4D2 */

/*
  譁ｰ縺励＞譚先侭繧ｰ繝ｫ繝ｼ繝怜ｽ｢蠑擾ｼ・
  {
    id,
    allocations: [
      { recordId, pieceIndex, quantity }
    ],
    orderLength,
    productCode
  }

  蜿､縺вecordIds蠖｢蠑上・縲∬ｩｲ蠖薙☆繧区治蟇ｸ陦後・蜈ｨ譛ｬ謨ｰ繧・
  allocations縺ｸ螻暮幕縺励※莠呈鋤諤ｧ繧剃ｿ昴■縺ｾ縺吶・
*/

function buildCfAllocationsFromRecordIds(recordIds, records) {
  const wantedIds = new Set(
    Array.isArray(recordIds) ? recordIds.filter(Boolean) : []
  )

  return buildCfPieces(records)
    .filter(piece => wantedIds.has(piece.recordId))
    .map(piece => ({
      recordId: piece.recordId,
      pieceIndex: piece.pieceIndex,
      quantity: piece.quantity,
    }))
}

function normalizeCfMaterialAllocation(allocation, pieceMap) {
  if (!allocation || !allocation.recordId) return null

  const pieceIndex = Number(allocation.pieceIndex)
  if (!Number.isInteger(pieceIndex) || pieceIndex < 0) return null

  const pieceKey = getCfPieceKey(allocation.recordId, pieceIndex)
  const piece = pieceMap.get(pieceKey)
  if (!piece) return null

  return {
    recordId: piece.recordId,
    pieceIndex: piece.pieceIndex,
    quantity: piece.quantity,
  }
}

function normalizeCfMaterialGroups(groups, records) {
  const sourceGroups = Array.isArray(groups) ? groups : []
  const allPieces = buildCfPieces(records)
  const pieceMap = new Map(
    allPieces.map(piece => [piece.pieceKey, piece])
  )
  const alreadyAllocated = new Set()

  return sourceGroups
    .map(group => {
      if (!group || typeof group !== 'object') return null

      const sourceAllocations = Array.isArray(group.allocations)
        ? group.allocations
        : buildCfAllocationsFromRecordIds(group.recordIds, records)

      const allocations = []

      sourceAllocations.forEach(allocation => {
        const normalized = normalizeCfMaterialAllocation(
          allocation,
          pieceMap
        )

        if (!normalized) return

        const pieceKey = getCfPieceKey(
          normalized.recordId,
          normalized.pieceIndex
        )

        // 蜷後§1譛ｬ縺瑚､・焚繧ｰ繝ｫ繝ｼ繝励∈驥崎､・＠縺ｪ縺・ｈ縺・∝・縺ｫ蜃ｺ縺溘げ繝ｫ繝ｼ繝励ｒ蜆ｪ蜈医＠縺ｾ縺吶・
        if (alreadyAllocated.has(pieceKey)) return

        alreadyAllocated.add(pieceKey)
        allocations.push(normalized)
      })

      if (allocations.length === 0) return null

      return {
        id: group.id || createRecordId(),
        allocations,
        orderLength: group.orderLength ?? '',
        productCode: group.productCode || '',
      }
    })
    .filter(Boolean)
}

function areCfMaterialGroupsEqual(left, right) {
  try {
    return JSON.stringify(left) === JSON.stringify(right)
  } catch {
    return false
  }
}

function getCfMaterialGroupPieces(group, records) {
  const pieceMap = new Map(
    buildCfPieces(records).map(piece => [piece.pieceKey, piece])
  )

  const allocations = Array.isArray(group?.allocations)
    ? group.allocations
    : buildCfAllocationsFromRecordIds(group?.recordIds, records)

  return allocations
    .map(allocation => {
      const pieceKey = getCfAllocationPieceKey(allocation)
      return pieceKey ? pieceMap.get(pieceKey) : null
    })
    .filter(Boolean)
}

function getCfMaterialGroupLength(group, records) {
  return roundCfMaterialNumber(
    getCfMaterialGroupPieces(group, records).reduce(
      (sum, piece) => sum + piece.pieceLength,
      0
    )
  )
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
  onRegistered,
  materialGroups = [],
  setMaterialGroups,
  onMaterialGroupsChanged,
}) {
  /* M-CROSS_CF_MATERIAL_STEP4A */
  const [length, setLength] = useState('')
  const [count, setCount] = useState('')
  const [memo, setMemo] = useState('')
  const [activeInput, setActiveInput] = useState('')

  /* M-CROSS_CF_MATERIAL_STEP4D3 */
  const [selectedMaterialPieceKeys, setSelectedMaterialPieceKeys] = useState([])
  const [materialOrderLength, setMaterialOrderLength] = useState('')
  const [materialProductCode, setMaterialProductCode] = useState('')

  const normalizedMaterialGroups = normalizeCfMaterialGroups(
    materialGroups,
    records
  )

  const materialSummary = getCfMaterialAllocationSummary(
    records,
    normalizedMaterialGroups
  )

  const availableMaterialPieces = materialSummary.unallocatedPieces
  const selectedMaterialPieces = availableMaterialPieces.filter(piece =>
    selectedMaterialPieceKeys.includes(piece.pieceKey)
  )

  const selectedMaterialLength = roundCfMaterialNumber(
    selectedMaterialPieces.reduce(
      (sum, piece) => sum + piece.pieceLength,
      0
    )
  )

  useEffect(() => {
    if (!setMaterialGroups) return
    if (areCfMaterialGroupsEqual(materialGroups, normalizedMaterialGroups)) return

    setMaterialGroups(normalizedMaterialGroups)
    onMaterialGroupsChanged?.()
  }, [records, materialGroups, setMaterialGroups])

  useEffect(() => {
    const availableKeys = new Set(
      availableMaterialPieces.map(piece => piece.pieceKey)
    )

    setSelectedMaterialPieceKeys(previous => {
      const next = previous.filter(key => availableKeys.has(key))
      return next.length === previous.length ? previous : next
    })
  }, [records, materialGroups])

  function toggleMaterialPiece(pieceKey) {
    setSelectedMaterialPieceKeys(previous =>
      previous.includes(pieceKey)
        ? previous.filter(key => key !== pieceKey)
        : [...previous, pieceKey]
    )
  }

  function createMaterialGroup() {
    if (!setMaterialGroups || selectedMaterialPieces.length === 0) return

    const allocations = selectedMaterialPieces.map(piece => ({
      recordId: piece.recordId,
      pieceIndex: piece.pieceIndex,
      quantity: piece.quantity,
    }))

    const numericOrderLength = Number(
      String(materialOrderLength).replace(/[縲ゑｼ讃/g, '.')
    )

    const nextOrderLength =
      Number.isFinite(numericOrderLength) && numericOrderLength > 0
        ? numericOrderLength
        : selectedMaterialLength

    setMaterialGroups(previous => [
      ...normalizeCfMaterialGroups(previous, records),
      {
        id: createRecordId(),
        allocations,
        orderLength: nextOrderLength,
        productCode: materialProductCode.trim(),
      },
    ])

    setSelectedMaterialPieceKeys([])
    setMaterialOrderLength('')
    setMaterialProductCode('')
    onMaterialGroupsChanged?.()
  }

  function updateMaterialGroup(groupId, patch) {
    if (!setMaterialGroups) return

    setMaterialGroups(previous =>
      normalizeCfMaterialGroups(previous, records).map(group =>
        group.id === groupId ? { ...group, ...patch } : group
      )
    )

    onMaterialGroupsChanged?.()
  }

  function releaseMaterialGroup(groupId) {
    if (!setMaterialGroups) return

    setMaterialGroups(previous =>
      normalizeCfMaterialGroups(previous, records).filter(
        group => group.id !== groupId
      )
    )

    onMaterialGroupsChanged?.()
  }

  const memoInputRef = useRef(null)
  const lengthRoomAreaRef = useRef(null)
  const lengthEntryAreaRef = useRef(null)
  const lengthInputAreaRef = useRef(null)
  const isSummaryPage = pageIndex === rooms.length
  const room = isSummaryPage ? '' : rooms[pageIndex]
  const roomRecords = records.filter(item => item.room === room)
  const unit = countOnly ? '譫・ : 'm'
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
      if (countOnly || currentValue.includes('.')) return
      return setValue(currentValue ? `${currentValue}.` : '0.')
    }
    setValue(`${currentValue}${key}`)
  }

  /* M-CROSS_CF_UI_ENTER_FIX_V1 */
  function handleMeasurementEnter() {
    if (countOnly) return

    if (activeInput === 'length') {
      const numericLength = Number(String(length).replace(/[縲ゑｼ讃/g, '.'))
      if (!Number.isFinite(numericLength) || numericLength <= 0) return

      setActiveInput('count')
      requestAnimationFrame(() => {
        lengthInputAreaRef.current
          ?.querySelector('input[aria-label="CF譛ｬ謨ｰ蜈･蜉・], input[data-length-count="count"]')
          ?.focus()
      })
      return
    }

    if (activeInput === 'count') {
      const numericLength = Number(String(length).replace(/[縲ゑｼ讃/g, '.'))
      const numericCount = Number(String(count).replace(/[縲ゑｼ讃/g, '.'))
      if (!Number.isFinite(numericLength) || numericLength <= 0) return
      if (!Number.isFinite(numericCount) || numericCount <= 0) return

      addRecord({ preventDefault() {} })
      requestAnimationFrame(() => setActiveInput('length'))
    }
  }

  useEffect(() => {
    if (!activeInput) return undefined

    function handlePhysicalNumpad(event) {
      const target = event.target
      const isEditable = target instanceof HTMLInputElement && !target.readOnly
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || target instanceof HTMLElement && target.isContentEditable
      if (isEditable) return

      if (/^Numpad[0-9]$/.test(event.code)) {
        event.preventDefault()
        updateInput(event.code.slice(-1))
        return
      }
      if (event.code === 'NumpadDecimal' || event.key === '.') {
        event.preventDefault()
        updateInput('decimal')
        return
      }
      if (event.code === 'NumpadEnter' || event.key === 'Enter') {
        event.preventDefault()

        if (countOnly) {
          const numericQuantity = Number(count)
          if (!Number.isInteger(numericQuantity) || numericQuantity < 1) return
          addRecord({ preventDefault() {} })
          requestAnimationFrame(() => setActiveInput('count'))
          return
        }

        handleMeasurementEnter()
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        updateInput('backspace')
        return
      }
      if (event.key === 'Escape' || event.key === 'Delete') {
        event.preventDefault()
        updateInput('clear')
      }
    }

    window.addEventListener('keydown', handlePhysicalNumpad)
    return () => window.removeEventListener('keydown', handlePhysicalNumpad)
  }, [countOnly, activeInput, length, count])

  function addRecord(event) {
    event.preventDefault()
    if (countOnly) {
      const quantity = Number(count)
      if (!Number.isInteger(quantity) || quantity < 1) return
      setRecords(prev => [...prev, { id: createRecordId(), room, quantity, memo: memo.trim() }])
    } else {
      const numericLength = Number(length.replace(/[縲ゑｼ讃/g, '.'))
      const numericCount = Number(count)
      if (!Number.isFinite(numericLength) || numericLength <= 0 || !Number.isFinite(numericCount) || numericCount <= 0) return
      setRecords(prev => [...prev, {
        id: createRecordId(), room, length: numericLength, count: numericCount, memo: memo.trim(),
      }])
    }
    onRoomRecordsChanged(room)
    onRegistered?.()
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
      <nav ref={lengthRoomAreaRef} className="roomTabs" aria-label={`${title}縺ｮ驛ｨ螻義}>
        {rooms.map((name, index) => (
          <button key={name} type="button" className={pageIndex === index ? 'room active' : 'room'} onClick={() => goToPage(index)}>{name}</button>
        ))}
        <button type="button" className={isSummaryPage ? 'room active' : 'room'} onClick={() => goToPage(rooms.length)}>蜈ｨ螳､蜷郁ｨ・/button>
      </nav>

      {isSummaryPage ? (
        <section className="card">
          <h2>驛ｨ螻九＃縺ｨ縺ｮ{title}蜷郁ｨ・/h2>
          {rooms.map(roomName => (
            <div className="roomSummary" key={roomName}>
              <h3>{roomName}</h3>
              <div className="summaryLine"><span>{title}</span><strong>{formatQuantity(roomTotals[roomName] || 0)}{unit}</strong></div>
            </div>
          ))}
          <div className="summary">
            <div className="summaryLine summaryGrand"><span>蜈ｨ螳､{title}蜷郁ｨ・/span><strong>{formatQuantity(total)}{unit}</strong></div>

          {/* M-CROSS_CF_MATERIAL_STEP4D3_UI */}
          {title === 'CF' && setMaterialGroups && (
            <div className="cfMaterialPanel">
              <h2>CF譚先侭蜑ｲ蠖・/h2>
              <p className="subtitle">
                CF繧・譛ｬ縺壹▽驕ｸ縺ｳ縲√▽縺ｪ縺・〒豕ｨ譁・☆繧狗ｵ・∩蜷医ｏ縺帙ｒ菴懊ｊ縺ｾ縺吶・
              </p>

              <div className="cfMaterialAllocationSummary">
                <div className="summaryLine">
                  <span>蠢・ｦ・聞蜷郁ｨ・/span>
                  <strong>{formatQuantity(materialSummary.requiredLength)}m</strong>
                </div>
                <div className="summaryLine">
                  <span>蜑ｲ蠖捺ｸ医∩</span>
                  <strong>{formatQuantity(materialSummary.allocatedLength)}m</strong>
                </div>
                <div className="summaryLine">
                  <span>譛ｪ蜑ｲ蠖・/span>
                  <strong>{formatQuantity(materialSummary.unallocatedLength)}m</strong>
                </div>
              </div>

              <h3>譛ｪ蜑ｲ蠖薙・CF</h3>

              {availableMaterialPieces.length === 0 ? (
                <p className="empty">
                  {materialSummary.allPieces.length > 0
                    ? '縺吶∋縺ｦ縺ｮCF縺梧攝譁吶∈蜑ｲ繧雁ｽ薙※繧峨ｌ縺ｦ縺・∪縺・
                    : 'CF逋ｻ骭ｲ縺後≠繧翫∪縺帙ｓ'}
                </p>
              ) : (
                <div className="cfMaterialChoices">
                  {availableMaterialPieces.map(piece => (
                    <label className="cfMaterialChoice" key={piece.pieceKey}>
                      <input
                        type="checkbox"
                        checked={selectedMaterialPieceKeys.includes(piece.pieceKey)}
                        onChange={() => toggleMaterialPiece(piece.pieceKey)}
                      />
                      <span>
                        <strong>{piece.room || '驛ｨ螻区悴險ｭ螳・}縲{piece.label}</strong>
                        <small>
                          {piece.isFractional
                            ? formatQuantity(piece.sourceLength) + 'm ﾃ・' + formatQuantity(piece.quantity) + '譛ｬ = ' + formatQuantity(piece.pieceLength) + 'm'
                            : formatQuantity(piece.pieceLength) + 'm ﾃ・1譛ｬ'}
                        </small>
                        {piece.memo && <small>繝｡繝｢・嘴piece.memo}</small>}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {selectedMaterialPieces.length > 0 && (
                <div className="cfMaterialCreate">
                  <h3>驕ｸ謚樔ｸｭ縺ｮ蜀・ｨｳ</h3>
                  {selectedMaterialPieces.map(piece => (
                    <div className="summaryLine" key={piece.pieceKey}>
                      <span>{piece.room || '驛ｨ螻区悴險ｭ螳・}縲{piece.label}</span>
                      <strong>{formatQuantity(piece.pieceLength)}m</strong>
                    </div>
                  ))}

                  <div className="summaryLine summaryGrand">
                    <span>險育ｮ鈴聞</span>
                    <strong>{formatQuantity(selectedMaterialLength)}m</strong>
                  </div>

                  <label>
                    <span>豕ｨ譁・聞・・・・/span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={materialOrderLength}
                      onChange={event => setMaterialOrderLength(event.target.value)}
                      placeholder={formatQuantity(selectedMaterialLength)}
                    />
                  </label>

                  <label>
                    <span>蜩∫分繝ｻ蝠・刀蜷・/span>
                    <input
                      type="text"
                      value={materialProductCode}
                      onChange={event => setMaterialProductCode(event.target.value)}
                      placeholder="萓具ｼ唏M-12001"
                    />
                  </label>

                  <button className="add" type="button" onClick={createMaterialGroup}>
                    驕ｸ謚槭＠縺櫃F繧呈攝譁吶↓縺吶ｋ
                  </button>
                </div>
              )}

              {normalizedMaterialGroups.length > 0 && (
                <div className="cfMaterialGroupList">
                  <h3>譚先侭逋ｺ豕ｨ繧ｰ繝ｫ繝ｼ繝・/h3>

                  {normalizedMaterialGroups.map((group, index) => {
                    const groupPieces = getCfMaterialGroupPieces(group, records)
                    const calculatedLength = getCfMaterialGroupLength(group, records)
                    const roomNames = [
                      ...new Set(groupPieces.map(piece => piece.room).filter(Boolean)),
                    ]
                    const numericOrderLength = Number(group.orderLength)
                    const hasDifference = Number.isFinite(numericOrderLength)
                      && roundCfMaterialNumber(numericOrderLength) !== calculatedLength

                    return (
                      <div className="cfMaterialGroup" key={group.id}>
                        <div className="cfMaterialGroupHeader">
                          <strong>CF譚先侭 {index + 1}</strong>
                          <button
                            type="button"
                            onClick={() => releaseMaterialGroup(group.id)}
                            aria-label={'CF譚先侭' + (index + 1) + '縺ｮ蜑ｲ蠖薙ｒ隗｣髯､'}
                          >
                            ﾃ・
                          </button>
                        </div>

                        <p>{roomNames.join(' ・・') || '蟇ｾ雎｡繝・・繧ｿ縺ｪ縺・}</p>

                        {groupPieces.map(piece => (
                          <div className="summaryLine" key={piece.pieceKey}>
                            <span>{piece.room || '驛ｨ螻区悴險ｭ螳・}縲{piece.label}</span>
                            <strong>{formatQuantity(piece.pieceLength)}m</strong>
                          </div>
                        ))}

                        <div className="summaryLine summaryGrand">
                          <span>險育ｮ鈴聞</span>
                          <strong>{formatQuantity(calculatedLength)}m</strong>
                        </div>

                        {hasDifference && (
                          <p className="saveStatus" role="status">
                            險育ｮ鈴聞縺ｨ豕ｨ譁・聞縺檎焚縺ｪ繧翫∪縺吶ゅΟ繧ｹ蛻・ｒ蜷ｫ繧蝣ｴ蜷医・縺昴・縺ｾ縺ｾ縺ｧ蝠城｡後≠繧翫∪縺帙ｓ縲・
                          </p>
                        )}

                        <label>
                          <span>豕ｨ譁・聞・・・・/span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={group.orderLength ?? ''}
                            onChange={event => updateMaterialGroup(group.id, {
                              orderLength: event.target.value,
                            })}
                          />
                        </label>

                        <label>
                          <span>蜩∫分繝ｻ蝠・刀蜷・/span>
                          <input
                            type="text"
                            value={group.productCode || ''}
                            onChange={event => updateMaterialGroup(group.id, {
                              productCode: event.target.value,
                            })}
                            placeholder="萓具ｼ唏M-12001"
                          />
                        </label>

                        <button
                          className="secondaryButton"
                          type="button"
                          onClick={() => releaseMaterialGroup(group.id)}
                        >
                          縺薙・譚先侭縺ｮ蜑ｲ蠖薙ｒ隗｣髯､
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          </div>
        </section>
      ) : (
        <>
          <section ref={lengthEntryAreaRef} className="card">
            <h2>{room}</h2>
            <form ref={lengthInputAreaRef} onSubmit={addRecord}>
              {countOnly ? (
                <div className="inputRow" style={{ gridTemplateColumns: '1fr' }}>
                  <label><span>譫壽焚</span><input type="text" inputMode="none" readOnly data-length-count="count" aria-label="CF譛ｬ謨ｰ蜈･蜉・ value={count} onFocus={() => setActiveInput('count')} onClick={() => setActiveInput('count')} placeholder="繧ｿ繝・・" /></label>
                </div>
              ) : (
                <div className="inputRow">
                  <label><span>髟ｷ縺包ｼ医Γ繝ｼ繝医Ν・・/span><input type="text" inputMode="none" readOnly data-length-count="length" aria-label="CF髟ｷ縺募・蜉・ value={length} onFocus={() => setActiveInput('length')} onClick={() => setActiveInput('length')} placeholder="繧ｿ繝・・" /></label>
                  <label><span>譛ｬ謨ｰ</span><input type="text" inputMode="none" readOnly value={count} onFocus={() => setActiveInput('count')} onClick={() => setActiveInput('count')} placeholder="繧ｿ繝・・" /></label>
                </div>
              )}
              <NumberKeypad
                activeInput={activeInput}
                onKey={updateInput}
                decimalInput={!countOnly && (activeInput === 'length' || activeInput === 'count')}
                showEnter={!countOnly}
                onEnter={handleMeasurementEnter}
              />
              <label>
                <span>繝｡繝｢</span>
                <input ref={memoInputRef} className="memoInput" type="text" value={memo} onChange={event => setMemo(event.target.value)} placeholder="萓具ｼ夂ｪ馴擇縲∝庶邏榊・" />
              </label>
              {countOnly && <button className="add" type="submit">・・繧ｽ繝輔ヨ蟾ｾ譛ｨ逋ｻ骭ｲ</button>}
            </form>
            <div className="records">
              {!countOnly && <h2>{room}縺ｮ{title}逋ｻ骭ｲ</h2>}
              {roomRecords.length === 0 ? (
                <p className="empty">{room}縺ｮ{title}逋ｻ骭ｲ蜀・ｮｹ縺ｯ縺ゅｊ縺ｾ縺帙ｓ</p>
              ) : roomRecords.map(item => (
                <div className="record" key={item.id}>
                  <div>
                    <strong>{countOnly ? '繧ｽ繝輔ヨ蟾ｾ譛ｨ逋ｻ骭ｲ' : title}</strong>
                    <small>{countOnly ? `${formatQuantity(item.quantity)}譫啻 : `${Number(item.length).toFixed(2)}m ﾃ・${item.count}譛ｬ`}</small>
                    {item.memo && <small>繝｡繝｢・嘴item.memo}</small>}
                  </div>
                  <b>{formatQuantity(getQuantity(item))}{unit}</b>
                  <button type="button" onClick={() => {
                    setRecords(prev => prev.filter(record => record.id !== item.id))
                    onRoomRecordsChanged(room)
                  }} aria-label={`${room}縺ｮ${title}逋ｻ骭ｲ繧貞炎髯､`}>ﾃ・/button>
                </div>
              ))}
            </div>
            <div className="summary">
              <div className="summaryLine summaryGrand"><span>{room}縺ｮ{title}蜷郁ｨ・/span><strong>{formatQuantity(roomTotals[room] || 0)}{unit}</strong></div>
            </div>
          </section>
          <div className="roomNavigation">
            <button className="back" type="button" disabled={pageIndex === 0} onClick={() => goToPage(pageIndex - 1)}>竊・蜑阪・驛ｨ螻・/button>
            <button className="primary roomNavigationNext" type="button" onClick={() => goToPage(pageIndex + 1)}>
              {pageIndex === rooms.length - 1 ? '蜈ｨ螳､蜷郁ｨ医∈ 竊・ : '谺｡縺ｮ驛ｨ螻・竊・}
            </button>
          </div>
        </>
      )}
    </>
  )
}

function FloorTrimSection({ rooms, records, setRecords, onChanged, onRegistered }) {
  const [roomA, setRoomA] = useState(rooms[0] || '')
  const [roomB, setRoomB] = useState(rooms[1] || rooms[0] || '')
  const [color, setColor] = useState('繧ｷ繝ｫ繝舌・')
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
    onRegistered?.()
  }

  return (
    <section className="card floorTrimSection">
      <h2>蠎願ｦ句・繧・/h2>
      <form onSubmit={addFloorTrim}>
        <div className="floorTrimGrid">
          <label><span>驛ｨ螻銀蔵</span><select value={roomA} onChange={event => setRoomA(event.target.value)}>{rooms.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
          <label><span>驛ｨ螻銀贈</span><select value={roomB} onChange={event => setRoomB(event.target.value)}>{rooms.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
        </div>
        <label><span>繧ｫ繝ｩ繝ｼ</span></label>
        <div className="floorTrimColorOptions">
          {['繧ｷ繝ｫ繝舌・', '繧｢繝ｳ繝舌・'].map(value => <button key={value} type="button" className={`floorTrimColorButton${color === value ? ' active' : ''}`} onClick={() => setColor(value)}>{value}</button>)}
        </div>
        <label><span>謨ｰ驥擾ｼ域悽・・/span><input type="number" min="1" step="1" value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
        {roomA === roomB && <p className="saveStatus" role="alert">逡ｰ縺ｪ繧矩Κ螻九ｒ驕ｸ繧薙〒縺上□縺輔＞</p>}
        <button className="add" type="submit">・・蠎願ｦ句・繧翫ｒ逋ｻ骭ｲ</button>
      </form>
      <div className="records">
        {records.length === 0 ? <p className="empty">蠎願ｦ句・繧翫・逋ｻ骭ｲ縺ｯ縺ゅｊ縺ｾ縺帙ｓ</p> : records.map(item => (
          <div className="record" key={item.id}>
            <div><strong>{item.roomA}竍倍item.roomB}</strong><small>蠎願ｦ句・繧雁叙莉倥・{item.color}</small></div>
            <b>{formatQuantity(item.quantity)}譛ｬ</b>
            <button type="button" onClick={() => { setRecords(previous => previous.filter(record => record.id !== item.id)); onChanged() }} aria-label="蠎願ｦ句・繧翫ｒ蜑企勁">ﾃ・/button>
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
  onRegistered,
}) {
  const [room, setRoom] = useState(rooms[0] || '')
  const [work, setWork] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('蠑・)
  const [unitPrice, setUnitPrice] = useState('')
  /* M-CROSS_OTHER_WORK_VOICE_INPUT_V1_SAFE */
  const [voiceInputStatus, setVoiceInputStatus] = useState('')
  const [voiceListening, setVoiceListening] = useState(false)
  const [memo, setMemo] = useState('')
  const [editingAdditionalWorkId, setEditingAdditionalWorkId] = useState('')

  /* M-CROSS_ADDITIONAL_WORK_TAP_EDIT_V3 */

  /* M-CROSS_PAST_UNIT_PRICE_SUGGESTIONS_V3 */
  const pastUnitPriceSuggestions = useMemo(() => {
    const query = work.trim().toLocaleLowerCase('ja')
    if (!query) return []

    const found = []
    readSavedEntries().forEach(entry => {
      ;(entry.additionalWorks || []).forEach(record => {
        const recordWork = String(record.work || '').trim()
        const normalizedWork = recordWork.toLocaleLowerCase('ja')
        const price = Number(record.unitPrice || 0)
        if (!recordWork || !Number.isFinite(price) || price <= 0) return
        if (!normalizedWork.includes(query) && !query.includes(normalizedWork)) return
        found.push({
          work: recordWork,
          price,
          unit: record.unit || '蠑・,
          propertyName: entry.propertyName || '迚ｩ莉ｶ蜷阪↑縺・,
          room: record.room || '',
          updatedAt: entry.updatedAt || '',
        })
      })
    })

    const unique = new Map()
    found
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .forEach(item => {
        const key = item.work + '|' + item.price + '|' + item.unit
        if (!unique.has(key)) unique.set(key, item)
      })

    return [...unique.values()].slice(0, 5)
  }, [work])

  function resetAdditionalWorkEditor() {
    setEditingAdditionalWorkId('')
    setRoom(rooms[0] || '')
    setWork('')
    setQuantity('1')
    setUnit('蠑・)
    setUnitPrice('')
    setMemo('')
  }

  function startEditingAdditionalWork(item) {
    setEditingAdditionalWorkId(item.id)
    setRoom(item.room || rooms[0] || '')
    setWork(item.work || '')
    setQuantity(String(item.quantity ?? '1'))
    setUnit(item.unit || '蠑・)
    setUnitPrice(String(item.unitPrice ?? ''))
    setMemo(item.memo || '')
    window.setTimeout(() => {
      document.querySelector('.additionalWorkForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 0)
  }

  /* M-CROSS_VOICE_CORRECTION_DICTIONARY_V1_SAFE */
  function correctOtherWorkVoiceText(value) {
    const corrections = [
      ['驥晁ｦ励￥', '譴・勁縺・], ['驥昴・縺槭￥', '譴・勁縺・], ['驥晞勁縺・, '譴・勁縺・],
      ['譴∬ｦ励￥', '譴・勁縺・], ['譴√・縺槭￥', '譴・勁縺・],
      ['繧ｽ繝輔ヨ蟷・惠', '繧ｽ繝輔ヨ蟾ｾ譛ｨ'], ['繧ｯ繝・す繝ｧ繝ｳ繝輔Ο繧｢繝ｼ', '繧ｯ繝・す繝ｧ繝ｳ繝輔Ο繧｢'],
      ['繧ｫ繝ｼ繝医Μ繝・モ', '繧ｫ繝ｼ繝医Μ繝・ず'],
    ]
    let text = String(value || '').trim()
    corrections.forEach(([from, to]) => { text = text.split(from).join(to) })
    return text
  }

  function applyOtherWorkVoiceText(transcript) {
    const text = String(transcript || '').trim()
    if (!text) return
    const normalized = text.replace(/[縲・ｼ・縲・/g, ' ').replace(/\s+/g, ' ').trim()
    const roomCandidate = rooms.find(name => normalized.startsWith(name + ' ') || normalized === name)
      || rooms.find(name => normalized.includes(name))
      || ''
    let remainder = normalized
    if (roomCandidate) {
      setRoom(roomCandidate)
      remainder = remainder.replace(roomCandidate, '').trim()
    }
    const quantityMatch = remainder.match(/(?:謨ｰ驥・?\s*(\d+(?:\.\d+)?)\s*(蠑楯蛟弓譛ｬ|譫嘶蜿ｰ|邂・園)?$/)
    if (quantityMatch) {
      setQuantity(quantityMatch[1])
      if (quantityMatch[2]) setUnit(quantityMatch[2])
      remainder = remainder.slice(0, quantityMatch.index).trim()
    }
    if (remainder) setWork(remainder)
    setVoiceInputStatus('隱崎ｭ倡ｵ先棡繧貞・蜉帶ｬ・∈蜿肴丐縺励∪縺励◆縲ょ・螳ｹ繧堤｢ｺ隱阪＠縺ｦ逋ｻ骭ｲ縺励※縺上□縺輔＞縲・)
  }

  function startOtherWorkVoiceInput() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceInputStatus('縺薙・繝悶Λ繧ｦ繧ｶ繝ｼ縺ｧ縺ｯ髻ｳ螢ｰ蜈･蜉帙ｒ蛻ｩ逕ｨ縺ｧ縺阪∪縺帙ｓ縲らｫｯ譛ｫ縺ｮ繧ｭ繝ｼ繝懊・繝蛾浹螢ｰ蜈･蜉帙ｒ菴ｿ縺｣縺ｦ縺上□縺輔＞縲・)
      return
    }
    try {
      const recognition = new Recognition()
      recognition.lang = 'ja-JP'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      setVoiceListening(true)
      setVoiceInputStatus('痔 閨槭″蜿悶ｊ荳ｭ窶ｦ 萓具ｼ壼床謇 豺ｷ蜷域・貍乗ｰｴ菫ｮ逅・)
      recognition.onresult = event => {
        const rawText = String(event.results?.[0]?.[0]?.transcript || '').trim()
        openVoiceRecognitionReview({
          rawText,
          suggestedText: applyUserVoiceCorrections(correctOtherWorkVoiceText(rawText)),
          onApply: finalText => applyOtherWorkVoiceText(finalText),
        })
      }
      recognition.onerror = event => {
        setVoiceInputStatus('髻ｳ螢ｰ蜈･蜉帙お繝ｩ繝ｼ: ' + (event.error || '隱崎ｭ倥〒縺阪∪縺帙ｓ縺ｧ縺励◆'))
      }
      recognition.onend = () => setVoiceListening(false)
      recognition.start()
    } catch (error) {
      setVoiceListening(false)
      setVoiceInputStatus('髻ｳ螢ｰ蜈･蜉帙ｒ髢句ｧ九〒縺阪∪縺帙ｓ縺ｧ縺励◆縲ゅ・繧､繧ｯ讓ｩ髯舌ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲・)
      console.error(error)
    }
  }

  function addWork(event) {
    event.preventDefault()
    const numericQuantity = Number(quantity)
    const numericUnitPrice = Math.max(0, Number(unitPrice) || 0)
    if (!room || !work.trim() || !Number.isFinite(numericQuantity) || numericQuantity <= 0) return

    const nextItem = {
      id: editingAdditionalWorkId || createRecordId(),
      room,
      work: work.trim(),
      quantity: numericQuantity,
      unit,
      unitPrice: numericUnitPrice,
      amount: numericQuantity * numericUnitPrice,
      memo: memo.trim(),
    }

    setAdditionalWorks(previous => editingAdditionalWorkId
      ? previous.map(item => item.id === editingAdditionalWorkId ? nextItem : item)
      : [...previous, nextItem]
    )
    resetAdditionalWorkEditor()
    onChanged()
    onRegistered?.()
  }

  /* M-CROSS_AUTO_FREQUENT_WORK_SUGGESTIONS_V3 */
  const autoFrequentWorks = useMemo(() => {
    const stats = new Map()

    readSavedEntries().forEach(entry => {
      const updatedTime = new Date(entry.updatedAt || 0).getTime() || 0
      ;(entry.additionalWorks || []).forEach(record => {
        const name = String(record.work || '').trim()
        if (!name) return

        const key = name.toLocaleLowerCase('ja')
        const current = stats.get(key) || {
          name,
          count: 0,
          latestTime: 0,
          latestPrice: 0,
          latestUnit: '蠑・,
        }

        current.count += 1
        if (updatedTime >= current.latestTime) {
          current.name = name
          current.latestTime = updatedTime
          current.latestPrice = Number(record.unitPrice || 0)
          current.latestUnit = record.unit || '蠑・
        }
        stats.set(key, current)
      })
    })

    return [...stats.values()]
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return b.latestTime - a.latestTime
      })
      .slice(0, 8)
  }, [additionalWorks])

  /* M-CROSS_INPUT_ESTIMATE_CHECK_V3 */
  const estimateCheckWarnings = useMemo(() => {
    const warnings = []

    ;(additionalWorks || []).forEach(item => {
      const label = (item.room || '驛ｨ螻区悴險ｭ螳・) + '繝ｻ' + (item.work || '菴懈･ｭ蜷肴悴險ｭ螳・)
      const quantity = Number(item.quantity || 0)
      const unitPriceValue = Number(item.unitPrice || 0)

      if (!Number.isFinite(quantity) || quantity <= 0) {
        warnings.push('謨ｰ驥上ｒ遒ｺ隱搾ｼ・ + label)
      }
      if (!Number.isFinite(unitPriceValue) || unitPriceValue <= 0) {
        warnings.push('蜊倅ｾ｡0蜀・ｼ・ + label)
      }
      if (quantity >= 1000) {
        warnings.push('謨ｰ驥上′螟ｧ縺阪＞・・ + label + '・・ + quantity + (item.unit || '') + '・・)
      }
    })

    const duplicateMap = new Map()
    ;(additionalWorks || []).forEach(item => {
      const workName = String(item.work || '').trim()
      if (!workName) return
      const key = String(item.room || '').trim() + '|' + workName.toLocaleLowerCase('ja')
      duplicateMap.set(key, (duplicateMap.get(key) || 0) + 1)
    })

    duplicateMap.forEach((value, key) => {
      if (value <= 1) return
      const separatorIndex = key.indexOf('|')
      const duplicateRoom = key.slice(0, separatorIndex)
      const duplicateWork = key.slice(separatorIndex + 1)
      warnings.push('驥崎､・・蜿ｯ閭ｽ諤ｧ・・ + (duplicateRoom || '驛ｨ螻区悴險ｭ螳・) + '繝ｻ' + duplicateWork + ' ﾃ・' + value + '莉ｶ')
    })

    return [...new Set(warnings)]
  }, [additionalWorks])

  function addCommonWork() {
    const value = window.prompt('繧医￥菴ｿ縺・・岼蜷阪ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞')?.trim()
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
        <h2>笨・譛邨ら｢ｺ隱・/h2>
        <p className="subtitle">蜀・｣・焚驥上→縲∝・陬・ｻ･螟悶・霑ｽ蜉菴懈･ｭ繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲・/p>
        <div className="reviewTotals">
          <div className="reviewTotal"><span>繧ｯ繝ｭ繧ｹ蜷郁ｨ・/span><strong>{formatQuantity(crossTotal)}緕｡</strong></div>
          <div className="reviewTotal"><span>CF蜷郁ｨ・/span><strong>{formatQuantity(cfTotal)}緕｡</strong></div>
          <div className="reviewTotal"><span>繧ｽ繝輔ヨ蟾ｾ譛ｨ</span><strong>{formatQuantity(softTotal)}譫・/strong></div>
          <div className="reviewTotal"><span>蠎願ｦ句・繧・/span><strong>{formatQuantity(floorTrimTotal)}譛ｬ</strong></div>
        </div>
      </section>

      <section className="card">
        <h2>肌 蜀・｣・ｻ･螟悶・霑ｽ蜉菴懈･ｭ</h2>
        <div className="commonWorkButtons" aria-label="繧医￥菴ｿ縺・ｿｽ蜉菴懈･ｭ">
          {commonWorks.map(value => (
            <button key={value} className="quickMemoButton" type="button" onClick={() => setWork(value)} onContextMenu={event => { event.preventDefault(); deleteCommonWork(value) }}>{value}</button>
          ))}
          <button className="quickMemoButton" type="button" onClick={addCommonWork}>・・繧医￥菴ｿ縺・・岼</button>
        </div>

        {autoFrequentWorks.length > 0 && (
          <section className="autoFrequentWorks" aria-label="譛霑代ｈ縺丈ｽｿ縺・・岼">
            <div className="autoFrequentWorksTitle">
              <strong>笨ｨ 譛霑代ｈ縺丈ｽｿ縺・・岼</strong>
              <small>菫晏ｭ俶ｸ医∩繝・・繧ｿ縺九ｉ閾ｪ蜍戊｡ｨ遉ｺ</small>
            </div>
            <div className="autoFrequentWorkButtons">
              {autoFrequentWorks.map(item => (
                <button
                  key={item.name}
                  type="button"
                  className="autoFrequentWorkButton"
                  onClick={() => {
                    setWork(item.name)
                    if (item.latestPrice > 0) setUnitPrice(String(item.latestPrice))
                    if (item.latestUnit) setUnit(item.latestUnit)
                  }}
                  title={'菴ｿ逕ｨ蝗樊焚 ' + item.count + '蝗・}
                >
                  <span>{item.name}</span>
                  <small>{item.count}蝗桀item.latestPrice > 0 ? '繝ｻ逶ｴ霑・' + formatYen(item.latestPrice) : ''}</small>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className={`estimateCheckPanel ${estimateCheckWarnings.length ? 'hasWarnings' : 'allClear'}`}>
          <div className="estimateCheckHeader">
            <strong>ｧ 蜈･蜉帙・隕狗ｩ阪メ繧ｧ繝・け</strong>
            <span>{estimateCheckWarnings.length ? estimateCheckWarnings.length + '莉ｶ遒ｺ隱・ : 'OK'}</span>
          </div>
          {estimateCheckWarnings.length > 0 ? (
            <ul>
              {estimateCheckWarnings.map((warning, index) => (
                <li key={warning + index}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p>霑ｽ蜉菴懈･ｭ縺ｫ譏弱ｉ縺九↑謨ｰ驥・繝ｻ蜊倅ｾ｡0繝ｻ驥崎､・・隕九▽縺九ｊ縺ｾ縺帙ｓ縲・/p>
          )}
          <small>遒ｺ隱崎｣懷勧縺ｧ縺吶ょｷ･莠句・螳ｹ繧・≡鬘阪・豁｣蜷ｦ繧定・蜍墓ｱｺ螳壹☆繧九ｂ縺ｮ縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・/small>
        </section>

        <form className="additionalWorkForm" onSubmit={addWork}>
          <div className="otherWorkVoiceBox">
            <button className="otherWorkVoiceButton" type="button" disabled={voiceListening} onClick={startOtherWorkVoiceInput}>
              {voiceListening ? '痔 閨槭″蜿悶ｊ荳ｭ窶ｦ' : '痔 髻ｳ螢ｰ縺ｧ蜈･蜉・}
            </button>
            <small>萓具ｼ壼床謇 豺ｷ蜷域・貍乗ｰｴ菫ｮ逅・・・蜿ｰ謇 豺ｷ蜷域・繧ｫ繝ｼ繝医Μ繝・ず莠､謠・1蛟・/small>
            {voiceInputStatus && <p className="otherWorkVoiceStatus" role="status">{voiceInputStatus}</p>}
          </div>
          {editingAdditionalWorkId && (
            <div className="additionalWorkEditNotice">
              <strong>笨擾ｸ・霑ｽ蜉菴懈･ｭ繧堤ｷｨ髮・ｸｭ</strong>
              <button type="button" onClick={resetAdditionalWorkEditor}>邱ｨ髮・ｒ繧ｭ繝｣繝ｳ繧ｻ繝ｫ</button>
            </div>
          )}
          <label><span>驛ｨ螻・/span><select value={room} onChange={event => setRoom(event.target.value)}>{rooms.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
          <label><span>菴懈･ｭ蜀・ｮｹ</span><input value={work} onChange={event => setWork(event.target.value)} placeholder="萓具ｼ夂糞陦ｨ譖ｿ縺医・崕逅・ｺ､謠・ /></label>
          {pastUnitPriceSuggestions.length > 0 && (
            <section className="pastPriceSuggestions" aria-label="驕主悉縺ｮ蜊倅ｾ｡蛟呵｣・>
              <strong>庁 驕主悉縺ｮ蜊倅ｾ｡蛟呵｣・/strong>
              <div className="pastPriceSuggestionList">
                {pastUnitPriceSuggestions.map(item => (
                  <button
                    key={item.work + '-' + item.price + '-' + item.unit}
                    type="button"
                    className="pastPriceSuggestionButton"
                    onClick={() => {
                      setWork(item.work)
                      setUnitPrice(String(item.price))
                      setUnit(item.unit)
                    }}
                  >
                    <span>{item.work}</span>
                    <b>{formatYen(item.price)}・旬item.unit}</b>
                    <small>{item.propertyName}{item.room ? '繝ｻ' + item.room : ''}</small>
                  </button>
                ))}
              </div>
              <small>蛟呵｣懊ｒ謚ｼ縺励◆蝣ｴ蜷医□縺代∽ｽ懈･ｭ蜷阪・蜊倅ｾ｡繝ｻ蜊倅ｽ阪∈蜿肴丐縺励∪縺吶・/small>
            </section>
          )}
          <div className="additionalWorkGrid">
            <label><span>謨ｰ驥・/span><input type="number" min="0.1" step="0.1" value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
            <label><span>蜊倅ｽ・/span><select value={unit} onChange={event => setUnit(event.target.value)}>{['蠑・,'蛟・,'譛ｬ','譫・,'蜿ｰ','邂・園'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <label><span>蜊倅ｾ｡・亥・・・/span><input type="number" min="0" step="1" value={unitPrice} onChange={event => setUnitPrice(event.target.value)} placeholder="0" /></label>
            <label><span>驥鷹｡・/span><input type="text" readOnly value={formatYen((Number(quantity) || 0) * (Number(unitPrice) || 0))} /></label>
            <label><span>繝｡繝｢</span><input value={memo} onChange={event => setMemo(event.target.value)} placeholder="莉ｻ諢・ /></label>
          </div>
          <button className="add" type="submit">
            {editingAdditionalWorkId ? '笨・霑ｽ蜉菴懈･ｭ繧呈峩譁ｰ' : '・・霑ｽ蜉菴懈･ｭ繧堤匳骭ｲ'}
          </button>
        </form>

        <div className="records">
          {additionalWorks.length === 0 ? <p className="empty">霑ｽ蜉菴懈･ｭ縺ｯ縺ゅｊ縺ｾ縺帙ｓ</p> : additionalWorks.map(item => (
            <div
              className={`additionalWorkItem additionalWorkEditable ${editingAdditionalWorkId === item.id ? 'editing' : ''}`}
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => startEditingAdditionalWork(item)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  startEditingAdditionalWork(item)
                }
              }}
              aria-label={item.room + '縺ｮ' + item.work + '繧堤ｷｨ髮・}
            >
              <div><strong>{item.room}縲{item.work}</strong><small>{item.memo || '繝｡繝｢縺ｪ縺・}</small></div>
              <div><b>{formatQuantity(item.quantity)}{item.unit}</b><small>{formatYen(Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</small></div>
              <button type="button" onClick={event => { event.stopPropagation(); if (editingAdditionalWorkId === item.id) resetAdditionalWorkEditor(); setAdditionalWorks(previous => previous.filter(record => record.id !== item.id)); onChanged() }} aria-label="霑ｽ蜉菴懈･ｭ繧貞炎髯､">ﾃ・/button>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

/* M-CROSS_ESTIMATE_ROW_TAP_EDIT_V2_SAFE */
function estimateEditKey(row) {
  return [
    row?.category || '',
    row?.room || '',
    Array.isArray(row?.parts) ? row.parts.join('|') : (row?.label || ''),
    row?.memo || '',
  ].join('::')
}

/* M-CROSS_ESTIMATE_FULL_EDITOR_V5_SAFE */
function applyEstimateEdits(rows, edits) {
  const map = edits && typeof edits === 'object' ? edits : {}
  return (Array.isArray(rows) ? rows : []).map(row => {
    const key = estimateEditKey(row)
    if (!Object.prototype.hasOwnProperty.call(map, key)) return row
    const edit = map[key]
    if (!edit || typeof edit !== 'object' || Array.isArray(edit)) {
      const rate = Math.max(0, Number(edit) || 0)
      return { ...row, rate, amount: (Number(row?.quantity) || 0) * rate }
    }
    const parts = Array.isArray(edit.parts) ? edit.parts : row.parts
    const quantity = edit.quantity === '' ? '' : Math.max(0, Number(edit.quantity) || 0)
    const rate = edit.rate === '' ? '' : Math.max(0, Number(edit.rate) || 0)
    const amount = edit.amountMode === 'manual' ? Math.max(0, Number(edit.amount) || 0) : (quantity === '' || rate === '' ? '' : quantity * rate)
    return { ...row, parts, label: parts.filter(Boolean).join(' '), memo: edit.memo ?? row.memo ?? '', quantity, unit: edit.unit ?? row.unit ?? '', rate, amount }
  })
}

function loadEstimateEdits(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

/* M-CROSS_ESTIMATE_VERSION_EXPLORER_FILENAME_V3_SAFE */
/* M-CROSS_ESTIMATE_VERSION_NUMBERING_V4_SAFE */
function estimateVersionMark(version) {
  const marks = ['', '', '竭｡', '竭｢', '竭｣', '竭､', '竭･', '竭ｦ', '竭ｧ', '竭ｨ', '竭ｩ']
  const number = Number(version) || 0
  return marks[number] ?? '・・ + number + '・・
}

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsPage, setSettingsPage] = useState('home')
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
  const [playSettings, setPlaySettings] = useState(loadPlaySettings)
  const [todayStats, setTodayStats] = useState(loadTodayStats)
  const [effectBurst, setEffectBurst] = useState(null)
  const [showComplete, setShowComplete] = useState(false)
  const [showSplash, setShowSplash] = useState(() => loadPlaySettings().splash)
  const [galaxyUnlocked, setGalaxyUnlocked] = useState(() => readPreference(galaxyUnlockedKey, 'false') === 'true')
  const [showGalaxyUnlock, setShowGalaxyUnlock] = useState(false)
  const logoTapRef = useRef({ count: 0, last: 0 })
  const completedStateRef = useRef(false)
  const [pricingSettings, setPricingSettings] = useState(loadPricingSettings)

  const [company, setCompany] = useState('')
  const [propertySearch, setPropertySearch] = useState('')
  const [selectedProperty, setSelectedProperty] = useState(null)
  /* M-CROSS_PROPERTY_LIST_PICKER_V2 */
  const [showPropertyListPicker, setShowPropertyListPicker] = useState(false)
  const [propertyListSearch, setPropertyListSearch] = useState('')
  const [unit, setUnit] = useState('')
  /* M-CROSS_WORK_NAME_V7_EXACT */
  const [workName, setWorkName] = useState('蜴溽憾蝗槫ｾｩ蟾･莠・)
  const [siteMemo, setSiteMemo] = useState('')
  const [showSimilarSites, setShowSimilarSites] = useState(false)
  const [showAllPropertyHistory, setShowAllPropertyHistory] = useState(false)
  const [propertyHistoryOrder, setPropertyHistoryOrder] = useState('newest')
  const [started, setStarted] = useState(false)
  const [showSavedList, setShowSavedList] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false)
  const [workingDraft, setWorkingDraft] = useState(null)
  const [showDraftRecovery, setShowDraftRecovery] = useState(false)
  const pendingNavigationRef = useRef(null)
  const appHistoryRef = useRef([])
  const applyingBrowserBackRef = useRef(false)
  const historySequenceRef = useRef(0)
  const startedRef = useRef(false)
  const isDirtyRef = useRef(false)
  const importFileInputRef = useRef(null)
  const [savedEntries, setSavedEntries] = useState([])
  const [savedSearch, setSavedSearch] = useState('')
  const [savedCompanyFilter, setSavedCompanyFilter] = useState('')
  const [savedSortOrder, setSavedSortOrder] = useState('newest')
  /* M-CROSS_SAVED_EXPLORER_V6_MINIMAL_SAFE */
  const [savedViewMode, setSavedViewMode] = useState('list')
  const [savedFolderPath, setSavedFolderPath] = useState([])
  const [showArchived, setShowArchived] = useState(false)
  const [selectedSavedKeys, setSelectedSavedKeys] = useState([])
  const [expandedSavedKeys, setExpandedSavedKeys] = useState([])
  const [currentStorageKey, setCurrentStorageKey] = useState('')
  const estimateEditStorageKey = 'mcross:estimate-edits:' + [company, selectedProperty?.name || '', String(unit || '').trim()].join('|')
  useEffect(() => {
    if (!company || !selectedProperty?.name || !String(unit || '').trim()) {
      setEstimateEdits({})
      return
    }
    setEstimateEdits(loadEstimateEdits(estimateEditStorageKey))
  }, [estimateEditStorageKey])
  const [pageIndex, setPageIndex] = useState(0)
  const [projectRooms, setProjectRooms] = useState(() => loadStringList(defaultRoomsKey, defaultRooms))
  const [roomConfirmations, setRoomConfirmations] = useState({})
  const [showMeasurementCheck, setShowMeasurementCheck] = useState(false)
  const [showRoomManagement, setShowRoomManagement] = useState(false)
  const [showEstimate, setShowEstimate] = useState(false)
  /* M-CROSS_SAVE_FEEDBACK_AND_EXPORT_LABEL_V1_SAFE */
  const [saveFeedback, setSaveFeedback] = useState('')
  const [estimateEditor, setEstimateEditor] = useState(null)
  const [estimateEdits, setEstimateEdits] = useState({})
  const [estimateVersions, setEstimateVersions] = useState([])
  /* M-CROSS_ESTIMATE_FILE_OPEN_CONTENT_STEP2_SAFE */
  const [openedEstimateVersion, setOpenedEstimateVersion] = useState(null)
  /* M-CROSS_VERSION_DISPLAY_FROM_SNAPSHOT_V5_SAFE */
  const [openedEstimateRows, setOpenedEstimateRows] = useState(null)
  /* M-CROSS_ESTIMATE_VERSIONS_BY_WORK_NAME_V1_SAFE */
  const estimateVersionStorageKey = 'mcross:estimate-versions:' + [company, selectedProperty?.name || '', String(unit || '').trim(), String(workName || '').trim() || '蜴溽憾蝗槫ｾｩ蟾･莠・].join('|')
  const legacyEstimateVersionStorageKey = 'mcross:estimate-versions:' + [company, selectedProperty?.name || '', String(unit || '').trim()].join('|')
  useEffect(() => {
    if (!company || !selectedProperty?.name || !String(unit || '').trim()) {
      setEstimateVersions([])
      return
    }
    try {
      const currentStored = localStorage.getItem(estimateVersionStorageKey)
      const legacyStored = String(workName || '').trim() === '蜴溽憾蝗槫ｾｩ蟾･莠・
        ? localStorage.getItem(legacyEstimateVersionStorageKey)
        : null
      const loaded = JSON.parse(currentStored || legacyStored || '[]')
      setEstimateVersions(Array.isArray(loaded) ? loaded : [])
    } catch {
      setEstimateVersions([])
    }
  }, [estimateVersionStorageKey])
  const [caseCrossFactor, setCaseCrossFactor] = useState(() => String(loadPricingSettings().crossFactor))
  const [returnToMeasurementCheck, setReturnToMeasurementCheck] = useState(false)
  const [estimateCopyFormat, setEstimateCopyFormat] = useState(() => readPreference(estimateCopyFormatKey, 'merged'))
  const [measurementType, setMeasurementType] = useState('螟ｩ莠・)
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
  /* M-CROSS_CF_MATERIAL_SAVE_V1 */
  /* M-CROSS_CF_MATERIAL_LOAD_V1 */
  const [cfMaterialGroups, setCfMaterialGroups] = useState([])
  const [softRecords, setSoftRecords] = useState([])
  const [floorTrimRecords, setFloorTrimRecords] = useState([])
  const [additionalWorks, setAdditionalWorks] = useState([])
  const [residentCases, setResidentCases] = useState(() => loadResidentCases())
  const [workOrders, setWorkOrders] = useState(() => loadWorkOrders())
  const [showWorkOrders, setShowWorkOrders] = useState(false)
  /* M-CROSS_STEP19_3_WORKORDER_DETAIL */
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState('')
  /* M-CROSS_RESIDENT_CASES_STEP2_V2 */
  const [showResidentCases, setShowResidentCases] = useState(false)
  /* M-CROSS_RESIDENT_CASES_STEP4 */
  const [showResidentCaseForm, setShowResidentCaseForm] = useState(false)
  const [residentCaseForm, setResidentCaseForm] = useState(() => ({
    requestDate: new Date().toLocaleDateString('sv-SE'),
    company: '', propertyName: '', unit: '', address: '', residentContact: '',
    requestDetails: '', note: '', status: '譛ｪ騾｣邨｡', nextAction: '蜈･螻・・∈騾｣邨｡',
    actionDueDate: '', caution: '',
  }))
  const [residentCaseFormError, setResidentCaseFormError] = useState('')
  /* M-CROSS_RESIDENT_CASES_STEP4_1 */
  const [residentCaseCompanyId, setResidentCaseCompanyId] = useState('')
  /* M-CROSS_RESIDENT_CASES_STEP5 */
  const [selectedResidentCaseId, setSelectedResidentCaseId] = useState('')
  const [residentHistoryMemo, setResidentHistoryMemo] = useState('')
  /* M-CROSS_RESIDENT_CASES_STEP7 */
  const residentExcelInputRef = useRef(null)
  /* M-CROSS_RESIDENT_CASES_STEP8 */
  const [residentCaseSearch, setResidentCaseSearch] = useState('')
  const [residentCaseFilter, setResidentCaseFilter] = useState('all')
  const [residentCaseVisibleCount, setResidentCaseVisibleCount] = useState(10)
  const [showResidentQuickPaste, setShowResidentQuickPaste] = useState(false)
  const [residentQuickPasteText, setResidentQuickPasteText] = useState('')
  const [residentQuickPreview, setResidentQuickPreview] = useState(null)
  const [residentQuickError, setResidentQuickError] = useState('')
  /* M-CROSS_RESIDENT_STEP16_OLLAMA_AI */
  const [residentAiLoading, setResidentAiLoading] = useState(false)
  const [residentAiStatus, setResidentAiStatus] = useState('')
  /* M-CROSS_RESIDENT_CASES_STEP15_PDF_IMPORT */
  const residentPdfInputRef = useRef(null)
  const [residentPdfLoading, setResidentPdfLoading] = useState(false)
  const [residentPdfFileName, setResidentPdfFileName] = useState('')
  /* M-CROSS_RESIDENT_STEP16_5_PDF_SOURCE_PREVIEW */
  const [residentPdfSourceText, setResidentPdfSourceText] = useState('')
  /* M-CROSS_RESIDENT_STEP12_MASTER_LINK_V1 */
  const [residentQuickCompanyId, setResidentQuickCompanyId] = useState('')
  const [commonAdditionalWorks, setCommonAdditionalWorks] = useState(() => loadStringList(commonAdditionalWorksKey, defaultCommonAdditionalWorks))
  const [configuredQuickMemos, setConfiguredQuickMemos] = useState(() => loadStringList(quickMemosKey, quickMemos))
  const [configuredDefaultRooms, setConfiguredDefaultRooms] = useState(() => loadStringList(defaultRoomsKey, defaultRooms))
  const rooms = projectRooms

  useEffect(() => {
    saveResidentCases(residentCases)
  }, [residentCases])

  useEffect(() => {
    saveWorkOrders(workOrders)
  }, [workOrders])

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
      setSiteMemo('')
      setShowSimilarSites(false)
      setShowAllPropertyHistory(false)
      setPropertyHistoryOrder('newest')
      setCurrentStorageKey('')
      setIsDirty(false)
    }
    showNewPropertyScreen()
    const handlePageShow = event => { if (event.persisted) showNewPropertyScreen() }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])
  useEffect(() => {
    if (!showSplash) return
    const timer = window.setTimeout(() => setShowSplash(false), 1500)
    return () => window.clearTimeout(timer)
  }, [showSplash])
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
      try { localStorage.removeItem(workingDraftKey) } catch { /* 蠕ｩ譌ｧ荳崎・縺ｪ繝・・繧ｿ縺ｯ辟｡隕・*/ }
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
      workName: String(workName || '').trim() || '蜴溽憾蝗槫ｾｩ蟾･莠・,
      siteMemo: siteMemo.trim(),
      records,
      cfRecords,

      cfMaterialGroups,
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
      console.error('菴懈･ｭ荳ｭ繝・・繧ｿ繧定・蜍穂ｿ晏ｭ倥〒縺阪∪縺帙ｓ縺ｧ縺励◆縲・, error)
    }
  }, [
    started,
    isDirty,
    company,
    selectedProperty,
    unit,
    records,
    cfRecords,

    cfMaterialGroups,
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
  const residentCaseCompany = mergedPropertyMaster.companies.find(item => item.id === residentCaseCompanyId)
  const residentCaseProperties = residentCaseCompanyId
    ? mergedPropertyMaster.properties.filter(item => item.companyId === residentCaseCompanyId)
    : []
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

  /* M-CROSS_SIMILAR_SITES_V1 */
  const similarSiteCandidates = useMemo(() => {
    const currentPropertyName = String(selectedProperty?.name || propertySearch || '').trim()
    const currentAddress = String(selectedProperty?.address || '').trim()
    const currentCompany = String(company || '').trim()
    const currentMemo = String(siteMemo || '').trim()

    const normalize = value => String(value || '')
      .toLocaleLowerCase('ja')
      .replace(/[\s縲]+/g, '')
      .replace(/[()・茨ｼ会ｼｻ・ｽ\[\]繝ｻ,・・縲・・・\\_-]+/g, '')

    const memoTokens = currentMemo
      .split(/[\s縲,・後√ゅ・/]+/)
      .map(normalize)
      .filter(token => token.length >= 2)

    return readSavedEntries()
      .map(entry => {
        let score = 0
        const reasons = []
        const entryName = normalize(entry.propertyName)
        const entryAddress = normalize(entry.address)
        const entryCompany = normalize(entry.company)
        const entryMemo = normalize(entry.siteMemo)

        if (currentPropertyName && entryName === normalize(currentPropertyName)) {
          score += 8
          reasons.push('蜷後§迚ｩ莉ｶ')
        } else if (currentPropertyName && (entryName.includes(normalize(currentPropertyName)) || normalize(currentPropertyName).includes(entryName))) {
          score += 5
          reasons.push('迚ｩ莉ｶ蜷阪′霑代＞')
        }

        if (currentCompany && entryCompany === normalize(currentCompany)) {
          score += 3
          reasons.push('蜷後§邂｡逅・ｼ夂､ｾ')
        }

        if (currentAddress && entryAddress === normalize(currentAddress)) {
          score += 5
          reasons.push('蜷後§菴乗園')
        }

        const matchedMemoTokens = memoTokens.filter(token => entryMemo.includes(token))
        if (matchedMemoTokens.length > 0) {
          score += Math.min(matchedMemoTokens.length * 2, 6)
          reasons.push('迴ｾ蝣ｴ繝｡繝｢: ' + matchedMemoTokens.slice(0, 3).join('繝ｻ'))
        }

        const hasCross = (entry.records || []).length > 0
        const hasCf = (entry.cfRecords || []).length > 0
        const hasSoft = (entry.softRecords || []).length > 0
        const hasTrim = (entry.floorTrimRecords || []).length > 0
        const workCount = (entry.additionalWorks || []).length
        const summary = [
          hasCross ? '繧ｯ繝ｭ繧ｹ' : '',
          hasCf ? 'CF' : '',
          hasSoft ? '繧ｽ繝輔ヨ蟾ｾ譛ｨ' : '',
          hasTrim ? '蠎願ｦ句・繧・ : '',
          workCount ? '霑ｽ蜉菴懈･ｭ' + workCount + '莉ｶ' : '',
        ].filter(Boolean)

        return { entry, score, reasons, summary }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || new Date(b.entry.updatedAt || 0) - new Date(a.entry.updatedAt || 0))
      .slice(0, 5)
  }, [company, propertySearch, selectedProperty, siteMemo, savedEntries])

  /* M-CROSS_PREVIOUS_PROPERTY_REFERENCE_V1 */
  const previousPropertyEntries = useMemo(() => {
    const currentName = String(selectedProperty?.name || propertySearch || '').trim().toLocaleLowerCase('ja')
    const currentAddress = String(selectedProperty?.address || '').trim().toLocaleLowerCase('ja')
    if (!currentName && !currentAddress) return []

    return readSavedEntries()
      .filter(entry => {
        const entryName = String(entry.propertyName || '').trim().toLocaleLowerCase('ja')
        const entryAddress = String(entry.address || '').trim().toLocaleLowerCase('ja')
        const sameName = currentName && entryName === currentName
        const sameAddress = currentAddress && entryAddress === currentAddress
        return sameName || sameAddress
      })
      .filter(entry => !unit.trim() || String(entry.unit || '').trim() !== unit.trim())
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .map(entry => {
        const crossTotalValue = (entry.records || []).reduce((sum, record) => sum + getRecordQuantity(record), 0)
        const cfTotalValue = (entry.cfRecords || []).reduce((sum, record) => sum + getLengthQuantity(record), 0)
        const softTotalValue = (entry.softRecords || []).reduce((sum, record) => sum + (Number(record.quantity) || 0), 0)
        const trimTotalValue = (entry.floorTrimRecords || []).reduce((sum, record) => sum + (Number(record.quantity) || 0), 0)
        const workNames = [...new Set((entry.additionalWorks || []).map(item => String(item.work || '').trim()).filter(Boolean))]
        return {
          entry,
          crossTotalValue,
          cfTotalValue,
          softTotalValue,
          trimTotalValue,
          workNames: workNames.slice(0, 4),
        }
      })
  }, [propertySearch, selectedProperty, unit, savedEntries])

  const visibleSavedEntries = useMemo(() => {
return savedEntries
      .filter(entry => Boolean(entry.archived) === showArchived)
      .filter(entry => !savedCompanyFilter || entry.company === savedCompanyFilter)
      .filter(entry => smartSavedEntryMatch(entry, savedSearch))
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
      const isConfirming = !next[roomName]
      if (next[roomName]) delete next[roomName]
      else next[roomName] = true
      if (isConfirming && rooms.length > 0 && rooms.every(name => Boolean(next[name]))) {
        setShowComplete(true)
        updateTodayStats(stats => ({ ...stats, completed: stats.completed + 1 }))
      }
      return next
    })
    markUnsaved()
  }

  function updateGlobalList(key, setter, currentItems, action, currentValue = '') {
    let next = [...currentItems]
    if (action === 'add') {
      const value = window.prompt('霑ｽ蜉縺吶ｋ鬆・岼蜷阪ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞')?.trim()
      if (!value || next.includes(value)) return
      next.push(value)
    } else if (action === 'edit') {
      const value = window.prompt('鬆・岼蜷阪ｒ邱ｨ髮・＠縺ｦ縺上□縺輔＞', currentValue)?.trim()
      if (!value || (value !== currentValue && next.includes(value))) return
      next = next.map(item => item === currentValue ? value : item)
    } else if (action === 'delete') {
      if (next.length <= 1) {
        window.alert('譛菴・鬆・岼縺ｯ谿九＠縺ｦ縺上□縺輔＞縲・)
        return
      }
      if (!window.confirm(`縲・{currentValue}縲阪ｒ蜑企勁縺励∪縺吶°・歔)) return
      next = next.filter(item => item !== currentValue)
    }
    try {
      localStorage.setItem(key, JSON.stringify(next))
      setter(next)
      setMasterStatus('險ｭ螳壹ｒ菫晏ｭ倥＠縺ｾ縺励◆縲・)
    } catch {
      setMasterStatus('險ｭ螳壹ｒ菫晏ｭ倥〒縺阪∪縺帙ｓ縺ｧ縺励◆縲・)
    }
  }
  function resetGlobalList(key, setter, fallback, label) {
    if (!window.confirm(`${label}繧貞・譛溽憾諷九∈謌ｻ縺励∪縺吶°・歔)) return
    const next = [...fallback]
    try {
      localStorage.setItem(key, JSON.stringify(next))
      setter(next)
      setMasterStatus(`${label}繧貞・譛溽憾諷九∈謌ｻ縺励∪縺励◆縲Ａ)
    } catch {
      setMasterStatus('險ｭ螳壹ｒ菫晏ｭ倥〒縺阪∪縺帙ｓ縺ｧ縺励◆縲・)
    }
  }
  function GlobalListEditor({ title, description, items, storageKey, setter, fallback }) {
    return (
      <section className="globalListEditor">
        <h3>{title}</h3>
        <p className="copyFormatPreview">{description}</p>
        <div className="globalListItems">
          {items.map(item => (
            <div className="globalListItem" key={item}>
              <span>{item}</span>
              <div className="masterActions">
                <button className="secondaryButton" type="button" onClick={() => updateGlobalList(storageKey, setter, items, 'edit', item)}>邱ｨ髮・/button>
                <button className="dangerButton" type="button" onClick={() => updateGlobalList(storageKey, setter, items, 'delete', item)}>蜑企勁</button>
              </div>
            </div>
          ))}
        </div>
        <button className="primary" type="button" onClick={() => updateGlobalList(storageKey, setter, items, 'add')}>・・鬆・岼繧定ｿｽ蜉</button>
        <button className="secondaryButton" type="button" onClick={() => resetGlobalList(storageKey, setter, fallback, title)}>蛻晄悄迥ｶ諷九∈謌ｻ縺・/button>
      </section>
    )
  }
  function savePlaySettings(next) {
    setPlaySettings(next)
    try { localStorage.setItem(playSettingsKey, JSON.stringify(next)) } catch { /* 莉ｻ諢剰ｨｭ螳・*/ }
  }
  function updateTodayStats(updater) {
    setTodayStats(previous => {
      const base = previous.date === getLocalDateKey() ? previous : loadTodayStats()
      const next = updater(base)
      try { localStorage.setItem(todayStatsKey, JSON.stringify(next)) } catch { /* 莉ｻ諢剰ｨ倬鹸 */ }
      return next
    })
  }
  function playRegistrationSound() {
    if (playSettings.sound === 'off') return
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return
      const context = new AudioContextClass()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const presets = { simple: [660, 'sine'], pop: [880, 'triangle'], cyber: [1240, 'square'] }
      const [frequency, type] = presets[playSettings.sound] || presets.simple
      oscillator.frequency.value = frequency
      oscillator.type = type
      gain.gain.setValueAtTime(0.055, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.13)
      oscillator.connect(gain); gain.connect(context.destination)
      oscillator.start(); oscillator.stop(context.currentTime + 0.14)
      oscillator.onended = () => context.close()
    } catch { /* 髻ｳ縺御ｽｿ縺医↑縺・ｫｯ譛ｫ縺ｧ縺ｯ辟｡髻ｳ */ }
  }
  function triggerRegisteredEffect() {
    updateTodayStats(previous => ({ ...previous, registrations: previous.registrations + 1 }))
    playRegistrationSound()
    if (!playSettings.effects) return
    const symbols = { beige: '笨ｨ', dark: '笨ｦ', pop: '脂', cyber: '笞｡', luxury: '笨ｦ', sakura: '減', ice: '笶・, forest: '鴻', galaxy: '笘・ }
    setEffectBurst({ id: Date.now(), symbol: symbols[theme] || '笨ｨ', theme })
    window.setTimeout(() => setEffectBurst(null), 700)
  }
  function handleLogoTap() {
    const now = Date.now()
    const nextCount = now - logoTapRef.current.last > 1400 ? 1 : logoTapRef.current.count + 1
    logoTapRef.current = { count: nextCount, last: now }
    if (nextCount < 5 || galaxyUnlocked) return
    setGalaxyUnlocked(true)
    setShowGalaxyUnlock(true)
    try { localStorage.setItem(galaxyUnlockedKey, 'true') } catch { /* 莉ｻ諢剰ｧ｣髯､ */ }
    window.setTimeout(() => setShowGalaxyUnlock(false), 2400)
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
      try { localStorage.setItem(pricingSettingsKey, JSON.stringify(next)) } catch { /* 莉ｻ諢剰ｨｭ螳・*/ }
      return next
    })
  }

  async function importResidentCasesExcel(fileValue) {
    if (!fileValue) return
    try {
      const { default: ExcelJS } = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await fileValue.arrayBuffer())

      const text = value => {
        if (value == null) return ''
        if (typeof value === 'object' && value.text != null) return String(value.text).trim()
        if (typeof value === 'object' && value.result != null) return String(value.result).trim()
        return String(value).trim()
      }
      const dateText = value => {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
          const pad = n => String(n).padStart(2, '0')
          return value.getFullYear() + '-' + pad(value.getMonth() + 1) + '-' + pad(value.getDate())
        }
        return text(value).replace(/\//g, '-').replace(/\./g, '-')
      }
      const normalizeHeader = value => text(value).replace(/[\s縲\r\n]+/g, '')
      const findSheet = names => names.map(name => workbook.getWorksheet(name)).find(Boolean)

      const importedCases = []
      const duplicateKeys = new Set(residentCases.map(item => [item.propertyName, item.unit, item.requestDate, item.requestDetails].join('|')))

      function readCases(sheet, fallbackStatus = '') {
        if (!sheet) return 0
        let headerRowNumber = 0
        let headers = []
        const headerAliases = {
          requestDate: ['萓晞ｼ譌･', '蜿嶺ｻ俶律'], company: ['邂｡逅・ｼ夂､ｾ'], propertyName: ['迚ｩ莉ｶ蜷・, '迚ｩ莉ｶ'], unit: ['蜿ｷ螳､'],
          address: ['菴乗園'], residentContact: ['騾｣邨｡蜈・, '髮ｻ隧ｱ逡ｪ蜿ｷ', '蜈･螻・・｣邨｡蜈・], status: ['騾ｲ謐・, '繧ｹ繝・・繧ｿ繧ｹ'],
          requestDetails: ['蜀・ｮｹ', '萓晞ｼ蜀・ｮｹ'], note: ['蛯呵・], siteVisitAt: ['迴ｾ隱ｿ譌･', '迴ｾ蝨ｰ隱ｿ譟ｻ譌･'], workVisitAt: ['蟾･莠区律', '菴懈･ｭ譌･'], caution: ['豕ｨ諢丈ｺ矩・]
        }
        sheet.eachRow((row, rowNumber) => {
          if (headerRowNumber) return
          const values = row.values.slice(1).map(normalizeHeader)
          const hits = values.filter(value => Object.values(headerAliases).flat().includes(value)).length
          if (hits >= 3) { headerRowNumber = rowNumber; headers = values }
        })
        if (!headerRowNumber) return 0
        const indexFor = key => {
          const aliases = headerAliases[key]
          const index = headers.findIndex(header => aliases.includes(header))
          return index >= 0 ? index + 1 : 0
        }
        let count = 0
        for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
          const row = sheet.getRow(rowNumber)
          const propertyName = text(indexFor('propertyName') ? row.getCell(indexFor('propertyName')).value : '')
          const unit = text(indexFor('unit') ? row.getCell(indexFor('unit')).value : '').replace(/蜿ｷ螳､$/u, '')
          const requestDetails = text(indexFor('requestDetails') ? row.getCell(indexFor('requestDetails')).value : '')
          if (!propertyName && !unit && !requestDetails) continue
          const requestDate = dateText(indexFor('requestDate') ? row.getCell(indexFor('requestDate')).value : '')
          const rawStatus = text(indexFor('status') ? row.getCell(indexFor('status')).value : '')
          const status = residentCaseStatuses.includes(rawStatus) ? rawStatus : (fallbackStatus || '譛ｪ騾｣邨｡')
          const key = [propertyName, unit, requestDate, requestDetails].join('|')
          if (duplicateKeys.has(key)) continue
          duplicateKeys.add(key)
          const now = new Date().toISOString()
          importedCases.push(normalizeResidentCase({
            id: createResidentCaseId(), requestDate,
            company: text(indexFor('company') ? row.getCell(indexFor('company')).value : ''),
            propertyName, unit,
            address: text(indexFor('address') ? row.getCell(indexFor('address')).value : ''),
            residentContact: text(indexFor('residentContact') ? row.getCell(indexFor('residentContact')).value : ''),
            requestDetails,
            note: text(indexFor('note') ? row.getCell(indexFor('note')).value : ''),
            status, nextAction: getResidentNextAction(status),
            siteVisitAt: dateText(indexFor('siteVisitAt') ? row.getCell(indexFor('siteVisitAt')).value : ''),
            workVisitAt: dateText(indexFor('workVisitAt') ? row.getCell(indexFor('workVisitAt')).value : ''),
            caution: text(indexFor('caution') ? row.getCell(indexFor('caution')).value : ''),
            completed: status === '螳御ｺ・,
            history: [{ id: createResidentCaseId(), at: now, status: 'Excel遘ｻ陦・, memo: sheet.name + '縺九ｉ遘ｻ陦・ }],
            createdAt: now, updatedAt: now,
          }))
          count += 1
        }
        return count
      }

      const activeCount = readCases(findSheet(['萓晞ｼ荳隕ｧ']), '')
      const orderCount = readCases(findSheet(['逋ｺ豕ｨ蠕・■荳隕ｧ']), '隕狗ｩ肴署蜃ｺ貂茨ｼ育匱豕ｨ蠕・■・・)
      const completedCount = readCases(findSheet(['螳御ｺ・ｸ隕ｧ']), '螳御ｺ・)

      // LogData 縺ｮ蟇ｾ蠢懷ｱ･豁ｴ繧堤黄莉ｶ蜷搾ｼ句捷螳､縺ｧ邏蝉ｻ倥￠縺ｾ縺吶・
      let historyCount = 0
      const logSheet = findSheet(['LogData', '繝ｭ繧ｰ繝・・繧ｿ'])
      if (logSheet) {
        let logHeaderRow = 0
        let logHeaders = []
        logSheet.eachRow((row, rowNumber) => {
          if (logHeaderRow) return
          const values = row.values.slice(1).map(normalizeHeader)
          const hits = values.filter(value => ['譌･譎・, '譌･莉・, '迚ｩ莉ｶ蜷・, '迚ｩ莉ｶ', '蜿ｷ螳､', '繧ｹ繝・・繧ｿ繧ｹ', '騾ｲ謐・, '繝｡繝｢', '蜀・ｮｹ'].includes(value)).length
          if (hits >= 3) { logHeaderRow = rowNumber; logHeaders = values }
        })
        if (logHeaderRow) {
          const logIndex = aliases => {
            const index = logHeaders.findIndex(header => aliases.includes(header))
            return index >= 0 ? index + 1 : 0
          }
          const dateIndex = logIndex(['譌･譎・, '譌･莉・])
          const propertyIndex = logIndex(['迚ｩ莉ｶ蜷・, '迚ｩ莉ｶ'])
          const unitIndex = logIndex(['蜿ｷ螳､'])
          const statusIndex = logIndex(['繧ｹ繝・・繧ｿ繧ｹ', '騾ｲ謐・])
          const memoIndex = logIndex(['繝｡繝｢', '蜀・ｮｹ', '蛯呵・])

          for (let rowNumber = logHeaderRow + 1; rowNumber <= logSheet.rowCount; rowNumber += 1) {
            const row = logSheet.getRow(rowNumber)
            const propertyName = text(propertyIndex ? row.getCell(propertyIndex).value : '')
            const unit = text(unitIndex ? row.getCell(unitIndex).value : '').replace(/蜿ｷ螳､$/u, '')
            const statusText = text(statusIndex ? row.getCell(statusIndex).value : '')
            const memoText = text(memoIndex ? row.getCell(memoIndex).value : '')
            if (!propertyName && !unit && !statusText && !memoText) continue
            const rawDate = dateIndex ? row.getCell(dateIndex).value : null
            let at = new Date().toISOString()
            if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) at = rawDate.toISOString()
            else {
              const parsed = new Date(text(rawDate))
              if (!Number.isNaN(parsed.getTime())) at = parsed.toISOString()
            }
            const match = importedCases.find(item => item.propertyName === propertyName && item.unit === unit)
            if (!match) continue
            match.history = [...(match.history || []), {
              id: createResidentCaseId(), at, status: statusText || '蟇ｾ蠢懷ｱ･豁ｴ', memo: memoText,
            }]
            historyCount += 1
          }
        }
      }

      if (importedCases.length === 0) {
        window.alert('蜿悶ｊ霎ｼ繧√ｋ譯井ｻｶ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆縲ゅす繝ｼ繝亥錐縺ｨ隕句・縺励ｒ縺皮｢ｺ隱阪￥縺縺輔＞縲・)
        return
      }

      const message = 'Excel縺九ｉ ' + importedCases.length + '莉ｶ繧呈､懷・縺励∪縺励◆縲・n\n萓晞ｼ荳隕ｧ: ' + activeCount + '莉ｶ\n逋ｺ豕ｨ蠕・■荳隕ｧ: ' + orderCount + '莉ｶ\n螳御ｺ・ｸ隕ｧ: ' + completedCount + '莉ｶ\n蟇ｾ蠢懷ｱ･豁ｴ: ' + historyCount + '莉ｶ\n\nM-Cross縺ｸ逋ｻ骭ｲ縺励∪縺吶°・・
      if (!window.confirm(message)) return

      setResidentCases(previous => [...importedCases, ...previous])
      window.alert(importedCases.length + '莉ｶ繧樽-Cross縺ｸ逋ｻ骭ｲ縺励∪縺励◆縲・)
    } catch (error) {
      console.error(error)
      window.alert('Excel繧定ｪｭ縺ｿ霎ｼ繧√∪縺帙ｓ縺ｧ縺励◆縲ょ・縺ｮ蜈･螻・ｸｭ譯井ｻｶExcel繧偵＃遒ｺ隱阪￥縺縺輔＞縲・)
    } finally {
      if (residentExcelInputRef.current) residentExcelInputRef.current.value = ''
    }
  }

  async function analyzeResidentTextWithOllama(sourceText) {
    const safeSourceText = String(sourceText || '').slice(0, 7000)
    const schema = {
      type: 'object',
      properties: {
        company:{type:'string'}, propertyName:{type:'string'}, unit:{type:'string'}, address:{type:'string'},
        residentName:{type:'string'}, residentContact:{type:'string'}, requestDetails:{type:'string'},
        note:{type:'string'}, caution:{type:'string'}, nextAction:{type:'string'},
        priority:{type:'string',enum:['urgent','normal','low']}
      },
      required:['company','propertyName','unit','address','residentName','residentContact','requestDetails','note','caution','nextAction','priority']
    }
    const response = await withResidentAiTimeout(fetch('http://localhost:11434/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'qwen3:4b',messages:[{role:'user',content:[
        '雉・ｲｸ菴丞ｮ・・菫ｮ郢穂ｾ晞ｼ縺九ｉ譯井ｻｶ諠・ｱ繧呈歓蜃ｺ縺励※縺上□縺輔＞縲りｪｬ譏弱・荳崎ｦ√〒縺吶・,
        '蜿り・・逵溘ｄ蛻･迚ｩ莉ｶ縺ｮ險倩ｼ峨ｈ繧贋ｾ晞ｼ蟇ｾ雎｡繧貞━蜈医ゆｸ肴・縺ｯ遨ｺ譁・ｭ励・,
        safeSourceText
      ].join('\n')}],stream:false,think:false,format:schema,options:{temperature:0,num_predict:220,num_ctx:8192}})
    }), 45000)
    if (!response.ok) throw new Error('Ollama HTTP ' + response.status)
    const payload = await response.json()
    return JSON.parse(payload?.message?.content || payload?.response || '{}')
  }

  /* M-CROSS_RESIDENT_STEP16_6_PDF_OCR */
  async function ocrResidentPdfPages(pdf) {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('jpn+eng', 1, {
      logger: message => {
        if (message?.status === 'recognizing text') {
          setResidentAiStatus('PDF逕ｻ蜒上ｒOCR荳ｭ窶ｦ ' + Math.round((message.progress || 0) * 100) + '%')
        } else if (message?.status) {
          setResidentAiStatus('PDF逕ｻ蜒上ｒOCR貅門ｙ荳ｭ窶ｦ')
        }
      },
    })

    try {
      const texts = []
      const pageLimit = Math.min(pdf.numPages, 3)
      for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
        setResidentAiStatus('PDF逕ｻ蜒上ｒOCR荳ｭ窶ｦ ' + pageNumber + '/' + pageLimit + '繝壹・繧ｸ')
        const page = await pdf.getPage(pageNumber)
        const viewport = page.getViewport({ scale: 1.8 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) continue
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        await page.render({ canvasContext: context, viewport }).promise
        const result = await worker.recognize(canvas)
        const pageText = String(result?.data?.text || '').trim()
        if (pageText) texts.push(pageText)
        canvas.width = 1
        canvas.height = 1
      }
      return texts.join('\n')
    } finally {
      await worker.terminate()
    }
  }

  async function importResidentCasePdf(fileValue) {
    if (!fileValue) return
    /* M-CROSS_RESIDENT_STEP16_2_PDF_CLEAN_FLOW */
    setResidentQuickPasteText('')
    setResidentPdfSourceText('')
    setResidentQuickPreview(null)
    setResidentQuickError('')
    setResidentAiStatus('PDF繧定ｪｭ縺ｿ蜿悶▲縺ｦ縺・∪縺吮ｦ')
    setResidentPdfLoading(true)
    setResidentPdfFileName(fileValue.name || '')
    setResidentQuickError('')
    setResidentQuickPreview(null)

    try {
      /* M-CROSS_RESIDENT_STEP15_PDFJS_V6_FIX */
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const workerUrl = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString()
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
      const bytes = new Uint8Array(await fileValue.arrayBuffer())
      const pdf = await pdfjs.getDocument({ data: bytes }).promise
      const pageTexts = []

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber)
        const content = await page.getTextContent()
        const text = content.items
          .map(item => typeof item.str === 'string' ? item.str : '')
          .filter(Boolean)
          .join(' ')
          .trim()
        if (text) pageTexts.push(text)
      }

      let extractedText = pageTexts.join('\n').trim()
      const compactExtractedText = extractedText.replace(/[\s縲]+/g, '')
      if (compactExtractedText.length < 40) {
        setResidentAiStatus('譁・ｭ励Ξ繧､繝､繝ｼ縺御ｸ崎ｶｳ縺励※縺・ｋ縺溘ａOCR縺ｸ蛻・ｊ譖ｿ縺医∪縺吮ｦ')
        extractedText = await ocrResidentPdfPages(pdf)
      }
      setResidentPdfSourceText(extractedText)
      if (!extractedText.trim()) {
        setResidentAiStatus('')
        setResidentQuickError('PDF縺ｮ譁・ｭ玲歓蜃ｺ縺ｨOCR縺ｮ荳｡譁ｹ縺ｧ譁・ｫ繧貞叙蠕励〒縺阪∪縺帙ｓ縺ｧ縺励◆縲ょ・PDF繧偵＃遒ｺ隱阪￥縺縺輔＞縲・)
        setShowResidentQuickPaste(true)
        return
      }

      // 縺ｾ縺壼ｾ捺擂隗｣譫舌ｒ陦後＞縲√◎縺ｮ蠕後Ο繝ｼ繧ｫ繝ｫAI隗｣譫舌〒陬懈ｭ｣縺励∪縺吶・
      const orderParsed = parseResidentOrderPdfText(extractedText, mergedPropertyMaster, fileValue.name || '')
      const genericParsed = parseResidentRequestText(extractedText, mergedPropertyMaster)
      const parsed = {
        ...genericParsed,
        ...Object.fromEntries(
          Object.entries(orderParsed).filter(([, value]) => value !== '' && value != null)
        ),
      }
      let aiParsed = null
      try {
        setResidentAiStatus('PDF繧偵Ο繝ｼ繧ｫ繝ｫAI縺ｧ隗｣譫舌＠縺ｦ縺・∪縺吮ｦ')
        aiParsed = await analyzeResidentTextWithOllama(extractedText)
      } catch (aiError) {
        console.warn('PDF AI隗｣譫舌ｒ繧ｹ繧ｭ繝・・:', aiError)
      }

      const aiMatchedProperty = aiParsed?.propertyName
        ? [...mergedPropertyMaster.properties].sort((a,b)=>String(b.name||'').length-String(a.name||'').length).find(item => {
            const n = value => String(value||'').normalize('NFKC').replace(/[\s縲繝ｻ・･]+/g,'').replace(/縺ｹ/g,'繝・).toLocaleLowerCase('ja')
            const left=n(item.name), right=n(aiParsed.propertyName)
            return left && right && (left===right || left.includes(right) || right.includes(left))
          })
        : null

      if (aiParsed) {
        parsed.company = aiMatchedProperty?.company || aiParsed.company || parsed.company
        parsed.propertyName = aiMatchedProperty?.name || aiParsed.propertyName || parsed.propertyName
        parsed.unit = aiParsed.unit || parsed.unit
        parsed.address = aiMatchedProperty?.address || aiParsed.address || parsed.address
        parsed.residentContact = extractJapanesePhoneFromSource(extractedText)
          || normalizeJapanesePhone(parsed.residentContact || '')
        parsed.requestDetails = aiParsed.requestDetails || parsed.requestDetails
        parsed.note = [aiParsed.residentName ? '蜈･螻・・ｼ・+aiParsed.residentName : '', aiParsed.note || '', parsed.note || ''].filter(Boolean).join('\n')
        parsed.caution = aiParsed.caution || parsed.caution
        parsed.nextAction = aiParsed.nextAction || parsed.nextAction
        parsed.priority = ['urgent','normal','low'].includes(aiParsed.priority) ? aiParsed.priority : parsed.priority
        setResidentAiStatus('PDF縺ｮAI隗｣譫仙ｮ御ｺ・ょ・螳ｹ繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲・)
      }

      setResidentQuickPasteText('')
      setResidentQuickPreview({
        ...parsed,
        note: [parsed.note, '蜿冶ｾｼ蜈ケDF・・ + (fileValue.name || 'PDF')].filter(Boolean).join('\n'),
      })
      setResidentQuickCompanyId(
        mergedPropertyMaster.companies.find(companyItem => companyItem.name === parsed.company)?.id || ''
      )
      setResidentQuickError(
        !parsed.propertyName || !parsed.requestDetails
          ? '荳驛ｨ縺ｮ鬆・岼繧定ｪｭ縺ｿ蜿悶ｌ縺ｾ縺帙ｓ縺ｧ縺励◆縲ら匳骭ｲ蜑阪↓蜀・ｮｹ繧堤｢ｺ隱阪・菫ｮ豁｣縺励※縺上□縺輔＞縲・
          : ''
      )
      setShowResidentQuickPaste(true)
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    } catch (error) {
      console.error(error)
      setResidentQuickError('PDF繧定ｪｭ縺ｿ霎ｼ繧√∪縺帙ｓ縺ｧ縺励◆・・ + (error?.message || String(error)))
      setShowResidentQuickPaste(true)
    } finally {
      setResidentPdfLoading(false)
      setResidentAiLoading(false)
      if (residentPdfInputRef.current) residentPdfInputRef.current.value = ''
    }
  }

  async function analyzeResidentRequestWithOllama() {
    const sourceText = String(residentQuickPasteText || '').trim()
    if (!sourceText) {
      setResidentQuickError('蜈医↓萓晞ｼ譁・∪縺溘・PDF縺ｮ譁・ｭ励ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・)
      return
    }

    setResidentAiLoading(true)
    setResidentAiStatus('繝ｭ繝ｼ繧ｫ繝ｫAI縺悟・螳ｹ繧呈紛逅・＠縺ｦ縺・∪縺吮ｦ')
    setResidentQuickError('')

    const schema = {
      type: 'object',
      properties: {
        company: { type: 'string' },
        propertyName: { type: 'string' },
        unit: { type: 'string' },
        address: { type: 'string' },
        residentName: { type: 'string' },
        residentContact: { type: 'string' },
        requestDetails: { type: 'string' },
        note: { type: 'string' },
        caution: { type: 'string' },
        nextAction: { type: 'string' },
        priority: { type: 'string', enum: ['urgent', 'normal', 'low'] },
      },
      required: [
        'company', 'propertyName', 'unit', 'address', 'residentName',
        'residentContact', 'requestDetails', 'note', 'caution',
        'nextAction', 'priority',
      ],
    }

    const prompt = [
      '縺ゅ↑縺溘・雉・ｲｸ菴丞ｮ・・菫ｮ郢穂ｾ晞ｼ繧樽-Cross縺ｸ逋ｻ骭ｲ縺吶ｋ謚ｽ蜃ｺ菫ゅ〒縺吶・,
      '謗ｨ隲悶・隱ｬ譏弱・Markdown縺ｯ蜃ｺ蜉帙○縺壹∵欠螳壹＆繧後◆JSON繧ｹ繧ｭ繝ｼ繝槭□縺題ｿ斐＠縺ｦ縺上□縺輔＞縲・,
      '譛ｬ譁・↓蜿り・・逵溘ｄ蛻･迚ｩ莉ｶ蜷阪′縺ゅｋ蝣ｴ蜷医∽ｾ晞ｼ蟇ｾ雎｡縺ｮ迚ｩ莉ｶ繧貞━蜈医＠縺ｦ縺上□縺輔＞縲・,
      '荳肴・縺ｪ鬆・岼縺ｯ遨ｺ譁・ｭ励↓縺励※縺上□縺輔＞縲・,
      'priority縺ｯ縲∵ｼ乗ｰｴ繝ｻ譁ｽ骭荳崎・繝ｻ髮ｻ豌苓ｨｭ蛯吝●豁｢縺ｪ縺ｩ邱頑･諤ｧ縺碁ｫ倥￠繧後・urgent縲・壼ｸｸ縺ｯnormal縲∵凾譛滓悴螳壹↑繧瑛ow縺ｧ縺吶・,
      '',
      '縲蝉ｾ晞ｼ譁・・,
      sourceText,
    ].join('\n')

    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:4b',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          think: false,
          format: schema,
          options: { temperature: 0 },
        }),
      })

      if (!response.ok) {
        throw new Error('Ollama HTTP ' + response.status)
      }

      const payload = await response.json()
      const content = payload?.message?.content || payload?.response || ''
      const parsed = JSON.parse(content)

      const matchedProperty = [...mergedPropertyMaster.properties]
        .sort((left, right) => String(right.name || '').length - String(left.name || '').length)
        .find(item => {
          const normalize = value => String(value || '').normalize('NFKC').replace(/[\s縲繝ｻ・･]+/g, '').replace(/縺ｹ/g, '繝・).toLocaleLowerCase('ja')
          const aiName = normalize(parsed.propertyName)
          const masterName = normalize(item.name)
          return aiName && masterName && (aiName === masterName || aiName.includes(masterName) || masterName.includes(aiName))
        })

      const companyName = matchedProperty?.company || parsed.company || ''
      const preview = {
        requestDate: new Date().toLocaleDateString('sv-SE'),
        company: companyName,
        propertyName: matchedProperty?.name || parsed.propertyName || '',
        unit: parsed.unit || '',
        address: matchedProperty?.address || parsed.address || '',
        residentContact: extractJapanesePhoneFromSource(sourceText)
          || normalizeJapanesePhone(parsed.residentContact || ''),
        requestDetails: parsed.requestDetails || '',
        note: [
          parsed.residentName ? '蜈･螻・・ｼ・ + parsed.residentName : '',
          parsed.note || '',
        ].filter(Boolean).join('\n'),
        status: '譛ｪ騾｣邨｡',
        nextAction: parsed.nextAction || '蜈･螻・・∈騾｣邨｡',
        actionDueDate: '',
        caution: parsed.caution || '',
        priority: ['urgent', 'normal', 'low'].includes(parsed.priority) ? parsed.priority : 'normal',
      }

      setResidentQuickPreview(preview)
      setResidentQuickCompanyId(
        mergedPropertyMaster.companies.find(item => item.name === companyName)?.id || ''
      )
      setResidentAiStatus('AI隱ｭ蜿門ｮ御ｺ・ょ・螳ｹ繧堤｢ｺ隱阪＠縺ｦ縺九ｉ逋ｻ骭ｲ縺励※縺上□縺輔＞縲・)
    } catch (error) {
      console.error(error)
      const message = String(error?.message || error)
      const hint = message.includes('Failed to fetch')
        ? 'Ollama縺ｸ謗･邯壹〒縺阪∪縺帙ｓ縲０llama縺ｮ襍ｷ蜍輔→OLLAMA_ORIGINS險ｭ螳壹ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲・
        : '繝ｭ繝ｼ繧ｫ繝ｫAI隗｣譫舌↓螟ｱ謨励＠縺ｾ縺励◆・・ + message
      setResidentQuickError(hint)
      setResidentAiStatus('')
    } finally {
      setResidentAiLoading(false)
    }
  }

  /* M-CROSS_STEP19_1_RESIDENT_TO_WORKORDER */
  /* M-CROSS_STEP19_2_RESTORATION_TO_WORKORDER */
  /* M-CROSS_STEP20_ESTIMATE_EXPORT */
  /* M-CROSS_STEP20_TEMPLATE_STYLE_FIX */
  /* M-CROSS_STEP20_8_FIXED_HEADER */
  /* M-CROSS_STEP20_9_HEADER_RUNTIME */
  /* M-CROSS_STEP20_10_SAFE_NEW_WORKBOOK */
  /* M-CROSS_STEP20_11_ORIGINAL_TEMPLATE_XLSX_POPULATE */
  async function exportWorkOrderEstimate(workOrder) {
    if (!workOrder) return
    const items = Array.isArray(workOrder.estimateItems) ? workOrder.estimateItems : []
    if (!items.length) {
      window.alert('隕狗ｩ肴・邏ｰ縺後≠繧翫∪縺帙ｓ縲・)
      return
    }
    if (items.length > 32) {
      window.alert('隕狗ｩ肴・邏ｰ縺ｯ32陦後∪縺ｧ蜃ｺ蜉帙〒縺阪∪縺吶・)
      return
    }

    try {
      // ExcelJS縺ｯ蜈・ユ繝ｳ繝励Ξ繝ｼ繝医・逕ｻ蜒上・謠冗判諠・ｱ繧貞｣翫☆縺溘ａ菴ｿ逕ｨ縺励∪縺帙ｓ縲・
      // xlsx-populate縺ｧ繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ繝・Φ繝励Ξ繝ｼ繝医ｒ菫昴▲縺溘∪縺ｾ繧ｻ繝ｫ蛟､縺縺大ｷｮ縺玲崛縺医∪縺吶・
      /* M-CROSS_STEP20_12_BUFFER_FIX */
      /* M-CROSS_STEP20_13_XLSX_POPULATE_BROWSER_BUILD */
      // Node.js迚医〒縺ｯ縺ｪ縺上’s繝ｻcrypto繝ｻprocess繧定ｦ∵ｱゅ＠縺ｪ縺・・蠑上ヶ繝ｩ繧ｦ繧ｶ繝薙Ν繝峨ｒ菴ｿ縺・∪縺吶・
      const populateModule = await import('xlsx-populate/browser/xlsx-populate.min.js')
      const XlsxPopulate = populateModule.default || globalThis.XlsxPopulate || populateModule
      if (!XlsxPopulate?.fromDataAsync) throw new Error('xlsx-populate繝悶Λ繧ｦ繧ｶ迚医ｒ蛻晄悄蛹悶〒縺阪∪縺帙ｓ')
      const templateResponse = await fetch(new URL('/mcross-estimate-template.xlsx', window.location.origin), { cache: 'no-store' })
      if (!templateResponse.ok) throw new Error('隕狗ｩ肴嶌繝・Φ繝励Ξ繝ｼ繝医ｒ隱ｭ縺ｿ霎ｼ繧√∪縺帙ｓ HTTP ' + templateResponse.status)

      const workbook = await XlsxPopulate.fromDataAsync(await templateResponse.arrayBuffer())
      const ws = workbook.sheet('隕狗ｩ肴嶌')
      if (!ws) throw new Error('縲瑚ｦ狗ｩ肴嶌縲阪す繝ｼ繝医′隕九▽縺九ｊ縺ｾ縺帙ｓ')

      // 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ繝・Φ繝励Ξ繝ｼ繝医｀S繝ｭ繧ｴ縲∽ｼ夂､ｾ諠・ｱ縲∫ｽｫ邱壹∬｡碁ｫ倥∝・蟷・・荳蛻・ｽ懊ｊ逶ｴ縺励∪縺帙ｓ縲・
      // 辟｡險倩ｼ蛾・岼縺ｯ遨ｺ逋ｽ縺ｫ縺励∪縺吶・
      ws.cell('B5').value(workOrder.company ? workOrder.company + '縲蠕｡荳ｭ' : '')
      ws.cell('J5').value(new Date()).style('numberFormat', 'yyyy蟷ｴm譛・譌･')
      ws.cell('D13').value(workOrder.propertyName || '')
      ws.cell('F13').value(workOrder.unit || '')
      ws.cell('G13').value(workOrder.unit ? '蜿ｷ螳､' : '')
      ws.cell('D14').value(workOrder.address || '')

      for (let rowNumber = 23; rowNumber <= 54; rowNumber += 1) {
        ws.cell('C' + rowNumber).value('')
        ws.cell('F' + rowNumber).value('')
        ws.cell('H' + rowNumber).value('')
        ws.cell('I' + rowNumber).value('')
        ws.cell('J' + rowNumber).value('')
        ws.cell('K' + rowNumber).value('')
      }

      items.forEach((item, index) => {
        const rowNumber = 23 + index
        ws.cell('C' + rowNumber).value(item.name || '')
        ws.cell('F' + rowNumber).value(item.specification || '')
        ws.cell('H' + rowNumber).value(Number(item.quantity || 0))
        ws.cell('I' + rowNumber).value(item.unit || '')
        ws.cell('J' + rowNumber).value(Number(item.unitPrice || 0))
        ws.cell('K' + rowNumber).value(Number(item.amount || 0))
      })

      const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      const tax = Math.floor(subtotal * 0.1)
      const total = subtotal + tax
      ws.cell('K55').value(subtotal)
      ws.cell('K56').value(tax)
      ws.cell('K57').value(total)
      ws.cell('E19').value(total)

      const output = await workbook.outputAsync()
      const blob = output instanceof Blob
        ? output
        : new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = ['隕狗ｩ肴嶌', workOrder.propertyName || '迚ｩ莉ｶ', workOrder.unit ? workOrder.unit + '蜿ｷ螳､' : ''].filter(Boolean).join('_') + '.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      updateWorkOrder(workOrder.id, { estimateStatus: '謠仙・貂・ })
    } catch (error) {
      console.error(error)
      window.alert('隕狗ｩ肴嶌繧貞・蜉帙〒縺阪∪縺帙ｓ縺ｧ縺励◆・・ + (error?.message || String(error)))
    }
  }

  function updateWorkOrder(workOrderId, patch) {
    const now = new Date().toISOString()
    setWorkOrders(previous => previous.map(item => item.id === workOrderId
      ? normalizeWorkOrder({ ...item, ...patch, updatedAt: now })
      : item
    ))
  }

  /* M-CROSS_STEP19_2_USE_ACTUAL_ESTIMATE */
  function createWorkOrderFromRestoration(actualEstimateRows = [], actualTotalAmount = 0) {
    const propertyName = selectedProperty?.name || ''
    const unitValue = String(unit || '').trim()
    if (!propertyName || !unitValue) {
      window.alert('迚ｩ莉ｶ蜷阪→蜿ｷ螳､繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲・)
      return
    }

    const sourceId = [selectedProperty?.id || propertyName, unitValue].join('|')
    const existing = workOrders.find(item => item.sourceType === 'restoration' && item.sourceId === sourceId)
    if (existing) {
      window.alert('縺薙・蜴溽憾蝗槫ｾｩ譯井ｻｶ縺ｯ縺吶〒縺ｫ蟾･莠区｡井ｻｶ縺ｸ逋ｻ骭ｲ縺輔ｌ縺ｦ縺・∪縺吶・)
      setStarted(false)
      setShowWorkOrders(true)
      return
    }

    const workNames = [
      records?.length ? '繧ｯ繝ｭ繧ｹ' : '',
      cfRecords?.length ? 'CF' : '',
      softRecords?.length ? '繧ｽ繝輔ヨ蟾ｾ譛ｨ' : '',
      floorTrimRecords?.length ? '蠎願ｦ句・繧・ : '',
      ...(additionalWorks || []).map(item => item.work || item.name || '').filter(Boolean),
    ].filter(Boolean)

    const estimateItems = (Array.isArray(actualEstimateRows) ? actualEstimateRows : []).map((row, index) => ({
      id: row.id || 'estimate-' + index,
      category: row.category || row.group || row.room || row.type || '',
      name: row.name || row.label || row.work || row.item || row.displayName || row.type || '蟾･莠矩・岼',
      specification: row.specification || row.spec || row.memo || row.note || '',
      quantity: Number(row.quantity ?? row.qty ?? row.count ?? 0) || 0,
      unit: row.unit || '',
      unitPrice: Number(row.unitPrice ?? row.price ?? row.rate ?? 0) || 0,
      amount: Number(row.amount ?? row.total ?? row.subtotal ?? 0) || 0,
      sourceType: 'mcrossActualEstimate',
    }))

    const estimateAmount = Math.max(0, Number(actualTotalAmount) || 0)

    const now = new Date().toISOString()
    const workOrder = normalizeWorkOrder({
      id: createResidentCaseId(),
      company: company || '',
      propertyName,
      unit: unitValue,
      address: selectedProperty?.address || '',
      workDetails: [...new Set(workNames)].join('繝ｻ') || '蜴溽憾蝗槫ｾｩ蟾･莠・,
      estimateItems,
      estimateAmount,
      estimateStatus: estimateItems.length > 0 || estimateAmount > 0 ? '菴懈・荳ｭ' : '譛ｪ菴懈・',
      orderStatus: '譛ｪ逋ｺ豕ｨ',
      billingStatus: '譛ｪ隲区ｱ・,
      sourceType: 'restoration',
      sourceId,
      createdAt: now,
      updatedAt: now,
    })

    setWorkOrders(previous => [workOrder, ...previous])
    setStarted(false)
    setShowWorkOrders(true)
  }

  function createWorkOrderFromResidentCase(residentCase) {
    if (!residentCase) return
    const existing = workOrders.find(item => item.sourceType === 'resident' && item.sourceId === residentCase.id)
    if (existing) {
      window.alert('縺薙・蜈･螻・ｸｭ譯井ｻｶ縺ｯ縺吶〒縺ｫ蟾･莠区｡井ｻｶ縺ｸ逋ｻ骭ｲ縺輔ｌ縺ｦ縺・∪縺吶・)
      setSelectedResidentCaseId('')
      setShowResidentCases(false)
      setShowWorkOrders(true)
      return
    }

    const now = new Date().toISOString()
    const workOrder = normalizeWorkOrder({
      id: createResidentCaseId(),
      company: residentCase.company || '',
      propertyName: residentCase.propertyName || '',
      unit: residentCase.unit || '',
      address: residentCase.address || '',
      workDetails: residentCase.requestDetails || '',
      estimateStatus: '譛ｪ菴懈・',
      orderStatus: '譛ｪ逋ｺ豕ｨ',
      billingStatus: '譛ｪ隲区ｱ・,
      sourceType: 'resident',
      sourceId: residentCase.id,
      createdAt: now,
      updatedAt: now,
    })

    setWorkOrders(previous => [workOrder, ...previous])
    updateResidentCase(residentCase.id, {
      nextAction: '蟾･莠区｡井ｻｶ縺ｧ隕狗ｩ阪・逋ｺ豕ｨ繧帝ｲ繧√ｋ',
    }, '蟾･莠区｡井ｻｶ縺ｸ遘ｻ陦・, '蟾･莠区｡井ｻｶ繧剃ｽ懈・')
    setSelectedResidentCaseId('')
    setShowResidentCases(false)
    setShowWorkOrders(true)
  }

  function updateResidentCase(caseId, patch, historyStatus = '', historyMemo = '') {
    const now = new Date().toISOString()
    setResidentCases(previous => previous.map(item => {
      if (item.id !== caseId) return item
      const nextHistory = historyStatus
        ? [...(Array.isArray(item.history) ? item.history : []), {
            id: createResidentCaseId(), at: now, status: historyStatus, memo: historyMemo,
          }]
        : (Array.isArray(item.history) ? item.history : [])
      return normalizeResidentCase({
        ...item,
        ...patch,
        history: nextHistory,
        lastActionAt: historyStatus || historyMemo ? now : (item.lastActionAt || now),
        updatedAt: now,
      })
    }))
  }

  /* M-CROSS_RESIDENT_STEP6_DOWNLOAD_DELETE_V1 */
  function deleteResidentCase(caseId) {
    const target = residentCases.find(item => item.id === caseId)
    if (!target) return
    const label = (target.propertyName || '迚ｩ莉ｶ蜷肴悴險ｭ螳・) + (target.unit ? ' ' + target.unit + '蜿ｷ螳､' : '')
    if (!window.confirm('縲・ + label + '縲阪・蜈･螻・ｸｭ譯井ｻｶ繧貞炎髯､縺励∪縺吶°・歃n\n縺薙・謫堺ｽ懊・蜈・↓謌ｻ縺帙∪縺帙ｓ縲・)) return
    setResidentCases(previous => previous.filter(item => item.id !== caseId))
    setSelectedResidentCaseId('')
    setResidentHistoryMemo('')
  }

  /* M-CROSS_RESIDENT_CASES_STEP11_ALL_IN */
  function holdResidentCase(caseId, reason) {
    updateResidentCase(caseId, {
      status: '菫晉蕗',
      isOnHold: true,
      holdReason: reason || '譎よ悄譛ｪ螳・,
      nextAction: '菫晉蕗荳ｭ',
      actionDueDate: '',
      waitingFor: '',
    }, '菫晉蕗', reason || '譎よ悄譛ｪ螳・)
  }

  function resumeResidentCase(caseId) {
    updateResidentCase(caseId, {
      status: '逋ｺ豕ｨ・域悴騾｣邨｡・・,
      isOnHold: false,
      holdReason: '',
      nextAction: '蜈･螻・・∈蟾･莠区律繧帝｣邨｡',
    }, '菫晉蕗隗｣髯､', '蟇ｾ蠢應ｸｭ縺ｸ謌ｻ縺励∪縺励◆')
  }

  function applyResidentQuickStatus(caseId, status) {
    updateResidentCase(caseId, {
      status,
      nextAction: getResidentNextAction(status),
      completed: status === '螳御ｺ・,
    }, status, '')
  }

  function changeFontSize(value) {
    setFontSize(value)
    try { localStorage.setItem(fontSizeKey, value) } catch { /* 險ｭ螳壹・菫晏ｭ倥・莉ｻ諢・*/ }
  }

  function changeTheme(value) {
    setTheme(value)
    try { localStorage.setItem(themeKey, value) } catch { /* 險ｭ螳壹・菫晏ｭ倥・莉ｻ諢・*/ }
  }
  function changeEstimateCopyFormat(value) {
    setEstimateCopyFormat(value)
    try { localStorage.setItem(estimateCopyFormatKey, value) } catch { /* 險ｭ螳壹・菫晏ｭ倥・莉ｻ諢・*/ }
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
      setMasterStatus('菫晏ｭ倥〒縺阪∪縺帙ｓ縺ｧ縺励◆縲らｫｯ譛ｫ縺ｮ遨ｺ縺榊ｮｹ驥上ｄ繝悶Λ繧ｦ繧ｶ繝ｼ縺ｮ菫晏ｭ倩ｨｭ螳壹ｒ縺皮｢ｺ隱阪￥縺縺輔＞縲・)
      return false
    }
  }

  function addMasterCompany(event) {
    event.preventDefault()
    const name = masterCompanyName.trim()
    if (!name) return
    if (mergedPropertyMaster.companies.some(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setMasterStatus('蜷後§邂｡逅・ｼ夂､ｾ蜷阪′縺吶〒縺ｫ逋ｻ骭ｲ縺輔ｌ縺ｦ縺・∪縺吶・)
      return
    }

    const company = { id: createRecordId(), name }
    if (savePropertyMaster({
      ...propertyMasterState.master,
      addedCompanies: [...propertyMasterState.master.addedCompanies, company],
    }, '邂｡逅・ｼ夂､ｾ繧定ｿｽ蜉縺励∪縺励◆縲・)) {
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
      setMasterStatus('蜷後§邂｡逅・ｼ夂､ｾ蜷阪′縺吶〒縺ｫ逋ｻ骭ｲ縺輔ｌ縺ｦ縺・∪縺吶・)
      return
    }

    if (savePropertyMaster({
      ...propertyMasterState.master,
      companyNames: { ...propertyMasterState.master.companyNames, [companyId]: name },
    }, '邂｡逅・ｼ夂､ｾ蜷阪ｒ螟画峩縺励∪縺励◆縲・)) {
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
      ? `縲・{masterCompany.name}縲阪↓縺ｯ${propertyCount}莉ｶ縺ｮ迚ｩ莉ｶ縺後≠繧翫∪縺吶らｮ｡逅・ｼ夂､ｾ縺ｨ迚ｩ莉ｶ繧剃ｸ隕ｧ縺九ｉ蜑企勁縺励∪縺吶°・歔
      : `邂｡逅・ｼ夂､ｾ縲・{masterCompany.name}縲阪ｒ蜑企勁縺励∪縺吶°・歔
    if (!window.confirm(confirmation)) return

    const nextMaster = {
      ...propertyMasterState.master,
      deletedCompanyIds: [...new Set([...propertyMasterState.master.deletedCompanyIds, masterCompany.id])],
    }
    if (savePropertyMaster(nextMaster, '邂｡逅・ｼ夂､ｾ繧貞炎髯､縺励∪縺励◆縲・)) {
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
    const aliases = propertyForm.aliases.split(/[,縲―n]/).map(alias => alias.trim()).filter(Boolean)
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

    if (savePropertyMaster(nextMaster, editingPropertyId ? '迚ｩ莉ｶ諠・ｱ繧呈峩譁ｰ縺励∪縺励◆縲・ : '迚ｩ莉ｶ繧定ｿｽ蜉縺励∪縺励◆縲・)) {
      setEditingPropertyId('')
      setShowPropertyForm(false)
      setPropertyForm({ name: '', address: '', reading: '', aliases: '' })
    }
  }

  function deleteMasterProperty(property) {
    if (!window.confirm(`迚ｩ莉ｶ縲・{property.name}縲阪ｒ蜑企勁縺励∪縺吶°・歔)) return
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
    if (savePropertyMaster(nextMaster, '迚ｩ莉ｶ繧貞炎髯､縺励∪縺励◆縲・)) {
      if (!started && selectedProperty?.id === property.id) {
        setSelectedProperty(null)
        setPropertySearch('')
      }
      if (editingPropertyId === property.id) startAddingProperty(property.companyId)
    }
  }

  function captureAppView() {
    if (settingsOpen) return { kind: 'settings', settingsPage }
    if (showSavedList && !started) return { kind: 'saved', archived: showArchived }
    if (started) {
      return {
        kind: 'measurement',
        activePage,
        pageIndex,
        cfPageIndex,
        softPageIndex,
        showEstimate,
        showRoomManagement,
      }
    }
    return { kind: 'property' }
  }

  function applyAppView(view) {
    if (!view) return
    applyingBrowserBackRef.current = true
    if (view.kind === 'settings') {
      setSettingsOpen(true)
      setSettingsPage(view.settingsPage || 'home')
      setShowSavedList(false)
    } else if (view.kind === 'saved') {
      setSettingsOpen(false)
      setShowSavedList(true)
      setShowArchived(Boolean(view.archived))
      setStarted(false)
    } else if (view.kind === 'measurement') {
      setSettingsOpen(false)
      setShowSavedList(false)
      setStarted(true)
      setActivePage(view.activePage || 'cross')
      setPageIndex(Number.isInteger(view.pageIndex) ? view.pageIndex : 0)
      setCfPageIndex(Number.isInteger(view.cfPageIndex) ? view.cfPageIndex : 0)
      setSoftPageIndex(Number.isInteger(view.softPageIndex) ? view.softPageIndex : 0)
      setShowEstimate(Boolean(view.showEstimate))
      setShowRoomManagement(Boolean(view.showRoomManagement))
    } else {
      setSettingsOpen(false)
      setSettingsPage('home')
      setShowSavedList(false)
      setStarted(false)
      setShowEstimate(false)
      setShowRoomManagement(false)
    }
    window.setTimeout(() => { applyingBrowserBackRef.current = false }, 0)
  }

  function pushCurrentAppView(view) {
    const previous = appHistoryRef.current.at(-1)
    const serialized = JSON.stringify(view)
    if (previous?.serialized === serialized) return
    historySequenceRef.current += 1
    const entry = { view, serialized, sequence: historySequenceRef.current }
    appHistoryRef.current.push(entry)
    window.history.pushState({ mCross: true, sequence: entry.sequence }, '', window.location.href)
  }

  useEffect(() => { startedRef.current = started }, [started])
  useEffect(() => { isDirtyRef.current = isDirty }, [isDirty])

  useEffect(() => {
    const initialView = captureAppView()
    const initial = { view: initialView, serialized: JSON.stringify(initialView), sequence: 0 }
    appHistoryRef.current = [initial]
    window.history.replaceState({ ...(window.history.state || {}), mCross: true, sequence: 0 }, '', window.location.href)
    const handlePopState = () => {
      if (appHistoryRef.current.length <= 1) return
      appHistoryRef.current.pop()
      const previous = appHistoryRef.current.at(-1)
      const navigateBack = () => applyAppView(previous?.view)
      if (startedRef.current && isDirtyRef.current) {
        pendingNavigationRef.current = navigateBack
        setShowLeaveConfirmation(true)
        window.history.pushState({ mCross: true, sequence: historySequenceRef.current }, '', window.location.href)
        return
      }
      navigateBack()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (applyingBrowserBackRef.current) return
    const timer = window.setTimeout(() => pushCurrentAppView(captureAppView()), 0)
    return () => window.clearTimeout(timer)
  }, [settingsOpen, settingsPage, showSavedList, showArchived, started, activePage, pageIndex, cfPageIndex, softPageIndex, showEstimate, showRoomManagement])

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
    try { localStorage.removeItem(workingDraftKey) } catch { /* 蜑企勁螟ｱ謨励・辟｡隕・*/ }
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
    if (!/\.(mcross|json|txt)$/i.test(file.name)) { window.alert('M-Cross縺九ｉ蜿励￠蜿悶▲縺・.mcross縲・json縲√∪縺溘・ .txt 繝輔ぃ繧､繝ｫ繧帝∈謚槭＠縺ｦ縺上□縺輔＞縲・); return }
    try {
      const packageData = JSON.parse(await file.text())
      if (packageData?.fileType !== mCrossFileType || packageData?.version !== mCrossFileVersion) throw new Error('M-Cross逕ｨ繝輔ぃ繧､繝ｫ縺ｧ縺ｯ縺ｪ縺・°縲∝ｯｾ蠢懊＠縺ｦ縺・↑縺・ヰ繝ｼ繧ｸ繝ｧ繝ｳ縺ｧ縺吶・)
      const imported = normalizeImportedEntry(packageData.data)
      const storageKey = getSaveKey(imported.company, { name: imported.propertyName, address: imported.address }, imported.unit, imported.workName || '蜴溽憾蝗槫ｾｩ蟾･莠・)
      if (localStorage.getItem(storageKey) !== null && !window.confirm(`縲・{imported.propertyName} ${imported.unit}蜿ｷ螳､縲阪・縺吶〒縺ｫ菫晏ｭ倥＆繧後※縺・∪縺吶・n\n荳頑嶌縺阪＠縺ｦ隱ｭ縺ｿ霎ｼ縺ｿ縺ｾ縺吶°・歔)) return
      localStorage.setItem(storageKey, JSON.stringify(imported))
      setSavedEntries(readSavedEntries()); setShowArchived(false); setSelectedSavedKeys([])
      window.alert(`縲・{imported.propertyName} ${imported.unit}蜿ｷ螳､縲阪ｒ隱ｭ縺ｿ霎ｼ縺ｿ縺ｾ縺励◆縲Ａ)
    } catch (error) { console.error(error); window.alert(error instanceof Error ? error.message : 'M-Cross繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ繧√∪縺帙ｓ縺ｧ縺励◆縲・) }
  }

  function loadSavedEntry(entry) {
    if (openedEstimateVersion == null) setOpenedEstimateVersion(null)
    setCurrentStorageKey(entry.storageKey || '')
    setCompany(entry.company || '')
    setPropertySearch(entry.propertyName || '')
    setSelectedProperty({ name: entry.propertyName || '', address: entry.address || '' })
    setUnit(entry.unit || '')
    setWorkName(entry.workName || '蜴溽憾蝗槫ｾｩ蟾･莠・)
    setSiteMemo(entry.siteMemo || '')
    setRecords(Array.isArray(entry.records) ? entry.records : [])
    setCfRecords(Array.isArray(entry.cfRecords) ? entry.cfRecords : [])
    setCfMaterialGroups(Array.isArray(entry.cfMaterialGroups) ? entry.cfMaterialGroups : [])
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
    setMeasurementType(entry.measurementType || '螟ｩ莠・)
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

  /* M-CROSS_VERSION_DISPLAY_FROM_SNAPSHOT_V5_SAFE */
  function openSavedEstimateVersion(entry, version) {
    const snapshotRows = Array.isArray(version?.rows)
      ? JSON.parse(JSON.stringify(version.rows))
      : []
    const snapshotAdditionalWorks = Array.isArray(version?.additionalWorks)
      ? JSON.parse(JSON.stringify(version.additionalWorks))
      : []

    openSavedEntry(entry)
    window.setTimeout(() => {
      setOpenedEstimateRows(snapshotRows)
      setAdditionalWorks(snapshotAdditionalWorks)
      setOpenedEstimateVersion(Number(version?.version) || 1)
      setShowEstimate(true)
      setShowRoomManagement(false)
      window.scrollTo({ top: 0, behavior: 'auto' })
    }, 0)
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
        workName: entry.workName || '蜴溽憾蝗槫ｾｩ蟾･莠・,
        siteMemo: entry.siteMemo || '',
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
        measurementType: entry.measurementType || '螟ｩ莠・,
        caseCrossFactor: Number(entry.caseCrossFactor ?? pricingSettings.crossFactor),
        archived: Boolean(entry.archived),
        updatedAt: new Date().toISOString(),
      }))
      setSavedEntries(readSavedEntries())
    } catch {
      window.alert('荳頑嶌縺堺ｿ晏ｭ倥〒縺阪∪縺帙ｓ縺ｧ縺励◆縲らｫｯ譛ｫ縺ｮ遨ｺ縺榊ｮｹ驥上ｒ縺皮｢ｺ隱阪￥縺縺輔＞縲・)
    }
  }

  function deleteSavedEntry(entry) {
    if (!entry.storageKey) return
    const label = `${entry.propertyName || '迚ｩ莉ｶ蜷阪↑縺・} ${entry.unit || ''}蜿ｷ螳､`
    if (!window.confirm(`縲・{label}縲阪・菫晏ｭ倥ョ繝ｼ繧ｿ繧貞炎髯､縺励∪縺吶°・歔)) return
    try {
      localStorage.removeItem(entry.storageKey)
      setSavedEntries(readSavedEntries())
      setSelectedSavedKeys(prev => prev.filter(key => key !== entry.storageKey))
    } catch {
      window.alert('繝・・繧ｿ繧貞炎髯､縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲・)
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
      window.alert('繧｢繝ｼ繧ｫ繧､繝也憾諷九ｒ譖ｴ譁ｰ縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲・)
    }
  }

  function toggleSavedMore(storageKey) {
    setExpandedSavedKeys(previous => previous.includes(storageKey)
      ? previous.filter(key => key !== storageKey)
      : [...previous, storageKey])
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
        // 譖ｴ譁ｰ縺ｧ縺阪↑縺・ョ繝ｼ繧ｿ縺ｯ繧ｹ繧ｭ繝・・
      }
    })

    setSavedEntries(readSavedEntries())
    setSelectedSavedKeys([])
  }

  function bulkDeleteSelected() {
    if (selectedSavedKeys.length === 0) return
    if (!window.confirm(`驕ｸ謚槭＠縺・{selectedSavedKeys.length}莉ｶ繧貞炎髯､縺励∪縺吶°・歔)) return

    selectedSavedKeys.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch {
        // 蜑企勁縺ｧ縺阪↑縺・ョ繝ｼ繧ｿ縺ｯ繧ｹ繧ｭ繝・・
      }
    })

    setSavedEntries(readSavedEntries())
    setSelectedSavedKeys([])
  }

  /* M-CROSS_NEW_REGISTRATION_BUTTON_V1_SAFE */
  function resetForNewRegistration() {
    try { localStorage.removeItem(workingDraftKey) } catch {}
    setWorkingDraft(null)
    setShowDraftRecovery(false)
    setStarted(false)
    setShowEstimate(false)
    setShowRoomManagement(false)
    setShowMeasurementCheck(false)
    setCompany('')
    setPropertySearch('')
    setSelectedProperty(null)
    setUnit('')
    setWorkName('蜴溽憾蝗槫ｾｩ蟾･莠・)
    setSiteMemo('')
    setCurrentStorageKey('')
    setRecords([])
    setCfRecords([])
    setCfMaterialGroups([])
    setSoftRecords([])
    setFloorTrimRecords([])
    setAdditionalWorks([])
    setMemo('')
    setIsDirty(false)
    setSaveStatus('譁ｰ隕冗匳骭ｲ繧帝幕蟋九〒縺阪∪縺・)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startNewRegistration() {
    if (!started || !isDirty) {
      resetForNewRegistration()
      return
    }

    const saveFirst = window.confirm(
      '迴ｾ蝨ｨ邱ｨ髮・ｸｭ縺ｮ蜀・ｮｹ縺御ｿ晏ｭ倥＆繧後※縺・∪縺帙ｓ縲・n\n' +
      '・ｻOK・ｽ菫晏ｭ倥＠縺ｦ邨ゆｺ・＠縲∵眠隕冗匳骭ｲ縺ｸ騾ｲ繧\n' +
      '・ｻ繧ｭ繝｣繝ｳ繧ｻ繝ｫ・ｽ菫晏ｭ倥○縺夐ｲ繧縺九∵桃菴懊ｒ荳ｭ豁｢縺吶ｋ'
    )

    if (saveFirst) {
      if (!saveCurrentData()) {
        window.alert('菫晏ｭ倥〒縺阪↑縺九▲縺溘◆繧√∵眠隕冗匳骭ｲ縺ｸ騾ｲ縺ｿ縺ｾ縺帙ｓ縺ｧ縺励◆縲・)
        return
      }
      resetForNewRegistration()
      return
    }

    const discard = window.confirm(
      '菫晏ｭ倥○縺壹↓譁ｰ隕冗匳骭ｲ縺ｸ騾ｲ縺ｿ縺ｾ縺吶°・歃n\n' +
      '・ｻOK・ｽ菫晏ｭ倥○縺壽眠隕冗匳骭ｲ縺ｸ騾ｲ繧\n' +
      '・ｻ繧ｭ繝｣繝ｳ繧ｻ繝ｫ・ｽ邱ｨ髮・ｸｭ縺ｮ逕ｻ髱｢縺ｸ謌ｻ繧・
    )
    if (discard) resetForNewRegistration()
  }

  function startMeasurement() {
    if (!String(workName || '').trim()) { window.alert('蟾･莠句錐繧貞・蜉帙＠縺ｦ縺上□縺輔＞縲・); return }
    const storageKey = getSaveKey(company, selectedProperty, unit, workName)
    setCurrentStorageKey(storageKey)

    try {
      const saved = localStorage.getItem(storageKey)
      const savedData = saved ? JSON.parse(saved) : null
      setRecords(Array.isArray(savedData?.records) ? savedData.records : [])
      setCfRecords(Array.isArray(savedData?.cfRecords) ? savedData.cfRecords : [])
      setCfMaterialGroups(Array.isArray(savedData?.cfMaterialGroups) ? savedData.cfMaterialGroups : [])
      setSoftRecords(Array.isArray(savedData?.softRecords) ? savedData.softRecords : [])
      setFloorTrimRecords(Array.isArray(savedData?.floorTrimRecords) ? savedData.floorTrimRecords : [])
      setAdditionalWorks(Array.isArray(savedData?.additionalWorks) ? savedData.additionalWorks : [])
      setProjectRooms(Array.isArray(savedData?.rooms)
        ? savedData.rooms
        : savedData?.customRooms?.length ? [...configuredDefaultRooms, ...savedData.customRooms] : [...configuredDefaultRooms])
      setRoomConfirmations(
        savedData?.roomConfirmations && typeof savedData.roomConfirmations === 'object'
          ? savedData.roomConfirmations
          : {}
      )
      setPageIndex(Number.isInteger(savedData?.pageIndex) ? savedData.pageIndex : 0)
      setCfPageIndex(Number.isInteger(savedData?.cfPageIndex) ? savedData.cfPageIndex : 0)
      setSoftPageIndex(Number.isInteger(savedData?.softPageIndex) ? savedData.softPageIndex : 0)
      setActivePage(savedData?.activePage || 'cross')
      setMeasurementType(savedData?.measurementType || '螟ｩ莠・)
      setCaseCrossFactor(String(savedData?.caseCrossFactor ?? pricingSettings.crossFactor))
      setMemo(savedData?.draftMemo || '')
      setSaveStatus('')
    } catch {
      setRecords([])
      setCfRecords([])
      setCfMaterialGroups([])
      setSoftRecords([])
      setFloorTrimRecords([])
      setAdditionalWorks([])
      setProjectRooms([...configuredDefaultRooms])
      setRoomConfirmations({})
      setPageIndex(0)
      setCfPageIndex(0)
      setSoftPageIndex(0)
      setActivePage('cross')
      setMeasurementType('螟ｩ莠・)
      setCaseCrossFactor(String(pricingSettings.crossFactor))
      setMemo('')
      setSaveStatus('菫晏ｭ倥ョ繝ｼ繧ｿ繧定ｪｭ縺ｿ霎ｼ繧√∪縺帙ｓ縺ｧ縺励◆')
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
    setWorkName(draft.workName || '蜴溽憾蝗槫ｾｩ蟾･莠・)
    setSiteMemo(draft.siteMemo || '')
    setRecords(Array.isArray(draft.records) ? draft.records : [])
    setCfRecords(Array.isArray(draft.cfRecords) ? draft.cfRecords : [])
    setCfMaterialGroups(Array.isArray(draft.cfMaterialGroups) ? draft.cfMaterialGroups : [])
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
    setMeasurementType(draft.measurementType || '螟ｩ莠・)
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
    try { localStorage.removeItem(workingDraftKey) } catch { /* 蜑企勁螟ｱ謨励・辟｡隕・*/ }
    setWorkingDraft(null)
    setShowDraftRecovery(false)
  }
  function saveCurrentData() {
    if (!company || !selectedProperty || !unit.trim()) {
      setSaveStatus('邂｡逅・ｼ夂､ｾ繝ｻ迚ｩ莉ｶ繝ｻ蜿ｷ螳､繧帝∈謚槭＠縺ｦ縺上□縺輔＞')
      return false
    }

    const storageKey = currentStorageKey || getSaveKey(company, selectedProperty, unit, workName)
    let archived = false

    try {
      const existing = JSON.parse(localStorage.getItem(storageKey) || '{}')
      archived = Boolean(existing.archived)
    } catch {
      // 隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺溷ｴ蜷医・騾壼ｸｸ荳隕ｧ縺ｫ菫晏ｭ・
    }

    const saveData = {
      company,
      propertyName: selectedProperty.name,
      address: selectedProperty.address,
      unit: unit.trim(),
      workName: String(workName || '').trim() || '蜴溽憾蝗槫ｾｩ蟾･莠・,
      siteMemo: siteMemo.trim(),
      records,
      cfRecords,

      cfMaterialGroups,
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
      setSaveStatus('菫晏ｭ倥〒縺阪∪縺帙ｓ縺ｧ縺励◆縲らｫｯ譛ｫ縺ｮ遨ｺ縺榊ｮｹ驥上ｒ縺皮｢ｺ隱阪￥縺縺輔＞')
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
      window.alert('驛ｨ螻九ｒ縺吶∋縺ｦ蜑企勁縺吶ｋ縺薙→縺ｯ縺ｧ縺阪∪縺帙ｓ')
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
      if (currentValue.includes('.')) return
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
  function handleCrossEnter() {
    if (activeInput === 'height') {
      const numericHeight = Number(height.replace(/[縲ゑｼ讃/g, '.'))
      if (!Number.isFinite(numericHeight) || numericHeight <= 0) return
      setActiveInput('count')
      return
    }

    if (activeInput === 'count') {
      const numericHeight = Number(height.replace(/[縲ゑｼ讃/g, '.'))
      const numericCount = Number(count)
      if (!Number.isFinite(numericHeight) || numericHeight <= 0 || !Number.isFinite(numericCount) || numericCount <= 0) return
      addCrossRecord({ preventDefault() {} })
      setActiveInput('height')
    }
  }

  useEffect(() => {
    if (!activeInput) return undefined

    function handlePhysicalNumpad(event) {
      const target = event.target
      const isEditable = target instanceof HTMLInputElement && !target.readOnly
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || target instanceof HTMLElement && target.isContentEditable
      if (isEditable) return

      if (/^Numpad[0-9]$/.test(event.code)) {
        event.preventDefault()
        updateCrossInput(event.code.slice(-1))
        return
      }
      if (event.code === 'NumpadDecimal' || event.key === '.') {
        event.preventDefault()
        updateCrossInput('decimal')
        return
      }
      if (event.code === 'NumpadEnter' || event.key === 'Enter') {
        event.preventDefault()
        handleCrossEnter()
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        updateCrossInput('backspace')
        return
      }
      if (event.key === 'Escape' || event.key === 'Delete') {
        event.preventDefault()
        updateCrossInput('clear')
      }
    }

    window.addEventListener('keydown', handlePhysicalNumpad)
    return () => window.removeEventListener('keydown', handlePhysicalNumpad)
  }, [activeInput, height, count])

  function addCrossRecord(event) {
    event.preventDefault()
    const numericHeight = Number(height.replace(/[縲ゑｼ讃/g, '.'))
    const numericCount = Number(count)
    if (!Number.isFinite(numericHeight) || numericHeight <= 0 || !Number.isFinite(numericCount) || numericCount <= 0) return

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
    ['small', '蟆・], ['medium', '荳ｭ'], ['large', '螟ｧ'],
  ]
  const themeOptions = [
    ['beige', '繝吶・繧ｸ繝･'], ['dark', '繝繝ｼ繧ｯ'], ['pop', '繝昴ャ繝・], ['cyber', '繧ｵ繧､繝舌・'],
    ['luxury', 'Luxury Black'], ['sakura', 'SAKURA'], ['ice', 'Ice'], ['forest', 'Forest'],
    ['retro', 'RETRO'],
    ...(galaxyUnlocked ? [['galaxy', 'GALAXY']] : []),
  ]
  return (
    <>
      <style>{styles}</style>
      <style>{`
.additionalWorkEditable{cursor:pointer;border-radius:11px;padding-left:8px;padding-right:8px;transition:background .16s,outline-color .16s}
.additionalWorkEditable:hover,.additionalWorkEditable:focus-visible{background:rgba(110,145,232,.09);outline:2px solid rgba(110,145,232,.42);outline-offset:2px}
.additionalWorkEditable.editing{background:rgba(99,190,161,.13);outline:2px solid rgba(99,190,161,.62);outline-offset:2px}
.additionalWorkEditNotice{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;padding:10px 12px;border:1px solid rgba(99,190,161,.55);border-radius:12px;background:rgba(99,190,161,.11)}
.additionalWorkEditNotice button{min-height:38px;padding:6px 10px;border:1px solid rgba(99,190,161,.55);border-radius:9px;background:rgba(255,255,255,.84);color:inherit;font:inherit;font-weight:800;cursor:pointer}
.theme-dark .additionalWorkEditNotice button,.theme-cyber .additionalWorkEditNotice button,.theme-luxury .additionalWorkEditNotice button,.theme-retro .additionalWorkEditNotice button,.theme-galaxy .additionalWorkEditNotice button{background:rgba(5,12,24,.82)}
`}</style>
      <style>{`
.propertyHistoryControls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.propertyHistoryControls button,.propertyHistoryControls select{min-height:42px;border:1px solid rgba(99,190,161,.48);border-radius:10px;background:rgba(255,255,255,.82);color:inherit;font:inherit;font-weight:800;padding:7px 10px}.theme-dark .propertyHistoryControls button,.theme-dark .propertyHistoryControls select,.theme-cyber .propertyHistoryControls button,.theme-cyber .propertyHistoryControls select,.theme-luxury .propertyHistoryControls button,.theme-luxury .propertyHistoryControls select,.theme-retro .propertyHistoryControls button,.theme-retro .propertyHistoryControls select,.theme-galaxy .propertyHistoryControls button,.theme-galaxy .propertyHistoryControls select{background:rgba(5,12,24,.82)}@media(max-width:520px){.propertyHistoryControls{grid-template-columns:1fr}.propertyHistoryControls select{width:100%}}
`}</style>
      <style>{`
.previousPropertyPanel{display:grid;gap:10px;margin:12px 0;padding:13px;border:1px solid rgba(99,190,161,.45);border-radius:16px;background:rgba(99,190,161,.08)}
.previousPropertyHeading{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:5px 10px}
.previousPropertyHeading small,.previousPropertyPanel>p{margin:0;opacity:.72;font-size:11px;line-height:1.45}
.previousPropertyList{display:grid;gap:9px}
.previousPropertyItem{display:grid;gap:8px;padding:11px;border:1px solid rgba(99,190,161,.42);border-radius:12px;background:rgba(255,255,255,.82)}
.previousPropertyTop{display:flex;justify-content:space-between;gap:10px;align-items:baseline}.previousPropertyTop small{opacity:.7;font-size:11px}
.previousPropertyTotals{display:flex;flex-wrap:wrap;gap:6px}.previousPropertyTotals span{padding:3px 8px;border-radius:999px;background:rgba(99,190,161,.12);font-size:11px;font-weight:800}
.previousPropertyItem>small{opacity:.78;font-size:11px;line-height:1.45}
.previousPropertyItem>button{min-height:38px;border:0;border-radius:9px;background:#63bea1;color:#fff;font:inherit;font-weight:800;cursor:pointer}
.theme-dark .previousPropertyItem,.theme-cyber .previousPropertyItem,.theme-luxury .previousPropertyItem,.theme-retro .previousPropertyItem,.theme-galaxy .previousPropertyItem{background:rgba(5,12,24,.8)}
`}</style>
      <style>{`
.autoTagList{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 4px}.autoTag{display:inline-flex;align-items:center;min-height:26px;padding:3px 9px;border:1px solid rgba(110,145,232,.4);border-radius:999px;background:rgba(110,145,232,.1);color:inherit;font-size:11px;font-weight:800}.theme-cyber .autoTag{border-color:#00eaff;color:#8cffff;background:rgba(0,234,255,.08);text-shadow:0 0 5px rgba(0,234,255,.7)}.theme-luxury .autoTag{border-color:#d8b76a;color:#f1d88d}.theme-sakura .autoTag{border-color:#efbfd0;color:#b64670}.theme-ice .autoTag{border-color:#76d8ff;color:#176b9a}.theme-forest .autoTag{border-color:#72c98a;color:#285c3a}.theme-retro .autoTag{border-color:#00eaff;color:#fff11c;border-radius:0;background:#061020}.theme-galaxy .autoTag{border-color:#bda4ff;color:#e4d9ff}
`}</style>
      <style>{`
.estimateCheckPanel{display:grid;gap:8px;margin:14px 0;padding:12px 14px;border:1px solid rgba(80,160,120,.45);border-radius:14px;background:rgba(80,160,120,.08)}
.estimateCheckPanel.hasWarnings{border-color:rgba(232,160,70,.72);background:rgba(232,160,70,.1)}
.estimateCheckHeader{display:flex;justify-content:space-between;align-items:center;gap:10px}
.estimateCheckHeader span{font-size:12px;font-weight:900}
.estimateCheckPanel ul{margin:0;padding-left:20px}
.estimateCheckPanel li{margin:5px 0;line-height:1.45}
.estimateCheckPanel p{margin:0;line-height:1.5}
.estimateCheckPanel small{opacity:.7;font-size:11px;line-height:1.45}
.theme-dark .estimateCheckPanel,.theme-cyber .estimateCheckPanel,.theme-luxury .estimateCheckPanel,.theme-retro .estimateCheckPanel,.theme-galaxy .estimateCheckPanel{background:rgba(5,12,24,.76)}
`}</style>
      <style>{`
.similarSitesButton{margin-top:0}
.similarSitesPanel{display:grid;gap:10px;margin:12px 0;padding:13px;border:1px solid rgba(110,145,232,.4);border-radius:16px;background:rgba(110,145,232,.08)}
.similarSitesHeading{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:5px 10px}
.similarSitesHeading small,.similarSitesNote{opacity:.72;font-size:11px;line-height:1.45}
.similarSitesList{display:grid;gap:9px}
.similarSiteItem{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:11px;border:1px solid rgba(110,145,232,.38);border-radius:12px;background:rgba(255,255,255,.8)}
.similarSiteItem strong,.similarSiteItem small{display:block}
.similarSiteItem small{margin-top:3px;opacity:.76;font-size:11px;line-height:1.4}
.similarSiteActions{display:grid;align-content:space-between;justify-items:end;gap:8px}
.similarSiteActions span{font-size:11px;font-weight:800;opacity:.75}
.similarSiteActions button{min-height:36px;padding:6px 12px;border:0;border-radius:9px;background:#6e91e8;color:#fff;font:inherit;font-weight:800;cursor:pointer}
.theme-dark .similarSiteItem,.theme-cyber .similarSiteItem,.theme-luxury .similarSiteItem,.theme-retro .similarSiteItem,.theme-galaxy .similarSiteItem{background:rgba(5,12,24,.8)}
@media(max-width:520px){.similarSiteItem{grid-template-columns:1fr}.similarSiteActions{grid-template-columns:1fr auto;align-items:center;justify-items:start}.similarSiteActions button{justify-self:end}}
`}</style>
      <style>{`
.autoFrequentWorks{display:grid;gap:10px;margin:14px 0;padding:12px;border:1px solid rgba(167,123,209,.34);border-radius:14px;background:rgba(167,123,209,.08)}
.autoFrequentWorksTitle{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:5px 10px}
.autoFrequentWorksTitle strong{font-size:15px}
.autoFrequentWorksTitle small{opacity:.7;font-size:11px}
.autoFrequentWorkButtons{display:flex;flex-wrap:wrap;gap:8px}
.autoFrequentWorkButton{display:grid;gap:2px;min-height:44px;padding:8px 12px;border:1px solid rgba(167,123,209,.42);border-radius:999px;background:rgba(255,255,255,.84);color:inherit;font:inherit;text-align:left;cursor:pointer}
.autoFrequentWorkButton span{font-weight:800}
.autoFrequentWorkButton small{opacity:.68;font-size:10px}
.theme-dark .autoFrequentWorkButton,.theme-cyber .autoFrequentWorkButton,.theme-luxury .autoFrequentWorkButton,.theme-retro .autoFrequentWorkButton,.theme-galaxy .autoFrequentWorkButton{background:rgba(5,12,24,.78)}
`}</style>
      <style>{`
.pastPriceSuggestions{display:grid;gap:8px;padding:12px;border:1px solid rgba(110,145,232,.38);border-radius:14px;background:rgba(110,145,232,.08)}
.pastPriceSuggestions>strong{font-size:15px}
.pastPriceSuggestionList{display:grid;gap:8px}
.pastPriceSuggestionButton{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 10px;width:100%;padding:10px 12px;border:1px solid rgba(110,145,232,.42);border-radius:11px;background:rgba(255,255,255,.82);color:inherit;font:inherit;text-align:left;cursor:pointer}
.pastPriceSuggestionButton span{min-width:0;font-weight:800;overflow-wrap:anywhere}
.pastPriceSuggestionButton b{white-space:nowrap}
.pastPriceSuggestionButton small{grid-column:1/-1;opacity:.72;font-size:12px}
.pastPriceSuggestions>small{opacity:.72;font-size:12px;line-height:1.45}
.theme-dark .pastPriceSuggestionButton,.theme-cyber .pastPriceSuggestionButton,.theme-luxury .pastPriceSuggestionButton,.theme-retro .pastPriceSuggestionButton,.theme-galaxy .pastPriceSuggestionButton{background:rgba(5,12,24,.78)}
`}</style>
      <style>{`
/* M-CROSS_SITE_MEMO_V2 */
.siteMemoField textarea{width:100%;min-height:92px;resize:vertical;font:inherit;line-height:1.55;box-sizing:border-box}.siteMemoField small{display:block;margin-top:6px;opacity:.72;font-size:12px;line-height:1.45}
`}</style>
      <style>{`/* M-CROSS_PC_PHYSICAL_NUMPAD_V1 */`}</style>
      <style>{`
/* M-CROSS_CF_UI_POLISH_V1 */
.cfMaterialPanel{margin-top:18px;padding:16px;border:1px solid rgba(89,130,210,.28);border-radius:20px;background:linear-gradient(180deg,rgba(248,251,255,.98),rgba(239,245,255,.94));box-shadow:0 8px 24px rgba(34,74,130,.08)}
.cfMaterialPanel>h2{margin:0 0 6px;font-size:20px}.cfMaterialPanel>h3{margin:16px 0 8px;font-size:15px}
.cfMaterialAllocationSummary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0 16px}
.cfMaterialAllocationSummary .summaryLine{display:grid;gap:3px;padding:10px;border-radius:12px;background:rgba(255,255,255,.85);text-align:center}.cfMaterialAllocationSummary .summaryLine span{font-size:11px}.cfMaterialAllocationSummary .summaryLine strong{font-size:18px}
.cfMaterialChoices{display:grid;gap:8px}.cfMaterialChoice{display:flex;align-items:center;gap:12px;padding:12px 13px;border:1px solid rgba(95,130,190,.24);border-radius:14px;background:#fff;cursor:pointer}.cfMaterialChoice:has(input:checked){border-color:#688ee8;background:#eef4ff;box-shadow:0 0 0 2px rgba(104,142,232,.12)}
.cfMaterialChoice input{width:22px;height:22px;accent-color:#688ee8}.cfMaterialChoice span{display:grid;gap:2px}.cfMaterialChoice strong{font-size:15px}.cfMaterialChoice small{color:#687386}
.cfMaterialCreate,.cfMaterialGroup{display:grid;gap:10px;margin-top:12px;padding:14px;border:1px solid rgba(95,130,190,.25);border-radius:16px;background:rgba(255,255,255,.9)}
.cfMaterialGroupHeader{display:flex;align-items:center;justify-content:space-between}.cfMaterialGroupHeader strong{font-size:17px}.cfMaterialGroupHeader button{width:34px;height:34px;border:1px solid #e7a9ad;border-radius:50%;background:#fff2f3;color:#b33d47;font-size:19px;font-weight:900}
.cfMaterialGroup .summaryGrand,.cfMaterialCreate .summaryGrand{padding-top:8px;border-top:1px dashed rgba(90,120,170,.3)}
@media(max-width:520px){.cfMaterialPanel{padding:12px}.cfMaterialAllocationSummary{gap:6px}.cfMaterialAllocationSummary .summaryLine{padding:8px 4px}.cfMaterialAllocationSummary .summaryLine strong{font-size:16px}.cfMaterialChoice{padding:11px}.cfMaterialCreate,.cfMaterialGroup{padding:12px}}
.theme-dark .cfMaterialPanel,.theme-cyber .cfMaterialPanel,.theme-luxury .cfMaterialPanel,.theme-retro .cfMaterialPanel,.theme-galaxy .cfMaterialPanel{background:rgba(5,12,24,.9);color:inherit}.theme-dark .cfMaterialChoice,.theme-dark .cfMaterialCreate,.theme-dark .cfMaterialGroup,.theme-cyber .cfMaterialChoice,.theme-cyber .cfMaterialCreate,.theme-cyber .cfMaterialGroup,.theme-luxury .cfMaterialChoice,.theme-luxury .cfMaterialCreate,.theme-luxury .cfMaterialGroup,.theme-retro .cfMaterialChoice,.theme-retro .cfMaterialCreate,.theme-retro .cfMaterialGroup,.theme-galaxy .cfMaterialChoice,.theme-galaxy .cfMaterialCreate,.theme-galaxy .cfMaterialGroup{background:rgba(9,17,30,.88);color:inherit}

/* M-CROSS_RESIDENT_CASES_STEP3_STYLE */
.residentCasesHome{display:grid;gap:14px}.residentCasesTopbar{display:flex;align-items:center;justify-content:space-between;gap:10px}.residentNewCaseButton{width:auto;margin:0}.residentDashboardGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.residentDashboardCard{display:grid;gap:3px;padding:13px;border:1px solid rgba(100,120,150,.18);border-radius:15px;background:#fff;box-shadow:0 5px 15px rgba(50,70,100,.06)}.residentDashboardCard span{font-size:12px;font-weight:800;color:#656e7d}.residentDashboardCard strong{font-size:25px}.residentDashboardCard.urgent strong{color:#c84242}.residentDashboardCard.today strong{color:#d57c16}.residentDashboardCard.visit strong{color:#377fd1}.residentDashboardCard.contact strong{color:#8b5cc7}.residentDashboardCard.order strong{color:#348b69}.residentDashboardCard.report strong{color:#bb5a78}.residentCasesListHeader{display:flex;align-items:end;justify-content:space-between;margin-top:5px}.residentCasesListHeader h2{margin:0}.residentCasesListHeader span{font-weight:900;color:#687386}.residentCaseList{display:grid;gap:10px}.residentCaseCard{display:grid;gap:8px;padding:14px;border:1px solid rgba(100,120,150,.2);border-radius:17px;background:#fff;box-shadow:0 6px 18px rgba(50,70,100,.07)}.residentCaseCardTop{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.residentCaseCardTop>strong{font-size:16px}.residentCaseCardTop>span{flex:0 0 auto;padding:4px 8px;border-radius:999px;background:#edf3ff;color:#4d6fae;font-size:11px;font-weight:900}.residentCaseCard p{margin:0;color:inherit}.residentCaseNext{display:grid;gap:2px;padding:9px 10px;border-radius:11px;background:#fff7e8}.residentCaseNext span{font-size:11px;color:#8a7450;font-weight:800}.residentCaseNext strong{font-size:14px}.residentCaseCard small{color:#777}.residentEmptyCard{display:grid;gap:5px;text-align:center}.residentEmptyCard span{color:#777}@media(min-width:760px){.residentDashboardGrid{grid-template-columns:repeat(3,minmax(0,1fr))}}
.theme-dark .residentDashboardCard,.theme-dark .residentCaseCard,.theme-cyber .residentDashboardCard,.theme-cyber .residentCaseCard,.theme-luxury .residentDashboardCard,.theme-luxury .residentCaseCard,.theme-retro .residentDashboardCard,.theme-retro .residentCaseCard,.theme-galaxy .residentDashboardCard,.theme-galaxy .residentCaseCard{background:rgba(7,14,27,.9);color:inherit}.theme-dark .residentCaseNext,.theme-cyber .residentCaseNext,.theme-luxury .residentCaseNext,.theme-retro .residentCaseNext,.theme-galaxy .residentCaseNext{background:rgba(110,85,20,.18)}

/* M-CROSS_RESIDENT_CASES_STEP4_STYLE */
.residentCaseFormCard{display:grid;gap:12px;border:2px solid rgba(85,125,205,.25)}.residentCaseFormTitle{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.residentCaseFormTitle h2,.residentCaseFormTitle p{margin:0}.residentCaseFormGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin:10px 0 14px}.residentCaseFormGrid label{display:grid;gap:5px}.residentCaseFormGrid label>span{font-size:12px;font-weight:850;color:#687386}.residentCaseFormGrid input,.residentCaseFormGrid select,.residentCaseFormGrid textarea{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid rgba(100,120,150,.28);border-radius:12px;background:#fff;color:inherit;font:inherit}.residentCaseFormGrid textarea{resize:vertical}.residentCaseFormGrid .wide{grid-column:1/-1}@media(max-width:560px){.residentCaseFormGrid{grid-template-columns:1fr}.residentCaseFormGrid .wide{grid-column:auto}}.theme-dark .residentCaseFormGrid input,.theme-dark .residentCaseFormGrid select,.theme-dark .residentCaseFormGrid textarea,.theme-cyber .residentCaseFormGrid input,.theme-cyber .residentCaseFormGrid select,.theme-cyber .residentCaseFormGrid textarea,.theme-luxury .residentCaseFormGrid input,.theme-luxury .residentCaseFormGrid select,.theme-luxury .residentCaseFormGrid textarea,.theme-retro .residentCaseFormGrid input,.theme-retro .residentCaseFormGrid select,.theme-retro .residentCaseFormGrid textarea,.theme-galaxy .residentCaseFormGrid input,.theme-galaxy .residentCaseFormGrid select,.theme-galaxy .residentCaseFormGrid textarea{background:rgba(6,14,26,.9);color:inherit}

/* M-CROSS_RESIDENT_CASES_STEP4_1_STYLE */
.residentMasterShortcut{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px dashed rgba(90,120,170,.35);border-radius:12px;background:rgba(90,130,200,.06)}.residentMasterShortcut>span{font-size:12px;font-weight:800;color:#687386}.residentMasterShortcut .secondaryButton{width:auto;margin:0;padding:9px 12px}.residentCaseFormGrid input[readonly]{background:rgba(120,130,145,.08);color:#687386}@media(max-width:560px){.residentMasterShortcut{align-items:stretch;flex-direction:column}.residentMasterShortcut .secondaryButton{width:100%}}

/* M-CROSS_RESIDENT_CASES_STEP5_STYLE */
.residentCaseCard{cursor:pointer}.residentCaseCard:focus-visible{outline:3px solid #78a4ee;outline-offset:2px}.residentCaseDetail{display:grid;gap:13px;margin-top:8px}.residentCaseDetailTop{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.residentCaseDetailTop h2,.residentCaseDetailTop p{margin:0}.residentCaseDetailRequest{margin:0;padding:12px;border-radius:12px;background:rgba(90,130,200,.07);font-weight:750}.residentCallButton{display:block;text-decoration:none;text-align:center}.residentQuickActions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.residentQuickActions button{min-height:44px;padding:9px;border:1px solid rgba(95,125,180,.28);border-radius:12px;background:#fff;color:inherit;font-weight:850}.residentCaseDetailGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.residentCaseDetailGrid label{display:grid;gap:5px}.residentCaseDetailGrid label>span{font-size:12px;font-weight:850;color:#687386}.residentCaseDetailGrid input,.residentCaseDetailGrid select,.residentCaseDetailGrid textarea,.residentHistoryAdd input{width:100%;box-sizing:border-box;padding:10px 11px;border:1px solid rgba(100,120,150,.28);border-radius:11px;background:#fff;color:inherit;font:inherit}.residentCaseDetailGrid .wide{grid-column:1/-1}.residentHistoryAdd{display:grid;grid-template-columns:1fr auto;gap:8px}.residentHistoryAdd .secondaryButton{width:auto;margin:0}.residentHistoryList{display:grid;gap:8px}.residentHistoryList h3{margin:5px 0}.residentHistoryItem{display:grid;gap:5px;padding:10px 12px;border-left:4px solid #7f9fe3;border-radius:10px;background:rgba(105,135,200,.07)}.residentHistoryItem>div{display:flex;align-items:center;justify-content:space-between;gap:8px}.residentHistoryItem small{color:#777}.residentHistoryItem p{margin:0}@media(max-width:560px){.residentCaseDetailGrid{grid-template-columns:1fr}.residentCaseDetailGrid .wide{grid-column:auto}.residentHistoryAdd{grid-template-columns:1fr}.residentHistoryAdd .secondaryButton{width:100%}}

/* M-CROSS_RESIDENT_CASES_STEP6_STYLE */
.residentVisitEditor{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:9px;padding:11px;border:1px solid rgba(80,135,205,.25);border-radius:13px;background:rgba(80,135,205,.06)}.residentVisitEditor label{display:grid;gap:5px}.residentVisitEditor .secondaryButton{width:auto;margin:0;white-space:nowrap}.residentVisitEditor .secondaryButton:disabled{opacity:.45;cursor:not-allowed}@media(max-width:620px){.residentVisitEditor{grid-template-columns:1fr}.residentVisitEditor .secondaryButton{width:100%}}

/* M-CROSS_RESIDENT_CASES_STEP6_TIME_RANGE_STYLE */
.residentVisitTimeFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.residentVisitEditor{display:grid;grid-template-columns:minmax(0,1fr) auto}.residentVisitEditor>.saveStatus{grid-column:1/-1;margin:0}@media(max-width:620px){.residentVisitTimeFields{grid-template-columns:1fr}.residentVisitEditor{grid-template-columns:1fr}}

/* M-CROSS_RESIDENT_STEP6_LAYOUT_FIX_V1 */
.residentVisitEditor{display:grid!important;grid-template-columns:1fr!important;gap:10px;padding:12px!important}.residentVisitEditor h3{margin:0;font-size:15px}.residentVisitDateRow{display:grid;grid-template-columns:minmax(150px,1.35fr) minmax(105px,.8fr) minmax(105px,.8fr);gap:8px;align-items:end}.residentVisitDateRow label{min-width:0}.residentVisitDateRow input{min-width:0;width:100%;box-sizing:border-box}.residentCalendarButton{width:100%!important;margin:0!important;min-height:44px}.residentVisitEditor>.saveStatus{margin:0}@media(max-width:620px){.residentVisitDateRow{grid-template-columns:1fr 1fr}.residentVisitDateRow label:first-child{grid-column:1/-1}.residentVisitDateRow input{font-size:16px}.residentCalendarButton{white-space:normal}}

/* M-CROSS_RESIDENT_STEP6_DOWNLOAD_DELETE_V1_STYLE */
.residentCalendarNote{margin:0;color:#6e7580;font-size:11px;line-height:1.5}.residentDangerZone{margin-top:8px;padding-top:14px;border-top:1px dashed rgba(190,75,85,.35)}.residentDeleteCaseButton{width:100%;min-height:44px;margin:0}

/* M-CROSS_RESIDENT_CASES_STEP7_STYLE */
.residentImportActions{display:flex;align-items:center;gap:8px}.residentImportActions .residentNewCaseButton,.residentImportActions .residentImportButton{width:auto;margin:0}@media(max-width:620px){.residentCasesTopbar{align-items:stretch}.residentImportActions{display:grid;grid-template-columns:1fr}.residentImportActions .residentNewCaseButton,.residentImportActions .residentImportButton{width:100%}}

/* M-CROSS_RESIDENT_CASES_STEP8_STYLE */
.residentOverallCounts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.residentOverallCounts>button,.residentOverallCounts>div{display:grid;gap:2px;padding:11px;border:1px solid rgba(100,120,150,.2);border-radius:14px;background:#fff;color:inherit;text-align:center}.residentOverallCounts button{font:inherit;cursor:pointer}.residentOverallCounts .active,.residentDashboardCard.active{outline:3px solid rgba(90,135,220,.25);border-color:#6b8fd8}.residentOverallCounts span{font-size:11px;font-weight:850;color:#687386}.residentOverallCounts strong{font-size:22px}.residentSectionTitle{margin:4px 0 -4px}.residentDashboardCard{font:inherit;text-align:left;cursor:pointer}.residentCaseSearchBar{display:grid;grid-template-columns:1fr auto;gap:8px}.residentCaseSearchBar input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid rgba(100,120,150,.3);border-radius:12px;background:#fff;color:inherit;font:inherit}.residentCaseSearchBar button{padding:8px 12px;border:1px solid rgba(100,120,150,.25);border-radius:11px;background:#fff;color:inherit;font-weight:800}.residentMoreButton{width:100%;margin:2px 0 8px}@media(max-width:520px){.residentOverallCounts{grid-template-columns:repeat(3,1fr)}.residentOverallCounts>button,.residentOverallCounts>div{padding:9px 4px}.residentCaseSearchBar{grid-template-columns:1fr}.residentCaseSearchBar button{width:100%}}

/* M-CROSS_RESIDENT_CASES_STEP9_STYLE */
.residentNoDue{display:inline-flex;width:fit-content;padding:4px 8px;border:1px solid rgba(211,132,35,.35);border-radius:999px;background:rgba(255,184,67,.12);color:#a96610!important;font-weight:850}.theme-dark .residentNoDue,.theme-cyber .residentNoDue,.theme-luxury .residentNoDue,.theme-retro .residentNoDue,.theme-galaxy .residentNoDue{color:#ffd27d!important}

/* M-CROSS_RESIDENT_CASES_STEP10_STYLE */
.residentAttentionBanner{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border:1px solid rgba(80,150,105,.25);border-radius:15px;background:rgba(80,150,105,.07)}.residentAttentionBanner.hasAttention{border-color:rgba(214,105,58,.4);background:rgba(255,154,85,.10)}.residentAttentionBanner>div{display:grid;gap:2px}.residentAttentionBanner span{font-size:11px;font-weight:850;color:#697386}.residentAttentionBanner strong{font-size:17px}.residentAttentionBanner button{padding:8px 10px;border:1px solid rgba(210,130,55,.35);border-radius:10px;background:#fff7e8;color:#9a621d;font-weight:850}.residentCaseCard.overdue{border-color:rgba(210,70,70,.5);box-shadow:inset 4px 0 #d24b4b,0 6px 18px rgba(50,70,100,.07)}.residentCaseCard.todayVisit{box-shadow:inset 4px 0 #4f8fd9,0 6px 18px rgba(50,70,100,.07)}@media(max-width:560px){.residentAttentionBanner{align-items:stretch;flex-direction:column}.residentAttentionBanner button{width:100%}}

/* M-CROSS_RESIDENT_CASES_STEP11_ALL_IN_STYLE */
.residentOverallCountsFour{grid-template-columns:repeat(4,minmax(0,1fr))}.residentAttentionButtons{display:flex;flex-wrap:wrap;gap:6px}.residentCaseMetaBadges,.residentCardBadges{display:flex;flex-wrap:wrap;gap:6px}.residentCaseMetaBadges span,.residentCardBadges span{padding:4px 8px;border-radius:999px;background:rgba(95,125,180,.1);font-size:11px;font-weight:850}.residentCaseMetaBadges .priority-urgent,.residentCardBadges .urgent{background:rgba(210,70,70,.12);color:#bd3e3e}.residentCaseMetaBadges .priority-low{background:rgba(120,130,145,.10);color:#6d7480}.residentCaseMetaBadges .hold,.residentCardBadges .hold{background:rgba(120,105,155,.13);color:#735a9c}.residentQuickActions button:last-child{border-color:rgba(120,105,155,.35);background:rgba(120,105,155,.08)}@media(max-width:560px){.residentOverallCountsFour{grid-template-columns:repeat(2,1fr)}.residentAttentionButtons{display:grid;width:100%}.residentAttentionButtons button{width:100%}}

/* M-CROSS_RESIDENT_STEP12_COMPLETE_V1_STYLE */
.residentQuickPasteCard{display:grid;gap:12px;border:2px solid rgba(76,135,204,.28)}.residentQuickPasteCard>textarea{width:100%;box-sizing:border-box;padding:12px;border:1px solid rgba(100,120,150,.3);border-radius:13px;background:#fff;color:inherit;font:inherit;line-height:1.6}.residentQuickPreview{display:grid;gap:10px;padding-top:12px;border-top:1px dashed rgba(100,120,150,.3)}.residentImportActions{flex-wrap:wrap}.residentImportActions .residentQuickPasteButton{width:auto;margin:0}@media(max-width:620px){.residentImportActions{display:grid;grid-template-columns:1fr}.residentImportActions .residentQuickPasteButton{width:100%}.residentQuickPasteCard>textarea{font-size:16px}}

/* M-CROSS_RESIDENT_STEP12_MASTER_LINK_V1_STYLE */
.residentQuickPreview select{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid rgba(100,120,150,.28);border-radius:12px;background:#fff;color:inherit;font:inherit}

/* M-CROSS_RESIDENT_CASES_STEP14_DETAIL_PAGE_STYLE */
.residentCaseDetailPage{position:fixed;inset:0;z-index:1200;overflow-y:auto;background:var(--page-bg,#f6f5f1);padding:18px max(12px,calc((100vw - 760px)/2));overscroll-behavior:contain}.residentCaseDetailPage>.residentCaseDetail{margin:0;min-height:calc(100vh - 36px);box-sizing:border-box}.residentCaseDetailPage .residentCaseDetailTop{position:sticky;top:0;z-index:4;padding:8px 0 10px;background:inherit}.theme-dark .residentCaseDetailPage,.theme-cyber .residentCaseDetailPage,.theme-luxury .residentCaseDetailPage,.theme-retro .residentCaseDetailPage,.theme-galaxy .residentCaseDetailPage{background:#07101c}@media(max-width:620px){.residentCaseDetailPage{padding:10px}.residentCaseDetailPage>.residentCaseDetail{min-height:calc(100vh - 20px)}.residentCaseDetailPage .residentCaseDetailTop{padding-top:4px}}

/* M-CROSS_RESIDENT_CASES_STEP15_PDF_IMPORT_STYLE */
.residentImportActions .residentPdfImportButton{width:auto;margin:0}.residentPdfSource{margin:0;padding:8px 10px;border-radius:10px;background:rgba(75,130,205,.08);color:#5f6f85;font-size:12px;font-weight:800}.residentPdfImportButton:disabled{opacity:.55;cursor:progress}@media(max-width:620px){.residentImportActions .residentPdfImportButton{width:100%}}

/* M-CROSS_RESIDENT_STEP16_OLLAMA_AI_STYLE */
.residentAiReadButton{width:100%;margin:0}.residentAiReadButton:disabled{opacity:.55;cursor:not-allowed}.residentAiStatus{margin:0;padding:9px 11px;border-radius:10px;background:rgba(64,145,100,.10);color:#34704c;font-size:12px;font-weight:800}.theme-dark .residentAiStatus,.theme-cyber .residentAiStatus,.theme-luxury .residentAiStatus,.theme-retro .residentAiStatus,.theme-galaxy .residentAiStatus{color:#9ce4b8}

/* M-CROSS_RESIDENT_STEP16_5_PDF_SOURCE_PREVIEW_STYLE */
.residentSourceCompare{display:grid;gap:10px;margin:2px 0 12px}.residentSourceBox{border:1px solid rgba(100,120,150,.25);border-radius:12px;background:rgba(255,255,255,.7);overflow:hidden}.residentSourceBox summary{padding:10px 12px;font-weight:900;cursor:pointer}.residentSourceBox pre{margin:0;padding:12px;max-height:260px;overflow:auto;white-space:pre-wrap;word-break:break-word;border-top:1px solid rgba(100,120,150,.18);font:inherit;font-size:12px;line-height:1.6}.theme-dark .residentSourceBox,.theme-cyber .residentSourceBox,.theme-luxury .residentSourceBox,.theme-retro .residentSourceBox,.theme-galaxy .residentSourceBox{background:rgba(6,14,26,.75)}

/* M-CROSS_RESIDENT_STEP16_8_REMOVE_PDF_IMPORT */
.residentPdfSource{display:none!important}

/* M-CROSS_TOP_SPACING_FIX_V1 */
/* 繝医ャ繝礼判髱｢縺ｮ蜈･蜉帙ヶ繝ｭ繝・け縺ｨ謫堺ｽ懊・繧ｿ繝ｳ縺ｮ邵ｦ繝ｪ繧ｺ繝繧呈純縺医ｋ */
.main .card > .primary,
.main .card > .secondaryButton,
.main .card > .oneDriveSyncPanel,
.main .card > .residentCasesEntryButton{margin-top:12px!important;margin-bottom:0!important}
.main .card > .primary + .secondaryButton,
.main .card > .secondaryButton + .secondaryButton,
.main .card > .secondaryButton + .oneDriveSyncPanel,
.main .card > .oneDriveSyncPanel + .residentCasesEntryButton,
.main .card > .residentCasesEntryButton + .secondaryButton{margin-top:10px!important}
/* 蝨ｰ蝗ｳ繝懊ち繝ｳ縺ｮ縺ゅ→縺ｫ蜿ｷ螳､隕句・縺励′鬟溘＞霎ｼ縺ｾ縺ｪ縺・ｈ縺・ｽ咏區繧堤｢ｺ菫・*/
.main .card > button.primary + label,
.main .card > button.secondaryButton + label,
.main .card > button + .fieldLabel,
.main .card > button + h2,
.main .card > button + h3{margin-top:22px!important}
/* 迴ｾ蝣ｴ繝｡繝｢蠕後・讀懃ｴ｢繝懊ち繝ｳ縺ｨ謗｡蟇ｸ髢句ｧ九ｒ蟆代＠蛻・屬 */
.main .card textarea + small{display:block;margin-top:7px}
.main .card .similarSitesButton{margin-top:14px!important;margin-bottom:6px!important}
/* OneDrive閾ｪ霄ｫ縺ｮ螟門・菴咏區縺ｯ隕ｪ蛛ｴ縺ｧ邂｡逅・*/
.main .card > .oneDriveSyncPanel{margin-bottom:0!important}
@media(max-width:620px){
  .main .card > .primary,
  .main .card > .secondaryButton,
  .main .card > .oneDriveSyncPanel,
  .main .card > .residentCasesEntryButton{margin-top:10px!important}
  .main .card > button.primary + label,
  .main .card > button.secondaryButton + label{margin-top:20px!important}
}

/* M-CROSS_STEP18_PC_APP_LAYOUT */
@media (min-width: 980px) {
  body{background:#eef1f6}
  #root{min-height:100vh}
  .app{min-height:100vh;background:transparent}
  .app>header,.app>.header,.topHeader{max-width:none!important}
  .main{width:min(1480px,calc(100vw - 72px))!important;max-width:none!important;margin:0 auto!important;padding:28px 0 46px!important}
  .main>.card{max-width:none!important;border-radius:20px!important;box-shadow:0 12px 34px rgba(32,47,72,.10)!important}

  /* Top/new-property screen: use horizontal desktop space instead of a phone column. */
  .main>.card:not(.residentCaseDetail):not(.residentCaseFormCard):not(.residentQuickPasteCard){padding:28px!important}
  .main>.card>label{max-width:none}
  .main>.card input,.main>.card select,.main>.card textarea{font-size:15px}
  .main>.card>.primary,.main>.card>.secondaryButton,.main>.card>.residentCasesEntryButton{min-height:48px}

  /* Resident-case dashboard becomes a real desktop workspace. */
  .residentCasesHome{width:min(1540px,calc(100vw - 64px));margin:0 auto;gap:16px}
  .residentCasesTopbar{position:sticky;top:8px;z-index:20;padding:10px 14px;border:1px solid rgba(100,120,150,.18);border-radius:16px;background:rgba(250,250,252,.94);backdrop-filter:blur(12px);box-shadow:0 8px 24px rgba(30,50,80,.08)}
  .residentImportActions{display:flex!important;flex-wrap:wrap;justify-content:flex-end;gap:8px!important}
  .residentImportActions button{width:auto!important;min-width:170px}
  .residentOverallCounts{grid-template-columns:repeat(4,minmax(150px,1fr))!important}
  .residentDashboardGrid{grid-template-columns:repeat(6,minmax(120px,1fr))!important}
  .residentCaseSearchBar{grid-template-columns:minmax(320px,1fr) auto!important}

  /* Give lists a desktop density and avoid giant full-width phone cards. */
  .residentCaseList{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px!important}
  .residentCaseCard{min-height:150px;padding:16px 18px!important}
  .residentCaseCardTop>strong{font-size:17px!important}

  /* Detail acts like a desktop application window. */
  .residentCaseDetailPage{padding:24px max(28px,calc((100vw - 1240px)/2))!important;background:#eef1f6!important}
  .residentCaseDetailPage>.residentCaseDetail{min-height:calc(100vh - 48px)!important;padding:24px!important;border-radius:20px!important;box-shadow:0 20px 55px rgba(25,40,65,.16)!important}
  .residentCaseDetailGrid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  .residentQuickActions{grid-template-columns:repeat(4,minmax(0,1fr))!important}
  .residentVisitDateRow{grid-template-columns:minmax(190px,1.5fr) minmax(120px,.8fr) minmax(120px,.8fr)!important}

  /* Settings and saved views should feel like desktop panels too. */
  .settingsMain{width:min(1260px,calc(100vw - 72px))!important;max-width:none!important}
  .settingsMain>.card{padding:26px!important}

  .theme-dark .residentCasesTopbar,.theme-cyber .residentCasesTopbar,.theme-luxury .residentCasesTopbar,.theme-retro .residentCasesTopbar,.theme-galaxy .residentCasesTopbar{background:rgba(7,14,27,.94)}
  .theme-dark .residentCaseDetailPage,.theme-cyber .residentCaseDetailPage,.theme-luxury .residentCaseDetailPage,.theme-retro .residentCaseDetailPage,.theme-galaxy .residentCaseDetailPage{background:#050b14!important}
}

@media (min-width: 1280px) {
  .main{width:min(1560px,calc(100vw - 96px))!important}
  .residentCasesHome{width:min(1600px,calc(100vw - 96px))}
  .residentCaseList{grid-template-columns:repeat(3,minmax(0,1fr))}
}

/* M-CROSS_STEP18_1_SPLIT_WINDOW_CENTER_FIX */
/* PC繝輔Ν逕ｻ髱｢縺ｯ繝ｯ繧､繝峨仝indows縺ｮ2蛻・牡遞句ｺｦ縺ｧ縺ｯ荳ｭ螟ｮ蟇・○縺励※讓ｪ繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ繧帝亟縺・*/
@media (min-width:980px) and (max-width:1249px){
  html,body,#root,.app{max-width:100%;overflow-x:hidden!important}
  .main,.settingsMain{width:calc(100% - 32px)!important;max-width:1120px!important;margin-left:auto!important;margin-right:auto!important;padding-left:0!important;padding-right:0!important;box-sizing:border-box!important}
  .main>.card{width:100%!important;max-width:100%!important;box-sizing:border-box!important}
  .residentCasesHome{width:calc(100% - 32px)!important;max-width:1120px!important;margin-left:auto!important;margin-right:auto!important;box-sizing:border-box!important}
  .residentDashboardGrid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  .residentOverallCounts{grid-template-columns:repeat(4,minmax(0,1fr))!important}
  .residentCaseList{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  .residentImportActions button{min-width:0!important}
  .residentCaseSearchBar{grid-template-columns:minmax(0,1fr) auto!important}
}
@media (min-width:980px){
  .main,.residentCasesHome,.settingsMain{left:auto!important;right:auto!important;transform:none!important}
}

/* M-CROSS_STEP18_2_TRUE_CENTER_FIX */
/* PC縺ｧ縺ｯ隕ｪ隕∫ｴ縺ｮ譌｢蟄倥が繝輔そ繝・ヨ繧呈遠縺｡豸医＠縲∫樟蝨ｨ縺ｮ繧ｦ繧｣繝ｳ繝峨え蟷・・荳ｭ螟ｮ縺ｫ蝗ｺ螳・*/
@media (min-width:980px){
  html,body,#root{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;overflow-x:hidden!important}
  #root>.app,.app{width:100%!important;max-width:none!important;margin:0!important;padding-left:0!important;padding-right:0!important;box-sizing:border-box!important}
  .app>.main,.main,.settingsMain{
    position:relative!important;
    left:50%!important;
    right:auto!important;
    transform:translateX(-50%)!important;
    margin-left:0!important;
    margin-right:0!important;
    box-sizing:border-box!important;
  }
}
@media (min-width:980px) and (max-width:1249px){
  .app>.main,.main,.settingsMain{width:calc(100vw - 40px)!important;max-width:1080px!important;padding-left:0!important;padding-right:0!important}
  .residentCasesHome{width:100%!important;max-width:1080px!important;margin-left:auto!important;margin-right:auto!important}
  .main>.card{width:100%!important;max-width:100%!important;margin-left:auto!important;margin-right:auto!important;box-sizing:border-box!important}
}
@media (min-width:1250px){
  .app>.main,.main{width:min(1480px,calc(100vw - 80px))!important}
  .settingsMain{width:min(1260px,calc(100vw - 80px))!important}
}

/* M-CROSS_STEP18_3_DETAIL_OVERLAY_CLEAN */
/* 譯井ｻｶ隧ｳ邏ｰ縺ｪ縺ｩ縺ｮ迢ｬ遶九・繝ｼ繧ｸ繧偵∬レ蠕後・荳隕ｧ縺碁上￠縺ｪ縺・悽蠖薙・逕ｻ髱｢縺ｨ縺励※陦ｨ遉ｺ */
.residentCaseDetailPage{
  position:fixed!important;
  inset:0!important;
  width:100vw!important;
  height:100vh!important;
  max-width:none!important;
  margin:0!important;
  transform:none!important;
  overflow-y:auto!important;
  overflow-x:hidden!important;
  z-index:9999!important;
  background:#eef1f6!important;
  isolation:isolate;
}
.residentCaseDetailPage::before{
  content:'';
  position:fixed;
  inset:0;
  z-index:-1;
  background:#eef1f6;
}
.residentCaseDetailPage>.residentCaseDetail{
  width:min(1120px,calc(100vw - 48px))!important;
  max-width:1120px!important;
  margin:0 auto!important;
}
.theme-dark .residentCaseDetailPage,
.theme-cyber .residentCaseDetailPage,
.theme-luxury .residentCaseDetailPage,
.theme-retro .residentCaseDetailPage,
.theme-galaxy .residentCaseDetailPage,
.theme-dark .residentCaseDetailPage::before,
.theme-cyber .residentCaseDetailPage::before,
.theme-luxury .residentCaseDetailPage::before,
.theme-retro .residentCaseDetailPage::before,
.theme-galaxy .residentCaseDetailPage::before{background:#050b14!important}
@media(max-width:620px){
  .residentCaseDetailPage>.residentCaseDetail{width:calc(100vw - 20px)!important;margin:0 auto!important}
}

/* M-CROSS_STEP18_4_RESIDENT_CENTER_FIX */
@media (min-width:980px){
  /* residentCasesHome had its own width rule, so center the resident workspace independently. */
  .residentCasesHome{
    position:relative!important;
    left:50%!important;
    right:auto!important;
    transform:translateX(-50%)!important;
    margin-left:0!important;
    margin-right:0!important;
    box-sizing:border-box!important;
  }
  .residentQuickPasteCard,
  .residentCaseFormCard{
    width:100%!important;
    max-width:100%!important;
    margin-left:auto!important;
    margin-right:auto!important;
    box-sizing:border-box!important;
  }
}
@media (min-width:980px) and (max-width:1249px){
  .residentCasesHome{width:calc(100vw - 40px)!important;max-width:1080px!important}
}
@media (min-width:1250px){
  .residentCasesHome{width:min(1540px,calc(100vw - 80px))!important;max-width:1540px!important}
}

/* M-CROSS_STEP19_WORK_ORDERS_BASE_STYLE */
.workOrdersHome{display:grid;gap:16px;width:min(1200px,calc(100% - 24px));margin:0 auto}.workOrdersTopbar{display:flex;align-items:center;gap:18px}.workOrdersTopbar h1,.workOrdersTopbar p{margin:0}.workOrderStats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.workOrderStats>div{display:grid;gap:4px;padding:14px;border:1px solid rgba(100,120,150,.2);border-radius:14px;background:#fff;text-align:center}.workOrderStats span{font-size:12px;font-weight:800;color:#687386}.workOrderStats strong{font-size:24px}.workOrdersEmpty{display:grid;gap:6px;text-align:center}.workOrdersList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media(max-width:700px){.workOrdersHome{width:100%}.workOrdersList{grid-template-columns:1fr}.workOrderStats{grid-template-columns:repeat(3,1fr)}}

/* M-CROSS_STEP19_1_RESIDENT_TO_WORKORDER_STYLE */
.residentWorkOrderTransfer{display:grid;gap:8px;margin-top:10px;padding-top:14px;border-top:1px solid rgba(90,130,190,.25)}.residentWorkOrderTransfer .primary,.residentWorkOrderTransfer .secondaryButton{width:100%;margin:0;min-height:48px}

/* M-CROSS_STEP19_2_RESTORATION_TO_WORKORDER_STYLE */
.restorationWorkOrderAction{display:grid;gap:8px;margin:12px 0 16px}.restorationWorkOrderAction .primary,.restorationWorkOrderAction .secondaryButton{width:100%;margin:0;min-height:48px}

/* M-CROSS_STEP19_3_WORKORDER_DETAIL_STYLE */
.workOrderCard{cursor:pointer}.workOrderCard:focus-visible{outline:3px solid #7fa6ef;outline-offset:2px}.workOrderDetailPage{position:fixed;inset:0;z-index:9999;overflow:auto;background:#eef1f6;padding:22px}.workOrderDetail{width:min(1180px,calc(100vw - 44px));margin:0 auto;display:grid;gap:16px;padding:24px!important}.workOrderDetailTop{display:flex;align-items:center;gap:18px}.workOrderDetailTop h1,.workOrderDetailTop p{margin:0}.workOrderSection{display:grid;gap:12px;padding:16px;border:1px solid rgba(100,120,150,.18);border-radius:14px;background:rgba(255,255,255,.5)}.workOrderSection h2{margin:0}.workOrderFormGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.workOrderFormGrid label{display:grid;gap:5px}.workOrderFormGrid label>span{font-size:12px;font-weight:850;color:#687386}.workOrderFormGrid input,.workOrderFormGrid select,.workOrderFormGrid textarea{width:100%;box-sizing:border-box;padding:10px 11px;border:1px solid rgba(100,120,150,.28);border-radius:10px;background:#fff;color:inherit;font:inherit}.workOrderFormGrid .wide{grid-column:1/-1}.workOrderMoneyGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.workOrderMoneyGrid>div{display:grid;gap:3px;padding:12px;border-radius:12px;background:rgba(90,130,200,.07);text-align:center}.workOrderMoneyGrid span{font-size:11px;font-weight:800;color:#687386}.workOrderMoneyGrid strong{font-size:20px}@media(max-width:700px){.workOrderDetailPage{padding:8px}.workOrderDetail{width:calc(100vw - 16px);padding:14px!important}.workOrderDetailTop{align-items:flex-start;flex-direction:column}.workOrderFormGrid{grid-template-columns:1fr}.workOrderFormGrid .wide{grid-column:auto}.workOrderMoneyGrid{grid-template-columns:repeat(2,1fr)}}

/* M-CROSS_STEP19_2_ESTIMATE_TRANSFER_FIX_STYLE */
.workOrderEstimateItems{display:grid;gap:7px}.workOrderEstimateItem{display:grid;grid-template-columns:minmax(0,1fr) 110px 120px 130px;align-items:center;gap:10px;padding:10px 12px;border:1px solid rgba(100,120,150,.18);border-radius:10px;background:rgba(255,255,255,.62)}.workOrderEstimateItem>div{display:grid;gap:2px}.workOrderEstimateItem small{color:#737b87}.workOrderEstimateItem>span,.workOrderEstimateItem>strong{text-align:right}@media(max-width:700px){.workOrderEstimateItem{grid-template-columns:1fr 1fr}.workOrderEstimateItem>div{grid-column:1/-1}.workOrderEstimateItem>span,.workOrderEstimateItem>strong{text-align:left}}

/* M-CROSS_STEP20_2_LOGO_PRINT_DETAIL_HEIGHT_STYLE */
.workOrderDetailPage{min-height:100vh!important;box-sizing:border-box!important;padding-bottom:28px!important}
.workOrderDetailPage>.workOrderDetail{min-height:calc(100vh - 44px)!important;box-sizing:border-box!important;padding-bottom:32px!important}
@media(min-width:980px){.workOrderDetailPage>.workOrderDetail{width:min(1180px,calc(100vw - 64px))!important;max-width:1180px!important}}
@media(max-width:700px){.workOrderDetailPage{padding-bottom:10px!important}.workOrderDetailPage>.workOrderDetail{min-height:calc(100vh - 16px)!important;padding-bottom:20px!important}}

/* M-CROSS_STEP20_3_FIXED_TEMPLATE */
.workOrderDetailPage{padding-top:12px!important;padding-bottom:0!important;background:#eef1f6!important}
.workOrderDetailPage>.workOrderDetail{min-height:calc(100vh - 12px)!important;margin-bottom:0!important;border-bottom-left-radius:0!important;border-bottom-right-radius:0!important}
@media(max-width:700px){.workOrderDetailPage{padding-top:6px!important}.workOrderDetailPage>.workOrderDetail{min-height:calc(100vh - 6px)!important}}

/* M-CROSS_STEP20_4_CLEAN_WORKBOOK */
/* M-CROSS_STEP20_14_TEMPLATE_NO_BUTTONS */
/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */
.keypadEnterRow {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.keypadEnterRow .keypadButton {
  width: 100%;
  min-width: 0;
}
.keypadEnterButton {
  font-weight: 800;
}
`}</style>
      <style>{`
/* M-CROSS_ESTIMATE_THEME_COLORS_V1 */
/* 讎らｮ苓ｦ狗ｩ榊ｰら畑縺ｮ繝・・繝槫挨驟崎牡縲ゅΞ繧､繧｢繧ｦ繝医↓縺ｯ隗ｦ繧後↑縺・・*/
.app {
  --estimate-bg: rgba(255, 255, 255, 0.90);
  --estimate-border: rgba(180, 105, 55, 0.55);
  --estimate-heading: #8a421c;
  --estimate-item: #5c2f18;
  --estimate-number: #342117;
  --estimate-money: #9a3f0d;
  --estimate-total-bg: rgba(255, 235, 215, 0.92);
  --estimate-glow: none;
}

.app.theme-dark {
  --estimate-bg: rgba(20, 27, 39, 0.94);
  --estimate-border: rgba(125, 174, 230, 0.68);
  --estimate-heading: #b9d8ff;
  --estimate-item: #e7f1ff;
  --estimate-number: #d7e8ff;
  --estimate-money: #97c9ff;
  --estimate-total-bg: rgba(31, 50, 76, 0.95);
  --estimate-glow: 0 0 8px rgba(120, 185, 255, 0.30);
}

.app.theme-pop {
  --estimate-bg: rgba(255, 247, 252, 0.96);
  --estimate-border: rgba(235, 73, 151, 0.66);
  --estimate-heading: #c41970;
  --estimate-item: #8c174f;
  --estimate-number: #5d173b;
  --estimate-money: #d31374;
  --estimate-total-bg: rgba(255, 224, 241, 0.96);
  --estimate-glow: 0 0 7px rgba(244, 114, 182, 0.24);
}

.app.theme-cyber {
  --estimate-bg: rgba(3, 10, 24, 0.96);
  --estimate-border: rgba(37, 220, 255, 0.88);
  --estimate-heading: #c08cff;
  --estimate-item: #f0e8ff;
  --estimate-number: #54eaff;
  --estimate-money: #ffffff;
  --estimate-total-bg: rgba(5, 24, 45, 0.97);
  --estimate-glow: 0 0 9px rgba(37, 220, 255, 0.58);
}

.app.theme-luxury {
  --estimate-bg: rgba(9, 9, 11, 0.97);
  --estimate-border: rgba(216, 183, 106, 0.78);
  --estimate-heading: #f1d88d;
  --estimate-item: #fff5d7;
  --estimate-number: #f6e7b8;
  --estimate-money: #ffd76a;
  --estimate-total-bg: rgba(34, 28, 15, 0.97);
  --estimate-glow: 0 0 8px rgba(216, 183, 106, 0.34);
}

.app.theme-sakura {
  --estimate-bg: rgba(255, 249, 252, 0.97);
  --estimate-border: rgba(236, 91, 148, 0.70);
  --estimate-heading: #c93472;
  --estimate-item: #7d244d;
  --estimate-number: #5f2441;
  --estimate-money: #d42470;
  --estimate-total-bg: rgba(255, 226, 239, 0.97);
  --estimate-glow: 0 0 7px rgba(255, 120, 173, 0.25);
}

.app.theme-ice {
  --estimate-bg: rgba(242, 252, 255, 0.97);
  --estimate-border: rgba(72, 173, 219, 0.70);
  --estimate-heading: #076b9b;
  --estimate-item: #164f6d;
  --estimate-number: #123f58;
  --estimate-money: #007cad;
  --estimate-total-bg: rgba(218, 245, 255, 0.97);
  --estimate-glow: 0 0 7px rgba(79, 196, 245, 0.25);
}

.app.theme-forest {
  --estimate-bg: rgba(246, 252, 247, 0.97);
  --estimate-border: rgba(61, 143, 78, 0.68);
  --estimate-heading: #236c35;
  --estimate-item: #234f2d;
  --estimate-number: #24462c;
  --estimate-money: #167331;
  --estimate-total-bg: rgba(224, 244, 228, 0.97);
  --estimate-glow: 0 0 7px rgba(72, 166, 92, 0.22);
}

.app.theme-retro {
  --estimate-bg: rgba(31, 20, 9, 0.97);
  --estimate-border: rgba(255, 194, 61, 0.86);
  --estimate-heading: #ffdf75;
  --estimate-item: #fff0bd;
  --estimate-number: #ffd86a;
  --estimate-money: #ff9f43;
  --estimate-total-bg: rgba(61, 36, 10, 0.97);
  --estimate-glow: 0 0 7px rgba(255, 179, 55, 0.38);
}

.app.theme-galaxy {
  --estimate-bg: rgba(12, 8, 34, 0.97);
  --estimate-border: rgba(189, 164, 255, 0.82);
  --estimate-heading: #d6c5ff;
  --estimate-item: #f0eaff;
  --estimate-number: #bfe8ff;
  --estimate-money: #f8f5ff;
  --estimate-total-bg: rgba(35, 23, 75, 0.97);
  --estimate-glow: 0 0 10px rgba(173, 145, 255, 0.48);
}

.estimateRoom {
  background: var(--estimate-bg) !important;
  border-color: var(--estimate-border) !important;
  box-shadow: var(--estimate-glow) !important;
}

.estimateRoom h3 {
  color: var(--estimate-heading) !important;
  text-shadow: var(--estimate-glow) !important;
}

.estimateRow > strong:first-child,
.estimateRow > strong:first-child .estimateMemo {
  color: var(--estimate-item) !important;
}

.estimateRow .estimateNumber {
  color: var(--estimate-number) !important;
}

.estimateRow > .estimateNumber:last-child,
.estimateRow > .estimateNumber:last-child strong {
  color: var(--estimate-money) !important;
  text-shadow: var(--estimate-glow) !important;
}

.estimateTotal {
  background: var(--estimate-total-bg) !important;
  border-color: var(--estimate-border) !important;
  color: var(--estimate-heading) !important;
  box-shadow: var(--estimate-glow) !important;
}

.estimateTotal strong {
  color: var(--estimate-money) !important;
  text-shadow: var(--estimate-glow) !important;
}
`}</style>
      <style>{`
/* M-CROSS_ESTIMATE_FONT_FIX_FINAL */
/* 讎らｮ苓ｦ狗ｩ阪・謨ｰ蟄励し繧､繧ｺ繧呈怙邨ら噪縺ｫ荳頑嶌縺阪ょｰ丈ｸｭ螟ｧ縺ｮapp zoom縺ｫ繧る｣蜍輔☆繧・*/
@media (max-width:700px){
 .estimateRow .estimateNumber{font-size:16px!important;line-height:1.5!important;font-weight:700!important;}
 .estimateRow>.estimateNumber:last-child,.estimateRow>.estimateNumber:last-child strong{font-size:18px!important;line-height:1.45!important;font-weight:900!important;}
 .estimateTotal{font-size:17px!important;font-weight:800!important;}
 .estimateTotal strong{font-size:20px!important;font-weight:900!important;}
}
`}</style>
      <style>{`
/* M-CROSS_ESTIMATE_NUMBERS_LARGE_V1 */
/* 蜈ｨ繝・・繝槫・騾夲ｼ壹せ繝槭・讎らｮ励・謨ｰ驥上・蜊倅ｾ｡繝ｻ驥鷹｡阪ｒ隱ｭ縺ｿ繧・☆縺乗僑螟ｧ */
@media (max-width:700px) {
  .estimateRow .estimateNumber {
    font-size: 1.12em !important;
    line-height: 1.5 !important;
    font-weight: 700 !important;
    letter-spacing: 0.01em !important;
  }

  .estimateRow > .estimateNumber:last-child {
    font-size: 1.18em !important;
    font-weight: 800 !important;
  }

  .estimateTotal {
    font-size: 1.18em !important;
    font-weight: 700 !important;
  }

  .estimateTotal strong {
    font-size: 1.28em !important;
    font-weight: 900 !important;
  }
}
`}</style>
      <style>{`
/* M-CROSS_MOBILE_ESTIMATE_FINAL */
/* Final mobile estimate layout: no horizontal scrolling. */
@media (max-width:700px) {
  .estimateRoom { width:100%!important; max-width:100%!important; overflow:visible!important; box-sizing:border-box!important; }
  .estimateRow { width:100%!important; max-width:100%!important; min-width:0!important; display:flex!important; flex-wrap:wrap!important; gap:4px 5px!important; box-sizing:border-box!important; overflow:visible!important; }
  .estimateRow > strong:first-child { flex:0 0 100%!important; width:100%!important; min-width:0!important; max-width:100%!important; white-space:normal!important; word-break:keep-all!important; overflow-wrap:break-word!important; font-size:1.02em!important; line-height:1.45!important; }
  .estimateRow > strong:first-child .estimateMemo { display:inline!important; margin-left:6px!important; white-space:normal!important; word-break:keep-all!important; overflow-wrap:break-word!important; font-size:.95em!important; }
  .estimateRow .estimateNumber { flex:0 0 auto!important; width:auto!important; max-width:100%!important; min-width:0!important; white-space:nowrap!important; font-size:.96em!important; line-height:1.4!important; text-align:left!important; }
  .estimateRow .estimateUnit::after { content:" ﾃ・; }
  .estimateRow .estimateRate::after { content:" ・・!important; }
  .estimateRow > .estimateNumber:last-child { margin-left:0!important; text-align:left!important; }
  .estimateRow > .estimateNumber:last-child::before { content:""!important; }
  .estimateTotal { width:100%!important; max-width:100%!important; display:flex!important; flex-wrap:wrap!important; justify-content:space-between!important; gap:6px 12px!important; box-sizing:border-box!important; overflow:visible!important; font-size:1.08em!important; }
  .estimateTotal strong { white-space:nowrap!important; font-size:1.15em!important; }
}
`}</style>
      
      
      
      
      <div
        className={`app${theme === 'dark' ? ' theme-dark' : theme === 'pop' ? ' theme-pop' : theme === 'cyber' ? ' theme-cyber' : theme === 'luxury' ? ' theme-luxury' : theme === 'sakura' ? ' theme-sakura' : theme === 'ice' ? ' theme-ice' : theme === 'forest' ? ' theme-forest' : theme === 'galaxy' ? ' theme-galaxy' : theme === 'retro' ? ' theme-retro' : ''}`}
        style={{ zoom: fontScales[fontSize] || 1 }}
      >
        <header className="header">
          <div className="brandGroup">
            <img className="brandLogo" src="/m-cross-logo.png" alt="M-Cross" onClick={handleLogoTap} />
            <div>
              <div className="mavieBrand">MavieSelect</div>
              <div className="brand">M-Cross</div>
            </div>
          </div>
          <button className="settingsButton" type="button" aria-label="險ｭ螳・ onClick={() => { setSettingsPage('home'); setSettingsOpen(true) }}>笞呻ｸ・/button>
        </header>

        {settingsOpen ? (
          <main className={`main settingsMain${masterPropertyCompanyId ? ' managementPropertyOpen' : ''}`}>
            <button className="back" type="button" onClick={() => {
              if (settingsPage === 'home') setSettingsOpen(false)
              else { setSettingsPage('home'); setMasterPropertyCompanyId(''); setShowPropertyForm(false) }
            }}>{settingsPage === 'home' ? '竊・謌ｻ繧・ : '竊・險ｭ螳壹∈謌ｻ繧・}</button>
            <p className="eyebrow">M-Cross險ｭ螳・/p>
            <h1>{settingsPage === 'home' ? '險ｭ螳・ : settingsPage === 'additional' ? '霑ｽ蜉菴懈･ｭ險ｭ螳・ : settingsPage === 'memos' ? '繝｡繝｢險ｭ螳・ : settingsPage === 'rooms' ? '蛻晄悄驛ｨ螻玖ｨｭ螳・ : settingsPage === 'pricing' ? '蜊倅ｾ｡繝ｻ讎らｮ苓ｨｭ螳・ : '邂｡逅・ｼ夂､ｾ繝ｻ迚ｩ莉ｶ邂｡逅・}</h1>
            <section className="card">
              {settingsPage === 'home' && (<>
              <h2>陦ｨ遉ｺ險ｭ螳・/h2>
              <h2>繝輔か繝ｳ繝医し繧､繧ｺ</h2>
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
              <h2 style={{ marginTop: 28 }}>繝・・繝槭き繝ｩ繝ｼ</h2>
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
              <h2 style={{ marginTop: 28 }}>隕狗ｩ阪さ繝斐・蠖｢蠑・/h2>
              <div className="settingsOptions">
                <button type="button" className={`settingsOption${estimateCopyFormat === 'split' ? ' active' : ''}`} onClick={() => changeEstimateCopyFormat('split')}>鬆・岼繧貞・縺代ｋ</button>
                <button type="button" className={`settingsOption${estimateCopyFormat === 'merged' ? ' active' : ''}`} onClick={() => changeEstimateCopyFormat('merged')}>鬆・岼繧偵∪縺ｨ繧√ｋ</button>
              </div>
              <p className="copyFormatPreview">
                {estimateCopyFormat === 'split' ? '遉ｾ蜩｡逕ｨ・壼ｱ・俣・懷庶邏搾ｽ懷｣・ｽ懊け繝ｭ繧ｹ雋ｼ譖ｿ・・.6・懊治' : '閾ｪ蛻・畑・壼ｱ・俣 蜿守ｴ・螢・繧ｯ繝ｭ繧ｹ雋ｼ譖ｿ・・.6・懊治'}
              </p>
              <h2 style={{ marginTop: 28 }}>驕翫・險ｭ螳・/h2>
              <div className="settingsOptions">
                <button type="button" className={`settingsOption${playSettings.effects ? ' active' : ''}`} onClick={() => savePlaySettings({ ...playSettings, effects: !playSettings.effects })}>逋ｻ骭ｲ繧ｨ繝輔ぉ繧ｯ繝・{playSettings.effects ? 'ON' : 'OFF'}</button>
                <button type="button" className={`settingsOption${playSettings.splash ? ' active' : ''}`} onClick={() => savePlaySettings({ ...playSettings, splash: !playSettings.splash })}>襍ｷ蜍慕判髱｢ {playSettings.splash ? 'ON' : 'OFF'}</button>
              </div>
              <div className="settingsMenu" aria-label="隧ｳ邏ｰ險ｭ螳・>
                <button className="settingsMenuButton" type="button" onClick={() => setSettingsPage('additional')}><span>肌 繧医￥菴ｿ縺・ｿｽ蜉菴懈･ｭ</span><span>窶ｺ</span></button>
                <button className="settingsMenuButton" type="button" onClick={() => setSettingsPage('memos')}><span>統 繧医￥菴ｿ縺・Γ繝｢</span><span>窶ｺ</span></button>
                <button className="settingsMenuButton" type="button" onClick={() => setSettingsPage('rooms')}><span>匠 譁ｰ隕冗黄莉ｶ縺ｮ蛻晄悄驛ｨ螻・/span><span>窶ｺ</span></button>
                <button className="settingsMenuButton" type="button" onClick={() => setSettingsPage('pricing')}><span>腸 蜊倅ｾ｡繝ｻ讎らｮ苓ｨｭ螳・/span><span>窶ｺ</span></button>
                <button className="settingsMenuButton" type="button" onClick={() => setSettingsPage('management')}><span>召 邂｡逅・ｼ夂､ｾ繝ｻ迚ｩ莉ｶ邂｡逅・/span><span>窶ｺ</span></button>
              </div>
              </>)}
              {settingsPage === 'additional' && (<>
              <GlobalListEditor
                title="肌 繧医￥菴ｿ縺・ｿｽ蜉菴懈･ｭ"
                description="譛邨ら｢ｺ隱咲判髱｢縺ｫ陦ｨ遉ｺ縺吶ｋ霑ｽ蜉菴懈･ｭ繧堤ｷｨ髮・＠縺ｾ縺吶ょ､画峩縺ｯ蜈ｨ譯井ｻｶ縺ｧ菴ｿ逕ｨ縺輔ｌ縺ｾ縺吶・
                items={commonAdditionalWorks}
                storageKey={commonAdditionalWorksKey}
                setter={setCommonAdditionalWorks}
                fallback={defaultCommonAdditionalWorks}
              />
              </>)}
              {settingsPage === 'memos' && (<>
              <GlobalListEditor
                title="統 繧医￥菴ｿ縺・Γ繝｢"
                description="繧ｯ繝ｭ繧ｹ謗｡蟇ｸ逕ｻ髱｢縺ｫ陦ｨ遉ｺ縺吶ｋ繝｡繝｢蛟呵｣懊ｒ邱ｨ髮・＠縺ｾ縺吶・
                items={configuredQuickMemos}
                storageKey={quickMemosKey}
                setter={setConfiguredQuickMemos}
                fallback={quickMemos}
              />
              </>)}
              {settingsPage === 'rooms' && (<>
              <GlobalListEditor
                title="匠 譁ｰ隕冗黄莉ｶ縺ｮ蛻晄悄驛ｨ螻・
                description="縺薙ｌ縺九ｉ譁ｰ縺励￥髢句ｧ九☆繧狗黄莉ｶ縺ｫ陦ｨ遉ｺ縺吶ｋ驛ｨ螻九ｒ邱ｨ髮・＠縺ｾ縺吶よ里蟄倥・菫晏ｭ倡黄莉ｶ縺ｯ螟画峩縺励∪縺帙ｓ縲・
                items={configuredDefaultRooms}
                storageKey={defaultRoomsKey}
                setter={setConfiguredDefaultRooms}
                fallback={defaultRooms}
              />
              </>)}
              {settingsPage === 'pricing' && (<>
              <h2>蜊倅ｾ｡繝ｻ讎らｮ苓ｨｭ螳・/h2>
              <div className="estimateSettings">
                <p className="estimateIntro">縺薙％縺ｧ險ｭ螳壹＠縺溷腰萓｡縺ｨ謠帷ｮ礼紫繧偵∵眠縺励＞譯井ｻｶ縺ｮ讎らｮ鈴≡鬘阪↓菴ｿ逕ｨ縺励∪縺吶・/p>
                <div className="estimateSettingsGrid">
                  {measurementTypes.map(type => (
                    <label key={type}>
                      <span>繧ｯ繝ｭ繧ｹ {type}・亥・・上治・・/span>
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
                    <span>CF・亥・・上治繝ｻ讎らｮ玲焚驥上・螳滓ｸｬmﾃ・.8・・/span>
                    <input type="number" min="0" step="1" value={pricingSettings.cfRate} onChange={event => updatePricingSetting('cfRate', event.target.value)} />
                  </label>
                  <label>
                    <span>繧ｽ繝輔ヨ蟾ｾ譛ｨ・亥・・乗椢・・/span>
                    <input type="number" min="0" step="1" value={pricingSettings.softRate} onChange={event => updatePricingSetting('softRate', event.target.value)} />
                  </label>
                  <label>
                    <span>蠎願ｦ句・繧奇ｼ亥・・乗悽・・/span>
                    <input type="number" min="0" step="1" value={pricingSettings.floorTrimRate} onChange={event => updatePricingSetting('floorTrimRate', event.target.value)} />
                  </label>
                  <label>
                    <span>繧ｯ繝ｭ繧ｹ蝓ｺ譛ｬ謠帷ｮ礼紫</span>
                    <input type="number" min="0" step="0.01" value={pricingSettings.crossFactor} onChange={event => updatePricingSetting('crossFactor', event.target.value)} />
                  </label>
                </div>
              </div>

              </>)}
              {settingsPage === 'management' && (<>
              <h2>邂｡逅・ｼ夂､ｾ繝ｻ迚ｩ莉ｶ邂｡逅・/h2>
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
                  <span>{editingCompanyId ? '邂｡逅・ｼ夂､ｾ蜷阪ｒ邱ｨ髮・ : '譁ｰ縺励＞邂｡逅・ｼ夂､ｾ'}</span>
                  <input
                    value={masterCompanyName}
                    onChange={event => setMasterCompanyName(event.target.value)}
                    placeholder="邂｡逅・ｼ夂､ｾ蜷・
                    required
                  />
                </label>
                <div className="masterActions">
                  <button
                    className="primary"
                    type="submit"
                    onClick={() => setManagementScrollTarget('companyForm')}
                  >
                    {editingCompanyId ? '邂｡逅・ｼ夂､ｾ蜷阪ｒ菫晏ｭ・ : '邂｡逅・ｼ夂､ｾ繧定ｿｽ蜉'}
                  </button>
                  {editingCompanyId && (
                    <button className="secondaryButton" type="button" onClick={() => {
                      setEditingCompanyId('')
                      setMasterCompanyName('')
                    }}>
                      邱ｨ髮・ｒ繧ｭ繝｣繝ｳ繧ｻ繝ｫ
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
                        迚ｩ莉ｶ荳隕ｧ
                      </button>
                      <button type="button" className="secondaryButton" onClick={() => startEditingCompany(masterCompany)}>
                        邱ｨ髮・
                      </button>
                      <button type="button" className="dangerButton" onClick={() => deleteMasterCompany(masterCompany)}>
                        蜑企勁
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {masterPropertyCompanyId && (
                <section className="masterPropertySection" ref={propertyListRef}>
                  <h3>
                    {mergedPropertyMaster.companies.find(item => item.id === masterPropertyCompanyId)?.name || ''}
                    縺ｮ迚ｩ莉ｶ
                  </h3>
                  <button className="secondaryButton" type="button" onClick={() => startAddingProperty()}>
                    ・・譁ｰ隕冗黄莉ｶ霑ｽ蜉
                  </button>
                  <div className="masterPropertyList">
                    {mergedPropertyMaster.properties
                      .filter(property => property.companyId === masterPropertyCompanyId)
                      .map(property => (
                        <article className="masterPropertyItem" key={property.id}>
                          <strong>{property.name}</strong>
                          <span>{property.address || '菴乗園譛ｪ逋ｻ骭ｲ'}</span>
                          <span>隱ｭ縺ｿ譁ｹ・嘴property.reading || '譛ｪ逋ｻ骭ｲ'}</span>
                          <span>
                            蛻･蜷搾ｼ嘴(Array.isArray(property.aliases)
                              ? property.aliases
                              : property.aliases ? [property.aliases] : property.alias ? [property.alias] : []
                            ).join('縲・) || '譛ｪ逋ｻ骭ｲ'}
                          </span>
                          <div className="masterActions">
                            <button className="secondaryButton" type="button" onClick={() => startEditingProperty(property)}>
                              邱ｨ髮・
                            </button>
                            <button className="dangerButton" type="button" onClick={() => deleteMasterProperty(property)}>
                              蜑企勁
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
                      <h3>{editingPropertyId ? '迚ｩ莉ｶ繧堤ｷｨ髮・ : '迚ｩ莉ｶ繧定ｿｽ蜉'}</h3>
                      <label>
                        <span>邂｡逅・ｼ夂､ｾ</span>
                        <select
                          value={masterPropertyCompanyId}
                          onChange={event => {
                            setMasterPropertyCompanyId(event.target.value)
                            setEditingPropertyId('')
                          }}
                          required
                        >
                          <option value="">邂｡逅・ｼ夂､ｾ繧帝∈謚・/option>
                          {mergedPropertyMaster.companies.map(item => (
                            <option value={item.id} key={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>迚ｩ莉ｶ蜷・/span>
                        <input
                          value={propertyForm.name}
                          onChange={event => setPropertyForm(prev => ({ ...prev, name: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        <span>菴乗園</span>
                        <input
                          value={propertyForm.address}
                          onChange={event => setPropertyForm(prev => ({ ...prev, address: event.target.value }))}
                        />
                      </label>
                      <label>
                        <span>讀懃ｴ｢逕ｨ縺ｮ隱ｭ縺ｿ譁ｹ</span>
                        <input
                          value={propertyForm.reading}
                          onChange={event => setPropertyForm(prev => ({ ...prev, reading: event.target.value }))}
                          placeholder="萓具ｼ壹＠繧・＠繧・
                        />
                      </label>
                      <label>
                        <span>讀懃ｴ｢逕ｨ縺ｮ蛻･蜷搾ｼ医き繝ｳ繝槫玄蛻・ｊ・・/span>
                        <input
                          value={propertyForm.aliases}
                          onChange={event => setPropertyForm(prev => ({ ...prev, aliases: event.target.value }))}
                          placeholder="萓具ｼ咾HOUCHOU, chou"
                        />
                      </label>
                      <div className="masterActions">
                        <button className="primary" type="submit">
                          {editingPropertyId ? '迚ｩ莉ｶ繧剃ｿ晏ｭ・ : '迚ｩ莉ｶ繧定ｿｽ蜉'}
                        </button>
                        <button className="secondaryButton" type="button" onClick={() => {
                          setEditingPropertyId('')
                          setShowPropertyForm(false)
                          setPropertyForm({ name: '', address: '', reading: '', aliases: '' })
                        }}>繧ｭ繝｣繝ｳ繧ｻ繝ｫ</button>
                      </div>
                    </form>
                  )}
                </section>
              )}
              </>)}
            </section>
          </main>
        ) : showSavedList && !started ? (
          <main className="main">
            <button className="back" type="button" onClick={() => setShowSavedList(false)}>竊・迚ｩ莉ｶ諠・ｱ縺ｸ謌ｻ繧・/button>
            <p className="eyebrow">菫晏ｭ倥＠縺滓治蟇ｸ繝・・繧ｿ</p>
            <h1>{showArchived ? '繧｢繝ｼ繧ｫ繧､繝紋ｸ隕ｧ' : '菫晏ｭ俶ｸ医∩荳隕ｧ'}</h1>

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
                  菫晏ｭ俶ｸ医∩
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
                  繧｢繝ｼ繧ｫ繧､繝・
                </button>
              </div>

              <input ref={importFileInputRef} type="file" accept=".mcross,.json,.txt,application/json,text/plain" onChange={importMCrossData} style={{ display: 'none' }} />
              <button className="secondaryButton" type="button" onClick={() => importFileInputRef.current?.click()} style={{ marginTop: 0, marginBottom: 18 }}>
                踏 M-Cross繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ繧
              </button>
              <div className="savedToolbar">
                <label>
                  <span>博 縺九＠縺薙＞讀懃ｴ｢</span>
                  <input type="search" value={savedSearch} onChange={event => setSavedSearch(event.target.value)} placeholder="迚ｩ莉ｶ蜷阪・菴乗園繝ｻ蜿ｷ螳､繝ｻ驛ｨ螻九・蟾･莠九・繝｡繝｢繧呈､懃ｴ｢" />
                </label>
                <div className="savedToolbarGrid">
                  <label>
                    <span>邂｡逅・ｼ夂､ｾ</span>
                    <select value={savedCompanyFilter} onChange={event => setSavedCompanyFilter(event.target.value)}>
                      <option value="">縺吶∋縺ｦ</option>
                      {savedCompanyOptions.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>荳ｦ縺ｳ鬆・/span>
                    <select value={savedSortOrder} onChange={event => setSavedSortOrder(event.target.value)}>
                      <option value="newest">譛霑第峩譁ｰ縺励◆鬆・/option>
                      <option value="oldest">蜿､縺・・/option>
                      <option value="property">迚ｩ莉ｶ蜷埼・/option>
                    </select>
                  </label>
                </div>
                <div className="savedListSummary">
                  <span>{showArchived ? '繧｢繝ｼ繧ｫ繧､繝・ : '菫晏ｭ俶ｸ医∩'} {savedCount}莉ｶ</span>
                  <span>陦ｨ遉ｺ {visibleSavedEntries.length}莉ｶ</span>
                </div>
              </div>

              <div className="savedViewSwitch" aria-label="菫晏ｭ俶ｸ医∩陦ｨ遉ｺ蠖｢蠑・>
                <button type="button" className={savedViewMode === 'list' ? 'active' : ''} onClick={() => setSavedViewMode('list')}>笘ｰ 荳隕ｧ陦ｨ遉ｺ</button>
                <button type="button" className={savedViewMode === 'explorer' ? 'active' : ''} onClick={() => { setSavedViewMode('explorer'); setSavedFolderPath([]) }}>刀 繝輔か繝ｫ繝陦ｨ遉ｺ</button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '0 0 18px' }}>
                <button className="actionButton actionOverwrite" type="button" onClick={toggleSelectAllVisible}>
                  {visibleSavedEntries.length > 0 && visibleSavedEntries.every(entry => selectedSavedKeys.includes(entry.storageKey)) ? '驕ｸ謚櫁ｧ｣髯､' : '陦ｨ遉ｺ荳ｭ繧貞・驕ｸ謚・}
                </button>
                <button className="actionButton actionCsv" type="button" onClick={bulkArchiveSelected} disabled={selectedSavedKeys.length === 0}>
                  {showArchived ? '驕ｸ謚槭ｒ荳隕ｧ縺ｸ謌ｻ縺・ : '驕ｸ謚槭ｒ繧｢繝ｼ繧ｫ繧､繝・}
                </button>
                <button className="actionButton actionDelete" type="button" onClick={bulkDeleteSelected} disabled={selectedSavedKeys.length === 0}>
                  驕ｸ謚槭ｒ蜑企勁・・selectedSavedKeys.length}・・
                </button>
              </div>

              {/* M-CROSS_SAVED_EXPLORER_V6_MINIMAL_SAFE */}
              {savedViewMode === 'explorer' && visibleSavedEntries.length > 0 && (() => {
                const nodes = visibleSavedEntries.map(entry => {
                  const date = new Date(entry.updatedAt || entry.createdAt || 0)
                  const validDate = !Number.isNaN(date.getTime())
                  return {
                    entry,
                    levels: [
                      validDate ? date.getFullYear() + '蟷ｴ' : '譌･莉倅ｸ肴・',
                      validDate ? (date.getMonth() + 1) + '譛・ : '譛井ｸ肴・',
                      entry.company || '邂｡逅・ｼ夂､ｾ譛ｪ險ｭ螳・,
                      entry.propertyName || '迚ｩ莉ｶ蜷阪↑縺・,
                    ],
                  }
                })
                const depth = savedFolderPath.length
                const matching = nodes.filter(node => savedFolderPath.every((value, index) => node.levels[index] === value))
                const isPropertyFolder = depth >= 4
                const folders = isPropertyFolder
                  ? []
                  : [...new Set(matching.map(node => node.levels[depth]))]
                    .sort((a, b) => String(a).localeCompare(String(b), 'ja', { numeric: true }))

                return (
                  <div className="savedExplorer">
                    <div className="savedExplorerCrumbs">
                      <button type="button" onClick={() => setSavedFolderPath([])}>唐 菫晏ｭ俶ｸ医∩</button>
                      {savedFolderPath.map((part, index) => (
                        <button type="button" key={index} onClick={() => setSavedFolderPath(savedFolderPath.slice(0, index + 1))}>窶ｺ {part}</button>
                      ))}
                    </div>
                    {savedFolderPath.length > 0 && (
                      <button className="savedExplorerBack" type="button" onClick={() => setSavedFolderPath(path => path.slice(0, -1))}>竊・縺ｲ縺ｨ縺､荳翫∈</button>
                    )}
                    {!isPropertyFolder ? (
                      <div className="savedExplorerGrid">
                        {folders.map(folder => {
                          const count = matching.filter(node => node.levels[depth] === folder).length
                          const icon = depth < 2 ? '刀' : depth === 2 ? '翌・・ : '召'
                          return (
                            <button className="savedExplorerFolder" type="button" key={folder} onClick={() => setSavedFolderPath(path => [...path, folder])}>
                              <span className="savedExplorerIcon">{icon}</span>
                              <strong>{folder}</strong>
                              <small>{count}莉ｶ</small>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="savedExplorerFiles">
                        {matching.flatMap(({ entry }, index) => {
                          const baseName = (entry.propertyName || '迚ｩ莉ｶ蜷阪↑縺・) + (entry.unit ? entry.unit + '蜿ｷ螳､' : '') + (entry.workName ? entry.workName : '')
                          let versions = []
                          try {
                            const entryWorkName = String(entry.workName || '').trim() || '蜴溽憾蝗槫ｾｩ蟾･莠・
                            const key = 'mcross:estimate-versions:' + [entry.company || '', entry.propertyName || '', String(entry.unit || '').trim(), entryWorkName].join('|')
                            const legacyKey = 'mcross:estimate-versions:' + [entry.company || '', entry.propertyName || '', String(entry.unit || '').trim()].join('|')
                            const currentStored = localStorage.getItem(key)
                            const legacyStored = entryWorkName === '蜴溽憾蝗槫ｾｩ蟾･莠・ ? localStorage.getItem(legacyKey) : null
                            const stored = JSON.parse(currentStored || legacyStored || '[]')
                            versions = Array.isArray(stored) ? stored : []
                          } catch {}
                          const items = [
                            <button className="savedExplorerFile" type="button" key={(entry.storageKey || index) + '-current'} onClick={() => {
                                const currentVersion = versions.length
                                  ? Math.max(...versions.map(item => Number(item.version) || 0)) + 1
                                  : 1
                                setOpenedEstimateRows(null)
                                setOpenedEstimateVersion(currentVersion)
                                openSavedEntry(entry)
                              }} /* M-CROSS_CURRENT_REVISION_BUTTON_V6_SAFE */>
                              <span>塘</span>
                              <div><strong>{baseName}{versions.length ? estimateVersionMark(Math.max(...versions.map(item => Number(item.version) || 0)) + 1) : ''}</strong><small>{versions.length ? '迴ｾ蝨ｨ邱ｨ髮・ｸｭ縺ｮ隕狗ｩ・ : '譛蛻昴・隕狗ｩ・} ・・譖ｴ譁ｰ {formatSavedDate(entry.updatedAt)}</small></div>
                            </button>,
                          ]
                          versions.sort((a,b) => Number(a.version)-Number(b.version)).forEach(version => {
                            items.push(
                              <button className="savedExplorerFile estimateVersionExplorerFile" type="button" key={(entry.storageKey || index) + '-estimate-' + version.version} onClick={() => openSavedEstimateVersion(entry, version)}>
                                <span>淘</span>
                                <div><strong>{baseName}{estimateVersionMark(version.version)}</strong><small>{Number(version.version) === 1 ? '譛蛻昴・隕狗ｩ・ : '菫ｮ豁｣迚・} ・・ﾂ･{Math.round(Number(version.totalAmount || 0)).toLocaleString('ja-JP')}</small></div>
                              </button>
                            )
                          })
                          return items
                        })}
                      </div>
                    )}
                  </div>
                )
              })()}

              {visibleSavedEntries.length === 0 ? (
                <p className="empty">
                  {showArchived ? '繧｢繝ｼ繧ｫ繧､繝悶＆繧後◆繝・・繧ｿ縺ｯ縺ゅｊ縺ｾ縺帙ｓ' : '菫晏ｭ俶ｸ医∩繝・・繧ｿ縺ｯ縺ゅｊ縺ｾ縺帙ｓ'}
                </p>
              ) : (
                <div className="savedList" style={{ display: savedViewMode === 'list' ? undefined : 'none' }}>
                  {visibleSavedEntries.map((entry, index) => (
                    <article
                      className="savedItem"
                      key={entry.storageKey || `${entry.propertyName}-${entry.unit}-${index}`}
                    >
                      <div className="savedCardTop">
                        <input type="checkbox" checked={selectedSavedKeys.includes(entry.storageKey)} onChange={() => toggleSavedSelection(entry.storageKey)} aria-label={`${entry.propertyName || '迚ｩ莉ｶ蜷阪↑縺・}繧帝∈謚杼} />
                        <div className="savedCardTitle">
                          <div className="savedProperty">{entry.propertyName || '迚ｩ莉ｶ蜷阪↑縺・}</div>
                          <div className="savedUnit">{entry.unit || ''}蜿ｷ螳､</div>
                          <div className="savedMeta">{entry.company || '邂｡逅・ｼ夂､ｾ譛ｪ險ｭ螳・}</div>
                        </div>
                        <span className="savedCardDate">譖ｴ譁ｰ {formatSavedDate(entry.updatedAt)}</span>
                      </div>
                      {buildAutoTags(entry).length > 0 && (
                        <div className="autoTagList" aria-label="閾ｪ蜍輔ち繧ｰ">
                          {buildAutoTags(entry).map(tag => <span className="autoTag" key={tag}>#{tag}</span>)}
                        </div>
                      )}
                      <div className="savedPrimaryActions">
                        <button className="actionButton actionOpen" type="button" onClick={() => openSavedEntry(entry)}>髢九￥</button>
                        <button className="actionButton actionCsv" type="button" onClick={() => downloadExcel(entry)}>Excel蜃ｺ蜉・/button>
                      </div>
                      <button className="savedMoreButton" type="button" onClick={() => toggleSavedMore(entry.storageKey)}>
                        {expandedSavedKeys.includes(entry.storageKey) ? '笆ｲ 謫堺ｽ懊ｒ髢峨§繧・ : '笆ｼ 縺昴・莉悶・謫堺ｽ・}
                      </button>
                      {expandedSavedKeys.includes(entry.storageKey) && (
                        <div className="savedMoreActions">
                          <button className="actionButton actionOverwrite" type="button" onClick={() => overwriteSavedEntry(entry)}>荳頑嶌縺堺ｿ晏ｭ・/button>
                          <button className="actionButton actionOverwrite" type="button" onClick={() => shareMCrossData(entry)}>豆 M-Cross繝輔ぃ繧､繝ｫ繧帝√ｋ</button>
                          <button className="actionButton actionOverwrite" type="button" onClick={() => setEntryArchived(entry, !showArchived)}>{showArchived ? '荳隕ｧ縺ｫ謌ｻ縺・ : '繧｢繝ｼ繧ｫ繧､繝・}</button>
                          <button className="actionButton actionDelete" type="button" onClick={() => deleteSavedEntry(entry)}>蜑企勁</button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </main>
        ) : !started ? (
          <main className="main">
            {showWorkOrders ? (
              <section className="workOrdersHome">
                <div className="workOrdersTopbar"><button className="back" type="button" onClick={() => setShowWorkOrders(false)}>竊・謌ｻ繧・/button><div><p className="eyebrow">M-Cross WORK</p><h1>蟾･莠区｡井ｻｶ</h1></div></div>
                <div className="workOrderStats">
                  <div><span>蜈ｨ譯井ｻｶ</span><strong>{workOrders.length}</strong></div>
                  <div><span>譛ｪ隲区ｱ・/span><strong>{workOrders.filter(item => item.billingStatus !== '隲区ｱよｸ・).length}</strong></div>
                  <div><span>螳御ｺ・/span><strong>{workOrders.filter(item => item.completedDate).length}</strong></div>
                </div>
                {workOrders.length === 0 ? <div className="card workOrdersEmpty"><strong>蟾･莠区｡井ｻｶ縺ｯ縺ｾ縺縺ゅｊ縺ｾ縺帙ｓ</strong><span>谺｡縺ｮSTEP縺ｧ謗｡蟇ｸ譯井ｻｶ繝ｻ蜈･螻・ｸｭ譯井ｻｶ縺九ｉ蟾･莠区｡井ｻｶ縺ｸ騾ｲ繧√ｋ讖溯・繧定ｿｽ蜉縺励∪縺吶・/span></div> : <div className="workOrdersList">{workOrders.map(item => <article className="card workOrderCard" key={item.id} role="button" tabIndex={0} onClick={() => setSelectedWorkOrderId(item.id)} onKeyDown={event => { if (event.key === 'Enter') setSelectedWorkOrderId(item.id) }}><strong>{item.propertyName || '迚ｩ莉ｶ蜷肴悴險ｭ螳・} {item.unit ? item.unit + '蜿ｷ螳､' : ''}</strong><p>{item.workDetails || '蟾･莠句・螳ｹ譛ｪ蜈･蜉・}</p><div className="summaryLine"><span>隕狗ｩ・/span><strong>ﾂ･{item.estimateAmount.toLocaleString()}</strong></div><div className="summaryLine"><span>蜴滉ｾ｡</span><strong>ﾂ･{item.costTotal.toLocaleString()}</strong></div><div className="summaryLine"><span>蛻ｩ逶・/span><strong>ﾂ･{item.profit.toLocaleString()} / {item.profitRate}%</strong></div><small>{item.orderStatus} / {item.billingStatus}</small></article>)}</div>}
                {selectedWorkOrderId && (() => {
                  const item = workOrders.find(workItem => workItem.id === selectedWorkOrderId)
                  if (!item) return null
                  return <section className="workOrderDetailPage">
                    <div className="card workOrderDetail">
                      <div className="workOrderDetailTop">
                        <button className="back" type="button" onClick={() => setSelectedWorkOrderId('')}>竊・蟾･莠区｡井ｻｶ荳隕ｧ縺ｸ</button>
                        <div><p className="eyebrow">M-Cross WORK</p><h1>{item.propertyName || '迚ｩ莉ｶ蜷肴悴險ｭ螳・} {item.unit ? item.unit + '蜿ｷ螳､' : ''}</h1></div>
                      </div>

                      <section className="workOrderSection"><h2>蝓ｺ譛ｬ諠・ｱ</h2><div className="workOrderFormGrid">
                        <label><span>邂｡逅・ｼ夂､ｾ</span><input value={item.company || ''} onChange={e => updateWorkOrder(item.id,{company:e.target.value})}/></label>
                        <label><span>迚ｩ莉ｶ蜷・/span><input value={item.propertyName || ''} onChange={e => updateWorkOrder(item.id,{propertyName:e.target.value})}/></label>
                        <label><span>蜿ｷ螳､</span><input value={item.unit || ''} onChange={e => updateWorkOrder(item.id,{unit:e.target.value})}/></label>
                        <label className="wide"><span>菴乗園</span><input value={item.address || ''} onChange={e => updateWorkOrder(item.id,{address:e.target.value})}/></label>
                        <label className="wide"><span>蟾･莠句・螳ｹ</span><textarea rows="3" value={item.workDetails || ''} onChange={e => updateWorkOrder(item.id,{workDetails:e.target.value})}/></label>
                      </div></section>

                      <section className="workOrderSection"><h2>隕狗ｩ・/h2>
                      {Array.isArray(item.estimateItems) && item.estimateItems.length > 0 && (
                        <div className="workOrderEstimateItems">
                          {item.estimateItems.map((estimateItem, estimateIndex) => (
                            <div className="workOrderEstimateItem" key={estimateItem.id || estimateIndex}>
                              <div><strong>{estimateItem.name || '蟾･莠矩・岼'}</strong>{estimateItem.specification && <small>{estimateItem.specification}</small>}</div>
                              <span>{Number(estimateItem.quantity || 0).toLocaleString()} {estimateItem.unit || ''}</span>
                              <span>ﾂ･{Number(estimateItem.unitPrice || 0).toLocaleString()}</span>
                              <strong>ﾂ･{Number(estimateItem.amount || 0).toLocaleString()}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="workOrderFormGrid">
                        <label><span>隕狗ｩ埼≡鬘・/span><input type="number" min="0" value={item.estimateAmount || 0} onChange={e => updateWorkOrder(item.id,{estimateAmount:Number(e.target.value)||0})}/></label>
                        <label><span>隕狗ｩ咲憾諷・/span><select value={item.estimateStatus || '譛ｪ菴懈・'} onChange={e => updateWorkOrder(item.id,{estimateStatus:e.target.value})}><option>譛ｪ菴懈・</option><option>菴懈・荳ｭ</option><option>謠仙・貂・/option><option>謇ｿ隱・/option></select></label>
                      </div><button className="secondaryButton" type="button" onClick={() => exportWorkOrderEstimate(item)}>投 隕狗ｩ肴嶌繧貞・蜉・/button></section>

                      <section className="workOrderSection"><h2>逋ｺ豕ｨ</h2><div className="workOrderFormGrid">
                        <label><span>逋ｺ豕ｨ迥ｶ諷・/span><select value={item.orderStatus || '譛ｪ逋ｺ豕ｨ'} onChange={e => updateWorkOrder(item.id,{orderStatus:e.target.value})}><option>譛ｪ逋ｺ豕ｨ</option><option>逋ｺ豕ｨ貅門ｙ</option><option>逋ｺ豕ｨ貂医∩</option><option>譁ｽ蟾･荳ｭ</option></select></label>
                        <label><span>逋ｺ豕ｨ蜈・/span><input value={item.contractor || ''} onChange={e => updateWorkOrder(item.id,{contractor:e.target.value})}/></label>
                      </div></section>

                      <section className="workOrderSection"><h2>蟾･遞・/h2><div className="workOrderFormGrid">
                        <label><span>逹蟾･莠亥ｮ・/span><input type="date" value={item.startDate || ''} onChange={e => updateWorkOrder(item.id,{startDate:e.target.value})}/></label>
                        <label><span>螳御ｺ・ｺ亥ｮ・/span><input type="date" value={item.completionDueDate || ''} onChange={e => updateWorkOrder(item.id,{completionDueDate:e.target.value})}/></label>
                        <label><span>螳御ｺ・律</span><input type="date" value={item.completedDate || ''} onChange={e => updateWorkOrder(item.id,{completedDate:e.target.value})}/></label>
                      </div></section>

                      <section className="workOrderSection"><h2>蜴滉ｾ｡繝ｻ蛻ｩ逶・/h2><div className="workOrderFormGrid">
                        <label><span>讌ｭ閠・髪謇・/span><input type="number" min="0" value={item.contractorCost || 0} onChange={e => updateWorkOrder(item.id,{contractorCost:Number(e.target.value)||0})}/></label>
                        <label><span>雉・攝雋ｻ</span><input type="number" min="0" value={item.materialCost || 0} onChange={e => updateWorkOrder(item.id,{materialCost:Number(e.target.value)||0})}/></label>
                        <label><span>縺昴・莉也ｵ瑚ｲｻ</span><input type="number" min="0" value={item.otherCost || 0} onChange={e => updateWorkOrder(item.id,{otherCost:Number(e.target.value)||0})}/></label>
                      </div><div className="workOrderMoneyGrid"><div><span>螢ｲ荳・/span><strong>ﾂ･{item.estimateAmount.toLocaleString()}</strong></div><div><span>蜴滉ｾ｡</span><strong>ﾂ･{item.costTotal.toLocaleString()}</strong></div><div><span>蛻ｩ逶・/span><strong>ﾂ･{item.profit.toLocaleString()}</strong></div><div><span>蛻ｩ逶顔紫</span><strong>{item.profitRate}%</strong></div></div></section>

                      <section className="workOrderSection"><h2>隲区ｱ・/h2><div className="workOrderFormGrid"><label><span>隲区ｱら憾諷・/span><select value={item.billingStatus || '譛ｪ隲区ｱ・} onChange={e => updateWorkOrder(item.id,{billingStatus:e.target.value})}><option>譛ｪ隲区ｱ・/option><option>隲区ｱよｺ門ｙ</option><option>隲区ｱよｸ・/option></select></label></div></section>
                    </div>
                  </section>
                })()}
              </section>
            ) : showResidentCases ? (
              <section className="residentCasesHome" aria-label="蜈･螻・ｸｭ譯井ｻｶ">
                {/* M-CROSS_RESIDENT_CASES_STEP3 */}
                <div className="residentCasesTopbar">
                  <button className="back" type="button" onClick={() => setShowResidentCases(false)}>竊・謌ｻ繧・/button>
                  <div className="residentImportActions">
                    <button className="primary residentNewCaseButton" type="button" onClick={() => { setResidentCaseFormError(''); setShowResidentCaseForm(true) }}>・・譁ｰ隕乗｡井ｻｶ</button>
                    <button className="secondaryButton residentImportButton" type="button" onClick={() => residentExcelInputRef.current?.click()}>踏 Excel縺九ｉ蜿悶ｊ霎ｼ繧</button>
                    <button className="secondaryButton residentQuickPasteButton" type="button" onClick={() => {
                      setResidentQuickPasteText(''); setResidentQuickPreview(null); setResidentQuickError(''); setShowResidentQuickPaste(true)
                    }}>搭 萓晞ｼ譁・°繧臥ｰ｡蜊伜・蜉・/button>
                    
                    <input ref={residentExcelInputRef} type="file" accept=".xlsx,.xlsm" hidden onChange={event => importResidentCasesExcel(event.target.files?.[0])} />
                  </div>
                </div>
                <p className="eyebrow">M-Cross WORK</p>
                <h1>蜈･螻・ｸｭ譯井ｻｶ</h1>
                <p className="subtitle">谺｡縺ｫ蟇ｾ蠢懊☆繧区｡井ｻｶ繧貞・縺ｫ遒ｺ隱阪〒縺阪ｋ荳隕ｧ縺ｧ縺吶・/p>
                {showResidentQuickPaste && (
                  <section className="card residentQuickPasteCard">
                    <div className="residentCaseFormTitle"><div><p className="eyebrow">QUICK INPUT</p><h2>萓晞ｼ譁・°繧臥ｰ｡蜊伜・蜉・/h2></div><button className="back" type="button" onClick={() => setShowResidentQuickPaste(false)}>髢峨§繧・/button></div>
                    <p className="subtitle">PDF繧・Γ繝ｼ繝ｫ縺ｮ蠢・ｦ√↑譁・ｫ繧偵さ繝斐・縺励※雋ｼ繧贋ｻ倥￠縲√Ο繝ｼ繧ｫ繝ｫAI縺ｧ謨ｴ逅・＠縺ｾ縺吶・/p>
                    <textarea rows="11" value={residentQuickPasteText} onChange={e => { setResidentQuickPasteText(e.target.value); setResidentQuickPreview(null); setResidentQuickError('') }} placeholder="萓晞ｼ譁・ｒ雋ｼ繧贋ｻ倥￠" />
                    <button className="secondaryButton" type="button" onClick={() => {
                      const parsed = parseResidentRequestText(residentQuickPasteText, mergedPropertyMaster)
                      setResidentQuickPreview(parsed)
                      setResidentQuickCompanyId(mergedPropertyMaster.companies.find(companyItem => companyItem.name === parsed.company)?.id || '')
                      setResidentQuickError(!parsed.propertyName || !parsed.requestDetails ? '隱ｭ縺ｿ蜿悶ｌ縺ｪ縺・・岼縺後≠繧翫∪縺吶ら｢ｺ隱阪＠縺ｦ菫ｮ豁｣縺励※縺上□縺輔＞縲・ : '')
                    }}>蜀・ｮｹ繧定ｪｭ縺ｿ蜿悶ｋ</button>
                    <button className="primary residentAiReadButton" type="button" disabled={residentAiLoading || !residentQuickPasteText.trim()} onClick={analyzeResidentRequestWithOllama}>
                      {residentAiLoading ? '､・AI隗｣譫蝉ｸｭ窶ｦ' : '､・繝ｭ繝ｼ繧ｫ繝ｫAI縺ｧ隱ｭ縺ｿ蜿悶ｋ'}
                    </button>
                    {residentAiStatus && <p className="residentAiStatus" role="status">{residentAiStatus}</p>}
                    {residentQuickError && <p className="saveStatus">{residentQuickError}</p>}
                    {residentQuickPreview && <div className="residentQuickPreview">
                      <div className="residentSourceCompare">
                        {!residentPdfSourceText && residentQuickPasteText && <details open className="residentSourceBox"><summary>雋ｼ繧贋ｻ倥￠縺溷・譁・ｫ</summary><pre>{residentQuickPasteText}</pre></details>}
                      </div>
                      <h3>逋ｻ骭ｲ蜑阪・遒ｺ隱・/h3>
                      <div className="residentCaseFormGrid">
                        <label><span>邂｡逅・ｼ夂､ｾ</span><select value={residentQuickCompanyId || mergedPropertyMaster.companies.find(companyItem => companyItem.name === residentQuickPreview.company)?.id || ''} onChange={e => {
                          const companyId = e.target.value
                          const selectedCompany = mergedPropertyMaster.companies.find(companyItem => companyItem.id === companyId)
                          setResidentQuickCompanyId(companyId)
                          setResidentQuickPreview(v => ({ ...v, company: selectedCompany?.name || '', propertyName: '', address: '' }))
                        }}><option value="">邂｡逅・ｼ夂､ｾ繧帝∈謚・/option>{mergedPropertyMaster.companies.map(companyItem => <option key={companyItem.id} value={companyItem.id}>{companyItem.name}</option>)}</select></label>
                        <label><span>迚ｩ莉ｶ蜷・*</span><select value={residentQuickPreview.propertyName || ''} onChange={e => {
                          const propertyName = e.target.value
                          const selectedCompanyId = residentQuickCompanyId || mergedPropertyMaster.companies.find(companyItem => companyItem.name === residentQuickPreview.company)?.id || ''
                          const selectedProperty = mergedPropertyMaster.properties.find(propertyItem => propertyItem.companyId === selectedCompanyId && propertyItem.name === propertyName)
                          setResidentQuickPreview(v => ({ ...v, propertyName, address: selectedProperty?.address || v.address || '' }))
                        }}><option value="">迚ｩ莉ｶ繧帝∈謚・/option>{mergedPropertyMaster.properties.filter(propertyItem => {
                          const selectedCompanyId = residentQuickCompanyId || mergedPropertyMaster.companies.find(companyItem => companyItem.name === residentQuickPreview.company)?.id || ''
                          return !selectedCompanyId || propertyItem.companyId === selectedCompanyId
                        }).map(propertyItem => <option key={propertyItem.id} value={propertyItem.name}>{propertyItem.name}</option>)}</select></label>
                        <label><span>蜿ｷ螳､</span><input value={residentQuickPreview.unit || ''} onChange={e => setResidentQuickPreview(v => ({...v, unit:e.target.value}))} /></label>
                        <label><span>騾｣邨｡蜈・/span><input value={residentQuickPreview.residentContact || ''} onChange={e => setResidentQuickPreview(v => ({...v, residentContact:e.target.value}))} /></label>
                        <label className="wide"><span>菴乗園</span><input value={residentQuickPreview.address || ''} onChange={e => setResidentQuickPreview(v => ({...v, address:e.target.value}))} /></label>
                        <label className="wide"><span>萓晞ｼ蜀・ｮｹ *</span><textarea rows="4" value={residentQuickPreview.requestDetails || ''} onChange={e => setResidentQuickPreview(v => ({...v, requestDetails:e.target.value}))} /></label>
                        <label className="wide"><span>蛯呵・/span><textarea rows="3" value={residentQuickPreview.note || ''} onChange={e => setResidentQuickPreview(v => ({...v, note:e.target.value}))} /></label>
                        <label><span>谺｡縺ｫ繧・ｋ縺薙→</span><input value={residentQuickPreview.nextAction || ''} onChange={e => setResidentQuickPreview(v => ({...v, nextAction:e.target.value}))} /></label>
                        <label className="wide"><span>豕ｨ諢丈ｺ矩・/span><textarea rows="2" value={residentQuickPreview.caution || ''} onChange={e => setResidentQuickPreview(v => ({...v, caution:e.target.value}))} /></label>
                      </div>
                      <button className="primary" type="button" onClick={() => {
                        const propertyName = String(residentQuickPreview.propertyName || '').trim()
                        const requestDetails = String(residentQuickPreview.requestDetails || '').trim()
                        if (!propertyName || !requestDetails) { setResidentQuickError('迚ｩ莉ｶ蜷阪→萓晞ｼ蜀・ｮｹ繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲・); return }
                        const duplicate = findResidentDuplicate(residentCases, { ...residentQuickPreview, propertyName, requestDetails })
                        if (duplicate) {
                          const existing = duplicate.item
                          const similarText = duplicate.score >= 0.35 ? '\n萓晞ｼ蜀・ｮｹ繧ゆｼｼ縺ｦ縺・∪縺吶・ : '\n蜷後§驛ｨ螻九・譛ｪ螳御ｺ・｡井ｻｶ縺後≠繧翫∪縺吶・
                          const proceed = window.confirm(
                            '笞 驥崎､・・蜿ｯ閭ｽ諤ｧ縺後≠繧翫∪縺兔n\n'
                            + (existing.propertyName || '') + ' ' + (existing.unit || '') + '蜿ｷ螳､\n'
                            + '騾ｲ謐暦ｼ・ + (existing.status || '譛ｪ險ｭ螳・) + '\n'
                            + '萓晞ｼ・・ + (existing.requestDetails || '譛ｪ蜈･蜉・)
                            + similarText
                            + '\n\n縺昴ｌ縺ｧ繧よ眠隕冗匳骭ｲ縺励∪縺吶°・・
                          )
                          if (!proceed) { setSelectedResidentCaseId(existing.id); setShowResidentQuickPaste(false); return }
                        }
                        const now = new Date().toISOString()
                        const item = normalizeResidentCase({...residentQuickPreview, id:createResidentCaseId(), propertyName, requestDetails, history:[{id:createResidentCaseId(),at:now,status:'邁｡蜊伜・蜉・,memo:'萓晞ｼ譁・°繧臥匳骭ｲ'}], createdAt:now, updatedAt:now, lastActionAt:now})
                        setResidentCases(prev => [item, ...prev]); setResidentQuickPasteText(''); setResidentQuickPreview(null); setResidentQuickError(''); setShowResidentQuickPaste(false)
                      }}>縺薙・蜀・ｮｹ縺ｧ譯井ｻｶ逋ｻ骭ｲ</button>
                    </div>}
                  </section>
                )}

                {showResidentCaseForm && (
                  <section className="card residentCaseFormCard">
                    <div className="residentCaseFormTitle">
                      <div><p className="eyebrow">NEW CASE</p><h2>譁ｰ隕乗｡井ｻｶ</h2></div>
                      <button type="button" className="back" onClick={() => setShowResidentCaseForm(false)}>髢峨§繧・/button>
                    </div>
                    <form onSubmit={event => {
                      event.preventDefault()
                      const propertyName = residentCaseForm.propertyName.trim()
                      const unitValue = residentCaseForm.unit.trim()
                      const details = residentCaseForm.requestDetails.trim()
                      if (!propertyName || !unitValue || !details) {
                        setResidentCaseFormError('迚ｩ莉ｶ蜷阪・蜿ｷ螳､繝ｻ萓晞ｼ蜀・ｮｹ繧貞・蜉帙＠縺ｦ縺上□縺輔＞')
                        return
                      }
                      const candidateCase = { ...residentCaseForm, propertyName, unit: unitValue, requestDetails: details }
                      const duplicate = findResidentDuplicate(residentCases, candidateCase)
                      if (duplicate) {
                        const existing = duplicate.item
                        const similarText = duplicate.score >= 0.35 ? '\n萓晞ｼ蜀・ｮｹ繧ゆｼｼ縺ｦ縺・∪縺吶・ : '\n蜷後§驛ｨ螻九・譛ｪ螳御ｺ・｡井ｻｶ縺後≠繧翫∪縺吶・
                        const proceed = window.confirm(
                          '笞 驥崎､・・蜿ｯ閭ｽ諤ｧ縺後≠繧翫∪縺兔n\n'
                          + (existing.propertyName || '') + ' ' + (existing.unit || '') + '蜿ｷ螳､\n'
                          + '騾ｲ謐暦ｼ・ + (existing.status || '譛ｪ險ｭ螳・) + '\n'
                          + '萓晞ｼ・・ + (existing.requestDetails || '譛ｪ蜈･蜉・)
                          + similarText
                          + '\n\n縺昴ｌ縺ｧ繧よ眠隕冗匳骭ｲ縺励∪縺吶°・・
                        )
                        if (!proceed) { setSelectedResidentCaseId(existing.id); setShowResidentCaseForm(false); return }
                      }
                      const now = new Date().toISOString()
                      const nextCase = normalizeResidentCase({
                        ...residentCaseForm,
                        propertyName,
                        unit: unitValue,
                        requestDetails: details,
                        id: createResidentCaseId(),
                        history: [{ id: createResidentCaseId(), at: now, status: residentCaseForm.status || '譛ｪ騾｣邨｡', memo: '譯井ｻｶ逋ｻ骭ｲ' }],
                        createdAt: now,
                        updatedAt: now,
                      })
                      setResidentCases(previous => [nextCase, ...previous])
                      setResidentCaseForm({
                        requestDate: new Date().toLocaleDateString('sv-SE'),
                        company: '', propertyName: '', unit: '', address: '', residentContact: '',
                        requestDetails: '', note: '', status: '譛ｪ騾｣邨｡', nextAction: '蜈･螻・・∈騾｣邨｡',
                        actionDueDate: '', caution: '',
                      })
                      setResidentCaseCompanyId('')
                      setResidentCaseFormError('')
                      setShowResidentCaseForm(false)
                    }}>
                      <div className="residentCaseFormGrid">
                        <label><span>萓晞ｼ譌･</span><input type="date" value={residentCaseForm.requestDate} onChange={e => setResidentCaseForm(v => ({ ...v, requestDate: e.target.value }))} /></label>
                        <label><span>邂｡逅・ｼ夂､ｾ</span><select value={residentCaseCompanyId} onChange={e => {
                          const companyId = e.target.value
                          const selectedCompany = mergedPropertyMaster.companies.find(item => item.id === companyId)
                          setResidentCaseCompanyId(companyId)
                          setResidentCaseForm(v => ({
                            ...v,
                            company: selectedCompany?.name || '',
                            propertyName: '',
                            address: '',
                          }))
                        }}>
                          <option value="">邂｡逅・ｼ夂､ｾ繧帝∈謚・/option>
                          {mergedPropertyMaster.companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select></label>
                        <label className="wide"><span>迚ｩ莉ｶ蜷・*</span><select value={residentCaseForm.propertyName} disabled={!residentCaseCompanyId} onChange={e => {
                          const propertyName = e.target.value
                          const selectedProperty = residentCaseProperties.find(item => item.name === propertyName)
                          setResidentCaseForm(v => ({
                            ...v,
                            propertyName,
                            address: selectedProperty?.address || '',
                          }))
                        }}>
                          <option value="">{residentCaseCompanyId ? '迚ｩ莉ｶ繧帝∈謚・ : '蜈医↓邂｡逅・ｼ夂､ｾ繧帝∈謚・}</option>
                          {residentCaseProperties.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
                        </select></label>
                        <div className="residentMasterShortcut wide">
                          <span>邂｡逅・ｼ夂､ｾ繝ｻ迚ｩ莉ｶ縺瑚ｦ九▽縺九ｉ縺ｪ縺・ｴ蜷・/span>
                          <button type="button" className="secondaryButton" onClick={() => {
                            setShowResidentCaseForm(false)
                            setShowResidentCases(false)
                            setSettingsPage('management')
                            setSettingsOpen(true)
                          }}>邂｡逅・ｼ夂､ｾ繝ｻ迚ｩ莉ｶ邂｡逅・ｒ髢九￥</button>
                        </div>
                        <label><span>蜿ｷ螳､ *</span><input type="text" value={residentCaseForm.unit} onChange={e => setResidentCaseForm(v => ({ ...v, unit: e.target.value }))} placeholder="101" /></label>
                        <label><span>蜈･螻・・｣邨｡蜈・/span><input type="tel" inputMode="tel" value={residentCaseForm.residentContact} onChange={e => setResidentCaseForm(v => ({ ...v, residentContact: e.target.value }))} placeholder="髮ｻ隧ｱ逡ｪ蜿ｷ" /></label>
                        <label className="wide"><span>菴乗園・育黄莉ｶ繝槭せ繧ｿ繝ｼ縺九ｉ閾ｪ蜍募・蜉幢ｼ・/span><input type="text" readOnly value={residentCaseForm.address} placeholder="迚ｩ莉ｶ繧帝∈謚槭☆繧九→陦ｨ遉ｺ縺輔ｌ縺ｾ縺・ /></label>
                        <label className="wide"><span>萓晞ｼ蜀・ｮｹ *</span><textarea rows="3" value={residentCaseForm.requestDetails} onChange={e => setResidentCaseForm(v => ({ ...v, requestDetails: e.target.value }))} placeholder="萓具ｼ壼床謇豌ｴ譬薙°繧画ｼ乗ｰｴ" /></label>
                        <label className="wide"><span>蛯呵・/span><textarea rows="2" value={residentCaseForm.note} onChange={e => setResidentCaseForm(v => ({ ...v, note: e.target.value }))} /></label>
                        <label><span>騾ｲ謐・/span><select value={residentCaseForm.status} onChange={e => setResidentCaseForm(v => ({ ...v, status: e.target.value }))}>{residentCaseStatuses.map(status => <option key={status} value={status}>{status}</option>)}</select></label>
                        <label><span>谺｡縺ｫ繧・ｋ縺薙→</span><input type="text" value={residentCaseForm.nextAction} onChange={e => setResidentCaseForm(v => ({ ...v, nextAction: e.target.value }))} /></label>
                        <label><span>蟇ｾ蠢懈悄髯・/span><input type="date" value={residentCaseForm.actionDueDate} onChange={e => setResidentCaseForm(v => ({ ...v, actionDueDate: e.target.value }))} /></label>
                        <label className="wide"><span>豕ｨ諢丈ｺ矩・/span><textarea rows="2" value={residentCaseForm.caution} onChange={e => setResidentCaseForm(v => ({ ...v, caution: e.target.value }))} /></label>
                      </div>
                      {residentCaseFormError && <p className="saveStatus" role="alert">{residentCaseFormError}</p>}
                      <button className="primary" type="submit">縺薙・譯井ｻｶ繧堤匳骭ｲ</button>
                    </form>
                  </section>
                )}

                {(() => {
                  const todayKey = new Date().toLocaleDateString('sv-SE')
                  const holdCases = residentCases.filter(item => item.isOnHold || item.status === '菫晉蕗')
                  const activeCases = residentCases.filter(item => !item.completed && item.status !== '螳御ｺ・ && !item.isOnHold && item.status !== '菫晉蕗')
                  const overdueCases = activeCases.filter(item => item.actionDueDate && item.actionDueDate < todayKey)
                  const todayActionCases = activeCases.filter(item => item.actionDueDate === todayKey)
                  const todayVisitCases = activeCases.filter(item =>
                    String(item.siteVisitAt || '').startsWith(todayKey) || String(item.workVisitAt || '').startsWith(todayKey)
                  )
                  /* M-CROSS_RESIDENT_CASES_STEP10 */
                  const noDueCases = activeCases.filter(item => !item.actionDueDate && !item.siteVisitAt && !item.workVisitAt)
                  const staleBorder = Date.now() - 30 * 24 * 60 * 60 * 1000
                  const staleCases = activeCases.filter(item => {
                    const lastValue = item.lastActionAt || item.updatedAt || item.createdAt
                    const lastDate = lastValue ? new Date(lastValue) : null
                    return lastDate && !Number.isNaN(lastDate.getTime()) && lastDate.getTime() < staleBorder
                  })
                  const attentionCaseIds = new Set([
                    ...overdueCases.map(item => item.id),
                    ...todayActionCases.map(item => item.id),
                    ...todayVisitCases.map(item => item.id),
                    ...noDueCases.map(item => item.id),
                  ])
                  const attentionCases = activeCases.filter(item => attentionCaseIds.has(item.id))
                  const contactCases = activeCases.filter(item => ['譛ｪ騾｣邨｡', '荳埼・, '荳埼夲ｼ医Γ繝ｼ繝ｫ騾∽ｿ｡・・, '逋ｺ豕ｨ・域悴騾｣邨｡・・, '逋ｺ豕ｨ・井ｸ埼夲ｼ・].includes(item.status))
                  const orderCases = activeCases.filter(item => item.status === '隕狗ｩ肴署蜃ｺ貂茨ｼ育匱豕ｨ蠕・■・・)
                  const inProgressCases = activeCases.filter(item => item.status === '騾ｲ陦御ｸｭ')
                  const unreportedCases = activeCases.filter(item => item.status === '螳御ｺ・ｼ域悴蝣ｱ蜻奇ｼ・)
                  const completedCases = residentCases.filter(item => item.completed || item.status === '螳御ｺ・)
                  const normalizeResidentSearch = value => String(value || '').toLocaleLowerCase('ja').replace(/[\s縲]+/g, '')
                  const searchToken = normalizeResidentSearch(residentCaseSearch)
                  const sourceCases = residentCaseFilter === 'completed'
                    ? completedCases
                    : residentCaseFilter === 'hold'
                      ? holdCases
                      : activeCases
                  const filteredResidentCases = sourceCases.filter(item => {
                    if (residentCaseFilter === 'contact' && !contactCases.some(caseItem => caseItem.id === item.id)) return false
                    if (residentCaseFilter === 'visit' && !(item.siteVisitAt || item.workVisitAt)) return false
                    if (residentCaseFilter === 'order' && item.status !== '隕狗ｩ肴署蜃ｺ貂茨ｼ育匱豕ｨ蠕・■・・) return false
                    if (residentCaseFilter === 'inProgress' && item.status !== '騾ｲ陦御ｸｭ') return false
                    if (residentCaseFilter === 'unreported' && item.status !== '螳御ｺ・ｼ域悴蝣ｱ蜻奇ｼ・) return false
                    if (residentCaseFilter === 'overdue' && !overdueCases.some(caseItem => caseItem.id === item.id)) return false
                    if (residentCaseFilter === 'today' && !todayActionCases.some(caseItem => caseItem.id === item.id)) return false
                    if (residentCaseFilter === 'nodue' && !noDueCases.some(caseItem => caseItem.id === item.id)) return false
                    if (residentCaseFilter === 'stale' && !staleCases.some(caseItem => caseItem.id === item.id)) return false
                    if (residentCaseFilter === 'waiting' && !item.waitingFor) return false
                    if (residentCaseFilter === 'urgent' && item.priority !== 'urgent') return false
                    if (!searchToken) return true
                    const haystack = normalizeResidentSearch([
                      item.company, item.propertyName, item.unit, item.address,
                      item.residentContact, item.requestDetails, item.note,
                      item.status, item.nextAction, item.caution,
                    ].join(' '))
                    return haystack.includes(searchToken)
                  })
                  const priorityCases = [...filteredResidentCases].sort((a, b) => {
                    const aDue = a.actionDueDate || '9999-12-31'
                    const bDue = b.actionDueDate || '9999-12-31'
                    if (aDue !== bDue) return aDue.localeCompare(bDue)
                    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
                  })
                  const visibleResidentCases = priorityCases.slice(0, residentCaseVisibleCount)

                  return <>
                    <div className="residentOverallCounts residentOverallCountsFour">
                      <button type="button" className={residentCaseFilter === 'all' ? 'active' : ''} onClick={() => { setResidentCaseFilter('all'); setResidentCaseVisibleCount(10) }}><span>蟇ｾ蠢應ｸｭ</span><strong>{activeCases.length}</strong></button>
                      <button type="button" className={residentCaseFilter === 'hold' ? 'active' : ''} onClick={() => { setResidentCaseFilter('hold'); setResidentCaseVisibleCount(10) }}><span>菫晉蕗</span><strong>{holdCases.length}</strong></button>
                      <button type="button" className={residentCaseFilter === 'completed' ? 'active' : ''} onClick={() => { setResidentCaseFilter('completed'); setResidentCaseVisibleCount(10) }}><span>螳御ｺ・/span><strong>{completedCases.length}</strong></button>
                      <div><span>蜈ｨ譯井ｻｶ</span><strong>{residentCases.length}</strong></div>
                    </div>
                    <div className={`residentAttentionBanner${attentionCases.length ? ' hasAttention' : ''}`}>
                      <div><span>隕玖誠縺ｨ縺励メ繧ｧ繝・け</span><strong>{attentionCases.length ? attentionCases.length + '莉ｶ 隕∫｢ｺ隱・ : '迴ｾ蝨ｨ縺ｪ縺・}</strong></div>
                      <div className="residentAttentionButtons">
                        {noDueCases.length > 0 && <button type="button" onClick={() => { setResidentCaseFilter('nodue'); setResidentCaseVisibleCount(10) }}>谺｡蝗槫ｯｾ蠢懈律縺ｪ縺・{noDueCases.length}莉ｶ</button>}
                        {staleCases.length > 0 && <button type="button" onClick={() => { setResidentCaseFilter('stale'); setResidentCaseVisibleCount(10) }}>30譌･莉･荳雁虚縺阪↑縺・{staleCases.length}莉ｶ</button>}
                      </div>
                    </div>
                    <h2 className="residentSectionTitle">隕∝ｯｾ蠢・/h2>
                    <div className="residentDashboardGrid">
                      <button type="button" className={`residentDashboardCard urgent${residentCaseFilter === 'overdue' ? ' active' : ''}`} onClick={() => { setResidentCaseFilter('overdue'); setResidentCaseVisibleCount(10) }}><span>譛滄剞雜・℃</span><strong>{overdueCases.length}</strong></button>
                      <button type="button" className={`residentDashboardCard today${residentCaseFilter === 'today' ? ' active' : ''}`} onClick={() => { setResidentCaseFilter('today'); setResidentCaseVisibleCount(10) }}><span>莉頑律繧・ｋ</span><strong>{todayActionCases.length}</strong></button>
                      <button type="button" className={`residentDashboardCard visit${residentCaseFilter === 'visit' ? ' active' : ''}`} onClick={() => { setResidentCaseFilter('visit'); setResidentCaseVisibleCount(10) }}><span>莠亥ｮ壹≠繧・/span><strong>{activeCases.filter(item => item.siteVisitAt || item.workVisitAt).length}</strong></button>
                      <button type="button" className={`residentDashboardCard contact${residentCaseFilter === 'contact' ? ' active' : ''}`} onClick={() => { setResidentCaseFilter('contact'); setResidentCaseVisibleCount(10) }}><span>譛ｪ騾｣邨｡繝ｻ蜀埼｣邨｡</span><strong>{contactCases.length}</strong></button>
                      <button type="button" className={`residentDashboardCard order${residentCaseFilter === 'order' ? ' active' : ''}`} onClick={() => { setResidentCaseFilter('order'); setResidentCaseVisibleCount(10) }}><span>逋ｺ豕ｨ蠕・■</span><strong>{orderCases.length}</strong></button>
                      <button type="button" className={`residentDashboardCard progress${residentCaseFilter === 'inProgress' ? ' active' : ''}`} onClick={() => { setResidentCaseFilter('inProgress'); setResidentCaseVisibleCount(10) }}><span>騾ｲ陦御ｸｭ</span><strong>{inProgressCases.length}</strong></button>
                      <button type="button" className={`residentDashboardCard report${residentCaseFilter === 'unreported' ? ' active' : ''}`} onClick={() => { setResidentCaseFilter('unreported'); setResidentCaseVisibleCount(10) }}><span>螳御ｺ・・譛ｪ蝣ｱ蜻・/span><strong>{unreportedCases.length}</strong></button>
                    </div>

                    <div className="residentCasesListHeader">
                      <h2>譯井ｻｶ荳隕ｧ</h2>
                      <span>{priorityCases.length}莉ｶ</span>
                    </div>
                    <div className="residentCaseSearchBar">
                      <input type="search" value={residentCaseSearch} onChange={event => { setResidentCaseSearch(event.target.value); setResidentCaseVisibleCount(10) }} placeholder="迚ｩ莉ｶ蜷阪・蜿ｷ螳､繝ｻ萓晞ｼ蜀・ｮｹ縺ｪ縺ｩ繧呈､懃ｴ｢" />
                      {(residentCaseSearch || residentCaseFilter !== 'all') && <button type="button" onClick={() => { setResidentCaseSearch(''); setResidentCaseFilter('all'); setResidentCaseVisibleCount(10) }}>隗｣髯､</button>}
                    </div>

                    {priorityCases.length === 0 ? (
                      <div className="card residentEmptyCard">
                        <strong>迴ｾ蝨ｨ縺ｮ蜈･螻・ｸｭ譯井ｻｶ縺ｯ縺ゅｊ縺ｾ縺帙ｓ</strong>
                        <span>縲鯉ｼ・譁ｰ隕乗｡井ｻｶ縲阪°繧臥匳骭ｲ縺ｧ縺阪∪縺吶・/span>
                      </div>
                    ) : (
                      <div className="residentCaseList">
                        {visibleResidentCases.map(item => (
                          <article className={`residentCaseCard${overdueCases.some(caseItem => caseItem.id === item.id) ? ' overdue' : ''}${todayVisitCases.some(caseItem => caseItem.id === item.id) ? ' todayVisit' : ''}`} key={item.id} role="button" tabIndex={0} onClick={() => { setSelectedResidentCaseId(item.id); setResidentHistoryMemo(''); requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' })) }} onKeyDown={event => { if (event.key === 'Enter') { setSelectedResidentCaseId(item.id); setResidentHistoryMemo(''); requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' })) } }}>
                            <div className="residentCaseCardTop">
                              <strong>{item.propertyName || '迚ｩ莉ｶ蜷肴悴險ｭ螳・} {item.unit ? item.unit + '蜿ｷ螳､' : ''}</strong>
                              <span>{item.status || '譛ｪ騾｣邨｡'}</span>
                            </div>
                            <p>{item.requestDetails || '萓晞ｼ蜀・ｮｹ譛ｪ蜈･蜉・}</p>
                            <div className="residentCardBadges">
                              {item.priority === 'urgent' && <span className="urgent">閥 諤･縺・/span>}
                              {item.waitingFor && <span>竢ｳ {item.waitingFor}蠕・■</span>}
                              {(item.isOnHold || item.status === '菫晉蕗') && <span className="hold">菫晉蕗</span>}
                            </div>
                            <div className="residentCaseNext">
                              <span>谺｡縺ｫ繧・ｋ縺薙→</span>
                              <strong>{item.nextAction || '譛ｪ險ｭ螳・}</strong>
                            </div>
                            {item.siteVisitAt && <small>迴ｾ隱ｿ・嘴new Date(item.siteVisitAt).toLocaleString('ja-JP')}{item.siteVisitEndAt ? ' ・・' + new Date(item.siteVisitEndAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''}</small>}
                            {item.workVisitAt && <small>蟾･莠具ｼ嘴new Date(item.workVisitAt).toLocaleString('ja-JP')}{item.workVisitEndAt ? ' ・・' + new Date(item.workVisitEndAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''}</small>}
                            {item.actionDueDate ? <small>譛滄剞・嘴item.actionDueDate}</small> : (!item.completed && item.status !== '螳御ｺ・ && <small className="residentNoDue">笞 谺｡蝗槫ｯｾ蠢懈律縺梧悴險ｭ螳・/small>)}
                            {item.lastActionAt && <small>譛邨ょｯｾ蠢懶ｼ嘴new Date(item.lastActionAt).toLocaleDateString('ja-JP')}</small>}
                          </article>
                        ))}
                      </div>
                    )}
                    {residentCaseVisibleCount < priorityCases.length && (
                      <button className="secondaryButton residentMoreButton" type="button" onClick={() => setResidentCaseVisibleCount(previous => previous + 10)}>繧ゅ▲縺ｨ隕九ｋ・域ｮ九ｊ {priorityCases.length - residentCaseVisibleCount}莉ｶ・・/button>
                    )}

                    {selectedResidentCaseId && (() => {
                      const item = residentCases.find(caseItem => caseItem.id === selectedResidentCaseId)
                      if (!item) return null
                      const history = [...(item.history || [])].sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
                      return <section className="residentCaseDetailPage" aria-label="蜈･螻・ｸｭ譯井ｻｶ隧ｳ邏ｰ">
                        <div className="card residentCaseDetail">
                        <div className="residentCaseDetailTop">
                          <div><p className="eyebrow">CASE DETAIL</p><h2>{item.propertyName || '迚ｩ莉ｶ蜷肴悴險ｭ螳・} {item.unit ? item.unit + '蜿ｷ螳､' : ''}</h2></div>
                          <button className="back" type="button" onClick={() => { setSelectedResidentCaseId(''); requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' })) }}>竊・譯井ｻｶ荳隕ｧ縺ｸ</button>
                        </div>
                        <p className="residentCaseDetailRequest">{item.requestDetails || '萓晞ｼ蜀・ｮｹ譛ｪ蜈･蜉・}</p>
                        <div className="residentCaseMetaBadges">
                          <span className={`priority-${item.priority || 'normal'}`}>{item.priority === 'urgent' ? '閥 諤･縺・ : item.priority === 'low' ? '笞ｪ 菴・ : '泯 騾壼ｸｸ'}</span>
                          {item.waitingFor && <span>竢ｳ {item.waitingFor}蠕・■</span>}
                          {item.lastActionAt && <span>譛邨ょｯｾ蠢懶ｼ嘴new Date(item.lastActionAt).toLocaleDateString('ja-JP')}</span>}
                          {(item.isOnHold || item.status === '菫晉蕗') && <span className="hold">菫晉蕗・嘴item.holdReason || '逅・罰譛ｪ險ｭ螳・}</span>}
                        </div>
                        {item.residentContact && <a className="primary residentCallButton" href={'tel:' + item.residentContact}>到 蜈･螻・・∈髮ｻ隧ｱ縺吶ｋ</a>}
                        <div className="residentQuickActions">
                          <button type="button" onClick={() => applyResidentQuickStatus(item.id, '荳埼・)}>荳埼・/button>
                          <button type="button" onClick={() => applyResidentQuickStatus(item.id, '荳埼夲ｼ医Γ繝ｼ繝ｫ騾∽ｿ｡・・)}>繝｡繝ｼ繝ｫ騾∽ｿ｡貂・/button>
                          <button type="button" onClick={() => applyResidentQuickStatus(item.id, '騾｣邨｡貂茨ｼ亥・螻・・・繧ｹ繧ｱ繧ｸ繝･繝ｼ繝ｫ遒ｺ隱榊ｾ・■・・)}>譌･遞句屓遲泌ｾ・■</button>
                          <button type="button" onClick={() => applyResidentQuickStatus(item.id, '隕狗ｩ肴署蜃ｺ貂茨ｼ育匱豕ｨ蠕・■・・)}>逋ｺ豕ｨ蠕・■</button>
                          <button type="button" onClick={() => applyResidentQuickStatus(item.id, '騾ｲ陦御ｸｭ')}>騾ｲ陦御ｸｭ</button>
                          <button type="button" onClick={() => applyResidentQuickStatus(item.id, '螳御ｺ・ｼ域悴蝣ｱ蜻奇ｼ・)}>螳御ｺ・・譛ｪ蝣ｱ蜻・/button>
                          <button type="button" onClick={() => applyResidentQuickStatus(item.id, '螳御ｺ・)}>螳御ｺ・/button>
                          {item.isOnHold || item.status === '菫晉蕗' ? (
                            <button type="button" onClick={() => resumeResidentCase(item.id)}>蟇ｾ蠢應ｸｭ縺ｸ謌ｻ縺・/button>
                          ) : (
                            <button type="button" onClick={() => {
                              const reason = window.prompt('菫晉蕗逅・罰繧貞・蜉帙＠縺ｦ縺上□縺輔＞', '邂｡逅・ｼ夂､ｾ蛻､譁ｭ蠕・■')
                              if (reason === null) return
                              holdResidentCase(item.id, reason.trim() || '譎よ悄譛ｪ螳・)
                            }}>菫晉蕗縺ｫ縺吶ｋ</button>
                          )}
                        </div>
                        <div className="residentCaseDetailGrid">
                          <label><span>騾ｲ謐・/span><select value={item.status} onChange={event => applyResidentQuickStatus(item.id, event.target.value)}>{residentCaseStatuses.map(status => <option key={status} value={status}>{status}</option>)}</select></label>
                          <label><span>谺｡縺ｫ繧・ｋ縺薙→</span><input value={item.nextAction || ''} onChange={event => updateResidentCase(item.id, { nextAction: event.target.value })} /></label>
                          <label><span>蟇ｾ蠢懈悄髯・/span><input type="date" value={item.actionDueDate || ''} onChange={event => updateResidentCase(item.id, { actionDueDate: event.target.value })} /></label>
                          <label><span>隱ｰ蠕・■</span><select value={item.waitingFor || ''} onChange={event => updateResidentCase(item.id, { waitingFor: event.target.value })}>
                            <option value="">閾ｪ遉ｾ蟇ｾ蠢・/option><option value="蜈･螻・・>蜈･螻・・ｾ・■</option><option value="邂｡逅・ｼ夂､ｾ">邂｡逅・ｼ夂､ｾ蠕・■</option><option value="繧ｪ繝ｼ繝翫・">繧ｪ繝ｼ繝翫・蠕・■</option><option value="讌ｭ閠・>讌ｭ閠・ｾ・■</option>
                          </select></label>
                          <label><span>蜆ｪ蜈亥ｺｦ</span><select value={item.priority || 'normal'} onChange={event => updateResidentCase(item.id, { priority: event.target.value })}>
                            <option value="urgent">閥 諤･縺・/option><option value="normal">泯 騾壼ｸｸ</option><option value="low">笞ｪ 菴・/option>
                          </select></label>
                          <label><span>騾｣邨｡蜈・/span><input value={item.residentContact || ''} onChange={event => updateResidentCase(item.id, { residentContact: event.target.value })} /></label>
                          {/* M-CROSS_RESIDENT_CASES_STEP6_TIME_RANGE */}
                          <div className="residentVisitEditor wide">
                            <h3>迴ｾ隱ｿ莠亥ｮ・/h3>
                            <div className="residentVisitDateRow">
                              <label><span>譌･莉・/span><input type="date" value={(item.siteVisitAt || '').slice(0, 10)} onChange={event => {
                                const dateValue = event.target.value
                                const currentTime = (item.siteVisitAt || '').slice(11, 16) || '09:00'
                                const startValue = dateValue ? dateValue + 'T' + currentTime : ''
                                const endTime = (item.siteVisitEndAt || '').slice(11, 16) || '10:00'
                                const endValue = dateValue ? dateValue + 'T' + endTime : ''
                                updateResidentCase(item.id, {
                                  siteVisitAt: startValue,
                                  siteVisitEndAt: endValue,
                                  status: dateValue ? '騾｣邨｡貂茨ｼ育樟隱ｿ譌･遒ｺ螳夲ｼ・ : item.status,
                                  nextAction: dateValue ? '迴ｾ隱ｿ縺ｸ險ｪ蝠・ : item.nextAction,
                                }, dateValue ? '騾｣邨｡貂茨ｼ育樟隱ｿ譌･遒ｺ螳夲ｼ・ : '', dateValue ? '迴ｾ隱ｿ譌･繧堤匳骭ｲ' : '')
                              }} /></label>
                              <label><span>髢句ｧ・/span><input type="time" value={(item.siteVisitAt || '').slice(11, 16)} disabled={!item.siteVisitAt} onChange={event => {
                                const dateValue = (item.siteVisitAt || '').slice(0, 10)
                                updateResidentCase(item.id, { siteVisitAt: dateValue && event.target.value ? dateValue + 'T' + event.target.value : '' })
                              }} /></label>
                              <label><span>邨ゆｺ・/span><input type="time" value={(item.siteVisitEndAt || '').slice(11, 16)} disabled={!item.siteVisitAt} onChange={event => {
                                const dateValue = (item.siteVisitAt || '').slice(0, 10)
                                updateResidentCase(item.id, { siteVisitEndAt: dateValue && event.target.value ? dateValue + 'T' + event.target.value : '' })
                              }} /></label>
                            </div>
                            {item.siteVisitAt && item.siteVisitEndAt && new Date(item.siteVisitEndAt) <= new Date(item.siteVisitAt) && <p className="saveStatus" role="alert">邨ゆｺ・凾蛻ｻ縺ｯ髢句ｧ区凾蛻ｻ繧医ｊ蠕後↓縺励※縺上□縺輔＞</p>}
                            <p className="residentCalendarNote">莠亥ｮ壹ヵ繧｡繧､繝ｫ・・ics・峨ｒ繝繧ｦ繝ｳ繝ｭ繝ｼ繝峨＠縺ｾ縺吶ゅム繧ｦ繝ｳ繝ｭ繝ｼ繝牙ｾ後↓髢九＞縺ｦ繧ｫ繝ｬ繝ｳ繝繝ｼ縺ｸ霑ｽ蜉縺励※縺上□縺輔＞縲・/p>
                            <button className="secondaryButton residentCalendarButton" type="button" disabled={!item.siteVisitAt || !item.siteVisitEndAt || new Date(item.siteVisitEndAt) <= new Date(item.siteVisitAt)} onClick={() => downloadResidentCaseCalendar(item, 'site')}>套 迴ｾ隱ｿ繧偵き繝ｬ繝ｳ繝繝ｼ縺ｸ霑ｽ蜉</button>
                          </div>
                          <div className="residentVisitEditor wide">
                            <h3>蟾･莠倶ｺ亥ｮ・/h3>
                            <div className="residentVisitDateRow">
                              <label><span>譌･莉・/span><input type="date" value={(item.workVisitAt || '').slice(0, 10)} onChange={event => {
                                const dateValue = event.target.value
                                const currentTime = (item.workVisitAt || '').slice(11, 16) || '09:00'
                                const startValue = dateValue ? dateValue + 'T' + currentTime : ''
                                const endTime = (item.workVisitEndAt || '').slice(11, 16) || '10:00'
                                const endValue = dateValue ? dateValue + 'T' + endTime : ''
                                updateResidentCase(item.id, {
                                  workVisitAt: startValue,
                                  workVisitEndAt: endValue,
                                  status: dateValue ? '騾｣邨｡貂茨ｼ井ｽ懈･ｭ譌･遒ｺ螳夲ｼ・ : item.status,
                                  nextAction: dateValue ? '蟾･莠九∈險ｪ蝠・ : item.nextAction,
                                }, dateValue ? '騾｣邨｡貂茨ｼ井ｽ懈･ｭ譌･遒ｺ螳夲ｼ・ : '', dateValue ? '蟾･莠区律繧堤匳骭ｲ' : '')
                              }} /></label>
                              <label><span>髢句ｧ・/span><input type="time" value={(item.workVisitAt || '').slice(11, 16)} disabled={!item.workVisitAt} onChange={event => {
                                const dateValue = (item.workVisitAt || '').slice(0, 10)
                                updateResidentCase(item.id, { workVisitAt: dateValue && event.target.value ? dateValue + 'T' + event.target.value : '' })
                              }} /></label>
                              <label><span>邨ゆｺ・/span><input type="time" value={(item.workVisitEndAt || '').slice(11, 16)} disabled={!item.workVisitAt} onChange={event => {
                                const dateValue = (item.workVisitAt || '').slice(0, 10)
                                updateResidentCase(item.id, { workVisitEndAt: dateValue && event.target.value ? dateValue + 'T' + event.target.value : '' })
                              }} /></label>
                            </div>
                            {item.workVisitAt && item.workVisitEndAt && new Date(item.workVisitEndAt) <= new Date(item.workVisitAt) && <p className="saveStatus" role="alert">邨ゆｺ・凾蛻ｻ縺ｯ髢句ｧ区凾蛻ｻ繧医ｊ蠕後↓縺励※縺上□縺輔＞</p>}
                            <p className="residentCalendarNote">莠亥ｮ壹ヵ繧｡繧､繝ｫ・・ics・峨ｒ繝繧ｦ繝ｳ繝ｭ繝ｼ繝峨＠縺ｾ縺吶ゅム繧ｦ繝ｳ繝ｭ繝ｼ繝牙ｾ後↓髢九＞縺ｦ繧ｫ繝ｬ繝ｳ繝繝ｼ縺ｸ霑ｽ蜉縺励※縺上□縺輔＞縲・/p>
                            <button className="secondaryButton residentCalendarButton" type="button" disabled={!item.workVisitAt || !item.workVisitEndAt || new Date(item.workVisitEndAt) <= new Date(item.workVisitAt)} onClick={() => downloadResidentCaseCalendar(item, 'work')}>套 蟾･莠九ｒ繧ｫ繝ｬ繝ｳ繝繝ｼ縺ｸ霑ｽ蜉</button>
                          </div>
                          <label className="wide"><span>蛯呵・/span><textarea rows="2" value={item.note || ''} onChange={event => updateResidentCase(item.id, { note: event.target.value })} /></label>
                        </div>
                        <div className="residentHistoryAdd">
                          <input type="text" value={residentHistoryMemo} onChange={event => setResidentHistoryMemo(event.target.value)} placeholder="蟇ｾ蠢懊Γ繝｢繧貞・蜉・ />
                          <button className="secondaryButton" type="button" onClick={() => {
                            const memoText = residentHistoryMemo.trim()
                            if (!memoText) return
                            updateResidentCase(item.id, {}, item.status || '蟇ｾ蠢懊Γ繝｢', memoText)
                            setResidentHistoryMemo('')
                          }}>螻･豁ｴ縺ｫ霑ｽ蜉</button>
                        </div>
                        <div className="residentHistoryList">
                          <h3>蟇ｾ蠢懷ｱ･豁ｴ</h3>
                          {history.length === 0 ? <p className="empty">螻･豁ｴ縺ｯ縺ゅｊ縺ｾ縺帙ｓ</p> : history.map(log => <div className="residentHistoryItem" key={log.id || log.at}><div><strong>{log.status || '蟇ｾ蠢・}</strong><small>{log.at ? new Date(log.at).toLocaleString('ja-JP') : ''}</small></div>{log.memo && <p>{log.memo}</p>}</div>)}
                        </div>
                        <div className="residentWorkOrderTransfer">
                          {workOrders.some(workItem => workItem.sourceType === 'resident' && workItem.sourceId === item.id) ? (
                            <button className="secondaryButton" type="button" onClick={() => { setSelectedResidentCaseId(''); setShowResidentCases(false); setShowWorkOrders(true) }}>蟾･莠区｡井ｻｶ繧帝幕縺・/button>
                          ) : (
                            <button className="primary" type="button" onClick={() => {
                              if (!window.confirm('縺薙・蜈･螻・ｸｭ譯井ｻｶ縺九ｉ蟾･莠区｡井ｻｶ繧剃ｽ懈・縺励∪縺吶°・歃n迚ｩ莉ｶ繝ｻ蜿ｷ螳､繝ｻ菴乗園繝ｻ萓晞ｼ蜀・ｮｹ繧貞ｼ輔″邯吶℃縺ｾ縺吶・)) return
                              createWorkOrderFromResidentCase(item)
                            }}>蟾･莠区｡井ｻｶ縺ｸ騾ｲ繧</button>
                          )}
                        </div>
                        <div className="residentDangerZone">
                          <button className="dangerButton residentDeleteCaseButton" type="button" onClick={() => deleteResidentCase(item.id)}>縺薙・譯井ｻｶ繧貞炎髯､</button>
                        </div>
                        </div>
                      </section>
                    })()}
                  </>
                })()}
              </section>
            ) : (
              <>

            <p className="eyebrow">縺企Κ螻九・謗｡蟇ｸ繧偵√°繧薙◆繧薙↓</p>
            <h1>迚ｩ莉ｶ諠・ｱ</h1>
            <p className="subtitle">謗｡蟇ｸ縺吶ｋ迚ｩ莉ｶ繧帝∈謚槭＠縺ｦ縺上□縺輔＞縲・/p>
            {/* M-CROSS_PROMOTE_SAVED_LIST_V1_SAFE */}
            <button className="savedListHeroButton" type="button" onClick={openSavedList}>
              <span>唐 菫晏ｭ俶ｸ医∩荳隕ｧ繧定ｦ九ｋ</span>
              <small>菫晏ｭ倥＠縺溽黄莉ｶ繧帝幕縺上・邯壹″縺九ｉ邱ｨ髮・/small>
            </button>
            <button className="newRegistrationHeroButton" type="button" onClick={startNewRegistration}>
              <span>・・譁ｰ隕上〒逋ｻ骭ｲ縺吶ｋ</span>
              <small>譁ｰ縺励＞迚ｩ莉ｶ繝ｻ蜿ｷ螳､縺ｮ謗｡蟇ｸ繧帝幕蟋・/small>
            </button>
            <section className="todayStats" aria-label="莉頑律縺ｮ險倬鹸">
              <strong>TODAY</strong><span>螳御ｺ・黄莉ｶ {todayStats.completed}莉ｶ</span><span>逋ｻ骭ｲ莉ｶ謨ｰ {todayStats.registrations}莉ｶ</span>
            </section>
            <section className="card">
              <label>
                <span>邂｡逅・ｼ夂､ｾ</span>
                <select value={company} onChange={event => {
                  setCompany(event.target.value)
                  setPropertySearch('')
                  setSelectedProperty(null)
                  setSaveStatus('')
                }}>
                  <option value="">邂｡逅・ｼ夂､ｾ繧帝∈謚・/option>
                  {companies.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>

              {/* M-CROSS_PROPERTY_LIST_PICKER_V2 */}
              <button
                className="secondaryButton propertyListOpenButton"
                type="button"
                disabled={!company}
                onClick={() => { setPropertyListSearch(''); setShowPropertyListPicker(true) }}
              >
                {selectedProperty ? '搭 迚ｩ莉ｶ繧貞､画峩縺吶ｋ' : '搭 迚ｩ莉ｶ繧帝∈縺ｶ'}
              </button>

              {showPropertyListPicker && (
                <div className="propertyListPickerBackdrop" onClick={() => setShowPropertyListPicker(false)}>
                  <section className="propertyListPickerPanel" role="dialog" aria-modal="true" aria-label="迚ｩ莉ｶ荳隕ｧ縺九ｉ驕ｸ縺ｶ" onClick={event => event.stopPropagation()}>
                    <div className="propertyListPickerHeader">
                      <div><strong>迚ｩ莉ｶ荳隕ｧ縺九ｉ驕ｸ縺ｶ</strong><small>{company}縲{companyProperties.length}莉ｶ</small></div>
                      <button type="button" onClick={() => setShowPropertyListPicker(false)} aria-label="髢峨§繧・>ﾃ・/button>
                    </div>
                    <label className="propertyListPickerSearch">
                      <span>荳隕ｧ繧堤ｵ槭ｊ霎ｼ繧</span>
                      <input autoFocus value={propertyListSearch} onChange={event => setPropertyListSearch(event.target.value)} placeholder="迚ｩ莉ｶ蜷阪・菴乗園繧貞・蜉・ />
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
                            <small>{item.address || '菴乗園譛ｪ逋ｻ骭ｲ'}</small>
                          </button>
                        ))}
                    </div>
                    <style>{`
                      .propertyListOpenButton{width:100%;margin-top:10px}.selectedPropertySummary{display:grid;gap:3px;margin-top:10px;padding:12px 14px;border:1px solid rgba(90,120,170,.24);border-radius:12px;background:rgba(38,114,236,.06)}.selectedPropertySummary small{opacity:.68}.selectedPropertySummary strong{font-size:1.05rem}
                      .propertyListPickerBackdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.52)}
                      .propertyListPickerPanel{width:min(680px,100%);max-height:min(82vh,760px);display:grid;grid-template-rows:auto auto minmax(0,1fr);gap:12px;padding:18px;border-radius:18px;background:#fff;color:#182230;box-shadow:0 24px 70px rgba(0,0,0,.3)}
                      .propertyListPickerHeader{display:flex;align-items:center;justify-content:space-between;gap:12px}.propertyListPickerHeader strong,.propertyListPickerHeader small{display:block}.propertyListPickerHeader small{margin-top:4px;opacity:.68}.propertyListPickerHeader button{width:42px;height:42px;border:0;border-radius:50%;font-size:24px}
                      .propertyListPickerSearch span{display:block;margin-bottom:6px;font-weight:700}.propertyListPickerSearch input{width:100%;box-sizing:border-box}
                      .propertyListPickerItems{min-height:0;overflow:auto;display:grid;gap:8px;padding-right:3px}.propertyListPickerItem{display:block;width:100%;text-align:left;padding:13px 14px;border:1px solid #d8e0eb;border-radius:12px;background:#fff;color:#182230}.propertyListPickerItem strong,.propertyListPickerItem small{display:block}.propertyListPickerItem small{margin-top:4px;opacity:.68}
                      @media(prefers-color-scheme:dark){.propertyListPickerPanel{background:#101827;color:#f4f7fb}.propertyListPickerItem{background:#172235;color:#f4f7fb;border-color:#34455f}}
                      @media(max-width:620px){.propertyListPickerBackdrop{padding:0;place-items:stretch}.propertyListPickerPanel{width:100%;height:100%;max-height:none;border-radius:0;box-sizing:border-box;padding:16px}}
                    `}</style>
                  </section>
                </div>
              )}

              {/* M-CROSS_PROPERTY_PICKER_V4_SIMPLE */}
              <div className="selectedPropertySummary">
                <small>驕ｸ謚樔ｸｭ縺ｮ迚ｩ莉ｶ</small>
                <strong>{selectedProperty?.name || '縺ｾ縺驕ｸ謚槭＆繧後※縺・∪縺帙ｓ'}</strong>
              </div>

              <div className="address">
                <small>迚ｩ莉ｶ菴乗園</small>
                <strong>{selectedProperty?.address || '迚ｩ莉ｶ繧帝∈謚槭☆繧九→菴乗園縺瑚｡ｨ遉ｺ縺輔ｌ縺ｾ縺・}</strong>
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
                蝨ｰ蝗ｳ繝ｻ繝翫ン繧帝幕縺・
              </button>
              <label>
                <span>蜿ｷ螳､</span>
                <input value={unit} onChange={event => setUnit(event.target.value)} placeholder="萓具ｼ・01" />
              </label>

              <label className="workNameField">
                <span>蟾･莠句錐 *</span>
                <input
                  list="mcross-work-name-options"
                  value={workName}
                  onChange={event => { setWorkName(event.target.value); setSaveStatus('') }}
                  placeholder="萓具ｼ壼次迥ｶ蝗槫ｾｩ蟾･莠・
                />
                <datalist id="mcross-work-name-options">
                  <option value="蜴溽憾蝗槫ｾｩ蟾･莠・ />
                  <option value="蜀・｣・ｷ･莠・ />
                  <option value="菫ｮ郢募ｷ･莠・ />
                  <option value="險ｭ蛯吝ｷ･莠・ />
                </datalist>
                <small>蜷後§迚ｩ莉ｶ繝ｻ蜿ｷ螳､縺ｧ繧ゅ∝ｷ･莠句錐縺碁＆縺医・蛻･譯井ｻｶ縺ｨ縺励※菫晏ｭ倥＠縺ｾ縺吶・/small>
              </label>

              <label className="siteMemoField">
                <span>迴ｾ蝣ｴ繝｡繝｢</span>
                <textarea
                  value={siteMemo}
                  onChange={event => setSiteMemo(event.target.value)}
                  placeholder="萓具ｼ夊ｵ､縺・､門｣√∬ｧ貞慍縲・ｧ占ｻ雁ｴ迢ｭ縺・∝・蜿｣縺ｫ閾ｪ雋ｩ讖・
                  rows={3}
                />
                <small>蟒ｺ迚ｩ縺ｮ迚ｹ蠕ｴ繝ｻ鬧占ｻ雁ｴ謇繝ｻ骰ｵ繝ｻ谺｡蝗樒｢ｺ隱堺ｺ矩・↑縺ｩ縲ゅ°縺励％縺・､懃ｴ｢縺ｫ繧ゆｽｿ縺医∪縺吶・/small>
              </label>

                            <button
                className="secondaryButton similarSitesButton"
                type="button"
                disabled={!selectedProperty}
                onClick={() => setShowSimilarSites(value => !value)}
              >
                剥 莨ｼ縺溽樟蝣ｴ繧呈爾縺・
              </button>

              {showSimilarSites && (
                <section className="similarSitesPanel">
                  <div className="similarSitesHeading">
                    <strong>莨ｼ縺溽樟蝣ｴ蛟呵｣・/strong>
                    <small>菫晏ｭ俶ｸ医∩繝・・繧ｿ縺九ｉ蜿り・呵｣懊ｒ陦ｨ遉ｺ</small>
                  </div>
                  {similarSiteCandidates.length === 0 ? (
                    <p className="empty">荳閾ｴ縺吶ｋ驕主悉迴ｾ蝣ｴ縺後≠繧翫∪縺帙ｓ</p>
                  ) : (
                    <div className="similarSitesList">
                      {similarSiteCandidates.map(({ entry, score, reasons, summary }) => (
                        <article className="similarSiteItem" key={entry.storageKey || entry.id || entry.propertyName + entry.unit}>
                          <div>
                            <strong>{entry.propertyName || '迚ｩ莉ｶ蜷阪↑縺・}縲{entry.unit || ''}</strong>
                            <small>{entry.company || '邂｡逅・ｼ夂､ｾ譛ｪ險ｭ螳・}</small>
                            <small>荳閾ｴ逅・罰・嘴reasons.join(' / ')}</small>
                            {summary.length > 0 && <small>蜀・ｮｹ・嘴summary.join('繝ｻ')}</small>}
                          </div>
                          <div className="similarSiteActions">
                            <span>霑代＆ {score}</span>
                            <button type="button" onClick={() => loadSavedEntry(entry)}>髢九￥</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                  <p className="similarSitesNote">驕主悉縺ｮ謨ｰ驥上ｄ蟾･莠句・螳ｹ縺ｯ閾ｪ蜍輔さ繝斐・縺励∪縺帙ｓ縲ょ盾閠・｡ｨ遉ｺ縺ｮ縺ｿ縺ｧ縺吶・/p>
                </section>
              )}

                            
              {selectedProperty && previousPropertyEntries.length > 0 && (
                <section className="previousPropertyPanel">
                  <div className="previousPropertyHeading">
                    <strong>庁 蜑榊屓縺薙・迚ｩ莉ｶ縺ｧ縺ｯ</strong>
                    <small>{previousPropertyEntries.length}莉ｶ縺ｮ螻･豁ｴ</small>
                  </div>
                  <div className="propertyHistoryControls">
                    <button type="button" onClick={() => setShowAllPropertyHistory(value => !value)}>
                      {showAllPropertyHistory ? '逶ｴ霑・莉ｶ縺縺題｡ｨ遉ｺ' : '驕主悉縺ｮ螻･豁ｴ繧偵☆縺ｹ縺ｦ隕九ｋ'}
                    </button>
                    {showAllPropertyHistory && (
                      <select value={propertyHistoryOrder} onChange={event => setPropertyHistoryOrder(event.target.value)} aria-label="螻･豁ｴ縺ｮ荳ｦ縺ｳ鬆・>
                        <option value="newest">譁ｰ縺励＞鬆・/option>
                        <option value="oldest">蜿､縺・・/option>
                      </select>
                    )}
                  </div>
                  <div className="previousPropertyList">
                    {(showAllPropertyHistory
                      ? [...previousPropertyEntries].sort((a, b) => propertyHistoryOrder === 'oldest'
                          ? new Date(a.entry.updatedAt || 0) - new Date(b.entry.updatedAt || 0)
                          : new Date(b.entry.updatedAt || 0) - new Date(a.entry.updatedAt || 0))
                      : previousPropertyEntries.slice(0, 3)
                    ).map(({ entry, crossTotalValue, cfTotalValue, softTotalValue, trimTotalValue, workNames }) => (
                      <article className="previousPropertyItem" key={entry.storageKey || entry.propertyName + entry.unit + entry.updatedAt}>
                        <div className="previousPropertyTop">
                          <strong>{entry.unit || '蜿ｷ螳､譛ｪ險ｭ螳・}蜿ｷ螳､</strong>
                          <small>譖ｴ譁ｰ {formatSavedDate(entry.updatedAt)}</small>
                        </div>
                        <div className="previousPropertyTotals">
                          {crossTotalValue > 0 && <span>繧ｯ繝ｭ繧ｹ {formatQuantity(crossTotalValue)}緕｡</span>}
                          {cfTotalValue > 0 && <span>CF {formatQuantity(cfTotalValue)}緕｡</span>}
                          {softTotalValue > 0 && <span>繧ｽ繝輔ヨ蟾ｾ譛ｨ {formatQuantity(softTotalValue)}譫・/span>}
                          {trimTotalValue > 0 && <span>蠎願ｦ句・繧・{formatQuantity(trimTotalValue)}譛ｬ</span>}
                        </div>
                        {workNames.length > 0 && <small>霑ｽ蜉菴懈･ｭ・嘴workNames.join('繝ｻ')}</small>}
                        <button type="button" onClick={() => loadSavedEntry(entry)}>驕主悉繝・・繧ｿ繧帝幕縺・/button>
                      </article>
                    ))}
                  </div>
                  <p>蜿り・｡ｨ遉ｺ縺ｮ縺ｿ縺ｧ縺吶る℃蜴ｻ縺ｮ謨ｰ驥上・蜊倅ｾ｡繝ｻ蟾･莠句・螳ｹ縺ｯ莉雁屓縺ｸ閾ｪ蜍輔さ繝斐・縺励∪縺帙ｓ縲・/p>
                </section>
              )}

              <button className="primary" disabled={!selectedProperty || !unit.trim()} onClick={startMeasurement}>謗｡蟇ｸ繧帝幕蟋九☆繧・竊・/button>

              <OneDriveSyncPanel />
              <button
                className="secondaryButton residentCasesEntryButton"
                type="button"
                onClick={() => setShowResidentCases(true)}
              >
                蜈･螻・ｸｭ譯井ｻｶ
              </button>
              {/* M-CROSS_STEP19_BUTTON_PLACEMENT_FIX */}
              <button
                className="secondaryButton workOrdersEntryButton"
                type="button"
                onClick={() => setShowWorkOrders(true)}
              >
                蟾･莠区｡井ｻｶ
              </button>
              <button className="secondaryButton" type="button" onClick={() => { setSettingsPage('home'); setSettingsOpen(true) }}>笞・M-Cross險ｭ螳・/button>
            </section>

              </>
            )}
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
              竊・迚ｩ莉ｶ諠・ｱ縺ｸ謌ｻ繧・
            </button>
            <p className="propertyLine">{selectedProperty?.name}縲{unit}蜿ｷ螳､縲{workName}</p>
            <h1>
              {showEstimate
                ? '隕狗ｩ榊・螳ｹ'
                : showRoomManagement
                  ? '驛ｨ螻狗ｮ｡逅・
                  : activePage === 'cross'
                ? isSummaryPage ? '蜈ｨ螳､縺ｮ蜷郁ｨ・ : '謗｡蟇ｸ蜈･蜉・
                : activePage === 'cf' ? 'CF謗｡蟇ｸ' : activePage === 'soft' ? '繧ｽ繝輔ヨ蟾ｾ譛ｨ' : activePage === 'floorTrim' ? '蠎願ｦ句・繧・ : '縺昴・莉門ｷ･莠・}
            </h1>
            <div className="measurementActions">
              <button className="newRegistrationInlineButton" type="button" onClick={startNewRegistration}>
                ・・譁ｰ隕冗匳骭ｲ
              </button>
              <div className="saveActionWithFeedback">
                <button className="saveButton" type="button" onClick={() => {
                  const saved = saveCurrentData()
                  if (saved) {
                    const now = new Date()
                    const time = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                    setSaveFeedback('笨・菫晏ｭ倥＠縺ｾ縺励◆ ' + time)
                    window.setTimeout(() => setSaveFeedback(''), 3500)
                  } else {
                    setSaveFeedback('菫晏ｭ倥〒縺阪∪縺帙ｓ縺ｧ縺励◆')
                  }
                }}>菫晏ｭ倥☆繧・/button>
                {saveFeedback && <div className={`saveFeedbackMessage ${saveFeedback.startsWith('笨・) ? 'success' : 'error'}`} role="status">{saveFeedback}</div>}
              </div>
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

                  cfMaterialGroups,
                  softRecords,
                  floorTrimRecords,
                  additionalWorks,
                })}
              >
                投 謗｡蟇ｸ繝・・繧ｿ蜃ｺ蜉・
              </button>
              {/* M-CROSS_ESTIMATE_BUTTON_QUICK_EXPORT_V3_EXACT */}
              <button
                className="secondaryButton estimateQuickExportButton"
                type="button"
                onClick={() => {
                  const factor = Math.max(0, Number(caseCrossFactor) || Number(pricingSettings.crossFactor) || 0)
                  const rawRows = buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings)
                  const rowsForExport = applyEstimateEdits(rawRows, estimateEdits)
                  downloadEstimateExcel({
                    company,
                    propertyName: selectedProperty?.name || '', // M-CROSS_INITIAL_ESTIMATE_UNMARKED_V1_SAFE: 騾壼ｸｸ縺ｮ蛻晏屓隕狗ｩ阪・辟｡蜊ｰ
                    address: selectedProperty?.address || '',
                    unit,
                  }, rowsForExport, estimateCopyFormat, additionalWorks)
                }}
              >
                塘 隕狗ｩ肴嶌繧貞・蜉・
              </button>
              <button
                className="secondaryButton"
                type="button"
                onClick={() => {
                  setShowEstimate(previous => !previous)
                  setShowRoomManagement(false)
                }}
              >
                {showEstimate ? '竊・謗｡蟇ｸ逕ｻ髱｢縺ｸ謌ｻ繧・ : '腸 隕狗ｩ榊・螳ｹ繧堤｢ｺ隱阪・邱ｨ髮・}
              </button>
            </div>
            <p className={`saveState ${isDirty ? 'dirty' : 'saved'}`} role="status" aria-live="polite">
              {isDirty ? '譛ｪ菫晏ｭ・ : '菫晏ｭ俶ｸ医∩'}
            </p>
            {saveStatus && <p className="saveStatus" role="status">{saveStatus}</p>}

            {!showRoomManagement && !showEstimate && (
              <div className="measurementTypes" aria-label="謗｡蟇ｸ讖溯・">
                <button type="button" className={activePage === 'cross' ? 'measurementType active' : 'measurementType'} onClick={() => {
                  setActivePage('cross')
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      crossRoomAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    })
                  })
                }}>繧ｯ繝ｭ繧ｹ謗｡蟇ｸ</button>
                <button type="button" className={activePage === 'cf' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('cf')}>CF謗｡蟇ｸ</button>
                <button type="button" className={activePage === 'soft' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('soft')}>繧ｽ繝輔ヨ蟾ｾ譛ｨ</button>
                <button type="button" className={activePage === 'floorTrim' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('floorTrim')}>蠎願ｦ句・繧・/button>
                {/* M-CROSS_RENAME_FINAL_REVIEW_TO_OTHER_WORK_V2_SAFE */}
                <button type="button" className={activePage === 'review' ? 'measurementType active' : 'measurementType'} onClick={() => setActivePage('review')}>肌 縺昴・莉門ｷ･莠・/button>
              </div>
            )}

            {!showEstimate && (
              <button
                className="measurementCheckButton"
                type="button"
                onClick={() => setShowRoomManagement(previous => !previous)}
            >
                {showRoomManagement ? '竊・謗｡蟇ｸ逕ｻ髱｢縺ｸ謌ｻ繧・ : '笞・驛ｨ螻狗ｮ｡逅・}
              </button>
            )}

            {showEstimate ? (() => {
              // 縺雁ｮ｢讒伜髄縺醍判髱｢縺ｫ縺ｯ謠帷ｮ礼紫繧定｡ｨ遉ｺ縺帙★縲∬ｨｭ螳壽ｸ医∩縺ｮ譯井ｻｶ謠帷ｮ礼紫縺縺代ｒ險育ｮ励↓菴ｿ逕ｨ縺励∪縺吶・
              const factor = Math.max(0, Number(caseCrossFactor) || Number(pricingSettings.crossFactor) || 0)
              const rawEstimateRows = buildEstimateRows(records, cfRecords, softRecords, floorTrimRecords, rooms, factor, pricingSettings)
              /* M-CROSS_ESTIMATE_EXCLUSION_V5_EXACT_SAFE */
              const allEstimateRows = openedEstimateRows ?? applyEstimateEdits(rawEstimateRows, estimateEdits)
              /* M-CROSS_ADDITIONAL_WORK_ESTIMATE_EXCLUSION_V6_SAFE */
              const estimateRows = allEstimateRows.filter(row => !estimateEdits[row.exclusionKey || estimateEditKey(row)]?.excluded)
              const currentEstimateVersion = estimateVersions.reduce((max, item) => Math.max(max, Number(item.version) || 0), 0) + 1
              const additionalWorkTotal = additionalWorks.reduce((sum, item) => sum + (Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0)
              const totalAmount = estimateRows.reduce((sum, row) => sum + row.amount, 0) + additionalWorkTotal
              return (
                <section className="card">
                  <h2>{selectedProperty?.name} {unit}蜿ｷ螳､{openedEstimateVersion ? estimateVersionMark(openedEstimateVersion) : ''}</h2>
                  {/* M-CROSS_SIMPLIFY_ESTIMATE_TEXT_V1_SAFE */}
                  <div className="restorationWorkOrderAction">
                    {workOrders.some(item => item.sourceType === 'restoration' && item.sourceId === [selectedProperty?.id || selectedProperty?.name || '', String(unit || '').trim()].join('|')) ? (
                      <button className="secondaryButton" type="button" onClick={() => { setStarted(false); setShowWorkOrders(true) }}>蟾･莠区｡井ｻｶ繧帝幕縺・/button>
                    ) : (
                      <button className="primary" type="button" onClick={() => {
                        if (!window.confirm('縺薙・蜴溽憾蝗槫ｾｩ譯井ｻｶ縺九ｉ蟾･莠区｡井ｻｶ繧剃ｽ懈・縺励∪縺吶°・歃n迚ｩ莉ｶ繝ｻ蜿ｷ螳､縺ｨ譁ｽ蟾･鬆・岼繧貞ｼ輔″邯吶℃縺ｾ縺吶・)) return
                        createWorkOrderFromRestoration(estimateRows, totalAmount)
                      }}>蟾･莠区｡井ｻｶ縺ｸ騾ｲ繧</button>
                    )}
                  </div>

                  {estimateRows.length === 0 && additionalWorks.length === 0 ? (
                    <p className="empty">讎らｮ励〒縺阪ｋ謗｡蟇ｸ繝・・繧ｿ縺後≠繧翫∪縺帙ｓ</p>
                  ) : [
                    ...rooms.map(roomName => ({ title: roomName, key: roomName, rows: estimateRows.filter(row => row.room === roomName) })),
                    { title: '繧ｽ繝輔ヨ蟾ｾ譛ｨ', key: '__ALL_ROOMS__', rows: estimateRows.filter(row => row.room === '__ALL_ROOMS__') },
                    { title: '蠎願ｦ句・繧・, key: '__FLOOR_TRIM__', rows: estimateRows.filter(row => row.room === '__FLOOR_TRIM__') },
                    {
                      title: '蜀・｣・ｷ･莠倶ｻ･螟・,
                      key: '__ADDITIONAL_WORKS__',
                      rows: additionalWorks.map((item, additionalWorkIndex) => ({
                        exclusionKey: 'additionalWork:' + (item.id || additionalWorkIndex),
                        /* M-CROSS_ADDITIONAL_WORK_FULL_EDIT_V3_1_ROBUST */
                        category: 'additionalWork',
                        additionalWorkId: item.id || '',
                        additionalWorkIndex,
                        parts: Array.isArray(item.estimateParts) && item.estimateParts.length
                          ? [0, 1, 2, 3].map(index => String(item.estimateParts[index] || ''))
                          : [item.room || '', '', item.work || '', ''],
                        label: (Array.isArray(item.estimateParts) && item.estimateParts.length
                          ? item.estimateParts
                          : [item.room, item.work]).filter(Boolean).join(' '),
                        memo: item.memo || '',
                        quantity: Number(item.quantity || 0),
                        unit: item.unit || '蠑・,
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
                          <div
                            className="estimateRow estimateRowTapEdit"
                            key={row.category + '-' + row.label + '-' + row.memo + '-' + index}
                            role="button"
                            tabIndex={0}
                            title="繧ｿ繝・・縺励※隕狗ｩ肴・邏ｰ繧堤ｷｨ髮・
                            onClick={() => {
                              if (row.category === 'additionalWork') {
                                const parts = Array.isArray(row.parts) ? row.parts : [row.label || '', '', '', '']
                                setEstimateEditor({
                                  key: 'additionalWork:' + (row.additionalWorkId || row.additionalWorkIndex),
                                  additionalWorkId: row.additionalWorkId || '',
                                  additionalWorkIndex: row.additionalWorkIndex,
                                  parts: [0, 1, 2, 3].map(index => String(parts[index] || '')),
                                  memo: String(row.memo || ''),
                                  quantity: String(row.quantity ?? ''),
                                  unit: String(row.unit || ''),
                                  rate: String(row.rate ?? ''),
                                  amount: '',
                                })
                                return
                              }
                              const key = estimateEditKey(row)
                              const saved = estimateEdits[key]
                              const edit = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
                              const parts = Array.isArray(edit.parts) ? edit.parts : (Array.isArray(row.parts) ? row.parts : [row.label || ''])
                              setEstimateEditor({
                                key,
                                parts: [0,1,2,3].map(index => String(parts[index] || '')),
                                memo: String(edit.memo ?? row.memo ?? ''),
                                quantity: String(edit.quantity ?? row.quantity ?? ''),
                                unit: String(edit.unit ?? row.unit ?? ''),
                                rate: String(edit.rate ?? row.rate ?? ''),
                                amount: edit.amountMode === 'manual' ? String(edit.amount ?? '') : '',
                              })
                            }}
                            onKeyDown={event => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                event.currentTarget.click()
                              }
                            }}
                          >
                            <strong>{row.label}{row.memo && <small className="estimateMemo">{row.memo}</small>}</strong>
                            <span className="estimateNumber estimateUnit">{formatQuantity(row.quantity)}{row.unit}</span>
                            <span className="estimateNumber estimateRate">ﾃ・{formatYen(row.rate)}</span>
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
                    投 隕狗ｩ咲畑Excel蜃ｺ蜉・
                  </button>
                  {Object.values(estimateEdits).some(edit => edit && typeof edit === 'object' && edit.excluded) && (
                    <div className="estimateExcludedRestoreV4">
                      <span>隕狗ｩ阪°繧牙､悶＠縺滄・岼縺後≠繧翫∪縺・/span>
                      <button type="button" onClick={() => {
                        setEstimateEdits(previous => {
                          const next = Object.fromEntries(Object.entries(previous).map(([key, edit]) => {
                            if (!edit || typeof edit !== 'object' || Array.isArray(edit)) return [key, edit]
                            const restored = { ...edit }
                            delete restored.excluded
                            return [key, restored]
                          }))
                          try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}
                          return next
                        })
                        setIsDirty(true)
                        setSaveStatus('隕狗ｩ阪°繧牙､悶＠縺滄・岼繧偵☆縺ｹ縺ｦ謌ｻ縺励∪縺励◆')
                      }}>竊ｩ 縺吶∋縺ｦ隕狗ｩ阪∈謌ｻ縺・/button>
                    </div>
                  )}

                  <EstimateRowEditor
                    value={estimateEditor}
                    onClose={() => setEstimateEditor(null)}
                    onExclude={form => {
                      if (!form?.key) return
                      if (!window.confirm('縺薙・鬆・岼繧定ｦ狗ｩ阪°繧牙､悶＠縺ｾ縺吶°・歃n謗｡蟇ｸ繝・・繧ｿ縺ｯ蜑企勁縺輔ｌ縺ｾ縺帙ｓ縲・)) return
                      setEstimateEdits(previous => {
                        const next = {
                          ...previous,
                          [form.key]: { ...(previous[form.key] || {}), excluded: true },
                        }
                        try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}
                        return next
                      })
                      setEstimateEditor(null)
                      setIsDirty(true)
                      setSaveStatus('隕狗ｩ阪°繧蛾・岼繧貞､悶＠縺ｾ縺励◆縲よ治蟇ｸ繝・・繧ｿ縺ｯ谿九▲縺ｦ縺・∪縺吶・)
                    }}
                    onReset={key => {
                      if (estimateEditor?.additionalWorkId || Number.isInteger(estimateEditor?.additionalWorkIndex)) {
                        setAdditionalWorks(previous => previous.map((item, index) => {
                          const matched = estimateEditor.additionalWorkId ? item.id === estimateEditor.additionalWorkId : index === estimateEditor.additionalWorkIndex
                          if (!matched) return item
                          const next = { ...item }
                          delete next.estimateParts
                          return next
                        }))
                        setEstimateEditor(null)
                        setIsDirty(true)
                        setSaveStatus('霑ｽ蜉菴懈･ｭ縺ｮ隕狗ｩ肴・邏ｰ繧貞・縺ｫ謌ｻ縺励∪縺励◆')
                        return
                      }
                      setEstimateEdits(previous => {
                        const next = { ...previous }
                        delete next[key]
                        try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}
                        return next
                      })
                      setEstimateEditor(null)
                      setIsDirty(true)
                      setSaveStatus('隕狗ｩ肴・邏ｰ繧貞・縺ｫ謌ｻ縺励∪縺励◆')
                    }}
                    onSave={form => {
                      const parseNumber = value => {
                        const text = String(value || '').replace(/,/g, '').trim()
                        if (!text) return ''
                        const number = Number(text)
                        return Number.isFinite(number) && number >= 0 ? number : null
                      }
                      const quantity = parseNumber(form.quantity)
                      const rate = parseNumber(form.rate)
                      const amount = parseNumber(form.amount)
                      if (quantity === null || rate === null || amount === null) {
                        window.alert('謨ｰ驥上・蜊倅ｾ｡繝ｻ驥鷹｡阪・0莉･荳翫・謨ｰ蟄励〒蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・)
                        return
                      }
                      const cleanParts = form.parts.map(value => String(value || '').trim())
                      if (form.additionalWorkId || Number.isInteger(form.additionalWorkIndex)) {
                        const finalAmount = amount === '' ? Number(quantity || 0) * Number(rate || 0) : amount
                        setAdditionalWorks(previous => previous.map((item, index) => {
                          const matched = form.additionalWorkId ? item.id === form.additionalWorkId : index === form.additionalWorkIndex
                          if (!matched) return item
                          return { ...item, room: cleanParts[0] || '', work: cleanParts.slice(1).filter(Boolean).join(' ') || cleanParts[0] || '', estimateParts: cleanParts, memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), unitPrice: rate, amount: finalAmount }
                        }))
                        setEstimateEditor(null)
                        setIsDirty(true)
                        setSaveStatus('霑ｽ蜉菴懈･ｭ縺ｮ隕狗ｩ肴・邏ｰ繧貞､画峩縺励∪縺励◆')
                        return
                      }
                      const edit = { parts: cleanParts, memo: String(form.memo || '').trim(), quantity, unit: String(form.unit || '').trim(), rate, amount, amountMode: amount === '' ? 'auto' : 'manual' }
                      setEstimateEdits(previous => {
                        const next = { ...previous, [form.key]: edit }
                        try { localStorage.setItem(estimateEditStorageKey, JSON.stringify(next)) } catch {}
                        return next
                      })
                      setEstimateEditor(null)
                      setIsDirty(true)
                      setSaveStatus('隕狗ｩ肴・邏ｰ繧貞､画峩縺励∪縺励◆')
                    }}
                  />

                  <EstimateVersionPanel
                    propertyName={selectedProperty?.name || ''}
                    unit={unit}
                    currentVersion={openedEstimateVersion || currentEstimateVersion}
                    versions={estimateVersions}
                    currentTotal={totalAmount}
                    onCreateRevision={() => {
                      const version = currentEstimateVersion
                      const snapshot = {
                        id: 'estimate-version-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                        version,
                        createdAt: new Date().toISOString(),
                        totalAmount,
                        rows: JSON.parse(JSON.stringify(estimateRows)),
                        additionalWorks: JSON.parse(JSON.stringify(additionalWorks)),
                        copyFormat: estimateCopyFormat,
                      }
                      const next = [...estimateVersions, snapshot]
                      try {
                        localStorage.setItem(estimateVersionStorageKey, JSON.stringify(next))
                        setEstimateVersions(next)
                        setSaveStatus('縺願ｦ狗ｩ阪ｊ' + version + '繧剃ｿ晏ｭ倥＠縲∽ｿｮ豁｣迚・ + (version + 1) + '繧剃ｽ懈・縺励∪縺励◆')
                      } catch (error) {
                        console.error(error)
                        window.alert('隕狗ｩ榊ｱ･豁ｴ繧剃ｿ晏ｭ倥〒縺阪∪縺帙ｓ縺ｧ縺励◆縲・)
                      }
                    }}
                    onDownloadVersion={version => downloadEstimateExcel({
                      company,
                      propertyName: (selectedProperty?.name || '') + estimateVersionMark(version.version),
                      address: selectedProperty?.address || '',
                      unit,
                      estimateVersion: version.version,
                    }, version.rows || [], version.copyFormat || estimateCopyFormat, version.additionalWorks || [])}
                    onDeleteVersion={version => {
                      if (!window.confirm('縺願ｦ狗ｩ阪ｊ' + version.version + '繧貞炎髯､縺励∪縺吶°・・)) return
                      const next = estimateVersions.filter(item => item.id !== version.id)
                      localStorage.setItem(estimateVersionStorageKey, JSON.stringify(next))
                      setEstimateVersions(next)
                    }}
                  />

                  <div className="estimateTotal">
                    <span>蜷郁ｨ磯≡鬘・/span>
                    <strong>{formatYen(totalAmount)}</strong>
                  </div>
                  <p className="estimateNote">讎らｮ鈴≡鬘阪〒縺吶ょｮ滄圀縺ｮ譁ｽ蟾･蜀・ｮｹ縲∽ｽｿ逕ｨ譚先侭縲∽ｸ句慍縺ｮ迥ｶ諷九∫樟蝣ｴ迥ｶ豕√↑縺ｩ縺ｫ繧医ｊ驥鷹｡阪′螟画峩縺ｨ縺ｪ繧句ｴ蜷医′縺ゅｊ縺ｾ縺吶・/p>
                </section>
              )
            })() : showRoomManagement ? (
              <section className="card">
                <h2>驛ｨ螻狗ｮ｡逅・/h2>
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
                onRegistered={triggerRegisteredEffect}
              />
            ) : activePage === 'floorTrim' ? (
              <FloorTrimSection rooms={rooms} records={floorTrimRecords} setRecords={setFloorTrimRecords} onChanged={markUnsaved} onRegistered={triggerRegisteredEffect} />
            ) : activePage === 'cf' ? (
              <LengthMeasurementPage
                key="cf"
                title="CF"
                rooms={rooms.includes('蝨滄俣') ? rooms : [...rooms, '蝨滄俣']}
                records={cfRecords}
                setRecords={setCfRecords}
                materialGroups={cfMaterialGroups}
                setMaterialGroups={setCfMaterialGroups}
                onMaterialGroupsChanged={markUnsaved}
                /* M-CROSS_CF_MATERIAL_STEP4B */
                pageIndex={cfPageIndex}
                setPageIndex={setCfPageIndex}
                onRoomRecordsChanged={markRoomUnconfirmed}
                onRegistered={triggerRegisteredEffect}
              />
              ) : activePage === 'soft' ? (
              <LengthMeasurementPage
                key="soft"
                title="繧ｽ繝輔ヨ蟾ｾ譛ｨ"
                rooms={rooms}
                records={softRecords}
                setRecords={setSoftRecords}
                pageIndex={softPageIndex}
                setPageIndex={setSoftPageIndex}
                countOnly
                onRoomRecordsChanged={markRoomUnconfirmed}
                onRegistered={triggerRegisteredEffect}
              />
            ) : (
              <>
                <nav ref={crossRoomAreaRef} className="roomTabs" aria-label="繧ｯ繝ｭ繧ｹ縺ｮ驛ｨ螻・>
                  {rooms.map((name, index) => (
                    <button key={name} type="button" className={pageIndex === index ? 'room active' : 'room'} onClick={() => goToPage(index)}>{name}</button>
                  ))}
                  <button type="button" className={isSummaryPage ? 'room active' : 'room'} onClick={() => goToPage(rooms.length)}>蜈ｨ螳､蜷郁ｨ・/button>
                </nav>
                {isSummaryPage ? (
                  <section className="card">
                    <h2>驛ｨ螻九＃縺ｨ縺ｮ蜷郁ｨ・/h2>
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
                            <span>驛ｨ螻句粋險・/span>
                            <strong>{formatQuantity(roomTotal)}m</strong>
                          </div>
                        </div>
                      )
                    })}
                    <div className="summary">
                      {measurementTypes.map(type => (
                        <div className="summaryLine" key={type}>
                          <span>{type}蜷郁ｨ・/span>
                          <strong>{formatQuantity(totalsByType[type])}m</strong>
                        </div>
                      ))}
                      <div className="summaryLine summaryGrand">
                        <span>蜈ｨ蛹ｺ蛻・粋險・/span>
                        <strong>{formatQuantity(grandTotal)}m</strong>
                      </div>
                    </div>
                  </section>
                ) : (
                  <>
                    <section className="card">
                      <h2>{room}</h2>
                      <div ref={crossTypeAreaRef} className="measurementTypes" aria-label="謗｡蟇ｸ蛹ｺ蛻・>
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
                              <span>鬮倥＆</span>
                              <input
                                ref={heightInputRef}
                                type="text"
                                inputMode="none"
                                readOnly
                                value={height}
                                onFocus={() => setActiveInput('height')}
                                onClick={() => setActiveInput('height')}
                                placeholder="繧ｿ繝・・"
                              />
                            </label>
                            <label>
                              <span>譛ｬ謨ｰ</span>
                              <input
                                ref={countInputRef}
                                type="text"
                                inputMode="none"
                                readOnly
                                value={count}
                                onFocus={() => setActiveInput('count')}
                                onClick={() => setActiveInput('count')}
                                placeholder="繧ｿ繝・・"
                              />
                            </label>
                          </div>

                          <NumberKeypad
                            activeInput={activeInput}
                            onKey={updateCrossInput}
                            decimalInput={activeInput === 'height' || activeInput === 'count'}
                            showEnter
                            onEnter={handleCrossEnter}
                          />
                        </div>

                        <label>
                          <span>繝｡繝｢</span>
                          <input
                            ref={memoInputRef}
                            className="memoInput"
                            type="text"
                            value={memo}
                            onChange={event => {
                              setMemo(event.target.value)
                              markUnsaved()
                            }}
                            placeholder="萓具ｼ夂ｪ馴擇縲・Κ蛻・ｼｵ譖ｿ縺・
                          />
                        </label>
                        <div className="quickMemos" aria-label="繧医￥菴ｿ縺・Γ繝｢">
                          {configuredQuickMemos.map(text => <button key={text} className="quickMemoButton" type="button" onClick={() => addQuickMemo(text)}>{text}</button>)}
                          <button className="quickMemoButton" type="button" onClick={() => memoInputRef.current?.focus()}>縺昴・莉・/button>
                        </div>
                      </form>
                      <div className="records">
                        {roomRecords.length === 0 ? (
                          <p className="empty">{room}縺ｮ{measurementType}縺ｮ逋ｻ骭ｲ蜀・ｮｹ縺ｯ縺ゅｊ縺ｾ縺帙ｓ</p>
                        ) : roomRecords.map(item => (
                          <div className="record" key={item.id}>
                            <div>
                              <strong>{item.type}</strong>
                              <small>{Number(item.height).toFixed(2)}m ﾃ・{item.count}譛ｬ</small>
                              {item.memo && <small>繝｡繝｢・嘴item.memo}</small>}
                            </div>
                            <b>{formatQuantity(getRecordQuantity(item))}m</b>
                            <button type="button" onClick={() => deleteCrossRecord(item.id)} aria-label={`${room}縺ｮ${item.type}縺ｮ逋ｻ骭ｲ繧貞炎髯､`}>ﾃ・/button>
                          </div>
                        ))}
                      </div>
                    </section>

                    <div className="roomNavigation">
                      <button className="back" type="button" disabled={pageIndex === 0} onClick={() => goToPage(pageIndex - 1)}>竊・蜑阪・驛ｨ螻・/button>
                      <button className="primary roomNavigationNext" type="button" onClick={() => goToPage(pageIndex + 1)}>
                        {pageIndex === rooms.length - 1 ? '蜈ｨ螳､蜷郁ｨ医∈ 竊・ : '谺｡縺ｮ驛ｨ螻・竊・}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </main>
        )}
        {effectBurst && <div className={`registrationEffect effect-${effectBurst.theme}`} aria-hidden="true">{[0,1,2,3,4,5,6,7].map(index => <span key={index} style={{ '--i': index }}>{effectBurst.symbol}</span>)}</div>}
        {showComplete && (
          <div className="completeBackdrop" onClick={() => setShowComplete(false)}>
            <section className="completeCard" onClick={event => event.stopPropagation()}>
              <small>MEASUREMENT</small><h2>笨・謗｡蟇ｸ COMPLETE</h2>
              <div><span>繧ｯ繝ｭ繧ｹ</span><strong>{formatQuantity(records.reduce((sum,item) => sum + getRecordQuantity(item),0) * Math.max(0,Number(caseCrossFactor) || Number(pricingSettings.crossFactor) || 0))}緕｡</strong></div>
              <div><span>CF</span><strong>{formatQuantity(cfRecords.reduce((sum,item) => sum + getLengthQuantity(item),0) * 1.8)}緕｡</strong></div>
              <div><span>蟾ｾ譛ｨ</span><strong>{formatQuantity(softRecords.reduce((sum,item) => sum + getSoftBaseboardQuantity(item),0))}譫・/strong></div>
              <p>縺顔夢繧後＆縺ｾ縺ｧ縺励◆・・/p><button className="primary" type="button" onClick={() => setShowComplete(false)}>髢峨§繧・/button>
            </section>
          </div>
        )}
        {showSplash && <div className={`splashScreen splash-${theme}`}><strong>M-CROSS</strong><span>{theme === 'cyber' ? 'FIELD MEASUREMENT SYSTEM / READY' : 'MavieSelect Field Measurement'}</span></div>}
        {showGalaxyUnlock && <div className="galaxyUnlock"><small>SECRET THEME</small><strong>GALAXY UNLOCKED</strong><span>笘・/span></div>}
        {showDraftRecovery && workingDraft && (
          <div className="leaveConfirmBackdrop">
            <section
              className="leaveConfirmDialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="draft-recovery-title"
            >
              <h2 id="draft-recovery-title">蜑榊屓縺ｮ菴懈･ｭ荳ｭ繝・・繧ｿ縺後≠繧翫∪縺・/h2>
              <p>
                菫晏ｭ倥☆繧句燕縺ｫM-Cross縺檎ｵゆｺ・＠縺溷庄閭ｽ諤ｧ縺後≠繧翫∪縺吶・br />
                邯壹″縺九ｉ蜀埼幕縺ｧ縺阪∪縺吶・
              </p>
              <p className="savedMeta">
                {workingDraft.propertyName || '迚ｩ莉ｶ蜷阪↑縺・}
                {workingDraft.unit ? `縲${workingDraft.unit}蜿ｷ螳､` : ''}
              </p>
              <button className="saveButton" type="button" onClick={restoreWorkingDraft}>
                邯壹″縺九ｉ蜀埼幕
              </button>
              <button className="dangerButton" type="button" onClick={discardWorkingDraft}>
                遐ｴ譽・＠縺ｦ譁ｰ隕城幕蟋・
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
              <h2 id="leave-confirm-title">譛ｪ菫晏ｭ倥・螟画峩</h2>
              <p id="leave-confirm-description">
                螟画峩蜀・ｮｹ縺御ｿ晏ｭ倥＆繧後※縺・∪縺帙ｓ縲・br />
                菫晏ｭ倥○縺壹↓遘ｻ蜍輔＠縺ｾ縺吶°・・
              </p>
              <button className="saveButton" type="button" onClick={saveAndNavigate}>
                菫晏ｭ倥＠縺ｦ遘ｻ蜍・
              </button>
              <button className="dangerButton" type="button" onClick={discardAndNavigate}>
                菫晏ｭ倥○縺壹↓遘ｻ蜍・
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
                繧ｭ繝｣繝ｳ繧ｻ繝ｫ
              </button>
            </section>
          </div>
        )}
      </div>
    </>
  )
}

/* M-CROSS_THEME_BUTTON_SOUNDS_V2_START */
function mCrossGetThemeName() {
  const className = document.querySelector('.app')?.className || ''
  if (className.includes('theme-cyber')) return 'cyber'
  if (className.includes('theme-retro')) return 'retro'
  if (className.includes('theme-galaxy')) return 'galaxy'
  if (className.includes('theme-sakura')) return 'sakura'
  if (className.includes('theme-ice')) return 'ice'
  if (className.includes('theme-forest')) return 'forest'
  if (className.includes('theme-luxury')) return 'luxury'
  if (className.includes('theme-pop')) return 'pop'
  if (className.includes('theme-dark')) return 'dark'
  return 'beige'
}

function mCrossIsSoundOff() {
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key) continue
      const raw = localStorage.getItem(key)
      if (!raw || raw[0] !== '{') continue
      try {
        const value = JSON.parse(raw)
        if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'sound')) {
          return value.sound === 'off'
        }
      } catch {}
    }
  } catch {}
  return false
}

let mCrossSharedAudioContext = null

function mCrossGetAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null

  if (!mCrossSharedAudioContext || mCrossSharedAudioContext.state === 'closed') {
    mCrossSharedAudioContext = new AudioContextClass()
  }

  if (mCrossSharedAudioContext.state === 'suspended') {
    mCrossSharedAudioContext.resume().catch(() => {})
  }

  return mCrossSharedAudioContext
}

let mCrossIsFirstButtonSound = true

function mCrossCreateTone(audioContext, sound, gainValue, duration, delay = 0) {
  const at = audioContext.currentTime + delay
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = sound.type
  oscillator.frequency.setValueAtTime(sound.frequency, at)
  gain.gain.setValueAtTime(Math.min(gainValue, 0.22), at)
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration)

  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(at)
  oscillator.stop(at + duration)
}

async function mCrossPlayButtonSound() {
  const sounds = {
    beige:  { frequency: 620,  type: 'sine',     gain: 0.090, duration: 0.070 },
    dark:   { frequency: 360,  type: 'triangle', gain: 0.100, duration: 0.075 },
    pop:    { frequency: 880,  type: 'triangle', gain: 0.110, duration: 0.090 },
    cyber:  { frequency: 1240, type: 'square',   gain: 0.065, duration: 0.065 },
    luxury: { frequency: 520,  type: 'sine',     gain: 0.085, duration: 0.085 },
    sakura: { frequency: 760,  type: 'sine',     gain: 0.085, duration: 0.095 },
    ice:    { frequency: 1080, type: 'sine',     gain: 0.080, duration: 0.100 },
    forest: { frequency: 440,  type: 'triangle', gain: 0.095, duration: 0.090 },
    retro:  { frequency: 960,  type: 'square',   gain: 0.065, duration: 0.070 },
    galaxy: { frequency: 1380, type: 'sine',     gain: 0.080, duration: 0.110 },
  }

  const sound = sounds[mCrossGetThemeName()] || sounds.beige
  const audioContext = mCrossGetAudioContext()
  if (!audioContext) return

  try {
    if (audioContext.state === 'suspended') await audioContext.resume()
    if (audioContext.state !== 'running') return

    if (mCrossIsFirstButtonSound) {
      mCrossCreateTone(audioContext, sound, sound.gain * 2.0, Math.max(sound.duration, 0.11), 0)
      mCrossCreateTone(audioContext, sound, sound.gain * 1.25, 0.060, 0.020)
      mCrossIsFirstButtonSound = false
      return
    }

    mCrossCreateTone(audioContext, sound, sound.gain, sound.duration)
  } catch (error) {
    console.debug('M-Cross button sound skipped', error)
  }
}

/* M-CROSS_FIRST_TAP_MOBILE_DEDICATED_V2_APPLIED */

function mCrossHandleButtonSound(event) {
  const target = event.target
  if (!(target instanceof Element)) return
  const button = target.closest('button')
  if (!button || button.disabled) return
  mCrossPlayButtonSound()
}

if (!globalThis.__mCrossThemeButtonSoundsV2Installed) {
  globalThis.__mCrossThemeButtonSoundsV2Installed = true
  document.addEventListener('click', mCrossHandleButtonSound, true)
}
/* M-CROSS_THEME_BUTTON_SOUNDS_V2_END */


/* M-CROSS_AUTO_THEME_SOUNDS_APPLIED */
