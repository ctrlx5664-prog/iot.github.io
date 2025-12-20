declare module "wouter" {
  import type { ReactNode } from "react";

  export interface RouteProps {
    path?: string;
    component?: any;
    children?: ReactNode;
  }

  export function Switch(props: { children?: ReactNode }): any;
  export function Route(props: RouteProps): any;
  export function Link(
    props: { href: string; children?: ReactNode } & Record<string, any>
  ): any;

  export function Router(props: { hook?: any; children?: ReactNode }): any;
  export function useLocation(): [string, (to: string, options?: any) => void];
  export function useParams<T extends Record<string, string> = Record<string, string>>(): T;
  export function useRoute(pattern: string): [boolean, any];
}

