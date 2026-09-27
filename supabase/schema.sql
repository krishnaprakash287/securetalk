-- ==============================================================================
-- SecureTalk Complete Self-Contained Database Migration & Setup
-- Paste and Run this entire file in your Supabase Dashboard -> SQL Editor
-- (https://supabase.com/dashboard/project/kpyuxeeefwyxlmsxepjv/sql)
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. CORE TABLES
-- ------------------------------------------------------------------------------

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint username_format_check check (username ~ '^[a-z0-9_]{3,30}$'),
  constraint reserved_username_check check (
    username not in (
      'admin', 'administrator', 'system', 'securetalk', 'support',
      'root', 'moderator', 'mod', 'help', 'security', 'official',
      'staff', 'api', 'bot', 'contact', 'billing', 'developer'
    )
  )
);

create index if not exists idx_profiles_username on public.profiles (username);

-- User Settings
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

-- Public Keys (Public identity keys for E2EE key agreement; private keys NEVER leave the device)
create table if not exists public.public_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  public_key text not null,
  key_version integer not null default 1,
  created_at timestamptz default now() not null,
  unique (user_id, key_version)
);

create index if not exists idx_public_keys_user_id on public.public_keys (user_id);

-- Conversations & Members
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

-- Chat Requests
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

-- Blocked Users
create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (blocker_id, blocked_id),
  constraint no_self_blocking check (blocker_id <> blocked_id)
);

create index if not exists idx_blocked_users_blocker on public.blocked_users (blocker_id);
create index if not exists idx_blocked_users_blocked on public.blocked_users (blocked_id);

-- Messages (Zero plaintext stored)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  ciphertext text not null,
  nonce text not null,
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

-- Attachments
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  file_path text not null,
  file_size bigint not null,
  mime_type text not null,
  encrypted_file_key text not null,
  file_nonce text not null,
  original_filename_ciphertext text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_attachments_message on public.attachments (message_id);

-- Devices & Sessions
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_name text not null,
  device_type text,
  last_active timestamptz default now() not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_devices_user on public.devices (user_id);

-- ------------------------------------------------------------------------------
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
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
-- ------------------------------------------------------------------------------
-- 4. HELPER FUNCTIONS TO BREAK RLS RECURSION AND SAFELY CHECK CROSS-TABLE RULES
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 5. RLS POLICIES (Idempotent drops then creates)
-- ------------------------------------------------------------------------------

-- Profiles
drop policy if exists "Allow viewing discoverable profiles or contacts" on public.profiles;
drop policy if exists "Allow authenticated users to read profiles" on public.profiles;
create policy "Allow authenticated users to read profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- User Settings
drop policy if exists "Users can read own settings" on public.user_settings;
create policy "Users can read own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public Keys
drop policy if exists "Authenticated users can read public keys" on public.public_keys;
create policy "Authenticated users can read public keys"
  on public.public_keys for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users can publish their own public key" on public.public_keys;
create policy "Users can publish their own public key"
  on public.public_keys for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own public key" on public.public_keys;
create policy "Users can update their own public key"
  on public.public_keys for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Conversations & Members
drop policy if exists "Members can view their conversations" on public.conversations;
create policy "Members can view their conversations"
  on public.conversations for select
  using (
    public.is_conversation_member(id, auth.uid())
  );

drop policy if exists "Authenticated users can create conversations" on public.conversations;
create policy "Authenticated users can create conversations"
  on public.conversations for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Members can view conversation members" on public.conversation_members;
create policy "Members can view conversation members"
  on public.conversation_members for select
  using (
    user_id = auth.uid() or public.is_conversation_member(conversation_id, auth.uid())
  );

drop policy if exists "Users can insert conversation members" on public.conversation_members;
create policy "Users can insert conversation members"
  on public.conversation_members for insert
  with check (auth.role() = 'authenticated');

-- Chat Requests
drop policy if exists "Users can view requests they sent or received" on public.chat_requests;
create policy "Users can view requests they sent or received"
  on public.chat_requests for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "Users can send chat requests" on public.chat_requests;
drop policy if exists "Senders can delete pending chat requests" on public.chat_requests;

create policy "Users can send chat requests"
  on public.chat_requests for insert
  with check (
    public.can_send_chat_request(sender_id, recipient_id)
  );

