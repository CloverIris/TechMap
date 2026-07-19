# AGENTS.md

These instructions apply to the entire repository.

## Read First

Before planning, editing, or reviewing work in this repository, read:

1. [`docs/PRD.zh-CN.md`](docs/PRD.zh-CN.md): the normative product source of truth.
2. Relevant accepted records under [`docs/decisions/`](docs/decisions/).
3. [`docs/API_CONTRACT.zh-CN.md`](docs/API_CONTRACT.zh-CN.md) for frontend/backend boundary semantics.
4. [`contracts/internal-api/v1/openapi.yaml`](contracts/internal-api/v1/openapi.yaml) for machine-readable API fields, operations, and validation.
5. Any other machine-readable contract affected by the task.

[`docs/PRODUCT_PLAN.zh-CN.md`](docs/PRODUCT_PLAN.zh-CN.md) and concept images are background material only. They do not override the PRD.

If a request conflicts with the PRD, do not silently implement the conflict. Call it out and prepare a decision record plus the required PRD version change.

## Current Phase

The repository is currently in product-definition mode. Do not scaffold an application, install dependencies, create deployment infrastructure, or begin implementation unless the user explicitly authorizes an engineering phase in a later task.

Documentation-only tasks must not create placeholder source trees or speculative package manifests.

## Product Invariants

Agents must not independently change any of the following:

- Product identity: **SeekStar TechMap / 技术地图**, `techmap.seekstar.ai`, “看见技术如何彼此构成”.
- Product position: a 3D technology encyclopedia and relationship map first, not an advisor, stack generator, benchmark, or marketing site.
- First screen: anonymous, full-screen, operable map with an optional skippable guide.
- The three view semantics:
  - Atlas maps horizontal discipline and capability geography.
  - Stack maps abstraction layers and local layer spans.
  - Time maps chronology, older below and newer above.
- The twelve root domains frozen in PRD v1.0.
- Alpha scope and explicit exclusions.
- Permanent namespaced IDs and non-reuse rules.
- CC BY 4.0 licensing for the core dataset.
- Statement-level provenance, 100% core-fact evidence coverage, and the 80% primary-source threshold.
- Human editorial approval as the only path into the published graph.
- Strict WebGPU/WebGL2 visual and functional equivalence.
- No node or region area encoding popularity, quality, recommendation strength, or market share.

Changing an invariant requires an accepted decision record, impact analysis, and a PRD version bump before implementation.

## Repository Boundaries

The intended system has two repositories:

- This private product monorepo owns the Web app, API, consumption of layout releases, deployment, and private operational tooling.
- The future public `techmap-data` repository owns graph data, Schema, validators, layout input contracts, and contribution workflows.

Do not create a second authoritative dataset in the product repository. The product must consume a versioned `techmap-data` release and verify its semantic version and content hash. Data corrections belong upstream and arrive through a new release.

Do not expose Alpha internal endpoints as a public API. Public REST/OpenAPI and MCP are deferred and will use a separately approved `/v1` contract.

## Engineering Baseline

When engineering is explicitly authorized, use the frozen baseline:

- pnpm workspace monorepo.
- Node.js 24 LTS.
- TypeScript 6 with `strict` enabled.
- ESLint and Prettier.
- Next.js App Router and React.
- React Three Fiber and Three.js.
- Tailwind CSS, Radix UI, and Lucide icons.
- Zustand for high-frequency map/UI state.
- TanStack Query for server state.
- Fastify with REST/OpenAPI.
- PostgreSQL with Drizzle and reviewed raw SQL where graph queries need it.
- Docker Compose on one self-hosted Linux host for the first release.

Do not swap frameworks, renderers, databases, package managers, or deployment shape as a local convenience. A baseline change needs a decision record.

Security fixes are immediate. Routine dependencies are updated monthly. Next.js, Three.js, R3F, and renderer upgrades must be isolated and include complete visual regression checks.

## Language And Style

- Use English for code identifiers, filenames that are not localized content, schemas, code comments, commit messages, API fields, and test names.
- Product and editorial documentation is Chinese-first. Add English variants where the product contract requires them.
- Keep localized strings outside rendering and layout logic.
- Prefer existing repository patterns over new abstractions.
- Keep changes scoped. Do not combine product work with unrelated refactors or dependency churn.
- Add comments only where an invariant or non-obvious algorithm would otherwise be hard to recover.

## Data And Evidence Rules

Treat graph content as reviewed data, not prose that can be plausibly completed.

- Structural authoring uses YAML; long descriptions use Markdown.
- Every published entity definition, key date, and core relation must have an accepted `Statement` and at least one source.
- At least 80% of accepted statements must use an official project, standards body, or original publisher as the primary source.
- Preserve source dates exactly and store precision. Never invent a month or day when only a year is known.
- Model conflicting credible claims as disputed statements. Do not resolve them by model confidence.
- Never use model output as a factual source.
- Agents may prepare candidate PRs, source suggestions, validation reports, and impact previews. Agents may not auto-merge graph facts.
- IDs are permanent and never reused. Use tombstones or merge mappings for mistakes.
- Domain-specific relation experiments belong in a versioned extension namespace; never add free-form predicates to core data.
- Logos require recorded provenance and trademark guidance. Fall back to text or a generic type icon when usage is unclear.

