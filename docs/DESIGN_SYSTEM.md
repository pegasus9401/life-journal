# Design system

## Experience direction

Life Journal is minimal, premium, warm, calm, and timeless. It borrows discipline—not visual copies—from Apple, Arc, Airbnb, Linear, Apple Journal, Polarsteps, and Readwise.

## Foundations

- **Color:** warm paper surfaces, deep botanical ink, restrained sage action color, and accessible semantic colors. Pure white/black are used sparingly.
- **Typography:** an expressive editorial serif for memories and titles; a quiet, highly legible sans-serif for controls and metadata.
- **Spacing:** an 8px base rhythm with generous composition spacing. Density is a deliberate exception.
- **Shape:** soft but mature radii; pills only for compact actions or status.
- **Elevation:** subtle borders and broad, low-contrast shadows. Depth communicates hierarchy, never decoration alone.
- **Motion:** 160–300ms, ease-out, transform/opacity-first, and fully respectful of reduced-motion preferences.

## Component principles

- Prefer semantic HTML and native behavior.
- Every control has visible hover, focus, disabled, pending, success, and error states.
- Touch targets are at least 44×44px.
- Cards represent a coherent memory or action, not arbitrary containers.
- Icons require purpose; labels remain when meaning is not universal.
- Empty states invite one next action without guilt or urgency.

## Responsive behavior

Mobile is the primary capture environment. Desktop expands the composition rather than increasing information density. Essential flows work with one hand, variable text size, keyboard navigation, and screen readers.

## Tokens

Design values begin as CSS custom properties and become shared primitives only after repeated use. Feature CSS may consume tokens but must not redefine the brand foundation.
