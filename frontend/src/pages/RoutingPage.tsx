// RoutingPage.tsx
// V2 — Routing Map with Leaflet + zone controls + route history
// Uses react-leaflet v4 + OpenStreetMap (no API key required)

import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { routesApi } from '../api/routes';
import type { Route, RouteLog, DeliveryMode } from '../api/routes';
import { api } from '../api/client';
import type { DistrictCard } from '../api/dashboard.types';

// ─── DELIVERY MODE CONFIG ─────────────────────────────────────────────────────
// Section A.4 tiers — locked, do not modify
const MODE_CONFIG: Record<DeliveryMode, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  depth: string;
  fillColor: string;
  opacity: number;
}> = {
  MOTORBIKE: {
    label: 'Motorbike',
    color: 'text-accent-green',
    bgColor: 'bg-accent-green/10',
    borderColor: 'border-accent-green/30',
    icon: '🏍',
    depth: '0–30 cm',
    fillColor: '#3fb950',
    opacity: 0.25,
  },
  BICYCLE_OR_FOOT: {
    label: 'Bicycle / Foot',
    color: 'text-accent-yellow',
    bgColor: 'bg-accent-yellow/10',
    borderColor: 'border-accent-yellow/30',
    icon: '🚲',
    depth: '30–60 cm',
    fillColor: '#d29922',
    opacity: 0.35,
  },
  BOAT: {
    label: 'Boat',
    color: 'text-accent-blue',
    bgColor: 'bg-accent-blue/10',
    borderColor: 'border-accent-blue/30',
    icon: '⛵',
    depth: '60–80 cm',
    fillColor: '#58a6ff',
    opacity: 0.45,
  },
  SUSPENDED: {
    label: 'SUSPENDED',
    color: 'text-accent-red',
    bgColor: 'bg-accent-red/10',
    borderColor: 'border-accent-red/30',
    icon: '⛔',
    depth: '> 80 cm',
    fillColor: '#f85149',
    opacity: 0.55,
  },
};

// ─── HCMC DISTRICT APPROXIMATIONS ─────────────────────────────────────────────
// Approximate bounding polygons for 3 low-lying HCMC districts
// (Binh Thanh, Go Vap, District 8 — classic flood-prone areas)
const DISTRICT_POLYGONS: Record<string, [number, number][]> = {
  'District 1': [
    [10.788, 106.648],
    [10.788, 106.685],
    [10.765, 106.685],
    [10.765, 106.648],
  ],
  'District 2': [
    [10.802, 106.700],
    [10.802, 106.735],
    [10.778, 106.735],
    [10.778, 106.700],
  ],
  'District 3': [
    [10.755, 106.638],
    [10.755, 106.675],
    [10.730, 106.675],
    [10.730, 106.638],
  ],
};

const DISTRICT_CENTERS: Record<string, [number, number]> = {
  'District 1': [10.7765, 106.6665],
  'District 2': [10.790, 106.7175],
  'District 3': [10.7425, 106.6565],
};

// ─── DEPTH → MODE HELPER ─────────────────────────────────────────────────────
function depthToMode(depth: number): DeliveryMode {
  if (depth <= 30) return 'MOTORBIKE';
  if (depth <= 60) return 'BICYCLE_OR_FOOT';
  if (depth <= 80) return 'BOAT';
  return 'SUSPENDED';
}

// ─── DEPTH SLIDER COMPONENT ───────────────────────────────────────────────────
function DepthSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const mode = depthToMode(value);
  const cfg = MODE_CONFIG[mode];

  return (
    <div className="bg-bg-elevated rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
          {label}
        </span>
        <span className={`font-mono text-[10px] font-semibold ${cfg.color}`}>
          {cfg.icon} {cfg.label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={120}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-accent-blue cursor-pointer"
          style={{
            accentColor: value > 80 ? '#f85149' : value > 60 ? '#58a6ff' : value > 30 ? '#d29922' : '#3fb950',
          }}
        />
        <span className="font-mono text-sm text-text-primary w-14 text-right">
          {value} cm
        </span>
      </div>
      {value > 80 && (
        <p className="font-mono text-[9px] text-accent-red mt-1.5 animate-pulse-slow">
          ⛔ Exceeds 80cm — delivery SUSPENDED per Section A.4
        </p>
      )}
    </div>
  );
}

