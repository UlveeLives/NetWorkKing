# NetWorkKing

Network documentation in one app: **Building structure**, **Topology**, **Port Map**, **Rack U-Layout**, **Fiber backbone**, **CCTV**, **Wi-Fi Plan** and **Summary** (every device in one editable list).
All apps work on the same building data (devices, racks, cables, floors, rooms, VLANs), so a change in one app shows up in all of them.

- Runs in the browser (open `index.html`), as a Windows desktop app (Electron, `build.bat`) and as an installable phone app (PWA).
- Data stays on the device (IndexedDB). Export / import whole projects as `.networkking.json` (older `.networker.json` files open too).
- Imports PortMap 1–3, RackLayout 2 and Wolf Suite 2.0 files.
- Builds floors, rooms, walls, doors, windows and outlets from AutoCAD DXF drawings (`js/core/dxf.js`, no library).
- AI assistant in every app (`js/core/ai.js`) using the user's own Anthropic API key; proposed changes are applied only after the user confirms.
- Device catalog from official data sheets: `catalog/src/*.json` → `python3 tools/build_catalog.py` builds `catalog/catalog.json` (downloaded by the app for online updates) and `js/catalog-data.js` (built-in offline copy).
- Translations: `tools/strings/*.py` → `python3 tools/gen_i18n.py` (Azerbaijani, Turkish, English, Russian).

This repository contains program code only — never project or customer data.

© 2026 Ulvi Badalov. All rights reserved. Proprietary software — see [LICENSE](LICENSE) and [legal/EULA.txt](legal/EULA.txt).

© 2026 Ulvi Badalov. All rights reserved. Proprietary software — see [LICENSE](LICENSE) and [legal/EULA.txt](legal/EULA.txt).
