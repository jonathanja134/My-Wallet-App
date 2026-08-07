import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: { path?: string[] } }) {
  try {
    // `params` can be a promise in some Next versions — await it before use
    const p = await params as { path?: string[] };
    // Reconstruct the tail path from params.path
    const tail = p?.path?.length ? `/${p.path.join('/')}` : ''
    const reqUrl = new URL(request.url)
    const search = reqUrl.search || ''
    const target = `https://query1.finance.yahoo.com${tail}${search}`

    const res = await fetch(target, {
      method: 'GET',
      headers: {
        'User-Agent': request.headers.get('user-agent') || 'next-proxy',
        Accept: 'application/json,*/*',
      },
    })

    const contentType = res.headers.get('content-type') || 'application/json'
    const body = await res.arrayBuffer()

    return new NextResponse(Buffer.from(body), {
      status: res.status,
      headers: {
        'content-type': contentType,
      },
    })
  } catch (e) {
    return new NextResponse(JSON.stringify({ error: (e as Error).message }), { status: 502, headers: { 'content-type': 'application/json' } })
  }
}
