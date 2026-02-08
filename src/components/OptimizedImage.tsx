// Composant Image optimisé avec loading progressif
import { Component, createSignal } from 'solid-js';
import './OptimizedImage.css';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string; // Support custom class
}

export const OptimizedImage: Component<OptimizedImageProps> = (props) => {
  const [loaded, setLoaded] = createSignal(false);
  const [error, setError] = createSignal(false);

  // Générer srcset pour responsive
  // Note: This logic assumes a specific naming convention. 
  // If the backend doesn't support this, we might need to adjust or make it optional.
  // For now, implementing as per prompt specs.
  const srcset = () => {
    if (!props.src) return '';
    // Basic check to avoid error on creating srcset from data URIs or blobs if any
    if (props.src.startsWith('data:') || props.src.startsWith('blob:')) return '';

    const base = props.src.replace(/\.(jpg|webp|png|jpeg)/, '');
    // This is a naive implementation assuming these files exist. 
    // In a real scenario, the API should provide specific URLs for different sizes.
    // However, following the prompt's instruction:
    return `${base}-180w.webp 180w, ${base}-360w.webp 360w, ${base}-720w.webp 720w`;
  };

  return (
    <div class={`image-container ${props.className || ''}`} classList={{ loaded: loaded(), error: error() }}>
      {!loaded() && !error() && <div class="image-placeholder shimmer" />}
      <img
        src={props.src}
        srcset={srcset()}
        sizes="(max-width: 600px) 180px, (max-width: 1200px) 360px, 720px"
        alt={props.alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        classList={{ hidden: !loaded() && !error() }}
      />
      {error() && <div class="image-error"><i class="ri-error-warning-line"></i></div>}
    </div>
  );
};
