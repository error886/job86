/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Job } from '../types';
import { Settings, ExternalLink, Copy, Check, AlertTriangle, X, RefreshCw, Navigation, Compass, Footprints, ArrowRight } from 'lucide-react';
import { fetchWalkingRoute, RouteInfo, getNaverMapDirectionUrl, formatDistance, calculateDistanceKm } from '../utils/geo';

declare global {
  interface Window {
    naver: any;
  }
}

interface MapContainerProps {
  jobs: Job[];
  selectedJob: Job | null;
  onSelectJob: (job: Job) => void;
  userLocation?: { lat: number; lng: number } | null;
  onLocateUser?: () => void;
  isLocatingUser?: boolean;
}

const colors: Record<string, { bg: string; border: string }> = {
  'Restaurant': { bg: '#22c55e', border: '#15803d' }, // Green
  'Cafe': { bg: '#f97316', border: '#c2410c' }, // Orange
  'Factory': { bg: '#a855f7', border: '#7e22ce' }, // Purple
  'Warehouse': { bg: '#6366f1', border: '#4338ca' }, // Indigo
  'Convenience Store': { bg: '#3b82f6', border: '#1d4ed8' }, // Blue
  'Office': { bg: '#ec4899', border: '#be185d' }, // Pink
  'Other': { bg: '#6b7280', border: '#374151' } // Gray
};

