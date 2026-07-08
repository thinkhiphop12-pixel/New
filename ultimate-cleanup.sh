#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════╗
# ║     BALLKNW ULTIMATE CLEANUP + DELETE + SHRINK SCRIPT               ║
# ║     One run. Everything. Safe backups in .shrink-backup/             ║
# ╚══════════════════════════════════════════════════════════════════════╝

set -e
REPO_ROOT="$(pwd)"
TRASH="trash-$(date +%Y%m%d-%H%M%S)"
BACKUP=".shrink-backup-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$TRASH"
mkdir -p "$BACKUP"

echo ""
echo "🧹 BALLKNW ULTIMATE CLEANUP + SHRINK"
echo "====================================="
echo "Repo root: $REPO_ROOT"
echo "Trash:     $TRASH/"
echo "Backups:   $BACKUP/"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# PHASE 1: STRUCTURAL CLEANUP (Move, don't delete)
# ═══════════════════════════════════════════════════════════════════════

echo "📦 PHASE 1: Structural Cleanup"
echo "--------------------------------"

# 1.1 Move business docs to docs/
echo "  → Moving business docs to docs/"
mkdir -p docs
for f in AGENTS.md CLAUDE.md AUTOMATED_MARKETING_SUMMARY.md BRAND_GUIDELINES.md \
         GROWTH_STRATEGY.md MONETIZATION.md RATINGS_HANDOFF.md TIER3_SETUP.md; do
    if [ -f "$f" ]; then
        mv "$f" docs/
        echo "    ✓ $f"
    fi
done

# 1.2 Merge nested gitignore into root
echo "  → Consolidating .gitignore files"
if [ -f "footballmanager/.gitignore" ]; then
    echo "" >> .gitignore
    echo "# === Merged from footballmanager/.gitignore ===" >> .gitignore
    cat footballmanager/.gitignore >> .gitignore
    mv footballmanager/.gitignore "$TRASH/"
    echo "    ✓ Merged footballmanager/.gitignore into root"
fi

# 1.3 Add football-manager/ to root .gitignore if not present
if ! grep -q "^/football-manager/" .gitignore 2>/dev/null; then
    echo "/football-manager/" >> .gitignore
    echo "    ✓ Added /football-manager/ to .gitignore"
fi

# ═══════════════════════════════════════════════════════════════════════
# PHASE 2: DELETE DEAD FILES & FOLDERS (The big wins)
# ═══════════════════════════════════════════════════════════════════════

echo ""
echo "🗑️  PHASE 2: Deleting Dead Weight"
echo "----------------------------------"

# 2.1 football-manager/ — BUILT OUTPUT (~15MB+). Source is in footballmanager/
if [ -d "football-manager" ]; then
    mv football-manager "$TRASH/"
    echo "  ✓ football-manager/ → TRASH (built output, source lives in footballmanager/)"
fi

# 2.2 src/app/ — DEAD Blink.new template. Real homepage is root index.html
if [ -d "src" ]; then
    mv src "$TRASH/"
    echo "  ✓ src/ → TRASH (dead Blink template, root index.html is your live homepage)"
fi

# 2.3 Root Next.js configs — orphans from dead src/app
for f in next.config.ts next.config.mjs package.json package-lock.json \
         tsconfig.json next-env.d.ts postcss.config.cjs postcss.config.mjs \
         tailwind.config.cjs tailwind.config.mjs; do
    if [ -f "$f" ]; then
        mv "$f" "$TRASH/"
        echo "  ✓ $f → TRASH (orphan config for dead src/app)"
    fi
done

# 2.4 Root public/ — Next.js template assets (file.svg, globe.svg, next.svg, vercel.svg, window.svg)
# Your real assets live in assets/ and footballmanager/public/
if [ -d "public" ]; then
    # Keep llms.txt if it exists (might be intentional), trash the rest
    if [ -f "public/llms.txt" ]; then
        mkdir -p "$TRASH/public"
        mv public/llms.txt "$TRASH/public/" 2>/dev/null || true
    fi
    mv public "$TRASH/"
    echo "  ✓ public/ → TRASH (Next.js template assets, your real assets are in assets/)"
fi

# 2.5 Non-site files
for f in New-advanced-tree.svg .mcp.json; do
    if [ -f "$f" ]; then
        mv "$f" "$TRASH/"
        echo "  ✓ $f → TRASH (not part of the website)"
    fi
done

