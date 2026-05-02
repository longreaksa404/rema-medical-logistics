// RoutingPage.tsx - V3 Improved + TypeScript Fixed
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { routesApi } from '../api/routes';
import type { RouteLog, DeliveryMode } from '../api/routes';
import { api } from '../api/client';
import type { DistrictCard } from '../api/dashboard.types';

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
  MOTORBIKE: { label: 'Motorbike', color: 'text-accent-green', bgColor: 'bg-accent-green/10', borderColor: 'border-accent-green/30', icon: '🏍', depth: '0–30 cm', fillColor: '#3fb950', opacity: 0.35 },
  BICYCLE_OR_FOOT: { label: 'Bicycle / Foot', color: 'text-accent-yellow', bgColor: 'bg-accent-yellow/10', borderColor: 'border-accent-yellow/30', icon: '🚲', depth: '30–60 cm', fillColor: '#d29922', opacity: 0.45 },
  BOAT: { label: 'Boat', color: 'text-accent-blue', bgColor: 'bg-accent-blue/10', borderColor: 'border-accent-blue/30', icon: '⛵', depth: '60–80 cm', fillColor: '#58a6ff', opacity: 0.50 },
  SUSPENDED: { label: 'SUSPENDED', color: 'text-accent-red', bgColor: 'bg-accent-red/10', borderColor: 'border-accent-red/30', icon: '⛔', depth: '> 80 cm', fillColor: '#f85149', opacity: 0.55 },
};

const DISTRICT_CENTERS: Record<string, [number, number]> = {
  'District 1': [10.820, 106.660],
  'District 2': [10.776, 106.703],
  'District 3': [10.735, 106.668],
};

const CIRCLE_RADIUS = 2800;

function depthToMode(depth: number): DeliveryMode {
  if (depth <= 30) return 'MOTORBIKE';
  if (depth <= 60) return 'BICYCLE_OR_FOOT';
  if (depth <= 80) return 'BOAT';
  return 'SUSPENDED';
}

function DepthSlider({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: number; 
  onChange: (v: number) => void;
}) {
  const mode = depthToMode(value);
  const cfg = MODE_CONFIG[mode];
  const trackColor = cfg.fillColor;

  return (
    <div className="bg-bg-elevated rounded-xl p-4 border border-bg-border">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs text-text-muted uppercase tracking-widest">{label}</span>
        <span className={`font-mono text-sm font-semibold flex items-center gap-1.5 ${cfg.color}`}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={120}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-slider"
          style={{ accentColor: trackColor }}
        />
        <span className="font-mono text-lg font-semibold text-text-primary w-16 text-right tabular-nums">
          {value}<span className="text-xs text-text-muted">cm</span>
        </span>
      </div>

      {value > 80 && (
        <p className="mt-3 text-xs text-accent-red font-medium flex items-center gap-1.5 bg-accent-red/10 px-3 py-1.5 rounded-lg">
          ⛔ Exceeds 80cm — Delivery SUSPENDED (Section A.4)
        </p>
      )}
    </div>
  );
}

