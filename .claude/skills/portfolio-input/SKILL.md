---
name: portfolio-input
description: Record a portfolio snapshot — input current position values and monthly contributions into D1. Use when the user wants to update portfolio, record positions, or log investment values.
---

# Portfolio Input

## Context
- D1 database: `personal-ai-db`
- Table: `portfolio_snapshots`
- Positions sourced from: `ticker_metadata` table (where `portfolio = 1`)

## Steps

### 1. Set Cloudflare account
Use `mcp__claude_ai_Cloudflare_Developer_Platform__set_active_account` if needed.

### 2. Fetch portfolio positions
Query D1 via `mcp__claude_ai_Cloudflare_Developer_Platform__d1_database_query`:
```sql
SELECT ticker, type, long_name, currency
FROM ticker_metadata
WHERE portfolio = 1
ORDER BY ticker
```

### 3. Fetch latest snapshot
```sql
SELECT ticker, date, value, monthly_contribution
FROM portfolio_snapshots
WHERE date = (SELECT MAX(date) FROM portfolio_snapshots)
ORDER BY ticker
```

### 4. Ask for values

**Tier 1 — Metadata positions (from step 2):**
For each position:
- Show: `{ticker} ({long_name}) — last: €{prev_value}`
- Ask for current value
- If `type` is `equity_etf`, also ask for monthly contribution (show: `last monthly: €{prev}`)
- Non-equity positions: `monthly_contribution` = NULL

**Tier 2 — Previous-only positions:**
Find tickers in the latest snapshot (step 3) that are NOT in metadata results (step 2).
For each:
- Show: `{ticker} — last: €{prev_value} (not in watchlist)`
- Ask: same value, update, or remove?
- Default: carry forward previous value

**Tier 3 — New positions:**
Ask: "Any new positions to add? (ticker and value, or skip)"

### 5. Confirm before saving
Show a summary table of all positions to be saved:

| Ticker | Value | Monthly | Source |
|--------|-------|---------|--------|
| SXR8.DE | €500 | €100 | metadata |
| EUWAX | €45 | — | previous |

Show breakdown and total:
```
1. SXR8.DE (iShares Core S&P 500)  €500  monthly: €100
2. EXUS.DE (Xtrackers World ex USA) €200  monthly: €50
3. EUWAX                            €45
Total: €745
```
Ask: "Is this correct? (yes / number to edit / cancel)"
- If number: update that position, then re-confirm
- If cancel: abort without saving

### 6. Insert snapshot
Insert all rows via D1 MCP query:
```sql
INSERT OR REPLACE INTO portfolio_snapshots (ticker, date, value, currency, monthly_contribution, created_at)
VALUES ('TICKER', '2026-01-01', 500.0, 'EUR', 100.0, '2026-01-01T00:00:00Z')
```

Use today's date. One INSERT per position.

### 7. Confirm
Show summary of what was saved with total portfolio value.
