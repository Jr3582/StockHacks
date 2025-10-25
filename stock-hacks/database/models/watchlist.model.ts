import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface WatchlistItem extends Document {
  userId: string;
  symbol: string;
  company: string;
  addedAt: Date;
  price?: number;
  change?: number;
  marketCap?: number | string;
  peRatio?: number;
  alert?: unknown;
}

const WatchlistSchema = new Schema<WatchlistItem>(
  {
    userId: { type: String, required: true, index: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    company: { type: String, required: true, trim: true },
    addedAt: { type: Date, default: Date.now },
    price: { type: Number, required: false },
    change: { type: Number, required: false },
    marketCap: { type: Schema.Types.Mixed, required: false },
    peRatio: { type: Number, required: false },
    alert: { type: Schema.Types.Mixed, required: false },
  },
  { timestamps: false }
);

// Prevent duplicate symbols per user
WatchlistSchema.index({ userId: 1, symbol: 1 }, { unique: true });

export const Watchlist: Model<WatchlistItem> =
  (models?.Watchlist as Model<WatchlistItem>) || model<WatchlistItem>('Watchlist', WatchlistSchema);