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
for k,az,tr,en,ru in [
 ("pmSaveH","Enter da saxlayır və kartı bağlayır","Enter da kaydeder ve kartı kapatır","Enter also saves and closes the card","Enter тоже сохраняет и закрывает карточку"),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("vlanExists","Bu VLAN artıq var — seçildi: {v}","Bu VLAN zaten var — seçildi: {v}","This VLAN already exists — selected: {v}","Этот VLAN уже есть — выбран: {v}"),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("dw_split","Hissəni parçala","Parçayı böl","Split piece","Разделить"),
 ("dw_splitH","Bir-birinə toxunan xətlər ayrı hissələrə bölünür (məs. otaq divarları, qapılar, pəncərələr ayrı-ayrı)","Birbirine değen çizgiler ayrı parçalara bölünür","Lines that touch each other become separate pieces (e.g. room walls, doors, windows apart)","Соприкасающиеся линии становятся отдельными частями"),
 ("dw_splitNo","Bu hissə artıq bölünməz — bir xətdən ibarətdir","Bu parça bölünemez — tek çizgi","This piece can't be split any further — it is a single line","Эту часть уже нельзя разделить"),
 ("dw_splitDone","{n} hissəyə bölündü","{n} parçaya bölündü","Split into {n} pieces","Разделено на {n} частей"),
 ("dw_moveRf","Otaq köçəndə onun Wi-Fi divarları da köçsün","Oda taşınınca Wi-Fi duvarları da taşınsın","Moving a room also moves its Wi-Fi walls","Перемещать стены Wi-Fi вместе с помещением"),
 ("dw_moveRfH","Açıq olanda Wi-Fi siqnal hesabı divarların yeni yeri ilə aparılır (daha düzgün). Bağlı olanda Wi-Fi divarları köhnə yerdə qalır.","Açıkken Wi-Fi sinyal hesabı duvarların yeni yeriyle yapılır (daha doğru).","On: Wi-Fi signal is worked out with the walls at their new place (more accurate). Off: the Wi-Fi walls stay where they were.","Вкл.: сигнал Wi-Fi считается по новому месту стен (точнее). Выкл.: стены Wi-Fi остаются на старом месте."),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("wfBtn","İnternetdən doldur","İnternetten doldur","Fill from the internet","Заполнить из интернета"),
 ("wfH","Modelin rəsmi datasheet-i internetdə axtarılır; portlar, enerji, ölçülər yoxlamağınız üçün göstərilir","Modelin resmi veri sayfası internette aranır; kontrol için gösterilir","Looks up the model's official datasheet; ports, power and size are shown for you to check","Ищет официальный datasheet модели; данные показываются для проверки"),
 ("wfNoModel","Əvvəl modeli yazın","Önce modeli yazın","Type the model first","Сначала введите модель"),
 ("wfNoKey","İnternetdən avtomatik doldurmaq üçün öz Anthropic API açarınız lazımdır (Ayarlar → AI). Açar Claude abunəliyindən ayrı ödənişlidir, bir axtarış bir neçə sentdir. Açar olmadan datasheet-i brauzerdə açıb dəyərləri özünüz yaza bilərsiniz.","İnternetten otomatik doldurmak için kendi Anthropic API anahtarınız gerekir (Ayarlar → AI).","Filling from the internet needs your own Anthropic API key (Settings → AI); it is billed separately from a Claude subscription, a few cents per lookup. Without a key you can open the datasheet in the browser and type the values.","Нужен собственный ключ Anthropic API (Настройки → AI); он оплачивается отдельно от подписки Claude, несколько центов за поиск. Без ключа можно открыть datasheet в браузере."),
 ("wfSetKey","Açarı daxil et","Anahtarı gir","Enter the key","Ввести ключ"),
 ("wfGoogle","Datasheet-i brauzerdə aç","Veri sayfasını tarayıcıda aç","Open the datasheet in the browser","Открыть datasheet в браузере"),
 ("wfApply","Tətbiq et və kataloqda saxla","Uygula ve katalogda sakla","Apply and keep in the catalog","Применить и сохранить в каталоге"),
]:
    K(k,az,tr,en,ru)
