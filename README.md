# 📈 Stock Hacks

## 💡 Introduction
**Stock Hacks** is a smart and automated **stock tracking platform** built with **Next.js** and **React**, designed to deliver **real-time stock insights** and **email alerts** directly to users.  

This project integrates:
- ⚙️ **Inngest** – for scheduled and event-driven tasks  
- 🧠 **Gemini AI** – for intelligent stock analysis and natural language summaries  
- 📬 **Nodemailer** – to send automatic stock updates to user inboxes  
- 📊 **Finnhub API** – for live financial market and stock data  
- 🎨 **Shadcn UI** – for a modern, responsive, and elegant interface  

With **Stock Hacks**, users can track their favorite stocks, receive periodic AI-generated insights, and stay updated through automated email notifications — all in one streamlined web app.

---

## 🧰 Prerequisites
Make sure you have the following installed before cloning and running the project:
- [Node.js](https://nodejs.org/en) (v18+ recommended)
- [Git](https://git-scm.com/)
- An API key from [Finnhub](https://finnhub.io/)
- A [Google Gemini API](https://ai.google.dev/) key (for AI-powered stock summaries)
- A valid email SMTP configuration (for Nodemailer)
- Optional: [Vercel account](https://vercel.com/) for easy deployment

---

## 🌱 .env File Format
---
Before running the app, make sure to create a `.env` file in the project root with the following variables:

```bash
NODE_ENV='production'

NEXT_PUBLIC_BASE_URL=http://localhost:3000

MONGODB_URI=your_mangodb_uri

BETTER_AUTH_SECRET=your_better_auth_secret

BETTER_AUTH_URL=http://localhost:3000

GEMINI_API_KEY=your_gemini_api_key

NODEMAILER_EMAIL=your_email
NODEMAILER_PASSWORD=your_nodemailer_pass

NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_api_key
```
---

## ⚙️ Clone and Run Locally

```bash
# Clone the repository
git clone https://github.com/yourusername/stock-hacks.git

# Navigate into the project directory
cd stock-hacks

# Install dependencies
npm install

# Create your environment variables file
cp .env.example .env
# Fill in API keys and credentials inside .env

# Run the development server
npm run dev