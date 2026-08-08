type Env = {
  SUPABASE_URL: string
  SUPABASE_PUBLISHABLE_KEY: string
}

async function pingSupabase(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase diagnostics variables are not configured')
  }

  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/nexus_keepalive`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Nexus-OS-Cloudflare-Diagnostics/1.0',
    },
    body: '{}',
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Supabase diagnostics failed (${response.status}): ${body}`)
  }

  return response.json()
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/health') {
      return Response.json({
        ok: true,
        service: 'nexus-os-web',
        runtime: 'cloudflare-workers',
        timestamp: new Date().toISOString(),
      })
    }

    if (url.pathname === '/api/system/supabase') {
      try {
        const supabase = await pingSupabase(env)
        return Response.json({ ok: true, supabase, timestamp: new Date().toISOString() })
      } catch (error) {
        return Response.json(
          { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
          { status: 503 },
        )
      }
    }

    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    return new Response('Not found', { status: 404 })
  },
}
