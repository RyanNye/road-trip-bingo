-- Run this once in the Supabase SQL editor
-- Creates the route_rankings table used by the daily cron job

CREATE TABLE IF NOT EXISTS route_rankings (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date  date NOT NULL,
  region         text NOT NULL,
  rank           int  NOT NULL,
  corridor_id    text,
  route_id       uuid REFERENCES routes(id) ON DELETE SET NULL,
  route_from     text NOT NULL,
  route_to       text NOT NULL,
  search_count   int  NOT NULL DEFAULT 0,
  previous_rank  int,
  movement       text CHECK (movement IN ('up','down','same','new')),
  created_at     timestamptz DEFAULT now(),
  UNIQUE (snapshot_date, region, rank)
);

-- Index for fast region+date lookups (used by the Top Trips pages)
CREATE INDEX IF NOT EXISTS idx_rankings_region_date
  ON route_rankings (region, snapshot_date DESC);
