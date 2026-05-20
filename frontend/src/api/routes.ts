import { api } from './client';

export type DeliveryMode = 'MOTORBIKE' | 'BICYCLE_OR_FOOT' | 'BOAT' | 'SUSPENDED';

export interface RouteRecommendation {
  waterDepthCm: number;
  deliveryMode: DeliveryMode;
  warning?: string;
}

// per-zone entry returned by GET /api/route/recommend?districtId=...
export interface ZoneRecommendation {
  zone: string;
  waterDepthCm: number;
  deliveryMode: DeliveryMode;
  active: boolean;
  warning?: string;
}

export interface DistrictRecommendation {
  districtId: string;
  districtName: string;
  zones: ZoneRecommendation[];
}

export interface Route {
  id: string;
  districtId: string;
  zone: string;
  waterDepthCm: number;
  deliveryMode: DeliveryMode;
  active: boolean;
  updatedAt: string;
  district: { name: string };
}

export interface RouteLog {
  id: string;
  createdAt: string;
  routeId: string;
  previousDepth: number;
  newDepth: number;
  previousMode: DeliveryMode;
  newMode: DeliveryMode;
  reportedById: string;
  route: {
    zone: string;
    districtId: string;
    district: { name: string };
  };
  reportedBy: {
    name: string;
    email: string;
    role: string;
  };
}

export interface UpdateRouteResponse {
  route: Route;
  deliveryMode: DeliveryMode;
  warning?: string;
}

export const routesApi = {
  // single-depth stateless lookup — kept for Swagger testing
  recommend: async (waterDepthCm: number): Promise<RouteRecommendation> => {
    const res = await api.get<RouteRecommendation>('/api/route/recommend', {
      params: { waterDepthCm },
    });
    return res.data;
  },

  // per-zone breakdown for a district — used by RoutingPage
  getRecommendByDistrict: async (districtId: string): Promise<DistrictRecommendation> => {
    const res = await api.get<DistrictRecommendation>('/api/route/recommend', {
      params: { districtId },
    });
    return res.data;
  },

  update: async (data: {
    districtId: string;
    zone: string;
    waterDepthCm: number;
  }): Promise<UpdateRouteResponse> => {
    const res = await api.post<UpdateRouteResponse>('/api/route/update', data);
    return res.data;
  },

  getLogs: async (districtId?: string): Promise<RouteLog[]> => {
    const res = await api.get<RouteLog[]>('/api/route/logs', {
      params: districtId ? { districtId } : undefined,
    });
    return res.data;
  },

  getDistrictRoutes: async (districtId: string): Promise<Route[]> => {
    const res = await api.get<Route[]>(`/api/route/district/${districtId}`);
    return res.data;
  },
};