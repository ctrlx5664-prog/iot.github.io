declare module "zod" {
  export class ZodError extends Error {
    errors: any[];
  }
  
  interface ZodType<T = any> {
    parse(data: any): T;
    safeParse(data: any): { success: boolean; data?: T; error?: ZodError };
    optional(): ZodType<T | undefined>;
    nullable(): ZodType<T | null>;
    default(value: T): ZodType<T>;
    extend(shape: any): ZodType;
    min(n: number, message?: string): ZodType<T>;
    max(n: number, message?: string): ZodType<T>;
    regex(pattern: RegExp, message?: string): ZodType<T>;
    url(message?: string): ZodType<T>;
    email(message?: string): ZodType<T>;
    _output: T;
  }
  
  namespace z {
    export function string(): ZodType<string>;
    export function number(): ZodType<number>;
    export function boolean(): ZodType<boolean>;
    export function date(): ZodType<Date>;
    export function object<T extends Record<string, ZodType>>(shape: T): ZodType<{ [K in keyof T]: T[K]["_output"] }>;
    export function array<T>(inner: ZodType<T>): ZodType<T[]>;
    function _enum<T extends readonly [string, ...string[]]>(values: T): ZodType<T[number]>;
    export { _enum as enum };
    export function union<T extends ZodType[]>(values: T): ZodType<T[number]["_output"]>;
    export function literal<T>(value: T): ZodType<T>;
    export function undefined(): ZodType<undefined>;
    function _null(): ZodType<null>;
    export { _null as null };
    export function any(): ZodType<any>;
    export type infer<T extends ZodType> = T["_output"];
  }
  
  export { z };
  export type infer<T extends ZodType> = T["_output"];
}

