-- ============================================================
-- AVELIXA WEBSITE TEMPLATE LIBRARY PRESENTATION UPGRADE
-- Expand the five protected templates with complete compositions.
-- No publishing, auth, RLS, or generation-security changes.
-- ============================================================

UPDATE public.website_templates
SET
  sections = CASE slug
    WHEN 'modern-business' THEN '["navbar","hero","stats","about","services","process","portfolio","testimonials","team","finalCta","contact","footer"]'::jsonb
    WHEN 'premium-minimal' THEN '["navbar","hero","story","services","gallery","values","testimonials","contact","footer"]'::jsonb
    WHEN 'local-commerce' THEN '["navbar","hero","offers","products","services","gallery","hours","location","testimonials","finalCta","contact","footer"]'::jsonb
    WHEN 'creative-studio' THEN '["navbar","hero","portfolio","about","services","gallery","testimonials","finalCta","contact","footer"]'::jsonb
    WHEN 'trusted-community' THEN '["navbar","hero","about","services","stats","testimonials","faq","location","contact","footer"]'::jsonb
    ELSE sections
  END,
  description = CASE slug
    WHEN 'modern-business' THEN 'A confident editorial system for ambitious professional service companies, with metrics, process, work, people, and conversion-led storytelling.'
    WHEN 'premium-minimal' THEN 'A refined editorial canvas for premium brands, consultants, interiors, and studios that value whitespace and considered detail.'
    WHEN 'local-commerce' THEN 'A warm, practical storefront experience for neighborhood retail, food, hospitality, and service businesses.'
    WHEN 'creative-studio' THEN 'An expressive dark portfolio system for agencies and creative teams with oversized type, layered work, and high-contrast storytelling.'
    WHEN 'trusted-community' THEN 'A welcoming, accessible information system for education, nonprofit, faith, and community organizations.'
    ELSE description
  END,
  layout = CASE slug
    WHEN 'modern-business' THEN '{"container":"wide","hero":"split","sections":"editorial-grid","cards":"soft","motion":"subtle"}'::jsonb
    WHEN 'premium-minimal' THEN '{"container":"narrow","hero":"centered","sections":"editorial-flow","cards":"bordered","motion":"quiet"}'::jsonb
    WHEN 'local-commerce' THEN '{"container":"wide","hero":"image-right","sections":"commerce-grid","cards":"rounded","motion":"warm"}'::jsonb
    WHEN 'creative-studio' THEN '{"container":"wide","hero":"immersive","sections":"asymmetric-portfolio","cards":"layered","motion":"expressive"}'::jsonb
    WHEN 'trusted-community' THEN '{"container":"standard","hero":"centered","sections":"information-flow","cards":"soft","motion":"subtle"}'::jsonb
    ELSE layout
  END,
  preview = CASE slug
    WHEN 'modern-business' THEN '{"label":"Modern Business","image":"/images/template-modern-business.svg","accent":"editorial"}'::jsonb
    WHEN 'premium-minimal' THEN '{"label":"Premium Minimal","image":"/images/template-premium-minimal.svg","accent":"paper"}'::jsonb
    WHEN 'local-commerce' THEN '{"label":"Local Commerce","image":"/images/template-local-commerce.svg","accent":"warm"}'::jsonb
    WHEN 'creative-studio' THEN '{"label":"Creative Studio","image":"/images/template-creative-studio.svg","accent":"dark"}'::jsonb
    WHEN 'trusted-community' THEN '{"label":"Trusted Community","image":"/images/template-trusted-community.svg","accent":"calm"}'::jsonb
    ELSE preview
  END,
  updated_at = NOW()
WHERE slug IN ('modern-business','premium-minimal','local-commerce','creative-studio','trusted-community');
