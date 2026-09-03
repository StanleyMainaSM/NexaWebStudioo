# World-Class Website Template Library / Template Studio Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Avelixa's five existing Website Creation templates into complete, premium, deterministic demo websites while preserving the existing WebsiteSpecification, generator, generated-artifact, preview, security, and persistence architecture.

**Architecture:** Keep the existing DB-backed five-template system, WebsiteSpecification, generator, WebsiteSections, and WebsitePreviewRenderer. Improve the shared specification/content model and shared renderer with reusable sections, deterministic demo content, curated stable assets, and template-specific presentation rather than creating five independent renderers or a second template engine. Existing project specifications remain authoritative and persisted generated previews remain artifact-backed.

**Tech Stack:** React + TypeScript + Vite + Tailwind CSS + Lucide React + Supabase + existing Website Creation types/generator/editor/renderer/test conventions.

**Spec:** `docs/superpowers/specs/2026-09-03-website-template-library-upgrade.md`

## Global Constraints

- Work only on `avelixa-current-work`.
- Preserve the existing Creation Project → WebsiteSpecification → Template → Generator → Generated Artifact → Preview → Publishing Boundary architecture.
- Keep the five identities: `modern-business`, `premium-minimal`, `local-commerce`, `creative-studio`, `trusted-community`.
- Demo content must be deterministic, realistic, industry-specific, and free of placeholder/Lorem Ipsum copy.
- Existing persisted project specifications remain authoritative and must not be silently replaced by demo content.
- Prefer bundled/local stable imagery; never introduce arbitrary runtime image scraping/dependencies.
- Do not build the future AI customer website-generation machine.
- Do not implement publishing or apply publishing migrations.
- Do not modify authentication, authorization, RLS, generation security, or unrelated portals unless a demonstrated dependency requires a minimal change and that dependency is documented.
- Do not use service-role credentials in frontend code or bypass protected database controls.
- Preserve unrelated working-tree changes; never use `git reset --hard` or discard user changes.
- Do not deploy to production or Vercel.
- Required final verification: `npm run typecheck`, `npm run build`, all relevant Website Creation tests, and actual browser QA when a browser runtime is available.

---

### Task 1: Establish repository baseline and map the existing template implementation

**Files:**
- Read: `src/lib/websiteCreation/types.ts`
- Read: `src/lib/websiteCreation/generator.ts`
- Read: `src/lib/websiteCreation/editor.ts`
- Read: `src/lib/websiteCreation/presentation.ts`
- Read: `src/components/websiteCreation/WebsiteSections.tsx`
- Read: `src/components/websiteCreation/WebsitePreviewRenderer.tsx`
- Read: `src/pages/WebsiteCreationStudio.tsx`
- Read: `src/pages/CreationGeneratedPreview.tsx`
- Read: `src/App.tsx`
- Read: `tests/websiteCreationTemplates.test.mjs`
- Read: `tests/websiteCreationSavedArtifactFlow.test.mjs`
- Read: `package.json`
- Read: relevant `supabase/migrations/*website_creation*`
- Inspect: `public/` image/static assets

**Interfaces:**
- Consumes: current repository state and current `WebsiteSpecification`/template implementation.
- Produces: an implementation map identifying exact existing types, section IDs, generator behavior, template metadata, asset conventions, test scripts, and protected saved-artifact boundaries.

- [ ] **Step 1: Inspect the working tree before any source modification.**

Run:

```powershell
git status --short
```

Record all pre-existing modifications. Do not stage, revert, or overwrite them.

- [ ] **Step 2: Inspect the current Website Creation source and test surface.**

Run:

```powershell
Get-ChildItem src\lib\websiteCreation
Get-ChildItem src\components\websiteCreation
Get-ChildItem tests | Where-Object { $_.Name -match 'websiteCreation|Template' }
Get-Content package.json
```

Read the exact files listed above before deciding whether each needs modification.

- [ ] **Step 3: Inventory existing static imagery.**

Run:

```powershell
Get-ChildItem public -Recurse -File | Where-Object { $_.Extension -match '\.(png|jpg|jpeg|webp|avif|svg)$' } | Select-Object FullName,Length
```

Identify reusable stable assets and their existing conventions.

- [ ] **Step 4: Record the exact current section/type boundaries.**

Use the source of `WebsiteSectionId`, `WebsiteSpecification`, template metadata, and generator functions to document what can be extended without creating a parallel system.

- [ ] **Step 5: Run the existing relevant tests before changing behavior.**

