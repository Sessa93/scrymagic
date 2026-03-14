# ScryMagic

ScryMagic is a Magic: The Gathering card explorer built on top of the Scryfall API. It combines direct Scryfall syntax search with an optional natural-language query translator, then presents cards, sets, and card details in a focused Next.js interface.

## What It Does

- Search cards with native Scryfall syntax or plain-English prompts
- Browse sets from a persistent sidebar
- View full card details including oracle text, legality, prices, keywords, and rulings
- Explore alternate printings for a card
- Browse a set's cards, including grouped child sets when applicable
- Show a random card gallery on the home page

## Screenshots

### Sets

![Sets view](docs/images/sets.png)

### Search

![Search view](docs/images/search.png)

### Card Details

![Card details view](docs/images/details.png)

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Scryfall API
- OpenAI API for query translation

## Requirements

- Node.js 20+
- npm

## Local Development

### Install dependencies

```bash
npm install
```

### Configure environment

Create a `.env.local` file in the project root.

You can start from:

```bash
cp .env.example .env.local
```

```bash
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=postgres://webapp:webapp@127.0.0.1:5435/scrymagic_webapp
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace_with_a_long_random_value

# Optional OAuth providers
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_APPLE_ID=
AUTH_APPLE_SECRET=
AUTH_MICROSOFT_ENTRA_ID_ID=
AUTH_MICROSOFT_ENTRA_ID_SECRET=
AUTH_MICROSOFT_ENTRA_ID_TENANT_ID=
```

`OPENAI_API_KEY` is optional for the core app, but it is required if you want plain-English search terms such as `red dragons with flying` to be translated into Scryfall syntax automatically. Without it, direct Scryfall syntax searches still work.

`DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET` are required for account registration/login. OAuth provider variables are optional and can be enabled one-by-one.

### Initialize database schema

```bash
npm run db:migrate
```

### Promote an admin user

The icon ingestion endpoints are restricted to `ADMIN` users.

```bash
npx prisma studio
```

Open the `User` table and set `role` to `ADMIN` for the account that should manage icon ingestion jobs.

### OAuth callback URLs

Configure each provider with this callback URL:

- Google: `http://localhost:3000/api/auth/callback/google`
- Apple: `http://localhost:3000/api/auth/callback/apple`
- Microsoft (Azure AD): `http://localhost:3000/api/auth/callback/azure-ad`

In production, replace `http://localhost:3000` with your public webapp base URL.

### OAuth smoke test checklist

1. Ensure the provider env vars are set.
2. Start the app and open `/auth/signin`.
3. Confirm the provider button appears.
4. Complete provider login and verify redirect back to `/`.
5. Verify a linked account row exists in the `Account` table.
6. Sign out and sign in again with the same provider to verify account linking.

### Run the app

```bash
npm run dev
```

Open <http://localhost:3000>.

## Docker

The repository includes a production-oriented Dockerfile and a docker-compose setup.

### Start with Docker Compose

```bash
OPENAI_API_KEY=your_openai_api_key docker compose up --build
```

The app will be available at <http://localhost:3000>.

## Available Scripts

- `npm run dev` starts the development server
- `npm run build` creates a production build
- `npm run start` runs the production server
- `npm run lint` runs ESLint
- `npm run db:generate` generates the Prisma client
- `npm run db:migrate` creates and applies local Prisma migrations
- `npm run db:push` pushes the schema directly to the configured database

## Routes

- `/` home page with search, stats, sidebar navigation, and random cards
- `/search?q=<query>` search results with pagination
- `/card/[id]` detailed card page
- `/set/[code]` set page with set metadata and card listings
- `/api/translate-query` API route that translates natural language into Scryfall syntax
- `/auth/signin` custom sign in page (credentials + configured OAuth providers)
- `/auth/register` custom account registration page
- `/api/auth/*` NextAuth endpoints

## Search Behavior

The search box supports two modes:

- Scryfall syntax directly, such as `t:dragon c:r mv>=5`
- Natural language, such as `green creatures with power 5 or more`

When an OpenAI API key is configured, the app sends natural-language queries to the translation endpoint and then searches Scryfall with the translated query.

## Project Structure

```text
src/
  app/
    api/translate-query/   OpenAI-backed query translation endpoint
    card/[id]/             Card details page
    search/                Search results page
    set/[code]/            Set details and card listing page
  components/              UI building blocks
  lib/                     Scryfall and set data helpers
```

## Data Sources

- Card data and set metadata come from the public Scryfall API
- Query translation uses the OpenAI API when configured

## Notes

- External card images are loaded from `cards.scryfall.io`
- The Next.js build is configured for standalone output
- The container image uses Bun to build and run the production bundle

## License

This project is for educational and personal use. Review Scryfall's API terms before using it commercially.
