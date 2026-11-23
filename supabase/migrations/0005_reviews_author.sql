-- Имя автора отзыва (форма на сайте не требует входа) и три демонстрационных отзыва.
alter table reviews add column if not exists author text check (length(author) <= 60);

insert into reviews (author, rating, text, sentiment, created_at)
select * from (values
  ('Азиза',    5, 'Нашли дом в Юнусабаде за неделю. Менеджер всё объяснил про документы и ипотеку.',                        'positive', now() - interval '9 days'),
  ('Бахтиёр',  4, 'Удобно, что сразу видно, дороже дом рынка или нет. Оценка цены совпала с оценщиком банка.',              'positive', now() - interval '5 days'),
  ('Малика',   5, 'Ассистент подобрал варианты под мой бюджет и участок. Записали на просмотр в тот же день.',              'positive', now() - interval '2 days')
) as v(author, rating, text, sentiment, created_at)
where not exists (select 1 from reviews);
