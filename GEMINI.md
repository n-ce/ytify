This is an audio streaming application, the dev branch is used for rehauling the entire application to use client side rendering with solid js with reactive programming but there are many errors due to clash between the old code because it was different way altogether basically hand written HTML with imperative JS handling and uhtml components rendering in an islands fashion.
So we are starting from the top down.
index.html is done
index.tsx is being continuously changed to adapt to needs as we scale the reactive principles and convert the rest of the code.
~~The developer is seemingly challenged by the reactive principles and get's anxious on loosing direct DOM control.~~

**Refactor Progress & Developer Attitude Update:**

The developer has clarified that they are now confident and proficient with the reactive, store-based architecture, seeing it as the 'heart of the codebase'. The initial anxiety about losing DOM control is no longer relevant.

A custom, state-driven routing system has been intentionally implemented to meet unique application requirements, and standard solutions like `solid-router` have been evaluated and rejected as unsuitable.

The current major task is to refactor the remaining parts of the old codebase (`src/lib/modules`, `src/lib/utils/library.ts`) to integrate with the new reactive patterns. The developer has explicitly requested that this code be refactored, not deleted, to preserve its functionality.

The developer prefers a methodical, step-by-step approach, analyzing build errors and existing code before approving any changes.
