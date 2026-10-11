import { NextResponse } from 'next/server'
import { PlacesError } from './places'
import { respond } from './http'

/** Same mapping as respond(), plus Google/search errors with their own status and message. */
export async function respondPlaces<T>(fn: () => Promise<T>, okStatus = 200): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn(), { status: okStatus })
  } catch (e) {
    if (e instanceof PlacesError) return NextResponse.json({ error: e.message }, { status: e.status })
    return respond(async () => { throw e })
  }
}