function LeafletMap({
  districts,
  zoneDepths,
  selectedDistrictId,
  onDistrictClick,
}: {
  districts: DistrictCard[];
  zoneDepths: Record<string, Record<string, number>>;
  selectedDistrictId: string | null;
  onDistrictClick: (districtId: string, districtName: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const layersRef = useRef<Record<string, any[]>>({});

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapRef.current, {
      center: [10.776, 106.690],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
      layersRef.current = {};
    };
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    const map = leafletMapRef.current;
    if (!map || !L || districts.length === 0) return;

    Object.values(layersRef.current).forEach(layers => 
      layers.forEach(layer => layer.remove())
    );
    layersRef.current = {};

    districts.forEach((district: DistrictCard) => {
      const center = DISTRICT_CENTERS[district.name];
      if (!center) return;

      const depths = zoneDepths[district.name] ?? {};
      const depthValues = Object.values(depths);
      const avgDepth = depthValues.length
        ? Math.round(depthValues.reduce((a, b) => a + b, 0) / depthValues.length)
        : 0;

      const mode = depthToMode(avgDepth);
      const cfg = MODE_CONFIG[mode];
      const isSelected = selectedDistrictId === district.districtId;

      const circle = L.circle(center, {
        radius: CIRCLE_RADIUS,
        color: isSelected ? '#ffffff' : cfg.fillColor,
        weight: isSelected ? 4 : 2.5,
        fillColor: cfg.fillColor,
        fillOpacity: cfg.opacity,
      }).addTo(map);

      let outerRing: any = null;
      if (isSelected) {
        outerRing = L.circle(center, {
          radius: CIRCLE_RADIUS + 450,
          color: '#ffffff',
          weight: 2,
          fillOpacity: 0,
          dashArray: '8 4',
        }).addTo(map);
      }

      const zoneLines = Object.entries(depths)
        .map(([zone, dep]) => {
          const m = MODE_CONFIG[depthToMode(dep)];
          return `<span style="color:${m.fillColor}">${zone}: ${dep}cm</span>`;
        })
        .join(' • ');

      const labelHtml = `
        <div style="background:rgba(17,20,24,0.96);border:3px solid ${cfg.fillColor};border-radius:14px;padding:10px 16px;font-family:'JetBrains Mono',monospace;min-width:160px;box-shadow:0 10px 30px ${cfg.fillColor}40;">
          <div style="font-size:26px;line-height:1;">${cfg.icon}</div>
          <div style="color:#e6edf3;font-weight:700;margin:6px 0 2px;">${district.name}</div>
          <div style="color:${cfg.fillColor};font-size:13px;">${avgDepth}cm • ${cfg.label}</div>
          <div style="margin-top:8px;font-size:10px;color:#8b949e;line-height:1.4;">${zoneLines}</div>
        </div>`;

      const labelIcon = L.divIcon({
        className: 'custom-label',
        html: labelHtml,
        iconSize: [170, 130],
        iconAnchor: [85, 70],
      });

      const marker = L.marker(center, { icon: labelIcon }).addTo(map);
      const handleClick = () => onDistrictClick(district.districtId, district.name);

      circle.on('click', handleClick);
      marker.on('click', handleClick);

      layersRef.current[district.districtId] = [circle, marker, ...(outerRing ? [outerRing] : [])];
    });
  }, [districts, zoneDepths, selectedDistrictId, onDistrictClick]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full rounded-2xl overflow-hidden shadow-inner border border-bg-border"
    />
  );
}

