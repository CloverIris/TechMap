# Decision: <Short Title>

| Field | Value |
| --- | --- |
| ID | `YYYY-NNN` |
| Status | Proposed / Accepted / Rejected / Superseded |
| Date | YYYY-MM-DD |
| Deciders | Primary maintainer, ... |
| Owner | ... |
| PRD before | v... |
| PRD required | None / Patch / Minor / Major |
| Supersedes | None / decision ID |
| Superseded by | None / decision ID |

> Copy this file to `docs/decisions/YYYY-NNN-short-title.md`. Remove instructional text, keep rejected alternatives, and link all affected contracts before requesting acceptance.

## Decision Class

Mark every applicable class:

- [ ] Product invariant or positioning
- [ ] Alpha scope
- [ ] Root domain or ontology
- [ ] Permanent ID or graph semantics
- [ ] Public data, route, share-state, API, or MCP contract
- [ ] License, provenance, or editorial policy
- [ ] Repository or deployment boundary
- [ ] Rendering, browser, accessibility, or performance contract
- [ ] Reversible implementation detail

## Context

Describe the problem, why a decision is needed now, and the constraints already fixed by the PRD. Link research, user evidence, incidents, prototypes, and relevant source material.

## Decision

State the decision in precise, testable language. Separate normative requirements from examples.

## Product Impact

Explain what changes for users and what must remain unchanged. Address the first-screen experience, three-view semantics, graph integrity, evidence display, and Alpha scope where relevant.

## Data And Contract Impact

List all affected items:

- Entity, relation, event, Statement, or Source semantics.
- Schema and validation rules.
- Permanent IDs, slugs, redirects, routes, or share-state fields.
- Data semantic version and content hash.
- Layout snapshot or algorithm version.
- REST/OpenAPI/MCP contracts, if they exist.
- License, attribution, trademark, or source obligations.

Write `None` only after checking each category.

## Options Considered

### Option A: <Name>

Describe the option, benefits, costs, risks, and reversibility.

### Option B: <Name>

Describe the option, benefits, costs, risks, and reversibility.

### Status Quo

Explain the consequence of making no change.

## Rationale

Explain why the selected option best satisfies the product goals and constraints. Record important uncertainty instead of presenting assumptions as facts.

## Consequences

### Positive

- ...

### Negative

- ...

### Risks

- ...

## Migration And Compatibility

Describe data migration, redirects, version negotiation, rollout order, backward compatibility, snapshot regeneration, and rollback. State how old permanent IDs and shared links continue to behave.

## Validation Plan

Define observable acceptance criteria and the exact checks required, including as applicable:

- Schema, provenance, relationship, and cycle validation.
- Deterministic layout and anchor-stability comparison.
- Unit, integration, and Playwright scenarios.
- Desktop/mobile screenshots and Canvas pixel checks.
- WebGPU/WebGL2 equivalence.
- Performance and user-understanding tests.

## Privacy, Security, And Operations

Describe any analytics, personal data, threat model, deployment, rollback, moderation, or operational impact. Write `None` with a brief reason if there is no impact.

## Documentation Changes

List the PRD sections, AGENTS instructions, Schema docs, contribution docs, and user-facing material that must change. Include the target PRD version.

## Implementation Plan

List separately reviewable steps. Do not begin implementation for a normative change until this record is accepted and the required PRD change is approved.

## Approval

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Primary maintainer | ... | Pending | ... |
| Product/editorial reviewers | ... | Pending | ... |
| Engineering/data reviewers | ... | Pending | ... |

## Follow-Up

List post-release checks, unresolved questions that do not block acceptance, and the date or event that triggers reevaluation.
