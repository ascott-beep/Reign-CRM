"use server";

import { cookies } from "next/headers";
import { SIDEBAR_COLLAPSED_COOKIE } from "@/lib/sidebar-cookie";

export async function setSidebarCollapsedAction(collapsed: boolean) {
  const store = await cookies();
  store.set(SIDEBAR_COLLAPSED_COOKIE, collapsed ? "1" : "0", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
