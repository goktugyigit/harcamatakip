-- Admin rolü ve "kişileri birleştir" yetkisi.
-- can_merge default kapalı; admin tek tek açar/kapatır.
-- is_admin sadece DB üzerinden değiştirilebilir (panel'den toggle YOK — kritik).
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN can_merge INTEGER NOT NULL DEFAULT 0;

-- İlk admin: ilk kayıt olan kullanıcının email'i.
-- Eğer farklı bir email kullanıyorsan bu UPDATE'i o email ile çalıştır.
UPDATE users SET is_admin = 1, can_merge = 1 WHERE email = 'goktuygt@gmail.com';
