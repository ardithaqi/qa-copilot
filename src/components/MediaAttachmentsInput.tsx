"use client";

import { useRef } from "react";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_IMAGE_ATTACHMENTS,
} from "@/types/attachments";

interface MediaAttachmentsInputProps {
  imageFiles: File[];
  videoFile: File | null;
  onImageFilesChange: (files: File[]) => void;
  onVideoFileChange: (file: File | null) => void;
  disabled?: boolean;
  provider: "groq" | "openai" | "gemini";
}

const IMAGE_ACCEPT = ALLOWED_IMAGE_MIME_TYPES.join(",");
const VIDEO_ACCEPT = ALLOWED_VIDEO_MIME_TYPES.join(",");

export default function MediaAttachmentsInput({
  imageFiles,
  videoFile,
  onImageFilesChange,
  onVideoFileChange,
  disabled = false,
  provider,
}: MediaAttachmentsInputProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const hasVideo = videoFile !== null;
  const hasImages = imageFiles.length > 0;

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) {
      return;
    }
    onVideoFileChange(null);
    const merged = [...imageFiles, ...selected].slice(0, MAX_IMAGE_ATTACHMENTS);
    onImageFilesChange(merged);
    event.target.value = "";
  }

  function handleVideoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) {
      return;
    }
    onImageFilesChange([]);
    onVideoFileChange(selected);
    event.target.value = "";
  }

  function clearAll() {
    onImageFilesChange([]);
    onVideoFileChange(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  }

  const providerNote =
    provider === "groq"
      ? "Groq is text-only. Switch to OpenAI (images) or Gemini (images and video) to use attachments."
      : provider === "openai"
        ? "OpenAI supports up to 3 images (5 MB each). Video requires Gemini."
        : "Gemini supports up to 3 images or one video (20 MB).";

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-700">
        Screenshots or video (optional)
      </legend>
      <p className="text-xs text-slate-500">{providerNote}</p>

      <div className="flex flex-wrap gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
          <input
            ref={imageInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            disabled={disabled || hasVideo || imageFiles.length >= MAX_IMAGE_ATTACHMENTS}
            onChange={handleImageChange}
            className="sr-only"
          />
          Add screenshot{imageFiles.length > 0 ? "s" : ""}
        </label>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
          <input
            ref={videoInputRef}
            type="file"
            accept={VIDEO_ACCEPT}
            disabled={disabled || hasImages}
            onChange={handleVideoChange}
            className="sr-only"
          />
          Add video
        </label>

        {(hasImages || hasVideo) && (
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear attachments
          </button>
        )}
      </div>

      {(hasImages || hasVideo) && (
        <ul className="space-y-1 text-xs text-slate-600">
          {imageFiles.map((file) => (
            <li key={`${file.name}-${file.size}`}>
              Image: {file.name} ({formatBytes(file.size)})
            </li>
          ))}
          {videoFile && (
            <li>
              Video: {videoFile.name} ({formatBytes(videoFile.size)})
            </li>
          )}
        </ul>
      )}
    </fieldset>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
