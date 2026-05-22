# Assumptions Log

All assumptions made throughout the REMA project. Updated after every section.
Judges reward honest assumptions over false precision.

| # | Section | Assumption Made | Reason / Source |
|---|---|---|---|
| 1 | Section 0 | City is Ho Chi Minh City or comparable Vietnamese delta city | Scenario describes sinking urban city with recurrent flooding; HCMC is the primary real-world reference |
| 2 | Section 0 | Red Cross has at least 1 functioning central warehouse that remains above flood level | Without this, no logistics system is viable; assumed as minimum baseline capacity |
| 3 | Section 0 | Internet connectivity is partially available (degraded, not absent) | Allows for lightweight digital tools; full offline fallback still built in |
| 4 | Section 0 | 3 districts will be affected (using lower bound of 3–4) | Simpler to design concretely; system scales up to 4 with same model |
| 5 | Section A | VNHMDS provides 12–24h advance flood warnings reliably | Needed for pre-flood activation window; VNHMDS is Vietnam's official meteorological body |
| 6 | Section A | Pre-packed EMKs are maintained in central warehouse year-round | Core to Phase 1 speed; cannot pack kits during a flood |
| 7 | Section A | Sub-warehouse sites are pre-identified and elevated above 80cm flood depth | Sub-warehouses must remain operational throughout the event |
| 8 | Section A | Each sub-warehouse has access to 2+ boats/rafts via agreement with local community | Needed for 60–80cm water depth delivery; Red Cross unlikely to own enough boats |
| 9 | Section A | Volunteer safety hard limit: delivery suspended above 80cm water depth | Humanitarian principle; volunteers must not face life-threatening risk |
| 10 | Section A | A defined flood season exists (May–Nov) allowing advance preparedness | Based on Vietnam's monsoon climate; gives Red Cross a preparation window each year |
| 11 | Section A | Red Cross has dry-season preparedness budget to fund Phase 0 activities | Without this, the entire pre-positioning strategy fails — flagged as highest organizational risk |
| 12 | Section B | EMK-3 medications pre-approved by Ministry of Health for volunteer distribution during declared emergencies | Legal requirement for dispensing medication without prescription |
| 13 | Section B | EMK quantities cover 3-day supply per household | After 72h, government health authorities expected to extend support |
| 14 | Section B | Ministry of Health emergency medication reserve can be activated within 6 hours | Based on Vietnam's existing disaster health coordination frameworks |
| 15 | Section B | Two commercial pharmacy distributors have pre-signed agreements with Red Cross at fixed prices | Prevents price gouging; must be arranged in Phase 0 |
| 16 | Section B | District household counts estimated from General Statistics Office data with 15% buffer for informal settlements | No real-time census data available during flood |
| 17 | Section B | Central warehouse remains above flood level throughout entire event | Highest infrastructure risk — must be verified in Phase 0 |
| 18 | Section B | Red Cross has access to minimum 3 trucks for initial dispatch | If fewer available, sub-warehouses stocked sequentially by risk level |
| 19 | Section B | Each district has a pre-identified backup sub-warehouse location | Required for Level 3 contingency — arranged in Phase 0 |
| 20 | Section B | EMK-3 medications stored at MoH district cold storage year-round, not at sub-warehouses | Red Cross community buildings cannot maintain 2–8°C cold chain |
| 21 | Section B | MoH cold storage remains operational and accessible during flood activation | Single cold chain dependency — confirmed at Phase 1 activation |
| 22 | Section B | MoH provides insulated cold boxes for EMK-3 transfer; Red Cross does not procure cold storage equipment | Budget constraint; MoH already has this infrastructure |
| 23 | Section B | All EMK-1 and EMK-2 items sourced with minimum 12-month shelf life at time of assembly | Ensures stock remains valid through full flood season plus dry-season buffer |
| 24 | Section C | Volunteers rely on self-reported household data — no clinical diagnosis | Volunteers are not medically trained; scoring is observation and reporting only |
| 25 | Section C | Vulnerability scoring criteria are pre-printed in Vietnamese on assessment forms | Forms prepared during Phase 0; scoring takes ~3 minutes per household |
| 26 | Section C | EMK-3 stock-out triggers immediate escalation to Ministry of Health reserve | Life-sustaining medication cannot wait for end-of-day reporting |
| 27 | Section C | Prioritization criteria are communicated to communities before flood season | Without pre-communication, scoring appears arbitrary and trust breaks down |
| 28 | Section C | Each delivery run carries a 10% EMK-1 buffer for unregistered households | Unregistered households are inevitable; buffer is factored into stock calculation |
| 29 | Section D | Ward People's Committees have pre-signed MOUs for facility use and data sharing before flood season | Without this, sub-warehouse setup is legally and practically uncertain |
| 30 | Section D | District civil defense maintains radio contact with Operations Center on agreed frequencies throughout the flood | Agreed channel frequencies established in Phase 0 |
| 31 | Section D | 36 volunteers is the minimum viable number; Red Cross maintains roster of 45 with 20% buffer | Accounts for unavailability during flood events |
| 32 | Section D | At least one ward health station per district remains operational throughout the 5–7 day flood event | Required for clinical referral and escalation to function |
| 33 | Section D | At least one logistics contractor has a pre-signed emergency transport agreement with guaranteed availability | Prevents transport failure at Phase 1 activation |
| 34 | Section D | Boat owner agreements are confirmed annually during Phase 0; Red Cross does not own boats | Community asset agreements are the only viable model given budget constraints |
| 35 | Section D | Red Cross maintains at least 4 functioning handheld radios with shared pre-programmed frequency | One per sub-warehouse + one at Operations Center; charged batteries stored before flood season |
| 36 | Section D | Red Cross has a dedicated Partnerships Officer role responsible for maintaining all pre-flood agreements | Without this role, Phase 0 coordination tasks create unacceptable workload on Emergency Coordinator |
| 37 | Section E | Red Cross allocates a defined dry-season operations budget separate from flood response budget | Without this, the annual renewal cycle breaks and REMA degrades year-on-year |
| 38 | Section E | All templates stored in 3 formats: printed hard copies, shared Google Drive folder, and USB offline backup | Ensures templates survive digital failure and staff turnover |
| 39 | Section E | Scaling beyond 6 districts requires a Zone Coordinator tier — out of scope for this version of REMA | Current model is explicitly designed for 3–6 district operations only |
| 40 | Section E | At least 60% of volunteers from the previous flood season are available for the following season | New recruits capped at 40% per team to preserve operational effectiveness |
| 41 | Section E | REMA is designed for recurrent moderate urban flooding (30–80cm, 5–7 days, 3–4 districts) — not catastrophic inundation | If entire city floods above 80cm, REMA transitions to civil defense support role only |
| 42 | Section F | Community buildings used as sub-warehouses have usable furniture (tables, shelving) | If not, add ~5,000,000 VND (~$200) per sub-warehouse for folding tables and basic shelving |
| 43 | Section F | Emergency Coordinator and Warehouse Manager are existing Red Cross permanent staff | REMA does not create new permanent positions; if roles don't exist, add ~$7,200/year for two staff |
| 44 | Section F | 70% EMK consumption rate per activation is the planning assumption for a full 3-district event | Severe event buffer adds ~$18,000; partial activations scale proportionally |
| 45 | Section F | Bulk pricing is 15–20% below retail via pre-signed distributor agreements | Without bulk agreements, unit costs increase ~15% across all EMK types |
| 46 | Section F | Volunteer daily rates are benchmarked to Vietnamese Red Cross volunteer practice | Reflects food, transport, and modest compensation — not professional wages |
| 47 | Section F | 21,000 total households across 3 districts; 70% coverage = ~51,450 beneficiaries per event | Based on GSO ward-level census data with 15% informal settlement buffer |
| 48 | Section F | EMK restocking (~$63,000/year) requires MoH or national Red Cross co-funding | Cannot be covered by Red Cross provincial budget alone — primary fundraising dependency |
| 49 | Section B / Chat 5 | Stock `*Total` fields are updated on each DISPATCH — they represent the current activation's allocation baseline, not a fixed historical figure. Scarcity % is always calculated against the current total. | Simplifies the scarcity check; prevents false positives after resupply. |
| 57 | Chat 21 | System reset resets all trigger conditions, activation state, and phase to 0 — it does not delete the flood_alerts record | Preserves database record integrity; only state is reset, not history |
| 59 | Refresh tokens are stored as SHA-256 hashes — raw token never persisted | Standard security practice; hash is sufficient for lookup and revocation |
| 60 | Avatar images are resized to 128x128 JPEG client-side before upload — max ~25kb | Keeps DB row size manageable; Supabase free tier has row size limits |
| 61 | avatarBase64 stored directly in users table — no separate file storage service | Self-contained; no extra service dependency; acceptable for small team size |
| 62 | socket.io events are broadcast to all connected clients — no per-user or per-district filtering | All operational roles need awareness of system-wide events; filtering adds complexity without meaningful security benefit |
| 63 | mustChangePassword is enforced client-side only — no server middleware blocks API calls | API calls still work with old password; enforcement is a UX gate not a security gate. Real deployment could add server-side check if needed |
| 64 | Per-zone route recommend falls back to hardcoded defaults (15/25/45cm) only when no route records exist in DB | New deployments have no route records; fallback prevents blank map on first load |
| 65 | Fix Session | Zone divider lines use dashed style to distinguish from district outer boundary | Solid white lines inside a district would visually compete with the thick solid outer border — dashes read as subdivisions |
| 66 | Fix Session | District card shows pending = householdsAssessed - deliveredCount computed client-side | DistrictCard already has both fields from dashboard summary; no backend change needed |
| 67 | Fix Session | District card openIncidents row only renders if > 0 | Zero incidents is normal state — showing "0 incidents" adds visual noise with no operational value |
| 68 | Fix Session | District name label font is always white — district identity conveyed by border color alone | Colored text on dark semi-transparent background had insufficient contrast for 3 of the 3 district colors |
| 69 | Volunteer Sync Session | District name label font is always white — district identity conveyed by border color alone | A VOLUNTEER user account always creates a corresponding Volunteer roster record in the same DB transaction. Phone number is required at account creation time for field contact purposes. Community volunteers (no login) can still be created via POST /api/volunteers by a Hub Manager, but this is the exception not the primary path. |