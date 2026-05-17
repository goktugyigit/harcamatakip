-- Kullanıcı telefon numarası (10 hane, başında 0 olmadan).
-- Şifremi unuttum akışı için email + telefon doğrulamasına dayanır.
-- Mevcut kullanıcılar NULL; UI ilk girişte zorunlu modal ile doldurtur.
-- display_name'in aksine telefon değiştirilebilir (kullanıcı erişim kaybetmesin).
ALTER TABLE users ADD COLUMN phone TEXT;

-- Aynı telefonun iki kullanıcı tarafından alınmasını engelle.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique
  ON users(phone)
  WHERE phone IS NOT NULL AND TRIM(phone) != '';
