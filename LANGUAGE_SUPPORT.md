# Capnote Çoklu Dil Desteği (Türkçe & English)

## Eklenen Özellikler

Capnote uygulamasına çoklu dil desteği eklendi. Şu anda Türkçe ve İngilizce dilleri desteklenmektedir.

## Yapılan Değişiklikler

### 1. Çeviri Dosyaları (JSON)
- **src/locales/tr.json** - Türkçe çeviriler
- **src/locales/en.json** - İngilizce çeviriler

Her dosya şu kategorilerde çevirileri içerir:
- Uygulama genel metinleri
- Navigasyon menüsü
- Butonlar
- Başlıklar ve tooltip'ler
- Yer tutucular (placeholders)
- İstatistikler
- Sıralama seçenekleri
- Bölümler
- Ayarlar
- Modaller
- Dışa aktarma seçenekleri
- Hatırlatma seçenekleri
- Bildirimler
- Emoji kategorileri
- Görüntüleyici
- Mesajlar

### 2. i18n Yardımcı Dosyası
- **src/renderer/i18n.js** - Dil yönetimi ve çeviri sistemi

Bu dosya şunları içerir:
- Dil dosyalarını yükleme
- Aktif dili değiştirme
- Çevirileri DOM'a uygulama
- LocalStorage'da dil tercihini saklama
- Observer pattern ile dil değişikliklerini bildirme

### 3. HTML Güncellemeleri
**src/renderer/index.html** dosyasına eklenenler:
- i18n.js script import'u
- Tüm metinlere `data-i18n` attribute'ları
- Yer tutucular için `data-i18n-placeholder` attribute'ları
- Tooltip'ler için `data-i18n-title` attribute'ları
- Erişilebilirlik için `data-i18n-aria-label` attribute'ları
- Ayarlar modalına dil seçici (Language Selector)

### 4. JavaScript Güncellemeleri
**src/renderer/app.js** dosyasına eklenenler:
- `languageSelect` DOM elementi
- Dil seçici için event listener
- `loadSettings()` fonksiyonunda dil tercihi yükleme
- `updateDynamicTranslations()` metodu (dinamik içerik güncellemesi için)

### 5. CSS Güncellemeleri
**src/renderer/styles.css**:
- `contenteditable` div'ler için `data-placeholder` desteği

## Kullanım

### Dil Değiştirme
1. Ayarlar butonuna tıklayın (⚙️)
2. "Dil" bölümünde açılır menüden dil seçin:
   - Türkçe
   - English
3. Dil otomatik olarak değişecek ve tercih kaydedilecektir

### Geliştirici Notları

#### Yeni Dil Ekleme
1. `src/locales/` klasörüne yeni JSON dosyası ekleyin (örn. `de.json` Almanca için)
2. Mevcut dil dosyalarını referans alarak tüm anahtarları çevirin
3. `src/renderer/index.html` içindeki language select'e yeni option ekleyin:
   ```html
   <option value="de">Deutsch</option>
   ```

#### Yeni Çeviri Anahtarı Ekleme
1. Her iki dil dosyasına da anahtarı ekleyin:
   ```json
   {
     "section": {
       "newKey": "Yeni Metin"
     }
   }
   ```

2. HTML'de kullanın:
   ```html
   <span data-i18n="section.newKey">Yeni Metin</span>
   ```

3. JavaScript'te kullanın:
   ```javascript
   const text = window.i18n.t('section.newKey');
   ```

#### Attribute Türleri
- `data-i18n` - Metin içeriği için
- `data-i18n-placeholder` - Input/textarea placeholder'ları için
- `data-i18n-title` - Tooltip'ler için
- `data-i18n-aria-label` - Erişilebilirlik etiketleri için

## Teknik Detaylar

### LocalStorage Anahtarı
Dil tercihi `app-language` anahtarı ile saklanır.

### Varsayılan Dil
Uygulama varsayılan olarak Türkçe (`tr`) dilinde açılır.

### Otomatik Uygulama
Dil değiştiğinde:
1. HTML `lang` attribute'u güncellenir
2. Tüm `data-i18n*` attribute'ları yeniden işlenir
3. Dinamik içerik (sayaçlar, istatistikler) güncellenir
4. Tercihiniz LocalStorage'a kaydedilir

## Test Etme

1. Uygulamayı çalıştırın
2. Ayarlar > Dil bölümünden dili değiştirin
3. Tüm menülerin, butonların ve mesajların çevrildiğini kontrol edin
4. Uygulamayı kapatıp tekrar açın - dil tercihinin saklandığını doğrulayın

## Gelecek Geliştirmeler

- [ ] Daha fazla dil desteği (Almanca, Fransızca, İspanyolca vb.)
- [ ] Tarih ve saat formatlarının dile göre ayarlanması
- [ ] RTL (Right-to-Left) dil desteği (Arapça, İbranice vb.)
- [ ] Otomatik dil algılama (tarayıcı/sistem diline göre)
