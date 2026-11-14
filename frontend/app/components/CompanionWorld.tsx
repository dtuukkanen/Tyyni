"use client";

import { useEffect, useRef } from "react";

type CompanionWorldProps = {
  mood: string;
  lowEnergy: boolean;
  isCelebrating?: boolean;
};

/**
 * 1. SEPARATE CLOUD LAYER
 * Fluffy 2D storybook clouds with warm cream undersides and soft outlines,
 * scrolling sideways slowly across three seamless parallax bands.
 */
export function CloudsLayer() {
  return (
    <div className="companion-clouds-layer" aria-hidden="true">
      <div className="cloud-track cloud-track-far">
        <div className="cloud-segment">
          <StorybookCloudC className="cloud-item cloud-far-1" />
          <StorybookCloudB className="cloud-item cloud-far-2" />
        </div>
        <div className="cloud-segment">
          <StorybookCloudC className="cloud-item cloud-far-1" />
          <StorybookCloudB className="cloud-item cloud-far-2" />
        </div>
      </div>

      <div className="cloud-track cloud-track-mid">
        <div className="cloud-segment">
          <StorybookCloudA className="cloud-item cloud-mid-1" />
          <StorybookCloudB className="cloud-item cloud-mid-2" />
        </div>
        <div className="cloud-segment">
          <StorybookCloudA className="cloud-item cloud-mid-1" />
          <StorybookCloudB className="cloud-item cloud-mid-2" />
        </div>
      </div>

      <div className="cloud-track cloud-track-near">
        <div className="cloud-segment">
          <StorybookCloudB className="cloud-item cloud-near-1" />
          <StorybookCloudA className="cloud-item cloud-near-2" />
        </div>
        <div className="cloud-segment">
          <StorybookCloudB className="cloud-item cloud-near-1" />
          <StorybookCloudA className="cloud-item cloud-near-2" />
        </div>
      </div>
    </div>
  );
}

