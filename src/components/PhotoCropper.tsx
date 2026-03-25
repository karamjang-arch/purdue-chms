"use client";

import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = url;
  });
}

async function getCroppedBlob(
  imageSrc: string,
  crop: Area,
  maxSize = 800
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");

  // Scale down if needed
  let w = crop.width;
  let h = crop.height;
  if (w > maxSize || h > maxSize) {
    const ratio = maxSize / Math.max(w, h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, w, h);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.85);
  });
}

export default function PhotoCropper({
  imageSrc,
  onCropDone,
  onCancel,
}: {
  imageSrc: string;
  onCropDone: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleDone = async () => {
    if (!croppedArea) return;
    const blob = await getCroppedBlob(imageSrc, croppedArea);
    onCropDone(blob);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex flex-col">
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div className="bg-white p-4 flex items-center gap-4">
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1"
        />
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-600"
        >
          취소
        </button>
        <button
          onClick={handleDone}
          className="px-4 py-2 rounded-lg text-sm bg-navy-800 text-white hover:bg-navy-700"
        >
          완료
        </button>
      </div>
    </div>
  );
}
