import { useState, useEffect } from "react";
import { getSignedUrl } from "@/lib/storage";

interface StorageImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  fallback?: React.ReactNode;
}

/**
 * Image component that automatically converts stored public URLs
 * to signed URLs for private storage buckets.
 */
export function StorageImage({ src, fallback, alt, ...props }: StorageImageProps) {
  const [signedSrc, setSignedSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setSignedSrc(null);
      return;
    }

    // Local blob URLs or data URLs don't need signing
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setSignedSrc(src);
    } else if (src.includes('/storage/v1/object/public/')) {
      getSignedUrl(src).then(setSignedSrc).catch(() => setSignedSrc(src));
    } else {
      setSignedSrc(src);
    }
  }, [src]);

  if (!src || error) {
    return fallback ? <>{fallback}</> : null;
  }

  if (!signedSrc) return null; // loading

  return <img src={signedSrc} alt={alt} onError={() => setError(true)} {...props} />;
}
