"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * A headless Client Component that automatically closes the mobile 
 * dashboard sidebar whenever the user clicks a navigation link and 
 * the URL pathname changes.
 */
export default function SidebarAutoClose() {
    const pathname = usePathname();

    useEffect(() => {
        const toggle = document.getElementById("sidebar-toggle") as HTMLInputElement;

        // If the sidebar checkbox exists and is currently checked (menu open),
        // we uncheck it to hide the sliding drawer.
        if (toggle && toggle.checked) {
            toggle.checked = false;
        }
    }, [pathname]);

    return null;
}
