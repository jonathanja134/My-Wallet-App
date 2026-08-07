import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const reqUrl = new URL(request.url)
    // Strip the /api/yahoo prefix to forward the remaining path and query
    const path = reqUrl.pathname.replace(/^\/api\/yahoo/, '') + reqUrl.search
    const target = `https://query1.finance.yahoo.com${path}`

    const res = await fetch(target, {
      method: 'GET',
      headers: {
        // Forward a minimal set; avoid forwarding host/connection headers
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
