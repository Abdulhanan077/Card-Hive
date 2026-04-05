# Project Documentation: Omor Biggy Gift Card Trading Center (Card-Hive)

## 1. Project Overview
Omor Biggy Gift Card Trading Center (also known as Card-Hive) is a robust web platform designed for trading gift cards for instant cash. The application facilitates a seamless user experience for customers to submit their gift cards and receiving payments via Mobile Money (MTN/Telecel) or Cryptocurrency. It includes a powerful administrative dashboard for managing trades, users, rates, and platform-wide settings.

---

## 2. Technical Stack
The project is built using modern web technologies to ensure performance, scalability, and maintainability:

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router, Server Components, Server Actions)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Database**: PostgreSQL (hosted on [Neon](https://neon.tech/))
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Credentials-based)
- **Real-time Communication**: [Pusher](https://pusher.com/) for chat and live notifications
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [Framer Motion](https://www.framer.com/motion/) for animations
- **Email Services**: [Resend](https://resend.com/), [ZeptoMail](https://www.zoho.com/zeptomail/), and [Nodemailer](https://nodemailer.com/)
- **Storage**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) / AWS S3 for card images and documents
- **Charts**: [Recharts](https://recharts.org/) for administrative analytics

---

## 3. Project Structure
The project follows a standard Next.js directory structure with a focus on modularity:

```text
/
├── prisma/                 # Database schema and migrations
├── public/                 # Static assets (images, logos)
├── scripts/                # Maintenance and utility scripts (e.g., factory reset, database checks)
├── src/
│   ├── app/                # Next.js App Router (Pages, APIs, Layouts)
│   │   ├── actions/        # Server Actions for business logic (Trades, Users, Settings)
│   │   ├── admin/          # Admin Dashboard routes
│   │   ├── user/           # User Dashboard routes
│   │   ├── api/            # Route Handlers for external integrations
│   │   └── components/     # App-specific UI components
│   ├── components/         # Reusable global UI components
│   ├── context/            # React Context providers (Auth, Theme)
│   ├── lib/                # Shared utilities, library configurations (Prisma, Pusher, Email)
│   ├── middleware.ts       # Authentication and role-based access control
│   └── types/              # TypeScript type definitions
├── .env                    # Environment variables
├── next.config.ts          # Next.js configuration
└── package.json            # Project dependencies and scripts
```

---

## 4. Core Features

### 4.1 Trade Management
The heart of the platform is the gift card trading system.
- **Submission**: Users can submit multiple gift cards in a single batch.
- **Automated Rates**: Calculations are done in real-time based on current rates stored in the database.
- **Status Tracking**: Trades move through states: `PENDING` → `UNDER_REVIEW` → `PAID` / `REJECTED` / `COMPLETED`.
- **Payouts**: Supports Mobile Money (MTN, Telecel) and Cryptocurrency (USDT/BTC via multiple networks).
- **Security**: Card codes are hashed for duplicate detection, and original codes are only viewable by admins.

### 4.2 Admin Dashboard
A comprehensive panel for platform administrators:
- **Trade Processing**: Real-time review and processing of submissions.
- **User Management**: Ability to activate/block users and modify profile details.
- **Rate Management**: Dynamic updating of gift card rates across brands, countries, and types (Physical/E-code).
- **Settings**: Control over global fees, contact information, and platform text.
- **Analytics**: Visualized data on trade volume, user growth, and revenue.

### 4.3 Referral & Reward System
Designed to drive growth through user advocacy:
- **Referral Tracking**: Unique referral codes for each user.
- **Rewards**: Earn percentages of trades made by referred users.
- **Leaderboards**: Competitive boards (Whale, Speed, Referral) with monthly rewards.
- **Redemption**: Users can redeem their reward balance for cash or trade bonuses.

### 4.4 Real-time Communication
- **Trade Chat**: Direct channel between users and admins for each trade.
- **Live Notifications**: Instant alerts for status updates, new messages, and trade confirmations using Pusher.

### 4.5 Security & Integrity
- **Role-Based Access**: Strict separation between `USER` and `ADMIN` roles.
- **Security Logging**: Tracking login events, IP addresses, and device signatures.
- **Email Verification**: OTP-based registration and password reset flows.

---

## 5. Database Schema (Prisma)
Key models include:
- `User`: Handles profiles, roles, and referral links.
- `Trade`: Stores submission details, status, and payout info.
- `CardRate`: Management of individual card pricing.
- `Message`: Chat history between users and admins.
- `LeaderboardHistory`: Persistent record of monthly competitive rankings.
- `Settings`: Global platform configuration.

---

## 6. Setup & Deployment

### 6.1 Prerequisites
- Node.js (v18+)
- PostgreSQL Database
- Pusher Account
- Email Service Provider (Resend/ZeptoMail)

### 6.2 Installation
1.  Clone the repository.
2.  Install dependencies: `npm install`.
3.  Configure `.env` file (see `.env.example`).
4.  Run Prisma migrations: `npx prisma db push`.
5.  Start development server: `npm run dev`.

### 6.3 Maintenance
- **Scripts**: The `scripts/` folder contains many useful tools:
    - `factoryReset.ts`: Wipes and re-initializes the database.
    - `debug-email.js`: Tests the SMTP/API email integration.
- **Build**: Use `npm run build` for a production-ready Next.js deployment.

---

## 7. Future Roadmap
- Integration of automated gift card validation services.
- Native mobile application development (iOS/Android).
- Expanded cryptocurrency support with automated wallet address generation.

---
*Documentation generated on 2026-03-26*
