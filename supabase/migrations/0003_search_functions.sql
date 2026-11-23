-- Векторный поиск. Расстояние косинусное: чем ближе similarity к 1, тем ближе по смыслу.

-- Поиск по базе знаний для ответов ассистента
create function match_kb_chunks(query_embedding vector(768), k int default 5)
returns table (id bigint, document_id bigint, content text, similarity double precision)
language sql stable as $$
  select c.id, c.document_id, c.content, 1 - (c.embedding <=> query_embedding) as similarity
  from kb_chunks c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit k
$$;

-- Поиск домов по смыслу с обычными фильтрами.
-- filters (все ключи необязательные): deal_type, district_id, min_price, max_price, min_rooms, min_area, min_land
create function match_properties(query_embedding vector(768), filters jsonb default '{}', k int default 5)
returns table (id bigint, similarity double precision)
language sql stable as $$
  select p.id, 1 - (p.search_embedding <=> query_embedding) as similarity
  from properties p
  where p.status = 'active'
    and p.search_embedding is not null
    and (filters ->> 'deal_type'   is null or p.deal_type   =  filters ->> 'deal_type')
    and (filters ->> 'district_id' is null or p.district_id =  filters ->> 'district_id')
    and (filters ->> 'min_price'   is null or p.price_usd   >= (filters ->> 'min_price')::numeric)
    and (filters ->> 'max_price'   is null or p.price_usd   <= (filters ->> 'max_price')::numeric)
    and (filters ->> 'min_rooms'   is null or p.rooms       >= (filters ->> 'min_rooms')::int)
    and (filters ->> 'min_area'    is null or p.area_m2     >= (filters ->> 'min_area')::numeric)
    and (filters ->> 'min_land'    is null or p.land_sotka  >= (filters ->> 'min_land')::numeric)
  order by p.search_embedding <=> query_embedding
  limit k
$$;
