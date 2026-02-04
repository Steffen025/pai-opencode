#!/usr/bin/env bash

# Verification script for PAI-OpenCode Observability Dashboard

echo "🔍 Verifying PAI-OpenCode Observability Dashboard Setup..."
echo ""

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: package.json not found. Are you in the dashboard directory?"
    exit 1
fi

echo "✅ Found package.json"

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
    echo "⚠️  node_modules not found. Running: bun install"
    bun install
else
    echo "✅ Dependencies installed (node_modules found)"
fi

# Check key files
FILES=(
    "vite.config.ts"
    "tailwind.config.js"
    "src/main.ts"
    "src/App.vue"
    "src/api.ts"
    "src/types.ts"
    "src/components/StatsCards.vue"
    "src/components/EventStream.vue"
    "src/components/EventList.vue"
    "src/components/SessionList.vue"
    "src/pages/Dashboard.vue"
    "src/pages/Events.vue"
    "src/pages/Sessions.vue"
)

echo ""
echo "📁 Checking files..."
MISSING=0
for file in "${FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo "  ✅ $file"
    else
        echo "  ❌ MISSING: $file"
        MISSING=$((MISSING + 1))
    fi
done

if [[ $MISSING -gt 0 ]]; then
    echo ""
    echo "❌ $MISSING files are missing!"
    exit 1
fi

# Check if observability server is running
echo ""
echo "🔌 Checking observability server connection..."
if curl -s -f http://localhost:8889/api/stats > /dev/null 2>&1; then
    echo "✅ Observability server is running on port 8889"
else
    echo "⚠️  Observability server not detected on port 8889"
    echo "   Start it with: cd ../ && bun run server.ts"
fi

# Try a build
echo ""
echo "🏗️  Testing build..."
if bun run build > /dev/null 2>&1; then
    echo "✅ Build successful"
    rm -rf dist
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Dashboard is ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Quick Start:"
echo "   bun run dev       # Start development server"
echo "   bun run build     # Build for production"
echo ""
echo "🌐 Dashboard URL: http://localhost:5173"
echo "🔧 Server URL:    http://localhost:8889"
echo ""
echo "📚 Documentation:"
echo "   - QUICKSTART.md    (quick start guide)"
echo "   - DEVELOPMENT.md   (detailed dev guide)"
echo "   - PROJECT_SUMMARY.md (complete overview)"
echo ""
