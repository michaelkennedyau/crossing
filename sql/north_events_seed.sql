-- The trip's curated events — the ONLY source of crossing-ev-* rows in whatson's
-- discovered_events (the publisher stopped writing events; it made junk out of prose).
-- Dates are best-known 2026; anything uncertain says verify in the description.
-- Re-run wholesale after edits:  npm run db:seed:events

DELETE FROM discovered_events WHERE id LIKE 'crossing-ev-%';

INSERT OR REPLACE INTO discovered_events (id, title, venue, event_date, source, description, city, status, expires_at) VALUES
('crossing-ev-assumption-day', 'Velika Gospa — Assumption Day', 'Slovenia & Croatia, everywhere', '2026-08-15', 'manual',
 'Public holiday both sides of the border — processions, packed churches, full beaches and restaurants. Day two at the lake: let it have its holiday and go early or high.', 'Lake Bled', 'new', '2026-08-16'),
('crossing-ev-radovljica-festival', 'Radovljica Festival — early music', 'Radovljica manor, 10 min from Bled', '2026-08-16', 'manual',
 '44th edition, 8–25 Aug; 20:00 concerts fall inside the window on 16, 17 and 18 Aug. Verify each night''s programme at festival-radovljica.si.', 'Lake Bled', 'new', '2026-08-26'),
('crossing-ev-bled-promenade', 'Bled Summer promenade programme', 'Bled lakeside', '2026-08-16', 'manual',
 'Free lakeside sets through the window, including Rhythm of Folklore, Sun 16 at 20:00.', 'Lake Bled', 'new', '2026-08-21'),
('crossing-ev-hvar-summer-festival', 'Hvar Summer Festival', 'Franciscan monastery cloister, Hvar town', '2026-08-22', 'manual',
 'Classical concerts in the cloister through late August — an easy tender in from the Pakleni. 2026 programme unconfirmed; verify on arrival.', 'Hvar', 'new', '2026-09-02'),
('crossing-ev-jelsa-wine-night', 'Jelsa Wine Night', 'Jelsa waterfront, Hvar', '2026-08-28', 'manual',
 'Waterfront wine evening, traditionally the last Friday of August. 2026 date unconfirmed — verify locally; an easy shore night from the boat''s last leg.', 'Hvar', 'new', '2026-08-30'),
('crossing-ev-vrboska-fishermen', 'Vrboska Fishermen''s Night', 'Vrboska, Hvar', '2026-08-29', 'manual',
 'Sardines off the grill on the smallest, prettiest harbour on the island. Traditionally late August; 2026 date unconfirmed — verify locally.', 'Hvar', 'new', '2026-08-31'),
('crossing-ev-days-of-diocletian', 'Days of Diocletian', 'Diocletian''s Palace, Split', '2026-08-27', 'manual',
 'Roman-dress festival around the Palace, traditionally late August. 2026 dates unpublished — a bonus if it lands on a Split transit, never a plan.', 'Split', 'new', '2026-09-01'),
('crossing-ev-faros-marathon', 'Faros Marathon — open-water swim', 'Stari Grad bay, Hvar', '2026-08-29', 'manual',
 '16 km international open-water race into Stari Grad bay, last weekend of August — worth a morning watching the finish from the riva. Verify the 2026 date.', 'Hvar', 'new', '2026-08-31');
