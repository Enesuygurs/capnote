# Capnote

Electron.js kullanılarak geliştirilmiş modern not ve günlük uygulaması (Capnote).

## Özellikler

- **Sesli Not Alma**: Web Speech API kullanarak konuşmanızı metne dönüştürme
- **Not Yönetimi**: Notları kaydetme, düzenleme ve silme
- **Arama**: Notlar arasında arama yapma
- **Çapraz Platform**: Windows, macOS ve Linux desteği
- **Modern Arayüz**: Kullanıcı dostu ve minimalist tasarım

## Kurulum

### Gereksinimler
- Node.js (14.0 veya üstü)
- npm veya yarn

### Adımlar

1. Projeyi klonlayın veya indirin
2. Bağımlılıkları yükleyin:
   ```cmd
   npm install
   ```

3. Uygulamayı geliştirme modunda çalıştırın:
   ```cmd
   npm run dev
   ```

4. Üretim için derleyin:
   ```cmd
   npm run build
   ```

## Kullanım

1. **Yeni Not Oluşturma**: "Yeni Not" butonuna tıklayın
2. **Ses Kaydı**: Kırmızı mikrofon butonuna basarak konuşmaya başlayın
3. **Kaydetme**: Konuşmanız otomatik olarak metne dönüştürülür, "Kaydet" butonuna tıklayın
4. **Not Görüntüleme**: Sol panelden istediğiniz nota tıklayın
5. **Düzenleme**: Not görüntülerken "Düzenle" butonunu kullanın
6. **Arama**: Üst kısımdaki arama kutusunu kullanın

## Teknik Detaylar

### Kullanılan Teknolojiler
- **Electron.js**: Masaüstü uygulama çerçevesi
- **Web Speech API**: Ses tanıma
- **Electron Store**: Veri depolama
- **HTML/CSS/JavaScript**: Arayüz geliştirme

### Proje Yapısı
```
src/
├── main.js              # Ana Electron süreci
├── preload.js           # Güvenlik köprüsü
├── index.html           # Ana HTML dosyası
├── styles.css           # CSS stilleri
├── app.js              # Ana uygulama mantığı
└── speech-recognition.js # Ses tanıma modülü
```

### Ses Tanıma
- **Dil**: Türkçe (tr-TR) varsayılan
- **Sürekli Dinleme**: Evet
- **Ara Sonuçlar**: Gerçek zamanlı görüntüleme
- **Hata Yönetimi**: Kapsamlı hata yakalama

### Veri Depolama
- **Electron Store**: Ana depolama çözümü
- **JSON Format**: Basit ve okunabilir veri formatı
- **Yerel Depolama**: Tüm veriler yerel olarak saklanır

## Klavye Kısayolları

- `Ctrl/Cmd + N`: Yeni not oluştur
- `Ctrl/Cmd + S`: Notu kaydet
- `Esc`: İptal et / Modal'ı kapat

## Geliştirme

### Debug Modu
```cmd
npm run dev
```
Bu komut uygulamayı geliştirici araçlarıyla birlikte açar.

### Build Komutları
- `npm run build`: Tüm platformlar için build
- `npm run build-win`: Sadece Windows için
- `npm run build-mac`: Sadece macOS için
- `npm run build-linux`: Sadece Linux için

## Sorun Giderme

### Ses Tanıma Çalışmıyor
1. Mikrofon izinlerini kontrol edin
2. İnternet bağlantınızı kontrol edin
3. Tarayıcı/uygulama ses ayarlarını kontrol edin

### Notlar Kaydedilmiyor
1. Dosya izinlerini kontrol edin
2. Disk alanını kontrol edin
3. Uygulamayı yeniden başlatın

## Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Push edin (`git push origin feature/AmazingFeature`)
5. Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altında dağıtılmaktadır.

## İletişim

Herhangi bir sorunuz veya öneriniz için issue açabilirsiniz.
