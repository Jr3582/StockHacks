import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface AlertItem extends Document {
  userId: string;
  company: string;
  symbol: string;
  alertName: string;
  condition?: string;
  frequency?: string;
  alertType?: string;
  value?: number;
  price?: number;
  logoUrl?: string;
  createdAt?: Date;
}

const AlertSchema = new Schema<AlertItem>(
  {
    userId: { type: String, required: true, index: true },
    company: { type: String, required: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    alertName: { type: String, required: true },
    condition: { type: String, required: false },
    frequency: { type: String, required: false },
  alertType: { type: String, required: false },
  value: { type: Number, required: false },
    price: { type: Number, required: false },
    logoUrl: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

AlertSchema.index({ userId: 1, symbol: 1, alertName: 1 });

export const Alert: Model<AlertItem> = (models?.Alert as Model<AlertItem>) || model<AlertItem>('Alert', AlertSchema);
