-- Kullanıcılara display_name (görünen ad) ekle.
-- Tek seferlik set edilir: backend zorlamalı (UPDATE WHERE display_name IS NULL).
-- Mevcut kullanıcıların display_name'i NULL kalır; ilk giriş sonrası UI zorunlu modalla doldurur.
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Aynı görünen adın iki kullanıcı tarafından alınmasını engelle (case-insensitive).
-- NULL ve boş değerleri partial index ile dışla.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_display_name_unique
  ON users(LOWER(display_name))
  WHERE display_name IS NOT NULL AND TRIM(display_name) != '';
