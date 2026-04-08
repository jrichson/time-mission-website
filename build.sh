#!/bin/bash
# ==========================================
# Time Mission — Component Sync Build Script
# ==========================================
# Syncs shared HTML components (ticket panel) from components/
# into all site pages. Run after editing any component partial.
#
# Usage:
#   ./build.sh              # Sync all pages
#   ./build.sh index.html   # Sync a specific page
# ==========================================

set -e
cd "$(dirname "$0")"

TICKET_PANEL="components/ticket-panel.html"

# All pages that include the ticket panel
PAGES=(
    index.html
    about.html
    experiences.html
    faq.html
    contact.html
    groups.html
    gift-cards.html
    mount-prospect.html
    philadelphia.html
    manassas.html
    west-nyack.html
    lincoln.html
    houston.html
    antwerp.html
    locations/index.html
)

# If a specific file is passed, only process that one
if [ -n "$1" ]; then
    PAGES=("$1")
fi

sync_ticket_panel() {
    local page="$1"
    local partial="$TICKET_PANEL"

    # For pages in subdirectories, no adjustment needed since partial is HTML content
    if [ ! -f "$page" ]; then
        echo "  SKIP $page (not found)"
        return
    fi

    # Check if page has the ticket panel markers
    if grep -q '<!-- Ticket Popup Panel -->' "$page"; then
        # Use Python for reliable multiline replacement
        python3 -c "
import re
with open('$page', 'r') as f:
    content = f.read()
with open('$partial', 'r') as f:
    replacement = f.read()
# Match from <!-- Ticket Popup Panel --> through closing </div> of ticket-panel
pattern = r'    <!-- Ticket Popup Panel -->.*?</div>\n    </div>\n'
new_content = re.sub(pattern, replacement, content, flags=re.DOTALL, count=1)
if new_content != content:
    with open('$page', 'w') as f:
        f.write(new_content)
    print(f'  SYNCED $page')
else:
    print(f'  OK     $page (already in sync)')
"
    else
        echo "  SKIP $page (no ticket panel marker)"
    fi
}

echo "Time Mission — Syncing Components"
echo "================================="
echo ""

if [ ! -f "$TICKET_PANEL" ]; then
    echo "ERROR: $TICKET_PANEL not found"
    exit 1
fi

echo "Ticket Panel:"
for page in "${PAGES[@]}"; do
    sync_ticket_panel "$page"
done

echo ""
echo "Done! Booking URLs are managed in js/ticket-panel.js"
echo "To update booking URLs, edit js/ticket-panel.js (single source of truth)."
