import { Icon, type IconName } from "../icons";

/** Colour washes defined in globals.css for orbs, avatars and pills. */
export type Tone =
  | "tone-moss"
  | "tone-eucalyptus"
  | "tone-blush"
  | "tone-linen";

type IconOrbProps = {
  icon: IconName;
  size?: number;
  tone?: Tone;
  /** Square-ish orb instead of the default circle. */
  square?: boolean;
  className?: string;
};

/** An icon sitting in a soft tinted circle. */
export function IconOrb({
  icon,
  size = 20,
  tone,
  square = false,
  className,
}: IconOrbProps) {
  const classes = ["icon-orb", !square && "icon-orb-round", tone, className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes}>
      <Icon name={icon} size={size} />
    </span>
  );
}
