# Device catalog record (one JSON object per model)

Write a JSON array of these objects. Use `null` for anything the official source does not state. Never guess, never estimate, never copy from a reseller if the vendor page/datasheet is reachable.

```json
{
  "brand": "Fortinet",                      // vendor name exactly as the vendor writes it
  "model": "FortiGate 100F",                // full model as marketed (no abbreviations)
  "sku": ["FG-100F"],                       // order codes / part numbers (array, may be empty)
  "kind": "firewall",                       // one of the KIND list below
  "series": "FortiGate F-Series",
  "desc": "Mid-range NGFW, 22x GE RJ45, 4x 10GE SFP+",   // one short line, English
  "mount": "rack",                          // rack | desktop | wall | ceiling | pole | din | rack-optional
  "u": 1,                                   // rack units (0 if not rack-mount; null if unknown)
  "dims_mm": {"w": 432, "d": 254, "h": 44}, // width, depth, height in mm (null fields if unknown)
  "weight_kg": 3.3,
  "power": {"typ_w": 40, "max_w": 105, "psu": 2, "psu_redundant": true, "input": "100-240V AC"},
  "heat_btu_h": 358,                        // as stated by vendor (null if not stated)
  "airflow": "front-to-back",               // front-to-back | back-to-front | side-to-side | passive | null
  "ports": {"rj45_100m": 0, "rj45_1g": 22, "rj45_mgig": 0, "rj45_10g": 0, "sfp": 4, "sfp_plus": 4, "sfp28": 0, "qsfp_plus": 0, "qsfp28": 0, "console": 1, "usb": 1, "notes": "2x 10GE SFP+ FortiLink"},
  "poe": {"ports": 0, "budget_w": 0, "std": null},          // PoE SOURCE side (switch, NVR). std: 802.3af | 802.3at | 802.3bt | passive-24V
  "poe_in": null,                                          // PoE POWERED side (AP, camera, phone): {"class": "802.3at", "max_w": 13.5}
  "perf": {"switching_gbps": null, "forwarding_mpps": null, "fw_gbps": 20, "ngfw_gbps": 1, "threat_gbps": 1, "ipsec_gbps": 11.5},
  "wifi": null,       // AP only: {"std": "Wi-Fi 6", "streams": "2.4 GHz 2x2, 5 GHz 2x2", "bands": {"2.4": {"tx_dbm": 23, "gain_dbi": 4}, "5": {"tx_dbm": 26, "gain_dbi": 5}, "6": null}, "max_clients": 300, "uplink": "1x 2.5GbE"}
  "camera": null,     // camera only: {"style": "turret", "mp": 4, "resolution": "2688x1520", "sensor": "1/3\" progressive scan CMOS", "lens_mm": [2.8, 4, 6], "hfov_deg": [103, 84, 54], "ir_m": 30, "white_light_m": null, "codec": ["H.265+", "H.265", "H.264+", "H.264"], "max_fps": 25, "ip_rating": "IP67", "ik": null, "power_w": 6.5, "poe_class": "802.3af", "audio": false}
  "nvr": null,        // NVR only: {"channels": 8, "in_mbps": 80, "out_mbps": 80, "hdd_bays": 1, "hdd_max_tb": 10, "raid": [], "poe_ports": 8, "poe_budget_w": 80, "max_mp": 8, "hdmi": 1, "vga": 1}
  "ups": null,        // UPS only: {"va": 3000, "w": 2700, "topology": "line-interactive", "battery_wh": null, "outlets": "8x IEC C13, 1x IEC C19"}
  "source": "https://... (official datasheet or product page that contains the values)",
  "source2": null,
  "verified": "2026-10-28",
  "confidence": "high"   // high = all filled values read from the official source; medium = some values from a secondary but reputable source (say which in "notes")
  ,"notes": null
}
```

KIND list (use exactly): firewall, router, coresw, switch, modem, ont, wlc, ap, server, nas, storage, ups, pdu, camera, nvr, dvr, monitor, workstation, pp, fpp, splice, mediaconv, phone, printer, other.
(coresw = core / aggregation L3 switch; switch = access / PoE switch; pp = copper patch panel; fpp = fiber patch panel / ODF)