function StorybookCloudA({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18 106 C8 106, 6 92, 24 89 C32 70, 56 64, 76 72 C88 42, 128 32, 162 48 C184 22, 236 22, 260 54 C282 52, 304 68, 304 88 C316 92, 314 106, 296 106 Z"
        fill="#F8EED6"
      />
      <path
        d="M24 98 C16 95, 18 85, 32 83 C40 65, 62 60, 82 68 C94 38, 132 28, 164 46 C186 20, 234 20, 256 52 C276 50, 296 64, 296 84 C306 88, 300 98, 284 98 C240 94, 198 98, 152 96 C106 94, 62 100, 24 98 Z"
        fill="#FFFDF8"
      />
      <path
        d="M22 106 H296 C312 106, 315 92, 302 88 C303 68, 282 52, 260 54 C236 22, 184 22, 162 48 C128 32, 88 42, 76 72 C56 64, 32 70, 24 89 C8 92, 8 106, 22 106 Z"
        stroke="#8E9B8C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.42"
      />
      <path
        d="M78 74 C92 68, 108 72, 116 82"
        stroke="#E6D9BE"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M164 52 C178 48, 196 54, 204 66"
        stroke="#E6D9BE"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StorybookCloudB({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 280 115"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 96 C6 96, 8 82, 24 80 C34 54, 72 44, 98 58 C118 26, 172 28, 192 60 C212 54, 236 64, 242 80 C260 80, 268 96, 250 96 Z"
        fill="#F7ECD2"
      />
      <path
        d="M22 88 C14 86, 18 76, 30 75 C40 50, 74 42, 100 56 C120 26, 170 28, 188 58 C208 52, 230 62, 236 76 C250 78, 254 88, 238 89 C185 86, 85 90, 22 88 Z"
        fill="#FFFDF9"
      />
      <path
        d="M18 96 H250 C266 96, 260 80, 242 80 C236 64, 212 54, 192 60 C172 28, 118 26, 98 58 C72 44, 34 54, 24 80 C8 82, 6 96, 18 96 Z"
        stroke="#8E9B8C"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.4"
      />
    </svg>
  );
}

function StorybookCloudC({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 360 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 104 C18 82, 46 72, 70 78 C90 46, 140 40, 170 62 C198 34, 252 38, 274 68 C298 62, 326 74, 336 92 C348 94, 350 104, 336 104 Z"
        fill="#FAF1DA"
      />
      <path
        d="M18 96 C24 78, 48 70, 72 75 C92 44, 140 38, 170 60 C198 34, 248 38, 270 66 C294 60, 320 72, 328 88 C338 90, 338 96, 324 96 Z"
        fill="#FFFDF9"
      />
    </svg>
  );
}

/**
 * 2. SEPARATE ENVIRONMENT LAYER
 * 2D cute storybook hills, Ghibli-style leafy trees (pivoting around their exact
 * ground bases), foreground meadow, grass tufts, and wildflowers.
 */
export function EnvironmentLayer() {
  return (
    <svg
      className="companion-env-svg"
      viewBox="0 0 430 932"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="distantHillLeft"
          x1="120"
          y1="410"
          x2="120"
          y2="560"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#C4E1D2" />
          <stop offset="100%" stopColor="#A9CEBE" />
        </linearGradient>

        <linearGradient
          id="distantHillRight"
          x1="310"
          y1="400"
          x2="310"
          y2="550"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#E7F2C9" />
          <stop offset="100%" stopColor="#CDE2AC" />
        </linearGradient>

        <linearGradient
          id="midHillLeft"
          x1="110"
          y1="470"
          x2="110"
          y2="640"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#E2EEB4" />
          <stop offset="55%" stopColor="#C7DF96" />
          <stop offset="100%" stopColor="#A8C97B" />
        </linearGradient>

        <linearGradient
          id="midHillRight"
          x1="320"
          y1="460"
          x2="320"
          y2="640"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#D8E9A8" />
          <stop offset="50%" stopColor="#BCD88B" />
          <stop offset="100%" stopColor="#97BE6E" />
        </linearGradient>

        <linearGradient
          id="meadowForeground"
          x1="215"
          y1="520"
          x2="215"
          y2="932"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#C8E28E" />
          <stop offset="28%" stopColor="#A8CC74" />
          <stop offset="68%" stopColor="#8BB662" />
          <stop offset="100%" stopColor="#729E52" />
        </linearGradient>
      </defs>

      {/* Warm horizon glow */}
      <ellipse
        cx="215"
        cy="435"
        rx="240"
        ry="110"
        fill="#FFF9DE"
        fillOpacity="0.45"
      />

      {/* Distant Misty Hills */}
      <path
        d="M-30 505 C45 435, 145 442, 235 485 L235 585 L-30 585 Z"
        fill="url(#distantHillLeft)"
        stroke="#6B7F73"
        strokeWidth="1.6"
        strokeOpacity="0.45"
      />
      <path
        d="M180 480 C255 430, 345 415, 460 450 L460 585 L180 585 Z"
        fill="url(#distantHillRight)"
        stroke="#6B7F73"
        strokeWidth="1.6"
        strokeOpacity="0.4"
      />

      {/* Far Left Misty Tree — pivot at trunk root (18, 515) */}
      <g transform="translate(18, 515)">
        <g className="env-tree-sway-slow">
          <path
            d="M0 0 L0 -68 M0 -40 L-14 -60 M0 -46 L14 -64"
            stroke="#8D796B"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M-36 -60 C-44 -80, -32 -104, -14 -108 C-10 -128, 14 -130, 24 -112 C40 -108, 46 -86, 34 -68 C40 -54, 26 -40, 8 -42 C-10 -38, -30 -44, -36 -60 Z"
            fill="#B2D1BA"
            stroke="#596E5D"
            strokeWidth="1.7"
          />
          <path
            d="M-26 -92 C-16 -114, 12 -118, 26 -100 C36 -90, 32 -72, 18 -66"
            fill="#C5DFC9"
          />
        </g>
      </g>

      {/* Second Left Rounded Tree — pivot at trunk root (88, 528) */}
      <g transform="translate(88, 528)">
        <g className="env-tree-sway-mid">
          <path
            d="M0 0 L0 -78 M0 -42 L-14 -62 M0 -52 L14 -70"
            stroke="#8A7465"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path
            d="M-30 -62 C-40 -78, -34 -102, -22 -112 C-24 -134, -8 -152, 6 -144 C22 -148, 34 -128, 30 -108 C42 -94, 38 -68, 22 -56 C8 -46, -18 -48, -30 -62 Z"
            fill="#99C29B"
            stroke="#4F634E"
            strokeWidth="1.8"
          />
          <path
            d="M-24 -96 C-26 -120, -12 -144, 4 -140 C20 -142, 30 -122, 26 -100 C34 -88, 26 -72, 10 -72 C-8 -70, -24 -80, -24 -96 Z"
            fill="#B8DAAC"
          />
          <path
            d="M-16 -118 C-10 -134, 6 -138, 16 -126 C22 -116, 18 -100, 4 -98"
            fill="#CEE6BE"
          />
        </g>
      </g>

      {/* Distant Right Mid-Tree — pivot at trunk root (342, 502) */}
      <g transform="translate(342, 502)">
        <g className="env-tree-sway-slow">
          <path
            d="M0 0 L0 -62 M0 -32 L-16 -52 M0 -38 L14 -56"
            stroke="#8D7768"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M-40 -56 C-50 -72, -42 -96, -24 -102 C-18 -120, 8 -122, 18 -104 C36 -100, 42 -78, 30 -60 C36 -46, 20 -34, 0 -36 C-20 -34, -34 -42, -40 -56 Z"
            fill="#B2D4AB"
            stroke="#566B55"
            strokeWidth="1.7"
          />
          <path
            d="M-30 -80 C-24 -104, 4 -112, 18 -94 C28 -84, 22 -66, 4 -62"
            fill="#CAE4BE"
          />
        </g>
      </g>

      {/* Small Shrubs along Distant Left Hill */}
      <path
        d="M-10 518 C2 502, 22 502, 32 512 C44 504, 62 508, 68 522 C82 514, 102 518, 112 530 L-10 538 Z"
        fill="#9EC59E"
        stroke="#526753"
        strokeWidth="1.6"
      />

      {/* Large Foreground Canopy Tree on Right — pivot at trunk base (412, 505) */}
      <g transform="translate(412, 505)">
        <g className="env-tree-sway-right">
          <path
            d="M0 0 C-2 -45, -4 -90, -8 -135 L-44 -175 M-6 -110 L-24 -165 M2 -95 L20 -140 M6 0 L14 -115"
            stroke="#7A6152"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M-10 3 C-10 -40, -14 -77, -40 -110 L-32 -117 C-12 -95, -6 -83, -4 -115 L-24 -160 L-14 -165 L2 -123 L16 -160 L24 -153 L10 -97 C12 -60, 16 -25, 20 3 Z"
            fill="#967A68"
            stroke="#594539"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M-80 -127 C-106 -137, -116 -169, -98 -191 C-106 -217, -88 -243, -62 -243 C-60 -273, -34 -295, -6 -291 C8 -317, 44 -317, 54 -289 L54 -119 C30 -109, 0 -111, -20 -123 C-40 -113, -64 -115, -80 -127 Z"
            fill="#7AA874"
            stroke="#465A43"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M-92 -157 C-110 -173, -104 -203, -82 -211 C-86 -237, -64 -259, -38 -253 C-34 -283, -6 -301, 22 -291 C38 -301, 56 -287, 54 -261 L54 -147 C30 -137, 2 -141, -16 -153 C-40 -139, -74 -141, -92 -157 Z"
            fill="#98C382"
          />
          <path
            d="M-78 -193 C-86 -215, -68 -239, -44 -235 C-42 -265, -16 -285, 12 -277 C28 -287, 48 -275, 46 -251 C30 -217, -26 -181, -78 -193 Z"
            fill="#B7D996"
          />
          <path
            d="M-50 -243 C-44 -265, -20 -279, 4 -271 C16 -267, 22 -251, 12 -239 C-10 -227, -38 -229, -50 -243 Z"
            fill="#CEE6A8"
          />
          <path
            d="M-56 -217 C-50 -227, -38 -227, -34 -219 C-28 -227, -16 -223, -16 -213"
            stroke="#4E6548"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M-82 -171 C-76 -179, -64 -179, -60 -171 C-54 -177, -44 -173, -44 -165"
            stroke="#4E6548"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
      </g>

      {/* Mid-Ground Rolling Sunlit Hills */}
      <path
        d="M-30 472 C55 468, 145 488, 235 534 L235 630 L-30 630 Z"
        fill="url(#midHillLeft)"
        stroke="#556B46"
        strokeWidth="2"
      />
      <path
        d="M175 526 C265 482, 355 456, 460 452 L460 640 L175 640 Z"
        fill="url(#midHillRight)"
        stroke="#556B46"
        strokeWidth="2"
      />

      {/* Mid-ground cozy bushes */}
      <path
        d="M345 492 C352 474, 372 470, 384 480 C394 462, 418 460, 432 474 L445 494 Z"
        fill="#8AB778"
        stroke="#4B6244"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M-18 576 C-8 550, 18 544, 34 558 C48 548, 70 554, 76 572 C88 566, 104 572, 108 586 L-18 592 Z"
        fill="#8AB976"
        stroke="#4A6240"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M336 566 C344 550, 364 546, 376 556 C388 536, 416 532, 434 548 L446 586 L336 586 Z"
        fill="#96C37E"
        stroke="#4A6240"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Foreground Sanctuary Meadow Hill */}
      <path
        d="M-30 584 C65 544, 145 532, 215 532 C285 532, 365 544, 460 584 L460 932 L-30 932 Z"
        fill="url(#meadowForeground)"
        stroke="#4A6240"
        strokeWidth="2.2"
      />

      {/* Sunlit grass patch on foreground meadow */}
      <path
        d="M40 612 C110 587, 290 587, 385 622 C350 657, 270 672, 190 667 C110 662, 50 637, 40 612 Z"
        fill="#BAE085"
        fillOpacity="0.45"
      />

      {/* Grass tufts across meadow */}
      <g
        stroke="#4E6B40"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M88 606 L84 598 M92 606 L95 597" />
        <path d="M134 592 L130 584 M138 592 L142 584" />
        <path d="M294 596 L291 588 M298 596 L302 588" />
        <path d="M342 616 L338 608 M346 616 L350 608" />
        <path d="M68 658 L64 649 M73 658 L77 650" />
        <path d="M168 644 L165 636 M172 644 L176 637" />
        <path d="M266 640 L263 632 M270 640 L274 633" />
      </g>

      {/* Tiny Meadow Wildflowers */}
      <g transform="translate(54, 616)">
        <path
          d="M0 18 Q2 9 0 0"
          stroke="#4A6240"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M-5 14 L0 18 L5 13"
          stroke="#4A6240"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="0" cy="-4" r="3.5" fill="#F59BA0" />
        <circle cx="4" cy="-1" r="3.5" fill="#F59BA0" />
        <circle cx="2.5" cy="3.5" r="3.5" fill="#F59BA0" />
        <circle cx="-2.5" cy="3.5" r="3.5" fill="#F59BA0" />
        <circle cx="-4" cy="-1" r="3.5" fill="#F59BA0" />
        <circle cx="0" cy="0" r="2" fill="#FCE283" />
      </g>
      <g transform="translate(364, 622)">
        <path
          d="M0 16 Q-2 8 0 0"
          stroke="#4A6240"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="0" cy="-3" r="3" fill="#F7A29E" />
        <circle cx="3" cy="0" r="3" fill="#F7A29E" />
        <circle cx="-3" cy="0" r="3" fill="#F7A29E" />
        <circle cx="0" cy="0" r="1.8" fill="#FCE283" />
      </g>
      <g transform="translate(384, 618)">
        <path
          d="M0 18 Q2 9 0 0"
          stroke="#4A6240"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="0" cy="-3" r="3.2" fill="#FCE283" />
        <circle cx="3.2" cy="0" r="3.2" fill="#FCE283" />
        <circle cx="-3.2" cy="0" r="3.2" fill="#FCE283" />
        <circle cx="0" cy="2.8" r="3.2" fill="#FCE283" />
        <circle cx="0" cy="0" r="1.8" fill="#E5954E" />
      </g>

      {/* Dew/petal specks */}
      <circle cx="84" cy="642" r="2.2" fill="#FFFDF6" fillOpacity="0.85" />
      <circle cx="146" cy="656" r="2.4" fill="#FFFDF6" fillOpacity="0.85" />
      <circle cx="288" cy="652" r="2.2" fill="#FFFDF6" fillOpacity="0.85" />
      <circle cx="332" cy="648" r="2" fill="#FFFDF6" fillOpacity="0.85" />

      {/* Foreground Corner Botanical Leaves */}
      <g
        stroke="#3E5636"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M-6 932 C2 885, 18 835, 42 795 C46 830, 32 885, 16 932 Z"
          fill="#78A85A"
        />
        <path
          d="M12 932 C28 892, 52 864, 72 852 C72 878, 52 910, 34 932 Z"
          fill="#68964C"
        />
        <path
          d="M422 932 C404 880, 376 826, 352 790 C346 822, 368 880, 392 932 Z"
          fill="#78A85A"
        />
        <path
          d="M438 932 C424 875, 404 824, 386 788 C380 818, 396 875, 416 932 Z"
          fill="#68964C"
        />
      </g>
    </svg>
  );
}

/**
 * 3. SEPARATE ANIMATED FLOWER COMPANION ("Bloomie")
 * Every stem, leaf, bud, and 5-petal blossom is anchored in local coordinates
 * around its exact `(0, 0)` pivot inside nested `<g>` groups so CSS animations
 * never override SVG `transform` attributes and every petal stays 100% attached
 * to its stem tip throughout every sway cycle.
 */
export function FlowerCompanion({
  mood,
  lowEnergy,
  isCelebrating,
}: {
  mood: string;
  lowEnergy: boolean;
  isCelebrating?: boolean;
}) {
  const isRestingMood = mood === "Tired" || lowEnergy;

  return (
    <div
      className={`companion-flower-stage ${lowEnergy ? "is-low-energy" : ""} ${
        isCelebrating ? "is-celebrating" : ""
      }`}
      aria-hidden="true"
    >
      <div className="companion-aura" />

      <div className="companion-sparkles">
        <span className="sparkle-dot sparkle-1" />
        <span className="sparkle-dot sparkle-2" />
        <span className="sparkle-dot sparkle-3" />
      </div>

      <svg
        className="companion-flower-svg"
        viewBox="0 0 320 330"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ground shadow beneath pot */}
        <ellipse
          cx="160"
          cy="296"
          rx="68"
          ry="14"
          fill="#68974C"
          fillOpacity="0.6"
        />

        {/* Whole plant pivots gently around pot base center (160, 294) */}
        <g transform="translate(160, 294)">
          <g className="flower-whole-sway">
            {/* 1. Back half of pot rim & warm soil bed so stems grow from INSIDE the pot */}
            <ellipse
              cx="0"
              cy="-104"
              rx="62"
              ry="10"
              fill="#B9684B"
              stroke="#4A3429"
              strokeWidth="2.5"
            />
            <ellipse cx="0" cy="-102" rx="52" ry="6.5" fill="#634535" />

            {/* 2. Upright Stems + Leaves + Attached Flowers emerging from the soil */}

            {/* Stem A: Far-Left Leafy Shoot — anchored at (-22, -102) */}
            <g transform="translate(-22, -102)">
              <g className="stem-sway-left">
                <path
                  d="M 0 0 C -12 -32, -32 -60, -56 -80"
                  stroke="#465937"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                {/* Leaves along stem */}
                <path
                  d="M -22 -40 C -38 -44, -46 -34, -36 -24 C -28 -18, -18 -28, -22 -40 Z"
                  fill="#82B667"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                <path
                  d="M -18 -46 C -14 -62, -4 -68, 2 -58 C 8 -50, -6 -42, -18 -46 Z"
                  fill="#97C879"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                {/* Terminal leaf at (-56, -80) */}
                <path
                  d="M -54 -78 C -68 -88, -76 -76, -66 -66 C -58 -58, -48 -68, -54 -78 Z"
                  fill="#9FD07F"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
              </g>
            </g>

            {/* Stem B: Left Pink Blossom Stem + Side Pink Bud — anchored at (-12, -102) */}
            <g transform="translate(-12, -102)">
              <g className="stem-sway-mid-left">
                {/* Main stem to (-32, -106) and side bud twig to (-48, -56) */}
                <path
                  d="M 0 0 C -6 -36, -18 -72, -32 -106 M -14 -44 C -26 -48, -38 -52, -48 -56"
                  stroke="#465937"
                  strokeWidth="3.3"
                  strokeLinecap="round"
                />
                {/* Stem leaves */}
                <path
                  d="M -18 -66 C -34 -72, -42 -60, -32 -52 C -24 -46, -14 -56, -18 -66 Z"
                  fill="#95C777"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                <path
                  d="M -22 -76 C -18 -92, -6 -96, 0 -86 C 4 -78, -10 -70, -22 -76 Z"
                  fill="#86B96B"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                {/* Attached Pink Bud at twig tip (-48, -56) */}
                <g transform="translate(-48, -56)">
                  <g className="blossom-flutter-delayed">
                    <FlowerBud rotation={-38} />
                  </g>
                </g>
                {/* Attached Pink 5-Petal Blossom at exact stem tip (-32, -106) */}
                <g transform="translate(-32, -106)">
                  <g className="blossom-flutter">
                    <FivePetalFlower
                      petalColor="#F79CA2"
                      centerColor="#FCE283"
                      scale={1.08}
                    />
                  </g>
                </g>
              </g>
            </g>

            {/* Stem C: Tall Center-Right Leafy Shoot — anchored at (6, -102) */}
            <g transform="translate(6, -102)">
              <g className="stem-sway-center">
                <path
                  d="M 0 0 C 4 -44, 14 -90, 26 -132"
                  stroke="#465937"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                {/* Terminal top leaf at (26, -132) */}
                <path
                  d="M 25 -130 C 19 -150, 31 -162, 39 -150 C 45 -140, 35 -128, 25 -130 Z"
                  fill="#9FD07F"
                  stroke="#435435"
                  strokeWidth="2.3"
                />
                {/* Paired leaves along tall shoot */}
                <path
                  d="M 19 -108 C 5 -118, 1 -134, 13 -134 C 23 -134, 25 -118, 19 -108 Z"
                  fill="#95C777"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                <path
                  d="M 22 -102 C 36 -112, 52 -108, 46 -96 C 40 -88, 26 -92, 22 -102 Z"
                  fill="#86B96B"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                <path
                  d="M 11 -74 C -5 -84, -9 -100, 3 -100 C 13 -100, 17 -84, 11 -74 Z"
                  fill="#95C777"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                <path
                  d="M 14 -68 C 30 -76, 44 -72, 38 -60 C 32 -52, 18 -58, 14 -68 Z"
                  fill="#86B96B"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
              </g>
            </g>

            {/* Stem D: Right Leafy Shoot — anchored at (20, -102) */}
            <g transform="translate(20, -102)">
              <g className="stem-sway-right">
                <path
                  d="M 0 0 C 18 -34, 42 -66, 68 -88"
                  stroke="#465937"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 65 -86 C 75 -100, 91 -98, 85 -84 C 79 -74, 67 -78, 65 -86 Z"
                  fill="#9FD07F"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                <path
                  d="M 42 -66 C 36 -82, 46 -94, 56 -84 C 62 -76, 52 -64, 42 -66 Z"
                  fill="#95C777"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                <path
                  d="M 46 -60 C 60 -64, 70 -56, 62 -46 C 54 -40, 44 -50, 46 -60 Z"
                  fill="#82B667"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
              </g>
            </g>

            {/* Stem E: Center-Left Yellow Blossom Stem — anchored at (-4, -102) */}
            <g transform="translate(-4, -102)">
              <g className="stem-sway-center">
                <path
                  d="M 0 0 C -2 -24, -6 -48, -10 -72"
                  stroke="#465937"
                  strokeWidth="3.3"
                  strokeLinecap="round"
                />
                <path
                  d="M -6 -34 C -22 -40, -28 -28, -18 -20 C -10 -16, -2 -24, -6 -34 Z"
                  fill="#97C879"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                {/* Attached Yellow 5-Petal Blossom at exact stem tip (-10, -72) */}
                <g transform="translate(-10, -72)">
                  <g className="blossom-flutter-delayed">
                    <FivePetalFlower
                      petalColor="#FCE181"
                      centerColor="#E99A54"
                      scale={1.04}
                    />
                  </g>
                </g>
              </g>
            </g>

            {/* Stem F: Center-Right Yellow Blossom + Side Pink Bud — anchored at (14, -102) */}
            <g transform="translate(14, -102)">
              <g className="stem-sway-mid-right">
                <path
                  d="M 0 0 C 8 -22, 16 -44, 24 -64 M 12 -32 C 20 -34, 28 -36, 34 -38"
                  stroke="#465937"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                {/* Attached Pink Bud at twig tip (34, -38) */}
                <g transform="translate(34, -38)">
                  <g className="blossom-flutter">
                    <FlowerBud rotation={35} />
                  </g>
                </g>
                {/* Attached Yellow 5-Petal Blossom at exact stem tip (24, -64) */}
                <g transform="translate(24, -64)">
                  <g className="blossom-flutter">
                    <FivePetalFlower
                      petalColor="#FCE181"
                      centerColor="#E99A54"
                      scale={0.98}
                    />
                  </g>
                </g>
              </g>
            </g>

            {/* 3. Terracotta Pot Body, Front Rim Lip, and Kawaii Face */}
            <g className="pot-body-group">
              {/* Tapered pot body */}
              <path
                d="M -54 -88 L 54 -88 L 38 -8 C 36 0, 20 4, 0 4 C -20 4, -36 0, -38 -8 Z"
                fill="#DF8D6C"
                stroke="#4A3429"
                strokeWidth="2.6"
                strokeLinejoin="round"
              />
              {/* Right-side warm terracotta shading */}
              <path
                d="M 28 -86 L 52 -86 L 36 -9 C 35 -3, 25 1, 12 2 C 22 -8, 28 -48, 28 -86 Z"
                fill="#CA7757"
              />
              {/* Shadow directly beneath rim */}
              <path
                d="M -52 -82 C -24 -78, 24 -78, 52 -82 L 51 -74 C 24 -70, -24 -70, -51 -74 Z"
                fill="#C67353"
                fillOpacity="0.65"
              />

              {/* Front Terracotta Rim Lip */}
              <path
                d="M -64 -104 C -64 -98, -36 -94, 0 -94 C 36 -94, 64 -98, 64 -104 L 60 -88 C 60 -83, 34 -80, 0 -80 C -34 -80, -60 -83, -60 -88 Z"
                fill="#E79979"
                stroke="#4A3429"
                strokeWidth="2.6"
                strokeLinejoin="round"
              />
              <path
                d="M -52 -96 C -26 -92, 26 -92, 52 -96"
                stroke="#F3B297"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              {/* Kawaii Face */}
              <g className="pot-face">
                <ellipse cx="-29" cy="-35" rx="8.5" ry="4.2" fill="#F4A892" />
                <ellipse cx="29" cy="-35" rx="8.5" ry="4.2" fill="#F4A892" />

                {/* Eyes centered at y = 0 inside translate(0, -46) for clean blink pivot */}
                <g transform="translate(0, -46)">
                  <g className="pot-eyes">
                    <circle cx="-23" cy="0" r="5.2" fill="#3F2A1E" />
                    <circle cx="-24.5" cy="-1.8" r="1.6" fill="#FFFDF9" />
                    <circle cx="23" cy="0" r="5.2" fill="#3F2A1E" />
                    <circle cx="21.5" cy="-1.8" r="1.6" fill="#FFFDF9" />
                  </g>
                </g>

                {isRestingMood ? (
                  <path
                    d="M -6 -39 Q 0 -35 6 -39"
                    stroke="#3F2A1E"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M -8 -41 Q 0 -33 8 -41"
                    stroke="#3F2A1E"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                )}
              </g>
            </g>

            {/* 4. Cascading Left & Right Vines + Front Rim Leaves Draping Over Pot */}

            {/* Front rim overhanging leaves */}
            <path
              d="M -28 -100 C -42 -90, -46 -74, -34 -72 C -22 -72, -14 -88, -28 -100 Z"
              fill="#97C879"
              stroke="#435435"
              strokeWidth="2.3"
            />
            <path
              d="M 28 -100 C 42 -90, 46 -74, 34 -72 C 22 -72, 14 -88, 28 -100 Z"
              fill="#97C879"
              stroke="#435435"
              strokeWidth="2.3"
            />

            {/* Left Cascading Vine — anchored at (-36, -100) */}
            <g transform="translate(-36, -100)">
              <g className="vine-sway-left">
                <path
                  d="M 0 0 C -30 -6, -52 18, -58 64"
                  stroke="#465937"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d="M -28 2 C -44 -8, -56 0, -46 12 C -38 20, -26 12, -28 2 Z"
                  fill="#95C777"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                <path
                  d="M -46 24 C -64 20, -74 30, -62 40 C -54 46, -42 36, -46 24 Z"
                  fill="#86B96B"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                <path
                  d="M -40 34 C -26 34, -20 46, -32 52 C -40 56, -46 44, -40 34 Z"
                  fill="#78AC5E"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                <path
                  d="M -56 52 C -74 52, -80 64, -68 72 C -58 76, -50 64, -56 52 Z"
                  fill="#86B96B"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                <path
                  d="M -58 64 C -68 76, -58 88, -48 78 C -42 70, -50 62, -58 64 Z"
                  fill="#95C777"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
              </g>
            </g>

            {/* Right Cascading Vine with Attached Hanging Pink Blossom — anchored at (36, -100) */}
            <g transform="translate(36, -100)">
              <g className="vine-sway-right">
                <path
                  d="M 0 0 C 30 -6, 50 18, 54 62 M 46 34 C 54 40, 60 46, 66 52"
                  stroke="#465937"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 26 4 C 42 -4, 54 4, 44 16 C 36 22, 24 14, 26 4 Z"
                  fill="#95C777"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                <path
                  d="M 46 26 C 62 24, 70 34, 58 42 C 50 48, 40 38, 46 26 Z"
                  fill="#86B96B"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                <path
                  d="M 40 40 C 26 42, 22 54, 34 60 C 42 64, 48 50, 40 40 Z"
                  fill="#78AC5E"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                <path
                  d="M 52 62 C 62 72, 54 84, 42 76 C 36 68, 44 60, 52 62 Z"
                  fill="#86B96B"
                  stroke="#435435"
                  strokeWidth="2.2"
                />
                {/* Attached Hanging Pink Blossom at twig tip (66, 52) */}
                <g transform="translate(66, 52)">
                  <g className="blossom-flutter">
                    <FivePetalFlower
                      petalColor="#F69CA2"
                      centerColor="#FCE181"
                      scale={0.82}
                    />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* Little foreground grass blades hugging the pot base */}
        <g
          stroke="#465E3B"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M114 294 C112 286, 116 280, 120 288" fill="#82B667" />
          <path d="M138 298 C136 290, 142 288, 144 298" fill="#82B667" />
          <path d="M174 298 C176 290, 182 288, 180 298" fill="#82B667" />
          <path d="M198 294 C200 286, 206 284, 204 294" fill="#82B667" />
        </g>
      </svg>
    </div>
  );
}

