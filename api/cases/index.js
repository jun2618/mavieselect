import { badMethod, createSharedCase } from '../../server/case-sharing.js'

export default async function handler(request) {
  if (request.method !== 'POST') return badMethod('POST')
  return createSharedCase(request)
}