Run the exact Website Creation/template/saved-artifact scripts exposed by the current `package.json`. Record their actual names and baseline results.

- [ ] **Step 6: Do not commit this reconnaissance separately.**

The task ends with a written implementation map available to the implementing agent; no source behavior changes are permitted in this task.

---

### Task 2: Extend the shared WebsiteSpecification section vocabulary safely

**Files:**
- Modify: `src/lib/websiteCreation/types.ts`
- Modify: `src/lib/websiteCreation/editor.ts` only if its section helpers require the new IDs
- Modify: `src/components/websiteCreation/WebsiteSections.tsx` only enough to establish typed section entry points
- Test: `tests/websiteCreationTemplates.test.mjs` or a focused new template-spec test

**Interfaces:**
- Consumes: exact `WebsiteSectionId`, `WebsiteSpecification`, section-content conventions discovered in Task 1.
- Produces: typed reusable section IDs and content shapes compatible with the existing specification/editor/renderer pipeline.

- [ ] **Step 1: Add failing source-contract assertions for the approved reusable sections.**

Add assertions that the chosen final section IDs exist in the shared type and are represented by renderer entry points. Use only sections justified by the five compositions; do not add speculative IDs.

- [ ] **Step 2: Run the focused template test and verify failure.**

Run the relevant test script from `package.json`.

Expected: FAIL because the new section IDs/renderer entries are not yet present.

- [ ] **Step 3: Extend `WebsiteSectionId` with the minimal approved section set.**

Use literal IDs consistently across the specification, editor and renderer. Keep existing IDs unchanged. Prefer sections that can serve multiple templates, such as `stats`, `process`, `portfolio`, `team`, `offers`, `hours`, `story`, `values`, `finalCta`, and `social`, only where Task 1 confirms they fit the existing model.

- [ ] **Step 4: Add corresponding typed content access patterns without creating a second specification.**

Use the existing `spec.content[section]` model. Do not introduce a separate template-content database or parallel website schema.

- [ ] **Step 5: Run typecheck.**

```powershell
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Run the focused template test and verify it passes.**

Expected: PASS.

- [ ] **Step 7: Commit the section-vocabulary change.**

```powershell
git add src/lib/websiteCreation/types.ts src/lib/websiteCreation/editor.ts src/components/websiteCreation/WebsiteSections.tsx tests/websiteCreationTemplates.test.mjs
git commit -m "feat: extend website template sections"
```

Only stage files actually changed for this task; preserve unrelated modifications.

---

### Task 3: Build deterministic, rich demonstration specifications for all five templates

**Files:**
- Modify: `src/lib/websiteCreation/generator.ts`
- Modify: `src/lib/websiteCreation/types.ts` if required for exact content typing
- Test: `tests/websiteCreationTemplates.test.mjs`
- Create: a focused demo-content fixture/module only if the existing generator file would become unreasonably coupled; otherwise keep the implementation in the existing generator architecture

**Interfaces:**
- Consumes: existing `generateWebsiteSpecification`, `generateWebsiteFromSpecification`, template metadata, business information, and the section vocabulary from Task 2.
- Produces: deterministic rich `WebsiteSpecification` demo content for each template style without affecting persisted customer specifications.

- [ ] **Step 1: Write failing assertions for template-specific demo content.**

Assert that each of the five styles produces meaningful non-empty content in the sections appropriate to its composition and that the output contains no Lorem Ipsum or placeholder phrases such as `Add your content`, `Your business name`, `Featured product`, `Customer support`, or equivalent scaffolding copy.

- [ ] **Step 2: Run the template test and verify failure.**

Expected: FAIL for sparse/default generated content.

- [ ] **Step 3: Define deterministic demo-content data inside the existing generator boundary.**

Create explicit, fictional sample content for each style. Examples of content categories:

- Modern Business: positioning, metrics, capabilities, process, case studies, team, testimonials, CTA.
- Premium Minimal: editorial story, refined services, values, gallery, restrained testimonials, elegant CTA.
- Local Commerce: products/services, offers, opening hours, location, local trust signals, gallery, testimonials, contact/WhatsApp presentation.
- Creative Studio: studio positioning, selected work, portfolio projects, creative services, outcomes, testimonials, visual gallery, CTA.
- Trusted Community: mission/story, programs/services, impact figures, testimonials, FAQ, location, contact, final CTA.

All copy must be fictional and commercially believable. Do not use real credentials or real client information.

- [ ] **Step 4: Make demo generation deterministic.**

Use stable literal content and stable asset paths. Do not use `Math.random()`, current timestamps for content, remote search, runtime scraping, or unstable external APIs.

- [ ] **Step 5: Preserve customer-project authority.**

Ensure the new demo defaults are used only when creating a new demonstration/template specification. Existing persisted specifications passed through the editor/generator remain unchanged unless the user explicitly edits them.

- [ ] **Step 6: Run the focused template test.**

Expected: PASS, including deterministic output checks and placeholder-copy rejection.

- [ ] **Step 7: Run typecheck.**

```powershell
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit the deterministic demo-content implementation.**

