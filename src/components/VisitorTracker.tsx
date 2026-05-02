"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackVisitor } from "@/app/actions/visitors";

export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // We only want to track once per path change
    if (pathname) {
      trackVisitor(pathname).catch((err) => {
        console.error("Failed to track visitor", err);
      });
    }
  }, [pathname]);

  return null; // This component doesn't render anything
}
