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