```powershell
git add src/lib/websiteCreation/generator.ts src/lib/websiteCreation/types.ts tests/websiteCreationTemplates.test.mjs
# Add any newly created focused demo-content module only if it was required.
git commit -m "feat: enrich website template demo content"
```

---

### Task 4: Add stable curated template imagery

**Files:**
- Create/Modify: `public/...` only within the existing repository asset convention discovered in Task 1
- Modify: `src/lib/websiteCreation/generator.ts` or the approved demo-content module to reference stable local asset paths
- Modify: `tests/websiteCreationTemplates.test.mjs`

**Interfaces:**
- Consumes: deterministic template demo specifications from Task 3 and existing public-asset conventions.
- Produces: stable local imagery references with no arbitrary runtime image dependency.

- [ ] **Step 1: Add failing assertions that demo image references are stable repository assets.**

For every image path introduced by the templates, assert it uses the chosen local/public asset convention and is not an arbitrary remote image service URL.

- [ ] **Step 2: Inspect and reuse suitable existing assets first.**

Do not duplicate assets unnecessarily. Map existing images to template purposes where they are visually appropriate.

- [ ] **Step 3: Add only necessary curated demo assets.**

Store them in a clear template-specific asset directory, with stable filenames. Do not add assets containing private data or real customer credentials.

- [ ] **Step 4: Wire the assets into the deterministic demo specifications.**

Ensure hero/gallery/product/portfolio imagery has stable paths and meaningful alt text behavior in the renderer.

- [ ] **Step 5: Run the asset/template test.**

Expected: PASS.

- [ ] **Step 6: Verify no runtime image scraping/dependency was introduced.**

Search the changed code for image-service generation, random URLs, fetches to image providers, or runtime scraping.

- [ ] **Step 7: Commit the asset work.**

```powershell
git add public src/lib/websiteCreation/generator.ts tests/websiteCreationTemplates.test.mjs
# Stage only the actual asset files and changed source files.
git commit -m "feat: add stable website template imagery"
```

---

### Task 5: Upgrade the shared WebsiteSections renderer with complete reusable sections

**Files:**
- Modify: `src/components/websiteCreation/WebsiteSections.tsx`
- Modify: `src/components/websiteCreation/WebsitePreviewRenderer.tsx` if section registration/styles require it
- Test: `tests/websiteCreationTemplates.test.mjs`

**Interfaces:**
- Consumes: typed section IDs/content from Task 2 and deterministic demo specifications from Tasks 3–4.
- Produces: complete reusable React sections that render from `WebsiteSpecification` and remain usable for future customer specifications.

- [ ] **Step 1: Add failing assertions for required reusable section exports.**

Assert that each chosen new section ID maps to a named section renderer and that the renderer still exposes all existing section components.

- [ ] **Step 2: Implement the reusable sections using existing design primitives.**

Add only sections selected in Task 2. Keep sections data-driven from `spec`; do not hardcode a complete page directly inside each template.

- [ ] **Step 3: Make every new section robust to missing optional content.**

Use the existing graceful rendering conventions. Avoid empty placeholder-looking blocks. If optional content is absent, omit that presentation rather than displaying scaffolding language.

- [ ] **Step 4: Add semantic and accessible markup.**

Use headings in sensible hierarchy, buttons/links according to behavior, descriptive image alt text, keyboard-accessible controls, visible focus states, and sufficient contrast.

- [ ] **Step 5: Add responsive layouts for each new section.**

Design mobile-first layouts with explicit breakpoint behavior for grids, image/text splits, cards, statistics, portfolios and dense information blocks.

- [ ] **Step 6: Add restrained interaction states.**

Use CSS transitions/hover/focus treatments that remain lightweight. Do not add a new animation dependency.

- [ ] **Step 7: Register all new sections in `WebsitePreviewRenderer`.**

Keep the existing `sectionMap` architecture. Do not create a second renderer registry.

