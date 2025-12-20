declare module "lucide-react" {
  /**
   * Minimal lucide-react icon type to satisfy TS when the real types
   * are unavailable in this environment.
   */
  export type Icon = (props: Record<string, any>) => any;

  // Icons used in the app
  export const Video: Icon;
  export const Building2: Icon;
  export const Lightbulb: Icon;
  export const Monitor: Icon;
  export const Home: Icon;
  export const Plus: Icon;
  export const Users: Icon;
  export const ChevronDown: Icon;
  export const ChevronUp: Icon;
  export const Copy: Icon;
  export const Check: Icon;
  export const PanelLeftIcon: Icon;
  export const Power: Icon;
  export const Volume2: Icon;
  export const VolumeX: Icon;
  export const Play: Icon;
  export const Pause: Icon;
  export const SkipForward: Icon;
  export const SkipBack: Icon;
  export const Tv: Icon;
}

