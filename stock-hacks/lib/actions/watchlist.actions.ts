'use server';

import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { fetchJSON } from './finnhub.actions';

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not found');

    // Better Auth stores users in the "user" collection
    const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>(
        { email }
    );

    if (!user) return [];

    const userId = (user.id as string) || String(user._id || '');
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error('getWatchlistSymbolsByEmail error:', err);
    return [];
  }
}

// Server helper to add or remove a watchlist item by user email
export async function upsertWatchlistItemByEmail(
  email: string,
  symbol: string,
  company: string,
  add = true,
  extra: Partial<{ price: number; change: number; marketCap: number | string; peRatio: number; alert: unknown }> = {}
): Promise<{ ok: boolean } | never> {
  if (!email) throw new Error('No email provided');
  const mongoose = await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection not found');

  // Resolve user id similar to getWatchlistSymbolsByEmail
  const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>(
    { email }
  );
  if (!user) throw new Error('User not found');
  const userId = (user.id as string) || String(user._id || '');
  if (!userId) throw new Error('User id not found');

  if (add) {
    try {
      // create if not exists, add extras if provided
      const doc: any = {
        userId,
        symbol: symbol.toUpperCase(),
        company,
        ...extra,
      };
      await Watchlist.create(doc);
      return { ok: true };
    } catch (err: any) {
      // ignore duplicate key errors
      if (err?.code === 11000) return { ok: true };
      console.error('upsertWatchlistItemByEmail add error:', err);
      throw err;
    }
  } else {
    try {
      await Watchlist.deleteOne({ userId, symbol: symbol.toUpperCase() });
      return { ok: true };
    } catch (err) {
      console.error('upsertWatchlistItemByEmail remove error:', err);
      throw err;
    }
  }
}

// Returns full watchlist documents for a given user email
export async function getWatchlistByEmail(email: string): Promise<Partial<import('@/database/models/watchlist.model').WatchlistItem>[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not found');

    const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>(
      { email }
    );
    if (!user) return [];

    const userId = (user.id as string) || String(user._id || '');
    if (!userId) return [];

    const items = (await Watchlist.find({ userId }).lean()) as any[];

    // Enrich each item with Finnhub market data (quote + profile) when possible
    const token = process.env.FINNHUB_API_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';
    if (!token) return items;

    const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

    const enriched = await Promise.all(
      items.map(async (it) => {
        try {
          const sym = String(it.symbol || '').toUpperCase();
          if (!sym) return it;

          const quoteUrl = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(sym)}&token=${token}`;
          const profileUrl = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(sym)}&token=${token}`;

          const [quote, profile] = await Promise.all([
            fetchJSON<any>(quoteUrl, 60).catch(() => ({})),
            fetchJSON<any>(profileUrl, 3600).catch(() => ({})),
          ]);

          const price = typeof quote?.c === 'number' ? quote.c : undefined;
          const change = typeof quote?.d === 'number' ? quote.d : undefined;
          const marketCap = profile?.marketCapitalization ?? profile?.marketcap ?? undefined;
          const peRatio = profile?.peBasicExclExtraTTM ?? profile?.pe ?? undefined;

          return {
            ...it,
            price,
            change,
            marketCap,
            peRatio,
          };
        } catch (err) {
          console.error('enrich watchlist item error', err);
          return it;
        }
      })
    );

    return enriched as any;
  } catch (err) {
    console.error('getWatchlistByEmail error:', err);
    return [];
  }
}