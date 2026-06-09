import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PoiModal } from './PoiModal';
import { Navigation, MapPin, Eye, EyeOff, Database, Images, ChevronLeft, ChevronRight, Route, Navigation2, Filter, MoreVertical, X } from 'lucide-react';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { MacWithAdvisor, PoiType } from '../types/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { POI_CATALOG_MAP } from '../data/poiCatalog';

// Light theme map styling (Institutional UI)
const mapStyles = `
  .leaflet-popup-content-wrapper {
    background-color: #ffffff !important;
    color: #1f2937 !important;
    border-radius: 12px !important;
    border: 1px solid #e5e7eb !important;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1) !important;
    padding: 0 !important;
  }
  .leaflet-popup-tip {
    background-color: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-top: none !important;
    border-left: none !important;
  }
  .leaflet-popup-content {
    margin: 0 !important;
    width: 300px !important;
    max-width: calc(100vw - 48px) !important;
  }
  .leaflet-container a.leaflet-popup-close-button {
    color: #9ca3af !important;
    padding: 14px 14px 0 0 !important;
    transition: color 0.2s;
  }
  .leaflet-container a.leaflet-popup-close-button:hover {
    color: #111827 !important;
  }
`;

const createMacIcon = (isActive: boolean, pinColor: string = '#002D72') => L.divIcon({
  className: 'bg-transparent',
  html: `<div class="relative w-12 h-12 flex items-center justify-center transform transition-transform duration-300 hover:scale-110 ${isActive ? 'scale-110' : ''}">
           ${isActive ? `<div class="absolute inset-0 rounded-full animate-ping" style="background-color:${pinColor};opacity:0.2;"></div>` : ''}
           <div class="relative w-10 h-10 border-[3px] border-[#F2A900] rounded-full flex items-center justify-center shadow-lg z-10" style="background-color:${pinColor}">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#ffffff"/></svg>
           </div>
         </div>`,
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  popupAnchor: [0, -48]
});

