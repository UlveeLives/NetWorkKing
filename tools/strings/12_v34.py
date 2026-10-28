# NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE.
# v3.4 additions
for k,az,tr,en,ru in [
 ("selAll","{n} cihaz seçildi","{n} cihaz seçildi","{n} devices selected","Выбрано устройств: {n}"),
 ("pmCliOwn","sizin redaktə etdiyiniz mətn","sizin düzenlediğiniz metin","your edited text","ваш изменённый текст"),
 ("pmCliReset","Avtomatik mətnə qayıt","Otomatik metne dön","Back to generated","Вернуть автоматический"),
 ("pmCliFile",".txt kimi saxla",".txt olarak kaydet","Save as .txt","Сохранить как .txt"),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("rkMore","Digər cihazlar…","Diğer cihazlar…","More devices…","Другие устройства…"),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("naT","Aid deyil (-) — bu məlumat bu cihaza aid deyil, çatışmayan kimi göstərilmir","Uygulanmaz (-) — bu bilgi bu cihaz için geçerli değil, eksik olarak gösterilmez","Not applicable (-) — this data doesn't apply to the device and is not reported as missing","Неприменимо (-) — эти данные не относятся к устройству и не считаются отсутствующими"),
 ("naOpt","aid deyil","uygulanmaz","n/a","н/п"),
 ("naDone","Aid deyil kimi qeyd edildi","Uygulanmaz olarak işaretlendi","Marked as not applicable","Отмечено как неприменимо"),
 ("naCount","{n} cihazda bəzi məlumatlar «aid deyil» kimi qeyd olunub.","{n} cihazda bazı bilgiler «uygulanmaz» olarak işaretli.","{n} devices have data marked “not applicable”.","У {n} устройств данные отмечены как «неприменимо»."),
 ("naClr","Hamısını yenə yoxla","Hepsini yeniden denetle","Check all again","Проверять всё снова"),
 ("naClrQ","{n} cihazdakı «aid deyil» qeydləri silinsin? Çatışmayan məlumatlar yenidən göstəriləcək.","{n} cihazdaki «uygulanmaz» işaretleri silinsin mi? Eksikler yeniden gösterilecek.","Remove the “not applicable” marks from {n} devices? Missing data will be reported again.","Снять отметки «неприменимо» у {n} устройств? Недостающие данные снова будут показаны."),
]:
    K(k,az,tr,en,ru)
