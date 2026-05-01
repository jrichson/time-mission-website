/// <reference types="astro/client" />

interface ImportMetaEnv {
    readonly PUBLIC_TM_MEDIA_BASE?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
