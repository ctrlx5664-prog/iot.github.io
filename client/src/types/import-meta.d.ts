interface ImportMetaEnv {
  VITE_ROUTER_MODE?: string;
  [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

