"use client";

import { JournalScreen } from "@/app/components/JournalScreen";
import { useSanctuaryScreens } from "@/app/components/SanctuaryApp";

export default function JournalPage() {
  return <JournalScreen {...useSanctuaryScreens().journal} />;
}
