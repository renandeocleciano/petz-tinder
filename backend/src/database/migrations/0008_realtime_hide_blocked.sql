-- Same visibility as the API: a block between the two tutors (either direction) hides the
-- conversation from Realtime and from direct reads too.
CREATE OR REPLACE FUNCTION private.my_conversation_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT me.conversation_id
  FROM public.conversation_participants me
  JOIN public.users u ON u.id = me.user_id
  JOIN public.conversation_participants other
    ON other.conversation_id = me.conversation_id AND other.pet_id <> me.pet_id
  WHERE u.clerk_user_id = (SELECT auth.jwt() ->> 'sub')
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = me.user_id AND b.blocked_id = other.user_id)
         OR (b.blocker_id = other.user_id AND b.blocked_id = me.user_id)
    )
$$;
