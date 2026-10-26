import { Suspense } from "react";
import Spinner from "@/components/ui/Spinner";
import ListingDiscovery from "@/components/property/ListingDiscovery";

export default function PropertiesPage() {
  return (
    <Suspense
      fallback={
        <div className="detail-panel" role="status">
          <Spinner label="Loading property results" />
        </div>
      }
    >
      <ListingDiscovery />
    </Suspense>
  );
}
