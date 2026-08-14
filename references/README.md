# References

Reference files explain topology, routing, device/CDF behavior, and design-agent knowledge. They are not executable generators unless explicitly marked otherwise.

- `TotalW_MOS_Sizing_Convention_20260812.md` — **current sizing source of truth** for tsmcN65.
- `Cadence_SKILL_Design_Agent_Knowledge_Base.md` — supporting Cadence/agent knowledge.
- `Folded_Cascode_OTA_V8_REFERENCE.md` — folded-cascode topology/routing reference.
- `tsmcN65_device_catalog.md` — MOS master-name catalog and device-selection guide derived from the user's PDK screenshots; includes `nch/pch`, voltage/threshold/DNW families, and `*_mac`/`*_macx` variants.

The TotalW convention requires explicit `w/l/wf/fingers/simM/totalM/nf/m` assignment and `totalM = NF*M` for every current MOS generator.
