-- Realtime for the chat (Postgres Changes) with Clerk third-party auth.
--
-- The app subscribes with the Clerk session token; Supabase maps it to the role
-- `authenticated` and exposes its claims through auth.jwt() (`sub` = Clerk user id).
-- Writes never come from the app: the API connects as the table owner.

-- 1. Defense in depth: the Data API exposes nothing by default. RLS without policies
--    already denies access; revoking the grants means a future mistaken policy does not
--    open writes either.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;--> statement-breakpoint

-- 2. Helpers live in a schema the Data API does not expose, so they cannot be called as RPC.
CREATE SCHEMA IF NOT EXISTS private;--> statement-breakpoint
REVOKE ALL ON SCHEMA private FROM public;--> statement-breakpoint
GRANT USAGE ON SCHEMA private TO authenticated;--> statement-breakpoint

-- Conversations of the user behind the current JWT. SECURITY DEFINER because users and
-- conversation_participants are not readable by `authenticated`.
CREATE OR REPLACE FUNCTION private.my_conversation_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.conversation_id
  FROM public.conversation_participants p
  JOIN public.users u ON u.id = p.user_id
  WHERE u.clerk_user_id = (SELECT auth.jwt() ->> 'sub')
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION private.my_conversation_ids() FROM public;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.my_conversation_ids() TO authenticated;--> statement-breakpoint

-- 3. Read-only access for participants: new messages, playdate answers (updates) and read
--    receipts / new conversations (conversation_participants).
GRANT SELECT ON public.messages, public.conversation_participants TO authenticated;--> statement-breakpoint

CREATE POLICY "participants read messages" ON public.messages
  FOR SELECT TO authenticated
  USING (conversation_id IN (SELECT private.my_conversation_ids()));--> statement-breakpoint

CREATE POLICY "participants read participants" ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (conversation_id IN (SELECT private.my_conversation_ids()));--> statement-breakpoint

-- 4. Publish the tables to Realtime.
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages, public.conversation_participants;
