# ⚡ PioNotes Cloudflare Workers & D1 Serverless Dağıtım Kılavuzu

PioNotes API sunucusunu, Cloudflare'in tamamen **ücretsiz ve sınırsız sunucusuz (serverless) edge ağı** üzerinde, **Hono** web çatısı ve **D1 SQL (SQLite)** veritabanı ile yayına alma kılavuzudur.

Bu altyapıyla sunucu bakım masrafınız sıfıra iner ve verileriniz dünyanın her yerinden ışık hızında senkronize olur!

---

## 🛠️ Yerel Kurulum & Geliştirme (Local Development)

### 1. Bağımlılıkları Yükleyin
`server-cloudflare/` klasörünün içindeyken terminalde şu komutu çalıştırın:
```bash
npm install
```

### 2. Yerel D1 Veritabanını İlklendirin
Aşağıdaki komutla yerel D1 simülatöründe tabloları kurun ve varsayılan yöneticiyi ekleyin:
```bash
npx wrangler d1 migrations apply pionotes-db --local --file=schema.sql
```

### 3. Yerel Test Sunucusunu Başlatın
Wrangler ile yerel sunucuyu `http://localhost:8787` üzerinde çalıştırın:
```bash
npm run dev
```

**Eklenti Entegrasyonu:** Eklentinizin Ayarlar (⚙️) menüsündeki Sunucu adresi kısmına `http://localhost:8787` yazıp Kaydet diyerek yerelde hemen test etmeye başlayabilirsiniz!
- *Varsayılan Süper Admin Kullanıcı Adı:* `90220`
- *Varsayılan Şifre:* `pionotes123`

---

## 🚀 Cloudflare Üzerinde Canlıya Alma (Production Deploy)

### 1. Cloudflare Hesabınıza Giriş Yapın
Wrangler aracını kullanarak tarayıcı üzerinden Cloudflare hesabınızı bağlayın:
```bash
npx wrangler login
```

### 2. Canlı Cloudflare D1 Veritabanını Oluşturun
Aşağıdaki komutla bulutta gerçek bir D1 veritabanı oluşturun:
```bash
npx wrangler d1 create pionotes-db
```

**Önemli Adım:** Bu komutu çalıştırdıktan sonra terminalde size bir tablo halinde veritabanı bilgileri ve `database_id` verilecektir. 
Örnek Çıktı:
```toml
[[d1_databases]]
binding = "DB"
database_name = "pionotes-db"
database_id = "xxxx-xxxx-xxxx-xxxx" # <- Bu ID'yi kopyalayın
```
Bu çıktıdaki `database_id` değerini kopyalayıp, `server-cloudflare/wrangler.toml` dosyanızdaki `database_id` alanına yapıştırın ve dosyayı kaydedin.

### 3. Veritabanı Tablolarını Canlıda Kurun (Bulut Migration)
Şema yapısını buluttaki canlı veritabanınıza uygulayın:
```bash
npx wrangler d1 migrations apply pionotes-db --remote --file=schema.sql
```

### 4. Projeyi Dağıtın (Deploy)
Tüm kodları tek tıkla Cloudflare sunucusuz edge ağına gönderin:
```bash
npm run deploy
```

**Tebrikler! 🎉** Terminalde size sunulan public adresi (örn: `https://pionotes-api.username.workers.dev`) kopyalayın. Eklentinizin Ayarlar menüsündeki Sunucu adresi kısmına bu bağlantıyı yapıştırıp Kaydet deyin. Artık sunucusuz PioNotes eklentiniz tamamen canlıda ve ücretsiz olarak hizmetinizdedir!
