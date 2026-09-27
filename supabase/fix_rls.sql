-- ==============================================================================
-- SecureTalk RLS Policy & Permissions Fix
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kpyuxeeefwyxlmsxepjv/sql
-- ==============================================================================

-- 1. Helper function with SECURITY DEFINER to break RLS recursion cycles
create or replace function public.is_conversation_member(conv_id uuid, check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv_id and user_id = check_user_id
  );
$$;

-- 2. Helper function to check if either user blocked the other (bypasses RLS)
create or replace function public.is_blocked_between(user_a uuid, user_b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.blocked_users
    where (blocker_id = user_a and blocked_id = user_b)
       or (blocker_id = user_b and blocked_id = user_a)
  );
$$;

-- 3. Helper function to validate sending chat requests (bypasses cross-user RLS on user_settings)
create or replace function public.can_send_chat_request(sender uuid, recipient uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    sender = auth.uid()
    and sender <> recipient
    and not public.is_blocked_between(sender, recipient)
    and (
      not exists (select 1 from public.user_settings where user_id = recipient)
      or exists (
        select 1 from public.user_settings
        where user_id = recipient and allow_chat_requests = true
      )
    );
$$;

-- 4. Helper function to validate inserting messages
create or replace function public.can_send_message(conv_id uuid, check_sender uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    check_sender = auth.uid()
    and public.is_conversation_member(conv_id, check_sender)
    and not exists (
      select 1 from public.conversation_members other_cm
      where other_cm.conversation_id = conv_id
        and other_cm.user_id <> check_sender
        and public.is_blocked_between(check_sender, other_cm.user_id)
    );
$$;

-- 5. Fix PROFILES policy
drop policy if exists "Allow viewing discoverable profiles or contacts" on public.profiles;
drop policy if exists "Allow authenticated users to read profiles" on public.profiles;

create policy "Allow authenticated users to read profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- 6. Fix CONVERSATION_MEMBERS policy
drop policy if exists "Members can view conversation members" on public.conversation_members;
drop policy if exists "Users can insert conversation members" on public.conversation_members;

create policy "Members can view conversation members"
  on public.conversation_members for select
  using (
    user_id = auth.uid()
    or public.is_conversation_member(conversation_id, auth.uid())
  );

create policy "Users can insert conversation members"
  on public.conversation_members for insert
  with check (auth.role() = 'authenticated');

-- 7. Fix CONVERSATIONS policy
drop policy if exists "Members can view their conversations" on public.conversations;
drop policy if exists "Authenticated users can create conversations" on public.conversations;

create policy "Members can view their conversations"
  on public.conversations for select
  using (
    public.is_conversation_member(id, auth.uid())
  );

create policy "Authenticated users can create conversations"
  on public.conversations for insert
  with check (auth.role() = 'authenticated');

-- 8. Fix CHAT_REQUESTS policies (fixes "new row violates row-level security policy for table 'chat_requests'")
drop policy if exists "Users can view requests they sent or received" on public.chat_requests;
drop policy if exists "Users can send chat requests" on public.chat_requests;
drop policy if exists "Participants can update chat request status" on public.chat_requests;
drop policy if exists "Senders can delete pending chat requests" on public.chat_requests;

create policy "Users can view requests they sent or received"
  on public.chat_requests for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "Users can send chat requests"
  on public.chat_requests for insert
  with check (
    public.can_send_chat_request(sender_id, recipient_id)
  );

create policy "Participants can update chat request status"
  on public.chat_requests for update
  using (sender_id = auth.uid() or recipient_id = auth.uid())
  with check (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "Senders can delete pending chat requests"
  on public.chat_requests for delete
  using (sender_id = auth.uid());

-- 9. Fix MESSAGES policies
drop policy if exists "Members can view messages in their conversations" on public.messages;
drop policy if exists "Members can insert messages if not blocked" on public.messages;
drop policy if exists "Senders can edit or soft-delete their own messages; recipients can update read status" on public.messages;

create policy "Members can view messages in their conversations"
  on public.messages for select
  using (
    public.is_conversation_member(conversation_id, auth.uid())
  );

create policy "Members can insert messages if not blocked"
  on public.messages for insert
  with check (
    public.can_send_message(conversation_id, sender_id)
  );

create policy "Senders can edit or soft-delete their own messages; recipients can update read status"
  on public.messages for update
  using (
    sender_id = auth.uid()
    or public.is_conversation_member(conversation_id, auth.uid())
  );

-- 10. Fix ATTACHMENTS policy
drop policy if exists "Conversation members can view attachments" on public.attachments;
create policy "Conversation members can view attachments"
  on public.attachments for select
  using (
    exists (
      select 1 from public.messages m
      where m.id = attachments.message_id and public.is_conversation_member(m.conversation_id, auth.uid())
    )
  );
