import type { SVGProps } from "react";

export type IconName =
  | "sun"
  | "spa"
  | "heart"
  | "heartFilled"
  | "anchor"
  | "user"
  | "lowEnergy"
  | "droplet"
  | "sprout"
  | "stone"
  | "twilight"
  | "waterGlass"
  | "cloud"
  | "plus"
  | "users"
  | "wave"
  | "check"
  | "checkCircle"
  | "air"
  | "infinity"
  | "waves"
  | "play"
  | "pause"
  | "forest"
  | "pin"
  | "meditate"
  | "bed"
  | "walk"
  | "verified"
  | "sos"
  | "tree"
  | "flower"
  | "moon"
  | "voice"
  | "volume"
  | "tap"
  | "equalizer"
  | "phone"
  | "snowflake"
  | "calendar"
  | "arrowDown"
  | "download"
  | "wifiOff"
  | "close"
  | "info"
  | "pen";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

export function TyyniLogo({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="11" fill="#c2ebdf" />
      <path
        d="M16 7.5C12.5 11 10.5 14.3 10.5 17.5C10.5 20.6 12.9 23 16 23C19.1 23 21.5 20.6 21.5 17.5C21.5 14.3 19.5 11 16 7.5Z"
        fill="#3a6057"
        fillOpacity="0.18"
      />
      <path
        d="M16 8.5C13 11.7 11.5 14.6 11.5 17.3C11.5 19.9 13.5 22 16 22C18.5 22 20.5 19.9 20.5 17.3C20.5 14.6 19 11.7 16 8.5Z"
        stroke="#224840"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 13.5V22M16 17.5C14.3 17.2 13.3 16.2 13 15M16 19C17.6 18.6 18.6 17.6 19 16.4"
        stroke="#224840"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9.5 25.2C11.5 26.2 13.7 26.7 16 26.7C18.3 26.7 20.5 26.2 22.5 25.2"
        stroke="#43664d"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Icon({ name, size = 20, className, ...props }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.85,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
    ...props,
  };

  switch (name) {
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
        </svg>
      );
    case "spa":
      return (
        <svg {...common}>
          <path d="M12 4.5C9.4 7.6 8 10.6 8 13.5A4 4 0 0 0 12 17.5A4 4 0 0 0 16 13.5C16 10.6 14.6 7.6 12 4.5Z" />
          <path d="M12 17.5C8.5 17.5 5.2 15.6 4 12.2C6.8 11.8 9.2 12.8 10.8 14.8" />
          <path d="M12 17.5C15.5 17.5 18.8 15.6 20 12.2C17.2 11.8 14.8 12.8 13.2 14.8" />
          <path d="M8.5 20h7" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common}>
          <path d="M12 20.2s-7-4.4-8.6-8.7A4.9 4.9 0 0 1 12 6.8a4.9 4.9 0 0 1 8.6 4.7c-1.6 4.3-8.6 8.7-8.6 8.7Z" />
        </svg>
      );
    case "heartFilled":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M12 20.6s-7.3-4.6-8.9-9.1A5.2 5.2 0 0 1 12 6.4a5.2 5.2 0 0 1 8.9 5.1c-1.6 4.5-8.9 9.1-8.9 9.1Z" />
        </svg>
      );
    case "anchor":
      return (
        <svg {...common}>
          <circle cx="12" cy="5.5" r="2.2" />
          <path d="M12 7.7v12.8M8.5 11.5h7" />
          <path d="M5 14.5a7 7 0 0 0 14 0" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="3.3" />
          <path d="M5.8 19.2a6.5 6.5 0 0 1 12.4 0" />
        </svg>
      );
    case "lowEnergy":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path
            d="M12 3.5a8.5 8.5 0 0 1 0 17V3.5Z"
            fill="currentColor"
            stroke="none"
            opacity="0.78"
          />
        </svg>
      );
    case "droplet":
      return (
        <svg {...common}>
          <path d="M12 3.8C8.6 8 6.5 11.2 6.5 14.3a5.5 5.5 0 0 0 11 0C17.5 11.2 15.4 8 12 3.8Z" />
        </svg>
      );
    case "sprout":
      return (
        <svg {...common}>
          <path d="M12 20v-8" />
          <path d="M12 13C12 9.5 9.2 7 5.5 7c0 3.7 2.8 6 6.5 6Z" />
          <path d="M12 11c0-3.2 2.6-5.5 6.2-5.5 0 3.4-2.6 5.5-6.2 5.5Z" />
          <path d="M8.5 20h7" />
        </svg>
      );
    case "stone":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="16.8" rx="7.5" ry="3.2" />
          <ellipse cx="12" cy="11.5" rx="5.2" ry="2.5" />
          <ellipse cx="12" cy="7.2" rx="3" ry="1.8" />
        </svg>
      );
    case "twilight":
      return (
        <svg {...common}>
          <path d="M4 17.5h16M6.5 20.5h11" />
          <path d="M7.5 17.5a4.5 4.5 0 0 1 9 0" />
          <path d="M12 8v2M6.8 10.5l1.4 1.4M17.2 10.5l-1.4 1.4" />
        </svg>
      );
    case "waterGlass":
      return (
        <svg {...common}>
          <path d="M6.8 4.5h10.4l-1.2 14a1.8 1.8 0 0 1-1.8 1.6H9.8A1.8 1.8 0 0 1 8 18.5L6.8 4.5Z" />
          <path d="M7.4 10.5c1.6.9 3.2-.9 4.6 0s3 .9 4.6 0" />
        </svg>
      );
    case "cloud":
      return (
        <svg {...common}>
          <path d="M6.8 18.5h10.4a4 4 0 0 0 .5-7.9A5.5 5.5 0 0 0 7 9.3a4.6 4.6 0 0 0-.2 9.2Z" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5.5v13M5.5 12h13" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9.2" cy="8.5" r="3" />
          <path d="M3.8 18.5a5.5 5.5 0 0 1 10.8 0" />
          <circle cx="16.5" cy="9.5" r="2.3" />
          <path d="M15.2 18.5h5a4.2 4.2 0 0 0-4.2-3.8" />
        </svg>
      );
    case "wave":
      return (
        <svg {...common}>
          <path d="M8.5 12.5V6.8a1.3 1.3 0 0 1 2.6 0v4.7" />
          <path d="M11.1 10.5V5.8a1.3 1.3 0 0 1 2.6 0v5.7" />
          <path d="M13.7 11V7.2a1.3 1.3 0 0 1 2.6 0v6.3a5.5 5.5 0 0 1-10.2 2.8l-1.3-2.3a1.3 1.3 0 0 1 2.2-1.3l1.5 1.8" />
          <path d="M5.2 6.8a4.5 4.5 0 0 1 2-2.2M18.8 6.8a4.5 4.5 0 0 0-2-2.2" />
        </svg>
      );
    case "check":
      return (
        <svg {...common} strokeWidth={2.3}>
          <path d="M5.5 12.5l4.2 4.2 8.8-9.2" />
        </svg>
      );
    case "checkCircle":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.8" />
          <path d="M8.4 12.3l2.4 2.4 4.9-5.1" />
        </svg>
      );
    case "air":
      return (
        <svg {...common}>
          <path d="M4 9.5h11.2a2.5 2.5 0 1 0-2.4-3.2" />
          <path d="M4 13.5h14a2.5 2.5 0 1 1-2.4 3.2" />
          <path d="M4 17.5h7.2" />
        </svg>
      );
    case "infinity":
      return (
        <svg {...common}>
          <path d="M8.2 15.5a3.5 3.5 0 1 1 0-7c2.5 0 5.1 7 7.6 7a3.5 3.5 0 1 0 0-7c-2.5 0-5.1 7-7.6 7Z" />
        </svg>
      );
    case "waves":
      return (
        <svg {...common}>
          <path d="M3.5 8.5c2-1.6 4-1.6 6 0s4 1.6 6 0 3.5-1.4 5-.3" />
          <path d="M3.5 12.5c2-1.6 4-1.6 6 0s4 1.6 6 0 3.5-1.4 5-.3" />
          <path d="M3.5 16.5c2-1.6 4-1.6 6 0s4 1.6 6 0 3.5-1.4 5-.3" />
        </svg>
      );
    case "play":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M8 6.2c0-.9 1-1.5 1.8-1l9 5.8c.7.5.7 1.5 0 2l-9 5.8c-.8.5-1.8-.1-1.8-1V6.2Z" />
        </svg>
      );
    case "pause":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <rect x="7" y="5.5" width="3.6" height="13" rx="1.3" />
          <rect x="13.4" y="5.5" width="3.6" height="13" rx="1.3" />
        </svg>
      );
    case "forest":
      return (
        <svg {...common}>
          <path d="M9.5 4.5L4.5 13h3.2L5.5 17.5h8.2" />
          <path d="M9.5 4.5l4.2 7.2" />
          <path d="M15.5 6.5l4.5 7.5h-2.8l2.3 3.5h-7.5l2.2-3.5h-2.6l3.9-7.5Z" />
          <path d="M9.5 17.5V20M15.5 17.5V20" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M12 20.5s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
          <circle cx="12" cy="10.5" r="2.2" />
        </svg>
      );
    case "meditate":
      return (
        <svg {...common}>
          <circle cx="12" cy="5.8" r="2.1" />
          <path d="M7.5 14.5l3-4.2h3l3 4.2" />
          <path d="M5.5 18.2c2.2-1.4 4.4-1.8 6.5-1.8s4.3.4 6.5 1.8" />
          <path d="M4.8 14.5h3.5M15.7 14.5h3.5" />
        </svg>
      );
    case "bed":
      return (
        <svg {...common}>
          <path d="M3.5 7.5v10M20.5 11.5v6M3.5 14.5h17" />
          <path d="M6.5 11.5h3.5a1.5 1.5 0 0 0 0-3H6.5a1.5 1.5 0 0 0 0 3Z" />
          <path d="M12 11.5h6.5a2 2 0 0 1 2 2v1H12v-3Z" />
        </svg>
      );
    case "walk":
      return (
        <svg {...common}>
          <circle cx="12.5" cy="5.2" r="1.9" />
          <path d="M10 20l2-5.5 2.8 2.2V20" />
          <path d="M8.2 12.5l3.2-3.2 2.2 1.2 2.8 1.5" />
          <path d="M11.4 9.3l-.9 5.2" />
        </svg>
      );
    case "verified":
      return (
        <svg {...common}>
          <path d="M12 3.3l2.4 1.4 2.8-.2.9 2.7 2.2 1.7-.9 2.6.9 2.6-2.2 1.7-.9 2.7-2.8-.2L12 20.7l-2.4-1.4-2.8.2-.9-2.7-2.2-1.7.9-2.6-.9-2.6 2.2-1.7.9-2.7 2.8.2L12 3.3Z" />
          <path d="M9 12.2l2 2 4.2-4.3" />
        </svg>
      );
    case "sos":
      return (
        <svg {...common}>
          <path d="M12 3.5l8.5 8.5-8.5 8.5L3.5 12 12 3.5Z" />
          <path d="M12 8.5v4M12 15.5h.01" />
        </svg>
      );
    case "tree":
      return (
        <svg {...common}>
          <path d="M12 15.5a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
          <path d="M12 12.5V20M9 20h6" />
        </svg>
      );
    case "flower":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.2" />
          <circle cx="12" cy="6.8" r="2.4" />
          <circle cx="16.8" cy="9.8" r="2.4" />
          <circle cx="15" cy="15.5" r="2.4" />
          <circle cx="9" cy="15.5" r="2.4" />
          <circle cx="7.2" cy="9.8" r="2.4" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M18.5 14.8A7.2 7.2 0 0 1 9.2 5.5a7.3 7.3 0 1 0 9.3 9.3Z" />
        </svg>
      );
    case "voice":
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="3" />
          <path d="M4 19a5.2 5.2 0 0 1 10 0" />
          <path d="M16 8.2a3.5 3.5 0 0 1 0 4.6M18.6 6.2a6.5 6.5 0 0 1 0 8.6" />
        </svg>
      );
    case "volume":
      return (
        <svg {...common}>
          <path d="M5 9.8h3.2L12.5 6v12l-4.3-3.8H5V9.8Z" />
          <path d="M15.8 9.2a4.2 4.2 0 0 1 0 5.6M18.5 6.8a7.5 7.5 0 0 1 0 10.4" />
        </svg>
      );
    case "tap":
      return (
        <svg {...common}>
          <path d="M9.5 11V6.8a2 2 0 0 1 4 0v3.7h1.2a2.8 2.8 0 0 1 2.8 2.8v2.2a4.5 4.5 0 0 1-4.5 4.5h-2.4a4.5 4.5 0 0 1-4-2.5l-1.4-2.8a1.4 1.4 0 0 1 2.4-1.3l1.9 1.8" />
          <path d="M7.5 4.8a4.5 4.5 0 0 1 8 0" />
        </svg>
      );
    case "equalizer":
      return (
        <svg {...common}>
          <path d="M5 10v4M9.5 6.5v11M14 8.5v7M18.5 10.5v3" />
        </svg>
      );
    case "phone":
      return (
        <svg {...common}>
          <path d="M6.6 4.5h2.8l1.2 3.4-1.8 1.5a11.5 11.5 0 0 0 5.8 5.8l1.5-1.8 3.4 1.2v2.8a2 2 0 0 1-2.2 2A14.8 14.8 0 0 1 4.6 6.7a2 2 0 0 1 2-2.2Z" />
        </svg>
      );
    case "snowflake":
      return (
        <svg {...common}>
          <path d="M12 3.5v17M4.6 7.8l14.8 8.4M19.4 7.8L4.6 16.2" />
          <path d="M10 5.2L12 7l2-1.8M10 18.8L12 17l2 1.8" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
          <path d="M8 3.8v3.2M16 3.8v3.2M4 10h16" />
        </svg>
      );
    case "arrowDown":
      return (
        <svg {...common}>
          <path d="M12 5v14M6.5 13.5L12 19l5.5-5.5" />
        </svg>
      );
    case "download":
      return (
        <svg {...common}>
          <path d="M12 4.5v10.5M8 11.2L12 15.2l4-4" />
          <path d="M5 18.5h14" />
        </svg>
      );
    case "wifiOff":
      return (
        <svg {...common}>
          <path d="M3.5 3.5l17 17" />
          <path d="M8.5 15.5a5 5 0 0 1 6.5-.5" />
          <path d="M5.2 12.2a9.5 9.5 0 0 1 3.3-2M12.8 9.5a9.5 9.5 0 0 1 6 2.7" />
          <path d="M12 19h.01" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
        </svg>
      );
    case "pen":
      return (
        <svg {...common}>
          <path d="M15.2 5.2l3.6 3.6M4.5 19.5l1-4.2L16.3 4.5a1.8 1.8 0 0 1 2.5 0l.7.7a1.8 1.8 0 0 1 0 2.5L8.7 18.5l-4.2 1Z" />
          <path d="M13 19.5h6.5" />
        </svg>
      );
    case "info":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 11v5.2" />
          <circle cx="12" cy="7.9" r="0.4" fill="currentColor" />
        </svg>
      );
  }
}
