import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const projects = fs.readFileSync('src/pages/portal/WebsiteCreationProjects.tsx', 'utf8');
const studioRoute = fs.readFileSync('src/pages/CreationStudioRoute.tsx', 'utf8');
const preview = fs.readFileSync('src/pages/CreationGeneratedPreview.tsx', 'utf8');

assert.match(app, /path="creation-studio\/:creationProjectId"[^\n]*CreationStudioRoute/);
assert.match(app, /path="creation-preview\/:creationProjectId"[^\n]*CreationGeneratedPreview/);
assert.match(studioRoute, /useParams/);
assert.match(studioRoute, /creationProjectId/);
assert.match(projects, /generation_state/);
assert.match(projects, /latest_generated_output_identity/);
assert.match(projects, /Preview Website/);
assert.match(projects, /Edit in Template Studio/);
assert.match(projects, /\/portal\/creation-preview\/\$\{project\.id\}/);
assert.match(projects, /\/portal\/creation-studio\/\$\{project\.id\}/);
assert.match(preview, /creation_generated_website_outputs/);
assert.match(preview, /latest_generated_output_identity/);
assert.match(preview, /artifact\.specification/);
assert.match(preview, /validateWebsiteSpecification/);
assert.match(preview, /WebsitePreviewRenderer/);
assert.match(preview, /Desktop preview/);
assert.match(preview, /Tablet preview/);
assert.match(preview, /Mobile preview/);
assert.match(preview, /Public Preview/);
assert.match(preview, /Return to Editor/);
assert.doesNotMatch(preview, /consume_creation_generation/);
assert.doesNotMatch(preview, /generateWebsiteSpecification/);
assert.doesNotMatch(preview, /generateWebsiteFromSpecification/);

console.log('websiteCreationSavedArtifactFlow.test.mjs: PASS');