function FivePetalFlower({
  petalColor,
  centerColor,
  scale = 1,
}: {
  petalColor: string;
  centerColor: string;
  scale?: number;
}) {
  return (
    <g transform={`scale(${scale})`}>
      <g stroke="#4A362D" strokeWidth="2.1" strokeLinejoin="round">
        <circle cx="0" cy="-10.5" r="7.2" fill={petalColor} />
        <circle cx="10" cy="-3.2" r="7.2" fill={petalColor} />
        <circle cx="6.2" cy="8.5" r="7.2" fill={petalColor} />
        <circle cx="-6.2" cy="8.5" r="7.2" fill={petalColor} />
        <circle cx="-10" cy="-3.2" r="7.2" fill={petalColor} />
      </g>
      <circle cx="0" cy="-8.5" r="6" fill={petalColor} />
      <circle cx="8.2" cy="-2.6" r="6" fill={petalColor} />
      <circle cx="5.1" cy="7" r="6" fill={petalColor} />
      <circle cx="-5.1" cy="7" r="6" fill={petalColor} />
      <circle cx="-8.2" cy="-2.6" r="6" fill={petalColor} />
      <circle
        cx="0"
        cy="0"
        r="5.4"
        fill={centerColor}
        stroke="#4A362D"
        strokeWidth="2"
      />
    </g>
  );
}

