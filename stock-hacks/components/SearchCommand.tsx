"use client"

import { useEffect, useState, useCallback } from "react"
import { CommandDialog, CommandEmpty, CommandInput, CommandList } from "@/components/ui/command"
import {Button} from "@/components/ui/button";
import {Loader2,  Star,  TrendingUp} from "lucide-react";
import Link from "next/link";
import {searchStocks} from "@/lib/actions/finnhub.actions";
import {useDebounce} from "@/hooks/useDebounce";

export default function SearchCommand({ renderAs = 'button', label = 'Add stock', initialStocks }: SearchCommandProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [stocks, setStocks] = useState<StockWithWatchlistStatus[]>(initialStocks);
  // Keep a local Set of symbols that are in the user's watchlist so the star
  // UI can reflect DB state across dialog open/close/navigation.
  const [watchlistSet, setWatchlistSet] = useState<Set<string>>(new Set());

  const isSearchMode = !!searchTerm.trim();
  const displayStocks = isSearchMode ? stocks : stocks?.slice(0, 10);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const handleSearch = async () => {
    if(!isSearchMode) return setStocks(initialStocks);

    setLoading(true)
    try {
        const results = await searchStocks(searchTerm.trim());
        // map results to include isInWatchlist from our local set
        const mapped = results.map(r => ({ ...r, isInWatchlist: watchlistSet.has(r.symbol?.toUpperCase?.() ?? r.symbol) }));
        setStocks(mapped);
    } catch {
      setStocks([])
    } finally {
      setLoading(false)
    }
  }

  const debouncedSearch = useDebounce(handleSearch, 300);

  useEffect(() => {
    debouncedSearch();
  }, [searchTerm]);

  const handleSelectStock = () => {
    setOpen(false);
    setSearchTerm("");
    setStocks(initialStocks);
  }

  // Helper to toggle watchlist state and call API. Extracted for readability.
  const toggleWatchlist = useCallback(async (e: any, targetStock: StockWithWatchlistStatus) => {
    e.preventDefault();
    e.stopPropagation();

    const original = targetStock.isInWatchlist;

    // optimistic update
    setStocks((prev) => prev.map((s) => (s.symbol === targetStock.symbol ? { ...s, isInWatchlist: !original } : s)));

    try {
      if (!original) {
        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: targetStock.symbol, company: targetStock.name}),
        });
        if (!res.ok) throw new Error('Failed to add');
        // update watchlist set
        setWatchlistSet((prev) => {
          const copy = new Set(prev);
          copy.add(targetStock.symbol.toUpperCase());
          return copy;
        });
      } else {
        const res = await fetch('/api/watchlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: targetStock.symbol, company: targetStock.name}),
        });
        if (!res.ok) throw new Error('Failed to remove');
        setWatchlistSet((prev) => {
          const copy = new Set(prev);
          copy.delete(targetStock.symbol.toUpperCase());
          return copy;
        });
      }
    } catch (err) {
      console.error('watchlist toggle error', err);
      // revert optimistic update on error
      setStocks((prev) => prev.map((s) => (s.symbol === targetStock.symbol ? { ...s, isInWatchlist: original } : s)));
    }
  }, [setStocks]);
  
  useEffect(() => {
    if (!open) return;

    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/watchlist');
        if (!res.ok) return;
        const data = await res.json();
        const syms: string[] = Array.isArray(data?.symbols) ? data.symbols : [];
        const set = new Set(syms.map(s => s?.toUpperCase()));
        if (!mounted) return;
        setWatchlistSet(set);
        setStocks(prev => prev.map(s => ({ ...s, isInWatchlist: set.has(s.symbol?.toUpperCase?.() ?? s.symbol) })));
      } catch (err) {
        // ignore fetch errors
        console.error('failed to load watchlist symbols', err);
      }
    })();

    return () => { mounted = false; };
  }, [open]);

  return (
    <>
      {renderAs === 'text' ? (
          <span onClick={() => setOpen(true)} className="search-text">
            {label}
          </span>
      ): (
          <Button onClick={() => setOpen(true)} className="search-btn">
            {label}
          </Button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen} className="search-dialog">
        <div className="search-field">
          <CommandInput value={searchTerm} onValueChange={setSearchTerm} placeholder="Search stocks..." className="search-input" />
          {loading && <Loader2 className="search-loader" />}
        </div>
        <CommandList className="search-list">
          {loading ? (
              <CommandEmpty className="search-list-empty">Loading stocks...</CommandEmpty>
          ) : displayStocks?.length === 0 ? (
              <div className="search-list-indicator">
                {isSearchMode ? 'No results found' : 'No stocks available'}
              </div>
            ) : (
            <ul>
              <div className="search-count">
                {isSearchMode ? 'Search results' : 'Popular stocks'}
                {` `}({displayStocks?.length || 0})
              </div>
              {displayStocks?.map((stock, i) => (
                  <li key={stock.symbol} className="search-item">
                    <Link
                        href={`/stocks/${stock.symbol}`}
                        onClick={handleSelectStock}
                        className="search-item-link"
                    >
                      <TrendingUp className="h-4 w-4 text-gray-500" />
                      <div  className="flex-1">
                        <div className="search-item-name">
                          {stock.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {stock.symbol} | {stock.exchange } | {stock.type}
                        </div>
                      </div>
                    <button
                        aria-label={stock.isInWatchlist ? `Remove ${stock.symbol} from watchlist` : `Add ${stock.symbol} to watchlist`}
                        title={stock.isInWatchlist ? `Remove ${stock.symbol} from watchlist` : `Add ${stock.symbol} to watchlist`}
                        onClick={(e) => toggleWatchlist(e, stock)}
                        className="ml-3">
                        {stock.isInWatchlist ? (
                          <Star className="star-icon text-yellow-500 fill-current cursor-pointer" />
                        ) : (
                          <Star className="star-icon cursor-pointer " />
                        )}
                    </button>
                    </Link>
                  </li>
              ))}
            </ul>
          )
          }
        </CommandList>
      </CommandDialog>
    </>
  )
}