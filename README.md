# Day 02 — Financial X-Ray

**100 Days of Data Science · Day 02**

Financial X-Ray is a privacy-first personal-finance intelligence product for people who want useful analysis without linking a bank account or sending raw statements to a cloud finance platform. Users can upload CSV/XLSX/XLS bank and card exports, review the mapping, reconcile multiple accounts, inspect cleaned transactions, identify recurring commitments and unusual spending, estimate safe-to-spend capacity, forecast six months of cash-flow direction, stress-test life decisions, and export an action plan.

## Live product

- Production: https://day02-financial-xray.vercel.app
- Shareable demo analysis: https://day02-financial-xray.vercel.app/?demo=1

## Product wedge

> **Drop statements in. Understand what your current financial pattern implies for the next six months. Keep the raw files in your browser.**

This is not designed to be a bookkeeping ledger or an investment adviser. It is a decision-support layer between raw transaction exports and household financial planning.

## Core workflow

```text
Upload one or more CSV/XLSX/XLS statements
        ↓
Review column mapping per statement
        ↓
Validate and normalize transactions
        ↓
Normalize merchants + reconcile internal transfers
        ↓
Detect recurring commitments / drift / unusual spend / sinking funds
        ↓
Estimate monthly economics + income reliability + safe-to-spend
        ↓
Forecast 6-month cash-flow direction with uncertainty
        ↓
Stress-test EMI / rent / income / one-time spend / investment scenarios
        ↓
Export action plan or cleaned transactions
```

## Features implemented

- Multi-statement local import (CSV/XLSX/XLS)
- Per-file column mapping and validation
- India-first `DD/MM/YYYY` parsing for slash/dash statement dates, avoiding browser month/day ambiguity
- Downloadable CSV template for first-time users
- Merchant normalization
- Cross-account internal-transfer reconciliation
- Recurring commitment detection using cadence + amount consistency
- Subscription/payment drift detection
- Robust category-level unusual-spend flags (anomaly ≠ fraud)
- Sinking-fund detection for non-monthly repeat expenses
- Income reliability heuristic and volatility-adjusted emergency-buffer suggestion
- Safe-to-spend estimate
- Six-month cash-flow forecast with uncertainty range
- Interactive life-decision simulator
- Merchant-level recategorization that recomputes the full analysis
- Browser-local category rules remembered across later imports
- Downloadable action plan and cleaned transaction ledger
- Confidence/honesty labels: known / estimate / simulation / heuristic
- Responsive UI, keyboard focus states and `prefers-reduced-motion` support
- Realistic sample mode is optional; real file upload is the primary path
- Shareable `?demo=1` analysis state for product review and portfolio demos

## Why this is not just another budgeting dashboard

A standard budgeting dashboard is mostly retrospective: category charts, month totals, and budget-vs-actual views. Financial X-Ray focuses on **decision utility**:

1. It reconciles multiple exported accounts so credit-card payments do not inflate spending.
2. It converts recurring and annual commitments into forward-looking liquidity pressure.
3. It explicitly separates facts from estimates, heuristics, and simulations.
4. It lets the user change assumptions and see six-month cash-flow impact immediately.
5. It produces an operational action plan instead of requiring the user to interpret every chart.

## Input contract

Minimum useful fields:
- transaction date
- description / narration / merchant
- either a signed amount column **or** debit/credit columns

Helpful optional fields:
- account/card name
- category

Supported now: `.csv`, `.xlsx`, `.xls`.

### Date interpretation

For textual slash/dash dates, Financial X-Ray uses the India-first convention `DD/MM/YYYY`. This rule is applied before generic browser date parsing so an input such as `01/02/2026` is interpreted as **1 February 2026**, not 2 January 2026. ISO `YYYY-MM-DD` and spreadsheet-native date cells are also supported.

### PDF limitation

PDF selection is intentionally **not offered** in the production file picker because browser-local PDF statement extraction is not reliable enough in this version. Users are asked to export CSV/XLSX instead. This avoids shipping a dead-end workflow or fragile OCR while pretending it is trustworthy.

## Methodology

### Merchant normalization
Rule-based cleanup removes common payment-rail noise and long transaction IDs, then applies a small explicit alias dictionary for common sample merchants. Unknown merchants remain readable but are not invented.

### Internal transfers
Opposite-direction transactions in different accounts with matching amounts within two calendar days are paired as internal transfers. These are excluded from income/expense totals.

### Recurring commitments
Transactions are grouped by normalized merchant and direction. A recurring pattern requires at least three observations plus cadence and amount consistency. Monthly, roughly quarterly, annual, and fortnightly patterns are eligible. Confidence decreases with cadence and amount variability.

### Unusual spending
Expense amounts are compared with their category using a robust median/MAD score. A high score is an **investigation flag only**, never a fraud conclusion.

### Income reliability
A transparent heuristic penalizes high month-to-month income variation and months with unusually low income. It is used only to adjust suggested liquidity buffers.

### Forecast
The six-month view uses recent monthly income/expense averages, observed variability, detected monthly commitments and identified non-monthly sinking-fund events. The band expands with forecast horizon. It is a directional statistical estimate, not a guaranteed future balance.

### Scenario simulator
Scenarios are arithmetic overlays on the baseline forecast. The app does **not** estimate behavioural responses (for example, whether taking an EMI changes dining spend).

## Confidence & honesty layer

- **Known from data** — parsed dates, amounts, accounts, user-confirmed categories
- **Statistical estimate** — recurring cadence, baselines, safe-to-spend, forecast
- **Simulation** — user-entered what-if assumptions
- **Heuristic** — anomaly flag, income reliability, suggested emergency buffer
- **Not claimed** — investment advice, fraud diagnosis, lending/credit decision, guaranteed future balances

## Tests

`npm test` covers merchant normalization, transfer reconciliation, recurring detection, forecast/action generation, scenario sensitivity, uncertainty-band widening, ambiguous India-first date parsing, and normalization of `DD/MM/YYYY` statement rows.

The production deployment runs the repository tests before the Next.js build. The QA target is 8 passing tests plus TypeScript/Next.js production compilation before promotion.

## Local development

```bash
npm install
npm test
npm run build
npm run dev
```

## Architecture

- Next.js 16 App Router
- React 19 client workflow
- TypeScript analytics engine (`lib/finance.ts`)
- SheetJS for browser-local CSV/XLSX/XLS parsing
- No application database
- No statement upload API
- LocalStorage only for user-created merchant category rules
- Custom SVG forecast visualization to avoid a heavy chart dependency

## Privacy

Uploaded workbook bytes are read in the browser. This project has no server route for receiving transaction data and no application database. Browser-local category rules store only normalized merchant-to-category preferences, not the uploaded workbook. Users should still avoid deploying modified forks that add third-party scripts without understanding their data access.

## Known limitations / next improvements

- No reliable PDF statement extraction yet
- Textual slash/dash dates are intentionally interpreted as India-first `DD/MM/YYYY`; users with `MM/DD/YYYY` exports should convert dates or use spreadsheet date cells/ISO format
- Merchant normalization is rule-based rather than a production-scale merchant entity model
- Transfer matching can misclassify coincidentally equal opposite transactions and should eventually support user confirmation
- Forecast does not model salary dates, debt amortization, inflation, tax, or causal spending behaviour
- Sinking-fund detection needs repeated historical examples and will miss genuinely one-off annual expenses with only one observation
