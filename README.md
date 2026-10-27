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

Visitors sign up at `/sign-up`, sign in at `/sign-in` and land on `/resumes`. Accounts, sessions and resumes are kept as one JSON document, in a durable Upstash Redis database when it is configured, otherwise in a local file (development only; serverless hosts such as Vercel cannot write to the deployment folder, and a local file would not survive a deploy or restart). Passwords are hashed with scrypt. If sign-up or sign-in fails because storage is unavailable, the user sees a friendly message and the error is written to the server log.

Configuration (see `.env.example`). All of these are read at runtime on each request, not at build time, so setting them on the running service is enough:

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (required in production) — REST URL and token of an Upstash Redis database, which whoever deploys the app must create. When both are set, all data is stored there. If either is unset, the local file is used, which fails on a read-only host.
- `LOOMSHIFT_DATA_FILE` (optional, local development) — path of the JSON file used when no Upstash database is configured. If unset, the app writes to a `store.json` file inside a `.data` folder under the working directory. That file is not in the repository; it is created the first time an account is saved, and the location must be writable.

Run the tests with `npm test`. They cover the store (sign up, sign in, sessions, per-user isolation); the sign-up server action is covered too; the pages are not covered by automated tests.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
