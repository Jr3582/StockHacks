import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";
import { getWatchlistByEmail } from "@/lib/actions/watchlist.actions";
import { Star } from "lucide-react";
import WatchlistStar from "@/components/WatchlistStar";
import { Button } from "@/components/ui/button";
import AddStockButton from "@/components/AddStockButton";
import TradingViewWidget from "@/components/TradingViewWidget";
import AlertCard from "@/components/AlertCard";
import CreateAlertButton from "@/components/CreateAlertButton";
import AlertsList from "@/components/AlertsList";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  TOP_STORIES_WIDGET_CONFIG,
  WATCHLIST_TABLE_HEADER,
} from "@/lib/constants";

function fmtPrice(v: unknown) {
    if (typeof v === 'number') return `$${v.toFixed(2)}`;
    return '-';
}

async function fetchPriceChange(symbol: string) {
    const key = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!key) return null;

    try {
      // fetch quote (contains previous close `pc` and current `c`)
      const qRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`);
      const quote = await qRes.json();

      const prevClose = typeof quote?.pc === 'number' && quote.pc > 0 ? quote.pc : null;
      const currentPrice = typeof quote?.c === 'number' && quote.c > 0 ? quote.c : null;

      if (prevClose && currentPrice && prevClose > 0) {
        const pct = ((currentPrice - prevClose) / prevClose) * 100;
        return pct;
      }

      return null;
    } catch (err) {
      console.error('fetchSincePrevClosePriceChange error', symbol, err);
      return null;
    }
}

function fmtMarketCap(v: unknown) {
    if (typeof v === 'number') {
        if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}T`;
        if (v >= 1_000) return `${(v / 1_000).toFixed(2)}B`;
        return `${v}`;
    }
    if (typeof v === 'string') return v;
    return '-';
}

function fmtPe(v: unknown) {
  if (typeof v === 'number') return v.toFixed(2);
  return '-';
}

function fmtPctChange(v: unknown) {
  if (typeof v === 'number') {
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toFixed(2)}%`;
  }
  return '-';
}

export default async function WatchlistPage({params}: StockDetailsPageProps) {
  const { symbol } = params;
  const scriptUrl = 'https://s3.tradingview.com/external-embedding/embed-widget-'

  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email ?? '';

  const items = email ? await getWatchlistByEmail(email) : [];
  const pricePctArr = await Promise.all(items.map((it: any) =>
    fetchPriceChange(String(it.symbol)).catch(() => null)
  ));
  const pricePctMap = new Map<string, number | null>();
  
  items.forEach((it: any, idx: number) => pricePctMap.set(String(it.symbol).toUpperCase(), pricePctArr[idx] ?? null));

  // alerts are rendered client-side (AlertsList)

    return (
        <div className="flex min-h-screen home-wrapper">
                <section className="grid w-full gap-8 home-section">
                    <div className="md-col-span xl:col-span-2">
                      <div className="flex items-center justify-between pb-4">
                        <h1 className="text-2xl text-gray-100 font-semibold watchlist-title">Your Watchlist</h1>
                        <AddStockButton />
                      </div>
                      <div className="table-wrapper">
                        <div className="table-scroll">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    {WATCHLIST_TABLE_HEADER.slice(0).map((header) => (
                                        <TableHead className="w-[200px]" key={header}>{header}</TableHead>
                                    ))}
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                {items.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={WATCHLIST_TABLE_HEADER.length} className="py-6 text-center text-gray-400">Your watchlist is empty.</TableCell>
                                  </TableRow>
                                ) : (
                                  items.map((it: any) => (
                                    <TableRow key={String(it.symbol)}>
                                      <TableCell>
                                        <WatchlistStar symbol={String(it.symbol).toUpperCase()} company={it.company} initialInWatchlist={true} />
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        <Link
                                          href={`/stocks/${String(it.symbol).toLowerCase()}`}
                                          className="text-yellow-400 hover:underline hover:text-yellow-300 transition-colors duration-200">
                                          {it.company}
                                        </Link>
                                      </TableCell>
                                      <TableCell>{String(it.symbol).toUpperCase()}</TableCell>
                                      <TableCell>{fmtPrice(it.price)}</TableCell>
                                      <TableCell className={(() => {
                                        const pct = pricePctMap.get(String(it.symbol).toUpperCase());
                                        return typeof pct === 'number' ? (pct >= 0 ? 'text-green-400' : 'text-red-400') : '';
                                      })()}>{fmtPctChange(pricePctMap.get(String(it.symbol).toUpperCase()))}</TableCell>
                                      <TableCell>{fmtMarketCap(it.marketCap)}</TableCell>
                                      <TableCell>{fmtPe(it.peRatio)}</TableCell>
                                      <TableCell>
                                        <Button className="add-alert">
                                          Add Alert
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                    <div className="md: col-span-1 xl:col-span-1">
                      <div className="flex items-center justify-between pb-4">
                        <h1 className="text-2xl text-gray-100 font-semibold watchlist-title">Alerts</h1>
                        <CreateAlertButton />
                      </div>
                        <div className="table-wrapper">
                          <div className="table-scroll">
                            <div className="space-y-3">
                              <AlertsList />
                            </div>

                          </div>
                        </div>
                    </div> 
                </section>
                <section className="grid w-full gap-8 home-section">
                  <div className="md:col-span-1 xl:col-span-3">
                    <TradingViewWidget 
                      title="News"
                      scriptUrl={`${scriptUrl}timeline.js`}
                      config={TOP_STORIES_WIDGET_CONFIG}
                      className="custom-chart"
                      height={600}
                    />
                  </div>
                </section>
            </div>
    );
}
