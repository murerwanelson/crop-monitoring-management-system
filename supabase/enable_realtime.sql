-- 🛰️ Enable Realtime for the 'blocks' table
-- This allows the mobile app to receive instant updates when new boundaries are uploaded.

-- 1. Check if the table is already in the publication (optional check)
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'blocks';

-- 2. Add 'blocks' to the 'supabase_realtime' publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocks;

-- Note: If you have already added other tables and get an error that the publication 
-- doesn't exist, you can create it first with:
-- CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
-- (But Supabase usually creates it for you).