# drawing tools
for k,az,tr,en,ru in [
 ("dw_secWalls","Divarlar və sərhədlər","Duvarlar ve sınırlar","Walls and outlines","Стены и контуры"),
 ("dw_wall","Divar","Duvar","Wall","Стена"),
 ("dw_wallC","Əyri divar","Eğri duvar","Curved wall","Кривая стена"),
 ("dw_bound","Həyət / sahə sərhədi","Bahçe / arsa sınırı","Yard / plot outline","Граница участка"),
 ("dw_house","Binanın xarici sərhədi","Binanın dış sınırı","Building outline","Внешний контур здания"),
 ("dw_wallHint","Divar: alətə basın, planda basıb çəkin. Uclar digər divarların uclarına yapışır; Shift — 15° addımla. Sərhəd: künclərə bir-bir klikləyin, birinci küncə qayıdın və ya Enter.","Duvar: araca basın, planda basılı tutup çekin. Uçlar diğer duvarların uçlarına yapışır; Shift — 15° adım. Sınır: köşelere tek tek tıklayın, ilk köşeye dönün veya Enter.","Wall: pick the tool, then press and drag on the plan. Ends snap to other walls; Shift keeps 15° steps. Outline: click each corner, then the first corner again or Enter.","Стена: выберите инструмент, нажмите и протяните на плане. Концы прилипают к другим стенам; Shift — шаг 15°. Контур: щёлкайте по углам, затем по первому углу или Enter."),
 ("dw_polyHint","Künclərə klikləyin. Bağlamaq üçün birinci küncə klikləyin, iki dəfə klikləyin və ya Enter; Esc — ləğv.","Köşelere tıklayın. Kapatmak için ilk köşeye tıklayın, çift tıklayın veya Enter; Esc — iptal.","Click the corners. Click the first corner, double-click or press Enter to close; Esc cancels.","Щёлкайте по углам. Чтобы замкнуть — первый угол, двойной щелчок или Enter; Esc — отмена."),
 ("dw_len","Uzunluq","Uzunluk","Length","Длина"),
 ("dw_ang","Bucaq","Açı","Angle","Угол"),
 ("dw_thick","Qalınlıq","Kalınlık","Thickness","Толщина"),
 ("dw_bend","Əyilmə","Eğrilik","Bend","Изгиб"),
 ("dw_mat","Material (Wi-Fi üçün də)","Malzeme (Wi-Fi için de)","Material (also for Wi-Fi)","Материал (и для Wi-Fi)"),
 ("dw_next","Növbəti divar","Sonraki duvar","Next wall","Следующая стена"),
 ("dw_wallInfo","Qövs uzunluğu: {a} m.","Yay uzunluğu: {a} m.","Arc length: {a} m.","Длина дуги: {a} м."),
 ("dw_wallHint2","Ucları çəkərək uzadın, ortadakı kvadratı çəkərək əyin. Əyilmə 0° = düz, 90° = dörddəbir dairə, mənfi — o biri tərəfə. Bu divar Wi-Fi Plan-da da görünür.","Uçları çekerek uzatın, ortadaki kareyi çekerek eğin. Eğrilik 0° = düz, 90° = çeyrek daire, eksi — diğer tarafa. Bu duvar Wi-Fi Plan'da da görünür.","Drag the ends to stretch it, drag the middle square to bend it. Bend 0° = straight, 90° = quarter circle, negative = the other way. This wall also counts in Wi-Fi Plan.","Тяните концы, чтобы удлинить, средний квадрат — чтобы изогнуть. 0° — прямая, 90° — четверть круга, минус — в другую сторону. Стена учитывается и в Wi-Fi Plan."),
 ("dw_bendH","Çəkərək əyin","Çekerek eğin","Drag to bend","Тяните, чтобы изогнуть"),
 ("dw_rotH","Çəkərək döndərin (Shift — 15°)","Çekerek döndürün (Shift — 15°)","Drag to turn (Shift: 15° steps)","Тяните, чтобы повернуть (Shift — 15°)"),
 ("dw_bStyle","Görünüş","Görünüm","Style","Вид"),
 ("dw_bInfo","{n} nöqtə · {w} × {h} m","{n} nokta · {w} × {h} m","{n} points · {w} × {h} m","{n} точек · {w} × {h} м"),
 ("dw_bHint","Nöqtələri çəkərək yerini dəyişin. Xətt üzərində iki dəfə klik — yeni nöqtə; Alt + nöqtəyə klik — nöqtəni sil.","Noktaları çekerek taşıyın. Çizgi üzerinde çift tık — yeni nokta; Alt + noktaya tık — noktayı sil.","Drag the points to reshape. Double-click on the line adds a point; Alt + click on a point removes it.","Перетаскивайте точки. Двойной щелчок по линии — новая точка; Alt + щелчок по точке — удалить её."),
 ("dw_outlines","Otaq sərhədlərini göstər (qırıq xətt)","Oda sınırlarını göster (kesikli)","Show room outlines (dashed)","Показывать границы помещений (пунктир)"),
 ("dw_vec","Çertyojun özünü redaktə et","Çizimin kendisini düzenle","Edit the drawing itself","Редактировать сам чертёж"),
 ("dw_bgop","Orijinal çertyoj (fon)","Orijinal çizim (arka plan)","Original drawing (background)","Исходный чертёж (фон)"),
 ("dw_vecNoPieces","Bu mərtəbənin mebel və divar hissələri yoxdur (köhnə idxal). DXF faylını yenidən «bu layihənin üzərinə» idxal etsəniz, çertyoj hissə-hissə redaktə olunacaq. İndi yalnız Wi-Fi divarları göstərilir.","Bu katın mobilya ve duvar parçaları yok (eski içe aktarım). DXF'i yeniden «bu projenin üzerine» içe aktarırsanız çizim parça parça düzenlenebilir. Şimdi yalnızca Wi-Fi duvarları gösteriliyor.","This floor has no furniture / wall pieces (older import). Import the DXF again “over this project” to edit the drawing piece by piece. Only the Wi-Fi walls are shown now.","У этого этажа нет частей мебели и стен (старый импорт). Импортируйте DXF снова «поверх проекта», чтобы редактировать чертёж по частям. Сейчас показаны только стены Wi-Fi."),
 ("dw_pcHint","Çəkərək yerini dəyişin, sarı nöqtə ilə döndərin, künc kvadratı ilə ölçüsünü dəyişin; Delete — silin.","Çekerek taşıyın, sarı nokta ile döndürün, köşe karesi ile boyutlandırın; Delete — silin.","Drag to move, turn with the yellow dot, resize with the corner square; Delete removes it.","Перетаскивайте, поворачивайте жёлтой точкой, меняйте размер угловым квадратом; Delete — удалить."),
 ("dw_pcReset","Əsl ölçü","Asıl boyut","Original size","Исходный размер"),
 ("dw_pcRoom","Aid olduğu otaq","Ait olduğu oda","Belongs to room","Относится к помещению"),
 ("dw_pcRoomH","Otaq köçürüləndə onun divarları, qapı və pəncərələri də birlikdə köçür.","Oda taşınınca duvarları, kapı ve pencereleri de birlikte taşınır.","When the room is moved, its walls, doors and windows move with it.","При перемещении помещения его стены, двери и окна перемещаются вместе с ним."),
 ("dw_pc_rwall","Otağın divarları, qapı və pəncərələri","Odanın duvarları, kapı ve pencereleri","Room walls, doors and windows","Стены, двери и окна помещения"),
 ("dw_pc_wall","Divar hissəsi","Duvar parçası","Wall piece","Часть стены"),
 ("dw_pc_furn","Mebel / avadanlıq","Mobilya / ekipman","Furniture / fittings","Мебель / оборудование"),
 ("dw_pc_stair","Pilləkən","Merdiven","Stairs","Лестница"),
 ("dw_pc_column","Sütun","Kolon","Column","Колонна"),
 ("dw_pc_site","Həyət xətti","Bahçe çizgisi","Yard line","Линия участка"),
 ("dw_pc_other","Çertyoj hissəsi","Çizim parçası","Drawing piece","Часть чертежа"),
 ("dw_grp_yard","Həyət","Bahçe","Yard","Двор"),
 ("dw_grp_roof","Dam / mansard","Çatı / mansard","Roof / mansard","Крыша / мансарда"),
 ("dw_grp_furn","Mebel","Mobilya","Furniture","Мебель"),
 ("dw_wDupRoom","«{a}» və «{b}» eyni yerdədir — yəqin ki, eyni otaqdır.","«{a}» ve «{b}» aynı yerde — muhtemelen aynı oda.","“{a}” and “{b}” are in the same place — probably the same room.","«{a}» и «{b}» на одном месте — вероятно, одно помещение."),
 ("dw_dupFix","Bu mərtəbədə {n} təkrar otaq var (çertyojdakı adın ikinci nüsxəsindən).","Bu katta {n} tekrar oda var (çizimdeki adın ikinci kopyasından).","This floor has {n} duplicate rooms (from a second copy of the name in the drawing).","На этаже {n} повторных помещений (из второй копии названия в чертеже)."),
 ("dw_dupBtn","Birləşdir","Birleştir","Merge","Объединить"),
 ("dw_dupQ","Bu otaqlar birləşdirilsin? Cihazlar əsas otağa keçəcək.\n{l}","Bu odalar birleştirilsin mi? Cihazlar ana odaya geçecek.\n{l}","Merge these rooms? Their devices move to the main room.\n{l}","Объединить эти помещения? Устройства перейдут в основное.\n{l}"),
 ("bi_boundary","Sərhəd","Sınır","Outline","Контур"),
 ("bi_pool","Hovuz","Havuz","Pool","Бассейн"),("bi_pergola","Pergola / talvar","Pergola / çardak","Pergola","Пергола"),("bi_tree","Ağac","Ağaç","Tree","Дерево"),("bi_bush","Kol","Çalı","Bush","Куст"),
 ("bi_lawn","Çəmən","Çim","Lawn","Газон"),("bi_road","Yol","Yol","Road","Дорога"),("bi_path","Səki / cığır","Yürüyüş yolu","Footpath","Дорожка"),("bi_outstairs","Bayır pilləkəni","Dış merdiven","Outdoor stairs","Наружная лестница"),
 ("bi_fence","Hasar","Çit","Fence","Забор"),("bi_gate","Darvaza","Bahçe kapısı","Gate","Ворота"),("bi_parking","Avtomobil yeri","Otopark","Parking","Парковка"),("bi_terrace","Terras","Teras","Terrace","Терраса"),("bi_fountain","Fəvvarə","Fıskiye","Fountain","Фонтан"),
 ("bi_roofslope","Dam yamacı","Çatı eğimi","Roof slope","Скат крыши"),("bi_dormer","Mansard pəncərəsi","Çatı penceresi (dormer)","Dormer","Слуховое окно"),("bi_skylight","Dam pəncərəsi","Çatı ışıklığı","Skylight","Мансардное окно"),("bi_chimney","Baca","Baca","Chimney","Дымоход"),("bi_balcony","Balkon","Balkon","Balcony","Балкон"),
 ("bi_bed","Çarpayı","Yatak","Bed","Кровать"),("bi_sofa","Divan","Kanepe","Sofa","Диван"),("bi_table","Masa","Masa","Table","Стол"),("bi_chair","Stul","Sandalye","Chair","Стул"),("bi_desk","Yazı masası","Çalışma masası","Desk","Письменный стол"),
 ("bi_wardrobe","Şkaf","Dolap","Wardrobe","Шкаф"),("bi_kitchen","Mətbəx tezgahı","Mutfak tezgahı","Kitchen counter","Кухонная столешница"),("bi_wc","Unitaz","Klozet","Toilet","Унитаз"),("bi_sink","Əlüzyuyan","Lavabo","Sink","Раковина"),("bi_bath","Vanna","Küvet","Bathtub","Ванна"),("bi_shower","Duş","Duş","Shower","Душ"),
]:
    K(k,az,tr,en,ru)
