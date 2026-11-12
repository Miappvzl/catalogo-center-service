// utils/imageOptimizer.ts

/**
 * Comprime una imagen en el lado del cliente usando HTML5 Canvas (mantiene aspect ratio).
 */
export const compressImage = async (file: File, maxWidth = 1080, quality = 0.82): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '') + '.jpg',
                {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                }
              );
              resolve(compressedFile);
            } else {
              reject(new Error('No se pudo comprimir la imagen'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Redimensiona y encuadra cualquier imagen a las dimensiones físicas EXACTAS requeridas
 * (ej. 1920x600 px para Desktop o 1080x1350 / 1080x720 px para Móvil) directamente en el navegador.
 * @param file Archivo original de cualquier dimensión.
 * @param targetWidth Ancho exacto en píxeles.
 * @param targetHeight Alto exacto en píxeles.
 * @param options Modo de ajuste ('cover' | 'contain_blur') y punto focal (0 a 100%).
 */
export const resizeImageToExactDimensions = async (
  file: File | HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  options?: {
    mode?: 'cover' | 'contain_blur';
    focalX?: number; // 0 a 100 (50 = centro)
    focalY?: number; // 0 a 100 (50 = centro)
    quality?: number;
    fileName?: string;
  }
): Promise<File> => {
  const mode = options?.mode || 'cover';
  const focalX = (options?.focalX ?? 50) / 100;
  const focalY = (options?.focalY ?? 50) / 100;
  const quality = options?.quality ?? 0.88;

  const loadImg = (): Promise<HTMLImageElement> => {
    if (file instanceof HTMLImageElement) return Promise.resolve(file);
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  };

  const img = await loadImg();
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('No se pudo inicializar el motor gráfico Canvas');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (mode === 'contain_blur') {
    // 1. Fondo atmosférico desenfocado para llenar los bordes sin deformar
    ctx.save();
    ctx.filter = 'blur(36px) brightness(0.75)';
    const bgScale = Math.max(targetWidth / img.width, targetHeight / img.height) * 1.12;
    const bgW = img.width * bgScale;
    const bgH = img.height * bgScale;
    ctx.drawImage(img, (targetWidth - bgW) / 2, (targetHeight - bgH) / 2, bgW, bgH);
    ctx.restore();

    // 2. Imagen íntegra centrada
    const fgScale = Math.min(targetWidth / img.width, targetHeight / img.height);
    const fgW = img.width * fgScale;
    const fgH = img.height * fgScale;
    ctx.drawImage(img, (targetWidth - fgW) / 2, (targetHeight - fgH) / 2, fgW, fgH);
  } else {
    // Recorte Object-Cover con control de punto focal X / Y
    const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const offsetX = (targetWidth - drawW) * focalX;
    const offsetY = (targetHeight - drawH) * focalY;
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Fallo al exportar imagen redimensionada'));
        const baseName =
          options?.fileName ||
          (file instanceof File ? file.name.replace(/\.[^/.]+$/, '') : 'hero-banner');
        resolve(
          new File([blob], `${baseName}-${targetWidth}x${targetHeight}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
        );
      },
      'image/jpeg',
      quality
    );
  });
};