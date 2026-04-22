# Site review workbook

**Use this file:** `Time-Mission-Site-Review.xlsx`

Pre-formatted with 3 tabs, dropdowns, conditional formatting, frozen headers, and example rows. Just import into Google Sheets.

## Import into Google Sheets (30 seconds)

1. Go to [sheets.new](https://sheets.new) (blank sheet)
2. `File → Import → Upload → Time-Mission-Site-Review.xlsx`
3. Choose **"Replace spreadsheet"** and click **Import data**
4. Rename the file in the title bar to something like `Time Mission — Site Review Apr 2026`

That's it. Dropdowns, conditional formatting, frozen header rows, and column widths all carry over.

## Share with reviewers

`Share` button → set to **"Anyone with the link — Commenter"**.
Editors: Jefferson + direct collaborators only.
Commenters can add rows and change dropdown values; they can't delete columns or break the structure.

## What's in the workbook

### Tab 1 — Instructions
One-page README for reviewers. Covers how to use the sheet, what to focus on, what to ignore.

### Tab 2 — Feedback  (main tab)
One row per issue. 13 columns:

| # | Date | Reviewer | Role (dropdown) | Page URL | Device (dropdown) | Section | What you saw | What it should be | Priority (dropdown) | Screenshot link | Status (dropdown) | Jefferson's notes |

- **Priority dropdown** (`Blocker` / `Important` / `Nice-to-have`) — color-coded: red / orange / gray
- **Status dropdown** (`New` / `In progress` / `Resolved` / `Won't fix` / `Clarification needed`) — "New" is yellow, "Resolved" is green
- **Role dropdown** (`TM Operator` / `LOL Owner` / `Agency Dev` / `Ads/SEO` / `Legal` / `Customer` / `Other`)
- **Device dropdown** (`Mobile` / `Desktop` / `Both` / `N/A`)
- 3 example rows show the format; delete them before launch
- Room for ~200 rows; extend by inserting rows as needed (dropdowns will extend automatically with Google Sheets fill)

### Tab 3 — Questions
Secondary tab for things that need a DECISION (not a fix). 9 columns. Same dropdown pattern.

## Triage workflow

- **End of day Friday** — feedback window closes
- **Monday** — filter by `Status = New, Priority = Blocker`, triage that first
- Update Status as you resolve. Drop notes in the last column.
- Before launch, archive the Google Sheet as `(ARCHIVED)` for reference.

## Also in this folder

- `feedback.csv`, `questions.csv` — simpler CSV versions if you'd rather build from scratch; not needed if you use the xlsx file.
