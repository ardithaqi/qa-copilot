import type { UiLlmProviderId } from "@/lib/llm/types";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_IMAGE_ATTACHMENTS,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  type MediaAttachment,
} from "@/types/attachments";

function decodeBase64Size(dataBase64: string): number {
  const padding = dataBase64.endsWith("==") ? 2 : dataBase64.endsWith("=") ? 1 : 0;
  return Math.floor((dataBase64.length * 3) / 4) - padding;
}

function parseAttachment(raw: unknown): MediaAttachment | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const item = raw as Partial<MediaAttachment>;
  const kind = item.kind;
  const mimeType = typeof item.mimeType === "string" ? item.mimeType.trim() : "";
  const fileName = typeof item.fileName === "string" ? item.fileName.trim() : "";
  const dataBase64 =
    typeof item.dataBase64 === "string" ? item.dataBase64.trim() : "";

  if ((kind !== "image" && kind !== "video") || !mimeType || !dataBase64) {
    return null;
  }

  return {
    kind,
    mimeType,
    fileName: fileName || (kind === "image" ? "image" : "video"),
    dataBase64,
  };
}

export function parseAttachmentsFromBody(raw: unknown): MediaAttachment[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map(parseAttachment).filter((item): item is MediaAttachment => item !== null);
}

export function validateAttachments(attachments: MediaAttachment[]): void {
  if (attachments.length === 0) {
    return;
  }

  const images = attachments.filter((item) => item.kind === "image");
  const videos = attachments.filter((item) => item.kind === "video");

  if (images.length > 0 && videos.length > 0) {
    throw new Error(
      "ATTACHMENTS_INVALID: Add images or a video, not both in the same run."
    );
  }

  if (images.length > MAX_IMAGE_ATTACHMENTS) {
    throw new Error(
      `ATTACHMENTS_INVALID: You can attach up to ${MAX_IMAGE_ATTACHMENTS} images per run.`
    );
  }

  if (videos.length > 1) {
    throw new Error("ATTACHMENTS_INVALID: Attach one video per run.");
  }

  for (const image of images) {
    if (
      !(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(image.mimeType)
    ) {
      throw new Error(
        "ATTACHMENTS_INVALID: Images must be PNG, JPEG, WebP, or GIF."
      );
    }
    if (decodeBase64Size(image.dataBase64) > MAX_IMAGE_BYTES) {
      throw new Error("ATTACHMENTS_INVALID: Each image must be 5 MB or smaller.");
    }
  }

  for (const video of videos) {
    if (
      !(ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(video.mimeType)
    ) {
      throw new Error("ATTACHMENTS_INVALID: Video must be MP4, WebM, or MOV.");
    }
    if (decodeBase64Size(video.dataBase64) > MAX_VIDEO_BYTES) {
      throw new Error("ATTACHMENTS_INVALID: Video must be 20 MB or smaller.");
    }
  }
}

export function validateAttachmentsForProvider(
  attachments: MediaAttachment[],
  provider: UiLlmProviderId
): void {
  if (attachments.length === 0) {
    return;
  }

  const hasVideo = attachments.some((item) => item.kind === "video");

  if (provider === "groq") {
    throw new Error(
      "ATTACHMENTS_PROVIDER: Groq does not support images or video. Select OpenAI (images) or Gemini (images and video)."
    );
  }

  if (provider === "openai" && hasVideo) {
    throw new Error(
      "ATTACHMENTS_PROVIDER: Video requires Gemini. Use an image or switch provider."
    );
  }
}

export function buildMediaContextNote(attachments: MediaAttachment[]): string {
  if (attachments.length === 0) {
    return "";
  }

  const images = attachments.filter((item) => item.kind === "image").length;
  const videos = attachments.filter((item) => item.kind === "video").length;

  if (videos > 0) {
    return `\n\nAn attached screen recording is included. Use visible UI states, flows, and errors from the video together with the text. Do not invent details not shown.`;
  }

  const imageLabel = images === 1 ? "screenshot is" : "screenshots are";
  return `\n\n${images} attached ${imageLabel} included. Use visible UI elements, labels, states, and errors from the image(s) together with the text. Do not invent details not shown.`;
}
