/** Trigger a browser download of a Blob or string. */
export function downloadBlob(data: Blob | string, filename: string, mime = 'text/plain') {
  const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Open a native file picker and resolve with the chosen File (or null if
 * cancelled). The input MUST be attached to the document before `.click()` —
 * a detached file input does not reliably open the OS dialog in packaged
 * Electron apps (and some browsers), which is why imports "couldn't find" files.
 */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    // Keep it in the DOM but out of sight.
    input.style.position = 'fixed';
    input.style.top = '-1000px';
    input.style.opacity = '0';

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };

    input.addEventListener('change', () => finish(input.files?.[0] ?? null));
    // Modern browsers/Electron fire 'cancel' when the dialog is dismissed.
    input.addEventListener('cancel', () => finish(null));

    document.body.appendChild(input);
    input.click();
  });
}

export function readText(file: File): Promise<string> {
  return file.text();
}