- [ ] **Step 8: Run typecheck and focused tests.**

```powershell
npm run typecheck
```

Expected: PASS.

Run the relevant template test script.

Expected: PASS.

- [ ] **Step 9: Commit the shared-section renderer upgrade.**

```powershell
git add src/components/websiteCreation/WebsiteSections.tsx src/components/websiteCreation/WebsitePreviewRenderer.tsx tests/websiteCreationTemplates.test.mjs

git commit -m "feat: expand website template section renderer"
```

---

### Task 6: Implement distinctive visual presentation for the five template identities

**Files:**
- Modify: `src/lib/websiteCreation/presentation.ts`
- Modify: `src/components/websiteCreation/WebsiteSections.tsx`
- Modify: `src/components/websiteCreation/WebsitePreviewRenderer.tsx`
- Test: `tests/websiteCreationTemplates.test.mjs`

**Interfaces:**
- Consumes: the existing five `styleKey` values and shared section renderers.
- Produces: materially different visual compositions for the five template identities without five separate rendering engines.

- [ ] **Step 1: Add failing presentation assertions for the five design languages.**

Test for distinctive style hooks/classes/tokens and template-specific section treatment, not merely five different color values.

- [ ] **Step 2: Strengthen `editorial-modern`.**

Implement sophisticated editorial grids, metrics/stat cards, structured services/process, case-study treatment, strong hierarchy, refined surfaces, and confident CTA presentation.

- [ ] **Step 3: Strengthen `premium-minimal`.**

Implement generous whitespace, editorial typography, thin rules, restrained cards, refined image treatment, quiet CTA interactions, and low visual density.

- [ ] **Step 4: Strengthen `warm-commerce`.**

Implement warm surfaces, commercially useful product/service cards, offers, local trust indicators, hours/location presentation, and prominent but tasteful contact/WhatsApp demonstration CTAs.

- [ ] **Step 5: Strengthen `creative-bold`.**

Implement expressive dark presentation, oversized type, asymmetric/layered image composition, portfolio emphasis, strong hover treatments, and restrained motion.

- [ ] **Step 6: Strengthen `trusted-community`.**

Implement warm accessible surfaces, human-centered imagery, programs/services, impact/trust presentation, testimonials, FAQ, and clear information-first CTAs.

- [ ] **Step 7: Ensure navigation, hero, footer and CTA treatments remain style-aware.**

Keep the existing `getWebsiteTemplatePresentation(spec)` mechanism and do not introduce template-specific React page trees.

- [ ] **Step 8: Add reduced-motion-safe behavior.**

Respect `prefers-reduced-motion` for any newly introduced reveal/transition behavior.

- [ ] **Step 9: Run template tests and typecheck.**

Expected: PASS.

- [ ] **Step 10: Commit the visual presentation upgrade.**

```powershell
git add src/lib/websiteCreation/presentation.ts src/components/websiteCreation/WebsiteSections.tsx src/components/websiteCreation/WebsitePreviewRenderer.tsx tests/websiteCreationTemplates.test.mjs
git commit -m "feat: polish five website template identities"
```

---

### Task 7: Align each template's complete section composition

**Files:**
- Modify: `src/lib/websiteCreation/generator.ts` or the demo-content module from Task 3
- Modify: `src/components/websiteCreation/WebsiteSections.tsx` only where composition-specific presentation requires it
- Modify: `tests/websiteCreationTemplates.test.mjs`

**Interfaces:**
- Consumes: five style identities, reusable sections, deterministic demo content.
- Produces: five complete, structurally distinct demonstration websites.

- [ ] **Step 1: Add failing composition assertions.**

Assert the expected major section ordering for each template style, allowing only the exact structural exceptions justified by missing optional content.

- [ ] **Step 2: Implement Modern Business composition.**

Use navigation, hero, stats, about/story, services, process, case studies/portfolio, testimonials, team, final CTA, contact and footer where supported.

- [ ] **Step 3: Implement Premium Minimal composition.**

Use navigation, hero, story, services, editorial gallery, values, testimonials, contact and footer.

- [ ] **Step 4: Implement Local Commerce composition.**

Use navigation, hero, offers, products/services, gallery, hours, location, testimonials, contact/WhatsApp CTA, contact and footer.

- [ ] **Step 5: Implement Creative Studio composition.**

Use navigation, hero, selected work, about, services, portfolio/case studies, testimonials, studio CTA, contact and footer.

- [ ] **Step 6: Implement Trusted Community composition.**

