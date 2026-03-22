import React, { useState, useEffect } from 'react';
import { MapComponent } from './components/MapComponent';
import { TransportMap } from './components/TransportMap';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import type { MacWithAdvisor } from './types/supabase';
import { MapPin, Building, ArrowLeft, GraduationCap, FileText, CheckCircle, Clock, ChevronRight, UserCircle, ExternalLink, ChevronDown, Shield, Bus, Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';
import { POI_CATALOG } from './data/poiCatalog';

const AppContent: React.FC = () => {
  const [showMap, setShowMap] = useState(false);
  const [showMacList, setShowMacList] = useState(false);
  const [selectedMacId, setSelectedMacId] = useState<string | number | null>(null);
  const [showTransportMap, setShowTransportMap] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [macs, setMacs] = useState<MacWithAdvisor[]>([]);
  const [macsLoading, setMacsLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!showMap) return;
    const loadMacs = async () => {
      setMacsLoading(true);
      if (!isSupabaseConfigured()) {
        const storedMacs = localStorage.getItem('admin_macs');
        setMacs(storedMacs ? JSON.parse(storedMacs) : []);
      } else {
        const { data, error } = await supabase
          .from('macs')
          .select('*, advisor:advisors(*, academic_program:academic_programs(*)), mac_images(*), pois(*)')
          .order('name', { ascending: true });
        if (data && !error) {
          setMacs(data as MacWithAdvisor[]);
        } else {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('macs')
            .select('*, advisor:advisors(*, academic_program:academic_programs(*)), mac_images(*)')
            .order('name', { ascending: true });

          if (fallbackData && !fallbackError) {
            const fallbackWithoutPois = (fallbackData as MacWithAdvisor[]).map((mac) => ({ ...mac, pois: [] }));
            setMacs(fallbackWithoutPois);
          } else {
            setMacs([]);
          }
        }
      }
      setMacsLoading(false);
    };
    loadMacs();
  }, [showMap, isAuthenticated]);

  const macList = [...macs].sort((a, b) => a.name.localeCompare(b.name));

  if (isAuthenticated) {
    return <AdminDashboard />;
  }

  if (showMap) {
    return (
      <div className="min-h-screen bg-[#f8afc] text-gray-900 font-sans flex flex-col">
        <header className="bg-white shadow-sm border-b border-gray-200 z-10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#002D72] flex items-center justify-center font-black font-heading text-[#F2A900] text-xl tracking-tighter shadow-md">
                UAS
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold font-heading text-[#002D72] tracking-tight">
                  Servicio Social <span className="text-[#F2A900]">UAS</span>
                </h1>
                <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
                  Módulos de Atención Comunitaria (MAC)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTransportMap(!showTransportMap)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors font-medium border ${
                  showTransportMap
                    ? 'bg-[#002D72] text-white border-[#002D72]'
                    : 'text-[#002D72] border-[#002D72]/20 hover:bg-[#002D72]/5'
                }`}
              >
                <Bus size={18} />
                Transporte
              </button>
              <button
                onClick={() => setShowAdminLogin(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors font-medium bg-[#002D72] text-white hover:bg-[#001f50] shadow-md"
              >
                <Shield size={18} />
                Admin
              </button>
              <button
                onClick={() => setShowMap(false)}
                className="flex items-center gap-2 text-[#002D72] hover:bg-[#002D72]/5 px-4 py-2.5 rounded-lg transition-colors font-medium border border-[#002D72]/20"
              >
                <ArrowLeft size={18} />
                Volver
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {showTransportMap ? (
            <TransportMap />
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              <aside className="w-full lg:w-1/3 flex flex-col gap-6">
                <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#002D72]/5 rounded-bl-full"></div>
                  <h2 className="text-2xl font-bold text-[#002D72] mb-3 relative z-10">
                    Directorio de Módulos
                  </h2>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 relative z-10">
                    Explora el mapa para localizar los Módulos de Atención Comunitaria (MAC). Selecciona un marcador para ver al asesor encargado, sus horarios y los puntos de interés cercanos.
                  </p>

                  <div className="relative z-10 flex flex-col gap-2">
                    <button
                      onClick={() => setShowMacList(!showMacList)}
                      className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-[#002D72] bg-[#002D72]/5 hover:bg-[#002D72]/10 transition-colors p-3 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-[#F2A900]" />
                        <span>
                          {macsLoading
                            ? 'Cargando módulos...'
                            : `Módulos disponibles en la región (${macList.length})`}
                        </span>
                      </div>
                      {macsLoading ? (
                        <Loader2 size={18} className="animate-spin text-[#002D72]" />
                      ) : (
                        <ChevronDown size={18} className={`transform transition-transform duration-300 ${showMacList ? 'rotate-180' : ''}`} />
                      )}
                    </button>

                    {showMacList && !macsLoading && (
                      macList.length === 0 ? (
                        <div className="border border-gray-100 rounded-lg bg-gray-50 p-4 text-center">
                          <p className="text-sm text-gray-500">Sin datos disponibles.</p>
                          <p className="text-xs text-gray-400 mt-1">Configura la conexión a Supabase para visualizar los MACs.</p>
                        </div>
                      ) : (
                        <div className="max-h-[250px] overflow-y-auto custom-scrollbar border border-gray-100 rounded-lg bg-gray-50 p-1.5 space-y-1 shadow-inner">
                          {macList.map((mac) => (
                            <button
                              key={mac.id}
                              onClick={() => setSelectedMacId(mac.id)}
                              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all ${
                                selectedMacId === mac.id
                                  ? 'bg-white text-[#002D72] shadow-sm font-bold border border-gray-200'
                                  : 'text-gray-600 hover:bg-white hover:text-[#002D72] hover:shadow-sm'
                              }`}
                            >
                              MAC {mac.name}
                            </button>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col gap-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                    <Building size={18} className="text-gray-500" />
                    Simbología de Referencia
                  </h3>

                  <ul className="space-y-3">
                    {POI_CATALOG.map((poiType) => (
                      <li key={poiType.type} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center border border-gray-200 shrink-0">{poiType.emoji}</div>
                        <div className="text-sm">
                          <p className="font-semibold text-gray-800">{poiType.label}</p>
                          <p className="text-xs text-gray-500">{poiType.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>

              <section className="w-full lg:w-2/3 h-[600px] lg:h-[750px] bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden relative">
                <MapComponent
                  markers={macs}
                  selectedMacId={selectedMacId}
                  onSelectMac={(id) => setSelectedMacId(id)}
                  disableControls={showAdminLogin}
                />
              </section>
            </div>
          )}
        </main>

        <AdminLoginModal isOpen={showAdminLogin} onClose={() => setShowAdminLogin(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <div className="bg-[#001f50] text-gray-300 py-1.5 px-4 text-xs font-medium flex justify-between items-center">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <span>Universidad Autónoma de Sinaloa</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Portal UAS</a>
            <a href="#" className="hover:text-white transition-colors">Directorio</a>
            <a href="#" className="hover:text-white transition-colors">Contacto</a>
          </div>
        </div>
      </div>

      <header className="bg-[#002D72] text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center font-black font-heading text-[#002D72] text-xl tracking-tighter shadow-md border-2 border-[#F2A900]">
              UAS
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold font-heading text-white tracking-tight leading-none">
                Dirección General de
              </h1>
              <h2 className="text-xl md:text-2xl font-black font-heading text-[#F2A900] tracking-tight leading-none mt-1">
                Servicio Social Universitario
              </h2>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold">
            <a href="#" className="text-[#F2A900] border-b-2 border-[#F2A900] pb-1">Inicio</a>
            <a href="#" className="hover:text-[#F2A900] transition-colors pb-1">Alumnos</a>
            <a href="#" className="hover:text-[#F2A900] transition-colors pb-1">Unidades Receptoras</a>
            <a href="#" className="hover:text-[#F2A900] transition-colors pb-1">Formatos</a>
          </nav>

          <div className="flex items-center gap-3">
            <button className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              <UserCircle size={18} />
              SISS
            </button>
            <button
              onClick={() => setShowMap(true)}
              className="flex items-center gap-2 bg-[#F2A900] text-[#002D72] px-4 py-2 md:px-5 md:py-2.5 rounded-lg hover:bg-yellow-400 transition-all font-bold shadow-md shadow-[#001f50]/50"
            >
              <MapPin size={18} />
              Encuentra tu MAC
            </button>
          </div>
        </div>
      </header>

      <section className="relative h-[450px] md:h-[550px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1632834380561-d1e05839a33a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwc3R1ZGVudHMlMjBjYW1wdXN8ZW58MXx8fHwxNzczODI1NjY2fDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Campus UAS"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#002D72]/95 via-[#002D72]/80 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F2A900]/20 border border-[#F2A900]/30 text-[#F2A900] text-sm font-bold mb-6 backdrop-blur-sm">
              <GraduationCap size={16} />
              Ciclo Escolar 2024-2025
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black font-heading mb-4 leading-tight">
              Formando profesionales con <span className="text-[#F2A900]">sentido social</span>.
            </h2>
            <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-xl leading-relaxed font-medium">
              Inicia o dale seguimiento a tu proceso de Servicio Social. Localiza tu módulo más cercano y conoce los requisitos para tu liberación.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="flex items-center justify-center gap-2 bg-white text-[#002D72] px-6 py-3.5 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-lg text-lg">
                Ingresar al Sistema (SISS)
                <ExternalLink size={18} />
              </button>
              <button
                onClick={() => setShowMap(true)}
                className="flex items-center justify-center gap-2 bg-[#F2A900] text-[#002D72] px-6 py-3.5 rounded-xl font-bold hover:bg-yellow-400 transition-colors shadow-lg text-lg border border-yellow-300"
              >
                <MapPin size={20} />
                Explorar el Mapa MAC
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold font-heading text-[#002D72] mb-4">Proceso de Servicio Social</h3>
            <p className="text-gray-500 max-w-2xl mx-auto">Conoce las etapas necesarias para llevar a cabo de manera satisfactoria tu Servicio Social Universitario en cualquiera de nuestras unidades receptoras.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#002D72]/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
              <div className="w-14 h-14 bg-[#002D72] text-[#F2A900] rounded-xl flex items-center justify-center mb-6 shadow-md">
                <FileText size={28} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">1. Asignación</h4>
              <p className="text-gray-600 mb-6">Regístrate en el SISS, asiste a las pláticas de inducción y elige tu Unidad Receptora de acuerdo a tu perfil profesional.</p>
              <a href="#" className="inline-flex items-center gap-1 text-[#002D72] font-semibold hover:text-[#001f50]">
                Ver requisitos <ChevronRight size={16} />
              </a>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F2A900]/10 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
              <div className="w-14 h-14 bg-[#F2A900] text-[#002D72] rounded-xl flex items-center justify-center mb-6 shadow-md">
                <Clock size={28} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">2. Desarrollo</h4>
              <p className="text-gray-600 mb-6">Cumple con las 480 horas reglamentarias y entrega tus reportes mensuales de actividades en tiempo y forma en tu MAC.</p>
              <a href="#" className="inline-flex items-center gap-1 text-[#002D72] font-semibold hover:text-[#001f50]">
                Descargar formatos <ChevronRight size={16} />
              </a>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
              <div className="w-14 h-14 bg-green-600 text-white rounded-xl flex items-center justify-center mb-6 shadow-md">
                <CheckCircle size={28} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">3. Liberación</h4>
              <p className="text-gray-600 mb-6">Integra tu expediente final validado por tu asesor y recibe tu constancia de liberación de Servicio Social.</p>
              <a href="#" className="inline-flex items-center gap-1 text-[#002D72] font-semibold hover:text-[#001f50]">
                Pasos para liberar <ChevronRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#002D72] text-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black font-heading text-[#002D72] text-sm border-2 border-[#F2A900]">
                UAS
              </div>
              <span className="font-bold font-heading text-lg">Dirección de Servicio Social</span>
            </div>
            <p className="text-gray-300 text-sm">
              Universidad Autónoma de Sinaloa<br />
              Sursum Versus
            </p>
          </div>
          <div>
            <h4 className="font-bold text-[#F2A900] mb-4">Enlaces Rápidos</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="#" className="hover:text-white">Sistema SISS</a></li>
              <li><a href="#" className="hover:text-white">Preguntas Frecuentes</a></li>
              <li><a href="#" className="hover:text-white">Directorio de MACs</a></li>
              <li><a href="#" className="hover:text-white">Formatos de Descarga</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-[#F2A900] mb-4">Contacto</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>📞 (667) 759 38 00</li>
              <li>✉️ serviciosocial@uas.edu.mx</li>
              <li>📍 Culiacán, Sinaloa, México</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" duration={2000} richColors />
    </AuthProvider>
  );
}
