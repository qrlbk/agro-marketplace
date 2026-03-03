/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SUPPORT_PHONE: string;
  readonly VITE_SUPPORT_EMAIL: string;
  readonly VITE_SHOW_DEMO: string;
  readonly VITE_STAFF_TOTP_REQUIRED: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
