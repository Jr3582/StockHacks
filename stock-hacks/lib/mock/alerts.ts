export type MockAlert = {
  id: string;
  company: string;
  symbol: string;
  price: number;
  pctChange?: number | null;
  condition?: string;
  frequency?: string;
  logoUrl?: string;
  alertName?: string;
};

export const mockAlerts: MockAlert[] = [
  {
    id: 'apple-1',
    company: 'Apple Inc.',
    symbol: 'AAPL',
    price: 229.65,
    pctChange: 1.4,
    condition: 'Price > $240.60',
    frequency: 'Once per day',
    logoUrl: '/api/logo?symbol=AAPL&proxy=true',
    alertName: 'Apple Price Alert'
  },
  {
    id: 'tesla-1',
    company: 'Tesla, Inc.',
    symbol: 'TSLA',
    price: 192.12,
    pctChange: -0.8,
    condition: 'Price < $200',
    frequency: 'Once per hour',
    logoUrl: '/api/logo?symbol=TSLA&proxy=true',
    alertName: 'Tesla Price Alert'
  }
];

export default mockAlerts;
