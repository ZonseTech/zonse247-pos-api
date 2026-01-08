#!/bin/bash
# Helper script to create a new migration entry

# Generate migration ID (YYYYMMDD_NN format)
DATE=$(date +%Y%m%d)
MIGRATIONS_FILE="src/databases/prisma/migrations.ts"

# Find the last migration number for today
LAST_NUM=$(grep -oP "${DATE}_\K[0-9]+" "$MIGRATIONS_FILE" 2>/dev/null | sort -n | tail -1)
if [ -z "$LAST_NUM" ]; then
    NEXT_NUM="01"
else
    NEXT_NUM=$(printf "%02d" $((10#$LAST_NUM + 1)))
fi

MIGRATION_ID="${DATE}_${NEXT_NUM}"

echo "New migration ID: $MIGRATION_ID"
echo ""
echo "Add this to MIGRATIONS array in $MIGRATIONS_FILE:"
echo ""
echo "  {"
echo "    version: '$MIGRATION_ID',"
echo "    description: 'Your description here',"
echo "    up: \`"
echo "      -- Your SQL here"
echo "    \`,"
echo "  },"
echo ""
echo "Then update CURRENT_DB_VERSION = '$MIGRATION_ID';"
echo ""
echo "Don't forget to also update the template database:"
echo "  npm run db:push  # Apply schema changes"
echo "  npm run db:build-template  # Rebuild template"
