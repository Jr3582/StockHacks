import { NextResponse } from 'next/server';
import { auth } from '@/lib/better-auth/auth';
import { connectToDatabase } from '@/database/mongoose';
import { Alert } from '@/database/models/alert.model';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { company, symbol, alertName, condition, frequency, alertType, value } = body || {};
    // coerce incoming value to number when possible so DB stores numeric threshold
    let numValue: number | undefined = undefined;
    if (typeof value === 'number') numValue = value;
    else if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (!Number.isNaN(n) && Number.isFinite(n)) numValue = n;
    }
    if (!symbol || !alertName) return NextResponse.json({ error: 'Missing symbol or alertName' }, { status: 400 });

    const session = await auth.api.getSession({ headers: Object.fromEntries(req.headers as any) as any });
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not found');

    const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const userId = (user.id as string) || String(user._id || '');

    // Try to fetch logo from Finnhub profile
    let logoUrl: string | undefined = undefined;
    let price: number | undefined = undefined;
    let pctChange: number | undefined = undefined;
    try {
      const key = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
      if (key) {
        const res = await fetch(`${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.logo) logoUrl = data.logo;
        }
        // fetch quote to get current price and percent change vs previous close
        try {
          const qRes = await fetch(`${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`);
          if (qRes.ok) {
            const qData = await qRes.json();
            const current = typeof qData?.c === 'number' ? qData.c : undefined;
            const prevClose = typeof qData?.pc === 'number' ? qData.pc : undefined;
            if (typeof current === 'number') price = current;
            if (typeof current === 'number' && typeof prevClose === 'number' && prevClose !== 0) {
              pctChange = ((current - prevClose) / prevClose) * 100;
            }
          }
        } catch (err) {
          console.error('fetch finnhub quote error', err);
        }
      }
    } catch (err) {
      console.error('fetch finnhub logo error', err);
    }

    const doc: any = {
      userId,
      company: company || symbol,
      symbol: String(symbol).toUpperCase(),
      alertName,
      condition,
      frequency,
      alertType,
      value: numValue,
      price,
      pctChange,
      logoUrl,
      createdAt: new Date(),
    };

    const created = await Alert.create(doc);
    return NextResponse.json({ ok: true, alert: created });
  } catch (err) {
    console.error('alerts POST error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: Object.fromEntries(req.headers as any) as any });
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not found');
    const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const userId = (user.id as string) || String(user._id || '');

    let alerts = await Alert.find({ userId }).lean();

    // coerce any stored string values to numbers for consistency when returning to the client
    try {
      alerts = (alerts || []).map((a: any) => {
        if (a && typeof a.value === 'string' && a.value.trim() !== '') {
          const maybe = Number(a.value);
          if (!Number.isNaN(maybe) && Number.isFinite(maybe)) a.value = maybe;
        }
        return a;
      });
    } catch (err) {
      // ignore coercion errors
    }

    // Enrich with live Finnhub quote (current price and percent change) when possible
    try {
      const key = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
      if (key && alerts && alerts.length > 0) {
        const quotePromises = alerts.map(async (a: any) => {
          try {
            const qRes = await fetch(`${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(String(a.symbol))}&token=${encodeURIComponent(key)}`);
            if (!qRes.ok) return a;
            const q = await qRes.json();
            const current = typeof q?.c === 'number' ? q.c : undefined;
            const prevClose = typeof q?.pc === 'number' ? q.pc : undefined;
            if (typeof current === 'number') a.price = current;
            if (typeof current === 'number' && typeof prevClose === 'number' && prevClose !== 0) {
              a.pctChange = ((current - prevClose) / prevClose) * 100;
            }
            return a;
          } catch (err) {
            console.error('enrich alert quote error', err);
            return a;
          }
        });

        alerts = await Promise.all(quotePromises);
      }
    } catch (err) {
      console.error('alerts GET enrich error', err);
    }

    return NextResponse.json({ alerts });
  } catch (err) {
    console.error('alerts GET error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const session = await auth.api.getSession({ headers: Object.fromEntries(req.headers as any) as any });
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not found');
    const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const userId = (user.id as string) || String(user._id || '');

    // delete only alert that belongs to this user
    const deleted = await Alert.findOneAndDelete({ _id: id, userId });
    if (!deleted) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (err) {
    console.error('alerts DELETE error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json();
    const { company, symbol, alertName, condition, frequency, alertType, value } = body || {};
    // coerce incoming value to number when possible
    let numValue: number | undefined = undefined;
    if (typeof value === 'number') numValue = value;
    else if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (!Number.isNaN(n) && Number.isFinite(n)) numValue = n;
    }

    const session = await auth.api.getSession({ headers: Object.fromEntries(req.headers as any) as any });
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection not found');
    const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const userId = (user.id as string) || String(user._id || '');

    const update: any = {};
    if (company !== undefined) update.company = company;
    if (symbol !== undefined) update.symbol = String(symbol).toUpperCase();
    if (alertName !== undefined) update.alertName = alertName;
    if (condition !== undefined) update.condition = condition;
    if (frequency !== undefined) update.frequency = frequency;
    if (alertType !== undefined) update.alertType = alertType;
    if (numValue !== undefined) update.value = numValue;

    if (Object.keys(update).length === 0) return NextResponse.json({ error: 'No update fields' }, { status: 400 });

    const updated = await Alert.findOneAndUpdate({ _id: id, userId }, { $set: update }, { new: true });
    if (!updated) return NextResponse.json({ error: 'Alert not found or not owned' }, { status: 404 });

    return NextResponse.json({ ok: true, alert: updated });
  } catch (err) {
    console.error('alerts PUT error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
