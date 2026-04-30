import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { routesApi } from '../api/routes';
import type { RouteLog, DeliveryMode } from '../api/routes';
import { api } from '../api/client';
import type { DistrictCard } from '../api/dashboard.types';

const MODE_CONFIG: Record<DeliveryMode, {
  label: string; color: string; bgColor: string; borderColor: string;
  icon: string; depth: string; fillColor: string; opacity: number;
}> = {
  MOTORBIKE:       { label: 'Motorbike',      color: 'text-accent-green',  bgColor: 'bg-accent-green/10',  borderColor: 'border-accent-green/30',  icon: '🏍', depth: '0–30 cm',  fillColor: '#3fb950', opacity: 0.35 },
  BICYCLE_OR_FOOT: { label: 'Bicycle / Foot', color: 'text-accent-yellow', bgColor: 'bg-accent-yellow/10', borderColor: 'border-accent-yellow/30', icon: '🚲', depth: '30–60 cm', fillColor: '#d29922', opacity: 0.45 },
  BOAT:            { label: 'Boat',           color: 'text-accent-blue',   bgColor: 'bg-accent-blue/10',   borderColor: 'border-accent-blue/30',   icon: '⛵', depth: '60–80 cm', fillColor: '#58a6ff', opacity: 0.50 },
  SUSPENDED:       { label: 'SUSPENDED',      color: 'text-accent-red',    bgColor: 'bg-accent-red/10',    borderColor: 'border-accent-red/30',    icon: '⛔', depth: '> 80 cm',  fillColor: '#f85149', opacity: 0.55 },
};

// Well-spread HCMC locations — clearly visible and distinct on the map
const DISTRICT_CENTERS: Record<string, [number, number]> = {
  'District 1': [10.820, 106.660],  // North-west (Go Vap / Binh Thanh area)
  'District 2': [10.776, 106.703],  // Central HCMC urban core
  'District 3': [10.735, 106.668],  // South (District 8 / Binh Chanh area)
};

const CIRCLE_RADIUS = 2500; // meters — large, clearly visible

function depthToMode(depth: number): DeliveryMode {
  if (depth <= 30) return 'MOTORBIKE';
  if (depth <= 60) return 'BICYCLE_OR_FOOT';
  if (depth <= 80) return 'BOAT';
  return 'SUSPENDED';
}

function DepthSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const mode = depthToMode(value);
  const cfg = MODE_CONFIG[mode];
  const trackColor = value > 80 ? '#f85149' : value > 60 ? '#58a6ff' : value > 30 ? '#d29922' : '#3fb950';

  return (
    <div className="bg-bg-elevated rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">{label}</span>
        <span className={`font-mono text-[10px] font-semibold ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
      </div>
      <div className="flex items-center gap-3">
        <input type="range" min={0} max={120} step={5} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 cursor-pointer" style={{ accentColor: trackColor }} />
        <span className="font-mono text-sm text-text-primary w-14 text-right font-semibold">{value} cm</span>
      </div>
      {value > 80 && (
        <p className="font-mono text-[9px] text-accent-red mt-1.5 animate-pulse-slow">
          ⛔ Exceeds 80cm — delivery SUSPENDED per Section A.4
        </p>
      )}
    </div>
  );
}

declare global {
  interface Window { L: any; } // eslint-disable-line @typescript-eslint/no-explicit-any
}

function LeafletMap({ districts, zoneDepths, selectedDistrictId, onDistrictClick }: {
  districts: DistrictCard[];
  zoneDepths: Record<string, Record<string, number>>;
  selectedDistrictId: string | null;
  onDistrictClick: (districtId: string, districtName: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const layersRef = useRef<Record<string, any[]>>({}); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Init map once
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { center: [10.776, 106.690], zoom: 12, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);
    leafletMapRef.current = map;
    return () => { map.remove(); leafletMapRef.current = null; layersRef.current = {}; };
  }, []);

  // Redraw circles on data change
  useEffect(() => {
    const L = window.L;
    const map = leafletMapRef.current;
    if (!map || !L || districts.length === 0) return;

    // Clear old layers
    Object.values(layersRef.current).forEach(layers => layers.forEach(l => l.remove()));
    layersRef.current = {};

    districts.forEach((d) => {
      const center = DISTRICT_CENTERS[d.name];
      if (!center) return;

      const depths = zoneDepths[d.name] ?? {};
      const depthValues = Object.values(depths);
      const avgDepth = depthValues.length > 0
        ? Math.round(depthValues.reduce((a, b) => a + b, 0) / depthValues.length) : 0;

      const mode = depthToMode(avgDepth);
      const cfg = MODE_CONFIG[mode];
      const isSelected = selectedDistrictId === d.districtId;

      // Big colored circle
      const circle = L.circle(center, {
        radius: CIRCLE_RADIUS,
        color: isSelected ? '#ffffff' : cfg.fillColor,
        weight: isSelected ? 3 : 2,
        fillColor: cfg.fillColor,
        fillOpacity: cfg.opacity,
      }).addTo(map);

      // Dashed outer ring when selected
      let outerRing = null;
      if (isSelected) {
        outerRing = L.circle(center, {
          radius: CIRCLE_RADIUS + 400,
          color: '#ffffff',
          weight: 1.5,
          fillOpacity: 0,
          dashArray: '6 5',
        }).addTo(map);
      }

      // Label inside circle
      const zoneLines = Object.entries(depths)
        .map(([z, dep]) => `<span style="color:${MODE_CONFIG[depthToMode(dep)].fillColor}">${z}: ${dep}cm</span>`)
        .join(' &nbsp;');

      const labelHtml = `
        <div style="
          background: rgba(17,20,24,0.93);
          border: 2px solid ${cfg.fillColor};
          border-radius: 12px;
          padding: 7px 13px;
          font-family: 'JetBrains Mono', monospace;
          white-space: nowrap;
          cursor: pointer;
          box-shadow: 0 2px 16px ${cfg.fillColor}44;
          text-align: center;
          min-width: 130px;
        ">
          <div style="font-size: 20px; line-height: 1.1;">${cfg.icon}</div>
          <div style="color: #e6edf3; font-size: 12px; font-weight: 700; margin-top: 3px;">${d.name}</div>
          <div style="color: ${cfg.fillColor}; font-size: 10px; margin-top: 1px;">${avgDepth}cm avg · ${cfg.label}</div>
          <div style="font-size: 9px; margin-top: 3px; color: #8b949e;">${zoneLines}</div>
        </div>`;

      const labelIcon = L.divIcon({
        className: '',
        html: labelHtml,
        iconAnchor: [65, 62],
        iconSize: [130, 124],
      });

      const marker = L.marker(center, { icon: labelIcon }).addTo(map);
      const clickHandler = () => onDistrictClick(d.districtId, d.name);
      circle.on('click', clickHandler);
      marker.on('click', clickHandler);

      layersRef.current[d.districtId] = [circle, marker, ...(outerRing ? [outerRing] : [])];
    });
  }, [districts, zoneDepths, selectedDistrictId, onDistrictClick]);

  return <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" />;
}

function RouteLogRow({ log }: { log: RouteLog }) {
  const prevCfg = MODE_CONFIG[log.previousMode];
  const newCfg = MODE_CONFIG[log.newMode];
  return (
    <div className="px-4 py-2.5 border-b border-bg-border last:border-0 hover:bg-bg-elevated/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] text-text-muted mb-0.5">
            {log.route?.district?.name ?? '—'} · {log.route?.zone ?? '—'}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-mono text-[10px] ${prevCfg.color}`}>{prevCfg.icon} {log.previousDepth}cm</span>
            <span className="font-mono text-[10px] text-text-muted">→</span>
            <span className={`font-mono text-[10px] font-semibold ${newCfg.color}`}>{newCfg.icon} {log.newDepth}cm · {newCfg.label}</span>
          </div>
        </div>
        <span className="font-mono text-[9px] text-text-muted flex-shrink-0">
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
  const ZONES = ['Zone A', 'Zone B', 'Zone C'];

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
  }, []);

  useEffect(() => {
    api.get('/api/dashboard/summary').then((res) => {
      const d: DistrictCard[] = res.data.districts ?? [];
      setDistricts(d);
      const initial: Record<string, Record<string, number>> = {};
      d.forEach((dist) => { initial[dist.name] = { 'Zone A': 0, 'Zone B': 0, 'Zone C': 0 }; });
      setZoneDepths(initial);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (districts.length === 0) return;
    districts.forEach((d) => {
      routesApi.getDistrictRoutes(d.districtId).then((routes) => {
        if (routes.length === 0) return;
        setZoneDepths(prev => {
          const next = { ...prev };
          if (!next[d.name]) next[d.name] = { 'Zone A': 0, 'Zone B': 0, 'Zone C': 0 };
          routes.forEach(r => { next[d.name][r.zone] = r.waterDepthCm; });
          return next;
        });
      }).catch(() => {});
    });
  }, [districts]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await routesApi.getLogs(selectedDistrictId ?? undefined);
      setLogs(data.slice(0, 30));
    } catch { /* ignore */ } finally { setLogsLoading(false); }
  }, [selectedDistrictId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleDistrictClick = useCallback((districtId: string, name: string) => {
    setSelectedDistrictId(prev => prev === districtId ? null : districtId);
    setSelectedDistrictName(prev => prev === name ? null : name);
  }, []);

  const handleDepthChange = useCallback((districtName: string, zone: string, depth: number) => {
    setZoneDepths(prev => ({ ...prev, [districtName]: { ...(prev[districtName] ?? {}), [zone]: depth } }));
  }, []);

  const handleSaveDepth = useCallback(async (districtId: string, districtName: string, zone: string, depth: number) => {
    const key = `${districtId}:${zone}`;
    setUpdateStatus(prev => ({ ...prev, [key]: 'saving' }));
    try {
      await routesApi.update({ districtId, zone, waterDepthCm: depth });
      setUpdateStatus(prev => ({ ...prev, [key]: 'saved' }));
      setLastUpdated(new Date());
      await fetchLogs();
      setTimeout(() => setUpdateStatus(prev => ({ ...prev, [key]: 'idle' })), 2000);
    } catch {
      setUpdateStatus(prev => ({ ...prev, [key]: 'error' }));
      setTimeout(() => setUpdateStatus(prev => ({ ...prev, [key]: 'idle' })), 3000);
    }
  }, [fetchLogs]);

  const selectedDistrictDepths = selectedDistrictName ? (zoneDepths[selectedDistrictName] ?? {}) : {};
  const anySuspended = districts.some(d => Object.values(zoneDepths[d.name] ?? {}).some(dep => dep > 80));

  return (
    <DashboardLayout title="Routing Map" onRefresh={fetchLogs} lastUpdated={lastUpdated}>
      {anySuspended && (
        <div className="mb-4 bg-accent-red/10 border border-accent-red/40 rounded-lg px-5 py-3 flex items-center gap-3 animate-slide-in">
          <span className="text-xl flex-shrink-0">⛔</span>
          <div>
            <p className="font-mono text-sm font-semibold text-accent-red">DELIVERY SUSPENDED — Water depth exceeds 80cm</p>
            <p className="font-mono text-[10px] text-accent-red/70 mt-0.5">All volunteer delivery halted in affected zones. Escalate to civil defense per Section A.4.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* LEFT: Map + district cards */}
        <div className="xl:col-span-2 space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <h2 className="font-sans font-bold text-text-primary">Ho Chi Minh City — Affected Districts</h2>
                <p className="font-mono text-[10px] text-text-muted mt-0.5">Click a circle to select · Colors show delivery mode</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {(Object.keys(MODE_CONFIG) as DeliveryMode[]).map(mode => {
                  const cfg = MODE_CONFIG[mode];
                  return (
                    <div key={mode} className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: cfg.fillColor, opacity: 0.85 }} />
                      <span className={`font-mono text-[9px] ${cfg.color}`}>{cfg.depth}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative rounded-lg overflow-hidden" style={{ height: 420 }}>
              {leafletLoaded ? (
                <LeafletMap districts={districts} zoneDepths={zoneDepths} selectedDistrictId={selectedDistrictId} onDistrictClick={handleDistrictClick} />
              ) : (
                <div className="w-full h-full bg-bg-elevated flex items-center justify-center rounded-lg">
                  <p className="font-mono text-sm text-text-muted animate-pulse">Loading map...</p>
                </div>
              )}
            </div>
          </div>

          {/* District cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {districts.map((d) => {
              const depths = zoneDepths[d.name] ?? {};
              const depthValues = Object.values(depths);
              const avgDepth = depthValues.length > 0 ? Math.round(depthValues.reduce((a, b) => a + b, 0) / depthValues.length) : 0;
              const mode = depthToMode(avgDepth);
              const cfg = MODE_CONFIG[mode];
              const isSelected = selectedDistrictId === d.districtId;
              return (
                <button key={d.districtId} onClick={() => handleDistrictClick(d.districtId, d.name)}
                  className={`card p-4 text-left transition-all duration-150 hover:border-text-muted/30 w-full ${isSelected ? 'border-accent-blue/50 bg-accent-blue/5' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-sans font-bold text-text-primary text-sm">{d.name}</h3>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                      style={{ background: cfg.fillColor + '33', border: `2px solid ${cfg.fillColor}` }}>
                      {cfg.icon}
                    </div>
                  </div>
                  <div className={`inline-block font-mono text-[10px] px-2 py-0.5 rounded border mb-2 ${cfg.bgColor} ${cfg.borderColor} ${cfg.color}`}>
                    {cfg.label} · avg {avgDepth}cm
                  </div>
                  <div className="space-y-0.5">
                    {ZONES.map(zone => {
                      const zDepth = depths[zone] ?? 0;
                      const zCfg = MODE_CONFIG[depthToMode(zDepth)];
                      return (
                        <div key={zone} className="flex justify-between items-center">
                          <span className="font-mono text-[9px] text-text-muted">{zone}</span>
                          <span className={`font-mono text-[9px] font-semibold ${zCfg.color}`}>{zDepth}cm</span>
                        </div>
                      );
                    })}
                  </div>
                  {isSelected && <p className="font-mono text-[9px] text-accent-blue mt-2">● Selected — edit zones →</p>}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Controls */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-4">
              <h2 className="font-sans font-bold text-text-primary">Zone Water Depth</h2>
              <p className="font-mono text-[10px] text-text-muted mt-0.5">{selectedDistrictName ?? 'Select a district'}</p>
            </div>
            {!selectedDistrictName ? (
              <div className="bg-bg-elevated rounded-lg p-6 text-center">
                <p className="text-3xl mb-3">🗺</p>
                <p className="font-mono text-xs text-text-muted leading-relaxed">Click a district circle on the map or a card below to edit water depths</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ZONES.map(zone => {
                  const depth = selectedDistrictDepths[zone] ?? 0;
                  const key = `${selectedDistrictId}:${zone}`;
                  const status = updateStatus[key] ?? 'idle';
                  return (
                    <div key={zone}>
                      <DepthSlider label={zone} value={depth} onChange={(v) => handleDepthChange(selectedDistrictName!, zone, v)} />
                      <div className="flex justify-end mt-1.5">
                        <button onClick={() => handleSaveDepth(selectedDistrictId!, selectedDistrictName!, zone, depth)}
                          disabled={status === 'saving'}
                          className={`font-mono text-[10px] px-3 py-1 rounded border transition-all duration-150 ${
                            status === 'saved'   ? 'text-accent-green border-accent-green/40 bg-accent-green/10' :
                            status === 'error'   ? 'text-accent-red border-accent-red/40 bg-accent-red/10' :
                            status === 'saving'  ? 'text-text-muted border-bg-border animate-pulse' :
                            'text-text-secondary border-bg-border hover:text-text-primary hover:border-text-muted'}`}>
                          {status === 'saving' ? 'Saving...' : status === 'saved' ? '✓ Saved' : status === 'error' ? '✗ Error' : 'Save to Backend'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 border-t border-bg-border">
                  <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-2">Current Modes</p>
                  {ZONES.map(zone => {
                    const depth = selectedDistrictDepths[zone] ?? 0;
                    const cfg = MODE_CONFIG[depthToMode(depth)];
                    return (
                      <div key={zone} className={`flex items-center justify-between px-3 py-1.5 rounded mb-1 border ${cfg.bgColor} ${cfg.borderColor}`}>
                        <span className="font-mono text-[10px] text-text-secondary">{zone}</span>
                        <div className="flex items-center gap-1.5">
                          <span>{cfg.icon}</span>
                          <span className={`font-mono text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="card p-4">
            <h3 className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3">Section A.4 — Delivery Tiers (Locked)</h3>
            <div className="space-y-1.5">
              {(Object.keys(MODE_CONFIG) as DeliveryMode[]).map(mode => {
                const cfg = MODE_CONFIG[mode];
                return (
                  <div key={mode} className={`flex items-center justify-between px-3 py-2 rounded border ${cfg.bgColor} ${cfg.borderColor}`}>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cfg.fillColor }} />
                      <span>{cfg.icon}</span>
                      <span className={`font-mono text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <span className="font-mono text-[9px] text-text-muted">{cfg.depth}</span>
                  </div>
                );
              })}
            </div>
            <p className="font-mono text-[9px] text-text-muted mt-3 leading-relaxed">Above 80cm: halt all delivery, escalate to civil defense. No exceptions.</p>
          </div>

          <div className="card">
            <div className="px-4 py-3 border-b border-bg-border flex items-center justify-between">
              <h3 className="font-sans font-bold text-text-primary text-sm">Route Change Log</h3>
              <button onClick={fetchLogs} className="font-mono text-[10px] text-text-muted hover:text-text-primary transition-colors">↻ refresh</button>
            </div>
            {logsLoading ? (
              <div>{[...Array(3)].map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-bg-border">
                  <div className="h-3 bg-bg-elevated rounded animate-pulse mb-1.5 w-3/4" />
                  <div className="h-3 bg-bg-elevated rounded animate-pulse w-1/2" />
                </div>
              ))}</div>
            ) : logs.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="font-mono text-xs text-text-muted leading-relaxed">No route changes yet. Select a district, adjust depth, and click "Save to Backend".</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {logs.map((log) => <RouteLogRow key={log.id} log={log} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}