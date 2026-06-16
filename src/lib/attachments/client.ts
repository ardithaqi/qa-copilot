import {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_IMAGE_ATTACHMENTS,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  type MediaAttachment,
} from "@/types/attachments";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read the selected file."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

export async function filesToMediaAttachments(
  imageFiles: File[],
  videoFile: File | null
): Promise<MediaAttachment[]> {
  if (videoFile) {
    if (!ALLOWED_VIDEO_MIME_TYPES.includes(videoFile.type as never)) {
      throw new Error("Video must be MP4, WebM, or MOV.");
    }
    if (videoFile.size > MAX_VIDEO_BYTES) {
      throw new Error("Video must be 20 MB or smaller.");
    }

    const dataUrl = await readFileAsDataUrl(videoFile);
    return [
      {
        kind: "video",
        mimeType: videoFile.type,
        fileName: videoFile.name,
        dataBase64: dataUrlToBase64(dataUrl),
      },
    ];
  }

  if (imageFiles.length > MAX_IMAGE_ATTACHMENTS) {
    throw new Error(`You can attach up to ${MAX_IMAGE_ATTACHMENTS} images.`);
  }

  const attachments: MediaAttachment[] = [];
  for (const file of imageFiles) {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as never)) {
      throw new Error("Images must be PNG, JPEG, WebP, or GIF.");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error("Each image must be 5 MB or smaller.");
    }

    const dataUrl = await readFileAsDataUrl(file);
    attachments.push({
      kind: "image",
      mimeType: file.type,
      fileName: file.name,
      dataBase64: dataUrlToBase64(dataUrl),
    });
  }

  return attachments;
}
