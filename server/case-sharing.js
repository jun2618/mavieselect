import { del, get, list, put } from '@vercel/blob'
import { randomBytes } from 'node:crypto'

export const CASE_BLOB_PREFIX = 'm-cross-cases/'
export const CASE_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const MAX_CASE_BYTES = 1024 * 1024
const CASE_ROOMS = [
  '居間', '台所', '洋間', '洋間2', '洋間3', '和室',
  '脱衣所', 'トイレ', '玄関', '階段', 'ホール',
]
const CROSS_TYPES = ['天井', '収納天井', '壁', '収納壁']

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyKeys(value, keys) {
  return isObject(value) && Object.keys(value).every(key => keys.includes(key))
}

function validateText(value, field, { required = false, maxLength = 2000 } = {}) {
  if (typeof value !== 'string' || value.length > maxLength || (required && !value.trim())) {
    throw new Error(`${field} is invalid`)
  }
}

function validateNumber(value, field, { min = 0, integer = false } = {}) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > Number.MAX_SAFE_INTEGER ||
    (integer && !Number.isInteger(value))
  ) {
    throw new Error(`${field} is invalid`)
  }
}

function validateCaseFile(payload) {
  if (
    !hasOnlyKeys(payload, ['format', 'version', 'exportedAt', 'caseData']) ||
    payload.format !== 'm-cross-case' ||
    payload.version !== 1
  ) {
    throw new Error('Unsupported M-Cross case format')
  }
  validateText(payload.exportedAt, 'exportedAt', { required: true, maxLength: 50 })
  if (Number.isNaN(Date.parse(payload.exportedAt))) throw new Error('exportedAt is invalid')

  const data = payload.caseData
  if (!hasOnlyKeys(data, [
    'company', 'propertyName', 'address', 'unit',
    'records', 'cfRecords', 'softRecords', 'updatedAt',
  ])) {
    throw new Error('caseData is invalid')
  }
  validateText(data.company, 'company', { required: true, maxLength: 300 })
  validateText(data.propertyName, 'propertyName', { required: true, maxLength: 300 })
  validateText(data.address, 'address', { maxLength: 1000 })
  validateText(data.unit, 'unit', { required: true, maxLength: 100 })
  validateText(data.updatedAt, 'updatedAt', { required: true, maxLength: 50 })
  if (Number.isNaN(Date.parse(data.updatedAt))) throw new Error('updatedAt is invalid')
  if (!Array.isArray(data.records) || !Array.isArray(data.cfRecords) || !Array.isArray(data.softRecords)) {
    throw new Error('Measurement arrays are required')
  }
  if (data.records.length + data.cfRecords.length + data.softRecords.length > 10000) {
    throw new Error('Too many measurement records')
  }

  const validateRows = (rows, kind) => {
    const identifiers = new Set()
    return rows.map((row, index) => {
      const label = `${kind}[${index}]`
      const keys = kind === 'cross'
        ? ['id', 'room', 'type', 'height', 'count', 'quantity', 'confirmedQuantity', 'memo']
        : kind === 'cf'
          ? ['id', 'room', 'length', 'count', 'quantity', 'confirmedQuantity', 'memo']
          : ['id', 'room', 'quantity', 'confirmedQuantity']
      if (!hasOnlyKeys(row, keys)) throw new Error(`${label} is invalid`)
      validateText(row.id, `${label}.id`, { required: true, maxLength: 100 })
      if (identifiers.has(row.id)) throw new Error(`${label}.id is duplicated`)
      identifiers.add(row.id)
      validateText(row.room, `${label}.room`, { required: true, maxLength: 100 })
      if (!CASE_ROOMS.includes(row.room)) throw new Error(`${label}.room is invalid`)
      validateNumber(row.quantity, `${label}.quantity`)
      validateNumber(row.confirmedQuantity, `${label}.confirmedQuantity`)
      if (Math.round((row.confirmedQuantity + Number.EPSILON) * 10) / 10 !== row.confirmedQuantity) {
        throw new Error(`${label}.confirmedQuantity must have one decimal place`)
      }
      if (kind === 'cross') {
        validateText(row.type, `${label}.type`, { required: true, maxLength: 100 })
        if (!CROSS_TYPES.includes(row.type)) throw new Error(`${label}.type is invalid`)
        validateNumber(row.height, `${label}.height`, { min: Number.MIN_VALUE })
        validateNumber(row.count, `${label}.count`, { min: 1, integer: true })
        validateText(row.memo, `${label}.memo`)
        return { ...row, quantity: row.confirmedQuantity }
      }
      if (kind === 'cf') {
        validateNumber(row.length, `${label}.length`, { min: Number.MIN_VALUE })
        validateNumber(row.count, `${label}.count`, { min: 1, integer: true })
        validateText(row.memo, `${label}.memo`)
        return { ...row, quantity: row.confirmedQuantity }
      }
      return { ...row, quantity: row.confirmedQuantity }
    })
  }

  return {
    format: payload.format,
    version: payload.version,
    exportedAt: payload.exportedAt,
    caseData: {
      company: data.company,
      propertyName: data.propertyName,
      address: data.address,
      unit: data.unit,
      records: validateRows(data.records, 'cross'),
      cfRecords: validateRows(data.cfRecords, 'cf'),
      softRecords: validateRows(data.softRecords, 'soft'),
      updatedAt: data.updatedAt,
    },
  }
}

