/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USERVER_API_URL: string
  readonly VITE_USE_MOCK: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_PATIENT_USE_MOCK?: string
  readonly VITE_CAREGIVER_USE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
