# Autoresearch: Bundle Size Optimization

## Goal
Minimize total JS bundle size (static chunks) for the Next.js production build.

## Primary Metric
- **total_kb**: Total size of all `.js` files under `.next/static/` in KB (lower is better)

## Benchmark Command
```bash
export PATH="/opt/homebrew/bin:$PATH" && cd /Users/madearga/Desktop/perpuskukaan-web && pnpm build 2>&1 | tail -5 && find .next/static -name "*.js" -exec du -sk {} + 2>/dev/null | awk '{sum+=$1} END {print "METRIC total_kb=" sum}'
```

## Baseline
- ~1456 KB total JS

## Constraints
- Do NOT break existing functionality
- Do NOT remove features or pages
- Do NOT cheat by disabling chunks that are needed
- Must pass `pnpm build` successfully
