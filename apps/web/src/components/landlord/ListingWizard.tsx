"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useRouter as useNextRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import Spinner from "@/components/ui/Spinner";
import {
  ApiError,
  createListing,
  getDownloadUrl,
  getListing,
  registerImage,
  requestUploadUrl,
  updateListing,
  uploadFileToUrl,
} from "@/lib/api";
import type { Listing, PanoramaTour } from "@/lib/types";
import {
  clearListingDraft,
  EMPTY_LISTING_FORM,
  isPositiveInteger,
  listingToForm,
  loadListingDraft,
  MAX_PHOTOS,
  saveListingDraft,
  toNumber,
  validatePanoramaImage,
  validatePhoto,
  type Address,
  type ListingFormState,
} from "@/lib/landlord";
import BasicsStep from "./wizard/BasicsStep";
import LocationStep from "./wizard/LocationStep";
import DetailsStep from "./wizard/DetailsStep";
import PhotosStep from "./wizard/PhotosStep";
import PanoramaStep from "./wizard/PanoramaStep";
import ReviewStep from "./wizard/ReviewStep";
import WizardStepper from "./wizard/WizardStepper";
import type { HotspotItem, PhotoItem, SceneItem, UploadFailure } from "./wizard/types";

const TOTAL_STEPS = 6;
const MAX_SCENES = 10;

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function emptyHotspot(): HotspotItem {
  return {
    id: makeId("hotspot"),
    pitch: "0",
    yaw: "0",
    text: "",
    targetSceneId: "",
  };
}

