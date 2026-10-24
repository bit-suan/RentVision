import Image from "next/image";
import EmptyState from "@/components/ui/EmptyState";
import type { Property } from "@/lib/properties";

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
  const images = galleryImages.length > 0 ? galleryImages : imageUrl ? [imageUrl] : [];

  if (images.length === 0) {
    return (
      <section aria-label="Property image gallery">
        <h2>Photos</h2>
        <EmptyState
          title="No photos available"
          message="Photos for this property have not been added yet."
        />
      </section>
    );
  }

  return (
    <section aria-label="Property image gallery">
      <h2>Photos</h2>
      <div className="property-gallery">
        {images.map((src, index) => (
          <Image
            key={`${src}-${index}`}
            alt={`${title} ${index === 0 ? "main photo" : `photo ${index + 1}`}`}
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
