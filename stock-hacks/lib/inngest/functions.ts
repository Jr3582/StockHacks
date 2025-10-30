import {inngest} from "@/lib/inngest/client";
import { NEWS_SUMMARY_EMAIL_PROMPT, PERSONALIZED_WELCOME_EMAIL_PROMPT } from "./prompts";
import { sendNewsSummaryEmail, sendWelcomeEmail } from "../nodemailer";
import { getAllUsersForNewsEmail } from "../actions/users.actions";
import { success } from "better-auth";
import { getNews } from "../actions/finnhub.actions";
import { getWatchlistSymbolsByEmail } from "../actions/watchlist.actions";
import { getFormattedTodayDate, evaluateCondition } from "../utils";
import { createHash } from 'node:crypto';
import { connectToDatabase } from '@/database/mongoose';
import { Alert } from '@/database/models/alert.model';
import mongoose from 'mongoose';
import { sendStockAlertEmail } from '@/lib/nodemailer';

export const sendSignUpEmail = inngest.createFunction(
    {id: 'sign-up-email'},
    { event: 'app/user.created'},
    async ({ event, step }) => {
        const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile)

        const response = await step.ai.infer('generate-welcome-intro', {
            model: step.ai.models.gemini({model: 'gemini-2.5-flash-lite'}),
            body: {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt }
                        ]
                    }
                ]
            }
        })

        await step.run('send-welcome-email', async () => {
            const part = response.candidates?.[0]?.content?.parts?.[0];
            const introText = (part && 'text' in part ? part.text : null) || 'Thanks for joining StockHacks. You now have the tools and abilities by your side to track markets and make smarter moves!'

            const { data: {email, name} } = event;
            return await sendWelcomeEmail({
                email,
                name,
                intro: introText
            })
        })

        return {
            success: true,
            message: 'Welcome email sent successfully'
        }
    }
)

export const sendPriceAlerts = inngest.createFunction(
    { id: 'send-price-alerts' },
    [{ cron: '*/1 * * * *' }], // every minute
    async ({ step }) => {
        // Connect to DB
    const mongooseConn = await step.run('connect-db', connectToDatabase) as any;
    const db = mongooseConn.connection.db;
    const dbAny = db as any;

        const FINNHUB_BASE = 'https://finnhub.io/api/v1';
        const token = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY || '';
        if (!token) {
            console.error('Finnhub API key missing - skip price alerts');
            return { success: false, message: 'Missing FINNHUB API key' };
        }

        // 1. fetch alerts
        let alerts: any[] = [];
        try {
            alerts = await Alert.find({}).lean() as any[];
        } catch (e) {
            console.error('Failed to load alerts', e);
            alerts = [];
        }

        if (!alerts || alerts.length === 0) return { success: true, message: 'No alerts to process' };

        // 2. fetch latest quotes for unique symbols
        const symbols = Array.from(new Set((alerts || []).map((a: any) => String(a.symbol || '').toUpperCase()).filter(Boolean)));
        const quoteMap: Record<string, number> = {};

        await Promise.all(symbols.map(async (sym) => {
            try {
                const res = await fetch(`${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(token)}`);
                if (!res.ok) return;
                const j = await res.json();
                const current = typeof j?.c === 'number' ? j.c : undefined;
                if (typeof current === 'number') quoteMap[sym] = current;
            } catch (e) {
                console.error('Failed to fetch quote for', sym, e);
            }
        }));

        const now = Date.now();

        // helper to map frequency -> ms
        const freqToMs = (freq?: string) => {
            switch (freq) {
                case 'every_hour': return 1000 * 60 * 60;
                case 'daily': return 1000 * 60 * 60 * 24;
                case 'weekly': return 1000 * 60 * 60 * 24 * 7;
                case 'monthly': return 1000 * 60 * 60 * 24 * 30;
                default: return 0; // if no frequency provided, allow immediate
            }
        }

    // evaluate each alert
    for (const a of alerts as any[]) {
            try {
                if (!a || a.alertType !== 'price' || typeof a.value !== 'number') continue;
                const sym = String(a.symbol || '').toUpperCase();
                const current = quoteMap[sym];
                if (current === undefined) continue; // couldn't fetch price

                const target = Number(a.value);
                const cond = String(a.condition || '');

                const satisfied = evaluateCondition(cond, current, target);
                if (!satisfied) continue;

                // enforce frequency
                const lastSent = (a.lastSentAt ? new Date(a.lastSentAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0));
                const interval = freqToMs(a.frequency);
                if (interval > 0 && (now - lastSent) < interval) {
                    // not enough time passed since last send
                    continue;
                }

                // find user email
                let user: any = null;
                try {
                    const maybeObjId = (() => {
                        try { return new mongoose.Types.ObjectId(String(a.userId)); } catch (err) { return null; }
                    })();

                    const q: any = { $or: [{ id: String(a.userId) }] };
                    if (maybeObjId) q.$or.push({ _id: maybeObjId });

                    // ensure db exists
                    if (!dbAny) throw new Error('No db connection');
                    user = await dbAny.collection('user').findOne(q, { projection: { email: 1, name: 1 } });
                } catch (e) {
                    console.error('Failed to lookup user for alert', a._id, e);
                }

                const email = user?.email;
                if (!email) continue;

                const direction = ['greater_than', 'greater_than_or_equal_to'].includes(cond) ? 'upper' : 'lower';

                // send email
                try {
                    await step.run('send-alert-email', async () => {
                        return await sendStockAlertEmail({
                            email,
                            symbol: sym,
                            company: a.company,
                            currentPrice: current,
                            targetPrice: target,
                            direction: direction as 'upper' | 'lower',
                        });
                    });

                    // update lastSentAt
                    try {
                        await Alert.findByIdAndUpdate(a._id, { $set: { lastSentAt: new Date() } });
                    } catch (e) {
                        console.error('Failed to update lastSentAt for alert', a._id, e);
                    }
                } catch (e) {
                    console.error('Failed to send alert email for', a._id, e);
                }

            } catch (e) {
                console.error('Error processing alert', a?._id, e);
            }
        }

        return { success: true, processed: alerts.length };
    }
)

