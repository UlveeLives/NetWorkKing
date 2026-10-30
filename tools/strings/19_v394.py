# NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE.
# 3.9.4: panel front accepts any device, factory hostname hint
for k,az,tr,en,ru in [
 ("pmFrontDev","Qoşulan cihaz","Bağlı cihaz","Connected device","Подключённое устройство"),
 ("w_hostDef","Hostname “{h}” zavod adıdır (model adı) və {k} cihazda eynidir. Tövsiyə: hər cihaza ayrıca ad verin ki, DHCP, DNS və loglarda bir-birindən seçilsin.","Hostname “{h}” fabrika adı (model adı) ve {k} cihazda aynı. Öneri: DHCP, DNS ve loglarda ayırt edilmesi için her cihaza ayrı ad verin.","Hostname “{h}” is the factory name (the model) and is shared by {k} devices. Tip: give each device its own name so DHCP, DNS and logs can tell them apart.","Имя хоста «{h}» — заводское (модель) и одинаково у {k} устройств. Совет: дайте каждому своё имя, чтобы различать их в DHCP, DNS и журналах."),
]: K(k,az,tr,en,ru)
