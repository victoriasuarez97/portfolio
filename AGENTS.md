# Repository guide

## Project

- Vicky Suarez's personal portfolio, built with Astro, TypeScript, and CSS.
- The site generates static output in `dist/`.
- Website copy and the README are in English. Preserve the personal, conversational tone.
- The Song wall currently stores submissions in browser `localStorage`. A shared backend is planned; do not describe submissions as shared until it is implemented.

## Code and design

- Compose sections in `src/pages/index.astro` and keep section markup in `src/components/`.
- Update career history in `src/data/experience.ts` and projects in `src/data/projects.ts`.
- Keep browser-side Song wall logic in `src/scripts/songwall.ts`.
- Reuse the styles, custom properties, local fonts, and illustrations already in the project. Preserve its handwritten, illustrated identity.
- Prefer the existing Astro components and CSS for UI changes. Add dependencies when the task calls for them.
- Preserve semantic HTML, form labels, keyboard access, and reduced-motion support when changing interactions.
- Match import paths to the exact filename casing so builds work on Linux as well as Windows.

## Development

Use Node.js `>=22.12.0` and pnpm. Keep `pnpm-lock.yaml` in sync with dependency changes.

Install dependencies with `pnpm install --frozen-lockfile`.

When starting the dev server, use background mode:

```
pnpm dev --background
```

Manage the background server with `pnpm astro dev stop`, `pnpm astro dev status`, and `pnpm astro dev logs`.

Run `pnpm build` after source changes. For visual or interaction changes, also check the affected behavior in the browser when available. Documentation-only edits do not require a build.

On Windows, use `pnpm.cmd` if PowerShell blocks `pnpm.ps1`.

## Documentation

Full documentation: <https://docs.astro.build>

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
