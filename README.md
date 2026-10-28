# NetWorker

Network documentation in one app: **Building structure**, **Topology**, **Port Map**, **Rack cabinets**, **Fiber backbone**, **CCTV** and **Wi-Fi Plan**.
All apps work on the same building data (devices, racks, cables, floors, rooms, VLANs), so a change in one app shows up in all of them.

- Runs in the browser (open `index.html`), as a Windows desktop app (Electron, `build.bat`) and as an installable phone app (PWA).
- Data stays on the device (IndexedDB). Export / import whole projects as `.networker.json`.
- Imports PortMap 1–3, RackLayout 2 and Wolf Suite 2.0 files.
- Device catalog from official data sheets: `catalog/src/*.json` → `python3 tools/build_catalog.py` builds `catalog/catalog.json` (downloaded by the app for online updates) and `js/catalog-data.js` (built-in offline copy).
- Translations: `tools/strings/*.py` → `python3 tools/gen_i18n.py` (Azerbaijani, Turkish, English, Russian).

This repository contains program code only — never project or customer data.
