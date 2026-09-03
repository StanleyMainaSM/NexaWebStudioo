# Avelixa World-Class Website Template Library / Template Studio Upgrade — Design Specification

## Goal

Upgrade Avelixa's five existing DB-backed Website Creation templates into complete, premium demonstration websites that Connectors can confidently show prospective clients, while preserving the existing Creation Project → WebsiteSpecification → Template → Generator → Generated Artifact → Preview → Publishing Boundary architecture.

## Product boundary

This milestone builds exceptional templates and the Template Studio presentation experience. It does **not** build the future customer website-generation machine.

### In scope

- Five existing template identities and their visual identities.
- Rich deterministic demonstration content.
- Existing WebsiteSpecification content model and generator integration.
- Existing WebsiteSections and WebsitePreviewRenderer.
- Additional reusable section types only where required for meaningful template completeness.
- Template-specific layouts, typography, spacing, imagery treatment, cards, navigation, CTAs, and restrained motion.
- Stable bundled/local demo imagery using existing repository asset conventions where possible.
- Desktop, tablet, and mobile presentation.
- Template and saved-artifact regression coverage.

### Explicitly out of scope

- AI-generated customer websites.
- Business research or automatic content discovery.
- Automatic image discovery for customer sites.
- Publishing implementation or publishing migrations.
- Production deployment.
- New authentication/authorization systems.
- RLS weakening, service-role frontend access, or security bypasses.
- Duplicate project/specification/template/rendering systems.
- Real WhatsApp, maps, payments, bookings, CRM, social posting, or other customer integrations.

## Existing architecture to preserve

The existing flow remains authoritative:

`Creation Project → WebsiteSpecification → Website Template → Generator → Generated Artifact → Preview → Publishing Boundary → Published Artifact → Public Delivery`

Existing saved-artifact behavior is a protected boundary. Opening an existing project in Template Studio must load its persisted business information/specification/template and must not create or regenerate a project merely because the editor was opened. Preview must continue reading the persisted generated artifact and must not trigger generation.

## Five template identities

| Identity | Existing slug | Existing visual style | Design language |
|---|---|---|---|
| Modern Business | `modern-business` | `editorial-modern` | Sophisticated, contemporary, confident business/editorial presentation. |
| Premium Minimal | `premium-minimal` | `premium-minimal` | Luxury, restrained, typography-led, spacious editorial presentation. |
| Local Commerce | `local-commerce` | `warm-commerce` | Welcoming, practical, energetic local commerce and service presentation. |
| Creative Studio | `creative-studio` | `creative-bold` | Expressive, bold, visual, portfolio-led creative presentation. |
| Trusted Community | `trusted-community` | `trusted-community` | Warm, human, trustworthy, accessible community/service presentation. |

Do not rename, delete, duplicate, or replace these identities.

## Demonstration-content contract

Template demo content is intentional fictional/sample content used to demonstrate quality. It must never be represented as real customer-provided information.

Demo content must:

- contain realistic industry-specific names, headlines, descriptions, services/products, testimonials, CTAs, and supporting copy;
- avoid Lorem ipsum;
- avoid generic instructional placeholders such as `Add your content`, `Your business name`, `Featured product`, or similar scaffolding copy;
- be deterministic so tests and previews are repeatable;
- be rich enough that a template reads as a complete website without user input;
- remain replaceable by the later Website Generation Machine.

When an existing Creation Project has a persisted specification, that persisted specification remains authoritative. Demo content must not silently overwrite customer/project content.

## Section strategy

Retain the existing shared section architecture. Extend the section vocabulary only when a section materially improves one or more templates. Candidate reusable sections include:

- announcement
- stats
- story
- values
- process
- portfolio/case studies
- team
- offers
- hours
- social
- final CTA

Existing sections remain available: navigation, hero, about, services, products, gallery, testimonials, pricing, FAQ, contact, location, and footer.

Templates should use different section compositions rather than mechanically rendering every possible section.

### Modern Business composition

Navigation → Hero → Stats → About/Story → Services → Process → Case Studies/Portfolio → Testimonials → Team → Final CTA → Contact → Footer.

### Premium Minimal composition

Navigation → Hero → Story → Services → Editorial Gallery → Values → Testimonials → Contact → Footer.

### Local Commerce composition

Navigation → Hero → Offers → Products/Services → Gallery → Hours → Location → Testimonials → WhatsApp/contact CTA → Contact → Footer.

### Creative Studio composition

