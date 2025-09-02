# Project Root

- [ ] Create `.nvmrc` (LTS) and `.node-version` to lock Node

---

# 1. Foundations & DevEx

## 1.1 Repo & CI
- [ ] Initialize monorepo structure: `apps/web`, `apps/api` (Netlify Functions), `packages/ui`, `packages/config`
- [ ] Add PNPM workspace with shared ESLint/TSConfig/Prettier
- [ ] GitHub Actions: lint, typecheck, unit tests, build (web + functions)
- [ ] Netlify build config: `netlify.toml` (build `apps/web`, functions `apps/api/netlify/functions`)
- [ ] Add commit lint + conventional commits
- [ ] Acceptance: PRs auto-run checks; Netlify deploy previews created for PRs  
**Emily to delegate all tasks**

## 1.2 Env & Infra
- [ ] Create `.env.example` and environment loader (`dotenv`) for local
- [ ] Set Netlify environment vars for production (all secrets)
- [ ] Provision Postgres (Neon/Supabase) and S3-compatible storage (R2/S3)
- [ ] Add pgvector extension enabled on DB
- [ ] Acceptance: `pnpm dev` runs locally; push to GitHub → Netlify builds green  
**Emily to delegate all tasks**

## 1.3 Auth & Billing
- [ ] Implement Auth.js (email magic links + OAuth optional)
- [ ] Stripe setup (Free/Pro/Team): products, prices, webhooks
- [ ] Netlify function for Stripe webhooks (`/api/stripe/webhook`)
- [ ] Acceptance: test checkout flips `subscriptions.status=active`  
**Emily to delegate all tasks**

---

# 2. Data & Schema

## 2.1 Migrations
- [ ] Install Drizzle (or Prisma) with Postgres + pgvector
- [ ] Create migrations for all tables in schema
- [ ] Add seed runner and rollback scripts
- [ ] Acceptance: `pnpm db:migrate` creates all tables + indexes without errors  
**Emily to delegate all tasks**

## 2.2 Seed & Fixtures
- [ ] Seed demo persona, story snippets, prompts
- [ ] Seed a sample “6-min keynote” brief + outline
- [ ] Acceptance: local demo speech can run outline→draft end-to-end  
**Emily to delegate all tasks**

---

# 3. Core Drafting Flow

## 3.1 Brief Form
- [ ] Build brief form (occasion, audience, time, constraints, thesis)
- [ ] Persist as `speeches` + initial `speech_sections` rows
- [ ] Validation for time limits and audience profile
- [ ] Acceptance: brief saved; empty outline visible for edit  
**Emily to delegate all tasks**

## 3.2 Outline Agent
- [ ] Netlify function `/api/outline` with model call
- [ ] Allocate time per section; ensure callback slot; “quotable” in close
- [ ] Editable outline UI (reorder, rename, time tweak)
- [ ] Acceptance: outline JSON saved; time budget sums to target ±5%  
**Emily to delegate all tasks**

## 3.3 Draft Agent (per section)
- [ ] Netlify function `/api/draft` (streaming)
- [ ] Generate section text with cadence tags `[PAUSE]`, `[EMPHASIZE]`
- [ ] Time-aware generation (WPM target) per section
- [ ] Acceptance: compiled draft duration within ±10% of target  
**Emily to delegate all tasks**

## 3.4 Versioning & Diff
- [ ] Snapshot full text on demand and on major transitions
- [ ] Side-by-side diff viewer with revert
- [ ] Acceptance: can label versions and restore any snapshot  
**Emily to delegate all tasks**

---

# 4. Persona, Style & Story Vault

## 4.1 Persona Wizard
- [ ] Wizard: tone sliders, do/don’t, sample text paste
- [ ] Background job to build `style_cards` (stylometry features + embedding)
- [ ] Acceptance: persona saved; style card created asynchronously  
**Emily to delegate all tasks**

## 4.2 Story Vault
- [ ] CRUD stories with sensitivity tags; embed stories vector
- [ ] Retrieval in outline/draft (RAG) with PGVector search
- [ ] Acceptance: chosen stories appear in draft with `[CALLBACK]` anchors  
**Emily to delegate all tasks**

---

# 5. Humanization (Triple-Check Ensemble)

