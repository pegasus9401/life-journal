# Life Journal

A clean foundation for a personal travel journal, built with Next.js, TypeScript, Tailwind CSS, Supabase, and Vercel.

## Local setup

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local`.
3. Replace the Supabase placeholders with the project URL and anon key from Supabase → Project Settings → API.
4. Start the app with `pnpm dev`.

## Vercel deployment

Import this repository in Vercel and add the same three values from `.env.example` under Project Settings → Environment Variables. Vercel will detect Next.js automatically.

## Current scope

The home screen and technical foundation only. Creating trips, authentication, uploads, maps, AI stories, and books are deliberately left for later phases.
