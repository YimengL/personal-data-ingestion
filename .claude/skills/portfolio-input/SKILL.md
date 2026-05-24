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
For each portfolio position from step 2:
- Show: `{ticker} ({long_name}) — last: €{prev_value}`
- Ask for current value
- If `type` is `equity_etf`, also ask for monthly contribution (show: `last monthly: €{prev}`)
- Non-equity positions: `monthly_contribution` = NULL

Then ask: "Any other non-equity positions not in the watchlist? (total value, or skip)"
- If provided, insert as ticker = `OTHER`

### 5. Insert snapshot
Insert all rows via D1 MCP query:
```sql
INSERT OR REPLACE INTO portfolio_snapshots (ticker, date, value, currency, monthly_contribution, created_at)
VALUES ('TICKER', '2026-01-01', 500.0, 'EUR', 100.0, '2026-01-01T00:00:00Z')
```

Use today's date. One INSERT per position.

### 6. Confirm
Show summary of what was saved: ticker, value, monthly contribution, date.
