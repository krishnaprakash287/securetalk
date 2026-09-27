-- ==============================================================================
-- SecureTalk Database Migration
-- Production Schema, Row Level Security (RLS) Policies, Triggers & Realtime Setup
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- Username validation: lowercase, 3 to 30 chars, alphanumeric + underscores
  constraint username_format_check check (
    username ~ '^[a-z0-9_]{3,30}$'
  ),
  -- Prevent impersonation of system / admin reserved names
  constraint reserved_username_check check (
    username not in (
      'admin', 'administrator', 'system', 'securetalk', 'support',
      'root', 'moderator', 'mod', 'help', 'security', 'official',
      'staff', 'api', 'bot', 'contact', 'billing', 'developer'
    )
  )
);

create index if not exists idx_profiles_username on public.profiles (username);

-- ------------------------------------------------------------------------------
-- 2. USER SETTINGS TABLE (Privacy & Preferences)
-- ------------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  read_receipts boolean not null default true,
  typing_indicators boolean not null default true,
  online_status boolean not null default true,
  last_seen boolean not null default true,
  allow_chat_requests boolean not null default true,
  profile_discoverable boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ------------------------------------------------------------------------------
-- 3. PUBLIC KEYS TABLE (Public ECDH identity keys for E2EE key agreement)
-- Note: Private keys NEVER touch the database or network!
-- ------------------------------------------------------------------------------
create table if not exists public.public_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  public_key text not null, -- Exported public JWK / SPKI
  key_version integer not null default 1,
  created_at timestamptz default now() not null,
  unique (user_id, key_version)
);

create index if not exists idx_public_keys_user_id on public.public_keys (user_id);

-- ------------------------------------------------------------------------------
-- 4. CONVERSATIONS & CONVERSATION MEMBERS
-- ------------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now() not null,
  primary key (conversation_id, user_id)
);

create index if not exists idx_conversation_members_user on public.conversation_members (user_id);
create index if not exists idx_conversation_members_conv on public.conversation_members (conversation_id);

-- ------------------------------------------------------------------------------
-- 5. CHAT REQUESTS TABLE
-- States: pending, accepted, rejected, canceled, blocked
-- ------------------------------------------------------------------------------
create table if not exists public.chat_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'canceled', 'blocked')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint no_self_requests check (sender_id <> recipient_id),
  unique (sender_id, recipient_id)
);

create index if not exists idx_chat_requests_recipient on public.chat_requests (recipient_id, status);
create index if not exists idx_chat_requests_sender on public.chat_requests (sender_id, status);

-- ------------------------------------------------------------------------------
-- 6. BLOCKED USERS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (blocker_id, blocked_id),
  constraint no_self_blocking check (blocker_id <> blocked_id)
);

create index if not exists idx_blocked_users_blocker on public.blocked_users (blocker_id);
create index if not exists idx_blocked_users_blocked on public.blocked_users (blocked_id);

-- ------------------------------------------------------------------------------
-- 7. MESSAGES TABLE (ZERO PLAINTEXT CONTENT)
-- ------------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  ciphertext text not null, -- Base64 AES-256-GCM ciphertext + 128-bit tag
  nonce text not null,      -- Base64 12-byte cryptographically random IV
  encryption_version integer not null default 1,
  recipient_key_fingerprint text,
  reply_to_id uuid references public.messages(id) on delete set null,
  status text not null default 'sent' check (status in ('sending', 'sent', 'delivered', 'read', 'failed')),
  created_at timestamptz default now() not null,
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists idx_messages_conversation_date on public.messages (conversation_id, created_at asc);
create index if not exists idx_messages_sender on public.messages (sender_id);

-- ------------------------------------------------------------------------------
-- 8. ATTACHMENTS TABLE (CLIENT-SIDE ENCRYPTED)
-- ------------------------------------------------------------------------------
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  file_path text not null,
  file_size bigint not null,
  mime_type text not null,
  encrypted_file_key text not null, -- Ephemeral file key encrypted with conversation shared key
  file_nonce text not null,         -- Nonce used to encrypt attachment payload
  original_filename_ciphertext text not null, -- Encrypted filename
  created_at timestamptz default now() not null
);

create index if not exists idx_attachments_message on public.attachments (message_id);

-- ------------------------------------------------------------------------------
-- 9. ACTIVE DEVICES / SESSIONS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_name text not null,
  device_type text,
  last_active timestamptz default now() not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_devices_user on public.devices (user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.public_keys enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.chat_requests enable row level security;
alter table public.blocked_users enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.devices enable row level security;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Users can search / view any profile if it's discoverable, or if they have an active request/conversation
create policy "Allow viewing discoverable profiles or contacts"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.user_settings us
      where us.user_id = profiles.id and us.profile_discoverable = true
    )
    or exists (
      select 1 from public.conversation_members cm1
      join public.conversation_members cm2 on cm1.conversation_id = cm2.conversation_id
      where cm1.user_id = auth.uid() and cm2.user_id = profiles.id
    )
    or exists (
      select 1 from public.chat_requests cr
      where (cr.sender_id = auth.uid() and cr.recipient_id = profiles.id)
         or (cr.recipient_id = auth.uid() and cr.sender_id = profiles.id)
    )
  );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- USER SETTINGS POLICIES
-- ------------------------------------------------------------------------------
create policy "Users can read own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- PUBLIC KEYS POLICIES
-- ------------------------------------------------------------------------------
-- Public keys are strictly public material for E2EE key agreement
create policy "Authenticated users can read public keys"
  on public.public_keys for select
  using (auth.role() = 'authenticated');

create policy "Users can publish their own public key"
  on public.public_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own public key"
  on public.public_keys for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- CONVERSATIONS & MEMBERS POLICIES
