import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const projects = fs.readFileSync('src/pages/portal/WebsiteCreationProjects.tsx', 'utf8');
const studio = fs.readFileSync('src/pages/WebsiteCreationStudio.tsx', 'utf8');
const foundation = fs.readFileSync('supabase/migrations/20260831100000_website_creation_foundation.sql', 'utf8');
const preview = fs.readFileSync('supabase/migrations/20260831104000_website_creation_preview_and_attribution_hardening.sql', 'utf8');

assert.match(app, /path="creation"[\s\S]*WebsiteCreationProjects/);
assert.match(app, /path="creation-studio"[\s\S]*WebsiteCreationProjects/);
assert.match(app, /path="creation-studio\/:creationProjectId"[\s\S]*WebsiteCreationStudio/);
assert.match(app, /path="preview\/:token"[\s\S]*PublicCreationPreview/);
assert.match(app, /requiredRoles=\{\['client','connector','operator','admin','owner'\]\}/);

assert.match(projects, /from\('creation_projects'\)/);
assert.match(projects, /rpc\('create_creation_project'/);
assert.match(projects, /navigate\(`\/portal\/creation-studio\/\$\{result\.data\}`\)/);
assert.match(projects, /selected_template_id/);
assert.match(projects, /preview_enabled/);
assert.match(projects, /Open in Template Studio/);

assert.match(studio, /creationProjectId/);
assert.match(studio, /consume_creation_generation/);
assert.match(studio, /saveSpecification/);
assert.match(studio, /WebsitePreviewRenderer/);
assert.match(studio, /public_preview_token/);

assert.match(foundation, /CREATE TABLE IF NOT EXISTS public\.creation_projects/);
assert.match(foundation, /CREATE OR REPLACE FUNCTION public\.create_creation_project/);
assert.match(foundation, /Authorized users read creation projects/);
assert.match(foundation, /Authorized users update creation projects/);
assert.match(preview, /get_public_creation_preview/);
assert.match(preview, /preview_enabled = true/);
assert.match(preview, /Made with Avelixa/);

console.log('websiteCreationProductIntegration.test.mjs: PASS');
