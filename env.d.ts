/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_REMOTE_API: boolean;
    readonly VITE_API_URL: string;
    readonly VITE_APP_NAME: string;
    readonly VITE_PORT: number;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }