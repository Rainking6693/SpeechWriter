
# Project Root
Netlify project- aispeechwriter.netlify.app

- [x] Create `.nvmrc` (LTS) and `.node-version` to lock Node
- [ ] OpenAI Integration. API keys in Netlify Environmental Variables
- [ ] License Check for AI Outputs: Ensure AI-generated content complies with copyright and usage terms of the chosen model provider.
- [ ] **Acceptance**: API calls to the AI model succeed locally and in CI; terms of use for AI outputs documented.

---

# 1. Foundations & DevEx

## 1.1 Repo & CI
- [x] Initialize monorepo structure: `apps/web`, `apps/api` (Netlify Functions), `packages/ui`, `packages/config`
- [x] Add PNPM workspace with shared ESLint/TSConfig/Prettier
- [x] GitHub Actions: lint, typecheck, unit tests, build (web + functions)
- [x] Netlify build config: `netlify.toml` (build `apps/web`, functions `apps/api/netlify/functions`)
- [x] Add commit lint + conventional commits
- [x] Add Dependabot for dependency updates and security patches
- [x] Configure GitHub Actions to cache PNPM dependencies for faster builds
- [x] **Acceptance**: PRs auto-run checks; Netlify deploy previews created for PRs; Dependabot alerts enabled; CI build time under 5 minutes
  - **Emily to delegate all tasks**

## 1.2 Env & Infra
- [x] Create `.env.example` and environment loader (`dotenv`) for local
- [x] Set Netlify environment vars for production (all secrets)
- [ ] Provision Postgres (Neon/Supabase) and S3-compatible storage (R2/S3)
- [ ] Add pgvector extension enabled on DB
- [ ] Set up a local AI model mock (e.g., stubbed responses) for offline development to reduce API costs
- [ ] Configure rate limiting and quotas for AI provider APIs in Netlify environment variables
- [x] **Acceptance**: `pnpm dev` runs locally; push to GitHub → Netlify builds green; local dev works without live API calls; Netlify handles API quotas gracefully
  - **Emily to delegate all tasks**

## 1.3 Auth & Billing
- [x] Implement Auth.js (email magic links + OAuth optional)
- [x] Stripe setup (Free/Pro/Team): products, prices, webhooks
- [x] Netlify function for Stripe webhooks (`/api/stripe/webhook`)
- [x] **Acceptance**: Test checkout flips `subscriptions.status=active`
  - **Emily to delegate all tasks**

---

# 2. Data & Schema

## 2.1 Migrations
- [x] Install Drizzle (or Prisma) with Postgres + pgvector
- [x] Create migrations for all tables in schema
- [x] Add schema for storing AI model metadata (e.g., model version, prompt templates) to track generation context
- [x] Add seed runner and rollback scripts
- [x] **Acceptance**: `pnpm db:migrate` creates all tables + indexes without errors; migrations include AI metadata tables
  - **Emily to delegate all tasks**

## 2.2 Seed & Fixtures
- [x] Seed demo persona, story snippets, prompts
- [x] Seed a sample "6-min keynote" brief + outline
- [x] Include diverse speech templates (e.g., TED-style, corporate, wedding) in seed data
- [x] **Acceptance**: Local demo speech can run outline→draft end-to-end; seed data supports at least 3 distinct speech types with varied tones
  - **Emily to delegate all tasks**

---

# 3. Core Drafting Flow

## 3.1 Brief Form
- [x] Build brief form (occasion, audience, time, constraints, thesis)
- [ ] Add optional file upload for user-provided reference materials (e.g., PDFs, DOCX) to inform the brief
- [x] Persist as `speeches` + initial `speech_sections` rows
- [x] Validation for time limits and audience profile
- [x] **Acceptance**: Brief saved; empty outline visible for edit; uploaded files parsed and stored in S3-compatible storage; brief reflects extracted context
  - **Emily to delegate all tasks**

## 3.2 Outline Agent
- [x] Netlify function `/api/outline` with model call
- [x] Allocate time per section; ensure callback slot; "quotable" in close
- [x] Editable outline UI (reorder, rename, time tweak)
- [x] **Acceptance**: Outline JSON saved; time budget sums to target ±5%
  - **Emily to delegate all tasks**

## 3.3 Draft Agent (per section)
- [x] Netlify function `/api/draft` (streaming)
- [x] Generate section text with cadence tags `[PAUSE]`, `[EMPHASIZE]`
- [x] Time-aware generation (WPM target) per section
- [ ] Implement fallback logic for AI timeouts or errors (e.g., retry or default to simpler prompt)
- [x] **Acceptance**: Compiled draft duration within ±10% of target; draft generation completes even if API fails, with user-facing error message
  - **Emily to delegate all tasks**

