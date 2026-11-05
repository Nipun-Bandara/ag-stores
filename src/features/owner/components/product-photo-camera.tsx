"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useText } from "@/features/i18n/components/locale-provider";

export function ProductPhotoCamera({
  onCapture,
  onClose,
  onNativeCapture,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onNativeCapture: () => void;
}) {
  const t = useText();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mountedRef = useRef(true);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    mountedRef.current = true;
    let active = true;
    let stream: MediaStream | undefined;
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          if (active) setReady(true);
        }
      } catch {
        stream?.getTracks().forEach((track) => track.stop());
        if (active)
          setError(
            "Unable to access the camera. Allow camera permission or choose a photo from your device.",
          );
      }
    }
    void start();
    return () => {
      active = false;
      mountedRef.current = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setError("Camera is not ready. Please try again.");
      return;
    }
    setCapturing(true);
    const canvas = document.createElement("canvas");
    const scale = Math.min(
      1,
      1600 / Math.max(video.videoWidth, video.videoHeight),
    );
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Unable to capture a photo. Please try again.");
      setCapturing(false);
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!mountedRef.current) return;
        if (!blob) {
          setError("Unable to capture a photo. Please try again.");
          setCapturing(false);
          return;
        }
        onCapture(
          new File([blob], `product-photo-${Date.now()}.jpg`, {
            type: "image/jpeg",
          }),
        );
        onClose();
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Take photo")}</DialogTitle>
          <DialogDescription>
            {t(
              "Position your product in the camera preview, then take a photo.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="relative mt-4 aspect-video overflow-hidden rounded-lg border border-border bg-muted">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-label={t("Camera preview")}
            className="size-full object-contain"
          />
          {!ready && !error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner aria-label={t("Starting camera…")} />
            </div>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {t(error)}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              onNativeCapture();
            }}
          >
            {t("Use device camera")}
          </Button>
          <Button
            type="button"
            variant="success"
            disabled={!ready || capturing}
            onClick={capture}
          >
            <Camera aria-hidden="true" />
            {t("Take photo")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
