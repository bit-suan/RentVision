import Image from "next/image";
import EmptyState from "@/components/ui/EmptyState";
import type { Property } from "@/lib/properties";
import { useTranslations } from "next-intl";

interface PropertyGalleryProps {
  title: string;
  imageUrl: string;
  galleryImages: Property["galleryImages"];
}

export default function PropertyGallery({
  title,
  imageUrl,
  galleryImages,
}: PropertyGalleryProps) {
  const t = useTranslations("PropertyGallery");
  const images = galleryImages.length > 0 ? galleryImages : imageUrl ? [imageUrl] : [];

  if (images.length === 0) {
    return (
      <section aria-label={t("galleryAria")}>
        <h2>{t("heading")}</h2>
        <EmptyState
          title={t("noPhotosTitle")}
          message={t("noPhotosMessage")}
        />
      </section>
    );
  }

  return (
    <section aria-label={t("galleryAria")}>
      <h2>{t("heading")}</h2>
      <div className="property-gallery">
        {images.map((src, index) => (
          <Image
            key={`${src}-${index}`}
            alt={`${title} ${index === 0 ? t("mainPhoto") : t("photoNumber", { number: index + 1 })}`}
            className={index === 0 ? "property-gallery__primary" : undefined}
            height={index === 0 ? 900 : 450}
            priority={index === 0}
            sizes={index === 0 ? "(max-width: 720px) 100vw, 66vw" : "(max-width: 720px) 50vw, 33vw"}
            src={src}
            unoptimized
            width={index === 0 ? 1200 : 600}
          />
        ))}
      </div>
    </section>
  );
}