Navigation → Hero → Selected Work → About → Services → Portfolio/Case Studies → Testimonials → Studio CTA → Contact → Footer.

### Trusted Community composition

Navigation → Hero → About → Programs/Services → Impact/Stats → Testimonials → FAQ → Location → Contact → Final CTA → Footer.

The exact final composition may be adjusted to match the existing WebsiteSectionId/type constraints after inspection, but every adjustment must preserve the shared specification/rendering model.

## Visual presentation contract

### Modern Business

- Editorial hero with strong hierarchy.
- Sophisticated data/stat treatment.
- Structured service/process presentation.
- Case-study storytelling.
- Confident restrained color system.
- Premium but practical interaction states.

### Premium Minimal

- Large editorial typography.
- Generous whitespace.
- Thin rules and restrained surfaces.
- Refined imagery.
- Minimal controls and understated CTA treatment.
- No unnecessary visual density.

### Local Commerce

- Warm palette/surfaces.
- Strong product/service cards.
- Offers and local trust signals.
- Prominent contact/WhatsApp presentation.
- Opening hours and location information.
- Friendly, commercially useful hierarchy.

### Creative Studio

- Dark expressive canvas.
- Oversized typography.
- Layered/asymmetric imagery.
- Strong portfolio treatment.
- Sophisticated hover states and restrained motion.
- Visually bold without sacrificing usability.

### Trusted Community

- Warm accessible surfaces.
- Human-centered imagery.
- Clear readable hierarchy.
- Programs/services and impact presentation.
- Testimonials and FAQ.
- Location/contact/trust signals.
- Accessibility-conscious contrast and interaction sizing.

## Imagery contract

- Prefer existing bundled/public repository assets.
- Add new curated demo assets only when necessary and through a deterministic repository convention.
- Do not scrape sites at runtime.
- Do not make rendering depend on arbitrary remote image services.
- Do not hardcode real user/client credentials or private URLs.
- Every image used in a template must have sensible alt behavior and stable rendering behavior.

## Interaction contract

Implement appropriate visual behavior using the existing frontend stack:

- responsive mobile navigation;
- button hover/focus/active states;
- card/image hover treatments;
- smooth transitions;
- restrained reveal motion where compatible with the existing renderer;
- active navigation states where meaningful;
- gallery/portfolio interactions supported by the existing section architecture;
- accessible keyboard/focus behavior.

Demo CTAs are presentation-only. They must not accidentally initiate real customer integrations.

## Responsive contract

Desktop, tablet, and mobile are first-class targets.

Verify:

- navigation/mobile menu;
- hero composition and typography;
- buttons and CTA wrapping;
- cards/grids;
- image aspect ratios and cropping;
- testimonials;
- galleries/portfolio layouts;
- information-heavy sections such as hours/location;
- footer;
- scrolling and section anchors;
- no horizontal overflow.

## Preview contract

The existing persisted generated preview remains the source of truth. The preview must:

- show the complete website in an immersive viewport;
- allow full-page scrolling;
- not require regeneration;
- not require re-entering business information;
- preserve the generated artifact identity;
- retain desktop/tablet/mobile controls;
- retain the existing public-preview boundary.

Any viewport sizing improvements must be presentation-only and must not alter artifact persistence or generation semantics.

## Testing contract

Maintain existing tests and add regression coverage for:

- all five template identities/slugs/styles;
- template-specific section compositions;
- deterministic demo content;
- absence of placeholder/Lorem Ipsum copy;
- renderer support for every new section;
- template-specific presentation hooks;
- responsive markup/classes where practical through source-contract tests;
- saved-artifact/editor route behavior;
- persisted preview remaining artifact-backed and generation-free.

Required commands after implementation:

```powershell
npm run typecheck
npm run build
```

Also run every relevant Website Creation/template/saved-artifact script exposed by `package.json`.

## Security and protected systems

Do not modify authentication, authorization, RLS, generation security, existing portal systems, finance, messaging, notifications, leads, connector commissions, or production deployment unless a directly demonstrated dependency requires a minimal change. Any such dependency must be explained before implementation.

Do not use service-role credentials in frontend code. Do not bypass RLS or protected triggers. Do not reset or delete Supabase data.

## Git/change-management contract

Work only on `avelixa-current-work`.

Preserve unrelated working-tree changes, including `package-lock.json` or other user changes. Never use `git reset --hard` or discard unrelated modifications.

Review the final diff and commit the implementation with a clear message. Do not deploy.