## 3.4 Versioning & Diff
- [x] Snapshot full text on demand and on major transitions
- [x] Side-by-side diff viewer with revert
- [x] **Acceptance**: Can label versions and restore any snapshot
  - **Emily to delegate all tasks**

## 3.5 Feedback Loop
- [ ] Add user feedback mechanism (e.g., thumbs up/down, comments) on generated outlines/drafts
- [ ] Store feedback in DB and use it to fine-tune prompt engineering or model selection
- [ ] **Acceptance**: Feedback stored; analytics show user satisfaction trends
  - **Emily to delegate all tasks**

---

# 4. Persona, Style & Story Vault

## 4.1 Persona Wizard
- [x] Wizard: tone sliders, do/don't, sample text paste
- [x] Add preset persona templates (e.g., "Inspirational Leader," "Witty MC") to simplify onboarding
- [x] Background job to build `style_cards` (stylometry features + embedding)
- [x] **Acceptance**: Persona saved; style card created asynchronously; users can select a preset and customize it; style card reflects preset values
  - **Emily to delegate all tasks**

## 4.2 Story Vault
- [x] CRUD stories with sensitivity tags; embed stories vector
- [x] Implement story categorization (e.g., by theme, emotion, or audience type) for easier retrieval
- [x] Retrieval in outline/draft (RAG) with PGVector search
- [x] **Acceptance**: Chosen stories appear in draft with `[CALLBACK]` anchors; users can filter stories by category; RAG retrieves relevant stories
  - **Emily to delegate all tasks**

---

# 5. Humanization (Triple-Check Ensemble)

## 5.1 Pass A – Rhetoric & Specificity
- [x] Function `/api/humanize/passA` to add anaphora, triads, callbacks
- [x] Specificity upgrade (replace vague claims with concrete examples)
- [x] Cliché density scorer (simple n-gram list baseline)
- [x] **Acceptance**: Cliché density lower vs baseline; new quotable line in close
  - **Emily to delegate all tasks**

## 5.2 Pass B – Persona Harmonizer
- [x] Function `/api/humanize/passB` applying style card constraints
- [x] Enforce avg sentence length, POS rhythm, metaphor domain prefs
- [x] Stylometry distance metric calculated and stored
- [x] **Acceptance**: Stylometry distance under threshold T
  - **Emily to delegate all tasks**

## 5.3 Pass C – Critics + Referee
- [x] Functions `/api/humanize/critic1` and `/api/humanize/critic2`
- [x] JSON diffs with scores (Specificity, Freshness, Performability, Persona-Fit)
- [x] Referee `/api/humanize/referee` merges/chooses edits within time budget
- [x] **Acceptance**: A/B test toggle shows ensemble beats baseline on preference
  - **Emily to delegate all tasks**

## 5.4 Pass D – Cultural Sensitivity Check
- [ ] Add a function `/api/humanize/passD` to flag culturally insensitive phrases using a lexicon or AI model
- [ ] Suggest alternative phrasing for flagged content
- [ ] **Acceptance**: Report highlights potential issues; user can accept/reject suggestions
  - **Emily to delegate all tasks**

---

# 6. Fact / Risk / Cliché Lint

## 6.1 NER & Quote Source
- [x] Named entity detection; link-out suggestions
- [x] Quote detection with source prompts
- [x] Integrate a fact-checking API (e.g., Google Fact Check Tools) for real-time verification of claims
- [x] **Acceptance**: Report lists entities/quotes with suggested URLs; fact-check report flags unverifiable claims with source suggestions
  - **Emily to delegate all tasks**

## 6.2 Claiminess & Sensitive Topics
- [x] Classifier for high-risk claims; sensitive lexicon flags
- [x] "Verify panel" to acknowledge or revise flagged lines
- [x] **Acceptance**: Export blocked until red flags acknowledged
  - **Emily to delegate all tasks**

## 6.3 Cliché/Plagiarism Scan
- [x] Cliché phrase index (CSV → trie) and similarity checker
- [x] Rewrite suggestions for flagged spans
- [x] **Acceptance**: Density < 0.8/100 tokens after rewrite
  - **Emily to delegate all tasks**

