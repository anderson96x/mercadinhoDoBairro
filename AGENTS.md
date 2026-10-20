# Repository Guidelines

## Project Structure & Module Organization

Mercadinho do Bairro is a Portuguese browser game built with JavaScript ES modules, Three.js, and Vite.

- `src/main.js`: initialization, game loop, and module integration.
- `src/jogo/`: simulation, scene rendering, navigation, controls, and persistence. Balance products and upgrades in `configuracao.js`; define store geometry in `planta.js`.
- `src/interface/`: UI panels, icons, and CSS.
- `tests/`: automated behavior and regression tests.
- `public/`: static assets. Most game models are generated in code.
- `scripts/`: layout checks, floor-plan generation, and progression analysis.
- `docs/`: gameplay specifications, floor plans, verification notes, and screenshots in `previews/`.

## Build, Test, and Development Commands

Use Node.js 22.12+ as recommended by the README.

- `npm ci`: install dependencies from the lockfile.
- `npm run dev`: start development at `http://localhost:4173`.
- `npm run build`: generate the production bundle in `dist/`.
- `npm run preview`: serve the production build locally.
- `npm test`: run all `tests/*.test.js` files.
- `node --test tests/banco.test.js`: run one focused suite.
- `node scripts/check-store-layout.mjs`: validate store spacing and navigation routes.
- `node scripts/render-floor-plan.mjs`: regenerate floor-plan SVGs after geometry changes.

## Coding Style & Naming Conventions

Follow existing JavaScript style: two-space indentation, single quotes, semicolons, and explicit `.js` import extensions. Use Portuguese domain names, camelCase functions and variables, PascalCase classes, and UPPER_SNAKE_CASE constants. Use lowercase, hyphenated filenames such as `estacionamento-clientes.js`. Keep player-facing text in Portuguese. Match surrounding CSS formatting; no formatter or linter is configured.

## Testing Guidelines

Tests use `node:test` and `node:assert/strict`, with descriptive Portuguese test names in `<feature>.test.js`. No coverage threshold is configured. Add regression cases for changed gameplay, purchase validation, navigation, and save migration as applicable. Run `npm test` and `npm run build` for code changes; also check routes after geometry edits. Verify visual changes on desktop and mobile layouts, including WebGL and Canvas fallback when affected.

## Architecture & Save Compatibility

Keep simulation rules independent of rendering and the DOM. Preserve existing saves when adding state: provide defaults and validation. Consult `docs/COMO-ALTERAR.md` and update `docs/DESBLOQUEIOS-POR-NIVEL.md` when progression changes.

## Versioning

Every change except documentation-only changes must update the app version in the same change set, including tests, styling, and tooling. Documentation-only changes (including `AGENTS.md`) do not require a version bump or a release entry in `CHANGELOG.md`. Use SemVer (`MAJOR.MINOR.PATCH`):

- MAJOR: incompatible changes to stable behavior or save compatibility.
- MINOR: backward-compatible features.
- PATCH: backward-compatible fixes, refinements, and changes without runtime impact.

During `0.x` development, use MINOR for breaking changes or broad redesigns and document compatibility impacts. Reset lower components when incrementing MAJOR or MINOR. Apply one bump per change set, using its highest required level.

When bumping the version, keep `package.json`, both app-version entries in `package-lock.json`, and the README version synchronized. Add a dated `CHANGELOG.md` entry describing the change and validation performed.

## Commit & Pull Request Guidelines

History uses prefixes such as `feat:`, `fix:`, `chore:`, `docs:`, and `style:` with short English summaries. Keep commits focused. PRs should explain behavior changes, link relevant issues, report validation results, and include desktop/mobile screenshots for visual changes. Mention save compatibility or progression impacts.