export const sendDailyNewsSummary = inngest.createFunction(
    { id: 'daily-news-summary' },
    [ { event: 'app/send.daily.news'}, {cron: '0 17 * * *', timezone: 'America/New_York'}],

    async ({ step }) => {
        // 1. get all users for news delivery
        const users = await step.run('get-all-users', getAllUsersForNewsEmail)

        if(!users || users.length === 0) return { success: false, message: 'No users found for news email'};
        // 2. fetch personalized news for each user

        const results = await step.run('fetch-user-news', async () => {
        const perUser: Array<{ user: User; articles: MarketNewsArticle[] }> = [];
        for (const user of users as User[]) {
            try {
                const symbols = await getWatchlistSymbolsByEmail(user.email);
                let articles = await getNews(symbols);
                // Enforce max 6 articles per user
                articles = (articles || []).slice(0, 6);
                // If still empty, fallback to general
                if (!articles || articles.length === 0) {
                    articles = await getNews();
                    articles = (articles || []).slice(0, 6);
                }
                perUser.push({ user, articles });
            } catch (e) {
                const masked = user.email.replace(/(^.).*(@.*$)/, '$1***$2');
                console.error('daily-news: error preparing user news', masked, e);
                perUser.push({ user, articles: [] });
            }
        }
        return perUser;
        });

        // 3. summarize news via AI
        const userNewsSummaries: { user: User; newsContent: string | null }[] = [];

        for (const { user, articles } of results) {
                try {
                    const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace('{{newsData}}', JSON.stringify(articles, null, 2));

                    const key = createHash('sha256').update(user.email).digest('hex').slice(0, 8);
                    const response = await step.ai.infer(`summarize-news-${key}`, {
                        model: step.ai.models.gemini({ model: 'gemini-2.5-flash-lite' }),
                        body: {
                            contents: [{ role: 'user', parts: [{ text:prompt }]}]
                        }
                    });

                    const part = response.candidates?.[0]?.content?.parts?.[0];
                    const newsContent = (part && 'text' in part ? part.text : null) || 'No market news.'

                    userNewsSummaries.push({ user, newsContent });
                } catch (e) {
                    console.error('Failed to summarize news for : ', user.email);
                    userNewsSummaries.push({ user, newsContent: null });
                }
            }
        // 4. send emails
        await step.run('send-news-emails', async () => {
        await Promise.all(
            userNewsSummaries.map(async ({ user, newsContent}) => {
                if(!newsContent) return false;

                return await sendNewsSummaryEmail({ email: user.email, date: getFormattedTodayDate(), newsContent })
                })
            )
        })

        return { success: true, message: 'Daily news summary emails sent successfully' }
    }
)