For factual research, prefer official project documentation, standards organizations, primary papers, original release records, and first-party repositories.

## Layout And Rendering Rules

The graph is the source; layout snapshots are deterministic, reviewed projections of it.

- A visible entity has one physical `primary_container_id` per layout snapshot, even when it has multiple classification relations.
- Container size is derived from child footprints, title reservation, padding, and collision resolution. Do not hardcode a region size to fit a current fixture.
- Container trees, successor chains, and era ordering must remain acyclic.
- Given identical data, config, font metrics, and algorithm versions, layout output must be reproducible.
- Preserve editorial anchors and local stability. A local data addition should not reshuffle unrelated continents.
- Published `LayoutSnapshot` objects are immutable; corrections create a new layout version.
- Do not run a random client-side force layout as the canonical published arrangement.
- Relationship edges are local by default: focused neighborhoods, selected relation types, landmarks, or Guided Paths.

R3F must create Three.js `WebGPURenderer` asynchronously. WebGPU is preferred, with automatic WebGL2 fallback. Stay within the common material, lighting, post-processing, and interaction subset so both backends communicate the same information and produce approved equivalent visuals.

No WebGL2 means the product enters basic search/detail mode. Do not pretend a blank or static Canvas is a supported fallback.

## UI Constraints

- Build the usable map as the first screen; do not add a marketing landing page.
- Keep Atlas camera tilt constrained. Keep Stack and Time orbit constrained. Always provide reset and canonical front/top views as appropriate.
- Use progressive disclosure and stable zoom tiers. Do not render every node and edge at once.
- Color communicates domain; shape/icon communicates entity type. Status must not rely on color alone.
- Node footprint serves labels, type, and hit area only. Region footprint serves current content envelope only.
- Prefer modern digital-map and geological-section aesthetics. Avoid starfields, sci-fi cockpit styling, decorative blobs, and popularity-driven spectacle.
- Use semantic HTML for controls and details. Search, filters, details, and Guided Path controls must be keyboard operable.
- Respect reduced motion. Keep mobile to a controlled 2.5D experience when that preserves legibility.
- Keep fixed-format controls dimensionally stable so labels, hover states, loading, and side panels do not shift the layout.
- Use Lucide icons for familiar actions and tooltips for unfamiliar icon-only controls.

## Privacy And Security

- Collect only anonymous, minimal analytics events approved by the PRD.
- Never log search text or a reconstructable personal map history.
- Do not add advertising IDs or cross-site tracking.
- Escape and validate authored Markdown, URLs, aliases, and localized content at the trust boundary.
- CI builds, tests, and scans immutable OCI images. Production pulls approved images and does not build source in place.
- Do not grant CI broad production SSH access.

## Required Validation

Once scripts exist, the root workspace must expose these commands and agents must run the relevant set before declaring work complete:

```text
pnpm contract:lint
pnpm contract:breaking
pnpm contract:test
pnpm lint
pnpm typecheck
pnpm test
pnpm data:validate
pnpm layout:check
pnpm test:e2e
pnpm test:visual
pnpm build
```

Do not create empty scripts that always pass. Until a command exists, state that it was unavailable; never claim a test passed without running it.

Validation depth follows the change:

- Data changes: Schema, IDs, relation directions, cycle rules, provenance, source ratio, dates, slugs, and content hash.
- Layout changes: determinism, enclosure, title reservation, collisions, anchor stability, locality, and share-state restoration.
- UI changes: unit/integration tests plus Playwright for affected workflows.
- Rendering changes: desktop and mobile screenshots, nonblank Canvas pixels, world framing, actual camera/scene motion, asset rendering, text overlap, and WebGPU/WebGL2 comparison.
- Core renderer or Three.js upgrades: run the complete visual matrix, not a reduced smoke test.

The standard E2E fixtures must cover React/Vue/Next.js, Chrome/V8/Node.js, CUDA/TensorFlow/PyTorch, organization/person/paper overlays, semantic-era expansion, and all three Guided Paths.

Release performance gates are six seconds to an operable map on a 10 Mbps connection and at least 40 median FPS at 1080p on the defined mid-range integrated-GPU profile.

## Change Control

Use [`docs/decisions/000-template.md`](docs/decisions/000-template.md) for decisions that affect:

- Product invariants or Alpha scope.
- Root domains or ontology major versions.
- Permanent IDs, routes, share state, public data, or future API contracts.
- Licensing, provenance, editorial authority, or evidence thresholds.
- Renderer equivalence, supported browsers, performance gates, or repository boundaries.

The record must include alternatives, consequences, migration, validation, affected contracts, and the required PRD version. The primary maintainer gives final product and editorial approval.

## Completion Standard

A change is complete only when:

- It matches the current PRD and accepted decisions.
- Its data and public-state effects are explicit.
- Relevant automated and visual checks pass, or unavailable checks are clearly reported.
- Documentation and decision records are updated in the same change when required.
- No unrelated files, generated artifacts, dependencies, or speculative infrastructure were added.
