import { Icon, type IconName } from "../icons";
import { cx, TONE, type Tone } from "./styles";

export type { Tone } from "./styles";

const BOX = {
  sm: "size-9",
  md: "size-9.5",
  lg: "size-11",
};

type IconOrbProps = {
  icon: IconName;
  size?: number;
  tone?: Tone;
  /** Orb size: 36, 38 or 44 px. */
  box?: keyof typeof BOX;
  /** Square-ish orb instead of the default circle. */
  square?: boolean;
  className?: string;
};

/** An icon sitting in a soft tinted circle. */
export function IconOrb({
  icon,
  size = 20,
  tone,
  box = "lg",
  square = false,
  className,
}: IconOrbProps) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center",
        BOX[box],
        square ? "rounded-[15px]" : "rounded-full",
        tone && TONE[tone],
        className,
      )}
    >
      <Icon name={icon} size={size} />
    </span>
  );
}