# port map tools
for k,az,tr,en,ru in [
 ("buBtn","Toplu port ayarı","Toplu port ayarı","Bulk port settings","Массовая настройка портов"),
 ("buT","Toplu port ayarı","Toplu port ayarı","Bulk port settings","Массовая настройка портов"),
 ("buH","Port aralığını yazın, dəyişmək istədiyiniz sətirləri işarələyin. İşarələnməyən sahələr toxunulmaz qalır. Hamısı bir «Geri al» addımıdır.","Port aralığını yazın, değiştirmek istediklerinizi işaretleyin. Tek «Geri al» adımı.","Type the ports, tick the rows to change. Unticked settings stay as they are. One Undo step.","Укажите порты и отметьте, что менять. Неотмеченное не меняется. Один шаг отмены."),
 ("buPorts","Portlar","Portlar","Ports","Порты"),("buWhat","Nə","Ne","What","Что"),("buValue","Dəyər","Değer","Value","Значение"),
 ("buDescP","{n} = port nömrəsi, məs. Ofis-{n}","{n} = port numarası","{n} = port number, e.g. Office-{n}","{n} = номер порта"),
 ("buPanel","Panelə ardıcıl bağla","Panele sırayla bağla","Patch in order to panel","Подключить по порядку к панели"),("buFrom","port","port","from port","с порта"),
 ("buApply","Tətbiq et","Uygula","Apply","Применить"),("buNoPorts","Port aralığı düzgün deyil","Port aralığı geçersiz","No valid ports","Нет верных портов"),("buNothing","Heç bir sətir işarələnməyib","Hiçbir satır işaretli değil","Nothing ticked","Ничего не отмечено"),
 ("buPanelFull","{p} paneldə cəmi {n} port var","{p} panelde {n} port var","{p} has only {n} ports","У {p} только {n} портов"),
 ("buPanelBusy","{p} panelin bu portlarına artıq switch bağlıdır: {l}. Köçürülsün?","{p} panelin bu portları dolu: {l}. Taşınsın mı?","These ports of {p} already have a switch: {l}. Move them?","Эти порты {p} уже заняты: {l}. Переместить?"),
 ("buDone","{n} port dəyişdirildi","{n} port değiştirildi","{n} ports changed","Изменено портов: {n}"),
 ("ciBtn","Konfiqurasiyadan","Konfigürasyondan","From config","Из конфигурации"),
 ("ciT","Switch konfiqurasiyasından idxal","Switch konfigürasyonundan içe aktar","Import from the switch configuration","Импорт из конфигурации коммутатора"),
 ("ciH","Switch-in konfiqurasiya mətnini yapışdırın və ya faylı seçin (Cisco: show running-config; FortiSwitch / FortiGate: show full-configuration). VLAN-lar, port rejimi, VLAN, trunk, təsvir, söndürülmüş portlar oxunur. Tətbiqdən əvvəl nəticə göstərilir.","Konfigürasyon metnini yapıştırın veya dosya seçin (Cisco: show running-config; Fortinet: show full-configuration).","Paste the switch configuration or pick the file (Cisco: show running-config; FortiSwitch / FortiGate: show full-configuration). VLANs, port mode, VLAN, trunk, description and shut ports are read and shown before anything changes.","Вставьте конфигурацию (Cisco: show running-config; Fortinet: show full-configuration). Читаются VLAN, режим порта, trunk, описание; результат показывается до применения."),
 ("ciFile","Fayldan","Dosyadan","From a file","Из файла"),("ciPreview","Bax","Önizle","Preview","Просмотр"),("ciApply","Tətbiq et","Uygula","Apply","Применить"),
 ("ciUnknown","Mətn tanınmadı — Cisco IOS və ya Fortinet konfiqurasiyası gözlənilir","Metin tanınmadı","Not recognised — a Cisco IOS or Fortinet configuration is expected","Не распознано — ожидается конфигурация Cisco IOS или Fortinet"),
 ("ciFound","{k}: {v} VLAN, {p} port tapıldı.","{k}: {v} VLAN, {p} port bulundu.","{k}: {v} VLANs, {p} ports found.","{k}: VLAN {v}, портов {p}."),
 ("ciExtra","Bu switch-də olmayan portlar ötürüləcək: {l} (switch-də {n} port var).","Bu switch'te olmayan portlar atlanacak: {l}.","Ports this switch doesn't have are skipped: {l} (it has {n}).","Порты, которых нет у коммутатора, пропущены: {l}."),
 ("ciOver","Artıq doldurulmuş port ayarlarının üstünə yaz","Mevcut ayarların üzerine yaz","Overwrite settings already filled in","Перезаписывать заполненные настройки"),
 ("ciDone","{p} port və {v} VLAN konfiqurasiyadan dolduruldu","{p} port ve {v} VLAN dolduruldu","{p} ports and {v} VLANs filled from the configuration","Заполнено: портов {p}, VLAN {v}"),
 ("miBtn","MAC / ARP cədvəlindən","MAC / ARP tablosundan","From MAC / ARP table","Из таблиц MAC / ARP"),
 ("miT","MAC və ARP cədvəlindən doldur","MAC ve ARP tablosundan doldur","Fill from the MAC and ARP tables","Заполнить из таблиц MAC и ARP"),
 ("miH","Switch-in MAC cədvəlini (hansı MAC hansı portdadır) və router/firewall-un ARP cədvəlini (hansı IP hansı MAC-dadır) birlikdə yapışdırın. Portdakı cihazın MAC və IP-si doldurulur; portda cihaz yoxdursa «planlaşdırılır» statuslu cihaz yaradılır. Çox MAC olan portlar (uplink) ötürülür.","MAC tablosunu ve ARP tablosunu birlikte yapıştırın. Porttaki cihazın MAC ve IP'si doldurulur.","Paste the switch's MAC table (which MAC is on which port) and the router / firewall ARP table (which IP has which MAC) together. The device on each port gets its MAC and IP; a port with no device gets a planned one. Ports with many MACs (uplinks) are skipped.","Вставьте таблицу MAC коммутатора и ARP маршрутизатора вместе. Устройству на порту ставятся MAC и IP; если устройства нет — создаётся «планируемое». Порты с многими MAC (аплинки) пропускаются."),
 ("miFound","{p} portda MAC, {a} IP–MAC cütü tapıldı.","{p} portta MAC, {a} IP–MAC çifti bulundu.","MACs on {p} ports, {a} IP–MAC pairs found.","MAC на {p} портах, пар IP–MAC: {a}."),
 ("miMany","{n} MAC — uplink və ya başqa switch, ötürüldü","{n} MAC — uplink, atlandı","{n} MACs — uplink or another switch, skipped","{n} MAC — аплинк, пропущен"),
 ("miUplink","switch / firewall-a gedir, ötürüldü","switch'e gidiyor, atlandı","goes to a switch / firewall, skipped","ведёт к коммутатору, пропущен"),
 ("miConnect","bu MAC-lı cihaz porta bağlanacaq","bu MAC'li cihaz porta bağlanacak","the device with this MAC will be connected here","устройство с этим MAC будет подключено сюда"),
 ("miNew","yeni cihaz (planlaşdırılır)","yeni cihaz (planlanıyor)","new device (planned)","новое устройство (планируется)"),
 ("miDone","{u} cihaz yeniləndi, {n} yeni cihaz yaradıldı","{u} cihaz güncellendi, {n} yeni","{u} devices updated, {n} new","Обновлено {u}, новых {n}"),
]:
    K(k,az,tr,en,ru)
