# Phase 6: Analytics, Consent & Forms Contract - Discussion Log

> **Audit trail only.** Decisions are captured in `06-CONTEXT.md`.

**Date:** 2026-04-29  
**Phase:** 06-analytics-consent-forms-contract  
**Areas discussed:** Consent Mode, server-side contract, taxonomy, forms, CSP+GTM, instrumentation waves  

---

## Area selection

**User's choice (multi-select):** All six proposed gray areas:
- Consent Mode v2 bootstrap / CMP scope  
- Server-side `/api/events` (ANLY-04)  
- Event taxonomy vs `analytics-labels.json`  
- Forms + thank-you (FORM-01–04)  
- CSP & GTM load order  
- Instrumentation rollout (waves)  

**Notes:** Discussion applied **PROJECT.md** and **REQUIREMENTS.md** constraints; recommendations were adopted as locked **D-01–D-16** in `06-CONTEXT.md` without conflicting prior phase decisions.

---

## Claude's Discretion

- `event_id` algorithm, `track()` file layout, CSP hostname list, Playwright depth — see **Claude's Discretion** in `06-CONTEXT.md`.

## Deferred Ideas

- Full CMP/banner UI, live `/api/events` deployment, non-GTM pixels — see **Deferred** in `06-CONTEXT.md`.
