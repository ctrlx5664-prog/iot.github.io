declare module "react-dom/client" {
  import * as ReactDOM from "react-dom";
  export * from "react-dom";
  export function createRoot(container: Element | DocumentFragment): ReactDOM.Root;
}

