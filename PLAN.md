# Rello — Build Plan

This plan sits on top of `rello prd.md`. Where the two disagree, **this plan wins**. Everything the plan doesn't mention, the PRD still covers (AI honesty rules, editor boundaries, error copy, accessibility, the PDF requirements).

## The product in one line

A Google Docs–style home for resumes: open it and you see templates and your resumes. Make one, and when a job comes up, tailor a copy line by line with suggestions you accept, reject or ask to try again.

## Decisions made (changes from the PRD)

| Topic | PRD said | We're doing |
|---|---|---|
| Resumes per user | One master resume | **Many resumes**, Docs-style grid |
| Templates | One | **3–4** (Classic, Modern, Compact, Minimal), all single-column and ATS-safe, switchable at any time |
| Tailoring output | AI writes a whole new version | **Line-by-line suggestions**: Accept / Reject / Try again per line. Nothing changes until you accept |
| Where tailored changes go | New version | **A new tailored copy** (e.g. "Product Designer — Acme"). The original is never touched |
| Editor | Form + live preview | Same: **form left, live page right**. Clicking a section on the page jumps to its fields |
| Payments | Credits + checkout in MVP | **Later.** Ship free, with a quiet daily AI cap. The credits module comes after we see usage |
| Sign in | Required up front | **Try first.** Start editing as a guest, then sign in (Google/email) to save, tailor or download. The draft carries over |
| AI | OpenAI | **OpenRouter**, using the best free model (picked by testing on sample resumes), behind a swappable interface |

## Screens

### 1. Home (`/`)
When signed in or editing as a guest, this is the app. For a first-time visitor, a short marketing hero sits above it.

- **Start a new resume** row, like Docs' "Start a new document": `+ Blank` card, then one card per template showing a real thumbnail.
- **Tailor a resume** card in the same row, with a distinct accent. It opens the tailor flow.
- **Import resume** (PDF/DOCX) as a smaller action beside them.
- **Your resumes** grid: thumbnail, title, "Edited 2h ago". Tailored copies carry a small job tag ("For: Acme · Product Designer"). Each card has a ⋯ menu: Rename, Duplicate, Download PDF, Tailor, Delete.
- Empty state: "Your next opportunity starts with one resume."

### 2. Editor (`/r/[id]`)
- Top bar: back to home, editable title, save status (Saving… / Saved / Couldn't save), Template switcher, **Tailor for a job**, **Download PDF**.
- Left: collapsible sections (Personal, Summary, Experience, Education, Skills, Projects, Certifications). Entries can be added and reordered. Bullets get an **Improve with AI ▾** menu (Improve, More concise, More impactful, Fix grammar) that shows a suggestion and never overwrites.
- Right: the page at true paper ratio, rendered by the same template code the PDF uses.
- Mobile: Edit / Preview toggle.

### 3. Tailor (`/r/[id]/tailor`) — the core feature
1. **Pick a resume** (preselected when you come from the editor).
2. **Paste the job description.** Job title and company are auto-detected and editable.
3. **Get suggestions.** Honest progress steps: "Reading the job…", "Matching your experience…", "Writing suggestions…".
4. **Review.**
   - Desktop: the page in the center, with lines that have suggestions highlighted. The right rail lists suggestion cards in page order, each showing *current → suggested*, a one-line reason, and **Accept · Reject · Try again** ("Try again" can take an optional nudge like "shorter" or "mention Figma").
   - Left rail (collapsible): **Job match**, showing which requirements are covered, partly covered or missing. Missing ones are never written into the resume.
   - Section-level **Accept all / Reject all**.
   - Skills: suggested reorder, plus adding skills that already appear as evidence elsewhere in the resume.
   - Mobile: a single stack of suggestion cards with a "View page" toggle.
5. The tailored copy is created when you hit "Get suggestions", so nothing gets lost. Accepted lines apply to it live. After that it behaves like any other resume in the editor.

Suggestion targets: summary, experience bullets, project bullets, skills order. Never names, titles, employers, dates, degrees or numbers. The server checks this; we don't just trust the prompt.

### 4. Sign-in (modal, not a page)
Triggered when a guest saves, tailors or downloads. Google or email magic link.

### 5. Settings (`/settings`)
Name, email, delete account and all data.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui.** Check the installed Next version's docs before writing code.
- **Supabase**: Postgres, Auth (Google + email OTP, with **anonymous sign-in for guests**, linked to a real identity on sign-up so drafts carry over), Storage for uploads, RLS on every table.
- **OpenRouter** via one `ai` module (`suggest`, `improve`, `analyzeJob`, `parseResume`) with Zod-validated JSON output. Free-model rate limits mean every call needs a retry path and clear failure copy.
- **PDF**: the resume renders as HTML from one template component. The preview and the PDF both use it. PDF output comes from headless Chromium on the server (`@sparticuz/chromium` on Vercel).
- **Import**: `unpdf` / `mammoth` for text extraction → AI maps the text to fields → the user confirms.
- Vercel hosting; PostHog and Sentry come later.

## Data model (first cut)

- `resumes`: id, user_id, title, template_id, content (jsonb, schema-versioned, stable ids on every entry and bullet), revision, `source_resume_id` (nullable; set on tailored copies), `job_id` (nullable), timestamps.
- `jobs`: id, user_id, title, company, description, analysis (jsonb).
- `tailor_sessions`: id, user_id, resume_id (the copy), job_id, suggestions (jsonb: per-line `{target_id, original, suggested, reason, status: pending|accepted|rejected}`), match (jsonb).
- `ai_usage`: user_id, op, model, tokens, created_at. Backs the daily cap.
- (Later) `credit_ledger`, `payments`, following PRD §14/§17.

## Build phases

1. **Foundation**: project setup, design tokens and UI kit, Supabase schema and RLS, guest + Google/email auth.
2. **Resumes**: home grid, create from blank/template, editor with autosave, 4 templates, live preview, rename/duplicate/delete.
3. **PDF export**: server render, pagination checks, file naming.
4. **Tailor**: job analysis, line suggestions, accept/reject/try again, match panel, tailored copies on home.
5. **AI assist + import**: Improve with AI in the editor, PDF/DOCX import with a review step.
6. **Polish**: mobile pass, empty/error states, accessibility, landing hero, daily AI cap, settings and deletion.
7. **Later**: credits and checkout, analytics, screenshot JD upload.

## Still open
- Final brand check on the name "Rello" (PRD D-01).
- Free OpenRouter models (probed Oct 30, 2026): Nemotron 3.5 Super → dots-3 → Gemma 4 31B, with reasoning turned off (otherwise Nemotron returns no answer). The Gemma free tier was often rate-limited. Still worth a broader quality test on 5–6 real resumes before launch. Known limit: a model can occasionally swap in a related term ("user research" → "usability testing") that no automatic check can catch — the review step is the safeguard.
- The daily AI cap number for free use.
