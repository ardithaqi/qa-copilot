export type MediaAttachmentKind = "image" | "video";

export interface MediaAttachment {
  kind: MediaAttachmentKind;
  mimeType: string;
  fileName: string;
  dataBase64: string;
}

export const MAX_IMAGE_ATTACHMENTS = 3;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;
