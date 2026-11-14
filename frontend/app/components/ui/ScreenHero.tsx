import type { ReactNode } from "react";
import { cx, eyebrowBadge, heroSubtitle } from "./styles";

type ScreenHeroProps = {
  /** Leading mark inside the eyebrow badge, usually an `<Icon>`. */
  badge: ReactNode;
  badgeLabel: string;
  title: ReactNode;
  subtitle: ReactNode;
  /** Use the green title colour. */
  green?: boolean;
  /** Extra content under the subtitle, such as a `ReassureBanner`. */
  children?: ReactNode;
};

/** Eyebrow badge, big title and subtitle at the top of a tab. */
export function ScreenHero({
  badge,
  badgeLabel,
  title,
  subtitle,
  green = false,
  children,
}: ScreenHeroProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className={eyebrowBadge}>
        {badge}
        <span>{badgeLabel}</span>
      </span>
      <h1
        className={cx(
          "mt-0.5 mb-0 text-[30px] leading-[1.2] font-semibold tracking-[-0.02em]",
          green ? "text-primary" : "text-ink",
        )}
      >
        {title}
      </h1>
      <p className={heroSubtitle}>{subtitle}</p>
      {children}
    </div>
  );
}
