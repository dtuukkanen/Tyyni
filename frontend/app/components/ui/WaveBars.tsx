import { cx } from "./styles";

/** Bar heights and animation delays, left to right. */
const BARS = [
  { height: "h-2.25", delay: "" },
  { height: "h-4", delay: "[animation-delay:0.18s]" },
  { height: "h-1.75", delay: "[animation-delay:0.35s]" },
  { height: "h-3.5", delay: "[animation-delay:0.22s]" },
  { height: "h-2.5", delay: "[animation-delay:0.42s]" },
];

/** Five small sound bars that ripple while audio plays. */
export function WaveBars({ playing }: { playing: boolean }) {
  return (
    <span
      className="inline-flex h-4.5 items-center gap-0.75"
      aria-hidden="true"
    >
      {BARS.map((bar) => (
        <span
          key={bar.height}
          className={cx(
            "w-0.75 rounded-full bg-primary-container",
            bar.height,
            playing
              ? cx("animate-gentle-wave opacity-95", bar.delay)
              : "opacity-55",
          )}
        />
      ))}
    </span>
  );
}
