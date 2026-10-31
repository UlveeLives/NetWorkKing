# NetWorkKing — © 2026 Ulvi Badalov. Bütün hüquqlar qorunur / All rights reserved. Proprietary — see LICENSE.
# 3.9.8: low walls do not block camera views
for k,az,tr,en,ru in [
 ("dw_low","Alçaq divar (kameranın görüntüsünü bağlamır)","Alçak duvar (kamera görüşünü kapatmaz)","Low wall (does not block camera views)","Низкая стена (не закрывает обзор камер)"),
 ("dw_lowH","İstinad divarı, parapet, alçaq hasar: hündürdə quraşdırılmış kamera onun üstündən baxır.","İstinat duvarı, korkuluk, alçak çit: yüksekteki kamera üstünden görür.","Retaining wall, parapet, low fence: a camera mounted high looks over it.","Подпорная стена, парапет, низкий забор: высоко установленная камера смотрит поверх."),
]: K(k,az,tr,en,ru)
for k,az,tr,en,ru in [
 ("dw_open","Qapı açıqdır (kamera arxasını görür)","Kapı açık (kamera arkasını görür)","Door is open (cameras see through)","Дверь открыта (камеры видят сквозь)"),
 ("dw_openSh","Bu hissədəki qapılar açıqdır (kamera görür)","Bu parçadaki kapılar açık (kamera görür)","Doors in this piece are open (cameras see through)","Двери в этой части открыты (камеры видят)"),
 ("dw_openH","Qapılar adətən bağlı sayılır və kameranın görmə sahəsini kəsir. Açıq saxlanan qapını (məs. dəhlizdən otağa) burada qeyd edin. Bir hissədə bir neçə qapı varsa, «Ayır» ilə ayırıb yalnız lazım olanı açın.","Kapılar kapalı sayılır ve kamera görüşünü keser. Açık duran kapıyı burada işaretleyin; parçada birden fazla kapı varsa «Ayır» ile ayırın.","Doors count as closed and cut camera views. Mark a door that stays open here; if a piece holds several doors, split it first and open only the one you need.","Двери считаются закрытыми и обрывают обзор камер. Отметьте здесь открытую дверь; если в части несколько дверей — сначала разделите её."),
]: K(k,az,tr,en,ru)