export default function MapContainer({ 
  jobs, 
  selectedJob, 
  onSelectJob,
  userLocation: propUserLocation,
  onLocateUser,
  isLocatingUser = false
}: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Map engine selection: 'loading' | 'naver' | 'leaflet'
  const [mapEngine, setMapEngine] = useState<'loading' | 'naver' | 'leaflet'>('loading');

  // Naver API Client ID & Type Config
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [clientId, setClientId] = useState(() => {
    return localStorage.getItem('naver_map_client_id') || (import.meta as any).env?.VITE_NAVER_MAP_CLIENT_ID || '';
  });
  const [clientType, setClientType] = useState<'ncpClientId' | 'govClientId' | 'finClientId'>(() => {
    return (localStorage.getItem('naver_map_client_type') as any) || 'ncpClientId';
  });
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  // Leaflet refs
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersRef = useRef<Record<string, L.Marker>>({});

  // Naver refs
  const naverMapRef = useRef<any>(null);
  const naverMarkersRef = useRef<any[]>([]);

  // Geolocation states & refs
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (propUserLocation) {
      setUserLocation(propUserLocation);
    }
  }, [propUserLocation]);

  const leafletUserMarkerRef = useRef<L.Marker | null>(null);
  const naverUserMarkerRef = useRef<any>(null);

  // Route Suggestion (Naver Style Polyline & Badges)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  // Naver Route Overlay Refs
  const naverPolylineRef = useRef<any>(null);
  const naverCasingPolylineRef = useRef<any>(null);
  const naverStartMarkerRef = useRef<any>(null);
  const naverEndMarkerRef = useRef<any>(null);
  const naverBadgeMarkerRef = useRef<any>(null);
  const naverVertexMarkersRef = useRef<any[]>([]);

  // Leaflet Route Overlay Refs
  const leafletPolylineRef = useRef<L.Polyline | null>(null);
  const leafletCasingPolylineRef = useRef<L.Polyline | null>(null);
  const leafletStartMarkerRef = useRef<L.Marker | null>(null);
  const leafletEndMarkerRef = useRef<L.Marker | null>(null);
  const leafletBadgeMarkerRef = useRef<L.Marker | null>(null);
  const leafletVertexMarkersRef = useRef<L.Marker[]>([]);

  // Handle auto-fit map view to frame route path, start location, and job pin
  const handleFocusRoute = () => {
    if (!selectedJob || !routeInfo) return;
    const startLoc = userLocation || {
      lat: selectedJob.latitude - 0.0055,
      lng: selectedJob.longitude - 0.0075
    };

    if (mapEngine === 'naver' && naverMapRef.current && window.naver?.maps) {
      const bounds = new window.naver.maps.LatLngBounds();
      routeInfo.coordinates.forEach(([lat, lng]) => {
        bounds.extend(new window.naver.maps.LatLng(lat, lng));
      });
      bounds.extend(new window.naver.maps.LatLng(startLoc.lat, startLoc.lng));
      bounds.extend(new window.naver.maps.LatLng(selectedJob.latitude, selectedJob.longitude));
      naverMapRef.current.fitBounds(bounds, { top: 100, right: 100, bottom: 160, left: 100 });
    } else if (mapEngine === 'leaflet' && leafletMapRef.current && leafletPolylineRef.current) {
      const bounds = leafletPolylineRef.current.getBounds();
      bounds.extend([startLoc.lat, startLoc.lng]);
      bounds.extend([selectedJob.latitude, selectedJob.longitude]);
      leafletMapRef.current.fitBounds(bounds, {
        paddingTopLeft: [80, 80],
        paddingBottomRight: [80, 160]
      });
    }
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocationError("Trình duyệt của bạn không hỗ trợ định vị vị trí.");
      setTimeout(() => setLocationError(null), 4000);
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation({ lat, lng });
        setIsLocating(false);

        // Move viewport to user location
        if (mapEngine === 'leaflet' && leafletMapRef.current) {
          leafletMapRef.current.setView([lat, lng], 15, {
            animate: true,
            duration: 1
          });
        } else if (mapEngine === 'naver' && naverMapRef.current) {
          const latlng = new window.naver.maps.LatLng(lat, lng);
          naverMapRef.current.setCenter(latlng);
          naverMapRef.current.setZoom(14);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setIsLocating(false);
        let errorMsg = 'Không thể lấy vị trí hiện tại của bạn.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Quyền định vị bị từ chối. Vui lòng cấp quyền truy cập vị trí trong cài đặt trình duyệt.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Không xác định được vị trí thiết bị của bạn.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Yêu cầu định vị đã quá thời gian chờ.';
        }
        setLocationError(errorMsg);
        setTimeout(() => setLocationError(null), 5000);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    );
  };

  // 1. Detect and Load Map Engine (Naver Map API v3)
  useEffect(() => {
    let active = true;

    const loadEngine = async () => {
      const storedClientId = localStorage.getItem('naver_map_client_id');
      const envClientId = (import.meta as any).env?.VITE_NAVER_MAP_CLIENT_ID;
      const activeClientId = storedClientId || envClientId;

      const storedClientType = localStorage.getItem('naver_map_client_type') || 'ncpClientId';

      // If no client ID provided, check if window.naver is already loaded, otherwise use fallback Leaflet map
      if (!activeClientId) {
        if (window.naver && window.naver.maps) {
          if (active) setMapEngine('naver');
          return;
        }
        if (active) setMapEngine('leaflet');
        return;
      }

      // Try loading Naver Map v3 script dynamically
      try {
        if (window.naver && window.naver.maps) {
          if (active) setMapEngine('naver');
          return;
        }

        const scriptId = 'naver-map-sdk';
        let script = document.getElementById(scriptId) as HTMLScriptElement;
        
        if (!script) {
          script = document.createElement('script');
          script.id = scriptId;
          script.type = 'text/javascript';
          script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?${storedClientType}=${activeClientId}`;
          script.async = true;
          document.head.appendChild(script);
        }

        const scriptPromise = new Promise<boolean>((resolve) => {
          script.onload = () => {
            if (window.naver && window.naver.maps) {
              resolve(true);
            } else {
              resolve(false);
            }
          };
          script.onerror = () => resolve(false);
        });

        // Add 3.5s timeout for script load to prevent hanging on blocked connections
        const loaded = await Promise.race([
          scriptPromise,
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3500))
        ]);

        if (loaded && window.naver && window.naver.maps) {
          if (active) setMapEngine('naver');
        } else {
          console.warn('Naver map loading timed out or failed, falling back to OpenStreetMap Leaflet');
          if (active) setMapEngine('leaflet');
        }
      } catch (err) {
        console.warn('Naver map loading error, falling back to OpenStreetMap Leaflet:', err);
        if (active) setMapEngine('leaflet');
      }
    };

    loadEngine();

    return () => {
      active = false;
    };
  }, []);

  // ----------------------------------------------------
  // ENGINE A: LEAFLET ENGINE (FALLBACK)
  // ----------------------------------------------------
  useEffect(() => {
    if (mapEngine !== 'leaflet' || !containerRef.current) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
    }

    // Centered around South Korea
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false
    }).setView([36.3504, 127.3845], 7);

    leafletMapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    map.zoomControl.setPosition('bottomright');

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [mapEngine]);

  // Leaflet Marker & Panning updates
  useEffect(() => {
    if (mapEngine !== 'leaflet' || !leafletMapRef.current) return;
    const map = leafletMapRef.current;

    // Clear old markers
    Object.values(leafletMarkersRef.current).forEach(marker => {
      map.removeLayer(marker);
    });
    leafletMarkersRef.current = {};

    const getLeafletIcon = (job: Job) => {
      const style = colors[job.category] || colors['Other'];
      const emojis: Record<string, string> = {
        'Restaurant': '🍲',
        'Cafe': '☕',
        'Factory': '🏭',
        'Warehouse': '📦',
        'Convenience Store': '🏪',
        'Office': '🏢',
        'Other': '🌟'
      };
      const emoji = emojis[job.category] || emojis['Other'];
      
      let salaryText = '';
      if (job.salary) {
        if (job.salary >= 10000) {
          salaryText = `${(job.salary / 1000).toFixed(0)}k`;
        } else {
          salaryText = `${job.salary}`;
        }
      } else {
        salaryText = job.category[0];
      }

      return L.divIcon({
        html: `
          <div class="shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 flex items-center gap-1 px-2.5 py-1.5 rounded-full border-2 border-white text-white font-sans font-extrabold text-[11px] cursor-pointer" style="
            background-color: ${style.bg};
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
            white-space: nowrap;
          ">
            <span>${emoji}</span>
            <span>${salaryText}</span>
          </div>
        `,
        className: 'custom-leaflet-marker',
        iconSize: [85, 32],
        iconAnchor: [42, 16]
      });
    };

    // Draw markers
    jobs.forEach(job => {
      if (!job.latitude || !job.longitude) return;

      const marker = L.marker([job.latitude, job.longitude], {
        icon: getLeafletIcon(job)
      }).addTo(map);

      marker.on('click', () => {
        onSelectJob(job);
      });

      leafletMarkersRef.current[job.id] = marker;
    });

    if (jobs.length > 0) {
      const group = L.featureGroup(Object.values(leafletMarkersRef.current));
      map.fitBounds(group.getBounds().pad(0.15));
    }
  }, [jobs, mapEngine, onSelectJob]);

  // Leaflet focus panning
  useEffect(() => {
    if (mapEngine !== 'leaflet' || !leafletMapRef.current || !selectedJob) return;
    const map = leafletMapRef.current;
    map.setView([selectedJob.latitude, selectedJob.longitude], 14, {
      animate: true,
      duration: 1
    });
  }, [selectedJob, mapEngine]);


  // ----------------------------------------------------
  // ENGINE B: NAVER MAPS ENGINE V3 (PRIMARY)
  // ----------------------------------------------------
  useEffect(() => {
    if (mapEngine !== 'naver' || !containerRef.current) return;

    const container = containerRef.current;
    
    // Center of South Korea in Naver Map [36.3504, 127.3845]
    const mapOptions = {
      center: new window.naver.maps.LatLng(36.3504, 127.3845),
      zoom: 7, // Country scale
      zoomControl: true,
      zoomControlOptions: {
        position: window.naver.maps.Position.BOTTOM_RIGHT
      }
    };

    const map = new window.naver.maps.Map(container, mapOptions);
    naverMapRef.current = map;

    return () => {
      if (naverMapRef.current) {
        naverMapRef.current.destroy();
        naverMapRef.current = null;
      }
    };
  }, [mapEngine]);

  // Naver Marker overlays & panning updates
  useEffect(() => {
    if (mapEngine !== 'naver' || !naverMapRef.current) return;
    const map = naverMapRef.current;

    // Clear old markers
    naverMarkersRef.current.forEach(marker => marker.setMap(null));
    naverMarkersRef.current = [];

    const bounds = new window.naver.maps.LatLngBounds();
    let hasCoords = false;

    jobs.forEach(job => {
      if (!job.latitude || !job.longitude) return;

      const style = colors[job.category] || colors['Other'];
      const emojis: Record<string, string> = {
        'Restaurant': '🍲',
        'Cafe': '☕',
        'Factory': '🏭',
        'Warehouse': '📦',
        'Convenience Store': '🏪',
        'Office': '🏢',
        'Other': '🌟'
      };
      const emoji = emojis[job.category] || emojis['Other'];

      let salaryText = '';
      if (job.salary) {
        if (job.salary >= 10000) {
          salaryText = `${(job.salary / 1000).toFixed(0)}k`;
        } else {
          salaryText = `${job.salary}`;
        }
      } else {
        salaryText = job.category[0];
      }

      const position = new window.naver.maps.LatLng(job.latitude, job.longitude);

      const marker = new window.naver.maps.Marker({
        position,
        map,
        icon: {
          content: `
            <div class="shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 flex items-center gap-1 px-2.5 py-1.5 rounded-full border-2 border-white text-white font-sans font-extrabold text-[11px] cursor-pointer select-none" style="
              background-color: ${style.bg};
              box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
              white-space: nowrap;
            ">
              <span>${emoji}</span>
              <span>${salaryText}</span>
            </div>
          `,
          anchor: new window.naver.maps.Point(42, 16)
        }
      });

      window.naver.maps.Event.addListener(marker, 'click', () => {
        onSelectJob(job);
      });

      naverMarkersRef.current.push(marker);
      bounds.extend(position);
      hasCoords = true;
    });

    if (jobs.length > 0 && hasCoords) {
      map.fitBounds(bounds, {
        top: 40,
        right: 40,
        bottom: 40,
        left: 40
      });
    }
  }, [jobs, mapEngine, onSelectJob]);

  // Naver focus panning
  useEffect(() => {
    if (mapEngine !== 'naver' || !naverMapRef.current || !selectedJob) return;
    const map = naverMapRef.current;

    const latlng = new window.naver.maps.LatLng(selectedJob.latitude, selectedJob.longitude);
    map.setCenter(latlng);
    map.setZoom(14); // Neighborhood level zoom
  }, [selectedJob, mapEngine]);

  // Leaflet user location marker rendering
  useEffect(() => {
    if (mapEngine !== 'leaflet' || !leafletMapRef.current) return;
    const map = leafletMapRef.current;

    if (leafletUserMarkerRef.current) {
      map.removeLayer(leafletUserMarkerRef.current);
      leafletUserMarkerRef.current = null;
    }

    if (!userLocation) return;

    const userIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-6 h-6">
          <div class="absolute w-6 h-6 bg-emerald-500 rounded-full opacity-40 animate-ping"></div>
          <div class="relative w-3.5 h-3.5 bg-emerald-600 border-2 border-white rounded-full shadow-md"></div>
        </div>
      `,
      className: 'user-location-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);
    leafletUserMarkerRef.current = marker;

    return () => {
      if (leafletUserMarkerRef.current && leafletMapRef.current) {
        leafletMapRef.current.removeLayer(leafletUserMarkerRef.current);
        leafletUserMarkerRef.current = null;
      }
    };
  }, [userLocation, mapEngine]);

  // Naver user location marker rendering
  useEffect(() => {
    if (mapEngine !== 'naver' || !naverMapRef.current) return;
    const map = naverMapRef.current;

    if (naverUserMarkerRef.current) {
      naverUserMarkerRef.current.setMap(null);
      naverUserMarkerRef.current = null;
    }

    if (!userLocation) return;

    const position = new window.naver.maps.LatLng(userLocation.lat, userLocation.lng);

    const marker = new window.naver.maps.Marker({
      position,
      map,
      icon: {
        content: `
          <div class="relative flex items-center justify-center w-6 h-6">
            <div class="absolute w-6 h-6 bg-emerald-500 rounded-full opacity-40 animate-ping"></div>
            <div class="relative w-3.5 h-3.5 bg-emerald-600 border-2 border-white rounded-full shadow-md"></div>
          </div>
        `,
        anchor: new window.naver.maps.Point(12, 12)
      }
    });

    naverUserMarkerRef.current = marker;

    return () => {
      if (naverUserMarkerRef.current) {
        naverUserMarkerRef.current.setMap(null);
        naverUserMarkerRef.current = null;
      }
    };
  }, [userLocation, mapEngine]);

  // ----------------------------------------------------
  // ROUTE DRAWING EFFECT (Naver Map & Leaflet Polyline)
  // ----------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    // Helper to clear existing route overlays
    const clearRouteOverlays = () => {
      if (naverCasingPolylineRef.current) { naverCasingPolylineRef.current.setMap(null); naverCasingPolylineRef.current = null; }
      if (naverPolylineRef.current) { naverPolylineRef.current.setMap(null); naverPolylineRef.current = null; }
      if (naverStartMarkerRef.current) { naverStartMarkerRef.current.setMap(null); naverStartMarkerRef.current = null; }
      if (naverEndMarkerRef.current) { naverEndMarkerRef.current.setMap(null); naverEndMarkerRef.current = null; }
      if (naverBadgeMarkerRef.current) { naverBadgeMarkerRef.current.setMap(null); naverBadgeMarkerRef.current = null; }
      if (naverVertexMarkersRef.current.length > 0) {
        naverVertexMarkersRef.current.forEach((m) => m.setMap(null));
        naverVertexMarkersRef.current = [];
      }

      if (leafletMapRef.current) {
        if (leafletCasingPolylineRef.current) { leafletMapRef.current.removeLayer(leafletCasingPolylineRef.current); leafletCasingPolylineRef.current = null; }
        if (leafletPolylineRef.current) { leafletMapRef.current.removeLayer(leafletPolylineRef.current); leafletPolylineRef.current = null; }
        if (leafletStartMarkerRef.current) { leafletMapRef.current.removeLayer(leafletStartMarkerRef.current); leafletStartMarkerRef.current = null; }
        if (leafletEndMarkerRef.current) { leafletMapRef.current.removeLayer(leafletEndMarkerRef.current); leafletEndMarkerRef.current = null; }
        if (leafletBadgeMarkerRef.current) { leafletMapRef.current.removeLayer(leafletBadgeMarkerRef.current); leafletBadgeMarkerRef.current = null; }
        if (leafletVertexMarkersRef.current.length > 0) {
          leafletVertexMarkersRef.current.forEach((m) => leafletMapRef.current?.removeLayer(m));
          leafletVertexMarkersRef.current = [];
        }
      }
    };

    clearRouteOverlays();

    if (!selectedJob || !selectedJob.latitude || !selectedJob.longitude) {
      setRouteInfo(null);
      return;
    }

    // Starting location: Use GPS position if available, or compute a realistic nearby starting point (~600m away)
    const startLoc = userLocation || {
      lat: selectedJob.latitude - 0.0055,
      lng: selectedJob.longitude - 0.0075
    };

    setIsRouting(true);

    fetchWalkingRoute(
      startLoc.lat,
      startLoc.lng,
      selectedJob.latitude,
      selectedJob.longitude
    ).then((route) => {
      if (!isMounted) return;
      setRouteInfo(route);
      setIsRouting(false);

      const mins = Math.max(1, Math.round(route.durationSeconds / 60));

      // ------------------------------------
      // Render Route on Naver Map
      // ------------------------------------
      if (mapEngine === 'naver' && naverMapRef.current) {
        const map = naverMapRef.current;
        const naverPath = route.coordinates.map(
          ([lat, lng]) => new window.naver.maps.LatLng(lat, lng)
        );

        // 1. Dark Blue Outer Casing Line (Naver Navigation Style)
        const casingPolyline = new window.naver.maps.Polyline({
          path: naverPath,
          strokeColor: '#002B99',
          strokeOpacity: 0.95,
          strokeWeight: 11,
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
          zIndex: 900
        });
        casingPolyline.setMap(map);
        naverCasingPolylineRef.current = casingPolyline;

        // 2. Bright Blue Inner Route Line
        const polyline = new window.naver.maps.Polyline({
          path: naverPath,
          strokeColor: '#0075FF',
          strokeOpacity: 1.0,
          strokeWeight: 6,
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
          zIndex: 901
        });
        polyline.setMap(map);
        naverPolylineRef.current = polyline;

        // 3. Turn Vertex Waypoint Markers (White dots at path turns)
        const vertexMarkers: any[] = [];
        const coords = route.coordinates;
        for (let i = 1; i < coords.length - 1; i++) {
          const pt = coords[i];
          const vertexMarker = new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(pt[0], pt[1]),
            map,
            icon: {
              content: `
                <div class="w-3 h-3 bg-white rounded-full border-2 border-slate-900 shadow-md transform -translate-x-1/2 -translate-y-1/2 select-none"></div>
              `,
              anchor: new window.naver.maps.Point(6, 6)
            },
            zIndex: 905
          });
          vertexMarkers.push(vertexMarker);
        }
        naverVertexMarkersRef.current = vertexMarkers;

        // 4. Start Marker "출발"
        const startMarker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(startLoc.lat, startLoc.lng),
          map,
          icon: {
            content: `
              <div class="flex flex-col items-center select-none" style="filter: drop-shadow(0 6px 14px rgba(0,0,0,0.35));">
                <div class="bg-emerald-600 text-white font-black text-[11px] px-2.5 py-0.5 rounded-full border-2 border-white flex items-center gap-1 mb-1">
                  <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  <span>출발</span>
                </div>
                <div class="w-9 h-9 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-base shadow-lg">
                  🏠
                </div>
              </div>
            `,
            anchor: new window.naver.maps.Point(22, 52)
          },
          zIndex: 1000
        });
        naverStartMarkerRef.current = startMarker;

        // 5. End Marker "도착"
        const endMarker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(selectedJob.latitude, selectedJob.longitude),
          map,
          icon: {
            content: `
              <div class="flex flex-col items-center select-none" style="filter: drop-shadow(0 6px 14px rgba(0,0,0,0.35));">
                <div class="bg-rose-600 text-white font-black text-[11px] px-2.5 py-0.5 rounded-full border-2 border-white flex items-center gap-1 mb-1">
                  <span>도착</span>
                </div>
                <div class="w-9 h-9 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-base animate-bounce shadow-lg">
                  📍
                </div>
              </div>
            `,
            anchor: new window.naver.maps.Point(22, 52)
          },
          zIndex: 1001
        });
        naverEndMarkerRef.current = endMarker;

        // 6. Route Duration Badge "추천 X분" (Exact Naver Style)
        const badgeMarker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(route.midpoint[0], route.midpoint[1]),
          map,
          icon: {
            content: `
              <div class="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl border-2 border-white flex items-center gap-2 text-xs font-black cursor-pointer transition-all hover:scale-105 active:scale-95 select-none" style="box-shadow: 0 8px 24px rgba(0,102,255,0.45);">
                <span class="bg-white text-blue-600 text-[10px] px-1.5 py-0.2 rounded font-black">추천</span>
                <span class="text-xs font-black">${mins}분</span>
              </div>
            `,
            anchor: new window.naver.maps.Point(40, 18)
          },
          zIndex: 1002
        });
        naverBadgeMarkerRef.current = badgeMarker;

        // Fit map bounds with generous padding so route line, start marker (출발), end marker (도착), and banner are all fully framed
        const bounds = new window.naver.maps.LatLngBounds();
        naverPath.forEach((pt: any) => bounds.extend(pt));
        bounds.extend(new window.naver.maps.LatLng(startLoc.lat, startLoc.lng));
        bounds.extend(new window.naver.maps.LatLng(selectedJob.latitude, selectedJob.longitude));
        map.fitBounds(bounds, { top: 100, right: 100, bottom: 160, left: 100 });
      }

      // ------------------------------------
      // Render Route on Leaflet Map
      // ------------------------------------
      if (mapEngine === 'leaflet' && leafletMapRef.current) {
        const map = leafletMapRef.current;

        // 1. Casing Polyline
        const casingPolyline = L.polyline(route.coordinates, {
          color: '#002B99',
          weight: 10,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
        leafletCasingPolylineRef.current = casingPolyline;

        // 2. Core Polyline
        const polyline = L.polyline(route.coordinates, {
          color: '#0075FF',
          weight: 6,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
        leafletPolylineRef.current = polyline;

        // 3. Vertex Turn Markers
        const leafVertexes: L.Marker[] = [];
        const coords = route.coordinates;
        for (let i = 1; i < coords.length - 1; i++) {
          const pt = coords[i];
          const nodeIcon = L.divIcon({
            html: `<div class="w-3 h-3 bg-white rounded-full border-2 border-slate-900 shadow-md"></div>`,
            className: 'custom-route-vertex',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });
          const m = L.marker([pt[0], pt[1]], { icon: nodeIcon }).addTo(map);
          leafVertexes.push(m);
        }
        leafletVertexMarkersRef.current = leafVertexes;

        // Start Icon
        const startIcon = L.divIcon({
          html: `
            <div class="flex flex-col items-center select-none" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));">
              <div class="bg-emerald-600 text-white font-extrabold text-[11px] px-2 py-0.5 rounded-full border-2 border-white mb-1">
                출발
              </div>
              <div class="w-8 h-8 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-xs">
                🏠
              </div>
            </div>
          `,
          className: 'custom-route-start',
          iconSize: [40, 52],
          iconAnchor: [20, 52]
        });
        leafletStartMarkerRef.current = L.marker([startLoc.lat, startLoc.lng], { icon: startIcon }).addTo(map);

        // End Icon
        const endIcon = L.divIcon({
          html: `
            <div class="flex flex-col items-center select-none" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));">
              <div class="bg-rose-600 text-white font-extrabold text-[11px] px-2 py-0.5 rounded-full border-2 border-white mb-1">
                도착
              </div>
              <div class="w-8 h-8 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-xs animate-bounce">
                📍
              </div>
            </div>
          `,
          className: 'custom-route-end',
          iconSize: [40, 52],
          iconAnchor: [20, 52]
        });
        leafletEndMarkerRef.current = L.marker([selectedJob.latitude, selectedJob.longitude], { icon: endIcon }).addTo(map);

        // Badge Icon
        const badgeIcon = L.divIcon({
          html: `
            <div class="bg-blue-600 text-white px-3.5 py-1.5 rounded-xl border-2 border-white flex items-center gap-1.5 text-xs font-black select-none shadow-xl">
              <span class="bg-white text-blue-600 text-[10px] px-1.5 py-0.2 rounded font-black">추천</span>
              <span>${mins}분</span>
            </div>
          `,
          className: 'custom-route-badge',
          iconSize: [84, 38],
          iconAnchor: [42, 19]
        });
        leafletBadgeMarkerRef.current = L.marker([route.midpoint[0], route.midpoint[1]], { icon: badgeIcon }).addTo(map);

        const routeBounds = polyline.getBounds();
        routeBounds.extend([startLoc.lat, startLoc.lng]);
        routeBounds.extend([selectedJob.latitude, selectedJob.longitude]);
        map.fitBounds(routeBounds, {
          paddingTopLeft: [80, 80],
          paddingBottomRight: [80, 160]
        });
      }
    });

    return () => {
      isMounted = false;
      clearRouteOverlays();
    };
  }, [userLocation, selectedJob, mapEngine]);

  // ----------------------------------------------------
  // RESIZE AND REFRESH LISTENERS
  // ----------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      if (mapEngine === 'leaflet' && leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      } else if (mapEngine === 'naver' && naverMapRef.current) {
        window.naver.maps.Event.trigger(naverMapRef.current, 'resize');
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [mapEngine]);

  return (
    <div className="relative w-full h-full min-h-[300px] md:min-h-[400px] rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-slate-100">
      
      {/* Loading overlay */}
      {mapEngine === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-md z-[500] gap-3 text-slate-600 animate-in fade-in duration-300">
          <div className="w-8 h-8 rounded-full border-4 border-slate-300 border-t-emerald-600 animate-spin" />
          <p className="text-xs font-bold text-slate-500 font-display">Đang tải bản đồ tuyển dụng Naver Map...</p>
        </div>
      )}

      {/* Map container DOM */}
      <div ref={containerRef} className="w-full h-full z-0" id="map-container" />

      {/* Action Controls */}
      <div className="absolute top-4 right-4 z-[400] flex gap-2 items-center">
        {/* Locate Me Button */}
        <button 
          onClick={handleLocate}
          disabled={isLocating}
          className={`p-2 rounded-full shadow-md border backdrop-blur-md transition-all cursor-pointer flex items-center justify-center ${
            userLocation 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' 
              : 'bg-white/90 border-slate-200/80 text-slate-700 hover:text-emerald-600 hover:bg-slate-50'
          }`}
          title="Định vị vị trí của tôi"
        >
          {isLocating ? (
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
          ) : (
            <Navigation className={`w-4 h-4 ${userLocation ? 'text-emerald-600 animate-pulse' : 'text-slate-700'}`} />
          )}
        </button>

        <button 
          onClick={() => setShowConfigModal(true)}
          className="bg-white/90 backdrop-blur-md p-2 rounded-full shadow-md border border-slate-200/80 text-slate-700 hover:text-emerald-600 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center"
          title="Cấu hình Naver Map API"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md border border-slate-200/80 text-[10px] font-extrabold text-slate-700 flex items-center gap-1.5 select-none uppercase tracking-wide">
          <span className={`w-1.5 h-1.5 rounded-full ${mapEngine === 'naver' ? 'bg-emerald-500 animate-pulse' : mapEngine === 'leaflet' ? 'bg-blue-500' : 'bg-slate-300'}`} />
          <span>Bản đồ: {mapEngine === 'naver' ? 'Naver Map 💚' : 'Dự phòng 🌍'}</span>
        </div>
      </div>

      {/* Geolocation Error Alert */}
      {locationError && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:max-w-xs z-[400] bg-rose-500 text-white p-3.5 rounded-2xl shadow-2xl flex items-start gap-2.5 border border-rose-600 animate-in slide-in-from-bottom-4 duration-300">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-100" />
          <div className="space-y-1">
            <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-rose-100">Lỗi định vị</h5>
            <p className="text-[10px] font-medium leading-relaxed text-rose-50">
              {locationError}
            </p>
          </div>
        </div>
      )}

      {/* Floating Route Suggestion Banner (Naver Style) */}
      {selectedJob && routeInfo && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-[1100] bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 space-y-3 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
                <Footprints className="w-5 h-5 animate-pulse text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <span className="text-emerald-400">출발 {userLocation ? '(GPS)' : '(Gần đó)'}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="text-rose-400">도착 ({selectedJob.district || 'Nơi làm'})</span>
                </div>
                <h4 className="text-xs font-extrabold text-white truncate max-w-[200px]">
                  {selectedJob.title}
                </h4>
              </div>
            </div>
            <button
              onClick={() => setRouteInfo(null)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Đóng chỉ đường"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs font-bold gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                <span className="bg-white text-blue-600 text-[9px] px-1 py-0.2 rounded font-black">추천</span>
                <span>{Math.max(1, Math.round(routeInfo.durationSeconds / 60))}분</span>
              </span>
              <span className="text-slate-300 text-[11px]">
                {routeInfo.distanceMeters >= 1000
                  ? `${(routeInfo.distanceMeters / 1000).toFixed(1)} km`
                  : `${Math.round(routeInfo.distanceMeters)} m`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleFocusRoute}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-[11px] rounded-xl transition-all active:scale-95 flex items-center gap-1 cursor-pointer border border-slate-700"
                title="Căn chỉnh thu phóng vừa toàn bộ tuyến đường"
              >
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                <span>Toàn cảnh</span>
              </button>

              <a
                href={getNaverMapDirectionUrl(
                  selectedJob.latitude,
                  selectedJob.longitude,
                  selectedJob.title,
                  userLocation?.lat,
                  userLocation?.lng
                )}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Mở Naver</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Small floating map legend */}
      <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-slate-200/80 text-[11px] leading-relaxed text-slate-600 max-w-[200px] hidden sm:block">
        <h4 className="font-bold text-slate-950 mb-1.5 font-display text-xs">Loại công việc</h4>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
            <span>Nhà hàng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f97316' }} />
            <span>Cà phê</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#a855f7' }} />
            <span>Nhà xưởng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#6366f1' }} />
            <span>Kho bãi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
            <span>Cửa hàng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ec4899' }} />
            <span>Văn phòng</span>
          </div>
        </div>
      </div>

      {/* Naver Map Config & Guide Modal */}
      {showConfigModal && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-5 max-h-[90%] overflow-y-auto space-y-4 text-slate-700 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4 text-emerald-500 animate-spin-slow" />
                  Cấu hình Naver Map API
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Kết nối với nền tảng bản đồ Naver Cloud Platform Hàn Quốc</p>
              </div>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Guide Steps */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl space-y-2">
                <h4 className="font-extrabold text-emerald-900 flex items-center gap-1.5 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
                  Đăng ký Domain trên Naver Cloud Console
                </h4>
                <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
                  Naver Map API yêu cầu thêm URL của trang web vào danh sách <strong>Web Dynamic Map Web Service URL</strong> trên Naver Cloud Platform, nếu không sẽ gặp lỗi 403 / Unregistered Domain.
                </p>
              </div>

              {/* Dynamic Domain Copy */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Web Service URL cần thêm:</span>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2 justify-between">
                  <code className="text-[11px] font-mono font-bold text-slate-800 break-all select-all">
                    {window.location.origin}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin);
                      setCopiedDomain('origin');
                      setTimeout(() => setCopiedDomain(null), 2000);
                    }}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-all flex-shrink-0 cursor-pointer"
                    title="Copy domain"
                  >
                    {copiedDomain === 'origin' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Step List */}
              <div className="space-y-1.5 text-[11px] font-medium text-slate-600">
                <div className="flex gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">1</span>
                  <span>Truy cập <a href="https://console.ncloud.com/" target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-0.5">console.ncloud.com <ExternalLink className="w-2.5 h-2.5 inline" /></a></span>
                </div>
                <div className="flex gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">2</span>
                  <span>Vào <strong>Services &gt; AI·NAVER API &gt; Maps</strong> &gt; Register Application (Chọn Web Dynamic Map).</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">3</span>
                  <span>Thêm URL domain ở trên vào ô <strong>Web Service URL</strong> và sao chép <strong>Client ID</strong>.</span>
                </div>
              </div>

              {/* Client Type Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Loại tài khoản Naver API
                </label>
                <select
                  value={clientType}
                  onChange={(e) => setClientType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                >
                  <option value="ncpClientId">Thông thường (NCP - ncpClientId)</option>
                  <option value="govClientId">Cơ quan công ích (Gov - govClientId)</option>
                  <option value="finClientId">Tài chính (Fin - finClientId)</option>
                </select>
              </div>

              {/* API Key Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex justify-between">
                  <span>Naver Map Client ID</span>
                  {localStorage.getItem('naver_map_client_id') && (
                    <span className="text-emerald-600 font-bold normal-case">Đang dùng Client ID riêng</span>
                  )}
                </label>
                <input 
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Nhập Naver Client ID (ncpClientId)..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 border-t border-slate-100 pt-3">
              {localStorage.getItem('naver_map_client_id') && (
                <button
                  onClick={() => {
                    localStorage.removeItem('naver_map_client_id');
                    localStorage.removeItem('naver_map_client_type');
                    setClientId('');
                    window.location.reload();
                  }}
                  className="flex-1 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  Xóa Key
                </button>
              )}
              <button
                onClick={() => {
                  if (clientId.trim()) {
                    localStorage.setItem('naver_map_client_id', clientId.trim());
                    localStorage.setItem('naver_map_client_type', clientType);
                  } else {
                    localStorage.removeItem('naver_map_client_id');
                    localStorage.removeItem('naver_map_client_type');
                  }
                  window.location.reload();
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Lưu & Tải lại</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

