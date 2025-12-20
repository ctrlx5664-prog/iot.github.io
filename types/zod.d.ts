declare module "zod" {
  export const ZodError: any;
  export function string(): any;
  export function number(): any;
  export function boolean(): any;
  export function object(shape: any): any;
  export function array(inner: any): any;
  export function enum(values: readonly string[]): any;
  export function union(values: any[]): any;
  export function literal(value: any): any;
  export function undefined(): any;
  export function null(): any;
  export function any(): any;
  export type infer<T> = any;
}

