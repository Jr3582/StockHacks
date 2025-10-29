"use client"

import { useEffect, useState, useCallback } from "react"
import { CommandDialog, CommandEmpty, CommandInput, CommandList } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Loader2, Star, TrendingUp } from "lucide-react"
import { searchStocks } from "@/lib/actions/finnhub.actions"
import { useDebounce } from "@/hooks/useDebounce"

export default function AddStockButton({ label = 'Add Stock', initialStocks = [] }: { label?: string; initialStocks?: StockWithWatchlistStatus[] }) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [stocks, setStocks] = useState<StockWithWatchlistStatus[]>(initialStocks)
  const [watchlistSet, setWatchlistSet] = useState<Set<string>>(new Set())

  const isSearchMode = !!searchTerm.trim()
  const displayStocks = isSearchMode ? stocks : stocks?.slice(0, 10)

  const handleSearch = async () => {
    if (!isSearchMode) return setStocks(initialStocks)
    setLoading(true)
    try {
      const results = await searchStocks(searchTerm.trim())
      const mapped = results.map((r: any) => ({ ...r, isInWatchlist: watchlistSet.has((r.symbol || '').toUpperCase()) }))
      setStocks(mapped)
    } catch (err) {
      setStocks([])
    } finally {
      setLoading(false)
    }
  }

  const debouncedSearch = useDebounce(handleSearch, 300)
  useEffect(() => { debouncedSearch() }, [searchTerm])

  useEffect(() => {
    if (!open) return
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/watchlist')
        if (!res.ok) return
        const data = await res.json()
        const syms: string[] = Array.isArray(data?.symbols) ? data.symbols : []
        const set = new Set(syms.map(s => (s || '').toUpperCase()))
        if (!mounted) return
        setWatchlistSet(set)
        setStocks(prev => prev.map(s => ({ ...s, isInWatchlist: set.has((s.symbol || '').toUpperCase()) })))
      } catch (err) {
        console.error('failed to load watchlist symbols', err)
      }
    })()
    return () => { mounted = false }
  }, [open])

  const toggleWatchlist = useCallback(async (target: StockWithWatchlistStatus) => {
    const original = !!target.isInWatchlist
    // optimistic update
    setStocks(prev => prev.map(s => (s.symbol === target.symbol ? { ...s, isInWatchlist: !original } : s)))
    try {
      if (!original) {
        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: target.symbol, company: target.name }),
        })
        if (!res.ok) throw new Error('Failed to add')
        setWatchlistSet(prev => { const c = new Set(prev); c.add((target.symbol || '').toUpperCase()); return c })
      } else {
        const res = await fetch('/api/watchlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: target.symbol, company: target.name }),
        })
        if (!res.ok) throw new Error('Failed to remove')
        setWatchlistSet(prev => { const c = new Set(prev); c.delete((target.symbol || '').toUpperCase()); return c })
      }
    } catch (err) {
      console.error('watchlist toggle error', err)
      // revert
      setStocks(prev => prev.map(s => (s.symbol === target.symbol ? { ...s, isInWatchlist: original } : s)))
    }
  }, [])

  const handleSelectStock = async (stock: StockWithWatchlistStatus) => {
    await toggleWatchlist(stock)
    // close dialog and reset search
    setOpen(false)
    setSearchTerm("")
    setStocks(initialStocks)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex justify-end bg-yellow-400 text-black hover:bg-yellow-300 shadow-md font-bold">
        {label}
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="search-field">
          <CommandInput value={searchTerm} onValueChange={setSearchTerm} placeholder="Search stocks..." className="search-input" />
          {loading && <Loader2 className="search-loader" />}
        </div>
        <CommandList className="search-list">
          {loading ? (
            <CommandEmpty className="search-list-empty">Loading stocks...</CommandEmpty>
          ) : displayStocks?.length === 0 ? (
            <div className="search-list-indicator">{isSearchMode ? 'No results found' : 'No stocks available'}</div>
          ) : (
            <ul>
              <div className="search-count">{isSearchMode ? 'Search results' : 'Popular stocks'} ({displayStocks?.length || 0})</div>
              {displayStocks?.map((stock) => (
                <li key={stock.symbol} className="search-item">
                  <button onClick={() => handleSelectStock(stock)} className="search-item-link">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <div className="flex-1 text-left">
                      <div className="search-item-name">{stock.name}</div>
                      <div className="text-sm text-gray-500">{stock.symbol} | {stock.exchange} | {stock.type}</div>
                    </div>
                    <span className="ml-3">
                      {stock.isInWatchlist ? (
                        <Star className="star-icon text-yellow-500 fill-current cursor-pointer" />
                      ) : (
                        <Star className="star-icon cursor-pointer" />
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
