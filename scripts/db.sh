#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Paths
SCHEMA_DIR="src/databases/prisma"
MYSQL_SCHEMA="$SCHEMA_DIR/schema.mysql.prisma"
SQLITE_SCHEMA="$SCHEMA_DIR/schema.sqlite.prisma"
ACTIVE_SCHEMA="$SCHEMA_DIR/schema.prisma"
MYSQL_CLIENT="$SCHEMA_DIR/client.mysql.ts"
SQLITE_CLIENT="$SCHEMA_DIR/client.sqlite.ts"
ACTIVE_CLIENT="$SCHEMA_DIR/client.ts"
MIGRATIONS_DIR="$SCHEMA_DIR/migrations"
MYSQL_MIGRATIONS="$SCHEMA_DIR/migrations-mysql"
SQLITE_MIGRATIONS="$SCHEMA_DIR/migrations-sqlite"

print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

switch_schema() {
    local db=$1
    if [ "$db" = "mysql" ]; then
        cp "$MYSQL_SCHEMA" "$ACTIVE_SCHEMA"
        cp "$MYSQL_CLIENT" "$ACTIVE_CLIENT"
        # Switch to MySQL migrations directory
        if [ -d "$MYSQL_MIGRATIONS" ]; then
            rm -rf "$MIGRATIONS_DIR"
            ln -sf "$(basename $MYSQL_MIGRATIONS)" "$MIGRATIONS_DIR"
        fi
        print_info "Switched to MySQL schema and client"
    elif [ "$db" = "sqlite" ]; then
        cp "$SQLITE_SCHEMA" "$ACTIVE_SCHEMA"
        cp "$SQLITE_CLIENT" "$ACTIVE_CLIENT"
        # Switch to SQLite migrations directory
        if [ -d "$SQLITE_MIGRATIONS" ]; then
            rm -rf "$MIGRATIONS_DIR"
            ln -sf "$(basename $SQLITE_MIGRATIONS)" "$MIGRATIONS_DIR"
        fi
        print_info "Switched to SQLite schema and client"
    else
        print_error "Unknown database: $db. Use 'mysql' or 'sqlite'"
        exit 1
    fi
}

cmd_generate() {
    local db=$1
    print_info "Generating Prisma client for $db..."
    switch_schema "$db"
    npx prisma generate
    print_success "Prisma client generated for $db"
}

cmd_migrate() {
    local db=$1
    local name=$2
    
    # Ensure separate migration directories exist
    if [ "$db" = "mysql" ]; then
        mkdir -p "$MYSQL_MIGRATIONS"
    elif [ "$db" = "sqlite" ]; then
        mkdir -p "$SQLITE_MIGRATIONS"
    fi
    
    print_info "Creating and applying migration for $db..."
    switch_schema "$db"
    
    if [ -n "$name" ]; then
        npx prisma migrate dev --name "$name"
    else
        npx prisma migrate dev
    fi
    
    # Backup migrations to the correct directory after migration
    if [ "$db" = "mysql" ] && [ -d "$MIGRATIONS_DIR" ]; then
        rsync -a --delete "$MIGRATIONS_DIR/" "$MYSQL_MIGRATIONS/"
    elif [ "$db" = "sqlite" ] && [ -d "$MIGRATIONS_DIR" ]; then
        rsync -a --delete "$MIGRATIONS_DIR/" "$SQLITE_MIGRATIONS/"
    fi
    
    print_success "Migration completed for $db"
}

cmd_migrate_create() {
    local db=$1
    local name=$2
    
    # Ensure separate migration directories exist
    if [ "$db" = "mysql" ]; then
        mkdir -p "$MYSQL_MIGRATIONS"
    elif [ "$db" = "sqlite" ]; then
        mkdir -p "$SQLITE_MIGRATIONS"
    fi
    
    print_info "Creating migration for $db (without applying)..."
    switch_schema "$db"
    
    if [ -n "$name" ]; then
        npx prisma migrate dev --create-only --name "$name"
    else
        npx prisma migrate dev --create-only
    fi
    
    # Backup migrations to the correct directory after migration
    if [ "$db" = "mysql" ] && [ -d "$MIGRATIONS_DIR" ]; then
        rsync -a --delete "$MIGRATIONS_DIR/" "$MYSQL_MIGRATIONS/"
    elif [ "$db" = "sqlite" ] && [ -d "$MIGRATIONS_DIR" ]; then
        rsync -a --delete "$MIGRATIONS_DIR/" "$SQLITE_MIGRATIONS/"
    fi
    
    print_success "Migration created for $db"
}

cmd_push() {
    local db=$1
    print_info "Pushing schema to $db (skipping migrations)..."
    switch_schema "$db"
    npx prisma db push
    print_success "Schema pushed to $db"
}

cmd_studio() {
    local db=$1
    print_info "Opening Prisma Studio for $db..."
    switch_schema "$db"
    npx prisma studio
}

cmd_reset() {
    local db=$1
    print_warning "This will reset the $db database and ALL DATA WILL BE LOST!"
    read -p "Are you sure? Type 'yes' to confirm: " -r
    echo
    if [[ $REPLY = "yes" ]]; then
        print_info "Resetting $db database..."
        switch_schema "$db"
        npx prisma migrate reset --force
        print_success "Database reset for $db"
    else
        print_info "Reset cancelled"
        exit 0
    fi
}

cmd_deploy() {
    local db=$1
    print_info "Deploying pending migrations to $db..."
    switch_schema "$db"
    npx prisma migrate deploy
    print_success "Migrations deployed to $db"
}

