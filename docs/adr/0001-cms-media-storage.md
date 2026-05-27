# CMS Media Storage

CMS media records live in Railway Postgres, but uploaded media files live in durable object storage served through the public site media delivery path. This keeps editor-managed media tied to CMS permissions and metadata without depending on app-local disk or storing image binaries in Postgres, while matching the Cloudflare Pages/R2 delivery model already used for large public assets.

## Considered Options

- **Railway Postgres for files and records**: simpler to model, but makes the database carry binary storage and delivery concerns.
- **Railway app-local disk**: simple locally, but not durable enough for uploaded public assets.
- **Cloudflare R2 for files, Railway Postgres for records**: separates metadata from file delivery and fits the existing public-site infrastructure.

## Consequences

- CMS media needs object-storage configuration before production uploads are fully useful.
- Until object storage is connected, CMS fields that need public images use the shared CMS media adapter for approved root-relative `/assets/...` paths.
- Public rendering should ultimately use approved media URLs from CMS records rather than editor-typed paths.
