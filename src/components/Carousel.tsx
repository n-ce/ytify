// Carousel.tsx - Style witv.team
import { Component, For, createSignal, onMount, JSX } from 'solid-js';
import './Carousel.css';

interface CarouselProps {
  title: string;
  items: any[];
  renderItem: (item: any) => any;
  headerContent?: JSX.Element;
}

export const Carousel: Component<CarouselProps> = (props) => {
  let containerRef!: HTMLDivElement;
  const [canScrollLeft, setCanScrollLeft] = createSignal(false);
  const [canScrollRight, setCanScrollRight] = createSignal(true);
  const [isDragging, setIsDragging] = createSignal(false);

  const scroll = (direction: 'left' | 'right') => {
    const scrollAmount = containerRef.clientWidth * 0.8;
    containerRef.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const updateScrollState = () => {
    setCanScrollLeft(containerRef.scrollLeft > 0);
    setCanScrollRight(
      containerRef.scrollLeft < containerRef.scrollWidth - containerRef.clientWidth - 10
    );
  };

  // Touch/drag handling pour fluidité
  let startX = 0, scrollStart = 0;

  const onDragStart = (e: MouseEvent | TouchEvent) => {
    setIsDragging(true);
    startX = 'touches' in e ? e.touches[0].pageX : e.pageX;
    scrollStart = containerRef.scrollLeft;
    containerRef.style.scrollSnapType = 'none';
  };

  const onDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging()) return;
    const x = 'touches' in e ? e.touches[0].pageX : e.pageX;
    const delta = (startX - x) * 1.5; // Multiplicateur pour fluidité
    containerRef.scrollLeft = scrollStart + delta;
  };

  const onDragEnd = () => {
    setIsDragging(false);
    containerRef.style.scrollSnapType = 'x mandatory';
    updateScrollState();
  };

  onMount(() => {
    containerRef.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();
  });

  return (
    <section class="carousel">
      <header class="carousel-header">
        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
          <h2>{props.title}</h2>
          {props.headerContent}
        </div>
        <div class="carousel-nav">
          <button
            class="scroll-btn"
            disabled={!canScrollLeft()}
            onClick={() => scroll('left')}
            aria-label="Précédent"
          >
            <i class="ri-arrow-left-s-line" />
          </button>
          <button
            class="scroll-btn"
            disabled={!canScrollRight()}
            onClick={() => scroll('right')}
            aria-label="Suivant"
          >
            <i class="ri-arrow-right-s-line" />
          </button>
        </div>
      </header>

      <div
        ref={containerRef!}
        class="carousel-track"
        classList={{ dragging: isDragging() }}
        onMouseDown={onDragStart}
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={onDragStart}
        onTouchMove={onDragMove}
        onTouchEnd={onDragEnd}
      >
        <For each={props.items}>
          {(item) => props.renderItem(item)}
        </For>
      </div>
    </section>
  );
};
