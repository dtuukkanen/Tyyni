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
    <div className="flex items-start gap-3.5 rounded-lg border border-outline/10 bg-surface-low p-4">
      <IconOrb icon={icon} tone={tone} />
      <div className="flex flex-col gap-0.75">
        <strong className="text-[14.5px] font-semibold text-ink">
          {title}
        </strong>
        <span className="text-[13.5px] leading-[1.48] text-ink-soft">
          {children}
        </span>
      </div>
    </div>
  );
}
