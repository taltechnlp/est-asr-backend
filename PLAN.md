# PostgreSQL to SQLite Migration Plan

This document outlines the steps to complete the migration from PostgreSQL to SQLite.

## 1. Update Database Schema

The `CREATE TABLE` statement in `migrations/initial.ts` needs to be updated to use SQLite-compatible data types.

-   `timestamp with time zone` should be changed to `TEXT`. The application should ensure that dates are stored in ISO 8601 format (`YYYY-MM-DD HH:MM:SS.SSSZ`).
-   `numeric` can be changed to `INTEGER` or `REAL`.

**File to modify:** `migrations/initial.ts`

## 2. Replace PostgreSQL with SQLite in the Application

The application needs to be updated to use the SQLite connection instead of the PostgreSQL connection pool.

### 2.1. Update `database.ts`

The `database.ts` file should be deleted and all its usages replaced with `sqlite.ts`.

**File to modify:** `database.ts` (delete)
**Files to update:** all files that import from `database.ts`.

### 2.2. Update `app.ts`

-   Remove the import of `dbPool` from `database.ts`.
-   Import `db` from `sqlite.ts`.
-   Rewrite the logic for resuming unfinished transcription workflows to use SQLite. The commented-out block of code should be rewritten to query the SQLite database and then call the `resumeNextflow` function.

**File to modify:** `app.ts`

### 2.3. Update `controllers/transcribe.ts`

-   This file is already partially updated.
-   The `runNextflow` function is not being used. The code that prepares and runs the `Deno.Command` for Nextflow should be moved into the `runNextflow` function and the function should be called.
-   Review the commented-out code and remove it if it's no longer needed.

**File to modify:** `controllers/transcribe.ts`

### 2.4. Update `controllers/workflows.ts`

-   Remove the import of `dbPool` from `database.ts`.
-   Import `db` from `sqlite.ts`.
-   Rewrite all database queries to use the `db` object from `sqlite.ts` and SQLite-compatible SQL syntax. This includes the functions `addWeblog`, `getWorkflowProgressHtml`, `getWorkflowProgress`, and `getResult`.

**File to modify:** `controllers/workflows.ts`

### 2.5. Update `controllers/deleteResults.ts`

-   Remove the import of `dbPool` from `database.ts`.
-   Import `db` from `sqlite.ts`.
-   Rewrite the database query to use the `db` object from `sqlite.ts` and SQLite-compatible SQL syntax.

**File to modify:** `controllers/deleteResults.ts`

## 3. Update `initDb.ts`

The `initDb.ts` file is already partially updated but it should be reviewed to make sure it works with the new schema.

**File to modify:** `initDb.ts`

## 4. Remove PostgreSQL-related files

The following files and directories are no longer needed and should be deleted:

-   `docker-compose.yml`
-   The `.env.example` and `.env.defaults` files should be checked for PostgreSQL-related variables and these should be removed. The user's `.env` file should also be updated.

## 5. Update `README.md`

The `README.md` file needs to be updated to reflect the change from PostgreSQL to SQLite.

-   Remove the "PostgreSQL" section in "Installation".
-   Add a section on how to set up the SQLite database. This should mention that the database is created automatically and that `initDb.ts` should be run to create the schema.
-   Update the "Environment variables" section to remove PostgreSQL-related variables.
-   Update the command for running the application to remove the `--allow-ffi` flag if it's no longer needed.

**File to modify:** `README.md` 