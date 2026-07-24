# Remembering Filter State on Pagination in SPAs

## The Principle

When developing extensions or scripts for Single-Page Applications (SPAs) like Gmail, always assume that any DOM element can be destroyed and recreated during user navigation (e.g., pagination, search, or view changes). 

Logic that attaches listeners or observers to these dynamic elements **must be re-run** after the content changes. To ensure stability, this attachment logic should be **idempotent** (i.e., safe to run multiple times without creating duplicate listeners or causing side effects).

## Practical Application

Instead of attaching an observer once and hoping the element persists, the robust pattern is:

1.  **Create an idempotent attachment function:** This function should first check if a listener/observer is already attached to the target element (e.g., by checking for a `data-observer-attached="true"` attribute) before attaching a new one.
2.  **Use a higher-level, stable observer:** Have a persistent observer on a stable parent element (like `document.body`).
3.  **Trigger re-attachment:** When the stable observer detects a significant DOM change, it should call the idempotent attachment function. This ensures that if the target element was destroyed and recreated, the listener/observer is promptly re-attached to the new element.
