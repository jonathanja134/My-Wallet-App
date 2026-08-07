import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('finance_positions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message, details: error.details, hint: error.hint, code: error.code }, { status: 500 })

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const positions = Array.isArray(body.positions) ? body.positions : []

  // Normalize and attach user_id
  const toInsert = positions.map((p: any) => {
    const base: any = {
      user_id: user.id,
      ticker: p.ticker || null,
      name: p.name || null,
      date: p.date || null,
      price: p.price ?? null,
      qty: p.qty ?? null,
    }
    // Only include id if it's a valid UUID; otherwise let DB generate it
    if (p.id && typeof p.id === 'string' && uuidRegex.test(p.id)) base.id = p.id
    return base
  })

  try {
    if (!toInsert.length) {
      return NextResponse.json({ success: true, inserted: [] })
    }

    const { data: inserted, error } = await supabase
      .from('finance_positions')
      .upsert(toInsert, { onConflict: 'id' })
      .select('*')
    if (error) return NextResponse.json({ error: error.message, details: error.details, hint: error.hint, code: error.code }, { status: 500 })
    return NextResponse.json({ success: true, inserted: inserted || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id: any) => typeof id === 'string' && uuidRegex.test(id))
    : body.id && typeof body.id === 'string' && uuidRegex.test(body.id)
      ? [body.id]
      : []

  if (!ids.length) {
    return NextResponse.json({ error: 'Missing valid position id to delete' }, { status: 400 })
  }

  const { error } = await supabase
    .from('finance_positions')
    .delete()
    .in('id', ids)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message, details: error.details, hint: error.hint, code: error.code }, { status: 500 })
  return NextResponse.json({ success: true, deleted: ids })
}
