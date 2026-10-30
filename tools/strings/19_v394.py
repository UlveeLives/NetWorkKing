# NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE.
# 3.9.4: panel front accepts any device, factory hostname hint
for k,az,tr,en,ru in [
 ("pmFrontDev","Qoşulan cihaz","Bağlı cihaz","Connected device","Подключённое устройство"),
 ("w_hostDef","Hostname “{h}” zavod adıdır (model adı) və {k} cihazda eynidir. Tövsiyə: hər cihaza ayrıca ad verin ki, DHCP, DNS və loglarda bir-birindən seçilsin.","Hostname “{h}” fabrika adı (model adı) ve {k} cihazda aynı. Öneri: DHCP, DNS ve loglarda ayırt edilmesi için her cihaza ayrı ad verin.","Hostname “{h}” is the factory name (the model) and is shared by {k} devices. Tip: give each device its own name so DHCP, DNS and logs can tell them apart.","Имя хоста «{h}» — заводское (модель) и одинаково у {k} устройств. Совет: дайте каждому своё имя, чтобы различать их в DHCP, DNS и журналах."),
]: K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("pmNeedPort","{n} seçildi — bağlantının yaranması üçün onun port nömrəsini yazın (kabel həmişə bir porta qoşulur).","{n} seçildi — bağlantı için port numarasını yazın (kablo her zaman bir porta takılır).","{n} selected — type its port number to make the connection (a cable always plugs into a port).","Выбрано {n} — введите номер его порта, чтобы создать соединение (кабель всегда подключается к порту)."),
 ("pmPortNo","port №","port no","port #","№ порта"),
 ("tp_bdReqT","Tələb cədvəli","Gereksinim tablosu","Requirements table","Таблица потребностей"),
 ("tp_bdReq","Hər otaq üçün otaq növünə görə lazım olan cihazlar yerləşdirilmiş cihazlarla müqayisə olunur: «2/3» — 3 lazımdır, 2 qoyulub.","Her oda için gereken cihazlar yerleştirilenlerle karşılaştırılır: «2/3» — 3 gerekli, 2 yerleştirildi.","For every room, the devices its type needs are compared with what is placed: “2/3” means 3 needed, 2 placed.","Для каждой комнаты нужные устройства сравниваются с размещёнными: «2/3» — нужно 3, размещено 2."),
]: K(k,az,tr,en,ru)
