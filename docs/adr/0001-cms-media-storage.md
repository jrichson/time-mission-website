# CMS Media Storage

CMS media records live in Railway Postgres. The initial production implementation stores uploaded image files on a persistent Railway volume mounted at `/data`, and Payload serves their public URLs from the CMS origin. This keeps editor-managed media tied to CMS permissions and metadata without depending on ephemeral app-local disk or storing image binaries in Postgres.

## Considered Options

- **Railway Postgres for files and records**: simpler to model, but makes the database carry binary storage and delivery concerns.
- **Railway app-local disk**: simple locally, but not durable enough for uploaded public assets.
- **Railway persistent volume for files, Railway Postgres for records**: durable with the current single CMS service and requires no second runtime credential path.
- **Cloudflare R2 for files, Railway Postgres for records**: separates metadata from file delivery and fits the existing public-site infrastructure; retain as the scale-out path if the CMS moves beyond one service replica.

## Consequences

- The CMS service must keep its `/data` volume attached and set `PAYLOAD_MEDIA_DIR=/data/media`.
- Public rendering uses approved media URLs from populated CMS media records; older root-relative `/assets/...` hero paths remain supported as a fallback.
- A future R2 migration must preserve media URLs or rewrite stored records before the Railway volume is detached.
