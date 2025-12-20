declare module "react" {
  export type CSSProperties = any;
  export function useEffect(effect: (...args: any[]) => any, deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps?: any[]): T;
  export function useState<S = undefined>(
    initialState?: S | (() => S)
  ): [S, (value: S | ((prev: S) => S)) => void];
  const React: any;
  export default React;
}

