"use client";

import { WinsScreen } from "@/app/components/WinsScreen";
import { useSanctuaryScreens } from "@/app/components/SanctuaryApp";

export default function WinsPage() {
  return <WinsScreen {...useSanctuaryScreens().wins} />;
}
