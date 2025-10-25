"use client";
import React, { useMemo, useState } from "react";

// Minimal WatchlistButton implementation to satisfy page requirements.
// This component focuses on UI contract only. It toggles local state and
// calls onWatchlistChange if provided. Styling hooks match globals.css.

const WatchlistButton = ({
  symbol,
  company,
  isInWatchlist,
  showTrashIcon = false,
  type = "button",
  onWatchlistChange,
}: WatchlistButtonProps) => {
  const [added, setAdded] = useState<boolean>(!!isInWatchlist);

  // On mount, fetch the user's watchlist symbols and set initial state
  // so the button reflects DB membership across navigation.
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/watchlist');
        if (!res.ok) return;
        const data = await res.json();
        const syms: string[] = Array.isArray(data?.symbols) ? data.symbols : [];
        if (!mounted) return;
        const has = syms.map(s => s?.toUpperCase()).includes(String(symbol).toUpperCase());
        setAdded(!!has);
      } catch (err) {
        // ignore
        // console.error('failed to load watchlist symbols', err);
      }
    })();

    return () => { mounted = false; };
  }, [symbol]);

  const label = useMemo(() => {
    if (type === "icon") return added ? "" : "";
    return added ? "Remove from Watchlist" : "Add to Watchlist";
  }, [added, type]);

  const handleClick = async () => {
    const next = !added;
    // optimistic update
    setAdded(next);
    onWatchlistChange?.(symbol, next);

    try {
      if (next) {
        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, company: company ?? symbol }),
        });
        if (!res.ok) throw new Error('Failed to add to watchlist');
      } else {
        const res = await fetch('/api/watchlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol }),
        });
        if (!res.ok) throw new Error('Failed to remove from watchlist');
      }
    } catch (err) {
      console.error('watchlist toggle error', err);
      // revert optimistic
      setAdded(!next);
      onWatchlistChange?.(symbol, !next);
    }
  };

  return (
    <button className={`watchlist-btn ${added ? "watchlist-remove" : ""}`} onClick={handleClick}>
      {showTrashIcon && added ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5 mr-2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 4v6m4-6v6m4-6v6" />
        </svg>
      ) : null}
      <span>{label}</span>
    </button>
  );
};

export default WatchlistButton;