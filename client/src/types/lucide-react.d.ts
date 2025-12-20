declare module "lucide-react" {
  /**
   * Minimal lucide-react icon type to satisfy TS when the real types
   * are unavailable in this environment.
   */
  export type Icon = (props: Record<string, any>) => any;

  // Icons used in the app
  export const Video: Icon;
}

