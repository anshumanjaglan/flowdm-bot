# PRD: FlowDM - Meta Automation SaaS (MVP)

**Owner:** Solo founder · **Status:** Draft v2 · **Date:** Oct 2026
**Working name:** `FlowDM` (placeholder)

---

## 1. Executive Summary & Objectives

**Pitch.** Creators and brands get hundreds of "send me the link" comments on their Instagram Reels and Facebook Page posts. FlowDM turns each comment into an automated funnel: keyword detected → public reply posted → DM/Messenger sent → optional follow-up steps (collect email, send link, tag lead), all designed in a visual flow builder.

**Positioning vs ManyChat/SendPulse.** Meta-first (Instagram & Facebook), fast setup (<5 min to first live automation), modern builder UX, transparent pricing.

**Objectives (first 90 days after launch)**
*   Meta App Review approved (Instagram & Facebook endpoints)
*   Time from signup to first live automation: < 5 min
*   Webhook ack latency (p99): < 500 ms
*   Trigger-to-DM delivery (p95): < 10 s
*   Successful DM delivery rate: > 97% (excluding Meta policy rejections)

---

## 2. User Stories

**Creator ("Maya", 40k followers)**
*   I connect my Instagram professional account and Facebook Page in two clicks.
*   I pick a specific Reel or Facebook Post and set keyword(s) like "GUIDE" so only relevant comments trigger a DM/Messenger response.
*   I get a public auto-reply (randomized from a few variants) so my comments don't look spammy.
*   I build the DM sequence visually: message → button → ask for email → send PDF link.
*   I see who triggered, what was sent, and failures, so I trust it's working.

**Brand / social manager**
*   I run multiple automations across posts, each with its own flow, and duplicate flows as templates.
*   I add conditions (e.g., "if user replied with email, tag as lead; else send reminder").
*   I export captured leads as CSV.
*   I want a "Test with my own account" mode before going live.

---

## 3. MVP Scope vs Out of Scope

### In scope (V1)
1.  **Auth & accounts:** Supabase Auth (email + Google). Connect Instagram professional account and Facebook Page via Meta Login (OAuth).
2.  **Automations:** Trigger = new comment on a selected post/Reel (or "any post"), keyword match (contains / exact / any). Facebook and Instagram natively supported side-by-side.
3.  **Comment auto-reply:** public reply, with up to 5 variants chosen randomly.
4.  **DM via Private Reply:** first DM sent to the commenter using the comment ID (IG DM & Messenger).
5.  **Visual flow builder:** Nodes for Trigger, Send Message, Condition, Delay, Collect Input, Tag/Set Variable, End.
6.  **Contacts & Inbox-lite:** contact list, variables, tags, conversation log.
7.  **Analytics:** triggers, DMs sent, replies, completion rate, failures per automation.
8.  **Billing-ready:** plan limits enforced (contacts/month).
9.  **Marketing site:** SSG/SSR pages (home, pricing, docs, privacy, terms).

### Out of scope (V1)
*   X, Telegram, WhatsApp
*   Story mentions/replies, live comments, ads comment triggers
*   Broadcasts / mass messaging
*   Live-agent inbox and human handoff
*   AI-generated replies / LLM nodes

---

## 4. Technical Architecture & Data Flow

### 4.1 Stack and roles
*   **App + marketing + API routes:** Next.js App Router on Vercel
*   **UI:** Tailwind CSS, shadcn/ui or Radix primitives
*   **Flow canvas:** `@xyflow/react` (React Flow) + Zustand store
*   **DB / Auth:** Supabase Postgres, RLS, Supabase Auth
*   **Queue / scheduling:** Upstash QStash (durable delivery, retries, delays, dedup)
*   **Cache / locks / rate limits:** Upstash Redis
*   **External:** Instagram Graph API, Facebook Graph API (Messenger)

### 4.2 Webhook Pipeline
```
Meta (IG & FB) ──POST──▶ /api/webhooks/meta ──publish──▶ QStash ──HTTP POST──▶ /api/worker/process-event
```
1.  **Ingress (`/api/webhooks/meta`):** Verify `X-Hub-Signature-256`. Enqueue payload to QStash. Return 200 OK (<200ms).
2.  **Worker (`/api/worker/process-event`):** Idempotent processing. Route between Instagram and Facebook events. Execute Flow Graph for matching automation. Use Redis rate limiters.
3.  **Meta APIs used:** `POST /{comment-id}/replies`, `POST /{ig-user-id}/messages` (IG) or `POST /me/messages` (FB Page).

---

## 5. High-Level Data Model (PostgreSQL / Supabase)

All tenant tables carry `user_id` with RLS.
*   `profiles`, `social_accounts` (channel enum: 'instagram' | 'facebook_page')
*   `automations`, `flow_versions` (JSONB graph)
*   `contacts`, `flow_runs`, `message_logs`

---

## 6. Phased Implementation Plan

*   **Phase 0:** Meta Developer setup (add both Instagram and Messenger products to App).
*   **Phase 1:** Foundation (Next.js, Supabase, OAuth connect).
*   **Phase 2:** Backend pipeline MVP (Webhooks, QStash, Worker execution).
*   **Phase 3:** React canvas builder.
*   **Phase 4:** Flow executor & stateful features (Messenger & IG side-by-side adaptation).
*   **Phase 5 & 6:** Product polish & App Review hardening.
*   **Phase 7:** Launch.
