import type { ReactNode } from "react";

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
    <div className="hero-header">
      <span className="eyebrow-badge">
        {badge}
        <span>{badgeLabel}</span>
      </span>
      <h1 className={green ? "hero-title hero-title-green" : "hero-title"}>
        {title}
      </h1>
      <p className="hero-subtitle">{subtitle}</p>
      {children}
    </div>
  );
}