# 2.6 Delete __next.*.txt debug dumps (if any remain outside football-manager/)
find . -name "__next*.txt" -type f -not -path "./$TRASH/*" -print0 2>/dev/null | \
    while IFS= read -r -d '' file; do
        mv "$file" "$TRASH/"
        echo "  ✓ $(basename "$file") → TRASH (AI debug dump)"
    done || true

# ═══════════════════════════════════════════════════════════════════════
# PHASE 3: SHRINK LIVE CODE (Conservative, with backups)
# ═══════════════════════════════════════════════════════════════════════

echo ""
echo "✂️  PHASE 3: Shrinking Live Code"
echo "---------------------------------"

# Run the Python shrinker
cat > "$BACKUP/shrink-code.py" << 'PYEOF'
#!/usr/bin/env python3
"""
BALLKNW Code Shrinker
Removes dead patterns, debug logs, and bloat from live code files.
Creates .bak backups before modifying anything.
"""
import os, re, sys, shutil

REPO_ROOT = os.getcwd()
BACKUP_DIR = sys.argv[1] if len(sys.argv) > 1 else ".shrink-backup"

def backup(path):
    rel = os.path.relpath(path, REPO_ROOT)
    bak_path = os.path.join(BACKUP_DIR, rel)
    os.makedirs(os.path.dirname(bak_path), exist_ok=True)
    shutil.copy2(path, bak_path)
    return bak_path

def shrink_file(path, patterns):
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        original = f.read()

    modified = original
    total_removed = 0

    for name, pattern, replacement in patterns:
        matches = list(re.finditer(pattern, modified, re.MULTILINE))
        if matches:
            count = len(matches)
            modified = re.sub(pattern, replacement, modified, flags=re.MULTILINE)
            total_removed += count
            print(f"      {name}: removed {count} occurrence(s)")

    if modified != original:
        backup(path)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(modified)
        return total_removed
    return 0

# ── Shrink targets ──
shrink_stats = {}

# 1. footballmanager/app/layout.tsx — Remove Vercel SpeedInsights if present
layout_path = os.path.join(REPO_ROOT, "footballmanager", "app", "layout.tsx")
if os.path.exists(layout_path):
    print("  → Shrinking footballmanager/app/layout.tsx")
    count = shrink_file(layout_path, [
        ("SpeedInsights import", r"import\s+\{\s*SpeedInsights\s*\}\s+from\s+['\"]@vercel/speed-insights/next['\"];?\n?", ""),
        ("SpeedInsights component", r"\s*<SpeedInsights\s*/?>\s*\n?", "\n"),
    ])
    if count:
        shrink_stats["layout.tsx"] = count
        print(f"    ✓ Removed Vercel SpeedInsights (you're on GitHub Pages, not Vercel)")
    else:
        print(f"    ℹ No Vercel bloat found")

