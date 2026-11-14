import type { ReactNode } from "react";
import { sectionHeaderRow, sectionHeading, sectionMeta } from "./styles";

type SectionHeaderProps = {
  /** Heading id, for the section's `aria-labelledby`. */
  id: string;
  title: ReactNode;
  headingClassName?: string;
  meta?: ReactNode;
  metaClassName?: string;
};

/** A section's heading with a small note on the right. */
export function SectionHeader({
  id,
  title,
  headingClassName = sectionHeading,
  meta,
  metaClassName = sectionMeta,
}: SectionHeaderProps) {
  return (
    <div className={sectionHeaderRow}>
      <h2 id={id} className={headingClassName}>
        {title}
      </h2>
      {meta !== undefined && <span className={metaClassName}>{meta}</span>}
    </div>
  );
}
