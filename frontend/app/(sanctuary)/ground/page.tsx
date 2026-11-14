"use client";

import { GroundScreen } from "@/app/components/GroundScreen";
import { useSanctuaryScreens } from "@/app/components/SanctuaryApp";

export default function GroundPage() {
  return <GroundScreen {...useSanctuaryScreens().ground} />;
}
