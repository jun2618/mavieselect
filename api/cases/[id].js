import { badMethod, readSharedCase } from '../../server/case-sharing.js'

export default async function handler(request) {
  if (request.method !== 'GET') return badMethod('GET')
  const id = new URL(request.url).pathname.split('/').filter(Boolean).at(-1) || ''
  return readSharedCase(id)
}