export default function ListingWizard({ listingId }: { listingId?: string }) {
  const mode: "create" | "edit" = listingId ? "edit" : "create";
  const t = useTranslations("Landlord.Wizard");
  const errorsT = useTranslations("Landlord.Wizard.Errors");
  const router = useRouter();
  const nextRouter = useNextRouter();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ListingFormState>(EMPTY_LISTING_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [existingListing, setExistingListing] = useState<Listing | null>(null);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photoErrors, setPhotoErrors] = useState<Record<string, string>>({});
  const [photoGlobalError, setPhotoGlobalError] = useState<string | null>(null);

  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [defaultSceneId, setDefaultSceneId] = useState("");
  const [sceneErrors, setSceneErrors] = useState<Record<string, string>>({});
  const [sceneWarnings, setSceneWarnings] = useState<Record<string, string>>({});
  const [panoramaGlobalError, setPanoramaGlobalError] = useState<string | null>(null);
  const [removeTour, setRemoveTour] = useState(false);
  const [panoramaDirty, setPanoramaDirty] = useState(false);

  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadFailures, setUploadFailures] = useState<UploadFailure[]>([]);
  const [savedListingId, setSavedListingId] = useState<string | null>(null);

  const photosRef = useRef<PhotoItem[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) {
        if (photo.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      }
    };
  }, []);

  // Load an existing listing, or restore a locally saved create draft.
  useEffect(() => {
    let cancelled = false;

    if (!listingId) {
      const draft = loadListingDraft();
      if (draft) setForm(draft);
      setDraftReady(true);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const listing = await getListing(listingId);
        if (cancelled) return;

        setExistingListing(listing);
        setForm(listingToForm(listing));

        const mediaItems = await Promise.all(
          (listing.mediaKeys ?? []).map(async (key, index) => {
            let previewUrl = "";
            try {
              previewUrl = (await getDownloadUrl(key)).downloadUrl;
            } catch {
              previewUrl = "";
            }
            return {
              id: `saved-photo-${index}-${key}`,
              name: key.split("/").pop() || `photo-${index + 1}`,
              kind: "existing" as const,
              key,
              previewUrl,
            };
          })
        );
        if (!cancelled) setPhotos(mediaItems);

        if (listing.panorama) {
          const nextScenes: SceneItem[] = listing.panorama.scenes.map(
            (scene, index) => ({
              id: scene.id,
              title: scene.title,
              kind: "existing" as const,
              s3Key: scene.s3Key,
              previewUrl: scene.imageUrl,
              hotspots: scene.hotspots.map((hotspot) => ({
                id: hotspot.id || `hotspot-${index}-${Math.random()}`,
                pitch: String(hotspot.pitch),
                yaw: String(hotspot.yaw),
                text: hotspot.text,
                targetSceneId: hotspot.targetSceneId ?? "",
              })),
            })
          );
          setScenes(nextScenes);
          setDefaultSceneId(listing.panorama.defaultSceneId || nextScenes[0]?.id || "");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(errorMessage(error, t("loadError")));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listingId, t]);

  // Create-mode drafts are local only until the first successful save.
  useEffect(() => {
    if (mode === "create" && draftReady) {
      saveListingDraft(form);
    }
  }, [form, mode, draftReady]);

  const updateForm = useCallback((patch: Partial<ListingFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrors({});
    setStepError(null);
  }, []);

  const updateAddress = useCallback((patch: Partial<Address>) => {
    setForm((current) => ({
      ...current,
      address: { ...current.address, ...patch },
    }));
    setErrors({});
    setStepError(null);
  }, []);

  const existingPhotoKeys = useMemo(
    () =>
      photos
        .filter((photo) => photo.key)
        .map((photo) => photo.key as string),
    [photos]
  );

  const existingTour = Boolean(existingListing?.panorama);

  const validateStep = useCallback(
    (index: number): Record<string, string> => {
      const next: Record<string, string> = {};

      if (index === 0) {
        if (form.title.trim().length < 5) {
          next.title = errorsT("title");
        }
        if (form.description.trim().length < 30) {
          next.description = errorsT("description");
        }
        const price = toNumber(form.price);
        if (!Number.isFinite(price) || price <= 0) {
          next.price = errorsT("price");
        }
      }

      if (index === 1) {
        if (!form.address.street.trim()) next.street = errorsT("street");
        if (!form.address.subcity.trim()) next.subcity = errorsT("subcity");
        const latitude = toNumber(form.latitude);
        const longitude = toNumber(form.longitude);
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
          next.latitude = errorsT("latitude");
        }
        if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
          next.longitude = errorsT("longitude");
        }
      }

      if (index === 2) {
        if (!isPositiveInteger(form.bedrooms)) {
          next.bedrooms = errorsT("bedrooms");
        }
        if (!isPositiveInteger(form.bathrooms)) {
          next.bathrooms = errorsT("bathrooms");
        }
        const area = toNumber(form.areaSqm);
        if (!Number.isFinite(area) || area <= 0) {
          next.areaSqm = errorsT("area");
        }
      }

      if (index === 3) {
        if (photos.length === 0) {
          next.__global = errorsT("photosRequired");
        }
      }

      if (index === 4 && !removeTour) {
        const ids = new Set(scenes.map((scene) => scene.id));
        if (scenes.length > MAX_SCENES) {
          next.__global = errorsT("tooManyScenes");
        }
        if (scenes.length > 0 && !ids.has(defaultSceneId)) {
          next.__global = errorsT("defaultScene");
        }
        for (const scene of scenes) {
          if (!scene.title.trim()) {
            next[scene.id] = errorsT("sceneTitle");
          }
          if (!scene.s3Key && !scene.file) {
            next[scene.id] = errorsT("sceneFile");
          }
          for (const hotspot of scene.hotspots) {
            if (!hotspot.text.trim()) {
              next[scene.id] = errorsT("hotspotText");
            }
            const pitch = toNumber(hotspot.pitch);
            const yaw = toNumber(hotspot.yaw);
            if (!Number.isFinite(pitch) || pitch < -90 || pitch > 90) {
              next[scene.id] = errorsT("hotspotPitch");
            }
            if (!Number.isFinite(yaw) || yaw < -180 || yaw > 180) {
              next[scene.id] = errorsT("hotspotYaw");
            }
            if (hotspot.targetSceneId && !ids.has(hotspot.targetSceneId)) {
              next[scene.id] = errorsT("hotspotTarget");
            }
          }
        }
      }

      return next;
    },
    [
      defaultSceneId,
      errorsT,
      form,
      photos.length,
      removeTour,
      scenes,
    ]
  );

  function goNext() {
    const nextErrors = validateStep(step);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
    setStepError(null);
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
    setErrors({});
    setStepError(null);
  }

  function goToStep(index: number) {
    if (index >= step) return;
    setStep(index);
    setErrors({});
    setStepError(null);
  }

  const translateFileError = useCallback(
    (code?: string) =>
      code === "unsupported-type"
        ? errorsT("fileType")
        : code === "too-large"
          ? errorsT("fileSize")
          : code === "not-equirectangular"
            ? errorsT("equirectangular")
            : code === "unreadable"
              ? errorsT("unreadable")
              : errorsT("fileUnknown"),
    [errorsT]
  );

  function addPhotoFiles(files: File[]) {
    setPhotoGlobalError(null);
    const nextItems: PhotoItem[] = [];
    const nextErrors: Record<string, string> = {};

    for (const file of files) {
      if (photos.length + nextItems.length >= MAX_PHOTOS) {
        setPhotoGlobalError(errorsT("tooManyPhotos", { count: MAX_PHOTOS }));
        break;
      }
      const validation = validatePhoto(file);
      const id = makeId("photo");
      if (validation.error) {
        nextErrors[id] = translateFileError(validation.error);
        continue;
      }
      nextItems.push({
        id,
        name: file.name,
        size: file.size,
        kind: "new",
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (nextItems.length) setPhotos((current) => [...current, ...nextItems]);
    setPhotoErrors((current) => ({ ...current, ...nextErrors }));
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((photo) => photo.id !== id);
    });
    setPhotoErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function addScene(file: File) {
    setPanoramaGlobalError(null);
    if (scenes.length >= MAX_SCENES) {
      setPanoramaGlobalError(errorsT("tooManyScenes"));
      return;
    }
    const validation = await validatePanoramaImage(file);
    if (validation.error) {
      setPanoramaGlobalError(translateFileError(validation.error));
      return;
    }

    const id = makeId("scene");
    const scene: SceneItem = {
      id,
      title: file.name.replace(/\.[^.]+$/, "") || `${t("sceneFallback")} ${scenes.length + 1}`,
      kind: "new",
      file,
      previewUrl: URL.createObjectURL(file),
      hotspots: [],
    };
    setScenes((current) => [...current, scene]);
    setDefaultSceneId((current) => current || id);
    if (validation.warning) {
      setSceneWarnings((current) => ({
        ...current,
        [id]: errorsT("lowResolution"),
      }));
    }
    setPanoramaDirty(true);
  }

  async function replaceSceneFile(sceneId: string, file: File) {
    setPanoramaGlobalError(null);
    const validation = await validatePanoramaImage(file);
    if (validation.error) {
      setSceneErrors((current) => ({
        ...current,
        [sceneId]: translateFileError(validation.error),
      }));
      return;
    }

    setScenes((current) =>
      current.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              kind: "new",
              file,
              s3Key: undefined,
              previewUrl: URL.createObjectURL(file),
            }
          : scene
      )
    );
    setSceneErrors((current) => {
      const next = { ...current };
      delete next[sceneId];
      return next;
    });
    setSceneWarnings((current) => {
      const next = { ...current };
      if (validation.warning) next[sceneId] = errorsT("lowResolution");
      else delete next[sceneId];
      return next;
    });
    setPanoramaDirty(true);
  }

  function updateScene(id: string, patch: Partial<SceneItem>) {
    setScenes((current) =>
      current.map((scene) => (scene.id === id ? { ...scene, ...patch } : scene))
    );
    setPanoramaDirty(true);
  }

  function removeScene(id: string) {
    setScenes((current) => {
      const next = current.filter((scene) => scene.id !== id);
      if (defaultSceneId === id) {
        setDefaultSceneId(next[0]?.id ?? "");
      }
      return next;
    });
    setSceneErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setSceneWarnings((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setPanoramaDirty(true);
  }

  function addHotspot(sceneId: string) {
    setScenes((current) =>
      current.map((scene) =>
        scene.id === sceneId
          ? { ...scene, hotspots: [...scene.hotspots, emptyHotspot()] }
          : scene
      )
    );
    setPanoramaDirty(true);
  }

  function updateHotspot(
    sceneId: string,
    hotspotId: string,
    patch: Record<string, string>
  ) {
    setScenes((current) =>
      current.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              hotspots: scene.hotspots.map((hotspot) =>
                hotspot.id === hotspotId ? { ...hotspot, ...patch } : hotspot
              ),
            }
          : scene
      )
    );
    setPanoramaDirty(true);
  }

  function removeHotspot(sceneId: string, hotspotId: string) {
    setScenes((current) =>
      current.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              hotspots: scene.hotspots.filter(
                (hotspot) => hotspot.id !== hotspotId
              ),
            }
          : scene
      )
    );
    setPanoramaDirty(true);
  }

  function buildBasePayload() {
    return {
      title: form.title.trim(),
      description: form.description.trim(),
      price: toNumber(form.price),
      currency: form.currency,
      propertyType: form.propertyType,
      latitude: toNumber(form.latitude),
      longitude: toNumber(form.longitude),
      address: {
        street: form.address.street.trim(),
        city: form.address.city.trim(),
        subcity: form.address.subcity.trim(),
        woreda: form.address.woreda.trim(),
      },
      bedrooms: toNumber(form.bedrooms),
      bathrooms: toNumber(form.bathrooms),
      areaSqm: toNumber(form.areaSqm),
      amenities: form.amenities,
    };
  }

  async function uploadPhotos(targetId: string): Promise<UploadFailure[]> {
    const failures: UploadFailure[] = [];
    const pending = photos.filter(
      (photo) => photo.kind === "new" && photo.file
    );

    for (const photo of pending) {
      const file = photo.file as File;
      try {
        const upload = await requestUploadUrl({
          listingId: targetId,
          fileName: file.name,
          mediaType: "photo",
          contentType: file.type,
        });
        await uploadFileToUrl(upload.uploadUrl, file);
        await registerImage(targetId, upload.fileKey);
        setPhotos((current) =>
          current.map((item) =>
            item.id === photo.id
              ? {
                  ...item,
                  kind: "existing",
                  key: upload.fileKey,
                  file: undefined,
                }
              : item
          )
        );
      } catch (error) {
        failures.push({
          label: photo.name,
          message: errorMessage(error, t("uploadFailed")),
        });
        setPhotoErrors((current) => ({
          ...current,
          [photo.id]: errorMessage(error, t("uploadFailed")),
        }));
      }
    }

    return failures;
  }

  async function uploadPanorama(targetId: string): Promise<UploadFailure[]> {
    const failures: UploadFailure[] = [];
    if (removeTour) return failures;

    const sceneKeys = new Map<string, string>();
    for (const scene of scenes) {
      if (scene.s3Key) sceneKeys.set(scene.id, scene.s3Key);
    }

    const pending = scenes.filter((scene) => scene.file);
    for (const scene of pending) {
      const file = scene.file as File;
      try {
        const upload = await requestUploadUrl({
          listingId: targetId,
          fileName: file.name,
          mediaType: "panorama",
          contentType: file.type,
        });
        await uploadFileToUrl(upload.uploadUrl, file);
        sceneKeys.set(scene.id, upload.fileKey);
        setScenes((current) =>
          current.map((item) =>
            item.id === scene.id
              ? {
                  ...item,
                  kind: "existing",
                  s3Key: upload.fileKey,
                  file: undefined,
                }
              : item
          )
        );
      } catch (error) {
        failures.push({
          label: scene.title || file.name,
          message: errorMessage(error, t("uploadFailed")),
        });
        setSceneErrors((current) => ({
          ...current,
          [scene.id]: errorMessage(error, t("uploadFailed")),
        }));
      }
    }

    const shouldSave =
      scenes.length > 0 &&
      (mode === "create" || panoramaDirty || pending.length > 0);

    if (shouldSave) {
      if (scenes.some((scene) => !sceneKeys.get(scene.id))) {
        failures.push({
          label: t("tourLabel"),
          message: t("tourNotSaved"),
        });
        return failures;
      }

      const panorama: PanoramaTour = {
        defaultSceneId: defaultSceneId || scenes[0].id,
        scenes: scenes.map((scene) => ({
          id: scene.id,
          title: scene.title.trim(),
          s3Key: sceneKeys.get(scene.id) as string,
          hotspots: scene.hotspots.map((hotspot) => ({
            id: hotspot.id,
            pitch: toNumber(hotspot.pitch),
            yaw: toNumber(hotspot.yaw),
            text: hotspot.text.trim(),
            ...(hotspot.targetSceneId
              ? { targetSceneId: hotspot.targetSceneId }
              : {}),
          })),
        })),
      };

      try {
        await updateListing(targetId, { panorama });
        setPanoramaDirty(false);
      } catch (error) {
        failures.push({
          label: t("tourLabel"),
          message: errorMessage(error, t("tourNotSaved")),
        });
      }
    }

    return failures;
  }

  async function handleSubmit() {
    setStepError(null);
    setSaveError(null);
    setUploadFailures([]);
    setAcceptError(null);

    const allErrors: Record<string, string> = {};
    let firstInvalidStep = -1;
    for (let index = 0; index < TOTAL_STEPS - 1; index += 1) {
      const stepErrors = validateStep(index);
      if (Object.keys(stepErrors).length > 0) {
        Object.assign(allErrors, stepErrors);
        if (firstInvalidStep === -1) firstInvalidStep = index;
      }
    }

    if (firstInvalidStep !== -1) {
      setErrors(allErrors);
      setStep(firstInvalidStep);
      setStepError(t("fixErrors"));
      return;
    }

    if (!accepted) {
      setAcceptError(t("acceptRequired"));
      return;
    }

    setSaving(true);
    const base = buildBasePayload();
    const shouldClearTour =
      mode === "edit" &&
      (removeTour || (existingTour && scenes.length === 0));

    const baseUpdate = {
      ...base,
      mediaKeys: existingPhotoKeys,
      ...(shouldClearTour ? { panorama: null } : {}),
    };

    let targetId = savedListingId ?? listingId ?? null;

    try {
      if (!targetId) {
        const created = await createListing(base);
        targetId = created.listingId;
        setSavedListingId(targetId);
      } else {
        await updateListing(targetId, baseUpdate);
        if (!savedListingId) setSavedListingId(targetId);
      }
    } catch (error) {
      setSaveError(errorMessage(error, t("saveFailed")));
      setSaving(false);
      return;
    }

    const failures = [
      ...(await uploadPhotos(targetId)),
      ...(await uploadPanorama(targetId)),
    ];

    if (failures.length > 0) {
      setUploadFailures(failures);
      setSaving(false);
      return;
    }

    clearListingDraft();
    setSaving(false);
    router.push(`/landlord/properties/${targetId}?saved=1`);
    nextRouter.refresh();
  }

  if (loading) {
    return (
      <div className="landlord-loading">
        <Spinner label={t("loading")} />
      </div>
    );
  }

  if (loadError) {
    return (
      <ErrorState
        message={loadError}
        onRetry={() => window.location.reload()}
        title={t("loadErrorTitle")}
      />
    );
  }

  return (
    <div className="wizard">
      <header className="wizard-header">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{mode === "edit" ? t("editTitle") : t("createTitle")}</h1>
          <p className="muted">
            {mode === "edit" ? t("editDescription") : t("createDescription")}
          </p>
        </div>
        <Link className="landlord-text-link" href="/landlord/properties">
          {t("cancel")}
        </Link>
      </header>

      <WizardStepper current={step} onStepClick={goToStep} />

      {mode === "create" && step === 0 ? (
        <p className="wizard-draft-note">{t("draftNotice")}</p>
      ) : null}

      {stepError ? (
        <p className="auth-error" role="alert">
          {stepError}
        </p>
      ) : null}

      {step === 0 ? (
        <BasicsStep errors={errors} form={form} onChange={updateForm} />
      ) : null}
      {step === 1 ? (
        <LocationStep
          errors={errors}
          form={form}
          onAddressChange={updateAddress}
          onChange={updateForm}
        />
      ) : null}
      {step === 2 ? (
        <DetailsStep errors={errors} form={form} onChange={updateForm} />
      ) : null}
      {step === 3 ? (
        <PhotosStep
          errors={photoErrors}
          globalError={errors.__global || photoGlobalError || undefined}
          items={photos}
          onAddFiles={addPhotoFiles}
          onRemove={removePhoto}
        />
      ) : null}
      {step === 4 ? (
        <PanoramaStep
          defaultSceneId={defaultSceneId}
          existingTour={existingTour}
          globalError={errors.__global || panoramaGlobalError || undefined}
          onAddHotspot={addHotspot}
          onAddScene={addScene}
          onDefaultScene={setDefaultSceneId}
          onRemoveHotspot={removeHotspot}
          onRemoveScene={removeScene}
          onToggleRemoveTour={setRemoveTour}
          onUpdateHotspot={updateHotspot}
          onUpdateScene={updateScene}
          onReplaceSceneFile={replaceSceneFile}
          removeTour={removeTour}
          sceneErrors={Object.keys(errors).length ? { ...sceneErrors, ...errors } : sceneErrors}
          sceneWarnings={sceneWarnings}
          scenes={scenes}
        />
      ) : null}
      {step === 5 ? (
        <ReviewStep
          accepted={accepted}
          currentStatus={existingListing?.status}
          form={form}
          mode={mode}
          onAcceptedChange={(value) => {
            setAccepted(value);
            setAcceptError(null);
          }}
          onEditStep={goToStep}
          photos={photos}
          removeTour={removeTour}
          scenes={scenes}
        />
      ) : null}

      {uploadFailures.length > 0 ? (
        <aside className="wizard-failures" role="alert">
          <h2>{t("partialTitle")}</h2>
          <p>{t("partialMessage")}</p>
          <ul>
            {uploadFailures.map((failure, index) => (
              <li key={`${failure.label}-${index}`}>
                <strong>{failure.label}</strong>: {failure.message}
              </li>
            ))}
          </ul>
          <div className="wizard-failures__actions">
            <Button isLoading={saving} onClick={handleSubmit} type="button">
              {t("retryUploads")}
            </Button>
            {savedListingId ? (
              <Button
                href={`/landlord/properties/${savedListingId}`}
                variant="secondary"
              >
                {t("goToProperty")}
              </Button>
            ) : null}
          </div>
        </aside>
      ) : null}

      {saveError ? (
        <p className="auth-error" role="alert">
          {saveError}
        </p>
      ) : null}

      {step === 5 && acceptError ? (
        <p className="auth-error" role="alert">
          {acceptError}
        </p>
      ) : null}

      <footer className="wizard-footer">
        <div>
          {step > 0 ? (
            <Button onClick={goBack} type="button" variant="secondary">
              {t("back")}
            </Button>
          ) : null}
        </div>
        <div className="wizard-footer__actions">
          <span className="muted">
            {t("stepProgress", { current: step + 1, total: TOTAL_STEPS })}
          </span>
          {step < TOTAL_STEPS - 1 ? (
            <Button onClick={goNext} type="button">
              {t("next")}
            </Button>
          ) : (
            <Button isLoading={saving} onClick={handleSubmit} type="button">
              {mode === "edit" ? t("saveEdit") : t("save")}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
