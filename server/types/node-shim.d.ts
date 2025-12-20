declare var process: any;
declare const Buffer: any;

declare module "crypto" {
  export function createHmac(alg: string, key: any): {
    update(data: any): any;
    digest(): any;
  };
  export function randomBytes(size: number): { toString(encoding: string): string };
  export function scryptSync(password: any, salt: any, keylen: number): any;
  export function timingSafeEqual(a: any, b: any): boolean;
}

declare module "drizzle-orm" {
  export const eq: any;
}

