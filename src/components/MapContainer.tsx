/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Job } from '../types';
import { Settings, ExternalLink, Copy, Check, Info, AlertTriangle, X, RefreshCw, Navigation } from 'lucide-react';

declare global {
  interface Window {
    kakao: any;
  }
}

interface MapContainerProps {
  jobs: Job[];
  selectedJob: Job | null;
  onSelectJob: (job: Job) => void;
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

export default function MapContainer({ jobs, selectedJob, onSelectJob }: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Map engine selection: 'loading' | 'kakao' | 'leaflet'
  const [mapEngine, setMapEngine] = useState<'loading' | 'kakao' | 'leaflet'>('loading');

  // UI States for Kakao setup
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inputKey, setInputKey] = useState(() => {
    return localStorage.getItem('kakao_map_app_key') || (import.meta as any).env?.VITE_KAKAO_MAP_KEY || '';
  });
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  // Leaflet refs
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersRef = useRef<Record<string, L.Marker>>({});

  // Kakao refs
  const kakaoMapRef = useRef<any>(null);
  const kakaoOverlaysRef = useRef<any[]>([]);

  // Geolocation states & refs
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const leafletUserMarkerRef = useRef<L.Marker | null>(null);
  const kakaoUserOverlayRef = useRef<any>(null);

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
        } else if (mapEngine === 'kakao' && kakaoMapRef.current) {
          const latlng = new window.kakao.maps.LatLng(lat, lng);
          kakaoMapRef.current.panTo(latlng);
          kakaoMapRef.current.setLevel(3); // Zoom closely
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

  // 1. Detect and Load Map Engine
  useEffect(() => {
    let active = true;

    const loadEngine = async () => {
      // 1. Check if user configured a custom Kakao Map key (local storage preferred for user flexibility)
      const localKey = localStorage.getItem('kakao_map_app_key');
      const configuredKey = (import.meta as any).env?.VITE_KAKAO_MAP_KEY;
      
      // Use configured local storage key, env key, or fallback to default developer key
      const appKey = localKey || configuredKey || '75b0b18f08a46b5db4485573489839c4';

      if (!appKey) {
        if (active) setMapEngine('leaflet');
        return;
      }

      // Try loading Kakao map script
      try {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(() => {
            if (active) setMapEngine('kakao');
          });
          return;
        }

        const script = document.createElement('script');
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
        script.async = true;
        
        const scriptPromise = new Promise<boolean>((resolve) => {
          script.onload = () => {
            if (window.kakao && window.kakao.maps) {
              window.kakao.maps.load(() => {
                resolve(true);
              });
            } else {
              resolve(false);
            }
          };
          script.onerror = () => resolve(false);
        });

        document.head.appendChild(script);

        // Add 3.5s timeout for script load to avoid freezing in offline or blocked regions
        const loaded = await Promise.race([
          scriptPromise,
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3500))
        ]);

        if (loaded && window.kakao && window.kakao.maps) {
          if (active) setMapEngine('kakao');
        } else {
          if (active) setMapEngine('leaflet');
        }
      } catch (err) {
        console.warn('Kakao map loading failed, falling back to OpenStreetMap:', err);
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

    // Get letter code & styling
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
  // ENGINE B: KAKAO MAPS ENGINE (PRIMARY)
  // ----------------------------------------------------
  useEffect(() => {
    if (mapEngine !== 'kakao' || !containerRef.current) return;

    const container = containerRef.current;
    
    // Center of South Korea in Kakao Map [36.3504, 127.3845]
    const options = {
      center: new window.kakao.maps.LatLng(36.3504, 127.3845),
      level: 9 // Country overview
    };

    const map = new window.kakao.maps.Map(container, options);
    
    // Zoom control & map types control
    const zoomControl = new window.kakao.maps.ZoomControl();
    map.addControl(zoomControl, window.kakao.maps.ControlPosition.BOTTOMRIGHT);

    kakaoMapRef.current = map;

    return () => {
      // Clear container on cleanup
      container.innerHTML = '';
      kakaoMapRef.current = null;
    };
  }, [mapEngine]);

  // Kakao Marker overlays & panning updates
  useEffect(() => {
    if (mapEngine !== 'kakao' || !kakaoMapRef.current) return;
    const map = kakaoMapRef.current;

    // Clear old custom overlays
    kakaoOverlaysRef.current.forEach(overlay => overlay.setMap(null));
    kakaoOverlaysRef.current = [];

    const bounds = new window.kakao.maps.LatLngBounds();
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

      // Create raw HTML element to easily bind React state / DOM event handler
      const overlayEl = document.createElement('div');
      overlayEl.className = 'cursor-pointer';
      overlayEl.innerHTML = `
        <div class="shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 flex items-center gap-1 px-2.5 py-1.5 rounded-full border-2 border-white text-white font-sans font-extrabold text-[11px]" style="
          background-color: ${style.bg};
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
          white-space: nowrap;
        ">
          <span>${emoji}</span>
          <span>${salaryText}</span>
        </div>
      `;

      // Custom Overlay is click sensitive
      overlayEl.addEventListener('click', () => {
        onSelectJob(job);
      });

      const latlng = new window.kakao.maps.LatLng(job.latitude, job.longitude);
      
      const overlay = new window.kakao.maps.CustomOverlay({
        position: latlng,
        content: overlayEl,
        xAnchor: 0.5,
        yAnchor: 0.5
      });

      overlay.setMap(map);
      kakaoOverlaysRef.current.push(overlay);

      bounds.extend(latlng);
      hasCoords = true;
    });

    if (jobs.length > 0 && hasCoords) {
      map.setBounds(bounds);
    }
  }, [jobs, mapEngine, onSelectJob]);

  // Kakao focus panning
  useEffect(() => {
    if (mapEngine !== 'kakao' || !kakaoMapRef.current || !selectedJob) return;
    const map = kakaoMapRef.current;

    const latlng = new window.kakao.maps.LatLng(selectedJob.latitude, selectedJob.longitude);
    map.panTo(latlng);
    map.setLevel(4); // Town zoom details
  }, [selectedJob, mapEngine]);

  // Leaflet user location marker rendering
  useEffect(() => {
    if (mapEngine !== 'leaflet' || !leafletMapRef.current) return;
    const map = leafletMapRef.current;

    // Clean up old user marker
    if (leafletUserMarkerRef.current) {
      map.removeLayer(leafletUserMarkerRef.current);
      leafletUserMarkerRef.current = null;
    }

    if (!userLocation) return;

    const userIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-6 h-6">
          <div class="absolute w-6 h-6 bg-blue-500 rounded-full opacity-40 animate-ping"></div>
          <div class="relative w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md"></div>
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

  // Kakao user location marker rendering
  useEffect(() => {
    if (mapEngine !== 'kakao' || !kakaoMapRef.current) return;
    const map = kakaoMapRef.current;

    // Clean up old user overlay
    if (kakaoUserOverlayRef.current) {
      kakaoUserOverlayRef.current.setMap(null);
      kakaoUserOverlayRef.current = null;
    }

    if (!userLocation) return;

    const overlayEl = document.createElement('div');
    overlayEl.className = 'relative flex items-center justify-center w-6 h-6';
    overlayEl.innerHTML = `
      <div class="absolute w-6 h-6 bg-blue-500 rounded-full opacity-40 animate-ping"></div>
      <div class="relative w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md"></div>
    `;

    const latlng = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    const overlay = new window.kakao.maps.CustomOverlay({
      position: latlng,
      content: overlayEl,
      xAnchor: 0.5,
      yAnchor: 0.5
    });

    overlay.setMap(map);
    kakaoUserOverlayRef.current = overlay;

    return () => {
      if (kakaoUserOverlayRef.current) {
        kakaoUserOverlayRef.current.setMap(null);
        kakaoUserOverlayRef.current = null;
      }
    };
  }, [userLocation, mapEngine]);


  // ----------------------------------------------------
  // RESIZE AND REFRESH LISTENERS
  // ----------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      if (mapEngine === 'leaflet' && leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      } else if (mapEngine === 'kakao' && kakaoMapRef.current) {
        kakaoMapRef.current.relayout();
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [mapEngine]);

  return (
    <div className="relative w-full h-full min-h-[300px] md:min-h-[400px] rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-slate-100">
      
      {/* Loading overlay for engine swaps */}
      {mapEngine === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-md z-[500] gap-3 text-slate-600 animate-in fade-in duration-300">
          <div className="w-8 h-8 rounded-full border-4 border-slate-300 border-t-blue-600 animate-spin" />
          <p className="text-xs font-bold text-slate-500 font-display">Đang tải bản đồ tuyển dụng KakaoMap...</p>
        </div>
      )}

      {/* Map container DOM */}
      <div ref={containerRef} className="w-full h-full z-0" id="map-container" />

      {/* Mini indicator showing current active engine */}
      <div className="absolute top-4 right-4 z-[400] flex gap-2 items-center">
        {/* Locate Me Button */}
        <button 
          onClick={handleLocate}
          disabled={isLocating}
          className={`p-2 rounded-full shadow-md border backdrop-blur-md transition-all cursor-pointer flex items-center justify-center ${
            userLocation 
              ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100' 
              : 'bg-white/90 border-slate-200/80 text-slate-700 hover:text-blue-600 hover:bg-slate-50'
          }`}
          title="Định vị vị trí của tôi"
        >
          {isLocating ? (
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          ) : (
            <Navigation className={`w-4 h-4 ${userLocation ? 'text-blue-600 animate-pulse' : 'text-slate-700'}`} />
          )}
        </button>

        <button 
          onClick={() => setShowConfigModal(true)}
          className="bg-white/90 backdrop-blur-md p-2 rounded-full shadow-md border border-slate-200/80 text-slate-700 hover:text-amber-500 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center"
          title="Cấu hình Kakao Map"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md border border-slate-200/80 text-[10px] font-extrabold text-slate-700 flex items-center gap-1.5 select-none uppercase tracking-wide">
          <span className={`w-1.5 h-1.5 rounded-full ${mapEngine === 'kakao' ? 'bg-amber-400 animate-pulse' : mapEngine === 'leaflet' ? 'bg-blue-500' : 'bg-slate-300'}`} />
          <span>Bản đồ: {mapEngine === 'kakao' ? 'Kakao Map 🗺️' : 'Dự phòng 🌍'}</span>
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

      {/* Kakao Map Config & Guide Modal */}
      {showConfigModal && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-5 max-h-[90%] overflow-y-auto space-y-4 text-slate-700 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-500 animate-spin-slow" />
                  Cấu hình Kakao Map API
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Kết nối với nền tảng bản đồ Kakao Hàn Quốc</p>
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
              <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl space-y-2">
                <h4 className="font-extrabold text-amber-900 flex items-center gap-1.5 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                  Lưu ý bắt buộc về Domain đăng ký
                </h4>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  Kakao Map yêu cầu bạn phải đăng ký đúng Domain của website trong <strong>Kakao Developer Console</strong> (App Settings &gt; Platform &gt; Web), nếu không bản đồ sẽ bị khóa và hiển thị ô trắng.
                </p>
              </div>

              {/* Dynamic Domain Copy */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Domain cần đăng ký:</span>
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
                    title="Copy link"
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
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">1</span>
                  <span>Truy cập <a href="https://developers.kakao.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">developers.kakao.com <ExternalLink className="w-2.5 h-2.5 inline" /></a></span>
                </div>
                <div className="flex gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">2</span>
                  <span>Tạo ứng dụng mới và thêm Web Platform với domain phía trên.</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">3</span>
                  <span>Sao chép <strong>JavaScript App Key</strong> và dán vào ô bên dưới.</span>
                </div>
              </div>

              {/* API Key Input */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex justify-between">
                  <span>JavaScript App Key của bạn</span>
                  {localStorage.getItem('kakao_map_app_key') && (
                    <span className="text-emerald-600 font-bold normal-case">Đang sử dụng Key riêng</span>
                  )}
                </label>
                <input 
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="Dán JavaScript App Key..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 border-t border-slate-100 pt-3">
              {localStorage.getItem('kakao_map_app_key') && (
                <button
                  onClick={() => {
                    localStorage.removeItem('kakao_map_app_key');
                    setInputKey('');
                    window.location.reload();
                  }}
                  className="flex-1 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  Xóa Key (Dùng mặc định)
                </button>
              )}
              <button
                onClick={() => {
                  if (inputKey.trim()) {
                    localStorage.setItem('kakao_map_app_key', inputKey.trim());
                  } else {
                    localStorage.removeItem('kakao_map_app_key');
                  }
                  window.location.reload();
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
