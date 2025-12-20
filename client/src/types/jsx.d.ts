declare global {
  namespace JSX {
    // Fallback JSX definitions to keep TS happy when React types are unavailable
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};

