-- Races and signups tables
-- This file adds a minimal race system to support the dashboard requirements.

-- Drop existing tables if re-initializing (Docker init folder runs on fresh DB)
DROP TABLE IF EXISTS race_signup CASCADE;
DROP TABLE IF EXISTS race CASCADE;

-- Race table: minimal fields
CREATE TABLE race (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  distance_m INTEGER NOT NULL CHECK (distance_m > 0),
  starts_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' -- scheduled | finished | canceled
);

-- Race signup table: links player to race
CREATE TABLE race_signup (
  id SERIAL PRIMARY KEY,
  raceid INT NOT NULL,
  playerid INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_race FOREIGN KEY (raceid) REFERENCES race (id) ON DELETE CASCADE,
  CONSTRAINT fk_player FOREIGN KEY (playerid) REFERENCES player (id) ON DELETE CASCADE,
  CONSTRAINT uq_race_player UNIQUE (raceid, playerid)
);

-- Seed a few upcoming races
INSERT INTO race (name, distance_m, starts_at)
VALUES
  ('Morning Sprint', 100, now() + interval '1 hour'),
  ('Noon Dash', 200, now() + interval '3 hours'),
  ('Evening Marathon', 500, now() + interval '6 hours');
