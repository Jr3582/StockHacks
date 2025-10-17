import nodemailer from 'nodemailer';
import { WELCOME_EMAIL_TEMPLATE } from './template';

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
        text: `Tanks for joining StockHacks`,
        html: htmlTemplate,
    }

    await transporter.sendMail(mailOptions);
}