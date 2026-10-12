/** Next.js server start hook: starts the commerce scheduler loop and the IMAP mail receiver (production only, nodejs runtime). */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/commerce/scheduler/engine')
    startScheduler()
    const { startMailSync } = await import('./lib/mail/imap-sync')
    startMailSync()
  }
}
