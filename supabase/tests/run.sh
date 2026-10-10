#!/bin/sh
# Tries supabase/schema.sql, supabase/assistant.sql and supabase/bridge.sql on a throwaway local
# Postgres: runs each twice (they must be safe to re-run), then the access
# checks as each kind of person.
# Needs Postgres 16+ binaries (initdb, pg_ctl, postgres, psql) and a non-root
# user to run them as. Usage: sh supabase/tests/run.sh
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
BIN=${PG_BIN:-$(dirname "$(command -v initdb || ls /usr/lib/postgresql/*/bin/initdb | tail -1)")}
DIR=$(mktemp -d)
PORT=${PG_PORT:-55433}
trap '"$BIN/pg_ctl" -D "$DIR/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
"$BIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
"$BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR" -l "$DIR/log" -w start >/dev/null
PSQL="psql -h $DIR -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create database cloud"
$PSQL -d cloud -f "$HERE/standins.sql"
$PSQL -d cloud -f "$HERE/../schema.sql" >/dev/null 2>&1 || $PSQL -d cloud -f "$HERE/../schema.sql"
$PSQL -d cloud -f "$HERE/../schema.sql" >/dev/null 2>&1 || $PSQL -d cloud -f "$HERE/../schema.sql"
$PSQL -d cloud -tA -f "$HERE/access.sql"
$PSQL -d cloud -f "$HERE/../assistant.sql" >/dev/null 2>&1 || $PSQL -d cloud -f "$HERE/../assistant.sql"
$PSQL -d cloud -f "$HERE/../assistant.sql" >/dev/null 2>&1 || $PSQL -d cloud -f "$HERE/../assistant.sql"
$PSQL -d cloud -tA -f "$HERE/assistant.sql"
$PSQL -d cloud -f "$HERE/../bridge.sql" >/dev/null 2>&1 || $PSQL -d cloud -f "$HERE/../bridge.sql"
$PSQL -d cloud -f "$HERE/../bridge.sql" >/dev/null 2>&1 || $PSQL -d cloud -f "$HERE/../bridge.sql"
$PSQL -d cloud -tA -f "$HERE/bridge.sql"
