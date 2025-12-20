declare module "drizzle-orm/pg-core" {
  export function pgTable(name: string, columns: Record<string, any>): any;
  export function text(name: string): any;
  export function boolean(name: string): any;
  export function integer(name: string): any;
  export function timestamp(name: string, options?: any): any;
  export function uuid(name: string): any;
}

declare module "drizzle-orm" {
  export function eq(column: any, value: any): any;
  export function and(...conditions: any[]): any;
  export function or(...conditions: any[]): any;
}

declare module "drizzle-orm/neon-http" {
  export function drizzle(client: any): any;
}

declare module "@neondatabase/serverless" {
  export function neon(connectionString: string): any;
}

