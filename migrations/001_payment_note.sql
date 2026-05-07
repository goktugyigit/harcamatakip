-- Mevcut DB'yi (önceki şemadan) yeni alanlara taşımak için.
-- Yalnızca daha önce schema.sql çalıştırıldıysa gerekli.
ALTER TABLE expenses ADD COLUMN payment_method TEXT;
ALTER TABLE expenses ADD COLUMN note TEXT;
