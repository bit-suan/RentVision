"use client";

import { redirect } from "next/navigation";

export default function SignUpClient() {
  redirect("/signup");
  return null;
}
