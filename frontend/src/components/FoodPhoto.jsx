import { useState } from 'react';

export default function FoodPhoto({ src, alt, priority = false }) {
  const [broken, setBroken] = useState(null);
  return src && broken !== src
    ? <img src={src} alt={alt} width="640" height="480" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} onError={() => setBroken(src)}/>
    : <div className="food-photo-placeholder" role="img" aria-label={`${alt}. Фото набора пока нет`}><span aria-hidden="true">öbal</span><small>Фото набора пока нет</small></div>;
}