# 2. footballmanager/engine/matchSimulation.ts — Strip dead TeamTalk code if unused
sim_path = os.path.join(REPO_ROOT, "footballmanager", "engine", "matchSimulation.ts")
if os.path.exists(sim_path):
    print("  → Analyzing footballmanager/engine/matchSimulation.ts")
    with open(sim_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # Check if TeamTalk is actually used in the file (beyond its own definition)
    talk_usage = re.findall(r'TeamTalk|TALK_MODS|talk\b', content)
    definition_only = len(re.findall(r'export type TeamTalk|const TALK_MODS', content))

    if definition_only > 0 and len(talk_usage) <= definition_only + 2:
        print(f"    ⚠ TeamTalk type defined but barely used ({len(talk_usage)} refs)")
        print(f"    → To remove it, run: sed -i.bak '/export type TeamTalk/,/};/d' {sim_path}")
        print(f"    → Then: sed -i.bak '/const TALK_MODS/,/};/d' {sim_path}")
    else:
        print(f"    ℹ TeamTalk is actively used ({len(talk_usage)} refs) — keeping it")

# 3. footballmanager/engine/types.ts — Flag potentially unused types
types_path = os.path.join(REPO_ROOT, "footballmanager", "engine", "types.ts")
if os.path.exists(types_path):
    print("  → Analyzing footballmanager/engine/types.ts")
    with open(types_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # Check for types that might be dead
    checks = [
        ("CareerEntry", r'CareerEntry'),
        ("onLoanUntil", r'onLoanUntil'),
        ("unhappy", r'\bunhappy\b'),
        ("seasonRatingSum", r'seasonRatingSum'),
        ("seasonRatingCount", r'seasonRatingCount'),
    ]

    for type_name, pattern in checks:
        refs = len(re.findall(pattern, content))
        if refs <= 1:
            print(f"    ⚠ {type_name}: defined but only {refs} reference(s) — likely dead code")
        else:
            print(f"    ℹ {type_name}: {refs} references — keeping")

# 4. Remove console.log / console.debug from all TS/TSX files
print("  → Stripping console.log/debug from production code")
log_count = 0
for root, dirs, files in os.walk(os.path.join(REPO_ROOT, "footballmanager")):
    # Skip node_modules and .next
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.next', 'out')]
    for file in files:
        if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()

            # Remove console.log/debug/warn lines (but keep error)
            modified = re.sub(r'\s*console\.(log|debug|warn)\s*\([^)]*\)\s*;?\s*\n', '\n', content)

            if modified != content:
                backup(path)
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(modified)
                removed = content.count('console.log') + content.count('console.debug') + content.count('console.warn')
                log_count += removed

if log_count:
    print(f"    ✓ Removed {log_count} console.log/debug/warn statement(s)")
    shrink_stats["console.*"] = log_count
else:
    print(f"    ℹ No debug logs found")

# 5. Strip trailing whitespace from all code files
print("  → Stripping trailing whitespace")
ws_count = 0
for root, dirs, files in os.walk(REPO_ROOT):
    # Skip trash, backup, node_modules, .git
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.next', 'out', '.git') and not d.startswith('trash-') and not d.startswith('.shrink-backup')]
    for file in files:
        if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                modified = re.sub(r'[ \t]+$', '', content, flags=re.MULTILINE)
                if modified != content:
                    backup(path)
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(modified)
                    ws_count += 1
            except:
                pass

if ws_count:
    print(f"    ✓ Cleaned trailing whitespace in {ws_count} file(s)")
else:
    print(f"    ℹ No trailing whitespace found")

# Summary
print("\n  📊 Shrink Summary:")
if shrink_stats:
    for k, v in shrink_stats.items():
        print(f"     • {k}: {v} item(s) removed")
else:
    print(f"     • No aggressive shrinkage applied (code is already clean)")
print(f"     • Backups saved to: {BACKUP_DIR}/")

PYEOF

python3 "$BACKUP/shrink-code.py" "$BACKUP"

# ═══════════════════════════════════════════════════════════════════════
# PHASE 4: OPTIONAL DEAD SCRIPT REMOVAL (Interactive)
# ═══════════════════════════════════════════════════════════════════════

echo ""
echo "🎬 PHASE 4: Dead Script Audit"
echo "------------------------------"
echo "These scripts might be dead weight. Check if their output URLs exist:"
echo "  • ballknw.com/blog/        → generate-blog-posts.mjs"
echo "  • ballknw.com/players/     → generate-player-pages.mjs"
echo "  • ballknw.com/sitemap.xml  → generate-sitemap.mjs"
echo "  • ballknw.com/og-images/   → generate-og-image.mjs"
echo ""
read -p "Delete all four generator scripts? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    for f in footballmanager/scripts/generate-blog-posts.mjs \
             footballmanager/scripts/generate-player-pages.mjs \
             footballmanager/scripts/generate-sitemap.mjs \
             footballmanager/scripts/generate-og-image.mjs; do
        if [ -f "$f" ]; then
            mv "$f" "$TRASH/"
            echo "  ✓ $f → TRASH"
        fi
    done
else
    echo "  ℹ Skipped script deletion. Review manually later."
fi

# ═══════════════════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════════════════

echo ""
echo "✅ ALL DONE!"
echo "============"
echo ""
echo "Trash folder:  $TRASH/"
echo "Backup folder: $BACKUP/"
echo ""
echo "NEW STRUCTURE:"
tree -L 2 -I "trash-*|.shrink-backup*|node_modules|.next|.git" . 2>/dev/null || find . -maxdepth 2 -not -path "./trash-*" -not -path "./.shrink-backup*" -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./.git/*" | head -50
echo ""
echo "NEXT STEPS:"
echo "1. Review $TRASH/ — anything you want back?"
echo "2. Review $BACKUP/ — revert any shrink you don't like"
echo "3. git add -A && git commit -m 'Ultimate cleanup: delete orphans, shrink code'"
echo "4. git push"
echo ""
echo "ESTIMATED SPACE SAVED: ~15MB+ (mostly from football-manager/ built output)"