# user device kinds
for k,az,tr,en,ru in [
 ("ukBtn","Öz cihazım","Kendi cihazım","My device","Своё устройство"),
 ("ukT","Siyahıya öz cihaz növünüzü əlavə edin","Listeye kendi cihaz türünüzü ekleyin","Add your own device kind to the list","Добавить свой тип устройства в список"),
 ("ukH","Bir dəfə əlavə etdiyiniz növ bütün layihələrdə bu siyahıda qalır. O, seçdiyiniz oxşar cihaz kimi davranır (portlar, rack hündürlüyü, siyahılar). Kameranın baxış sahəsi, AP siqnalı, NVR kanalları kimi xüsusi funksiyalar yalnız proqramın öz növlərindədir.","Bir kez eklediğiniz tür tüm projelerde bu listede kalır. Seçtiğiniz benzer cihaz gibi davranır (portlar, rack yüksekliği, listeler). Kamera görüş alanı, AP sinyali, NVR kanalları gibi özel işlevler yalnızca programın kendi türlerindedir.","A kind you add stays in this list in every project. It behaves like the similar device you choose (ports, rack height, lists). Special functions — camera view, AP signal, NVR channels — stay with the built-in kinds.","Добавленный тип остаётся в этом списке во всех проектах. Он ведёт себя как выбранное похожее устройство (порты, высота в стойке, списки). Особые функции — обзор камеры, сигнал AP, каналы NVR — только у встроенных типов."),
 ("ukNameP","məs. Hovuz nasosu idarəetmə bloku","örn. Havuz pompası kontrol ünitesi","e.g. Pool pump controller","напр. Контроллер насоса бассейна"),
 ("ukBase","Oxşar cihaz (necə davransın)","Benzer cihaz (nasıl davransın)","Similar to (how it behaves)","Похоже на (как себя ведёт)"),
 ("ukIcon","Nişan","Simge","Icon","Значок"),
 ("ukH_U","Hündürlük (U)","Yükseklik (U)","Height (U)","Высота (U)"),
 ("ukMine","Əlavə etdiyiniz növlər","Eklediğiniz türler","Kinds you added","Ваши типы"),
 ("ukUsed","istifadə olunur","kullanılıyor","in use","используется"),
 ("ukAdd","Əlavə et","Ekle","Add","Добавить"),
 ("ukNoName","Ad yazın","Ad yazın","Enter a name","Введите название"),
 ("ukDup","«{n}» adlı növ artıq var","«{n}» adlı tür zaten var","A kind named “{n}” already exists","Тип «{n}» уже есть"),
 ("ukDone","«{n}» siyahıya əlavə edildi","«{n}» listeye eklendi","“{n}” added to the list","«{n}» добавлен в список"),
]:
    K(k,az,tr,en,ru)