drop policy if exists "Participants can update chat request status" on public.chat_requests;
create policy "Participants can update chat request status"
  on public.chat_requests for update
  using (sender_id = auth.uid() or recipient_id = auth.uid())
  with check (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "Senders can delete pending chat requests"
  on public.chat_requests for delete
  using (sender_id = auth.uid());

-- Blocked Users
drop policy if exists "Users can view their own block list" on public.blocked_users;
create policy "Users can view their own block list"
  on public.blocked_users for select
  using (blocker_id = auth.uid());

drop policy if exists "Users can add to their block list" on public.blocked_users;
create policy "Users can add to their block list"
  on public.blocked_users for insert
  with check (blocker_id = auth.uid());

drop policy if exists "Users can remove from their block list" on public.blocked_users;
create policy "Users can remove from their block list"
  on public.blocked_users for delete
  using (blocker_id = auth.uid());

-- Messages
drop policy if exists "Members can view messages in their conversations" on public.messages;
create policy "Members can view messages in their conversations"
  on public.messages for select
  using (
    public.is_conversation_member(conversation_id, auth.uid())
  );

drop policy if exists "Members can insert messages if not blocked" on public.messages;
create policy "Members can insert messages if not blocked"
  on public.messages for insert
  with check (
    public.can_send_message(conversation_id, sender_id)
  );

drop policy if exists "Senders can edit or soft-delete their own messages; recipients can update read status" on public.messages;
create policy "Senders can edit or soft-delete their own messages; recipients can update read status"
  on public.messages for update
  using (
    sender_id = auth.uid()
    or public.is_conversation_member(conversation_id, auth.uid())
  );

-- Attachments
drop policy if exists "Conversation members can view attachments" on public.attachments;
create policy "Conversation members can view attachments"
  on public.attachments for select
  using (
    exists (
      select 1 from public.messages m
      where m.id = attachments.message_id and public.is_conversation_member(m.conversation_id, auth.uid())
    )
  );

drop policy if exists "Senders can insert attachments for their messages" on public.attachments;
create policy "Senders can insert attachments for their messages"
  on public.attachments for insert
  with check (
    exists (
      select 1 from public.messages m
      where m.id = attachments.message_id and m.sender_id = auth.uid()
    )
  );

-- Devices
drop policy if exists "Users can view their own devices" on public.devices;
create policy "Users can view their own devices"
  on public.devices for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert their own device" on public.devices;
create policy "Users can insert their own device"
  on public.devices for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own device" on public.devices;
create policy "Users can update their own device"
  on public.devices for update
  using (user_id = auth.uid());

drop policy if exists "Users can delete their own device" on public.devices;
create policy "Users can delete their own device"
  on public.devices for delete
  using (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 5. RPC FUNCTIONS
-- ------------------------------------------------------------------------------

-- Accept chat request and atomically create conversation
create or replace function public.accept_chat_request(request_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  req record;
  new_conv_id uuid;
begin
  select * into req
  from public.chat_requests
  where id = request_id and recipient_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'Chat request not found or not eligible for acceptance';
  end if;

  if exists (
    select 1 from public.blocked_users
    where (blocker_id = req.sender_id and blocked_id = req.recipient_id)
       or (blocker_id = req.recipient_id and blocked_id = req.sender_id)
  ) then
    raise exception 'Cannot accept request between blocked users';
  end if;

  update public.chat_requests
  set status = 'accepted', updated_at = now()
  where id = request_id;

  insert into public.conversations (created_at, updated_at)
  values (now(), now())
  returning id into new_conv_id;

  insert into public.conversation_members (conversation_id, user_id, joined_at)
  values
    (new_conv_id, req.sender_id, now()),
    (new_conv_id, req.recipient_id, now());

  return new_conv_id;
end;
$$;

-- Delete user account and wipe all records
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

  delete from public.public_keys where user_id = target_user_id;
  delete from public.user_settings where user_id = target_user_id;
  delete from public.devices where user_id = target_user_id;
  delete from public.blocked_users where blocker_id = target_user_id or blocked_id = target_user_id;
  delete from public.chat_requests where sender_id = target_user_id or recipient_id = target_user_id;
  delete from public.profiles where id = target_user_id;
  delete from auth.users where id = target_user_id;
end;
$$;

-- ------------------------------------------------------------------------------
-- 6. REALTIME PUBLICATION SETUP
-- ------------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.chat_requests;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversation_members;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.devices;
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------------------------
-- 7. STORAGE BUCKET & STORAGE RLS POLICIES
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'encrypted-attachments',
  'encrypted-attachments',
  false,
  52428800,
  array[
    'application/octet-stream',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 52428800;

drop policy if exists "Allow authenticated upload of encrypted attachments" on storage.objects;
create policy "Allow authenticated upload of encrypted attachments"
on storage.objects for insert
with check (
  bucket_id = 'encrypted-attachments'
  and auth.role() = 'authenticated'
);

drop policy if exists "Allow conversation participants to read encrypted attachments" on storage.objects;
create policy "Allow conversation participants to read encrypted attachments"
on storage.objects for select
using (
  bucket_id = 'encrypted-attachments'
  and auth.role() = 'authenticated'
);

drop policy if exists "Allow uploader to delete encrypted attachments" on storage.objects;
create policy "Allow uploader to delete encrypted attachments"
on storage.objects for delete
using (
  bucket_id = 'encrypted-attachments'
  and auth.uid() = owner
);