cmd_status() {
    local db=$1
    print_info "Checking migration status for $db..."
    switch_schema "$db"
    npx prisma migrate status
}

cmd_format() {
    local db=$1
    print_info "Formatting $db schema..."
    switch_schema "$db"
    npx prisma format
    # Copy formatted schema back to source
    if [ "$db" = "mysql" ]; then
        cp "$ACTIVE_SCHEMA" "$MYSQL_SCHEMA"
    elif [ "$db" = "sqlite" ]; then
        cp "$ACTIVE_SCHEMA" "$SQLITE_SCHEMA"
    fi
    print_success "Schema formatted for $db"
}

cmd_validate() {
    local db=$1
    print_info "Validating $db schema..."
    switch_schema "$db"
    npx prisma validate
    print_success "Schema is valid for $db"
}

cmd_init_migrations() {
    local db=$1
    print_warning "This will initialize separate migration directories for $db"
    print_info "Current migrations will be backed up to migrations-backup/"
    
    read -p "Continue? (y/N) " -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cancelled"
        exit 0
    fi
    
    # Backup existing migrations
    if [ -d "$MIGRATIONS_DIR" ]; then
        mkdir -p "$SCHEMA_DIR/migrations-backup"
        cp -r "$MIGRATIONS_DIR" "$SCHEMA_DIR/migrations-backup/migrations-$(date +%Y%m%d-%H%M%S)"
        print_success "Backed up existing migrations"
    fi
    
    # Create separate directories
    mkdir -p "$MYSQL_MIGRATIONS"
    mkdir -p "$SQLITE_MIGRATIONS"
    
    # Initialize for the specified database
    switch_schema "$db"
    print_info "Creating initial migration for $db..."
    npx prisma migrate dev --name init
    
    # Save to correct directory
    if [ "$db" = "mysql" ]; then
        rsync -a --delete "$MIGRATIONS_DIR/" "$MYSQL_MIGRATIONS/"
    elif [ "$db" = "sqlite" ]; then
        rsync -a --delete "$MIGRATIONS_DIR/" "$SQLITE_MIGRATIONS/"
    fi
    
    print_success "Migration directories initialized for $db"
    print_info "Now run the same command for the other database"
}

show_help() {
    cat << EOF
${GREEN}Database Management Script${NC}

${YELLOW}Usage:${NC}
  npm run db:<command>:<database>

${YELLOW}Generation:${NC}
  npm run db:gen:mysql        Generate Prisma client for MySQL
  npm run db:gen:sqlite       Generate Prisma client for SQLite

${YELLOW}Migrations:${NC}
  npm run db:migrate:mysql    Create and apply migration for MySQL
  npm run db:migrate:sqlite   Create and apply migration for SQLite
  npm run db:create:mysql     Create migration without applying
  npm run db:create:sqlite    Create migration without applying
  npm run db:deploy:mysql     Deploy migrations (production)
  npm run db:deploy:sqlite    Deploy migrations (production)
  npm run db:status:mysql     Check migration status
  npm run db:status:sqlite    Check migration status

${YELLOW}Development:${NC}
  npm run db:push:mysql       Push schema without migrations
  npm run db:push:sqlite      Push schema without migrations
  npm run db:studio:mysql     Open Prisma Studio for MySQL
  npm run db:studio:sqlite    Open Prisma Studio for SQLite

${YELLOW}Utilities:${NC}
  npm run db:format:mysql     Format schema file
  npm run db:format:sqlite    Format schema file
  npm run db:validate:mysql   Validate schema
  npm run db:validate:sqlite  Validate schema
  npm run db:reset:mysql      Reset database (DESTRUCTIVE!)
  npm run db:reset:sqlite     Reset database (DESTRUCTIVE!)
  npm run db:init:mysql       Initialize separate migrations for MySQL
  npm run db:init:sqlite      Initialize separate migrations for SQLite

${YELLOW}Direct Script Usage:${NC}
  ./scripts/db.sh generate mysql
  ./scripts/db.sh migrate sqlite my_migration_name
  ./scripts/db.sh init mysql  ${RED}# Fix migration conflicts${NC}

${YELLOW}Troubleshooting:${NC}
  If you see "datasource provider mismatch" error:
  1. Run: ./scripts/db.sh init mysql
  2. Run: ./scripts/db.sh init sqlite
  This creates separate migration directories for each database.

EOF
}

# Main execution
COMMAND=$1
DATABASE=$2

if [ -z "$COMMAND" ] || [ -z "$DATABASE" ]; then
    show_help
    exit 1
fi

case $COMMAND in
    generate|gen)
        cmd_generate "$DATABASE"
        ;;
    migrate)
        shift 2
        cmd_migrate "$DATABASE" "$@"
        ;;
    create)
        shift 2
        cmd_migrate_create "$DATABASE" "$@"
        ;;
    push)
        cmd_push "$DATABASE"
        ;;
    studio)
        cmd_studio "$DATABASE"
        ;;
    reset)
        cmd_reset "$DATABASE"
        ;;
    deploy)
        cmd_deploy "$DATABASE"
        ;;
    status)
        cmd_status "$DATABASE"
        ;;
    format)
        cmd_format "$DATABASE"
        ;;
    validate)
        cmd_validate "$DATABASE"
        ;;
    init)
        cmd_init_migrations "$DATABASE"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        echo ""
        show_help
        exit 1
        ;;
esac