/*
# Fix testimonials INSERT policy — enforce is_public integrity

## Problem
The previous `anon_insert_testimonials` policy used `WITH CHECK (true)`, which allowed
any client to insert a row with any value for `is_public`, including setting low-star
reviews as public or high-star reviews as private.

## Fix
Replace the always-true check with a constraint that enforces the business rule:
- Stars 4–5 → is_public must be TRUE
- Stars 1–3 → is_public must be FALSE

This prevents clients from manipulating the `is_public` column independently of the
star rating, while still allowing anonymous visitors to submit reviews.
*/

DROP POLICY IF EXISTS "anon_insert_testimonials" ON testimonials;

CREATE POLICY "anon_insert_testimonials" ON testimonials FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (stars >= 4 AND is_public = true)
    OR
    (stars <= 3 AND is_public = false)
  );