// ─── LEAFLET MAP COMPONENT ────────────────────────────────────────────────────
// Lazy-loaded to avoid SSR issues (Vite handles this fine)
function LeafletMap({
  districts,
  zoneDepths,
  selectedDistrictId,
  onDistrictClick,
}: {
  districts: DistrictCard[];
  zoneDepths: Record<string, Record<string, number>>; // districtName → zone → depth
  selectedDistrictId: string | null;
  onDistrictClick: (districtId: string, districtName: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<ReturnType<typeof window.L.map> | null>(null);
  const polygonsRef = useRef<Record<string, ReturnType<typeof window.L.polygon>>>({});

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // Initialize map
    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [10.762, 106.682],
      zoom: 12,
      zoomControl: true,
    });

    // OpenStreetMap tile layer — free, no API key
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
      polygonsRef.current = {};
    };
  }, []);

  // Update polygons when districts or depths change
  useEffect(() => {
    const L = window.L;
    const map = leafletMapRef.current;
    if (!map || !L) return;

    // Remove existing polygons
    Object.values(polygonsRef.current).forEach(p => p.remove());
    polygonsRef.current = {};

    districts.forEach((d) => {
      const coords = DISTRICT_POLYGONS[d.name];
      if (!coords) return;

      const depths = zoneDepths[d.name] ?? {};
      const avgDepth = Object.values(depths).length > 0
        ? Math.round(Object.values(depths).reduce((a, b) => a + b, 0) / Object.values(depths).length)
        : 0;
      const mode = depthToMode(avgDepth);
      const cfg = MODE_CONFIG[mode];

      const isSelected = selectedDistrictId === d.districtId;

      const polygon = L.polygon(coords, {
        color: isSelected ? '#ffffff' : cfg.fillColor,
        weight: isSelected ? 3 : 2,
        fillColor: cfg.fillColor,
        fillOpacity: cfg.opacity,
        dashArray: isSelected ? undefined : '4 4',
      }).addTo(map);

      // Label in center
      const center = DISTRICT_CENTERS[d.name] ?? [coords[0][0], coords[0][1]];
      const label = L.divIcon({
        className: '',
        html: `
          <div style="
            background: rgba(17,20,24,0.9);
            border: 1px solid ${cfg.fillColor};
            border-radius: 6px;
            padding: 4px 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            color: #e6edf3;
            white-space: nowrap;
            cursor: pointer;
          ">
            <span style="color: ${cfg.fillColor}">${cfg.icon}</span>
            ${d.name}
            <span style="color: #8b949e; font-size: 9px; display: block; text-align: center;">
              ${avgDepth}cm · ${cfg.label}
            </span>
          </div>
        `,
        iconAnchor: [60, 20],
      });
      L.marker(center as [number, number], { icon: label }).addTo(map);

      polygon.on('click', () => {
        onDistrictClick(d.districtId, d.name);
      });

      polygonsRef.current[d.districtId] = polygon;
    });
  }, [districts, zoneDepths, selectedDistrictId, onDistrictClick]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-lg overflow-hidden"
      style={{ minHeight: 400 }}
    />
  );
}

// Extend Window for Leaflet global
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}

