# Telemetry deploy

## 1) Install wrangler
npm install -g wrangler

## 2) Login
wrangler login

## 3) Create D1 database + worker (from repo root: C:\Users\Najmi\Documents\Tycoon\site)
wrangler d1 create clearanceiq-telemetry

## 4) Apply schema
wrangler d1 execute clearanceiq-telemetry --file docs/ops/schema.sql

## 5) Deploy worker
cd C:/Users/Najmi/Documents/Tycoon/site
wrangler deploy --config docs/ops/wrangler.toml

## 6) Update site redirects
Add to public/_redirects (create if missing):
/api/telemetry  https://clearanceiq-telemetry.<YOUR-SUBDOMAIN>.workers.dev/api/telemetry  200

## 7) Instrument pages
Add to <head> on index.html and all tools:
<script defer src="/docs/ops/site-inject.js"></script>