## 6.4 Accessibility Check
- [ ] Add a check for readability (e.g., Flesch-Kincaid score) to ensure speeches suit audience comprehension levels
- [ ] **Acceptance**: Report flags complex sentences; suggestions simplify text
  - **Emily to delegate all tasks**

---

# 7. Rehearsal & Teleprompter

## 7.1 Teleprompter
- [x] Full-screen prompter with line focus, adjustable WPM scroller
- [x] Respect `[PAUSE]` and `[EMPHASIZE]` tags
- [x] **Acceptance**: Timer + scroll sync to target duration
  - **Emily to delegate all tasks**

## 7.2 TTS & Pace/Filler Analysis
- [x] TTS playback (provider API) for rhythm practice
- [x] Mic capture → transcript → WPM by section + filler counts
- [x] **Acceptance**: Rehearsal record saved with metrics
  - **Emily to delegate all tasks**

## 7.3 "Cut to Target"
- [x] Summarize/compress by N seconds preserving beats & callbacks
- [x] Preview diffs of proposed cuts
- [x] **Acceptance**: Final duration within ±5% of target
  - **Emily to delegate all tasks**

## 7.4 Rehearsal Analytics Dashboard
- [x] Build a user-facing dashboard showing rehearsal metrics (WPM, filler words, pauses) over time
- [x] **Acceptance**: Dashboard displays trends; users can compare multiple rehearsals
  - **Emily to delegate all tasks**

---

# 8. Export & Collaboration

## 8.1 PDF/DOCX Export
- [x] Server export with page styling and stage directions
- [x] Watermark for Free plan; clean for Pro/Team
- [x] **Acceptance**: Files download reliably from web UI
  - **Emily to delegate all tasks**

## 8.2 Share & Comments
- [x] Signed share links (viewer/commenter roles)
- [x] Inline comments and suggested edits
- [x] **Acceptance**: Reviewer can annotate; author accepts changes
  - **Emily to delegate all tasks**

## 8.3 Social Media Export
- [ ] Add export option for shareable snippets (e.g., tweet-length quotes or LinkedIn posts) with speech highlights
- [ ] **Acceptance**: Users can export formatted snippets; Pro/Team plans include custom branding
  - **Emily to delegate all tasks**

---

# 9. Observability & Quality

## 9.1 Telemetry
- [x] PostHog events: drafts created, edit-burden, time-to-final
- [x] Store per-stage `model_runs` with tokens, latency, scores
- [x] **Acceptance**: Quality dashboard visible to admins
  - **Emily to delegate all tasks**

## 9.2 Quality Gates
- [x] Export gate if red flags unresolved
- [x] Regression tests for cliché density and stylometry thresholds
- [x] **Acceptance**: CI fails if thresholds regress
  - **Emily to delegate all tasks**

## 9.3 Error Tracking
- [ ] Integrate Sentry or similar for real-time error monitoring (frontend, API, Netlify Functions)
- [ ] **Acceptance**: Errors logged; admins receive alerts for critical issues
  - **Emily to delegate all tasks**

---

# 10. Privacy & Compliance

## 10.1 Content Privacy
- [ ] Row-level security (RLS) patterns per user
- [ ] Encrypt at rest; minimize PII; data retention policy
- [ ] **Acceptance**: Privacy checklist complete; policy page live
  - **Emily to delegate all tasks**

## 10.2 Political/Ethics Mode
- [x] Jurisdiction toggles; disclaimers on export
- [x] Plain-language academic honesty warning
- [x] **Acceptance**: Mode changes output and adds footer automatically
  - **Emily to delegate all tasks**

## 10.3 GDPR/CCPA Compliance
- [ ] Add user consent flow for data collection and AI processing
- [ ] Implement data export/deletion requests per privacy regulations
- [ ] **Acceptance**: Consent UI live; deletion requests processed within 30 days
  - **Emily to delegate all tasks**

---

# 11. User Onboarding & Support

- [ ] Create interactive onboarding tutorial guiding users through brief creation to export
- [ ] Add a help center with FAQs and live chat (e.g., Intercom or Crisp) for user support
- [ ] **Acceptance**: Tutorial completion rate > 80%; support queries logged in dashboard
  - **Emily to delegate all tasks**

---

# 12. Scalability & Performance

- [ ] Optimize Netlify Functions for cold-start latency (e.g., bundle size reduction, lazy loading)
- [ ] Implement caching for frequent AI queries (e.g., Redis for RAG results)
- [ ] **Acceptance**: API response time < 2s for 95% of requests; cache hit rate > 70%
  - **Emily to delegate all tasks**

</div>