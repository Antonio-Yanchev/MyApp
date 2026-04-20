/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to "true" with the Functions emulator (port 5001) for local API calls */
  readonly VITE_FUNCTIONS_EMULATOR?: string;
}
