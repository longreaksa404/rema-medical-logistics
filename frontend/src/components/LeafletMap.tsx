// LeafletMap.tsx — standalone component with proper Leaflet lifecycle management
// Key fix: map is destroyed synchronously in the useEffect cleanup using a ref
// that is set BEFORE the map is created. This ensures cleanup always runs
// even when React unmounts during navigation or logout.

import { useEffect, useRef, useCallback } from 'react';
import type { DistrictCard } from '../api/dashboard.types';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type DeliveryMode = 'MOTORBIKE' | 'BICYCLE_OR_FOOT' | 'BOAT' | 'SUSPENDED';

const MODE_CONFIG: Record<DeliveryMode, {
  label: string; fillColor: string; opacity: number; icon: string;
}> = {
  MOTORBIKE:       { label: 'Motorbike',      fillColor: '#3fb950', opacity: 0.35, icon: '🏍'  },
  BICYCLE_OR_FOOT: { label: 'Bicycle / Foot', fillColor: '#d29922', opacity: 0.45, icon: '🚲' },
  BOAT:            { label: 'Boat',            fillColor: '#f0883e', opacity: 0.50, icon: '⛵' },
  SUSPENDED:       { label: 'SUSPENDED',       fillColor: '#f85149', opacity: 0.55, icon: '⛔' },
};

function depthToMode(depth: number): DeliveryMode {
  if (depth <= 30) return 'MOTORBIKE';
  if (depth <= 60) return 'BICYCLE_OR_FOOT';
  if (depth <= 80) return 'BOAT';
  return 'SUSPENDED';
}

const DISTRICT_CENTERS: Record<string, [number, number]> = {
  'District 1': [10.820, 106.660],
  'District 2': [10.776, 106.703],
  'District 3': [10.735, 106.668],
};

const CIRCLE_RADIUS = 2800;

// ─── SAFE LAYER REMOVAL ───────────────────────────────────────────────────────

function safeRemoveLayer(layer: any) {
  try { layer?.remove?.(); } catch { /* ignore */ }
}

function safeRemoveMap(map: any) {
  try { map?.remove?.(); } catch { /* ignore */ }
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

interface LeafletMapProps {
  districts: DistrictCard[];
  zoneDepths: Record<string, Record<string, number>>;
  selectedDistrictId: string | null;
  onDistrictClick: (districtId: string, districtName: string) => void;
}

export function LeafletMap({
  districts,
  zoneDepths,
  selectedDistrictId,
  onDistrictClick,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── mapRef holds the Leaflet map instance ─────────────────────────────────
  // Using an object ref (not state) so reads/writes are synchronous and
  // never trigger re-renders. The cleanup function reads this directly.
  const mapRef = useRef<any>(null);
  const layersRef = useRef<Record<string, any[]>>({});
  const isDestroyedRef = useRef(false);

  // ── Initialize map once ───────────────────────────────────────────────────
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !containerRef.current || mapRef.current) return;

    isDestroyedRef.current = false;

    const map = L.map(containerRef.current, {
      center: [10.776, 106.690],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // ── Cleanup: destroy map when component unmounts ──────────────────────
    // This runs when:
    // - User navigates away from /routing
    // - User logs out (ProtectedRoute unmounts AppShell → unmounts RoutingPage)
    // The isDestroyedRef guard prevents double-destroy if cleanup runs twice.
    return () => {
      if (isDestroyedRef.current) return;
      isDestroyedRef.current = true;

      // Remove all layers first
      Object.values(layersRef.current).forEach(layers => {
        layers.forEach(safeRemoveLayer);
      });
      layersRef.current = {};

      // Destroy the map instance
      const mapToDestroy = mapRef.current;
      mapRef.current = null;
      safeRemoveMap(mapToDestroy);
    };
  }, []); // empty deps — runs once on mount, cleans up on unmount

  // ── Redraw layers when data changes ──────────────────────────────────────
  const redrawLayers = useCallback(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map || !L || isDestroyedRef.current) return;

    // Clear existing layers
    Object.values(layersRef.current).forEach(layers => {
      layers.forEach(safeRemoveLayer);
    });
    layersRef.current = {};

    districts.forEach((district: DistrictCard) => {
      const center = DISTRICT_CENTERS[district.name];
      if (!center || isDestroyedRef.current) return;

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
        weight: isSelected ? 3 : 2,
        fillColor: cfg.fillColor,
        fillOpacity: cfg.opacity,
      }).addTo(map);

      let outerRing: any = null;
      if (isSelected) {
        outerRing = L.circle(center, {
          radius: CIRCLE_RADIUS + 400,
          color: '#ffffff',
          weight: 1.5,
          fillOpacity: 0,
          dashArray: '6 4',
        }).addTo(map);
      }

      const zoneLines = Object.entries(depths).map(([zone, dep]) => {
        const m = MODE_CONFIG[depthToMode(dep)];
        return `<span style="color:${m.fillColor}">${zone}: ${dep}cm</span>`;
      }).join(' &nbsp;•&nbsp; ');

      const labelHtml = `
        <div style="background:rgba(13,17,23,0.97);border:2px solid ${cfg.fillColor};border-radius:8px;padding:8px 14px;font-family:'JetBrains Mono',monospace;min-width:155px;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
          <div style="font-size:22px;line-height:1;">${cfg.icon}</div>
          <div style="color:#e6edf3;font-weight:700;font-size:13px;margin:5px 0 2px;">${district.name}</div>
          <div style="color:${cfg.fillColor};font-size:11px;">${avgDepth}cm &mdash; ${cfg.label}</div>
          <div style="margin-top:6px;font-size:9px;color:#8b949e;line-height:1.6;">${zoneLines}</div>
        </div>`;

      const labelIcon = L.divIcon({
        className: 'custom-label',
        html: labelHtml,
        iconSize: [165, 120],
        iconAnchor: [82, 65],
      });

      const marker = L.marker(center, { icon: labelIcon }).addTo(map);
      const handleClick = () => onDistrictClick(district.districtId, district.name);
      circle.on('click', handleClick);
      marker.on('click', handleClick);

      layersRef.current[district.districtId] = [
        circle,
        marker,
        ...(outerRing ? [outerRing] : []),
      ];
    });
  }, [districts, zoneDepths, selectedDistrictId, onDistrictClick]);

  useEffect(() => {
    if (mapRef.current && !isDestroyedRef.current) {
      redrawLayers();
    }
  }, [redrawLayers]);

  return <div ref={containerRef} className="w-full h-full" />;
}