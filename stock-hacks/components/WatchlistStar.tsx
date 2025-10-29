"use client"

import { useCallback, useState } from "react";
import { Star } from "lucide-react";

export default function WatchlistStar({ symbol, company, initialInWatchlist = true }: { symbol: string; company?: string; initialInWatchlist?: boolean }) {
  const [isInWatchlist, setIsInWatchlist] = useState<boolean>(!!initialInWatchlist);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async (e: any) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const original = isInWatchlist;
    // optimistic
    setIsInWatchlist(!original);
    setLoading(true);

    try {
      if (!original) {
        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, company }),
        });
        if (!res.ok) throw new Error('Failed to add to watchlist');
      } else {
        const res = await fetch('/api/watchlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, company }),
        });
        if (!res.ok) throw new Error('Failed to remove from watchlist');
        // On successful remove, reload the page so server-rendered watchlist updates
        // (The parent page is a server component and will re-fetch the watchlist)
        window.location.reload();
      }
    } catch (err) {
      console.error('watchlist toggle error', err);
      // revert optimistic update
      setIsInWatchlist(original);
    } finally {
      setLoading(false);
    }
  }, [isInWatchlist, symbol, company]);

  return (
    <button
      aria-label={isInWatchlist ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      title={isInWatchlist ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      onClick={toggle}
      className="ml-0 p-0"
      disabled={loading}
    >
      {isInWatchlist ? (
        <Star className="star-icon text-yellow-500 fill-current cursor-pointer" />
      ) : (
        <Star className="star-icon cursor-pointer" />
      )}
    </button>
  );
}
