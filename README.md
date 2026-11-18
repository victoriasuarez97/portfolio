<div align="center">
  <h1>Vicky Suarez · Frontend & craft 🐈💻</h1>

  <p><em>I write code the way I used to draw: layer by layer.</em></p>

  <p>
    <a href="https://www.linkedin.com/in/victoria-suarez1997/">LinkedIn</a> ·
    <a href="mailto:victoriasuarez97@gmail.com">Say hi</a>
  </p>
</div>

My personal portfolio, built with Astro, TypeScript, and CSS. A little about the work I do, the things I make, and the illustration background that still shapes how I build interfaces.

I'm a frontend engineer based in Buenos Aires. My work spans React and TypeScript applications, design systems, UI quality, and AI experiments. This site brings those interests together with handwritten type, illustrated details, and two cats who take their supervisory roles very seriously.

## Inside the portfolio

- **Path** — my move from illustration and tattooing into software engineering, and the work along the way.
- **Playground** — side projects and experiments, including an AI chatbot and the Song wall.
- **About** — the person behind the components, plus a sleeping cat.
- **Song wall** — paste a Spotify track, add a note, and leave something to listen to while I work.
- **Say hi** — links for hiring, freelance work, or a conversation about fonts.

## Built with

| Tool                        | How it's used                                       |
| --------------------------- | --------------------------------------------------- |
| Astro 7                     | Components, layouts, and static HTML generation     |
| TypeScript                  | Portfolio data and browser interactions             |
| CSS                         | Custom properties, component styles, and animations |
| Astro assets + Sharp        | Image optimization at build time                    |
| Spotify oEmbed + IFrame API | Track metadata and embedded playback                |
| Supabase                   | Shared Song wall storage and validated submissions |

The visual identity combines a paper palette, illustrated assets, and a local handwritten font. The site uses semantic sections, labeled form controls, and reduced-motion styles for selected animations.

### A note about the Song wall

The live Song wall saves songs, names, and notes in Supabase, so everyone can add to the same little soundtrack. Submissions go through an Edge Function that validates Spotify track links and fetches their metadata before saving them. I can hide songs from the Supabase dashboard.

The wall loads the latest 100 visible songs when you open the page. Your new song appears as soon as it's pinned; other visitors see it after refreshing.

For local development, shared storage requires `PUBLIC_SONGWALL_SUPABASE_ENABLED=true`, `PUBLIC_SUPABASE_URL`, and `PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Without that configuration, songs stay in that browser's `localStorage`. Existing browser-local songs are not uploaded automatically. Spotify metadata and playback depend on Spotify's public services.

## Run locally

Requires **Node.js 22.12.0 or newer** and **pnpm**.

```sh
git clone https://github.com/victoriasuarez97/portfolio.git
cd portfolio
pnpm install --frozen-lockfile
pnpm dev --background
```

The default development URL is `http://localhost:4321`. Manage the background server from the project root:

```sh
pnpm astro dev status
pnpm astro dev logs
pnpm astro dev stop
```

Build and preview the production site:

```sh
pnpm build
pnpm preview
```

Run the submission endpoint tests with `pnpm test`.

On Windows, if PowerShell blocks `pnpm.ps1`, use `pnpm.cmd` in place of `pnpm`.

## Find your way around

| Location                                                       | Contents                                        |
| -------------------------------------------------------------- | ----------------------------------------------- |
| [`src/pages/index.astro`](src/pages/index.astro)               | Portfolio entry point and section order         |
| [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro) | Document structure, page title, and description |
| [`src/components/`](src/components/)                           | Portfolio sections and navigation               |
| [`src/data/experience.ts`](src/data/experience.ts)             | Career history                                  |
| [`src/data/projects.ts`](src/data/projects.ts)                 | Playground projects                             |
| [`src/scripts/songwall.ts`](src/scripts/songwall.ts)           | Song wall storage, metadata, and player logic   |
| [`src/styles/`](src/styles/)                                   | Global styles, fonts, and design tokens         |
| [`src/assets/`](src/assets/)                                   | Illustrations, tool logos, and local fonts      |
| [`public/`](public/)                                           | Static files copied directly to the build       |

---

Built in Buenos Aires with ❤️
