import { env } from 'node:process'
import {
  apiErrorResponse,
  badMethod,
  deleteExpiredSharedCases,
  jsonApiResponse,
} from '../server/case-sharing.js'

export default async function handler(request) {
  if (request.method !== 'GET') return badMethod('GET')
  const secret = env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  try {
    const deleted = await deleteExpiredSharedCases()
    return jsonApiResponse({ deleted })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
