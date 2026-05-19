/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_APP_TITLE?: string
  readonly VITE_DEV_ACADEMY_LOGIN_EMAIL?: string
  readonly VITE_DEV_ACADEMY_LOGIN_PASSWORD?: string
  readonly VITE_DEV_ACADEMY_TEACHER_EMAIL?: string
  readonly VITE_DEV_ACADEMY_TEACHER_PASSWORD?: string
  readonly VITE_DEV_ACADEMY_USER_EMAIL?: string
  readonly VITE_DEV_ACADEMY_USER_PASSWORD?: string
  readonly VITE_DEV_SYSTEM_ADMIN_LOGIN_EMAIL?: string
  readonly VITE_DEV_SYSTEM_ADMIN_LOGIN_PASSWORD?: string
  /** Fallback tenant slug when JWT has no academy_slug (local API on localhost) */
  readonly VITE_ACADEMY_SLUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