# table import
for k,az,tr,en,ru in [
 ("tiBtn","Cədvəldən idxal","Tablodan içe aktar","Import from a table","Импорт из таблицы"),
 ("tiT","Cihazları cədvəldən idxal et","Cihazları tablodan içe aktar","Import devices from a table","Импорт устройств из таблицы"),
 ("tiH","Excel / Google Sheets-də xanaları (başlıq sətri ilə birlikdə) kopyalayıb bura yapışdırın və ya CSV faylı seçin. Sütunlar adlarına görə avtomatik tanınır, lazım olsa dəyişin. Eyni adlı cihaz varsa yenilənir. Mərtəbə, otaq və VLAN yoxdursa yaradılır.","Excel / Google Sheets hücrelerini (başlık satırıyla) kopyalayıp yapıştırın veya CSV seçin. Sütunlar adına göre tanınır.","Copy the cells in Excel / Google Sheets (with the header row) and paste them here, or pick a CSV file. Columns are recognised by their names; change them if needed. A device with the same name is updated. Missing floors, rooms and VLANs are created.","Скопируйте ячейки из Excel / Google Sheets (со строкой заголовков) и вставьте, или выберите CSV. Столбцы распознаются по названиям. Устройство с тем же именем обновляется."),
 ("tiPh","Ad	Növ	IP	MAC	Mərtəbə	Otaq\nTV-BDRM-MTFK	TV	192.168.20.50		Bodrum	Mətbəx","Ad	Tür	IP	MAC	Kat	Oda","Name	Kind	IP	MAC	Floor	Room","Имя	Тип	IP	MAC	Этаж	Помещение"),
 ("tiRows","{n} sətir. Hər sütunun üstündə onun hansı məlumat olduğunu yoxlayın:","{n} satır. Her sütunun ne olduğunu kontrol edin:","{n} rows. Check what each column is:","{n} строк. Проверьте, что в каждом столбце:"),
 ("tiSkip","istifadə etmə","kullanma","don't use","не использовать"),
 ("tiSame","Bu adda cihaz artıq varsa:","Bu adda cihaz varsa:","If a device with this name exists:","Если устройство с таким именем есть:"),
 ("tiFill","yalnız boş məlumatlarını doldur","yalnızca boş bilgileri doldur","fill only its empty data","заполнить только пустые данные"),
 ("tiOver","cədvəldəki ilə əvəz et","tablodakiyle değiştir","replace with the table's","заменить данными таблицы"),
 ("tiNew","hər halda yeni cihaz yarat","yine de yeni cihaz oluştur","create a new device anyway","всё равно создать новое"),
 ("tiApply","İdxal et ({n})","İçe aktar ({n})","Import ({n})","Импортировать ({n})"),
 ("tiDone","{n} yeni cihaz, {u} cihaz yeniləndi","{n} yeni cihaz, {u} güncellendi","{n} new devices, {u} updated","Новых {n}, обновлено {u}"),
 ("ti_name","Ad","Ad","Name","Имя"),("ti_kind","Növ","Tür","Kind","Тип"),("ti_brand","Marka","Marka","Brand","Бренд"),("ti_model","Model","Model","Model","Модель"),("ti_ip","IP","IP","IP","IP"),("ti_mac","MAC","MAC","MAC","MAC"),("ti_host","Hostname","Hostname","Hostname","Hostname"),
 ("ti_floor","Mərtəbə","Kat","Floor","Этаж"),("ti_room","Otaq","Oda","Room","Помещение"),("ti_vlan","VLAN","VLAN","VLAN","VLAN"),("ti_serial","Seriya nömrəsi","Seri no","Serial","Серийный №"),("ti_status","Status","Durum","Status","Статус"),("ti_notes","Qeyd","Not","Notes","Примечание"),("ti_asset","İnventar nömrəsi","Demirbaş no","Asset tag","Инв. номер"),("ti_ports","Port sayı","Port sayısı","Ports","Портов"),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("lbBtn","Etiketlər","Etiketler","Labels","Этикетки"),
 ("lbT","Etiket çapı","Etiket yazdırma","Print labels","Печать этикеток"),
 ("lbH","A4 etiket vərəqlərinə çap üçün. QR kodu telefonla oxuyanda eyni məlumat görünür.","A4 etiket sayfalarına yazdırmak için. QR kodu aynı bilgiyi içerir.","For A4 sticker sheets. The QR code holds the same text for scanning with a phone.","Для листов наклеек A4. QR-код содержит тот же текст."),
 ("lbWhat","Nə üçün","Ne için","For","Для"),("lbSize","Etiket ölçüsü","Etiket boyutu","Label size","Размер этикетки"),
 ("lbQr","QR kodu əlavə et","QR kod ekle","Add a QR code","Добавить QR-код"),
 ("lbCount","{n} etiket, {p} vərəq","{n} etiket, {p} sayfa","{n} labels, {p} sheets","{n} этикеток, {p} листов"),
 ("lbNone","Bu növ üçün etiket yoxdur","Bu tür için etiket yok","No labels of this kind","Нет этикеток этого типа"),
 ("lbPrint","Çap et","Yazdır","Print","Печать"),
 ("lb_ports","Switch və panel portları","Switch ve panel portları","Switch and panel ports","Порты коммутаторов и панелей"),
 ("lb_cables","Kabellər (hər ucuna bir)","Kablolar (her uca bir)","Cables (one for each end)","Кабели (по одной на конец)"),
 ("lb_devices","Cihazlar","Cihazlar","Devices","Устройства"),("lb_outlets","Rozetkalar","Prizler","Outlets","Розетки"),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("hT","Dəyişiklik tarixçəsi","Değişiklik geçmişi","Change history","История изменений"),
 ("hH","Bu layihədə edilən hər dəyişiklik vaxtı və tətbiqi ilə. Bu kompüterdə saxlanılır (layihə faylına daxil deyil).","Bu projedeki her değişiklik zamanı ve uygulamasıyla. Bu bilgisayarda saklanır.","Every change made in this project, with time and app. Kept on this computer (not inside the project file).","Каждое изменение проекта со временем и приложением. Хранится на этом компьютере."),
 ("hEmpty","Hələ dəyişiklik yoxdur","Henüz değişiklik yok","No changes yet","Изменений пока нет"),
 ("hClear","Tarixçəni sil","Geçmişi sil","Clear history","Очистить историю"),("hClearQ","Bu layihənin dəyişiklik tarixçəsi silinsin?","Bu projenin geçmişi silinsin mi?","Clear this project's change history?","Очистить историю изменений проекта?"),
 ("hTime","Vaxt","Zaman","Time","Время"),("hApp","Tətbiq","Uygulama","App","Приложение"),("hChange","Dəyişiklik","Değişiklik","Change","Изменение"),
 ("hBld","Bina","Bina","Building","Здание"),("hCable","kabel","kablo","cable","кабель"),("hFloor","Mərtəbə","Kat","Floor","Этаж"),("hRoom","Otaq","Oda","Room","Помещение"),("hRack","Rack","Rack","Rack","Стойка"),
 ("hPorts","port ayarları dəyişdi:","port ayarları değişti:","port settings changed:","изменены порты:"),("hParams","texniki parametrlər dəyişdi","teknik parametreler değişti","technical parameters changed","изменены параметры"),
 ("hMoved","yeri / ölçüsü dəyişdi","yeri / boyutu değişti","moved / resized","перемещено / изменён размер"),("hPlan","çertyoj dəyişdi","çizim değişti","drawing changed","чертёж изменён"),
 ("hf_name","ad","ad","name","имя"),("hf_kind","növ","tür","kind","тип"),("hf_brand","marka","marka","brand","бренд"),("hf_model","model","model","model","модель"),("hf_status","status","durum","status","статус"),("hf_host","hostname","hostname","hostname","hostname"),("hf_ip","IP","IP","IP","IP"),("hf_mac","MAC","MAC","MAC","MAC"),
 ("hf_serial","seriya","seri no","serial","серийный №"),("hf_notes","qeyd","not","notes","примечание"),("hf_ports","port sayı","port sayısı","ports","портов"),("hf_rack","rack","rack","rack","стойка"),("hf_u","U yeri","U yeri","U position","позиция U"),("hf_floor","mərtəbə","kat","floor","этаж"),("hf_room","otaq","oda","room","помещение"),("hf_vlan","VLAN","VLAN","VLAN","VLAN"),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("pmPortsUsed","Bu rack-dakı switch və panellərin istifadədə olan portları / cəmi","Kullanılan portlar / toplam","Ports in use / all ports of this rack's switches and panels","Занято портов / всего"),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("pmUplinks","Switch-lər arası bağlantılar (uplink)","Switch'ler arası bağlantılar (uplink)","Links between switches (uplinks)","Связи между коммутаторами (аплинки)"),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("pmConnect","Birləşdir","Bağlantıyı kur","Connect","Подключить"),("pmConnectAnyway","Yenə də birləşdir (köhnə bağlantı silinəcək)","Yine de bağlantıyı kur","Connect anyway (the old link is removed)","Всё равно подключить"),
 ("pmPendPanelBusy","{pp} artıq {x} portuna bağlıdır","{pp} zaten {x} portuna bağlı","{pp} is already connected to {x}","{pp} уже подключён к {x}"),
 ("pmPendEndBusy","{e} artıq bağlıdır: {x}","{e} zaten bağlı: {x}","{e} is already connected: {x}","{e} уже подключено: {x}"),
 ("pmPendEndPort","{e} üçün port nömrəsini yazın","{e} için port numarası yazın","Type the port number on {e}","Укажите порт на {e}"),
 ("pmPortQ","port №","port no","port no.","№ порта"),("pmPickPanelPort","Panel portunu yazın","Panel portunu yazın","Type the panel port","Укажите порт панели"),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("f_rj45","RJ45 (mis) port","RJ45 (bakır) port","RJ45 (copper) ports","Порты RJ45"),
 ("f_portsSum","Cəmi {n} port; SFP portları {a}–{b} nömrələridir.","Toplam {n} port; SFP portları {a}–{b}.","{n} ports in all; the SFP ports are numbers {a}–{b}.","Всего {n} портов; SFP — с {a} по {b}."),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("k_poeext","PoE extender","PoE uzatıcı","PoE extender","PoE-удлинитель"),("k_ethext","Ethernet extender","Ethernet uzatıcı","Ethernet extender","Ethernet-удлинитель"),
 ("k_hdmiext","HDMI extender (Cat6 üzərindən)","HDMI uzatıcı (Cat6)","HDMI extender (over Cat6)","HDMI-удлинитель (по Cat6)"),("k_usbext","USB / KVM extender","USB / KVM uzatıcı","USB / KVM extender","USB / KVM-удлинитель"),
 ("f_hdmiOut","HDMI çıxış","HDMI çıkış","HDMI out","HDMI выход"),("f_vgaOut","VGA çıxış","VGA çıkış","VGA out","VGA выход"),("f_hdmiIn","HDMI giriş","HDMI giriş","HDMI in","HDMI вход"),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("rkDescHide","Təsvir sütununu gizlət — rack böyük görünsün","Açıklama sütununu gizle — rack büyük görünsün","Hide the description column — draw the rack bigger","Скрыть столбец описания — шкаф крупнее"),
 ("rkDescShow","Təsvir sütununu göstər","Açıklama sütununu göster","Show the description column","Показать столбец описания"),
 ("rkCords","Rack içindəki patch cord-ları göstər","Rack içindeki patch kabloları göster","Show patch cords inside the rack","Показывать патч-корды внутри стойки"),
 ("rkCordsH","Hər iki ucu bu rack-da olan kabellər portdan porta çəkilir; rack-dan çıxan kabellər göstərilmir.","İki ucu bu rack'te olan kablolar porttan porta çizilir.","Cables with both ends in this rack are drawn port to port; cables leaving the rack are not shown.","Кабели, оба конца которых в стойке, рисуются от порта к порту."),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("pmPendChange","Hazırkı bağlantı dəyişəcək: {a} → {b}","Mevcut bağlantı değişecek: {a} → {b}","The current connection changes: {a} → {b}","Текущее подключение изменится: {a} → {b}"),
 ("dSaveH","Dəyişikliklər xanadan çıxanda saxlanır","Değişiklikler alandan çıkınca kaydedilir","Changes are kept as soon as you leave a field","Изменения сохраняются при выходе из поля"),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("f_ipMode","IP necə verilir","IP nasıl verilir","IP assignment","Назначение IP"),("ipStatic","Statik","Statik","Static","Статический"),("ipDhcp","Dinamik (DHCP)","Dinamik (DHCP)","Dynamic (DHCP)","Динамический (DHCP)"),
 ("ipDhcpF","IP (DHCP — istəyə bağlı: rezerv və ya indiki)","IP (DHCP — isteğe bağlı)","IP (DHCP — optional: reservation or current)","IP (DHCP — необязательно)"),
]:
    K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("dgFloors","Mərtəbələr üzrə düz","Katlara göre diz","Arrange by floors","Расставить по этажам"),
 ("dgFloorsH","Solda hər mərtəbənin kartı, sağında o mərtəbənin otaqları və cihazları; bina xarici yerlər sağda ayrıca qutuda","Solda kat kartları, sağında odalar ve cihazlar","Floor cards on the left, each floor's rooms and devices to their right; places outside the building in a box on the right","Слева этажи, справа их помещения и устройства; внешние места — отдельно справа"),
 ("dgFloorsQ","Sxemdəki cihazlar mərtəbə və otaqlarına görə yenidən düzüləcək (öz çəkdiyiniz qutular, yazılar qalır). Davam edilsin?","Cihazlar kat ve odalarına göre yeniden dizilecek. Devam?","Devices are re-arranged by floor and room (boxes and notes you drew stay). Go on?","Устройства будут переставлены по этажам и помещениям. Продолжить?"),
 ("dgFloorN","{n} cihaz","{n} cihaz","{n} devices","устройств: {n}"),
 ("dgOutside","Bina xarici","Bina dışı","Outside the building","Снаружи здания"),("dgOutsideH","həyət, mühafizə, bayır kameraları","bahçe, güvenlik, dış kameralar","yard, guard house, outdoor cameras","двор, охрана, наружные камеры"),
 ("dgNothing","Sxemə qoyulacaq cihaz yoxdur","Şemaya konacak cihaz yok","Nothing to put on the diagram","Нечего размещать"),
 ("dgFilter","Süzgəc","Filtre","Filter","Фильтр"),("dgFilterOn","Yalnız seçilən cihazlar","Yalnızca seçilen cihazlar","Only the chosen devices","Только выбранные"),
 ("dgFCats","Cihaz qrupları","Cihaz grupları","Device groups","Группы устройств"),("dgFHide","Qalanlarını tam gizlət (solğun yox)","Diğerlerini tamamen gizle","Hide the rest completely (not faded)","Остальные скрыть полностью"),
 ("vLinks","Kabellər","Kablolar","Cables","Кабели"),
]:
    K(k,az,tr,en,ru)