function FlowerBud({ rotation = 0 }: { rotation?: number }) {
  return (
    <g transform={`rotate(${rotation})`}>
      <path
        d="M 0 0 C -8 -7, -4 -17, 0 -12 C 4 -17, 8 -7, 0 0 Z"
        fill="#F7A3A8"
        stroke="#4E3A32"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </g>
  );
}

/**
 * COMBINED 2D CUTE COMPANION WORLD BACKGROUND
 * Uses a zero-rerender requestAnimationFrame scroll listener driving a single
 * GPU-composited frosted veil (`opacity` only) so scrolling never triggers
 * filter-radius re-rasterization, color shifts, or React state updates.
 */
export function CompanionWorld({
  mood,
  lowEnergy,
  isCelebrating,
}: CompanionWorldProps) {
  const veilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId = 0;

    const updateVeil = () => {
      rafId = 0;
      if (!veilRef.current) return;
      const y = Math.max(0, window.scrollY || window.pageYOffset || 0);
      const progress = Math.min(1, y / 300);
      veilRef.current.style.opacity = progress.toFixed(3);
    };

    const onScroll = () => {
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(updateVeil);
      }
    };

    updateVeil();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <div className="companion-world-root" aria-hidden="true">
      <div className="companion-world-canvas">
        {/* Layer 1a: Pastel Sky Backdrop */}
        <div className="companion-sky-backdrop" />

        {/* Layer 2: Clouds (Scrolling Sideways Slowly behind trees & hills) */}
        <CloudsLayer />

        {/* Layer 1b: Environment (Hills, Trees, Meadow, Wildflowers) */}
        <EnvironmentLayer />

        {/* Layer 3: Animated Potted Flower Companion ("Bloomie") */}
        <FlowerCompanion
          mood={mood}
          lowEnergy={lowEnergy}
          isCelebrating={isCelebrating}
        />
      </div>

      {/* Constant-radius frosted scroll veil faded strictly via GPU opacity */}
      <div ref={veilRef} className="companion-scroll-veil" />
    </div>
  );
}
