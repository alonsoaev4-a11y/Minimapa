import React, { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { MapPin, Check } from 'lucide-react';

const pickerIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div class="relative w-12 h-12 flex items-center justify-center">
           <div class="absolute inset-0 bg-[#F2A900]/30 rounded-full animate-ping"></div>
           <div class="relative w-10 h-10 bg-[#002D72] border-[3px] border-[#F2A900] rounded-full flex items-center justify-center shadow-lg z-10">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#ffffff"/></svg>
           </div>
         </div>`,
  iconSize: [48, 48],
  iconAnchor: [24, 48],
});

interface ClickHandlerProps {
  onCoordinates: (lat: number, lng: number) => void;
}

const ClickHandler: React.FC<ClickHandlerProps> = ({ onCoordinates }) => {
  useMapEvents({
    click(e) {
      onCoordinates(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

interface CoordinatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  title?: string;
  description?: string;
}

const MapCenterSync: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();

  React.useEffect(() => {
    map.setView(center, map.getZoom(), { animate: false });
  }, [center, map]);

  return null;
};

export const CoordinatePicker: React.FC<CoordinatePickerProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialLat,
  initialLng,
  title,
  description,
}) => {
  const defaultCenter: [number, number] = [25.7904, -108.9858];
  const [selected, setSelected] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );

  React.useEffect(() => {
    if (!isOpen) return;
    if (typeof initialLat === 'number' && typeof initialLng === 'number') {
      setSelected([initialLat, initialLng]);
    } else {
      setSelected(null);
    }
  }, [isOpen, initialLat, initialLng]);

  const handleCoordinates = useCallback((lat: number, lng: number) => {
    setSelected([lat, lng]);
  }, []);

  const handleConfirm = () => {
    if (selected) {
      onConfirm(selected[0], selected[1]);
      onClose();
    }
  };

  const center: [number, number] = selected ?? (
    typeof initialLat === 'number' && typeof initialLng === 'number'
      ? [initialLat, initialLng]
      : defaultCenter
  );

  const resolvedTitle = title || 'Seleccionar ubicacion del MAC';
  const resolvedDescription = description || 'Haz clic en el mapa para colocar el pin. Puedes hacer clic varias veces para ajustar la posicion.';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3">
            <DialogTitle className="flex items-center gap-2 text-[#002D72]">
              <MapPin className="w-5 h-5 text-[#F2A900]" />
              {resolvedTitle}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">
              {resolvedDescription}
            </DialogDescription>
          </DialogHeader>

        <div className="relative w-full h-[420px]">
          <MapContainer
            center={center}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">Carto</a> &copy; OSM'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <MapCenterSync center={center} />
            <ClickHandler onCoordinates={handleCoordinates} />
            {selected && (
              <Marker position={selected} icon={pickerIcon} />
            )}
          </MapContainer>

          {!selected && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
              <div className="bg-white/90 px-4 py-2 rounded-lg shadow border border-gray-200 text-sm text-gray-600 font-medium">
                Haz clic en el mapa para fijar el pin
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          {selected ? (
            <p className="text-sm text-gray-700 font-mono">
              <span className="font-semibold text-[#002D72]">Lat:</span> {selected[0].toFixed(6)}
              <span className="mx-3 text-gray-300">|</span>
              <span className="font-semibold text-[#002D72]">Lng:</span> {selected[1].toFixed(6)}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">Sin coordenadas seleccionadas</p>
          )}
        </div>

        <DialogFooter className="px-6 pb-5 pt-2 gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected}
            className="bg-[#002D72] hover:bg-[#001f50] text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            Confirmar ubicacion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