Use navigation, hero, about, programs/services, impact/stats, testimonials, FAQ, location, contact, final CTA and footer.

- [ ] **Step 7: Verify each page reads as a complete website without empty sections.**

No section should contain instructional filler or an obviously unfinished state in the default demo specification.

- [ ] **Step 8: Run focused tests and typecheck.**

Expected: PASS.

- [ ] **Step 9: Commit the composition work.**

```powershell
git add src/lib/websiteCreation/generator.ts src/components/websiteCreation/WebsiteSections.tsx tests/websiteCreationTemplates.test.mjs
git commit -m "feat: complete website template compositions"
```

---

### Task 8: Preserve and improve Template Studio presentation without changing persistence semantics

**Files:**
- Read/Modify only if required: `src/pages/WebsiteCreationStudio.tsx`
- Read/Modify only if required: `src/pages/WebsiteCreationProjects.tsx`
- Read/Modify only if required: `src/pages/CreationGeneratedPreview.tsx`
- Test: `tests/websiteCreationSavedArtifactFlow.test.mjs`

**Interfaces:**
- Consumes: completed template renderer and existing saved-artifact workflow.
- Produces: Studio/preview presentation capable of showcasing richer templates while preserving existing project loading and artifact behavior.

- [ ] **Step 1: Add/confirm regression assertions before changing Studio code.**

Verify:

- `creation-studio/:creationProjectId` remains routed through the existing route component;
- existing project ID is loaded into Studio;
- existing specification is loaded rather than creating a new project;
- `Preview Website` points to the persisted preview route;
- persisted preview reads `creation_generated_website_outputs` and does not invoke generation.

- [ ] **Step 2: Inspect whether the richer renderer is already sufficient for Studio.**

Do not modify Studio if no change is needed.

- [ ] **Step 3: If viewport presentation needs adjustment, make only presentation-layer changes.**

The generated website should occupy the available preview viewport, remain scrollable, and retain desktop/tablet/mobile controls. Do not alter generation RPCs, artifact identity, quota logic, preview-token logic, or publishing behavior.

- [ ] **Step 4: Run saved-artifact regression tests.**

Run the exact script name from `package.json`; currently the known script is:

```powershell
npm run test:website-creation-saved-artifact
```

Expected: PASS.

- [ ] **Step 5: Run typecheck.**

Expected: PASS.

- [ ] **Step 6: Commit only if Studio/preview source actually required changes.**

```powershell
git add src/pages/WebsiteCreationStudio.tsx src/pages/WebsiteCreationProjects.tsx src/pages/CreationGeneratedPreview.tsx tests/websiteCreationSavedArtifactFlow.test.mjs
git commit -m "fix: showcase richer templates in creation preview"
```

Do not create an empty commit if no changes were necessary.

---

### Task 9: Expand template regression coverage and run the complete test matrix

**Files:**
- Modify: `tests/websiteCreationTemplates.test.mjs`
- Modify/Create: focused Website Creation tests only where a behavior is not covered by the existing suite
- Read: `package.json`

**Interfaces:**
- Consumes: completed template implementation.
- Produces: regression coverage proving all five templates remain DB-backed, distinct, complete, deterministic, and compatible with the saved-artifact architecture.

- [ ] **Step 1: Add deterministic snapshot-like source assertions.**

Test that each template style maps to exactly one approved slug and has non-empty expected sections/content categories.

- [ ] **Step 2: Add placeholder-copy rejection.**

Reject common scaffold language including Lorem ipsum and all known generic placeholder strings present in the old implementation.

- [ ] **Step 3: Add asset-stability assertions.**

Reject arbitrary runtime image URLs and ensure template demo imagery uses repository-stable paths.

- [ ] **Step 4: Add renderer coverage assertions.**

Ensure every section ID used by the five demo specifications has a renderer entry in `WebsitePreviewRenderer`.

- [ ] **Step 5: Add saved-artifact preservation assertions if not already covered.**

Keep these assertions focused on route/data flow; do not test implementation by invoking generation as a side effect of preview.

- [ ] **Step 6: Run all relevant Website Creation tests from `package.json`.**

Use the exact currently defined scripts rather than inventing script names.

Expected: all relevant tests PASS.

- [ ] **Step 7: Run typecheck and build.**

```powershell
npm run typecheck
npm run build
```

Expected: both PASS.

- [ ] **Step 8: Review the complete diff.**

Run:

```powershell
git status --short
git diff --stat
```

Confirm unrelated user changes are untouched and no publishing/deployment/security files were changed accidentally.

