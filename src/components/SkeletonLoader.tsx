// SkeletonLoader.tsx - Loading states fluides
import { Component, For } from 'solid-js';
import './SkeletonLoader.css';

interface SkeletonProps {
  type: 'card' | 'list' | 'player' | 'text';
  count?: number;
}

export const SkeletonLoader: Component<SkeletonProps> = (props) => {
  const count = props.count || 1;

  return (
    <div class={`skeleton-wrapper skeleton-${props.type}`}>
      <For each={Array(count).fill(0)}>
        {() => (
          <div class="skeleton-item">
            {props.type === 'card' && (
              <>
                <div class="skeleton-image shimmer" />
                <div class="skeleton-text shimmer" style="width: 80%" />
                <div class="skeleton-text shimmer" style="width: 60%" />
              </>
            )}
            {props.type === 'list' && (
              <>
                <div class="skeleton-thumb shimmer" />
                <div class="skeleton-content">
                  <div class="skeleton-text shimmer" style="width: 70%" />
                  <div class="skeleton-text shimmer" style="width: 40%" />
                </div>
              </>
            )}
            {props.type === 'player' && (
              <>
                <div class="skeleton-artwork shimmer" />
                <div class="skeleton-controls shimmer" />
              </>
            )}
          </div>
        )}
      </For>
    </div>
  );
};
