# rig-marketing-website

The main marketing site for [bigrig.app](https://bigrig.app) — the Rig homepage, products
overview, and audience pages (fleets, owner-operators, shops). Next.js 14 (App Router),
deployed to Cloud Run behind a global load balancer that also serves the SEO directory.

## Environments

| Env | Git branch | Cloud Run service | Build config | URL |
|---|---|---|---|---|
| Staging | `web-staging` | `web-staging` (us-central1) | `cloudbuild.staging.yaml` | https://web-staging-wtxxtlhika-uc.a.run.app |
| Production | `main` | `rig-marketing-website` (us-central1) | `cloudbuild-production.yaml` (on `main`) | https://bigrig.app |

Cloud Build triggers live in project `rig-production-337414`, region **global**:
`web-staging-deploy` (push to `web-staging`), `prod-rig-marketing-website` and
`marketing-prod-build-on-tag` (production).

## Branch & release flow

```
feature/xyz ──merge──▶ web-staging ──PR──▶ main
                        (auto-deploys        (production deploy —
                         to staging)          this is a prod cutover)
```

1. **Do work on a feature branch** cut from `main` (or from `web-staging` if it builds on
   unreleased work already there).
2. **Merge the feature branch into `web-staging`** and push. Every push to `web-staging`
   auto-deploys the staging service — integration-test there. Tiny fixes may be committed
   to `web-staging` directly; anything substantial gets a feature branch.
3. **Release = PR from `web-staging` into `main`.** Never commit or push to `main`
   directly. Merging to `main` deploys production — treat every merge as a cutover and
   coordinate before merging.
4. If `web-staging` ever accumulates experiments that shouldn't ship, reset it from
   `main` (`git checkout web-staging && git reset --hard origin/main && git push -f`),
   then re-merge only the branches that should graduate. The staging build config
   (`cloudbuild.staging.yaml`) must survive the reset — re-add it if needed.

## Staging quirks (expected, not bugs)

- **Directory paths 404 on the staging host.** The SEO directory (`/semi-truck-repair/*`)
  is served by the separate `rig-directory` service and only exists behind the production
  load balancer. Redirects like `/texas → /semi-truck-repair/tx/` will therefore 404 on
  `*.run.app` — verify they 301 to the right path, not that the target renders.
- **Footer/directory links jump to production.** They're absolute `https://bigrig.app/...`
  URLs by design (see `data/links.ts` and `data/directory.ts`).

## Site structure & conventions

- **All copy** lives in `data/content.ts` (homepage) and `data/pages.ts` (products,
  owner-operators, shops) — components read from these, don't hard-code copy.
- **All link destinations** resolve through `data/links.ts` (the canonical link map) —
  never hard-code a URL in a component. Directory state/corridor links: `data/directory.ts`.
- **Redirects** (legacy state pages, `/join`, `/fleets`, www→apex backstop) live in
  `next.config.mjs`.
- **Sitemap & robots**: `npm run build:sitemap` merges this site's pages with the
  directory sitemap from the sibling `rig-ads-website` repo checkout and writes
  `public/sitemap.xml` + `public/robots.txt`. Re-run and commit when either site's
  pages change.

## The URL contract

`bigrig.app` is one origin fronting two services: the load balancer routes
`/semi-truck-repair/*` (and `/static/*`, plus a `/semi-truck-repair/_next/*` rewrite)
to `rig-directory`; everything else comes here. The apex is canonical (www 301s to it).
Cross-repo links use stable URLs only (`/join`, `/fleets`, `/semi-truck-repair/…`).
Full contract + redirect registry: see the "bigrig.app URL contract" artifact
(ask Josh for the link).

## Local development

```bash
npm install        # or yarn — CI builds with yarn --frozen-lockfile, don't commit package-lock.json
npm run dev
```
