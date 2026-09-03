import { useState } from 'react';
import {
  buildImageSrcSet,
  getResponsiveImageUrl,
  resolveMediaUrl,
} from '../utils/media';

export default function OptimizedImage({
  src,
  alt,
  widths = [320, 640, 960, 1280, 1600],
  sizes,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  resolveSource = true,
  cloudinaryOptions = {},
  videoThumbnail = false,
  avifSrc,
  webpSrc,
  fallbackSrc,
  pictureClassName = 'contents',
  onError,
  ...imageProps
}) {
  const [imgError, setImgError] = useState(false);
  const currentSrc = imgError && fallbackSrc ? fallbackSrc : src;
  const isFallback = imgError && Boolean(fallbackSrc);

  const resolvedSource = resolveSource && !isFallback
    ? resolveMediaUrl(currentSrc)
    : (currentSrc || '');

  const transformationOptions = { ...cloudinaryOptions, videoThumbnail };
  const optimizedSource = getResponsiveImageUrl(
    resolvedSource,
    widths,
    transformationOptions,
  );
  const srcSet = isFallback ? undefined : buildImageSrcSet(
    resolvedSource,
    widths,
    transformationOptions,
  );

  const handleImageError = (e) => {
    if (!imgError && fallbackSrc) {
      setImgError(true);
    }
    if (onError) onError(e);
  };

  const image = (
    <img
      {...imageProps}
      src={optimizedSource}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      onError={handleImageError}
    />
  );

  if (imgError || (!avifSrc && !webpSrc)) return image;

  return (
    <picture className={pictureClassName}>
      {avifSrc && <source srcSet={avifSrc} type="image/avif" />}
      {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
      {image}
    </picture>
  );
}
