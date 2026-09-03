import fallbackAvatarImg from '../assets/avatar.png';
import fallbackAvatarAvif from '../assets/avatar.avif';
import fallbackAvatarWebp from '../assets/avatar.webp';
import OptimizedImage from './OptimizedImage';

export default function AdminAvatar({
  avatarUrl,
  alt = "Vũ Đức Nam",
  size = 32,
  className = "w-full h-full object-cover",
  loading = "lazy"
}) {
  const hasCustomAvatar = Boolean(avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim());
  const src = hasCustomAvatar ? avatarUrl.trim() : fallbackAvatarImg;

  return (
    <OptimizedImage
      src={src}
      avifSrc={!hasCustomAvatar ? fallbackAvatarAvif : undefined}
      webpSrc={!hasCustomAvatar ? fallbackAvatarWebp : undefined}
      resolveSource={hasCustomAvatar}
      fallbackSrc={fallbackAvatarImg}
      alt={alt}
      widths={[size, size * 2]}
      sizes={`${size}px`}
      className={className}
      loading={loading}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = fallbackAvatarImg;
      }}
    />
  );
}
