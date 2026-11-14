"use client";

import { AnchorScreen } from "@/app/components/AnchorScreen";
import { useSanctuaryScreens } from "@/app/components/SanctuaryApp";

export default function AnchorPage() {
  return <AnchorScreen {...useSanctuaryScreens().anchor} />;
}
