#!/bin/bash

# Verification Script for Session & Config Management Implementation
# Checks that all files are present and properly structured

set -e

echo "🔍 Nexus CLI - Session & Config Management Verification"
echo "========================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0

# Helper function
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} $1 - MISSING"
    ((FAIL++))
  fi
}

check_content() {
  if grep -q "$2" "$1" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} $1 contains '$2'"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} $1 missing '$2'"
    ((FAIL++))
  fi
}

# Session Management Files
echo "📁 Session Management Files"
echo "----------------------------"
check_file "packages/cli/src/core/session/index.ts"
check_file "packages/cli/src/core/session/session-manager.ts"
check_file "packages/cli/src/core/session/session-storage.ts"
check_file "packages/cli/src/core/session/context-manager.ts"
check_file "packages/cli/src/core/session/history-manager.ts"
check_file "packages/cli/src/core/session/README.md"
echo ""

# Config Management Files
echo "📁 Config Management Files"
echo "--------------------------"
check_file "packages/cli/src/core/config/index.ts"
check_file "packages/cli/src/core/config/config-manager.ts"
check_file "packages/cli/src/core/config/profile-manager.ts"
check_file "packages/cli/src/core/config/workspace-detector.ts"
check_file "packages/cli/src/core/config/README.md"
echo ""

# Documentation
echo "📚 Documentation"
echo "----------------"
check_file "IMPLEMENTATION_SUMMARY.md"
echo ""

# Content Checks
echo "🔎 Content Verification"
echo "-----------------------"

# Check for MCP terminology (not Brain)
check_content "packages/cli/src/core/session/session-manager.ts" "mcpMemories"
check_content "packages/cli/src/core/session/session-storage.ts" "mcpMemories"
check_content "packages/cli/src/core/config/config-manager.ts" "MCPConfig"

# Check for .js extensions in imports
SESSION_FILES="packages/cli/src/core/session/*.ts"
for file in $SESSION_FILES; do
  if [ -f "$file" ] && [ "$(basename $file)" != "README.md" ]; then
    if grep "from '\\./" "$file" | grep -v "\.js'" >/dev/null 2>&1; then
      echo -e "${RED}✗${NC} $file has imports without .js extension"
      ((FAIL++))
    else
      echo -e "${GREEN}✓${NC} $file has correct .js extensions"
      ((PASS++))
    fi
  fi
done

CONFIG_FILES="packages/cli/src/core/config/*.ts"
for file in $CONFIG_FILES; do
  if [ -f "$file" ] && [ "$(basename $file)" != "README.md" ]; then
    if grep "from '\\./" "$file" | grep -v "\.js'" >/dev/null 2>&1; then
      echo -e "${RED}✗${NC} $file has imports without .js extension"
      ((FAIL++))
    else
      echo -e "${GREEN}✓${NC} $file has correct .js extensions"
      ((PASS++))
    fi
  fi
done

# Check for @nexus-cli/types imports
check_content "packages/cli/src/core/session/session-manager.ts" "@nexus-cli/types"
check_content "packages/cli/src/core/config/config-manager.ts" "@nexus-cli/types"

echo ""

# Summary
echo "📊 Summary"
echo "----------"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  echo ""
  echo "Session & Config Management Implementation: VERIFIED"
  exit 0
else
  echo -e "${RED}❌ Some checks failed${NC}"
  echo ""
  echo "Please review the failed checks above"
  exit 1
fi
