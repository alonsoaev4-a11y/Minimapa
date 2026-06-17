import React, { useEffect, useMemo, useState } from 'react';
import { Bus, Info, Phone, Clock, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_TRANSPORT_DATA } from '../data/transport';
import type { TransportInfo, TransportLineColor } from '../data/transport';

const TRANSPORT_MAP_URL = 'https://www.arcgis.com/apps/Embed/index.html?webmap=04ae4eae22ac47d18f703867e08b5172&extent=-109.0753,25.7165,-108.8217,25.8501&zoom=true&scale=true&legend=true&disable_scroll=false&theme=light';

const COLOR_CARD: Record<TransportLineColor, string> = {
  blue: 'bg-blue-50 border-blue-200',
  green: 'bg-green-50 border-green-200',
  orange: 'bg-orange-50 border-orange-200',
};

const COLOR_HEADER: Record<TransportLineColor, string> = {
  blue: 'text-blue-800',
  green: 'text-green-800',
  orange: 'text-orange-800',
};

const COLOR_BADGE: Record<TransportLineColor, string> = {
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  orange: 'bg-orange-500',
};

export const TransportMap: React.FC = () => {
  const [selectedMac, setSelectedMac] = useState<string>('none');
  const [transportInfos, setTransportInfos] = useState<TransportInfo[]>([]);

  useEffect(() => {
    const loadTransport = async () => {
      if (!isSupabaseConfigured()) {
        const storedTransport = localStorage.getItem('admin_transport');
        if (storedTransport) {
          setTransportInfos(JSON.parse(storedTransport) as TransportInfo[]);
          return;
        }

        const fallback = DEFAULT_TRANSPORT_DATA.map((item, idx) => ({
          id: `fallback-${idx}`,
          mac_name: item.mac_name,
          data: item.data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        setTransportInfos(fallback);
        return;
      }

      const { data } = await supabase.from('transport_info').select('*').order('mac_name', { ascending: true });
      if (data && data.length > 0) {
        setTransportInfos(data as TransportInfo[]);
      } else {
        const fallback = DEFAULT_TRANSPORT_DATA.map((item, idx) => ({
          id: `fallback-${idx}`,
          mac_name: item.mac_name,
          data: item.data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        setTransportInfos(fallback);
      }
    };

    loadTransport();
  }, []);

  const transportInfo = useMemo(
    () => transportInfos.find((d) => d.mac_name === selectedMac),
    [selectedMac, transportInfos]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-[#002D72]/5 rounded-xl border border-[#002D72]/20">
        <div className="w-10 h-10 rounded-full bg-[#002D72] flex items-center justify-center shrink-0">
          <Bus className="w-5 h-5 text-[#F2A900]" />
        </div>
        <div>
          <h3 className="font-semibold text-[#002D72]">Mapa de Transporte Publico</h3>
          <p className="text-sm text-gray-600">Compara las rutas de camiones que pasan cerca de los MACs dentro de CU UAS</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Info className="w-4 h-4 text-[#F2A900]" />
          Como llegar a un MAC en transporte publico
        </div>

        <Select value={selectedMac} onValueChange={setSelectedMac}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona un MAC destino..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Selecciona un MAC destino...</SelectItem>
            {transportInfos.map((d) => (
              <SelectItem key={d.id} value={d.mac_name}>MAC {d.mac_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedMac !== 'none' && transportInfo && (
          <div className="space-y-3 pt-1">
            {transportInfo.data.lineas.map((linea, i) => (
              <div key={i} className={`rounded-xl border p-4 ${COLOR_CARD[linea.color]}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${COLOR_BADGE[linea.color]}`} />
                    <span className={`font-bold text-sm ${COLOR_HEADER[linea.color]}`}>{linea.empresa}</span>
                  </div>
                  {linea.telefono && (
                    <a
                      href={`tel:${linea.telefono.replace(/\s/g, '')}`}
                      className={`flex items-center gap-1 text-xs font-medium ${COLOR_HEADER[linea.color]} opacity-80 hover:opacity-100`}
                    >
                      <Phone className="w-3 h-3" />
                      {linea.telefono}
                    </a>
                  )}
                </div>

                <div className={`flex items-center gap-1 text-xs mb-3 ${COLOR_HEADER[linea.color]} opacity-70`}>
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>Terminal: {linea.terminal}</span>
                </div>

                <div className="space-y-2">
                  {linea.rutas.map((ruta, j) => (
                    <div key={j} className="bg-white/70 rounded-lg p-3 space-y-1.5">
                      <p className={`text-xs font-bold ${COLOR_HEADER[linea.color]}`}>Destino: {ruta.destino}</p>
                      <div className="flex items-start gap-1.5 text-xs text-gray-700">
                        <Clock className="w-3 h-3 shrink-0 mt-0.5 opacity-50" />
                        <div><span className="font-semibold">Ida:</span> {ruta.ida}</div>
                      </div>
                      <div className="flex items-start gap-1.5 text-xs text-gray-700">
                        <Clock className="w-3 h-3 shrink-0 mt-0.5 opacity-50" />
                        <div><span className="font-semibold">Regreso:</span> {ruta.regreso}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Los horarios exactos pueden no estar publicados en linea. Se recomienda confirmar con la terminal antes de salir.
            </p>
          </div>
        )}

        {selectedMac !== 'none' && !transportInfo && (
          <p className="text-sm text-gray-400 italic px-1">Sin informacion de transporte registrada para este MAC.</p>
        )}
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <iframe
          src={TRANSPORT_MAP_URL}
          width="100%"
          height="600"
          frameBorder="0"
          style={{ border: 0 }}
          allowFullScreen
          title="Mapa de Transporte Publico"
        />
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-sm text-amber-800">
          <strong>Nota:</strong> Usa este mapa para identificar que rutas de transporte publico pasan cerca de los MACs y compararlas con las rutas que llevan a las comunidades fuera de CU.
        </p>
      </div>
    </div>
  );
};
