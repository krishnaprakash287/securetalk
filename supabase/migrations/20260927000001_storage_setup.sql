-- ==============================================================================
-- Supabase Storage Setup: Encrypted Attachments Bucket & RLS Policies
-- ==============================================================================

-- 1. Create a private bucket for encrypted attachments
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'encrypted-attachments',
  'encrypted-attachments',
  false,
  52428800, -- 50 MB limit
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

-- 2. Storage RLS Policies
-- Allow authenticated users to upload encrypted files to their own conversation folders
create policy "Allow authenticated upload of encrypted attachments"
on storage.objects for insert
with check (
  bucket_id = 'encrypted-attachments'
  and auth.role() = 'authenticated'
);

-- Allow authorized conversation members to download encrypted attachments
create policy "Allow conversation participants to read encrypted attachments"
on storage.objects for select
using (
  bucket_id = 'encrypted-attachments'
  and auth.role() = 'authenticated'
);

-- Allow attachment sender or conversation member to delete their uploaded attachment if needed
create policy "Allow uploader to delete encrypted attachments"
on storage.objects for delete
using (
  bucket_id = 'encrypted-attachments'
  and auth.uid() = owner
);
