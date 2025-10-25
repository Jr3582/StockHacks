import { NextResponse } from 'next/server';
import { auth } from '@/lib/better-auth/auth';
import { upsertWatchlistItemByEmail, getWatchlistSymbolsByEmail } from '@/lib/actions/watchlist.actions';
import { fetchJSON } from '@/lib/actions/finnhub.actions';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';

async function fetchMarketDataForSymbol(symbol: string) {
  try {
    if (!FINNHUB_TOKEN) return {};
    const quoteUrl = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_TOKEN}`;
    const profileUrl = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_TOKEN}`;
    const [quote, profile] = await Promise.all([
      fetchJSON<any>(quoteUrl, 60).catch(() => ({})),
      fetchJSON<any>(profileUrl, 3600).catch(() => ({})),
    ]);

    const price = typeof quote?.c === 'number' ? quote.c : undefined;
    const change = typeof quote?.d === 'number' ? quote.d : undefined;
    // profile may have marketCapitalization or marketCapitalization
    const marketCap = profile?.marketCapitalization ?? profile?.marketcap ?? undefined;
    // Try to pick PE ratio if present on profile
    const peRatio = profile?.peBasicExclExtraTTM ?? profile?.pe ?? undefined;

    return { price, change, marketCap, peRatio };
  } catch (err) {
    console.error('fetchMarketDataForSymbol error', err);
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, company } = body || {};
    if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });

    // get session via the better-auth api helper, forwarding request headers
    const session = await auth.api.getSession({ headers: Object.fromEntries(req.headers as any) as any });
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const market = await fetchMarketDataForSymbol(symbol);

    await upsertWatchlistItemByEmail(email, symbol, company || symbol, true, market);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('watchlist POST error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: Object.fromEntries(req.headers as any) as any });
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const symbols = await getWatchlistSymbolsByEmail(email);
    return NextResponse.json({ symbols });
  } catch (err) {
    console.error('watchlist GET error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { symbol } = body || {};
    if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });

    const session = await auth.api.getSession({ headers: Object.fromEntries(req.headers as any) as any });
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    await upsertWatchlistItemByEmail(email, symbol, symbol, false);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('watchlist DELETE error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
