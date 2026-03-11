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

```bash
OPENAI_API_KEY=your_openai_api_key
```

`OPENAI_API_KEY` is optional for the core app, but it is required if you want plain-English search terms such as `red dragons with flying` to be translated into Scryfall syntax automatically. Without it, direct Scryfall syntax searches still work.

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

## Routes

- `/` home page with search, stats, sidebar navigation, and random cards
- `/search?q=<query>` search results with pagination
- `/card/[id]` detailed card page
- `/set/[code]` set page with set metadata and card listings
- `/api/translate-query` API route that translates natural language into Scryfall syntax

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
