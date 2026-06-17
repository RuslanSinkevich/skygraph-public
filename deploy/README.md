# SkyGraph deploy

Multi-framework subdirectory deploy:

- `/` — landing page (static, `landing/`)
- `/react/` — React demo (`examples/demo`)
- `/react/showcases/` — React showcases (`examples/showcases`)
- `/vue/` — Vue demo (`examples/demo-vue`)
- `/vue/showcases/` — Vue showcases (`examples/showcases-vue`)
- `/angular/` — Angular demo (currently stub: Coming Soon)

Production target: <https://skygraph.ruslansinkevich.ru> (Caddy on host,
static files served from the deploy output).

## Local build (test)

From `skygraph/` root:

```bash
node deploy/build-all.mjs
```

Output: `deploy/output/` — ready static files.

The script:

1. Builds all workspace packages (`packages/*`).
2. Type-checks the React demo (`tsc -b`).
3. Copies the static landing page and root SEO assets into `deploy/output/`.
4. Builds the React demo with `vite build --base=/react/` and copies it into
   `deploy/output/react/`.
5. Builds the React showcases with `vite build --base=/react/showcases/` and
   copies them into `deploy/output/react/showcases/`.
6. Builds the Vue demo and Vue showcases under `deploy/output/vue/`.
7. Copies the Angular stub into `deploy/output/angular/`.

> Production deploy on the VPS uses `infra/scripts/deploy-skygraph.ps1`
> (workspace root). It builds React + showcases + Vue and the static
> landing, then rsyncs the layout above to the server.

## Docker build

From `skygraph/` root:

```bash
docker build -f deploy/Dockerfile -t skygraph-site .
docker run -p 8080:80 skygraph-site
```

Open http://localhost:8080.

> Note: when running locally, Caddy will still serve at the configured
> domain `skygraph.ruslansinkevich.ru`. To test locally either edit your
> `hosts` file or temporarily replace the host block in
> `deploy/Caddyfile` with `:80`.

## Production deploy

1. Server: any Linux VPS with Docker installed.
2. Domain: `skygraph.ruslansinkevich.ru` → A record to VPS IP.
3. On the server:

```bash
git clone https://github.com/RuslanSinkevich/skygraph-public.git
cd skygraph-public
docker build -f deploy/Dockerfile -t skygraph-site .
docker run -d --name skygraph \
  -p 80:80 -p 443:443 \
  -v caddy_data:/data \
  -v caddy_config:/config \
  skygraph-site
```

4. Caddy auto-issues a Let's Encrypt SSL cert on first request.

## Layout

```
deploy/output/
├── index.html                       (static landing)
├── robots.txt                       (search crawler policy)
├── sitemap.xml                      (canonical production URLs)
├── favicon.svg
├── og-image.svg                     (social preview image)
├── site.webmanifest
├── react/index.html                 (React demo)
├── react/showcases/index.html       (React showcases)
├── vue/index.html                   (Vue demo)
├── vue/showcases/index.html         (Vue showcases)
└── angular/index.html               (stub — Coming Soon)
```

`build-all.mjs` builds all four apps and copies them under the right
subpaths. When the Angular demo is ready, replace the stub copy step
with a real `pnpm --filter demo-angular exec vite build --base=/angular/`.
