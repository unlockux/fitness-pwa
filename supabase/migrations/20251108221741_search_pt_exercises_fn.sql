create or replace function public.search_pt_exercises(
  pt_uuid uuid,
  search_query text,
  result_limit integer default 10
)
returns table (
  id uuid,
  name text,
  primary_muscle_group text,
  equipment_required text,
  default_rest_seconds integer,
  instruction_notes text,
  video_link text,
  similarity_score real
)
language sql
stable
as $$
  select
    ec.id,
    ec.name,
    ec.primary_muscle_group,
    ec.equipment_required,
    ec.default_rest_seconds,
    ec.instruction_notes,
    ec.video_link,
    similarity(ec.name, coalesce(search_query, '')) as similarity_score
  from public.exercises_catalog ec
  where ec.pt_id = pt_uuid
    and (
      search_query is null
      or search_query = ''
      or ec.name ilike '%' || search_query || '%'
      or similarity(ec.name, search_query) > 0.2
    )
  order by
    case when search_query is null or search_query = '' then 1 else 0 end,
    similarity(ec.name, coalesce(search_query, '')) desc,
    ec.name asc
  limit greatest(coalesce(result_limit, 10), 1)
$$;