// ─── ROUTE LOG ROW ────────────────────────────────────────────────────────────
function RouteLogRow({ log }: { log: RouteLog }) {
  const prevCfg = MODE_CONFIG[log.previousMode];
  const newCfg = MODE_CONFIG[log.newMode];

  return (
    <div className="px-4 py-2.5 border-b border-bg-border last:border-0 hover:bg-bg-elevated/40 transition-colors duration-75">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-[10px] text-text-muted">
              {log.route?.district?.name ?? '?'} · Zone {log.route?.zone}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`font-mono text-[10px] ${prevCfg.color}`}>
              {log.previousDepth}cm
            </span>
            <span className="font-mono text-[10px] text-text-muted">→</span>
            <span className={`font-mono text-[10px] font-semibold ${newCfg.color}`}>
              {log.newDepth}cm · {newCfg.icon} {newCfg.label}
            </span>
          </div>
        </div>
        <span className="font-mono text-[9px] text-text-muted flex-shrink-0">
          {new Date(log.createdAt).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

// ─── MAIN ROUTING PAGE ────────────────────────────────────────────────────────
export function RoutingPage() {
  const [districts, setDistricts] = useState<DistrictCard[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedDistrictName, setSelectedDistrictName] = useState<string | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [logs, setLogs] = useState<RouteLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Zone depths: { districtName → { zoneName → depth } }
  const [zoneDepths, setZoneDepths] = useState<Record<string, Record<string, number>>>({});

  // ─── LOAD LEAFLET CSS + JS ──────────────────────────────────────────────────
  useEffect(() => {
    if (window.L) { setLeafletLoaded(true); return; }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Don't remove — Leaflet registers globally, removing breaks re-renders
    };
  }, []);

  // ─── LOAD DISTRICTS ─────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/api/dashboard/summary').then((res) => {
      const d = res.data.districts ?? [];
      setDistricts(d);

      // Initialize zone depths at 0 for each district
      const initial: Record<string, Record<string, number>> = {};
      d.forEach((dist: DistrictCard) => {
        initial[dist.name] = {
          'Zone A': 0,
          'Zone B': 0,
          'Zone C': 0,
        };
      });
      setZoneDepths(initial);
    }).catch(console.error);
  }, []);

  // ─── LOAD ROUTES FROM BACKEND ────────────────────────────────────────────────
  useEffect(() => {
    if (districts.length === 0) return;

    districts.forEach((d) => {
      routesApi.getDistrictRoutes(d.districtId).then((routes) => {
        if (routes.length === 0) return;
        setZoneDepths(prev => {
          const next = { ...prev };
          if (!next[d.name]) next[d.name] = { 'Zone A': 0, 'Zone B': 0, 'Zone C': 0 };
          routes.forEach(r => {
            next[d.name][r.zone] = r.waterDepthCm;
          });
          return next;
        });
      }).catch(() => {/* no routes yet — keep defaults */});
    });
  }, [districts]);

  // ─── LOAD ROUTE LOGS ─────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await routesApi.getLogs(selectedDistrictId ?? undefined);
      setLogs(data.slice(0, 30));
    } catch {
      // ignore
    } finally {
      setLogsLoading(false);
    }
  }, [selectedDistrictId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ─── HANDLE DISTRICT CLICK ───────────────────────────────────────────────────
  const handleDistrictClick = useCallback((districtId: string, name: string) => {
    setSelectedDistrictId(prev => prev === districtId ? null : districtId);
    setSelectedDistrictName(prev => prev === name ? null : name);
  }, []);

  // ─── HANDLE DEPTH CHANGE ─────────────────────────────────────────────────────
  const handleDepthChange = useCallback((districtName: string, zone: string, depth: number) => {
    setZoneDepths(prev => ({
      ...prev,
      [districtName]: {
        ...(prev[districtName] ?? {}),
        [zone]: depth,
      },
    }));
  }, []);

  // ─── SAVE DEPTH TO BACKEND ───────────────────────────────────────────────────
  const handleSaveDepth = useCallback(async (
    districtId: string,
    districtName: string,
    zone: string,
    depth: number
  ) => {
    const key = `${districtId}:${zone}`;
    setUpdateStatus(prev => ({ ...prev, [key]: 'saving' }));

    try {
      await routesApi.update({ districtId, zone, waterDepthCm: depth });
      setUpdateStatus(prev => ({ ...prev, [key]: 'saved' }));
      setLastUpdated(new Date());
      await fetchLogs();

      setTimeout(() => {
        setUpdateStatus(prev => ({ ...prev, [key]: 'idle' }));
      }, 2000);
    } catch {
      setUpdateStatus(prev => ({ ...prev, [key]: 'error' }));
      setTimeout(() => {
        setUpdateStatus(prev => ({ ...prev, [key]: 'idle' }));
      }, 3000);
    }
  }, [fetchLogs]);

  // Find the selected district object
  const selectedDistrict = districts.find(d => d.districtId === selectedDistrictId);
  const selectedDistrictDepths = selectedDistrictName
    ? (zoneDepths[selectedDistrictName] ?? {})
    : {};

  // Check if any zone is SUSPENDED
  const anySuspended = districts.some(d =>
    Object.values(zoneDepths[d.name] ?? {}).some(depth => depth > 80)
  );

  const ZONES = ['Zone A', 'Zone B', 'Zone C'];

  return (
    <DashboardLayout
      title="Routing Map"
      onRefresh={fetchLogs}
      lastUpdated={lastUpdated}
    >
      {/* SUSPENDED global warning */}
      {anySuspended && (
        <div className="mb-4 bg-accent-red/10 border border-accent-red/40 rounded-lg px-5 py-3 flex items-center gap-3 animate-slide-in">
          <span className="text-xl">⛔</span>
          <div>
            <p className="font-mono text-sm font-semibold text-accent-red">
              DELIVERY SUSPENDED — Water depth exceeds 80cm
            </p>
            <p className="font-mono text-[10px] text-accent-red/70 mt-0.5">
              All volunteer delivery halted in affected zones. Escalate to district civil defense per Section A.4.
              Volunteer safety is a hard constraint — no exceptions.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── MAP (2/3 width) ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Map card */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-sans font-bold text-text-primary">Ho Chi Minh City — Affected Districts</h2>
                <p className="font-mono text-[10px] text-text-muted mt-0.5">
                  Click a district to select and update water depths · Colors reflect delivery mode
                </p>
              </div>
              {/* Mode legend */}
              <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                {(Object.keys(MODE_CONFIG) as DeliveryMode[]).map(mode => {
                  const cfg = MODE_CONFIG[mode];
                  return (
                    <div key={mode} className="flex items-center gap-1">
                      <span className="text-xs">{cfg.icon}</span>
                      <span className={`font-mono text-[9px] ${cfg.color}`}>{cfg.depth}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Map container */}
            <div className="relative rounded-lg overflow-hidden" style={{ height: 420 }}>
              {leafletLoaded ? (
                <LeafletMap
                  districts={districts}
                  zoneDepths={zoneDepths}
                  selectedDistrictId={selectedDistrictId}
                  onDistrictClick={handleDistrictClick}
                />
              ) : (
                <div className="w-full h-full bg-bg-elevated flex items-center justify-center">
                  <p className="font-mono text-sm text-text-muted animate-pulse">Loading map...</p>
                </div>
              )}

              {/* Click hint overlay when no district selected */}
              {!selectedDistrictId && districts.length > 0 && leafletLoaded && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-bg-primary/90 border border-bg-border rounded-lg px-4 py-2 pointer-events-none">
                  <p className="font-mono text-[10px] text-text-muted text-center">
                    Click a district zone to select and update water depths
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* District quick-view cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {districts.map((d) => {
              const depths = zoneDepths[d.name] ?? {};
              const avgDepth = Object.values(depths).length > 0
                ? Math.round(Object.values(depths).reduce((a, b) => a + b, 0) / Object.values(depths).length)
                : 0;
              const mode = depthToMode(avgDepth);
              const cfg = MODE_CONFIG[mode];
              const isSelected = selectedDistrictId === d.districtId;

              return (
                <button
                  key={d.districtId}
                  onClick={() => handleDistrictClick(d.districtId, d.name)}
                  className={`card p-4 text-left transition-all duration-150 hover:border-text-muted/30 ${
                    isSelected ? 'border-accent-blue/40 bg-accent-blue/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-sans font-bold text-text-primary text-sm">{d.name}</h3>
                    <span className={`font-mono text-lg`}>{cfg.icon}</span>
                  </div>
                  <div className={`inline-block font-mono text-[10px] px-2 py-0.5 rounded border ${cfg.bgColor} ${cfg.borderColor} ${cfg.color} mb-2`}>
                    {cfg.label}
                  </div>
                  <div className="space-y-0.5">
                    {ZONES.map(zone => {
                      const zDepth = depths[zone] ?? 0;
                      const zMode = depthToMode(zDepth);
                      const zCfg = MODE_CONFIG[zMode];
                      return (
                        <div key={zone} className="flex justify-between items-center">
                          <span className="font-mono text-[9px] text-text-muted">{zone}</span>
                          <span className={`font-mono text-[9px] ${zCfg.color}`}>
                            {zDepth}cm
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CONTROL PANEL (1/3 width) ── */}
        <div className="space-y-4">

          {/* Zone depth controls */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-sans font-bold text-text-primary">Zone Water Depth</h2>
                <p className="font-mono text-[10px] text-text-muted mt-0.5">
                  {selectedDistrictName
                    ? `Editing: ${selectedDistrictName}`
                    : 'Select a district on the map'}
                </p>
              </div>
              {selectedDistrictName && (
                <span className="font-mono text-[10px] text-accent-blue">
                  Section A.4 tiers
                </span>
              )}
            </div>

            {!selectedDistrictName ? (
              <div className="bg-bg-elevated rounded-lg p-6 text-center">
                <p className="text-2xl mb-2">🗺</p>
                <p className="font-mono text-xs text-text-muted">
                  Click a district on the map or card above to update zone water depths
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {ZONES.map(zone => {
                  const depth = selectedDistrictDepths[zone] ?? 0;
                  const key = `${selectedDistrictId}:${zone}`;
                  const status = updateStatus[key] ?? 'idle';

                  return (
                    <div key={zone}>
                      <DepthSlider
                        label={zone}
                        value={depth}
                        onChange={(v) => handleDepthChange(selectedDistrictName!, zone, v)}
                      />
                      <div className="flex justify-end mt-1.5">
                        <button
                          onClick={() => handleSaveDepth(
                            selectedDistrictId!,
                            selectedDistrictName!,
                            zone,
                            depth
                          )}
                          disabled={status === 'saving'}
                          className={`font-mono text-[10px] px-3 py-1 rounded border transition-all duration-150 ${
                            status === 'saved'
                              ? 'text-accent-green border-accent-green/40 bg-accent-green/10'
                              : status === 'error'
                              ? 'text-accent-red border-accent-red/40 bg-accent-red/10'
                              : status === 'saving'
                              ? 'text-text-muted border-bg-border animate-pulse'
                              : 'text-text-secondary border-bg-border hover:text-text-primary hover:border-text-muted'
                          }`}
                        >
                          {status === 'saving' ? 'Saving...' :
                           status === 'saved' ? '✓ Saved' :
                           status === 'error' ? '✗ Error' : 'Update Backend'}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Mode summary for selected district */}
                <div className="pt-3 border-t border-bg-border">
                  <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-2">
                    Delivery Modes — {selectedDistrictName}
                  </p>
                  {ZONES.map(zone => {
                    const depth = selectedDistrictDepths[zone] ?? 0;
                    const mode = depthToMode(depth);
                    const cfg = MODE_CONFIG[mode];
                    return (
                      <div key={zone} className={`flex items-center justify-between px-3 py-1.5 rounded mb-1 border ${cfg.bgColor} ${cfg.borderColor}`}>
                        <span className="font-mono text-[10px] text-text-secondary">{zone}</span>
                        <div className="flex items-center gap-1.5">
                          <span>{cfg.icon}</span>
                          <span className={`font-mono text-[10px] font-semibold ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section A.4 reference */}
          <div className="card p-4">
            <h3 className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3">
              Section A.4 — Delivery Tiers (Locked)
            </h3>
            <div className="space-y-1.5">
              {(Object.keys(MODE_CONFIG) as DeliveryMode[]).map(mode => {
                const cfg = MODE_CONFIG[mode];
                return (
                  <div key={mode} className={`flex items-center justify-between px-3 py-2 rounded border ${cfg.bgColor} ${cfg.borderColor}`}>
                    <div className="flex items-center gap-2">
                      <span>{cfg.icon}</span>
                      <span className={`font-mono text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <span className="font-mono text-[9px] text-text-muted">{cfg.depth}</span>
                  </div>
                );
              })}
            </div>
            <p className="font-mono text-[9px] text-text-muted mt-3">
              Volunteer safety is a hard constraint. Above 80cm: halt all delivery, escalate to civil defense.
            </p>
          </div>

          {/* Route change log */}
          <div className="card">
            <div className="px-4 py-3 border-b border-bg-border flex items-center justify-between">
              <h3 className="font-sans font-bold text-text-primary text-sm">Route Change Log</h3>
              <button
                onClick={fetchLogs}
                className="font-mono text-[10px] text-text-muted hover:text-text-primary transition-colors"
              >
                ↻ refresh
              </button>
            </div>

            {logsLoading ? (
              <div className="space-y-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="px-4 py-3 border-b border-bg-border">
                    <div className="h-3 bg-bg-elevated rounded animate-pulse mb-1.5 w-3/4" />
                    <div className="h-3 bg-bg-elevated rounded animate-pulse w-1/2" />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="font-mono text-xs text-text-muted">
                  No route changes recorded yet.
                  Update zone depths and click "Update Backend" to create a log entry.
                </p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {logs.map((log) => (
                  <RouteLogRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}