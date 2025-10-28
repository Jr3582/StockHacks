import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get('symbol') || '';
    const provider = (url.searchParams.get('provider') || 'finnhub').toLowerCase();

    if (!symbol) {
      return NextResponse.json({ error: 'symbol required' }, { status: 400 });
    }

    const proxy = url.searchParams.get('proxy') === 'true';

    if (provider === 'finnhub') {
      const key = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
      if (!key) return NextResponse.json({ error: 'missing FINNHUB_API_KEY' }, { status: 500 });

      const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`);
      if (!res.ok) {
        return NextResponse.json({ error: 'failed fetching from finnhub', status: res.status }, { status: 502 });
      }

      const data = await res.json();
      const logo = data?.logo ?? null;

      if (!logo) return NextResponse.json({ logo: null }, { status: 200 });

      // If proxy=true, fetch the logo bytes and return the image directly so <img src="/api/logo?symbol=...&proxy=true" /> works.
      if (proxy) {
        try {
          const imgRes = await fetch(logo);
          if (!imgRes.ok) return NextResponse.json({ error: 'failed fetching logo asset' }, { status: 502 });

          const contentType = imgRes.headers.get('content-type') || 'image/png';
          const buffer = await imgRes.arrayBuffer();

          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
            }
          });
        } catch (err) {
          return NextResponse.json({ error: 'failed proxying logo' }, { status: 502 });
        }
      }

      // Return the logo URL (client can choose to use it directly or proxy it)
      return NextResponse.json({ logo }, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
        }
      });
    }

    return NextResponse.json({ error: 'unsupported provider' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
