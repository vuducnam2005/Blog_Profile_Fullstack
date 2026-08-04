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
  pictureClassName = 'contents',
  ...imageProps
}) {
  const resolvedSource = resolveSource ? resolveMediaUrl(src) : (src || '');
  const transformationOptions = { ...cloudinaryOptions, videoThumbnail };
  const optimizedSource = getResponsiveImageUrl(
    resolvedSource,
    widths,
    transformationOptions,
  );
  const srcSet = buildImageSrcSet(
    resolvedSource,
    widths,
    transformationOptions,
  );

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
    />
  );

  if (!avifSrc && !webpSrc) return image;

  return (
    <picture className={pictureClassName}>
      {avifSrc && <source srcSet={avifSrc} type="image/avif" />}
      {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
      {image}
    </picture>
  );
}
