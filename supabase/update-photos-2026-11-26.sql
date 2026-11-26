-- Новые фото фасадов для 13 домов (главная и начало каталога).
-- Выполнить один раз в Supabase → SQL Editor, уже ПОСЛЕ публикации сайта (иначе картинки временно не откроются).
-- Фото, загруженные вручную через админку, не удаляются.
begin;

delete from property_photos where property_id in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13) and url like '/houses/%';

insert into property_photos (property_id, url, position) values
  (1, '/houses/house-36.jpg', 0),
  (2, '/houses/house-42.jpg', 0),
  (3, '/houses/house-34.jpg', 0),
  (4, '/houses/house-39.jpg', 0),
  (5, '/houses/house-41.jpg', 0),
  (6, '/houses/house-35.jpg', 0),
  (7, '/houses/house-44.jpg', 0),
  (8, '/houses/house-43.jpg', 0),
  (9, '/houses/house-38.jpg', 0),
  (10, '/houses/house-33.jpg', 0),
  (11, '/houses/house-37.jpg', 0),
  (12, '/houses/house-45.jpg', 0),
  (13, '/houses/house-40.jpg', 0);

commit;
