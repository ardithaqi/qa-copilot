import type { MediaAttachment } from "@/types/attachments";
import { buildMediaContextNote } from "@/lib/attachments/validate";

export function buildUserPromptWithMedia(
  userPrompt: string,
  attachments?: MediaAttachment[]
): string {
  if (!attachments?.length) {
    return userPrompt;
  }
  return userPrompt + buildMediaContextNote(attachments);
}

export function buildOpenAIUserContent(
  userPrompt: string,
  attachments?: MediaAttachment[]
): string | OpenAIUserContentPart[] {
  const images = attachments?.filter((item) => item.kind === "image") ?? [];
  if (images.length === 0) {
    return userPrompt;
  }

  const text = buildUserPromptWithMedia(userPrompt, attachments);
  return [
    { type: "text", text },
    ...images.map((image) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${image.mimeType};base64,${image.dataBase64}`,
      },
    })),
  ];
}

export type OpenAIUserContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export function buildGeminiContentParts(
  userPrompt: string,
  attachments?: MediaAttachment[]
): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {
  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text: buildUserPromptWithMedia(userPrompt, attachments) }];

  for (const attachment of attachments ?? []) {
    parts.push({
      inlineData: {
        mimeType: attachment.mimeType,
        data: attachment.dataBase64,
      },
    });
  }

  return parts;
}
