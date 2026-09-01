# Avelixa Website Publishing Foundation

## Goal
Establish a secure application-level publishing boundary for existing generated Website Creation artifacts without introducing another specification, generator, template registry, or renderer.

## Architectural boundary
`Creation Project -> WebsiteSpecification -> existing generator -> WebsiteGenerationOutput -> persisted generated artifact -> publishing boundary -> published artifact -> existing GeneratedWebsitePreview -> WebsitePreviewRenderer -> WebsiteSections`.

`WebsiteSpecification` remains the authoritative current content model. The persisted generated artifact is a versioned snapshot used for historical output and addressability. Publishing changes artifact lifecycle metadata only.

## Persistence
Use the existing `creation_generated_website_outputs` table and `WebsiteOutputStatus` vocabulary (`draft`, `generated`, `published`). Add only publication metadata required to represent publication safely, preferably `published_at`, plus a database-enforced single-current-publication invariant if required by the existing schema. Do not duplicate specification content beyond the existing artifact snapshot already persisted for historical output.

## Publishing boundary
Add one authenticated, authorized RPC/service boundary. It must verify the caller can access the Creation Project, verify artifact ownership, verify the artifact is a successful generated artifact, and recompute/compare the artifact specification identity against the current normalized project specification and selected template. Stale artifacts are rejected. A successful publish transitions the artifact to `published` and records publication time. Re-publishing the same artifact is idempotent.

Publishing a newer artifact must preserve historical artifacts and leave exactly one published artifact for the project. The transition is transactional so a failed publish cannot change the prior published artifact.

## Preview
Preserve `/preview/:token` and `/preview/:token/:outputIdentity`. The existing token-gated public preview RPC remains the authorization boundary. Default preview resolves the latest successful generated artifact according to the existing project pointer; specific preview resolves the exact artifact. Published artifacts remain rendered through the existing renderer. No public hosting/deployment infrastructure is introduced.

## Studio
Extend the existing Studio only enough to expose lifecycle-aware actions: Generate/Regenerate, Publish when current, and a published indicator. Stale artifacts cannot be published. Generation continues to use the existing `consume_creation_generation` boundary. No client-side arbitrary artifact status updates are allowed.

## Failure safety
Failed generation preserves the last successful artifact and publication state. Failed publication preserves the previous published artifact and leaves the attempted artifact generated. Editing the current specification never invalidates or deletes historical artifacts; it only makes the project require regeneration.

## Security
Artifact writes occur only through authenticated server-side boundaries. Existing Creation Project authorization/RLS remains authoritative. Anonymous clients may only read intentionally public previews through the existing token-gated RPC. No permissive artifact write policies are introduced.

## Validation
Add focused publishing tests covering authorization, valid publication, stale protection, historical versions, failed generation/publish preservation, idempotency, preview resolution, and public-preview disablement. Preserve all existing Website Creation and application regression coverage. Run typecheck and build. No production deployment or production database change is permitted.
