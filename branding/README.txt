NETWORKKING — LOGO PAKETİ (beta)

Fayllar
  networkking-logo.svg        Əsas loqo (yuvarlaq kvadrat çərçivə ilə) — proqram ikonu, tapşırıq paneli, quraşdırıcı.
  networkking-logo-2048.png   Eyni loqo, 2048×2048 piksel, şəffaf fon.
  networkking-mark.svg        Çərçivəsiz işarə — açılış ekranı, sənədlər, açıq və tünd fon.
  networkking-mark-2048.png   Eyni işarə, 2048×2048 piksel, şəffaf fon.

Redaktə
  SVG faylları vektordur: istənilən ölçüdə keyfiyyət itmir. Inkscape (pulsuz), Adobe Illustrator, Figma
  və ya Affinity Designer ilə açın. Rəngləri, xətləri, «N» hərfini dəyişə bilərsiniz.
  Kətan (canvas) 512×512 qalsın, işarə ortada dursun — kiçik ölçülərdə (16 px) də oxunsun deyə
  çox incə xətt və kiçik yazı əlavə etməyin.

Tətbiq etmək
  Redaktə etdiyiniz SVG-ni (və ya ən azı 1024×1024 PNG-ni) göndərin — bütün ölçüləri
  (16…512 px ikonlar, .ico, PWA ikonları, açılış ekranı) ondan yenidən yaradacağam: tools/make_icons.py

LOQO v2 (branding/v2) — ortada qara fonda neon yaşıl «N», ətrafda veb-qlobus üzərində 8 dairə
  logo-net-*      Variant 1: şəbəkənin 8 təməl simvolu (bulud, router, switch, firewall, server, Wi-Fi, PC, RJ45)
  logo-apps-*     Variant 2: proqramın 8 tətbiqi (Bina, Topologiya, Port Map, Rack, Fiber, CCTV, Wi-Fi Plan, Xülasə)
  *-dark / *-light   tünd və açıq fon
  mark-*          çərçivəsiz (açılış ekranı, sənədlər üçün)
  small-*         kiçik ölçülər üçün sadələşdirilmiş (16–48 px: simvollar oxunmur, yalnız rəngli dairələr)
  *-2048.png      2048×2048 piksel, şəffaf fon
  logo-v2-muqayise.png   hamısı yan-yana
  Yenidən yaratmaq / dəyişmək: python3 tools/make_logo.py (rənglər, simvollar, ölçülər faylın əvvəlindədir)

LOQO v3 (branding/v3) — SEÇİLƏN İSTİQAMƏT
  Şəbəkənin 8 təməl simvolu; «N» dairəsindən hər 8 dairəyə xətt (açılış animasiyası bu xətlərdə oynayacaq);
  arxada ayrıca qlobus yoxdur — 8 dairəni bir-birinə bağlayan xətlər özü qlobusu əmələ gətirir
  (çevrə boyunca qonşular, meridianlar, paralellər, ekvator).
  logo-dark / logo-light, mark-* (çərçivəsiz), small-* (16–48 px), *-2048.png, logo-v3-muqayise.png

LOQO v4 (branding/v4) — arxada qlobus yoxdur, yalnız dairələrin öz əlaqələri:
  - hər dairə əvvəlki və sonrakı dairə ilə oval xətlə (ilk loqodakı rəng #3a4f9e);
  - ortadakı «N» dairəsindən hər dairəyə düz xətt (ilk loqodakı rəng #9fb0e6) — açılış animasiyası bunlarda;
  - hər dairədən qarşısındakı dairənin sağ və solundakı dairələrə nazik, xəfif neon-yaşıl xətt
    (ortadakı dairənin üstündən keçməsin deyə bir az əyilib), başqa dairələrin üstünə çıxmır.
