import { NextResponse } from 'next/server'
import { auth } from '@/lib/better-auth/auth'

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie')

    // forward headers to better-auth session resolver
    const session = await auth.api.getSession({ headers: Object.fromEntries(req.headers as any) })

    return NextResponse.json({ ok: true, cookieHeader, session })
  } catch (err) {
    console.error('debug/session error', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
