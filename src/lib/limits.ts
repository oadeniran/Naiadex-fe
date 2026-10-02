export const MAX_TOTAL_BYTES = 8 * 1024 * 1024;   // all photos + video combined
export const MAX_VIDEO_BYTES = 4 * 1024 * 1024;   // video alone
export const MAX_UNLABELED_PHOTOS = 5;

/** Rough byte size of a base64 data URI (the base64 body decodes to ~3/4 its length). */
export function dataUriBytes(uri: string): number {
  const comma = uri.indexOf(",");
  const b64 = comma >= 0 ? uri.slice(comma + 1) : uri;
  return Math.floor((b64.length * 3) / 4);
}

export function humanMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}