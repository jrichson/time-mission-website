/// <reference types="astro/client" />

interface ImportMetaEnv {
    readonly PUBLIC_TM_MEDIA_BASE?: string;
    /** CMS origin for build-time fetch (Landing pages). Prefer process.env during CI. */
    readonly PAYLOAD_CMS_ORIGIN?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
