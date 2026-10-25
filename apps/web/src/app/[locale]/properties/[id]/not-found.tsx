import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslations } from "next-intl";

export default function PropertyNotFound() {
  const t = useTranslations("States");

  return (
    <div className="property-detail">
      <ErrorState
        title={t("notFoundTitle")}
        message={t("notFoundMessage")}
      />
      <Button href="/properties" variant="secondary">
        {t("backToProperties")}
      </Button>
    </div>
  );
}
