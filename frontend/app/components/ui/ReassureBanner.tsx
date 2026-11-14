import type { ReactNode } from "react";
import type { IconName } from "../icons";
import { IconOrb, type Tone } from "./IconOrb";

type ReassureBannerProps = {
  icon: IconName;
  tone: Tone;
  title: string;
  children: ReactNode;
};

/** A soft note under a screen's hero: orb, bold line and a sentence. */
export function ReassureBanner({
  icon,
  tone,
  title,
  children,
}: ReassureBannerProps) {
  return (
    <div className="reassure-banner">
      <IconOrb icon={icon} tone={tone} />
      <div className="reassure-copy">
        <strong>{title}</strong>
        <span>{children}</span>
      </div>
    </div>
  );
}
