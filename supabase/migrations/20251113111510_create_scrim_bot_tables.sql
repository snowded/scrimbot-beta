/*
  # Scrim Bot Database Schema

  ## Overview
  Creates the database schema for a Discord scrim management bot with team tracking, scrim posts, and admin logging.

  ## New Tables

  ### 1. `teams`
  Stores team information with captain and team roles
  - `id` (uuid, primary key) - Unique team identifier
  - `guild_id` (text) - Discord server ID
  - `team_name` (text) - Name of the team
  - `captain_role_id` (text) - Discord role ID for team captain
  - `team_role_id` (text) - Discord role ID for team members
  - `wins` (integer) - Total wins count
  - `losses` (integer) - Total losses count
  - `created_at` (timestamptz) - Team creation timestamp
  - `created_by` (text) - Discord user ID who created the team

  ### 2. `scrims`
  Stores scrim match posts and details
  - `id` (uuid, primary key) - Unique scrim identifier
  - `guild_id` (text) - Discord server ID
  - `team_id` (uuid) - Reference to teams table
  - `format` (text) - Match format (Bo1/Bo3/Bo5)
  - `maps` (text) - Maps for the match
  - `time` (text) - Scheduled match time
  - `server` (text) - Server location/region
  - `message_id` (text) - Discord message ID of the scrim post
  - `channel_id` (text) - Discord channel ID where posted
  - `status` (text) - Scrim status (open/accepted/completed/cancelled)
  - `posted_by` (text) - Discord user ID who posted
  - `created_at` (timestamptz) - Scrim post creation timestamp

  ### 3. `scrim_results`
  Stores completed scrim match results
  - `id` (uuid, primary key) - Unique result identifier
  - `scrim_id` (uuid) - Reference to scrims table
  - `winning_team_id` (uuid) - Reference to winning team
  - `losing_team_id` (uuid) - Reference to losing team
  - `score` (text) - Final score
  - `recorded_by` (text) - Discord user ID who recorded result
  - `created_at` (timestamptz) - Result recording timestamp

  ### 4. `action_logs`
  Logs all admin and bot actions for audit trail
  - `id` (uuid, primary key) - Unique log identifier
  - `guild_id` (text) - Discord server ID
  - `action_type` (text) - Type of action (team_create/scrim_post/result_record/etc)
  - `user_id` (text) - Discord user ID who performed action
  - `target_id` (text) - Target entity ID (team/scrim/user)
  - `details` (jsonb) - Additional action details
  - `created_at` (timestamptz) - Action timestamp

  ## Security
  - RLS enabled on all tables
  - Policies restrict access to authenticated service role only
*/

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  team_name text NOT NULL,
  captain_role_id text NOT NULL,
  team_role_id text NOT NULL,
  wins integer DEFAULT 0,
  losses integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by text NOT NULL,
  UNIQUE(guild_id, team_name)
);

-- Create scrims table
CREATE TABLE IF NOT EXISTS scrims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  format text NOT NULL,
  maps text NOT NULL,
  time text NOT NULL,
  server text NOT NULL,
  message_id text,
  channel_id text,
  status text DEFAULT 'open',
  posted_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create scrim_results table
CREATE TABLE IF NOT EXISTS scrim_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scrim_id uuid REFERENCES scrims(id) ON DELETE CASCADE,
  winning_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  losing_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  score text,
  recorded_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create action_logs table
CREATE TABLE IF NOT EXISTS action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  action_type text NOT NULL,
  user_id text NOT NULL,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_teams_guild_id ON teams(guild_id);
CREATE INDEX IF NOT EXISTS idx_scrims_guild_id ON scrims(guild_id);
CREATE INDEX IF NOT EXISTS idx_scrims_team_id ON scrims(team_id);
CREATE INDEX IF NOT EXISTS idx_scrims_status ON scrims(status);
CREATE INDEX IF NOT EXISTS idx_scrim_results_scrim_id ON scrim_results(scrim_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_guild_id ON action_logs(guild_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs(created_at);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrims ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrim_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access (bot will use service role key)
CREATE POLICY "Service role has full access to teams"
  ON teams FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to scrims"
  ON scrims FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to scrim_results"
  ON scrim_results FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to action_logs"
  ON action_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);