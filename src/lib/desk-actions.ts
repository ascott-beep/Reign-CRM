"use server";

import { cookies } from "next/headers";
import { DESK_COOKIE } from "@/lib/desk-cookie";

/** "" = All desks, "me" = My desk, otherwise a user id. */
export async function setDeskAction(desk: string) {
  const store = await cookies();
  if (desk) {
    store.set(DESK_COOKIE, desk, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  } else {
    store.delete(DESK_COOKIE);
  }
}