-- ------------------------------------------------------------------------------
create policy "Members can view their conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversations.id and cm.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create conversations"
  on public.conversations for insert
  with check (auth.role() = 'authenticated');

create policy "Members can view conversation members"
  on public.conversation_members for select
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_members.conversation_id and cm.user_id = auth.uid()
    )
  );

create policy "Users can insert conversation members"
  on public.conversation_members for insert
  with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------------------------
-- CHAT REQUESTS POLICIES
-- ------------------------------------------------------------------------------
create policy "Users can view requests they sent or received"
  on public.chat_requests for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "Users can send chat requests"
  on public.chat_requests for insert
  with check (
    sender_id = auth.uid()
    and not exists (
      select 1 from public.blocked_users bu
      where (bu.blocker_id = recipient_id and bu.blocked_id = auth.uid())
         or (bu.blocker_id = auth.uid() and bu.blocked_id = recipient_id)
    )
    and exists (
      select 1 from public.user_settings us
      where us.user_id = recipient_id and us.allow_chat_requests = true
    )
  );

create policy "Participants can update chat request status"
  on public.chat_requests for update
  using (sender_id = auth.uid() or recipient_id = auth.uid())
  with check (sender_id = auth.uid() or recipient_id = auth.uid());

-- ------------------------------------------------------------------------------
-- BLOCKED USERS POLICIES
-- ------------------------------------------------------------------------------
create policy "Users can view their own block list"
  on public.blocked_users for select
  using (blocker_id = auth.uid());

create policy "Users can add to their block list"
  on public.blocked_users for insert
  with check (blocker_id = auth.uid());

create policy "Users can remove from their block list"
  on public.blocked_users for delete
  using (blocker_id = auth.uid());

-- ------------------------------------------------------------------------------
-- MESSAGES POLICIES
-- ------------------------------------------------------------------------------
create policy "Members can view messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()
    )
  );

create policy "Members can insert messages if not blocked"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()
    )
    and not exists (
      -- Prevent message if recipient blocked sender
      select 1 from public.conversation_members other_cm
      join public.blocked_users bu on bu.blocker_id = other_cm.user_id and bu.blocked_id = auth.uid()
      where other_cm.conversation_id = messages.conversation_id and other_cm.user_id <> auth.uid()
    )
  );

create policy "Senders can edit or soft-delete their own messages; recipients can update read status"
  on public.messages for update
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- ATTACHMENTS POLICIES
-- ------------------------------------------------------------------------------
create policy "Conversation members can view attachments"
  on public.attachments for select
  using (
    exists (
      select 1 from public.messages m
      join public.conversation_members cm on cm.conversation_id = m.conversation_id
      where m.id = attachments.message_id and cm.user_id = auth.uid()
    )
  );

create policy "Senders can insert attachments for their messages"
  on public.attachments for insert
  with check (
    exists (
      select 1 from public.messages m
      where m.id = attachments.message_id and m.sender_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- DEVICES POLICIES
-- ------------------------------------------------------------------------------
create policy "Users can view their own devices"
  on public.devices for select
  using (user_id = auth.uid());

create policy "Users can insert their own device"
  on public.devices for insert
  with check (user_id = auth.uid());

create policy "Users can update their own device"
  on public.devices for update
  using (user_id = auth.uid());

create policy "Users can delete their own device"
  on public.devices for delete
  using (user_id = auth.uid());

-- ==============================================================================
-- RPC FUNCTIONS: ACCEPT CHAT REQUEST & ATOMIC CONVERSATION CREATION
-- ==============================================================================

create or replace function public.accept_chat_request(request_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  req record;
  new_conv_id uuid;
begin
  -- Fetch pending request and verify recipient is current user
  select * into req
  from public.chat_requests
  where id = request_id and recipient_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'Chat request not found or not eligible for acceptance';
  end if;

  -- Ensure neither party is blocked
  if exists (
    select 1 from public.blocked_users
    where (blocker_id = req.sender_id and blocked_id = req.recipient_id)
       or (blocker_id = req.recipient_id and blocked_id = req.sender_id)
  ) then
    raise exception 'Cannot accept request between blocked users';
  end if;

  -- Mark request as accepted
  update public.chat_requests
  set status = 'accepted', updated_at = now()
  where id = request_id;

  -- Create conversation
  insert into public.conversations (created_at, updated_at)
  values (now(), now())
  returning id into new_conv_id;

  -- Add both users as conversation members
  insert into public.conversation_members (conversation_id, user_id, joined_at)
  values
    (new_conv_id, req.sender_id, now()),
    (new_conv_id, req.recipient_id, now());

  return new_conv_id;
end;
$$;

-- ------------------------------------------------------------------------------
-- RPC FUNCTION: USER ACCOUNT DELETION
-- ------------------------------------------------------------------------------
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
as $$
declare
  target_user_id uuid;
begin
  target_user_id := auth.uid();
  if target_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete user's public keys, settings, devices
  delete from public.public_keys where user_id = target_user_id;
  delete from public.user_settings where user_id = target_user_id;
  delete from public.devices where user_id = target_user_id;
  delete from public.blocked_users where blocker_id = target_user_id or blocked_id = target_user_id;
  delete from public.chat_requests where sender_id = target_user_id or recipient_id = target_user_id;

  -- Note: conversation_members and profiles cascade on auth.users delete
  delete from public.profiles where id = target_user_id;
  delete from auth.users where id = target_user_id;
end;
$$;

-- ------------------------------------------------------------------------------
-- REALTIME PUBLICATION CONFIGURATION
-- ------------------------------------------------------------------------------
-- Ensure tables are published to Supabase Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chat_requests;
alter publication supabase_realtime add table public.conversation_members;
alter publication supabase_realtime add table public.devices;
