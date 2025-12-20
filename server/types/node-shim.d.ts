declare var process: any;
declare const Buffer: any;

declare module "crypto" {
  export function createHmac(alg: string, key: any): {
    update(data: any): any;
    digest(): any;
  };
}

