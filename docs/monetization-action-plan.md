# Monetization Action Plan

> Sequenced from [monetization-research.md](./monetization-research.md).
> Every action has a feedback gate. Do not advance to the next phase
> until the current phase's gate produces a signal.

---

## Phase 0: Instrumentation (before anything else)

Without measurement, everything that follows is guesswork.

- [ ] Add PostHog snippet to HTML templates (free tier, or apply for startup credits first)
- [ ] Add "How did you hear about us?" field to the app's initial setup/onboarding flow
- [ ] Set up Google Search Console for whatever domain will host the landing page
- [ ] Create UTM parameter convention for all outbound links: `?utm_source=reddit&utm_campaign=launch` etc.

**Gate:** PostHog receiving events. Search Console verified. ~1 hour of work.

---

## Phase 1: Polish & Position (~1 week)

### 1a. CSS Quick Wins
- [ ] Apply Krehel's CSS changes globally (see research doc, section 5a)
- [ ] Before/after screenshots for marketing material

### 1b. Product Positioning
- [ ] Draft 3 positioning variants (commodity / named methodology / pain-focused)
- [ ] Write landing page copy for each — just the headline + subheadline + 3 bullets
- [ ] Pick the strongest (gut check with 2-3 people), ship it as v1

### 1c. One Comparison Page
- [ ] Write "Job App Tracker vs. Spreadsheets" page — lowest risk, broadest appeal
- [ ] Host it as a route on the landing page site

**Gate:** Landing page live with analytics. Comparison page indexed in Search Console. One week of baseline traffic data collected.

---

## Phase 2: Distribution Test (~2 weeks)

Test channels in parallel. Invest minimally in each, measure which moves the needle.

### 2a. Community Posts (budget: 0, time: 2-3 hours)
- [ ] Show HN post with clear value prop + demo GIF
- [ ] 3-5 genuine answers on r/cscareerquestions, r/selfhosted, r/webdev mentioning the tool where relevant
- [ ] Track referral traffic per channel via UTM tags

### 2b. SEO Batch Test (budget: 0, time: 1 day)
- [ ] Generate 5 SEO articles via Claude targeting long-tail keywords
- [ ] Publish on the landing site or a blog subdirectory
- [ ] Submit to Search Console, wait 2-4 weeks for indexing data

### 2c. Chrome Web Store (budget: $5 registration fee, time: half day)
- [ ] Package the existing browser extension for Chrome Web Store submission
- [ ] Track installs and conversion to app usage

### 2d. llms.txt (budget: 0, time: 30 min)
- [ ] Create `llms.txt` and `llms-full.txt` at the landing page domain root

**Gate:** 2 weeks of data. Identify which channel(s) drove >80% of traffic. Double down on winners, drop losers. Minimum viable signal: 200+ unique visitors from at least one channel.

---

## Phase 3: Conversion Infrastructure (~1-2 weeks)

Only start this after Phase 2 confirms people are finding the product.

### 3a. Stripe Integration
- [ ] Set up Stripe product ($15 one-time) via existing LLC
- [ ] Build checkout flow: app → Stripe hosted checkout → redirect to `/activate?key=...`
- [ ] Webhook handler generates UUID license key on payment

### 3b. License Validation Proxy
- [ ] Deploy thin proxy service (Cloudflare Workers or Fly.io)
- [ ] `POST /validate` — check license key validity
- [ ] `POST /extract` — validate key + proxy to LLM API (for Phase 5)

### 3c. App-Side Premium Gating
- [ ] New `settings` table in SQLite (key/value + updated_at)
- [ ] `/activate` route handles auto-injection from Stripe redirect
- [ ] Settings page with manual key entry fallback
- [ ] Premium feature flag system (server-side, key-validated)
- [ ] Visible-but-locked UI for premium features with "Premium" badge

**Gate:** End-to-end smoke test: purchase on Stripe → webhook fires → key generated → redirect to app → premium unlocked → persists after restart. See [GitHub issue #9](https://github.com/graffhyrum/jobAppTracker/issues/9) for full PRD.

---

## Phase 4: First Revenue (~1 week)

### 4a. Premium Launch
- [ ] Update landing page with premium tier description and Stripe checkout link
- [ ] Update comparison page to include premium features
- [ ] Post update to communities from Phase 2 that drove traffic
- [ ] A/B test pricing copy once traffic > 50 visitors/week to the checkout page

### 4b. Companion Product (optional, parallel track)
- [ ] Write a "Job Search Pipeline" guide/template bundle (Weekend Product playbook)
- [ ] List on Gumroad for $10-20 as independent revenue + marketing funnel

**Gate:** First 10 paying customers. Track: time-to-first-sale, conversion rate (visitors → checkout → purchase), refund rate. If <10 sales after 30 days of traffic, revisit positioning and pricing before building more features.

---

## Phase 5: First Premium Feature — Smart Scrape

Only start this after Phase 4 confirms people will pay.

- [ ] Extend browser extension to capture raw page content from any job posting
- [ ] Build LLM extraction prompt (company, title, requirements, salary, location, remote status)
- [ ] Wire extension → app → proxy `/extract` → LLM → structured result
- [ ] Test across 20+ diverse job posting sites
- [ ] Ship, announce to existing premium users

**Gate:** Extraction accuracy across test sites. User retention of premium after using smart scrape. See [GitHub issue #11](https://github.com/graffhyrum/jobAppTracker/issues/11).

---

## Phase 6: Evaluate & Decide

After Phases 0-5, you have real data:
- Which distribution channels work
- Whether people pay $15 for premium
- Whether smart scrape quality justifies the price
- Monthly revenue vs. infrastructure cost

**Decision fork:**
- Revenue covers costs + provides income → keep iterating (analytics export, resume gen, more premium features)
- Revenue is minimal despite traffic → positioning/pricing problem, revisit Phase 1b
- Traffic is minimal → distribution problem, revisit Phase 2
- Nobody converts to premium → value problem, revisit what's behind the paywall

---

## Investment Guardrails

| Phase | Max Time | Max Money | Kill Signal |
|-------|----------|-----------|-------------|
| 0 | 1 hour | $0 | — |
| 1 | 1 week | $0 | — |
| 2 | 2 weeks | $5 (Chrome store) | <50 visitors after 2 weeks |
| 3 | 2 weeks | ~$5/mo hosting | Phase 2 gate not met |
| 4 | 1 week + ongoing | Stripe fees only | <10 sales after 30 days |
| 5 | 2-3 weeks | LLM API costs (pennies) | Phase 4 gate not met |

**Total investment before first revenue signal: ~5-6 weeks, <$20.**

---

## Related Documents

- [Monetization Research (source material)](./monetization-research.md)
- [PRD: Payment + License Infrastructure](https://github.com/graffhyrum/jobAppTracker/issues/9) — GitHub issue #9
- [Polish Free Tier](https://github.com/graffhyrum/jobAppTracker/issues/10) — GitHub issue #10
- [Smart Scrape](https://github.com/graffhyrum/jobAppTracker/issues/11) — GitHub issue #11
