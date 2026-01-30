/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE: string;
    readonly VITE_APP_ENV: string;
    readonly VITE_APP_VERSION: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly MODE: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
