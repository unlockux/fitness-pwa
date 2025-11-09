alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

update public.profiles
set
  first_name = nullif(split_part(full_name, ' ', 1), ''),
  last_name = nullif(regexp_replace(full_name, '^[^ ]+\s*', ''), '');
