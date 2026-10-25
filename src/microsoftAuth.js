import { PublicClientApplication } from '@azure/msal-browser'

const msalConfig = {
  auth: {
    clientId: '783680c7-c4fc-4028-bacd-e25497f40334',
    authority: 'https://login.microsoftonline.com/3ac7d9e7-5765-41cc-8e82-3c27d62cea00',
    redirectUri: window.location.origin + '/',
    postLogoutRedirectUri: window.location.origin + '/',
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
}

const loginRequest = {
  scopes: ['User.Read', 'Files.ReadWrite.AppFolder'],
}

export const microsoftAuth = new PublicClientApplication(msalConfig)
let initialized = false

// M-CROSS_MICROSOFT_SIGNIN_REDIRECT_V4
export async function initializeMicrosoftAuth() {
  if (!initialized) {
    await microsoftAuth.initialize()
    initialized = true
  }

  let redirectResult = null
  try {
    redirectResult = await microsoftAuth.handleRedirectPromise()
  } catch (error) {
    if (error?.errorCode !== 'no_token_request_cache_error') throw error
  }

  if (redirectResult?.account) microsoftAuth.setActiveAccount(redirectResult.account)
  const account = microsoftAuth.getActiveAccount() || microsoftAuth.getAllAccounts()[0] || null
  if (account) microsoftAuth.setActiveAccount(account)
  return account
}

export async function signInMicrosoft() {
  await initializeMicrosoftAuth()
  await microsoftAuth.loginRedirect({
    ...loginRequest,
    redirectUri: window.location.origin + '/',
  })
  return null
}

export async function signOutMicrosoft() {
  await initializeMicrosoftAuth()
  const account = microsoftAuth.getActiveAccount() || microsoftAuth.getAllAccounts()[0]
  if (!account) return
  await microsoftAuth.logoutPopup({ account, postLogoutRedirectUri: window.location.origin + '/' })
}

export function getMicrosoftAccount() {
  return microsoftAuth.getActiveAccount() || microsoftAuth.getAllAccounts()[0] || null
}
