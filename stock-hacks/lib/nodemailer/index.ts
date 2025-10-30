import nodemailer from 'nodemailer';
import { NEWS_SUMMARY_EMAIL_TEMPLATE, WELCOME_EMAIL_TEMPLATE, STOCK_ALERT_UPPER_EMAIL_TEMPLATE, STOCK_ALERT_LOWER_EMAIL_TEMPLATE } from './template';

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL!,
        pass: process.env.NODEMAILER_PASSWORD!
    }
})

export const sendWelcomeEmail = async ({ email, name, intro }: WelcomeEmailData) => {
    const htmlTemplate = WELCOME_EMAIL_TEMPLATE.replace('{{name}}', name). replace('{{intro}}', intro);

    const mailOptions = {
        from: `StockHacks`,
        to: email,
        subject: `Welcome to StockHacks - your stock market toolkiet is ready!`,
        text: `Thanks for joining StockHacks`,
        html: htmlTemplate,
    }

    await transporter.sendMail(mailOptions);
}

export const sendNewsSummaryEmail = async (
    { email, date, newsContent }: { email: string; date: string; newsContent: string }
): Promise<void> => {
    const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE
        .replace('{{date}}', date)
        .replace('{{newsContent}}', newsContent);

    const mailOptions = {
        from: `StockHacks News`,
        to: email,
        subject: `📈 Market News Summary Today - ${date}`,
        text: `Today's market news summary from StockHacks`,
        html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions);
};

export const sendStockAlertEmail = async (
    { email, symbol, company, currentPrice, targetPrice, direction }: { email: string; symbol: string; company?: string; currentPrice: number | string; targetPrice: number | string; direction: 'upper' | 'lower' }
): Promise<void> => {
    const timestamp = new Date().toLocaleString();
    const template = direction === 'upper' ? STOCK_ALERT_UPPER_EMAIL_TEMPLATE : STOCK_ALERT_LOWER_EMAIL_TEMPLATE;

    const htmlTemplate = template
        .replace(/{{symbol}}/g, String(symbol))
        .replace(/{{company}}/g, String(company ?? ''))
        .replace(/{{currentPrice}}/g, String(currentPrice))
        .replace(/{{targetPrice}}/g, String(targetPrice))
        .replace(/{{timestamp}}/g, String(timestamp));

    const mailOptions = {
        from: `StockHacks Alerts`,
        to: email,
        subject: `Stock Alert: ${symbol} ${direction === 'upper' ? 'above' : 'below'} ${targetPrice}`,
        text: `${symbol} hit your alert target of ${targetPrice}. Current price: ${currentPrice}`,
        html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions);
}