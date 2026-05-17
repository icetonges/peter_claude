import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'url is required' }, { status: 400 })
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PeterClaude/1.0; +https://peterclaude.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml,text/plain,*/*',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      return Response.json({ error: `HTTP ${res.status}: ${res.statusText}` }, { status: 400 })
    }

    const contentType = res.headers.get('content-type') || ''
    let rawText = await res.text()

    // Strip HTML to readable text
    if (contentType.includes('text/html')) {
      rawText = rawText
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\t/g, ' ')
        .replace(/[ ]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    }

    // Cap at 40 KB to stay within context limits
    const MAX = 40_000
    if (rawText.length > MAX) {
      rawText = rawText.slice(0, MAX) + `\n\n[… content truncated at ${MAX} characters]`
    }

    return Response.json({ text: rawText, url, contentType })
  } catch (err: any) {
    return Response.json({ error: err.message || 'Fetch failed' }, { status: 500 })
  }
}
