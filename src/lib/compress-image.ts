/**
 * Compress and resize a cover image file in the browser before upload.
 * Uses Canvas API — zero dependencies.
 *
 * Target: max 400×600px, WebP format at 0.7 quality, ~60KB output.
 */

const MAX_WIDTH = 400;
const MAX_HEIGHT = 600;
const QUALITY = 0.7;

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  previewUrl: string;
}

export function compressCoverImage(file: File): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Format file tidak didukung. Gunakan JPG, PNG, atau WebP."));
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      reject(new Error("Ukuran file terlalu besar. Maksimal 20MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Calculate dimensions maintaining aspect ratio
        let { width, height } = img;

        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = (width * MAX_HEIGHT) / height;
          height = MAX_HEIGHT;
        }

        width = Math.round(width);
        height = Math.round(height);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first, fallback to JPEG
        const tryWebP = () => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({
                  blob,
                  width,
                  height,
                  previewUrl: URL.createObjectURL(blob),
                });
              } else {
                // WebP failed, try JPEG
                canvas.toBlob(
                  (jpegBlob) => {
                    if (jpegBlob) {
                      resolve({
                        blob: jpegBlob,
                        width,
                        height,
                        previewUrl: URL.createObjectURL(jpegBlob),
                      });
                    } else {
                      reject(new Error("Image compression failed"));
                    }
                  },
                  "image/jpeg",
                  0.8
                );
              }
            },
            "image/webp",
            QUALITY
          );
        };

        tryWebP();
      };

      img.onerror = () => reject(new Error("Gagal memuat gambar."));
      img.src = reader.result as string;
    };

    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsDataURL(file);
  });
}

export function revokePreview(url: string) {
  URL.revokeObjectURL(url);
}
