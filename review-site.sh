#!/bin/bash
# Post-push site review for ClearanceIQ
REPO="C:/Users/Najmi/Documents/Tycoon/site"
URL="https://clearance-iq.com"
LOG="$REPO/.last-push-review.log"

echo "[$(date -Iseconds)] Post-push review started" > "$LOG"

# Fetch latest commit info
cd "$REPO"
git fetch origin main >/dev/null 2>&1
LATEST=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LATEST" != "$REMOTE" ]; then
    echo "WARNING: local HEAD ($LATEST) != origin/main ($REMOTE)" >> "$LOG"
fi

echo "Commit: $LATEST" >> "$LOG"
echo "URL: $URL" >> "$LOG"

# Check live site
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Cache-Control: no-cache" "$URL/" 2>/dev/null || echo "000")
echo "HTTP_CODE: $HTTP_CODE" >> "$LOG"

if [ "$HTTP_CODE" = "200" ]; then
    echo "STATUS: OK - Site responding 200" >> "$LOG"
    # Check key pages
    for page in /pricing /tools/hts-lookup.html /blog/; do
        CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Cache-Control: no-cache" "$URL$page" 2>/dev/null || echo "000")
        echo "  $page -> $CODE" >> "$LOG"
    done
    # Check redirects not broken
    REDIRECT=$(curl -sI "$URL/pricing.html" 2>/dev/null | grep -i "location:" | head -1 || echo "")
    if [ -n "$REDIRECT" ]; then
        echo "  pricing.html redirect: $REDIRECT" >> "$LOG"
    fi
elif [ "$HTTP_CODE" = "308" ] || [ "$HTTP_CODE" = "301" ]; then
    echo "STATUS: WARNING - Got redirect $HTTP_CODE instead of 200" >> "$LOG"
    echo "  This may indicate a redirect loop or misconfigured route" >> "$LOG"
else
    echo "STATUS: FAIL - Expected 200, got $HTTP_CODE" >> "$LOG"
    echo "  Possible causes: deploy failed, CF Pages error, redirect loop" >> "$LOG"
fi

echo "[$(date -Iseconds)] Review complete" >> "$LOG"
echo "" >> "$LOG"
