import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Navigation, HeartPulse, Shield, BookOpen, ShoppingBag, MapPin } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import type { PoiType } from '../types/supabase';
import { POI_CATALOG_MAP } from '../data/poiCatalog';

interface PoiViewModel {
  id: string;
  type: PoiType;
  name: string;
  description: string;
  lat: number;
  lng: number;
  image_url?: string | null;
}

interface PoiModalProps {
  isOpen: boolean;
  onClose: () => void;
  mac: {
    name: string;
    lat: number;
    lng: number;
  } | null;
  pois: PoiViewModel[];
}

const icons: Record<PoiType, React.ElementType> = {
  hospital: HeartPulse,
  police: Shield,
  school: BookOpen,
  services: ShoppingBag,
};

const toRad = (value: number) => (value * Math.PI) / 180;
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const PoiModal: React.FC<PoiModalProps> = ({ isOpen, onClose, mac, pois }) => {
  if (!isOpen || !mac) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
          className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50/50">
            <div>
              <h2 className="text-xl font-bold text-[#002D72] flex items-center gap-2">
                Puntos de Interés
              </h2>
              <p className="text-sm text-gray-500 mt-0.5 font-medium">Cerca del Módulo de Atención Comunitaria {mac.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar">
            {pois.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Este MAC aún no tiene puntos de interés registrados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {pois.map((poi, idx) => {
                  const Icon = icons[poi.type] || icons.services;
                  const theme = POI_CATALOG_MAP[poi.type] || POI_CATALOG_MAP.services;
                  const distance = haversineKm(mac.lat, mac.lng, poi.lat, poi.lng);

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.07 }}
                      key={poi.id}
                      className="group flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-md transition-all duration-300"
                    >
                      <div className="relative h-36 overflow-hidden bg-gray-100">
                        {poi.image_url ? (
                          <ImageWithFallback
                            src={poi.image_url}
                            alt={poi.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                            <Icon className={`w-12 h-12 ${theme.cardText}`} />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg shadow-sm border border-gray-100 text-xs font-bold text-gray-700">
                          <Navigation size={12} className="text-[#002D72]" />
                          {distance.toFixed(1)} km
                        </div>
                      </div>

                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl ${theme.cardBg} border ${theme.cardBorder} ${theme.cardText} shadow-sm`}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 leading-tight">{poi.name}</h3>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{poi.description}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`, '_blank')}
                          className="mt-5 w-full py-2.5 flex items-center justify-center gap-2 text-sm font-semibold text-[#002D72] hover:text-white bg-[#002D72]/5 hover:bg-[#002D72] rounded-xl transition-colors border border-[#002D72]/10 hover:border-[#002D72]"
                        >
                          <Navigation size={14} />
                          Cómo llegar
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
