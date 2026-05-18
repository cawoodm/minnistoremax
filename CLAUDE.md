# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file Express app (`app.js`) that stores JSON blobs in a Google Cloud Storage bucket. Three routes plus a pug-rendered upload form at `/`:

- `POST /upload/:blobId` — writes the JSON body to `bucket/<blobId>`. **An empty body deletes the blob** instead of overwriting it (see `app.js:36`). Returns HTML, not JSON.
- `GET /read/*` — streams the blob back as `application/json`. The blob path is everything after `/read/` (supports slashes in IDs).
- `DELETE /delete/*` — deletes the blob. Same path-after-prefix convention.

The bucket's default object ACL is `publicRead` (set once via `start.ps1`), so every uploaded blob is also reachable directly at `https://storage.googleapis.com/<bucket>/<blobId>` — keep this in mind before storing anything sensitive.

There is no database, no auth, and CORS is wide open (`*`).

## Commands

```powershell
npm run dev      # nodemon, hot reload
npm start        # plain node app.js
```

Local runs need Application Default Credentials for GCS:

```powershell
gcloud auth application-default login
```

`.env` is loaded by `node:process.loadEnvFile()` at startup and must define `GCLOUD_STORAGE_BUCKET` (and optionally `PORT`, defaults to 8080). `start.ps1` is a scratch file of useful gcloud commands (deploy, ACL setup, ADC login) — not an automated entry point.

No test runner, no linter is configured.

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which runs `gcloud app deploy` against project `site-one-404308` (App Engine standard, `nodejs24`, `max_instances: 1`). Auth uses the `GCP_SA_KEY` secret. `app.yaml` hardcodes the bucket name — change it there, not just in `.env`, when targeting a different environment.

Node.js **24+** is required (`package.json` engines + App Engine runtime).
