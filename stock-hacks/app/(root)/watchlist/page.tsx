import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
    WATCHLIST_TABLE_HEADER,
} from "@/lib/constants";

export default async function WatchlistPage({params}: StockDetailsPageProps) {
    const { symbol } = await params;
    const scriptUrl = 'https://s3.tradingview.com/external-embedding/embed-widget-'

    const session = await auth.api.getSession({ headers: await headers() });
    const email = session?.user?.email ?? '';

    const symbols = email ? await getWatchlistSymbolsByEmail(email) : [];

    return (
        <div>
            <h1 className="text-2xl text-gray-100 font-semibold mb-4 watchlist-title">Your Watchlist</h1>
            <div className="flex min-h-screen p-4 md:p-6 lg:p-8">
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 w-full"> 
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {WATCHLIST_TABLE_HEADER.slice(1).map((header) => (
                                    <TableHead className="w-[200px]" key={header}>{header}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">INV001</TableCell>
                                <TableCell>Paid</TableCell>
                                <TableCell>Credit Card</TableCell>
                                <TableCell className="text-right">$250.00</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </section>
            </div>
        </div>
    );
}
