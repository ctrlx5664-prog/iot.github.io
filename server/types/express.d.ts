declare module "express" {
  export type Request = any;
  export type Response = any;
  export type NextFunction = any;

  export type ExpressHandler = (req: Request, res: Response) => any | Promise<any>;

  export interface Express {
    use: (...args: any[]) => any;
    get: (path: string, handler: ExpressHandler) => any;
    post: (path: string, handler: ExpressHandler) => any;
    delete: (path: string, handler: ExpressHandler) => any;
    patch: (path: string, handler: ExpressHandler) => any;
    listen?: (...args: any[]) => any;
  }

  export default function express(): Express;
  export function Router(): any;
}

