/*
# Create testimonials table

## Summary
Stores visitor-submitted testimonials for Nexa Web Studio.

## Changes
1. New Tables
   - `testimonials`
     - `id` (uuid, primary key) — unique identifier
     - `name` (text) — reviewer's name
     - `stars` (integer 1–5) — star rating given
     - `comment` (text) — review text
     - `is_public` (boolean) — true only for 4+ star reviews (displayed on site)
     - `created_at` (timestamptz) — submission timestamp

## Security
- RLS enabled on testimonials
- No auth (single-tenant site). All policies use `TO anon, authenticated`.
- SELECT is restricted to is_public = true so visitors only see approved reviews.
- INSERT is open to anon so anyone can submit a review.
- No UPDATE/DELETE from client — reviews are managed internally.

## Notes
- 1–3 star reviews are stored with is_public = false (private complaint log).
- 4–5 star reviews are stored with is_public = true (displayed publicly).
*/

CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Anonymous',
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_testimonials" ON testimonials;
CREATE POLICY "public_select_testimonials" ON testimonials FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

DROP POLICY IF EXISTS "anon_insert_testimonials" ON testimonials;
CREATE POLICY "anon_insert_testimonials" ON testimonials FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
