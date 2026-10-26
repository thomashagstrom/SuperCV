This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Accounts and storage

Visitors sign up at `/sign-up`, sign in at `/sign-in` and land on `/resumes`. Accounts, sessions and resumes are kept in a Redis-compatible REST store (Upstash Redis or Vercel KV) when it is configured, and otherwise in a local JSON file meant for development only. Passwords are hashed with scrypt.

Configuration (see `.env.example`):

- `KV_REST_API_URL` and `KV_REST_API_TOKEN` (required in production) — URL and token of the REST store. Whoever deploys the app must create the database and set both. When both are set nothing is written to the deployment folder. If either is unset the local file is used, which fails on read-only hosting such as Vercel.
- `LOOMSHIFT_DATA_FILE` (optional, development) — path of the local file. If unset, `.data/store.json` is used. The file is not in the repository; it is created the first time an account is saved. Whoever runs the server must make the location writable.

Run the tests with `npm test`. They cover the store (sign up, sign in, sessions, per-user isolation); the pages and server actions are not covered by automated tests.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
