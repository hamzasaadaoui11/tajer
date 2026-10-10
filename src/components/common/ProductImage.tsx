import React, { useEffect, useState } from 'react';
import { imageService } from '../../services/imageService';

interface ProductImageProps {
  productId?: string;
  productName: string;
  initialImageUrl?: string;
  className?: string;
  fallbackIcon?: string;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  productId,
  productName,
  initialImageUrl,
  className = 'w-full h-24 object-cover rounded-xl',
  fallbackIcon = '📦',
  onClick,
  title,
}) => {
  const [imageUrl, setImageUrl] = useState<string>(() => {
    return imageService.getImage(productId, initialImageUrl);
  });

  useEffect(() => {
    // Sync if props changed
    const current = imageService.getImage(productId, initialImageUrl);
    setImageUrl(current);

    // Subscribe to image service updates
    const unsub = imageService.subscribe(() => {
      const updated = imageService.getImage(productId, initialImageUrl);
      setImageUrl(prev => (prev !== updated ? updated : prev));
    });

    return unsub;
  }, [productId, initialImageUrl]);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={productName}
        loading="lazy"
        decoding="async"
        className={className}
        onClick={onClick}
        title={title}
      />
    );
  }

  return (
    <div
      className={`${className} bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-lg select-none`}
      onClick={onClick}
      title={title}
    >
      {fallbackIcon}
    </div>
  );
};
