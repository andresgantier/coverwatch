-- Minimal stand-ins for the Supabase platform objects that the CoverWatch schema
-- refers to, so the public schema can be restored into a plain PostgreSQL 17.
-- Only for the restore drill; a real restore goes into a new Supabase project (see RUNBOOK).

-- API roles used in grants and RLS policies
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator noinherit login;
create role supabase_admin nologin;

-- Extensions live in their own schema on Supabase
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Auth: users table (profiles reference it) and the helpers used by RLS policies
create schema if not exists auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb
);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select current_setting('request.jwt.claim.role', true) $$;
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;

-- Storage: the bucket table referenced by the contract PDF setup
create schema if not exists storage;
create table storage.buckets (
  id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text, name text
);