## 5.1 Pass A – Rhetoric & Specificity
- [ ] Function `/api/humanize/passA` to add anaphora, triads, callbacks
- [ ] Specificity upgrade (replace vague claims with concrete examples)
- [ ] Cliché density scorer (simple n-gram list baseline)
- [ ] Acceptance: cliché density lower vs baseline; new quotable line in close  
**Emily to delegate all tasks**

## 5.2 Pass B – Persona Harmonizer
- [ ] Function `/api/humanize/passB` applying style card constraints
- [ ] Enforce avg sentence length, POS rhythm, metaphor domain prefs
- [ ] Stylometry distance metric calculated and stored
- [ ] Acceptance: stylometry distance under threshold T  
**Emily to delegate all tasks**

## 5.3 Pass C – Critics + Referee
- [ ] Functions `/api/humanize/critic1` and `/api/humanize/critic2`
- [ ] JSON diffs with scores (Specificity, Freshness, Performability, Persona-Fit)
- [ ] Referee `/api/humanize/referee` merges/chooses edits within time budget
- [ ] Acceptance: A/B test toggle shows ensemble beats baseline on preference  
**Emily to delegate all tasks**

---

# 6. Fact / Risk / Cliché Lint

## 6.1 NER & Quote Source
- [ ] Named entity detection; link-out suggestions
- [ ] Quote detection with source prompts
- [ ] Acceptance: report lists entities/quotes with suggested URLs  
**Emily to delegate all tasks**

## 6.2 Claiminess & Sensitive Topics
- [ ] Classifier for high-risk claims; sensitive lexicon flags
- [ ] “Verify panel” to acknowledge or revise flagged lines
- [ ] Acceptance: export blocked until red flags acknowledged  
**Emily to delegate all tasks**

## 6.3 Cliché/Plagiarism Scan
- [ ] Cliché phrase index (CSV → trie) and similarity checker
- [ ] Rewrite suggestions for flagged spans
- [ ] Acceptance: density < 0.8/100 tokens after rewrite  
**Emily to delegate all tasks**

---

# 7. Rehearsal & Teleprompter

## 7.1 Teleprompter
- [ ] Full-screen prompter with line focus, adjustable WPM scroller
- [ ] Respect `[PAUSE]` and `[EMPHASIZE]` tags
- [ ] Acceptance: timer + scroll sync to target duration  
**Emily to delegate all tasks**

## 7.2 TTS & Pace/Filler Analysis
- [ ] TTS playback (provider API) for rhythm practice
- [ ] Mic capture → transcript → WPM by section + filler counts
- [ ] Acceptance: rehearsal record saved with metrics  
**Emily to delegate all tasks**

## 7.3 “Cut to Target”
- [ ] Summarize/compress by N seconds preserving beats & callbacks
- [ ] Preview diffs of proposed cuts
- [ ] Acceptance: final duration within ±5% of target  
**Emily to delegate all tasks**

---

# 8. Export & Collaboration

## 8.1 PDF/DOCX Export
- [ ] Server export with page styling and stage directions
- [ ] Watermark for Free plan; clean for Pro/Team
- [ ] Acceptance: files download reliably from web UI  
**Emily to delegate all tasks**

## 8.2 Share & Comments
- [ ] Signed share links (viewer/commenter roles)
- [ ] Inline comments and suggested edits
- [ ] Acceptance: reviewer can annotate; author accepts changes  
**Emily to delegate all tasks**

---

# 9. Observability & Quality

## 9.1 Telemetry
- [ ] PostHog events: drafts created, edit-burden, time-to-final
- [ ] Store per-stage `model_runs` with tokens, latency, scores
- [ ] Acceptance: quality dashboard visible to admins  
**Emily to delegate all tasks**

## 9.2 Quality Gates
- [ ] Export gate if red flags unresolved
- [ ] Regression tests for cliché density and stylometry thresholds
- [ ] Acceptance: CI fails if thresholds regress  
**Emily to delegate all tasks**

---

# 10. Privacy & Compliance

## 10.1 Content Privacy
- [ ] Row-level security (RLS) patterns per user
- [ ] Encrypt at rest; minimize PII; data retention policy
- [ ] Acceptance: privacy checklist complete; policy page live  
**Emily to delegate all tasks**

## 10.2 Political/Ethics Mode
- [ ] Jurisdiction toggles; disclaimers on export
- [ ] Plain-language academic honesty warning
- [ ] Acceptance: mode changes output and adds footer automatically  
**Emily to delegate all tasks**