const getPoiIcon = (type: string) => {
  const normalizedType: PoiType = (type in POI_CATALOG_MAP ? type : 'services') as PoiType;
  return L.divIcon({
    className: 'bg-transparent',
    html: POI_CATALOG_MAP[normalizedType].markerHtml,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const MapUpdater = ({ activeCenter }: { activeCenter: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (activeCenter && !isNaN(activeCenter[0]) && !isNaN(activeCenter[1])) {
      map.flyTo(activeCenter, 14, { duration: 1.5, easeLinearity: 0.25 });
    }
  }, [activeCenter, map]);
  return null;
};

interface MapComponentProps {
  markers: MacWithAdvisor[];
  selectedMacId?: number | string | null;
  onSelectMac?: (id: number | string) => void;
  disableControls?: boolean;
}

export const MapComponent: React.FC<MapComponentProps> = ({ markers, selectedMacId, onSelectMac, disableControls = false }) => {
  const [activeMac, setActiveMac] = useState<MacWithAdvisor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCenter, setActiveCenter] = useState<[number, number]>([25.7904, -108.9858]);
  const [showAllMacs, setShowAllMacs] = useState(false);
  const [advisorFilter, setAdvisorFilter] = useState<string>('all');
  const [controlsOpen, setControlsOpen] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [userDistanceKm, setUserDistanceKm] = useState<number | null>(null);
  const markerRefs = React.useRef<{ [key: string]: any }>({});

  const losMochis = markers.find((m) => m.name.toLowerCase() === 'los mochis');
  const losMochisCoords: [number, number] = losMochis ? [losMochis.lat, losMochis.lng] : [25.7904, -108.9858];

  const toRad = (value: number) => (value * Math.PI) / 180;
  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Center map on first marker when markers load
  useEffect(() => {
    if (markers.length > 0) {
      const first = markers[0];
      if (typeof first.lat === 'number' && typeof first.lng === 'number' && !isNaN(first.lat) && !isNaN(first.lng)) {
        setActiveCenter([first.lat, first.lng]);
      }
    }
  }, [markers]);

  // Pan to selected MAC and open popup
  useEffect(() => {
    if (selectedMacId) {
      const mac = markers.find(m => m.id === selectedMacId);
      if (mac && typeof mac.lat === 'number' && typeof mac.lng === 'number' && !isNaN(mac.lat) && !isNaN(mac.lng)) {
        setActiveMac(mac);
        setActiveCenter([mac.lat + 0.025, mac.lng]);
        const timer = setTimeout(() => {
          const marker = markerRefs.current[mac.id];
          if (marker && !marker.isPopupOpen()) {
            marker.openPopup();
          }
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedMacId, markers]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!activeMac) return;
        const distance = haversineKm(position.coords.latitude, position.coords.longitude, activeMac.lat, activeMac.lng);
        setUserDistanceKm(distance);
      },
      () => setUserDistanceKm(null),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeMac]);

  const handleNavigate = (mac: MacWithAdvisor) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${mac.lat},${mac.lng}`, '_blank');
  };

  const activePois = activeMac?.pois
    ? [...activeMac.pois].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : [];
  const advisorsList = useMemo(() => {
    const byId = new Map<string, NonNullable<MacWithAdvisor['advisor']>>();
    markers.forEach((m) => { if (m.advisor) byId.set(m.advisor.id, m.advisor); });
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [markers]);

  const filteredMarkers = useMemo(
    () => (advisorFilter === 'all' ? markers : markers.filter((m) => m.advisor?.id === advisorFilter)),
    [markers, advisorFilter],
  );

  const isFilteringByAdvisor = advisorFilter !== 'all';
  const shouldShowAllPins = showAllMacs || isFilteringByAdvisor;
  const visibleMarkers = shouldShowAllPins ? filteredMarkers : (activeMac ? [activeMac] : []);
  const getMacGallery = (mac: MacWithAdvisor) => {
    if (mac.mac_images && mac.mac_images.length > 0) return mac.mac_images;
    if (mac.image_url) {
      return [{ id: `single-${mac.id}`, mac_id: String(mac.id), photo_url: mac.image_url, sort_order: 0, created_at: mac.created_at }];
    }
    return [];
  };

  return (
    <div className="relative w-full h-full bg-gray-50">
      <style>{mapStyles}</style>

      {/* Controles del mapa: botón de 3 puntos + panel desplegable */}
      <div className={`absolute bottom-4 left-4 z-[1000] transition-opacity ${disableControls ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
        {/* Botón de 3 puntitos */}
        <button
          type="button"
          onClick={() => setControlsOpen((prev) => !prev)}
          aria-label="Opciones del mapa"
          aria-expanded={controlsOpen}
          className={`w-10 h-10 rounded-full bg-white shadow-lg border flex items-center justify-center transition-colors ${
            controlsOpen || isFilteringByAdvisor || showAllMacs
              ? 'border-[#002D72]/40 text-[#002D72]'
              : 'border-gray-200 text-gray-600 hover:text-[#002D72] hover:border-[#002D72]/30'
          }`}
        >
          <MoreVertical className="w-5 h-5" />
          {(isFilteringByAdvisor || showAllMacs) && !controlsOpen && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#F2A900] border-2 border-white" />
          )}
        </button>

        {/* Panel desplegable */}
        {controlsOpen && (
          <div className="absolute bottom-12 left-0 w-[calc(100vw-2rem)] max-w-xs sm:w-64 bg-white p-3 rounded-xl shadow-xl border border-gray-200 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#002D72]" /> Opciones del mapa
              </span>
              <button
                type="button"
                onClick={() => setControlsOpen(false)}
                aria-label="Cerrar opciones"
                className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-px bg-gray-100" />

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filtrar por asesor
              </span>
              <Select value={advisorFilter} onValueChange={setAdvisorFilter}>
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Todos los asesores" />
                </SelectTrigger>
                <SelectContent className="z-[2000] max-h-64">
                  <SelectItem value="all">Todos los asesores</SelectItem>
                  {advisorsList.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-gray-300 shrink-0"
                          style={{ backgroundColor: a.pin_color || '#002D72' }}
                        />
                        {a.title} {a.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {advisorsList.length === 0 && (
                <p className="text-xs text-gray-400">No hay asesores asignados a MACs.</p>
              )}
              {isFilteringByAdvisor && (
                <p className="text-xs text-[#002D72]">
                  Mostrando {filteredMarkers.length} MAC{filteredMarkers.length === 1 ? '' : 's'} de este asesor.
                </p>
              )}
            </div>

            <div className="h-px bg-gray-100" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {showAllMacs ? <Eye className="w-4 h-4 text-[#002D72] shrink-0" /> : <EyeOff className="w-4 h-4 text-gray-400 shrink-0" />}
                <span className="text-sm font-medium text-gray-700 truncate">Mostrar todos los MACs</span>
              </div>
              <Switch
                checked={showAllMacs}
                onCheckedChange={setShowAllMacs}
                className="data-[state=checked]:bg-[#002D72] shrink-0"
              />
            </div>
          </div>
        )}
      </div>

      {/* No data overlay */}
      {markers.length === 0 && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-gray-200 max-w-sm mx-4">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Database className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Sin datos disponibles</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Configura la conexión a Supabase para visualizar los Módulos de Atención Comunitaria en el mapa.
            </p>
          </div>
        </div>
      )}

      <MapContainer
        center={activeCenter}
        zoom={10}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">Carto</a> &copy; OSM'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapUpdater activeCenter={activeCenter} />

        {visibleMarkers.map((mac) => {
          if (typeof mac.lat !== 'number' || typeof mac.lng !== 'number' || isNaN(mac.lat) || isNaN(mac.lng)) return null;
          return (
            <Marker
              key={mac.id}
              ref={(r) => { if (r) markerRefs.current[mac.id] = r; }}
              position={[mac.lat, mac.lng]}
              icon={createMacIcon(activeMac?.id === mac.id, mac.advisor?.pin_color || '#002D72')}
              eventHandlers={{
                click: () => {
                  setActiveMac(mac);
                  if (onSelectMac) onSelectMac(mac.id);
                  setActiveCenter([mac.lat + 0.025, mac.lng]);
                }
              }}
            >
              <Popup offset={[0, 10]}>
                <div className="p-5">
                  <div className="mb-4">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#002D72]/10 text-[#002D72] text-[10px] font-bold uppercase tracking-wider mb-3">
                      <MapPin size={10} />
                      Módulo MAC
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 leading-tight">Módulo de Atención Comunitaria {mac.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{mac.details}</p>

                    <div className="mt-4 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      {mac.advisor ? (
                        <div className="flex items-center gap-3">
                          {mac.advisor.photo_url ? (
                            <img
                              src={mac.advisor.photo_url}
                              alt={`${mac.advisor.title} ${mac.advisor.name}`}
                              className="w-20 h-20 rounded-full object-cover border-[3px] border-[#002D72]/25 shadow-sm"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-[#002D72] flex items-center justify-center text-white font-bold text-lg border-[3px] border-[#F2A900]">
                              {mac.advisor.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('')}
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] text-gray-500 block font-normal mb-0.5">Encargado</span>
                            <span className="text-base font-semibold text-gray-800 leading-tight block">{mac.advisor.title} {mac.advisor.name}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Sin encargado asignado</p>
                      )}

                      <div className="w-full h-px bg-gray-200 my-3"></div>

                      <div>
                        <span className="text-[10px] text-gray-500 block font-normal mb-0.5">Horario de Oficina</span>
                        <span className="text-sm font-semibold text-gray-800">{mac.schedule}</span>
                      </div>

                      {mac.advisor?.academic_program?.name && (
                        <>
                          <div className="w-full h-px bg-gray-200 my-3"></div>
                          <div>
                            <span className="text-[10px] text-gray-500 block font-normal mb-0.5">Formación Académica</span>
                            <span className="text-sm font-semibold text-gray-800">{mac.advisor.academic_program.name}</span>
                          </div>
                        </>
                      )}

                      {mac.name.toLowerCase() !== 'los mochis' && (
                        <>
                          <div className="w-full h-px bg-gray-200 my-3"></div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-[#002D72]">
                              <Route size={12} />
                              <span>Distancia aprox. desde MAC Los Mochis: {haversineKm(losMochisCoords[0], losMochisCoords[1], mac.lat, mac.lng).toFixed(1)} km</span>
                            </div>
                            {userDistanceKm !== null && (
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Navigation2 size={12} />
                                <span>Desde tu ubicación GPS: {userDistanceKm.toFixed(1)} km</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 mt-5">
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 bg-[#002D72] hover:bg-[#001f50] text-white py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-[#002D72]/20"
                    >
                      Puntos de interés
                    </button>
                    {getMacGallery(mac).length > 0 && (
                      <button
                        onClick={() => {
                          setPhotoIndex(0);
                          setActiveMac({ ...mac, mac_images: getMacGallery(mac) });
                          setPhotoViewerOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-[#F2A900] hover:bg-[#e39c00] text-[#002D72] py-2.5 rounded-xl text-sm font-semibold transition-all"
                      >
                        Ver fotos del módulo <Images size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleNavigate(mac)}
                      className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors border border-gray-200 shadow-sm"
                    >
                      Cómo llegar <Navigation size={14} className="text-[#F2A900]" />
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {activeMac && activePois.map((poi) => {
          if (typeof poi.lat !== 'number' || typeof poi.lng !== 'number' || isNaN(poi.lat) || isNaN(poi.lng)) return null;
          return (
            <Marker
              key={poi.id}
              position={[poi.lat, poi.lng]}
              icon={getPoiIcon(poi.type)}
            >
              <Popup offset={[0, 10]}>
                <div className="p-3">
                  <p className="font-semibold text-sm text-gray-900 mb-0.5">{poi.name}</p>
                  <p className="text-xs text-gray-500">{poi.description}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fotos del MAC {activeMac?.name}</DialogTitle>
            <DialogDescription>
              Galería de imágenes registradas para este módulo MAC.
            </DialogDescription>
          </DialogHeader>
          {activeMac?.mac_images && activeMac.mac_images.length > 0 ? (
            <div className="space-y-3">
              <div className="relative">
                <img
                  src={activeMac.mac_images[photoIndex]?.photo_url}
                  alt={`MAC ${activeMac.name}`}
                  className="w-full h-[360px] object-cover rounded-xl border border-gray-200"
                />
                {activeMac.mac_images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPhotoIndex((prev) => (prev - 1 + activeMac.mac_images!.length) % activeMac.mac_images!.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoIndex((prev) => (prev + 1) % activeMac.mac_images!.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center">{photoIndex + 1} / {activeMac.mac_images.length}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Sin fotos disponibles para este MAC.</p>
          )}
        </DialogContent>
      </Dialog>

      {activeMac && (
        <PoiModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          mac={activeMac}
          pois={activePois}
        />
      )}
    </div>
  );
};
