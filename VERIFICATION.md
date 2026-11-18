# Release verification — 12 November 2026

Commit: `972a206`. Production: https://userello.vercel.app

## Passed in this run

- GitHub/Vercel commit status: deployment completed successfully.
- TypeScript and deterministic AI validation harness: pass.
- Existing authenticated production session loads its résumé dashboard.
- Created a fictional résumé named `QA verification · fictional résumé` (Alex Test).
- Edited name, headline, summary, role, employer and achievement; autosave persisted.
- Opening another editor accordion closes the previous section.
- Production tailoring generated a new copy and two suggestions from a fictional job description.
- Accepted the summary, kept the original experience bullet, refreshed: both decisions and the document content persisted (2 of 2 reviewed).
- Undo restored a pending suggestion and decremented the review count.
- Enter activated Keep original on mobile.
- The source résumé retained its original summary and bullet.
- Production PDF downloaded (71,988 bytes, one page). Extracted text contains the accepted summary and original bullet, and excludes the rejected wording `through simplified user flows`.
- At 390×844, review tab switching and controls work; document scrollWidth equals viewport width (390px).
- Temporary mobile viewport override reset after testing.

## Findings / limits

- AI evidence review still approved a bullet implying the component library caused the onboarding improvement `through simplified user flows`. The original listed both accomplishments but did not explicitly establish that mechanism. The suggestion was rejected during testing. This is a real remaining quality limitation; the model reviewer is not a factual guarantee.
- PDF re-import was attempted but the Chrome automation extension refused local-file access. Upload never reached the application. No extension settings were changed. PDF/DOCX import is not signed off by this run.
- Authentication was exercised through an existing signed-in session. Fresh Google sign-in, email-code delivery, account linking and expired-session recovery remain unverified.
- Save failures/offline recovery, cross-account access control, long multi-page PDFs across all templates and a complete accessibility audit remain unverified. Prior testing is not counted as fresh verification here.
- This run uses one fictional end-to-end example; the earlier three-case AI evaluation is documented separately in scripts/TAILORING-EVALUATION.md.

## Test artifacts

- Source: `/r/6995d2ae-9638-4f9c-b6d4-539362919713`
- Tailored copy: `/r/f580c2b4-c6b7-4637-a567-21130d4933fd/tailor`
- PDF: `C:/Users/HP/Downloads/Alex_Test_Product_Designer_at_Example_Pay.pdf`

The two fictional test résumés were left in the account, clearly identifiable by the source title. Existing user résumés were not edited. Verdict: main workflow verified; full launch verification incomplete.