function RouteLogRow({ log }: { log: RouteLog }) {
  const prevCfg = MODE_CONFIG[log.previousMode];
  const newCfg = MODE_CONFIG[log.newMode];

  return (
    <div className="px-4 py-3 border-b border-bg-border last:border-0 hover:bg-bg-elevated/60 transition-colors">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] text-text-muted">
            {log.route?.district?.name ?? '—'} • {log.route?.zone ?? '—'}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`font-mono text-xs ${prevCfg.color}`}>
              {prevCfg.icon} {log.previousDepth}cm
            </span>
            <span className="text-text-muted">→</span>
            <span className={`font-mono text-xs font-semibold ${newCfg.color}`}>
              {newCfg.icon} {log.newDepth}cm {newCfg.label}
            </span>
          </div>
        </div>
        <span className="font-mono text-[10px] text-text-muted whitespace-nowrap">
          {new Date(log.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

export function RoutingPage() {
  const [districts, setDistricts] = useState<DistrictCard[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedDistrictName, setSelectedDistrictName] = useState<string | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [logs, setLogs] = useState<RouteLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [zoneDepths, setZoneDepths] = useState<Record<string, Record<string, number>>>({});

  const ZONES = ['Zone A', 'Zone B', 'Zone C'] as const;

  // Load Leaflet
  useEffect(() => {
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Load districts
  useEffect(() => {
    api.get('/api/dashboard/summary')
      .then((res) => {
        const d: DistrictCard[] = res.data.districts ?? [];
        setDistricts(d);

        const initial: Record<string, Record<string, number>> = {};
        d.forEach((dist: DistrictCard) => {
          initial[dist.name] = { 'Zone A': 15, 'Zone B': 25, 'Zone C': 45 };
        });
        setZoneDepths(initial);
      })
      .catch(console.error);
  }, []);

  // Load zone depths from routes
  useEffect(() => {
    if (districts.length === 0) return;

    const promises = districts.map((district: DistrictCard) =>
      routesApi.getDistrictRoutes(district.districtId)
        .then((routes) => ({ district, routes }))
    );

    Promise.all(promises).then((results) => {
      setZoneDepths((prev) => {
        const next = { ...prev };
        results.forEach(({ district, routes }) => {
          if (routes.length > 0) {
            next[district.name] = {
              'Zone A': routes.find(r => r.zone === 'Zone A')?.waterDepthCm ?? 15,
              'Zone B': routes.find(r => r.zone === 'Zone B')?.waterDepthCm ?? 25,
              'Zone C': routes.find(r => r.zone === 'Zone C')?.waterDepthCm ?? 45,
            };
          }
        });
        return next;
      });
    });
  }, [districts]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await routesApi.getLogs(selectedDistrictId ?? undefined);
      setLogs(data.slice(0, 30));
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  }, [selectedDistrictId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDistrictClick = useCallback((districtId: string, name: string) => {
    setSelectedDistrictId(prev => prev === districtId ? null : districtId);
    setSelectedDistrictName(prev => prev === name ? null : name);
  }, []);

  const handleDepthChange = useCallback((districtName: string, zone: string, depth: number) => {
    setZoneDepths(prev => ({
      ...prev,
      [districtName]: { ...(prev[districtName] ?? {}), [zone]: depth }
    }));
  }, []);

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
      setTimeout(() => setUpdateStatus(prev => ({ ...prev, [key]: 'idle' })), 1800);
    } catch {
      setUpdateStatus(prev => ({ ...prev, [key]: 'error' }));
      setTimeout(() => setUpdateStatus(prev => ({ ...prev, [key]: 'idle' })), 2500);
    }
  }, [fetchLogs]);

  const selectedDistrictDepths = useMemo(() => 
    selectedDistrictName ? (zoneDepths[selectedDistrictName] ?? {}) : {}, 
    [selectedDistrictName, zoneDepths]
  );

  const anySuspended = useMemo(() => 
    districts.some((d: DistrictCard) =>
      Object.values(zoneDepths[d.name] ?? {}).some(dep => dep > 80)
    ), 
    [districts, zoneDepths]
  );

  return (
    <DashboardLayout title="Routing Map" onRefresh={fetchLogs} lastUpdated={lastUpdated}>
      {anySuspended && (
        <div className="mb-6 bg-gradient-to-r from-accent-red/10 to-transparent border border-accent-red/30 rounded-2xl px-6 py-4 flex gap-4">
          <span className="text-3xl">⛔</span>
          <div>
            <p className="font-semibold text-accent-red">DELIVERY SUSPENDED IN AFFECTED ZONES</p>
            <p className="text-sm text-accent-red/80 mt-1">Water depth exceeds 80cm. Escalate to civil defense per Section A.4.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Side - Map + Cards */}
        <div className="xl:col-span-8 space-y-6">
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold">Ho Chi Minh City — Flood Routing</h2>
                <p className="text-sm text-text-muted">Click districts to adjust water depth</p>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {Object.values(MODE_CONFIG).map((cfg) => (
                  <div key={cfg.label} className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: cfg.fillColor }} />
                    <span className="font-mono text-xs text-text-muted">{cfg.depth}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative h-[460px] rounded-2xl overflow-hidden border border-bg-border">
              {leafletLoaded ? (
                <LeafletMap
                  districts={districts}
                  zoneDepths={zoneDepths}
                  selectedDistrictId={selectedDistrictId}
                  onDistrictClick={handleDistrictClick}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-elevated">
                  <p className="font-mono text-text-muted">Loading interactive map...</p>
                </div>
              )}
            </div>
          </div>

          {/* District Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {districts.map((d: DistrictCard) => {
              const depths = zoneDepths[d.name] ?? {};
              const depthValues = Object.values(depths);
              const avgDepth = depthValues.length
                ? Math.round(depthValues.reduce((a, b) => a + b, 0) / depthValues.length)
                : 0;
              const mode = depthToMode(avgDepth);
              const cfg = MODE_CONFIG[mode];
              const isSelected = selectedDistrictId === d.districtId;

              return (
                <button
                  key={d.districtId}
                  onClick={() => handleDistrictClick(d.districtId, d.name)}
                  className={`card p-5 text-left transition-all hover:scale-[1.015] ${
                    isSelected ? 'ring-2 ring-accent-blue/70 bg-accent-blue/5' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg">{d.name}</h3>
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-2xl shadow-inner"
                      style={{ backgroundColor: cfg.fillColor + '22', border: `2px solid ${cfg.fillColor}` }}
                    >
                      {cfg.icon}
                    </div>
                  </div>

                  <div className={`inline-flex items-center gap-2 mt-3 mb-4 px-3 py-1 rounded-full text-xs font-medium ${cfg.bgColor} ${cfg.borderColor} ${cfg.color}`}>
                    {cfg.label} • {avgDepth}cm
                  </div>

                  <div className="space-y-2 text-sm">
                    {ZONES.map((zone) => {
                      const depth = depths[zone] ?? 0;
                      const zCfg = MODE_CONFIG[depthToMode(depth)];
                      return (
                        <div key={zone} className="flex justify-between">
                          <span className="text-text-muted">{zone}</span>
                          <span className={`font-semibold ${zCfg.color}`}>{depth}cm</span>
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="xl:col-span-4 space-y-6">
          {/* Zone Controls */}
          <div className="card p-6">
            <h2 className="font-bold mb-1">Zone Water Depth</h2>
            <p className="text-sm text-text-muted mb-6">
              {selectedDistrictName ?? 'Select a district on the map'}
            </p>

            {!selectedDistrictName ? (
              <div className="bg-bg-elevated rounded-2xl py-16 text-center">
                <div className="text-5xl mb-4 opacity-40">🗺️</div>
                <p className="text-text-muted">Select a district to adjust depths</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ZONES.map((zone) => {
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
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => handleSaveDepth(selectedDistrictId!, selectedDistrictName!, zone, depth)}
                          disabled={status === 'saving'}
                          className={`px-5 py-2 text-xs font-mono rounded-xl border transition-all ${
                            status === 'saved' ? 'bg-accent-green/10 border-accent-green text-accent-green' :
                            status === 'error' ? 'bg-accent-red/10 border-accent-red text-accent-red' :
                            status === 'saving' ? 'bg-bg-border text-text-muted' :
                            'hover:bg-bg-elevated border-bg-border hover:border-text-muted'
                          }`}
                        >
                          {status === 'saving' ? 'Saving...' :
                           status === 'saved' ? '✓ Saved' :
                           status === 'error' ? '✗ Failed' : 'Save to Backend'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Delivery Tiers */}
          <div className="card p-6">
            <h3 className="font-mono uppercase text-xs tracking-widest text-text-muted mb-4">Section A.4 — Delivery Tiers</h3>
            <div className="space-y-3">
              {Object.values(MODE_CONFIG).map((cfg) => (
                <div
                  key={cfg.label}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${cfg.bgColor} ${cfg.borderColor}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cfg.icon}</span>
                    <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <span className="font-mono text-xs text-text-muted">{cfg.depth}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Route Change Log */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-bg-border flex items-center justify-between">
              <h3 className="font-semibold">Route Change Log</h3>
              <button onClick={fetchLogs} className="text-xs text-text-muted hover:text-text-primary transition-colors">
                ↻ Refresh
              </button>
            </div>

            {logsLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 bg-bg-elevated rounded-xl animate-pulse" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="p-10 text-center text-text-muted text-sm">
                No changes recorded yet.
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto">
                {logs.map((log) => <RouteLogRow key={log.id} log={log} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}