# Centifi — Android / iOS yerel değişiklik günlüğü

Bu dosya **mağazaya giden sürümlerde** Android ve iOS tarafında yapılan **yerel** (Gradle, Manifest, Info.plist, izinler, imzalama, URL şeması vb.) eklemeleri ve **SDK / araç zinciri** güncellemelerini takip etmek içindir. Saf JavaScript/Expo Router değişiklikleri burada zorunlu değil; önemli olan mağaza incelemesi veya `prebuild` sonrası native farkları etkileyenler.

## Sürüm numaraları nerede?

| Ne | Dosya / kaynak |
|----|----------------|
| Kullanıcıya görünen sürüm (örn. 1.0.0) | `app.json` → `expo.version` |
| Android dahili sürüm (monoton artan) | `app.json` → `expo.android.versionCode` ve `android/app/build.gradle` içindeki `versionCode` |
| Android `versionName` | `android/app/build.gradle` → `versionName` (genelde `expo.version` ile aynı tutulur) |
| iOS build numarası | `app.json` → `expo.ios.buildNumber` |
| iOS kısa sürüm | Xcode / `ios/.../Info.plist` → `CFBundleShortVersionString` (`expo prebuild` ile `app.json` ile hizalanır) |

**Not:** `npx expo prebuild` çalıştırdığınızda birçok native dosya yeniden üretilebilir. Elle `android/` veya `ios/` içinde yaptığınız kalıcı değişiklikleri **config plugin** veya `app.json` / `app.config.js` üzerinden kalıcı hale getirmek iyi olur; aksi halde bir sonraki prebuild’te kaybolur.

## Her mağaza sürümünde doldurulacak şablon

Aşağıdaki bloğu kopyalayıp en üste yapıştırın; eski kayıtlar alta insin.

```markdown
### [App sürümü] — YYYY-MM-DD (Play Store / App Store)

- **Expo SDK:** …
- **React Native:** … (package.json)
- **Android**
  - `compileSdk` / `targetSdk` / `minSdk` değişti mi: …
  - Yeni izin / özellik: …
  - `versionCode`: önceki → yeni
  - ProGuard / shrink / imzalama notu: …
- **iOS**
  - `deploymentTarget` / Xcode gereksinimi: …
  - Yeni `Info.plist` anahtarı / kullanım metni: …
  - `buildNumber`: önceki → yeni
- **Ortak / native modül**
  - Yeni native bağımlılık (örn. `expo-localization`): …
  - Deep link / URL scheme (`centifi`, `app.centifi`): …
- **Mağaza “Yenilikler” metni (kısa):** …
```

---

## Kayıtlar (en yeni üstte)

### [Şablon] — Dokümantasyon eklendi

- **Amaç:** Android / iOS tarafındaki yerel güncellemeleri ve sürüm geçişlerini tek yerde tutmak.
- **Mevcut referans yapılandırma (özet):**
  - **Expo:** `package.json` içinde `expo` sürümü (ör. ~55).
  - **Android:** `applicationId` / `namespace` `app.centifi`; `app.json` içinde `RECORD_AUDIO`, `CAMERA`, `READ_EXTERNAL_STORAGE`, `POST_NOTIFICATIONS` izinleri tanımlı.
  - **iOS:** `bundleIdentifier` `app.centifi`; mikrofon, kamera, fotoğraf kitaplığı kullanım açıklamaları `app.json` → `ios.infoPlist` üzerinden.
  - **URL şemaları:** `centifi`, `app.centifi`; Google iOS client için `CFBundleURLTypes` (prebuild / yapılandırmaya bağlı).
- **Sonraki sürümde:** Yukarıdaki şablonu doldurup gerçek sürüm numarası ve mağaza notunu yazın.

---

## Faydalı bağlantılar (sürüm yükseltirken)

- [Expo SDK changelog](https://expo.dev/changelog) — Expo sürüm atlamasında kırılan / değişen davranışlar.
- [React Native releases](https://github.com/facebook/react-native/releases) — RN minor/major notları.
- Android: [target API requirements (Play)](https://developer.android.com/google/play/requirements/target-sdk) — hedef SDK son tarihleri.
- Apple: [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — izin metinleri ve gizlilik.
