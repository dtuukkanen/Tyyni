"use client";

import { TodayScreen } from "@/app/components/TodayScreen";
import { useSanctuaryScreens } from "@/app/components/SanctuaryApp";

export default function TodayPage() {
  return <TodayScreen {...useSanctuaryScreens().today} />;
}
