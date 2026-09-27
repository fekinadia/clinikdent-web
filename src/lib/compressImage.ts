/**
 * Compression des photos avant envoi (2026-09-27).
 *
 * Une photo prise au téléphone pèse souvent 3 à 8 Mo : sur une connexion
 * mobile, l'envoi prenait de longues secondes (bouton « Envoi... » figé).
 * On redimensionne donc les images côté navigateur avant l'upload :
 *  - photos : 2000 px max sur le grand côté, JPEG qualité 0.82 (~300-600 Ko)
 *  - radios / panoramiques / scanners : 3000 px max, qualité 0.92, pour
 *    garder la lisibilité clinique
 * Les PDF, documents Office et formats non décodables (ex. HEIC hors Safari)
 * sont envoyés tels quels. Si la version compressée n'est pas plus légère,
 * on garde l'original. En cas d'erreur, on envoie l'original : la
 * compression ne doit jamais empêcher un envoi.
 */

const COMPRESSIBLE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MIN_SIZE_TO_COMPRESS = 500 * 1024; // en dessous de 500 Ko, inutile
const HIGH_QUALITY_TYPES = ['radio', 'panoramique', 'scanner'];

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      // imageOrientation : respecte la rotation EXIF des photos de téléphone.
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* repli sur <img> ci-dessous */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

export async function compressImage(file: File, attachmentType: string): Promise<File> {
  if (!COMPRESSIBLE.includes(file.type) || file.size < MIN_SIZE_TO_COMPRESS) return file;

  const highQuality = HIGH_QUALITY_TYPES.includes(attachmentType);
  const maxSide = highQuality ? 3000 : 2000;
  const quality = highQuality ? 0.92 : 0.82;

  try {
    const img = await decode(file);
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      img.close();
      return file;
    }
    // Fond blanc : les PNG transparents ne deviennent pas noirs en JPEG.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img.source, 0, 0, w, h);
    img.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    return file;
  }
}