function errorResponse(error) {
  console.error('M-Cross case sharing API error:', {
    errorName: error?.name || 'Error',
    errorMessage: error?.message || String(error),
  })
  return jsonResponse({ error: '案件共有処理に失敗しました。時間をおいて再度お試しください。' }, 500)
}

export function requireSameOrigin(request) {
  const origin = request.headers.get('origin')
  try {
    if (origin && new URL(origin).origin === new URL(request.url).origin) return null
  } catch {
    return jsonResponse({ error: 'リクエスト元を確認できません。' }, 403)
  }
  if (!origin) {
    return jsonResponse({ error: 'リクエスト元を確認できません。' }, 403)
  }
  return jsonResponse({ error: 'リクエスト元を確認できません。' }, 403)
}

export function badMethod(allowed) {
  return new Response('Method not allowed', {
    status: 405,
    headers: { Allow: allowed, 'Cache-Control': 'no-store' },
  })
}

export async function createSharedCase(request) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > MAX_CASE_BYTES) {
    return jsonResponse({ error: '共有する案件データが大きすぎます。' }, 413)
  }

  let payload
  try {
    const body = await request.text()
    if (new TextEncoder().encode(body).byteLength > MAX_CASE_BYTES) {
      return jsonResponse({ error: '共有する案件データが大きすぎます。' }, 413)
    }
    payload = validateCaseFile(JSON.parse(body))
  } catch {
    return jsonResponse({ error: '共有する案件データの形式が正しくありません。' }, 400)
  }

  const id = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + CASE_LINK_TTL_MS).toISOString()
  try {
    await put(`${CASE_BLOB_PREFIX}${id}.json`, JSON.stringify({ expiresAt, caseFile: payload }), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: 'application/json',
    })
    const shareUrl = new URL('/', request.url)
    shareUrl.searchParams.set('caseShare', id)
    return jsonResponse({ id, expiresAt, url: shareUrl.toString() }, 201)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function readSharedCase(id) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(id)) return jsonResponse({ error: '共有リンクが無効です。' }, 404)
  const pathname = `${CASE_BLOB_PREFIX}${id}.json`
  try {
    const blob = await get(pathname, { access: 'private', useCache: false })
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return jsonResponse({ error: '共有リンクが見つかりません。' }, 404)
    }
    const stored = JSON.parse(await new Response(blob.stream).text())
    const expiration = Date.parse(stored.expiresAt)
    if (!Number.isFinite(expiration)) return jsonResponse({ error: '共有リンクのデータが無効です。' }, 404)
    if (Date.now() >= expiration) {
      try {
        await del(pathname)
      } catch (error) {
        console.error('Expired M-Cross case cleanup failed:', {
          errorName: error?.name || 'Error',
          errorMessage: error?.message || String(error),
        })
      }
      return jsonResponse({ error: 'この共有リンクは期限切れです' }, 410)
    }
    return jsonResponse({ caseFile: validateCaseFile(stored.caseFile), expiresAt: stored.expiresAt })
  } catch (error) {
    if (error?.name === 'BlobNotFoundError') return jsonResponse({ error: '共有リンクが見つかりません。' }, 404)
    return errorResponse(error)
  }
}

export async function deleteExpiredSharedCases() {
  const cutoff = Date.now() - CASE_LINK_TTL_MS
  let cursor
  let deleted = 0
  do {
    const page = await list({ prefix: CASE_BLOB_PREFIX, limit: 1000, cursor, mode: 'expanded' })
    const expired = page.blobs.filter(blob => blob.uploadedAt.getTime() <= cutoff)
    if (expired.length > 0) {
      await del(expired.map(blob => blob.pathname))
      deleted += expired.length
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return deleted
}

export function jsonApiResponse(body, status = 200) {
  return jsonResponse(body, status)
}

export function apiErrorResponse(error) {
  return errorResponse(error)
}
