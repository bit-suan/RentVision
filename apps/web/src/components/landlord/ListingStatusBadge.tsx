"use client";

import { useTranslations } from "next-intl";
import Badge from "@/components/ui/Badge";
import { normalizeStatus, statusTone } from "@/lib/landlord";

export default function ListingStatusBadge({ status }: { status: string }) {
  const t = useTranslations("Landlord.Status");
  const normalized = normalizeStatus(status);
  const label =
    normalized === "other"
      ? t("other", { status })
      : t(normalized);

  return <Badge tone={statusTone(status)}>{label}</Badge>;
}
