import { API_BASE_URL } from '../config.js';

const DEFAULT_IMAGE_WIDTHS = [320, 640, 960, 1280, 1600];
const CLOUDINARY_TRANSFORMATION_PARAMETER = /^(?:a|ac|af|ar|b|bo|c|co|cs|d|dl|dn|dpr|du|e|eo|f|fl|fn|fps|g|h|if|ki|l|o|p|pg|q|r|so|sp|t|u|vc|vs|w|x|y|z)_/i;

function normalizeWidth(value) {
  const width = Number.parseInt(value, 10);
  return Number.isFinite(width) && width > 0 ? width : null;
}

function replaceExtension(url, extension) {
  const [path, query = ''] = url.split('?');
  const nextPath = /\.[a-z0-9]+$/i.test(path)
    ? path.replace(/\.[a-z0-9]+$/i, extension)
    : `${path}${extension}`;
  return query ? `${nextPath}?${query}` : nextPath;
}

function insertCloudinaryTransformation(url, transformation) {
  const uploadMarker = '/upload/';
  const markerIndex = url.indexOf(uploadMarker);

  if (markerIndex === -1 || !transformation) return url;

  const insertionPoint = markerIndex + uploadMarker.length;
  const deliveryPath = url.slice(insertionPoint);

  // Signed delivery URLs cannot be changed without regenerating the signature.
  if (deliveryPath.startsWith('s--')) return url;

  const pathSegments = deliveryPath.split('/');
  let transformationCount = 0;

  while (transformationCount < pathSegments.length) {
    const segmentParts = pathSegments[transformationCount].split(',');
    const isTransformation = segmentParts.every((part) => (
      part.startsWith('$') || CLOUDINARY_TRANSFORMATION_PARAMETER.test(part)
    ));

    if (!isTransformation) break;
    transformationCount += 1;
  }

  pathSegments.splice(transformationCount, 0, transformation);
  return `${url.slice(0, insertionPoint)}${pathSegments.join('/')}`;
}

export function resolveMediaUrl(source, apiBaseUrl = API_BASE_URL) {
  if (typeof source !== 'string') return '';

  const url = source.trim();
  if (!url) return '';

  if (/^(https?:)?\/\//i.test(url) || /^(data|blob):/i.test(url)) {
    return url;
  }

  return `${apiBaseUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}

export function isCloudinaryMedia(source) {
  if (typeof source !== 'string' || !source.includes('/upload/')) return false;

  try {
    const hostname = new URL(source, 'https://local.invalid').hostname;
    return hostname === 'cloudinary.com' || hostname.endsWith('.cloudinary.com');
  } catch {
    return false;
  }
}

export function getOptimizedImageUrl(source, options = {}) {
  if (!source || !isCloudinaryMedia(source)) return source || '';

  const {
    width,
    height,
    crop = 'limit',
    gravity,
    format = 'auto',
    quality = 'auto',
    dpr,
  } = options;

  const normalizedWidth = normalizeWidth(width);
  const normalizedHeight = normalizeWidth(height);
  const transformations = [
    format && `f_${format}`,
    quality && `q_${quality}`,
    crop && `c_${crop}`,
    gravity && `g_${gravity}`,
    normalizedWidth && `w_${normalizedWidth}`,
    normalizedHeight && `h_${normalizedHeight}`,
    dpr && `dpr_${dpr}`,
  ].filter(Boolean);

  return insertCloudinaryTransformation(source, transformations.join(','));
}

export function getCloudinaryVideoThumbnailUrl(source, options = {}) {
  if (!source || !isCloudinaryMedia(source)) return source || '';

  const {
    width = 600,
    height = width,
    crop = 'fill',
    gravity = 'auto',
    format = 'auto',
    quality = 'auto',
    startOffset = 0.5,
  } = options;

  const transformation = [
    `so_${startOffset}`,
    format && `f_${format}`,
    quality && `q_${quality}`,
    crop && `c_${crop}`,
    gravity && `g_${gravity}`,
    normalizeWidth(width) && `w_${normalizeWidth(width)}`,
    normalizeWidth(height) && `h_${normalizeWidth(height)}`,
  ].filter(Boolean).join(',');

  return replaceExtension(
    insertCloudinaryTransformation(source, transformation),
    '.jpg',
  );
}

export function getCompatibleVideoUrl(source) {
  if (!source || !isCloudinaryMedia(source)) return source || '';

  return replaceExtension(
    insertCloudinaryTransformation(source, 'f_mp4,q_auto'),
    '.mp4',
  );
}

export function getOptimizedAudioUrl(source) {
  if (!source || !isCloudinaryMedia(source)) return source || '';

  return insertCloudinaryTransformation(source, 'f_auto,q_auto');
}

export function buildImageSrcSet(source, widths = DEFAULT_IMAGE_WIDTHS, options = {}) {
  if (!source || !isCloudinaryMedia(source)) return undefined;

  const uniqueWidths = [...new Set(widths.map(normalizeWidth).filter(Boolean))]
    .sort((a, b) => a - b);

  if (uniqueWidths.length === 0) return undefined;

  return uniqueWidths.map((width) => {
    const transformedUrl = options.videoThumbnail
      ? getCloudinaryVideoThumbnailUrl(source, { ...options, width, height: options.height || width })
      : getOptimizedImageUrl(source, { ...options, width });

    return `${transformedUrl} ${width}w`;
  }).join(', ');
}

export function getResponsiveImageUrl(source, widths = DEFAULT_IMAGE_WIDTHS, options = {}) {
  if (!source) return '';

  const normalizedWidths = widths.map(normalizeWidth).filter(Boolean);
  const targetWidth = normalizedWidths.length > 0 ? Math.max(...normalizedWidths) : undefined;

  return options.videoThumbnail
    ? getCloudinaryVideoThumbnailUrl(source, {
        ...options,
        width: targetWidth,
        height: options.height || targetWidth,
      })
    : getOptimizedImageUrl(source, { ...options, width: targetWidth });
}
