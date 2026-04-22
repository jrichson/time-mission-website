# Google Sheet setup for site review

Two CSVs in this folder import directly into Google Sheets as separate tabs:
- `feedback.csv` — the main feedback log (one row per issue)
- `questions.csv` — secondary tab for things that need your decision, not a fix

## Fast path (~10 min)

1. Create a new Google Sheet. Name it `Time Mission — Site Review Feb 2026` (or similar).
2. **Tab 1: Feedback**
   - `File → Import → Upload → feedback.csv`
   - Import location: "Replace current sheet"
   - Rename the tab `Feedback`
3. **Tab 2: Questions**
   - Add a new tab (bottom-left +)
   - `File → Import → Upload → questions.csv`
   - Import location: "Insert new sheet(s)"
   - Rename to `Questions`
4. Delete the example rows (row 1 of each tab) once real rows start coming in.

## Add dropdowns (5 min — worth it)

### Feedback tab
Select the full column, then `Data → Data validation → Add rule`:

| Column | Values |
|---|---|
| **Role** (D) | `TM Operator, LOL Owner, Agency Dev, Ads/SEO, Legal, Customer, Other` |
| **Device** (F) | `Mobile, Desktop, Both, N/A` |
| **Priority** (J) | `Blocker, Important, Nice-to-have` |
| **Status** (L) | `New, In progress, Resolved, Won't fix, Clarification needed` |

### Conditional formatting for Priority
`Format → Conditional formatting`:
- `Blocker` → red background
- `Important` → orange background
- `Nice-to-have` → gray background

### Freeze header row
`View → Freeze → 1 row`

### Wrap text
Select all columns → `Format → Wrapping → Wrap`

## Share

`Share` → set to **"Anyone with the link — Commenter"** so reviewers can add rows without breaking existing ones. Use Editor only for Jefferson + direct collaborators.

Optional: add a `Priority` column filter view so you can slice by Blocker only when triaging.

## Triage workflow

- **End of day Friday (feedback deadline):** export a view of Status = New, Blocker/Important rows. Triage Monday morning.
- Update Status column as you resolve. Add notes in the last column.
- At launch, archive the sheet as `Time Mission — Site Review Feb 2026 (ARCHIVED)` for future reference.

## CSV reimport

If you want to reset the sheet with the template rows, delete the tab and re-import the CSV. Don't edit the CSV after importing — treat the Google Sheet as the live source.
