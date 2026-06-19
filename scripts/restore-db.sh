#!/usr/bin/env bash
# Restore GenieACS MongoDB + BillingHub patches
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

export BILLINGHUB_ROOT="$ROOT_DIR"

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}[BillingHub ACS]${NC} Backup & restore parameter database..."

BACKUP_DIR="$ROOT_DIR/backup/genieacs-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ROOT_DIR/backup"

if mongosh genieacs --quiet --eval 'db.getCollectionNames().length' 2>/dev/null | grep -qv '^0$'; then
  mongodump --db=genieacs --out="$BACKUP_DIR" 2>/dev/null || true
  echo -e "${GREEN}[BillingHub ACS]${NC} Backup: $BACKUP_DIR"
fi

BILLINGHUB_ROOT="$ROOT_DIR" mongosh genieacs --quiet "$SCRIPT_DIR/import-db.mongosh.js"

echo -e "${GREEN}[BillingHub ACS]${NC} Restore selesai."
