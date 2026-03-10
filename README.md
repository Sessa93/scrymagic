# ScryMagic

A sleek card explorer for **Magic: The Gathering**, powered by the Scryfall API.

Search cards, browse sets, and dive into detailed card data including oracle text, legalities, rulings, and pr

### Screenshots

#### Sets

![ScryMagic App Screenshot](docs/images/sets.png)

#### Search

![ScryMagic App Screenshot](docs/images/search.png)

#### Details Page

![ScryMagic App Screenshot](docs/images/details.png)

## Features

- Fast full-text card search with pagination
- Rich card detail pages with mana symbols and rarity coloring
- Rulings, legalities, and market pricing data
- Set browser with filter + keyboard-friendly navigation
- Responsive layout for desktop and mobile
- Server-side fetching with Next.js App Router

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Scryfall API

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start development server

```bash
npm run dev
```

Open <http://localhost:3000> in your browser.

## Available Scripts

- `npm run dev` - Start local development server
- `npm run build` - Build for production
- `npm run start` - Run production build locally
- `npm run lint` - Run ESLint

## Project Routes

- `/` - Home page with global search and set sidebar
- `/search?q=<query>` - Search results
- `/card/[id]` - Card details
- `/set/[code]` - Cards from a specific set

## Data Source

ScryMagic uses the public [Scryfall API](https://scryfall.com/docs/api) for card and set data.

## Deployment

Deploy anywhere that supports Next.js. Vercel is the quickest option.

```bash
npm run build
npm run start
```

## License

This project is for educational/personal use. Review Scryfall's API terms before commercial use.
