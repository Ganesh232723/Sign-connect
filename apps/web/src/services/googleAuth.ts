/**
 * googleAuth.ts
 * Direct Google Sign-In via Google Identity Services (GSI).
 * Works independently of Supabase – no backend required.
 *
 * HOW TO GET A CLIENT ID:
 *  1. Go to https://console.cloud.google.com/apis/credentials
 *  2. Create an OAuth 2.0 Web Client
 *  3. Add http://localhost:5173 and http://localhost:5174 to "Authorized JavaScript origins"
 *  4. No redirect URIs needed for the popup flow
 *  5. Paste the Client ID below (or set VITE_GOOGLE_CLIENT_ID in .env)
 */

const env = (import.meta as unknown as { env: Record<string, string> }).env || {}

// ── Replace this or set VITE_GOOGLE_CLIENT_ID in .env ────────────────────────
const GOOGLE_CLIENT_ID = env.VITE_GOOGLE_CLIENT_ID || ''

export interface GoogleUser {
  id: string
  name: string
  email: string
  avatar: string
  provider: 'google'
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void
          prompt: (cb?: (notification: { isNotDisplayed(): boolean; isSkippedMoment(): boolean }) => void) => void
          renderButton: (el: HTMLElement, cfg: object) => void
          cancel: () => void
          revoke: (email: string, cb: () => void) => void
        }
        oauth2: {
          initCodeClient: (cfg: object) => { requestCode: () => void }
          initTokenClient: (cfg: {
            client_id: string
            scope: string
            callback: (resp: { access_token?: string; error?: string }) => void
            prompt?: string
          }) => { requestAccessToken: (cfg?: { prompt?: string }) => void }
        }
      }
    }
  }
}

// ── Wait for GSI script to load ────────────────────────────────────────────
function waitForGsi(timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) { resolve(); return }
    const start = Date.now()
    const iv = setInterval(() => {
      if (window.google?.accounts?.id) { clearInterval(iv); resolve() }
      else if (Date.now() - start > timeoutMs) { clearInterval(iv); reject(new Error('Google GSI failed to load')) }
    }, 100)
  })
}

/**
 * Open the Google account chooser popup.
 * Returns the signed-in user profile, or throws on error/cancel.
 */
export async function signInWithGoogle(): Promise<GoogleUser> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      'VITE_GOOGLE_CLIENT_ID is not set.\n\n' +
      'Add it to apps/web/.env:\n' +
      'VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com\n\n' +
      'Get one at: https://console.cloud.google.com/apis/credentials'
    )
  }

  await waitForGsi()

  return new Promise<GoogleUser>((resolve, reject) => {
    // Use the OAuth2 token client for a popup flow that always shows account picker
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: async (tokenResp) => {
        if (tokenResp.error || !tokenResp.access_token) {
          reject(new Error(tokenResp.error || 'Google sign-in was cancelled'))
          return
        }

        // Fetch user profile from Google userinfo endpoint
        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResp.access_token}` },
          })
          if (!res.ok) throw new Error('Failed to fetch Google profile')
          const info = await res.json() as {
            sub: string; name: string; email: string; picture: string
          }
          resolve({
            id: info.sub,
            name: info.name,
            email: info.email,
            avatar: info.picture,
            provider: 'google',
          })
        } catch (e) {
          reject(e)
        }
      },
    })

    // prompt='select_account' shows account chooser every time (allows switching accounts)
    tokenClient.requestAccessToken({ prompt: 'select_account' })
  })
}