- [ ] **Step 9: Commit the regression suite.**

```powershell
git add tests/websiteCreationTemplates.test.mjs tests
# Stage only tests belonging to this milestone.
git commit -m "test: strengthen website template coverage"
```

---

### Task 10: Perform actual browser QA across all five templates

**Files:**
- No source changes unless QA exposes a defect; any defect becomes a targeted follow-up task with its own test.

**Interfaces:**
- Consumes: completed local build and dev server.
- Produces: verified visual/interaction evidence for all five templates and saved-artifact compatibility.

- [ ] **Step 1: Start the local application.**

Use the repository's existing development command from `package.json`, for example:

```powershell
npm run dev
```

Do not deploy.

- [ ] **Step 2: Open each template through the actual Avelixa Template Studio/preview flow.**

Verify all five:

1. Modern Business
2. Premium Minimal
3. Local Commerce
4. Creative Studio
5. Trusted Community

- [ ] **Step 3: Inspect desktop presentation.**

For each template verify hero, navigation, typography, imagery, section hierarchy, CTA hierarchy, cards, footer, whitespace, and visual distinction.

- [ ] **Step 4: Inspect tablet presentation.**

Verify grids collapse intentionally, images remain useful, navigation remains usable, and no content is clipped.

- [ ] **Step 5: Inspect mobile presentation.**

Verify mobile menu, hero, typography, buttons, cards, galleries, testimonials, dense information sections, footer, and no horizontal overflow.

- [ ] **Step 6: Inspect interactions.**

Verify hover/focus states, navigation anchors, menu behavior, image hover treatments, CTA presentation, and restrained transitions.

- [ ] **Step 7: Verify existing-project editing.**

Open an existing Creation Project using `Edit in Template Studio`. Confirm its existing information/specification loads and no new project is created merely by opening the editor.

- [ ] **Step 8: Verify persisted generated preview.**

Open `Preview Website` for an existing generated artifact. Confirm the artifact renders without regeneration and the full page is scrollable.

- [ ] **Step 9: If browser automation is available, use it for the above checks.**

If unavailable, report exactly:

`BROWSER QA: NOT PERFORMED — browser runtime unavailable.`

Never claim visual QA without actually inspecting the running application.

- [ ] **Step 10: Record any remaining visual limitations.**

Do not paper over failures. Fix only defects caused by this milestone and rerun the affected checks.

---

### Task 11: Final verification, review, and implementation commit

**Files:**
- All files changed by Tasks 2–10, reviewed through `git diff`.

**Interfaces:**
- Consumes: all implemented and tested template-library changes.
- Produces: verified `avelixa-current-work` commit with no deployment and a complete implementation report.

- [ ] **Step 1: Run the final typecheck.**

```powershell
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run the final production build.**

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 3: Run every relevant Website Creation/template/saved-artifact test script.**

Use the exact scripts present in `package.json` and record each result.

Expected: all relevant tests PASS.

- [ ] **Step 4: Review final repository state.**

```powershell
git status --short
git diff HEAD~1 --stat
git log -10 --oneline --decorate
```

Verify:

- no production deployment occurred;
- no publishing migration was applied;
- no security/RLS bypass was introduced;
- no unrelated files were changed;
- no user modifications were discarded.

- [ ] **Step 5: Review implementation against the specification.**

Confirm every requirement in `docs/superpowers/specs/2026-09-03-website-template-library-upgrade.md` has an implementation or explicit verification result.

- [ ] **Step 6: Request/review code quality before declaring completion.**

Check that the implementation remains one shared template engine/specification architecture, avoids duplicated page trees, uses deterministic content/assets, and remains understandable for the later Website Generation Machine.

- [ ] **Step 7: Commit any final verified changes.**

```powershell
git add <only-the-reviewed-template-milestone-files>
git commit -m "feat: build world-class website template library"
```

- [ ] **Step 8: Record the final commit SHA.**

Run:

```powershell
git rev-parse HEAD
```

- [ ] **Step 9: Produce the final report with exact evidence.**

Include:

1. exact files changed;
2. improvements in each template;
3. differences between the five template identities;
4. demo-content handling;
5. imagery handling;
6. responsive/mobile work;
7. interaction work;
8. saved-artifact/editor/preview preservation;
9. exact tests and results;
10. typecheck result;
11. build result;
12. browser QA result;
13. commit SHA;
14. remaining limitations.

Do not claim a check passed unless its command or actual browser inspection produced evidence.
