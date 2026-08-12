export function downloadBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Keep the object URL alive long enough for slower browsers to start reading
  // the blob after the synthetic click has returned.
  window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

export async function shareBlobOrDownload(
  blob: Blob,
  filename: string,
  shareData: ShareData,
): Promise<'shared' | 'downloaded'> {
  if (navigator.share && navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch (error) {
      // Cancelling the native share sheet is intentional. Other Web Share
      // failures (including expired transient activation after card rendering)
      // should still give the reader the generated file as a download.
      if ((error as Error).name === 'AbortError') throw error;
    }
  }

  downloadBlob(blob, filename);
  return 'downloaded';
}
