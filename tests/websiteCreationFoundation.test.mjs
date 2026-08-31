import assert from 'node:assert/strict';
import { generateWebsiteSpecification, validateBusinessInformation } from '../src/lib/websiteCreation/generator.ts';
import { templateSections } from '../src/lib/websiteCreation/templates.ts';

const template = { id: 'template-1', slug: 'test', name: 'Test Template', description: 'Test', categories: ['business'], visual_style: 'test', sections: ['navbar','hero','about','services','contact','footer'], typography: { heading: 'sans', body: 'sans' }, color_direction: { primary: '#111827', accent: '#7c3aed', surface: '#fff' }, layout: { container: 'wide' }, preview: {}, is_active: true, is_protected: true };
const business = { businessName: 'Acme Studio', industry: 'Design', services: ['Branding','Web'], products: [] };
const specA = generateWebsiteSpecification(business, template, ['hero','services','contact'], true);
const specB = generateWebsiteSpecification(business, template, ['hero','services','contact'], true);
assert.deepEqual(specA, specB, 'generation must be deterministic');
assert.deepEqual(specA.sections, ['hero','services','contact']);
assert.equal(specA.business.businessName, 'Acme Studio');
assert.equal(specA.attribution.enabled, true);
assert.deepEqual(templateSections(template, ['hero','pricing','contact']), ['hero','contact']);
assert.ok(validateBusinessInformation({ businessName: '' }).length > 0);
assert.ok(validateBusinessInformation({ businessName: 'Acme', email: 'bad' }).length > 0);
assert.equal(validateBusinessInformation({ businessName: 'Acme', email: 'hello@example.com' }).length, 0);
console.log('websiteCreationFoundation.test.mjs: PASS');
