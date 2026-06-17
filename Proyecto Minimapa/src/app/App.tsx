import React, { useState, useEffect } from 'react';
import { MapComponent } from './components/MapComponent';
import { TransportMap } from './components/TransportMap';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { applyPinColorsToMacs } from './lib/pinColors';
import type { MacWithAdvisor } from './types/supabase';
import { MapPin, Building, ArrowLeft, GraduationCap, ChevronDown, Shield, Bus, Loader2, Compass, Users, Navigation, Sparkles, ArrowRight, Layers, Building2, Search, HeartHandshake } from 'lucide-react';
import { Toaster } from 'sonner';
import { POI_CATALOG } from './data/poiCatalog';

const AppContent: React.FC = () => {
  const [showMap, setShowMap] = useState(false);
  const [showMacList, setShowMacList] = useState(false);
  const [selectedMacId, setSelectedMacId] = useState<string | number | null>(null);
  const [showTransportMap, setShowTransportMap] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAllMacs, setShowAllMacs] = useState(false);
  const [macs, setMacs] = useState<MacWithAdvisor[]>([]);
  const [macsLoading, setMacsLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!showMap) return;
    const loadMacs = async () => {
      setMacsLoading(true);
      if (!isSupabaseConfigured()) {
        const storedMacs = localStorage.getItem('admin_macs');
        setMacs(applyPinColorsToMacs(storedMacs ? JSON.parse(storedMacs) : []));
      } else {
        const { data, error } = await supabase
          .from('macs')
          .select('*, advisors:mac_advisors(advisor:advisors(*, academic_program:academic_programs(*))), mac_images(*), pois(*)')
          .order('name', { ascending: true });
        if (data && !error) {
          // Transform the data to match MacWithAdvisor type
          const transformedData = (data as any[]).map(mac => ({
            ...mac,
            advisors: (mac.advisors || []).map((item: any) => item.advisor).filter(Boolean)
          }));
          setMacs(applyPinColorsToMacs(transformedData as MacWithAdvisor[]));
        } else {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('macs')
            .select('*, advisors:mac_advisors(advisor:advisors(*, academic_program:academic_programs(*))), mac_images(*)')
            .order('name', { ascending: true });

          if (fallbackData && !fallbackError) {
            const transformedData = (fallbackData as any[]).map(mac => ({
              ...mac,
              advisors: (mac.advisors || []).map((item: any) => item.advisor).filter(Boolean)
            }));
            const fallbackWithoutPois = transformedData.map((mac) => ({ ...mac, pois: [] }));
            setMacs(applyPinColorsToMacs(fallbackWithoutPois));
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
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 sm:h-20 py-2 sm:py-0 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="shrink-0">
        <img
        src="/logo-subdireccion.png"
       alt="Subdirección Servicio Social UAS"
        className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover border-2 border-[#F2A900] shadow-md"
      />
      </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl md:text-2xl font-bold font-heading text-[#002D72] tracking-tight truncate">
                  Subdireccion Servicio Social URN <span className="text-[#F2A900]">UAS</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium hidden sm:flex items-center gap-1.5 mt-0.5">
                  Módulos de Atención Comunitaria (MAC)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <button
                onClick={() => setShowAllMacs(!showAllMacs)}
                aria-label="Ver todos los módulos"
                className={`flex items-center gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors font-medium border ${
                  showAllMacs
                    ? 'bg-[#002D72] text-white border-[#002D72]'
                    : 'text-[#002D72] border-[#002D72]/20 hover:bg-[#002D72]/5'
                }`}
              >
                <Layers size={18} />
                <span className="hidden sm:inline">Ver todos</span>
              </button>
              <button
                onClick={() => setShowTransportMap(!showTransportMap)}
                aria-label="Transporte"
                className={`flex items-center gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors font-medium border ${
                  showTransportMap
                    ? 'bg-[#002D72] text-white border-[#002D72]'
                    : 'text-[#002D72] border-[#002D72]/20 hover:bg-[#002D72]/5'
                }`}
              >
                <Bus size={18} />
                <span className="hidden sm:inline">Transporte</span>
              </button>
              <button
                onClick={() => setShowAdminLogin(true)}
                aria-label="Admin"
                className="flex items-center gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors font-medium bg-[#002D72] text-white hover:bg-[#001f50] shadow-md"
              >
                <Shield size={18} />
                <span className="hidden sm:inline">Admin</span>
              </button>
              <button
                onClick={() => setShowMap(false)}
                aria-label="Volver"
                className="flex items-center gap-2 text-[#002D72] hover:bg-[#002D72]/5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors font-medium border border-[#002D72]/20"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Volver</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 w-full">
          {showTransportMap ? (
            <TransportMap />
          ) : (
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
              <aside className="w-full lg:w-1/3 flex flex-col gap-4 sm:gap-6">
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

              <section className="w-full lg:w-2/3 h-[480px] sm:h-[600px] lg:h-[750px] bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden relative">
                <MapComponent
                  markers={macs}
                  selectedMacId={selectedMacId}
                  onSelectMac={(id) => setSelectedMacId(id)}
                  disableControls={showAdminLogin}
                  showAllMacs={showAllMacs}
                  onShowAllMacsChange={setShowAllMacs}
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
      <div className="bg-[#001f50] text-gray-300 py-1.5 px-4 text-xs font-medium">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center gap-2">
          <span className="truncate">Universidad Autónoma de Sinaloa</span>
          <div className="hidden sm:flex gap-4 shrink-0">
            <a href="#" className="hover:text-white transition-colors">Portal UAS</a>
            <a href="#" className="hover:text-white transition-colors">Directorio</a>
            <a href="#" className="hover:text-white transition-colors">Contacto</a>
          </div>
        </div>
      </div>

      <header className="bg-[#002D72] text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 sm:h-20 py-2 sm:py-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="shrink-0">
        <img
          src="/logo-subdireccion.png"
          alt="Subdirección Servicio Social UAS"
          className="h-10 sm:h-12 w-auto object-contain"
        />
      </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base md:text-lg font-bold font-heading text-white tracking-tight leading-none truncate">
                Dirección General de
              </h1>
              <h2 className="text-base sm:text-xl md:text-2xl font-black font-heading text-[#F2A900] tracking-tight leading-none mt-1 truncate">
                Servicio Social Universitario
              </h2>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold">
            <a href="#" className="text-[#F2A900] border-b-2 border-[#F2A900] pb-1">Inicio</a>
            <a href="#" className="hover:text-[#F2A900] transition-colors pb-1">Módulos</a>
            <a href="#" className="hover:text-[#F2A900] transition-colors pb-1">Asesores</a>
            <a href="#" className="hover:text-[#F2A900] transition-colors pb-1">Contacto</a>
          </nav>

          <button
            onClick={() => setShowMap(true)}
            className="flex items-center gap-2 bg-[#F2A900] text-[#002D72] px-3 py-2 md:px-5 md:py-2.5 rounded-lg hover:bg-yellow-400 transition-all font-bold shadow-md shadow-[#001f50]/50 shrink-0 text-sm md:text-base"
          >
            <Compass size={18} />
            <span className="hidden sm:inline">Explorar el mapa</span>
            <span className="sm:hidden">Mapa</span>
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#002D72] text-white">
        {/* Fondo decorativo tipo mapa */}
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="absolute inset-0 bg-gradient-to-br from-[#002D72] via-[#002D72]/95 to-[#001433]" />
        <div className="absolute -top-20 -right-24 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#F2A900]/15 blur-3xl" />
        <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-[#1D4ED8]/20 blur-3xl" />

        {/* Pines flotantes decorativos */}
        <div className="hidden md:block absolute top-24 right-[18%] z-10">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F2A900] opacity-60" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#F2A900] border-2 border-white" />
          </span>
        </div>
        <div className="hidden md:block absolute bottom-28 right-[34%] z-10">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-50" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>
        </div>
        <div className="hidden lg:block absolute top-1/2 right-[8%] z-10">
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1D4ED8] opacity-60" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#1D4ED8] border-2 border-white" />
          </span>
        </div>

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F2A900]/20 border border-[#F2A900]/30 text-[#F2A900] text-xs sm:text-sm font-bold mb-6 backdrop-blur-sm">
              <Sparkles size={15} />
              Mapa interactivo de Módulos de Atención Comunitaria
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black font-heading mb-5 leading-[1.05]">
              Descubre cada <span className="text-[#F2A900]">Módulo de Atención Comunitaria</span> de la región.
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-200/90 mb-8 max-w-2xl leading-relaxed font-medium">
              Una plataforma para dar a conocer los MAC del Servicio Social Universitario: ubica cada módulo en el mapa, conoce a su asesor encargado, sus horarios y los puntos de interés cercanos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => setShowMap(true)}
                className="group flex items-center justify-center gap-2.5 bg-[#F2A900] text-[#002D72] px-7 py-4 rounded-xl font-bold hover:bg-yellow-400 transition-all shadow-xl shadow-black/20 text-base sm:text-lg"
              >
                <Compass size={22} className="transition-transform group-hover:rotate-45" />
                Explorar el mapa
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-12 max-w-xl">
              {[
                { value: '23+', label: 'Módulos MAC' },
                { value: 'GPS', label: 'Ubicación en tiempo real' },
                { value: '100%', label: 'Acceso libre' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm px-3 py-3 sm:px-4 sm:py-4">
                  <p className="text-xl sm:text-3xl font-black font-heading text-[#F2A900] leading-none">{s.value}</p>
                  <p className="text-[11px] sm:text-sm text-gray-300 mt-1.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* curva inferior */}
        <div className="relative z-20 h-10 sm:h-14 bg-gray-50 rounded-t-[2rem] -mb-px" />
      </section>

      {/* ¿QUÉ ES UN MAC? + FEATURES */}
      <section className="py-14 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-2 text-[#F2A900] font-bold text-sm mb-3">
              <HeartHandshake size={18} /> Servicio Social con impacto
            </span>
            <h3 className="text-2xl sm:text-4xl font-black font-heading text-[#002D72] mb-4">¿Qué es un Módulo de Atención Comunitaria?</h3>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              Los MAC son espacios donde los universitarios brindan servicio a la comunidad. Esta plataforma los hace visibles: te ayuda a saber dónde están, quién los atiende y qué hay a su alrededor, todo desde un mapa interactivo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: MapPin, color: 'bg-[#002D72] text-[#F2A900]', title: 'Ubica los módulos', desc: 'Visualiza todos los MAC sobre el mapa y encuentra el más cercano a ti con tu ubicación GPS.' },
              { icon: Users, color: 'bg-[#F2A900] text-[#002D72]', title: 'Conoce al asesor', desc: 'Cada módulo muestra a su encargado, su formación académica y su horario de atención.' },
              { icon: Layers, color: 'bg-[#1D4ED8] text-white', title: 'Puntos de interés', desc: 'Descubre hospitales, escuelas, seguridad y comercios cercanos a cada módulo.' },
              { icon: Bus, color: 'bg-green-600 text-white', title: 'Cómo llegar', desc: 'Consulta rutas de transporte público y genera indicaciones directas hacia el módulo.' },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-5 shadow-md ${f.color}`}>
                  <f.icon size={26} />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h3 className="text-2xl sm:text-4xl font-black font-heading text-[#002D72] mb-3">Así de fácil es usar el mapa</h3>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base">En tres pasos conoces todo lo que necesitas saber sobre cualquier módulo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
            {[
              { n: '01', icon: Search, title: 'Abre el mapa', desc: 'Entra al mapa interactivo y filtra por asesor o muestra todos los módulos a la vez.' },
              { n: '02', icon: MapPin, title: 'Selecciona un módulo', desc: 'Toca un pin para ver el asesor encargado, su horario y la distancia desde tu ubicación.' },
              { n: '03', icon: Navigation, title: 'Explora y llega', desc: 'Revisa los puntos de interés cercanos y genera la ruta para llegar al módulo.' },
            ].map((step) => (
              <div key={step.n} className="relative bg-gray-50 rounded-2xl p-7 border border-gray-100 overflow-hidden">
                <span className="absolute -top-3 right-4 text-6xl font-black font-heading text-[#002D72]/5 select-none">{step.n}</span>
                <div className="w-12 h-12 bg-[#002D72] text-[#F2A900] rounded-xl flex items-center justify-center mb-5 shadow-md relative z-10">
                  <step.icon size={24} />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2 relative z-10">{step.title}</h4>
                <p className="text-sm text-gray-600 leading-relaxed relative z-10">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-14 sm:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-[#002D72] px-6 py-12 sm:px-12 sm:py-16 text-center shadow-2xl">
            <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#F2A900]/15 blur-3xl" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F2A900] text-[#002D72] mb-6 shadow-lg">
                <Building2 size={32} />
              </div>
              <h3 className="text-2xl sm:text-4xl font-black font-heading text-white mb-4">Conoce los módulos de tu región</h3>
              <p className="text-gray-200/90 max-w-2xl mx-auto mb-8 text-sm sm:text-lg">
                Todo el directorio de Módulos de Atención Comunitaria en un solo mapa, listo para explorar desde tu celular o computadora.
              </p>
              <button
                onClick={() => setShowMap(true)}
                className="group inline-flex items-center justify-center gap-2.5 bg-[#F2A900] text-[#002D72] px-8 py-4 rounded-xl font-bold hover:bg-yellow-400 transition-all shadow-xl text-base sm:text-lg"
              >
                <Compass size={22} className="transition-transform group-hover:rotate-45" />
                Explorar el mapa
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </button>
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
