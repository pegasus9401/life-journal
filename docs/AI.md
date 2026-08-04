# AI in Travel Journal

AI helps a person rediscover and shape their own memories. It is not the author of their life and does not invent facts.

## Phase 1 responsibilities

- Draft daily stories from selected moments, places, and photos.
- Draft trip summaries and travel-book chapters.
- Suggest likely places for confirmation.
- Group photos and suggest highlights without deleting or hiding originals.

## Product rules

- The user explicitly requests generation and sees what sources are used.
- Generated text is clearly labeled, editable, and saved as a new version.
- Originals are immutable from AI workflows.
- Uncertain facts are omitted or surfaced as questions, never presented confidently.
- Private content is sent only to approved providers under documented retention terms.
- A complete non-AI journal remains usable if providers fail or the user opts out.

## Technical design

AI access will sit behind a provider-independent service interface. Each generation stores scope, source IDs and source-version snapshot, prompt version, model/provider, timestamps, status, user edits, and token/cost metadata where available. Long jobs run asynchronously with idempotency keys and retry-safe state transitions.

## Evaluation

Before release, a curated synthetic travel set evaluates factual grounding, tone preservation, chronology, unwanted invention, privacy leakage, and output consistency. Human review is required for book-quality output.

## Deferred decisions

Provider, model, embeddings, and image-analysis services are selected only when the relevant feature is designed. No AI dependency belongs in the foundation bundle.
