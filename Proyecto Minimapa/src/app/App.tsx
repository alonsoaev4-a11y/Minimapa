import React, { useState, useEffect, useRef } from 'react';
import { MapComponent } from './components/MapComponent';
import { TransportMap } from './components/TransportMap';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { applyPinColorsToMacs } from './lib/pinColors';
import type { MacWithAdvisor } from './types/supabase';
import { MapPin, Building, ArrowLeft, GraduationCap, ChevronDown, Shield, Bus, Loader2, Compass, Users, Navigation, ArrowRight, Layers, Building2, Search, HeartHandshake, Moon, Sun } from 'lucide-react';
import { Toaster } from 'sonner';
import { POI_CATALOG } from './data/poiCatalog';

const AppContent: React.FC = () => {
  const [showMap, setShowMap] = useState(false);
  const [showMacList, setShowMacList] = useState(false);
  const [selectedMacId, setSelectedMacId] = useState<string | number | null>(null);
  const [showTransportMap, setShowTransportMap] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAllMacs, setShowAllMacs] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [macs, setMacs] = useState<MacWithAdvisor[]>([]);
  const [macsLoading, setMacsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const mapSectionRef = useRef<HTMLElement>(null);

  const handleSelectMac = (id: number | string) => {
    setSelectedMacId(id);

    if (window.matchMedia('(max-width: 1023px)').matches) {
      setShowMacList(false);
    }

    window.setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';

    return () => {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = '';
    };
  }, [isDarkMode]);

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
      <div className={`min-h-screen text-gray-900 font-sans flex flex-col ${isDarkMode ? 'dark bg-black' : 'bg-[#f8afc]'}`}>
        <header className="bg-white dark:bg-black shadow-sm border-b border-gray-200 dark:border-white/10 z-10 relative">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 py-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="shrink-0">
        <img
        src="/logo-subdireccion.png"
       alt="Subdirección Servicio Social UAS"
        className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 rounded-full object-cover border-2 border-[#F2A900] shadow-md"
      />
      </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl md:text-2xl font-bold font-heading text-[#002D72] dark:text-white tracking-tight truncate">
                  Subdireccion Servicio Social URN <span className="text-[#F2A900]">UAS</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 font-medium hidden sm:flex items-center gap-1.5 mt-0.5">
                  Módulos de Atención Comunitaria (MAC)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-5 sm:flex items-center gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
                aria-pressed={isDarkMode}
                className="flex items-center justify-center gap-2 px-2 sm:px-3 xl:px-4 py-2 sm:py-2.5 rounded-lg transition-colors font-medium border border-[#002D72]/20 text-[#002D72] dark:border-white/30 dark:text-white hover:bg-[#002D72]/5 dark:hover:bg-white/10 min-w-0"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                <span className="hidden xl:inline">{isDarkMode ? 'Claro' : 'Oscuro'}</span>
              </button>
              <button
                onClick={() => setShowAllMacs(!showAllMacs)}
                aria-label="Ver todos los módulos"
                className={`flex items-center justify-center gap-2 px-2 sm:px-3 xl:px-4 py-2 sm:py-2.5 rounded-lg transition-colors font-medium border min-w-0 ${
                  showAllMacs
                    ? 'bg-[#002D72] text-white border-[#002D72]'
                    : 'text-[#002D72] border-[#002D72]/20 hover:bg-[#002D72]/5 dark:text-white dark:border-white/30 dark:hover:bg-white/10'
                }`}
              >
                <Layers size={18} />
                <span className="hidden xl:inline">Ver todos</span>
              </button>
              <button
                onClick={() => setShowTransportMap(!showTransportMap)}
                aria-label="Transporte"
                className={`flex items-center justify-center gap-2 px-2 sm:px-3 xl:px-4 py-2 sm:py-2.5 rounded-lg transition-colors font-medium border min-w-0 ${
                  showTransportMap
                    ? 'bg-[#002D72] text-white border-[#002D72]'
                    : 'text-[#002D72] border-[#002D72]/20 hover:bg-[#002D72]/5 dark:text-white dark:border-white/30 dark:hover:bg-white/10'
                }`}
              >
                <Bus size={18} />
                <span className="hidden xl:inline">Transporte</span>
              </button>
              <button
                onClick={() => setShowAdminLogin(true)}
                aria-label="Admin"
                className="flex items-center justify-center gap-2 px-2 sm:px-3 xl:px-4 py-2 sm:py-2.5 rounded-lg transition-colors font-medium bg-[#002D72] text-white hover:bg-[#001f50] shadow-md min-w-0"
              >
                <Shield size={18} />
                <span className="hidden xl:inline">Admin</span>
              </button>
              <button
                onClick={() => setShowMap(false)}
                aria-label="Volver"
                className="flex items-center justify-center gap-2 text-[#002D72] dark:text-white hover:bg-[#002D72]/5 dark:hover:bg-white/10 px-2 sm:px-3 xl:px-4 py-2 sm:py-2.5 rounded-lg transition-colors font-medium border border-[#002D72]/20 dark:border-white/30 min-w-0"
              >
                <ArrowLeft size={18} />
                <span className="hidden xl:inline">Volver</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 w-full dark:bg-black">
          {showTransportMap ? (
            <TransportMap isDarkMode={isDarkMode} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 items-start">
                <div className="order-1 lg:col-start-1 lg:row-start-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 p-4 sm:p-6 rounded-2xl shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#002D72]/5 rounded-bl-full"></div>
                  <h2 className="text-2xl font-bold text-[#002D72] dark:text-white mb-3 relative z-10">
                    Directorio de Módulos
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4 relative z-10">
                    Explora el mapa para localizar los Módulos de Atención Comunitaria (MAC). Selecciona un marcador para ver al asesor encargado, sus horarios y los puntos de interés cercanos.
                  </p>

                  <div className="relative z-10 flex flex-col gap-2">
                    <button
                      onClick={() => setShowMacList(!showMacList)}
                      className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-[#002D72] dark:text-white bg-[#002D72]/5 dark:bg-white/5 hover:bg-[#002D72]/10 dark:hover:bg-white/10 transition-colors p-3 rounded-lg"
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
                              onClick={() => handleSelectMac(mac.id)}
                              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all ${
                                selectedMacId === mac.id
                                  ? 'bg-white text-[#002D72] dark:text-white shadow-sm font-bold border border-gray-200'
                                  : 'text-gray-600 hover:bg-white hover:text-[#002D72] dark:hover:text-white hover:shadow-sm'
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

                <div className="order-3 lg:col-start-1 lg:row-start-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 p-4 sm:p-6 rounded-2xl shadow-sm flex flex-col gap-4">
                  <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-2">
                    <Building size={18} className="text-gray-500" />
                    Simbología de Referencia
                  </h3>

                  <ul className="space-y-3">
                    {POI_CATALOG.map((poiType) => (
                      <li key={poiType.type} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#222] text-gray-700 dark:text-gray-100 flex items-center justify-center border border-gray-200 dark:border-white/10 shrink-0">{poiType.emoji}</div>
                        <div className="text-sm">
                          <p className="font-semibold text-gray-800 dark:text-white">{poiType.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">{poiType.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

              <section ref={mapSectionRef} className="order-2 lg:col-span-2 lg:col-start-2 lg:row-span-2 lg:row-start-1 w-full h-[65vh] min-h-[420px] sm:h-[600px] lg:h-[750px] scroll-mt-3 bg-white dark:bg-[#111] rounded-2xl shadow-md border border-gray-200 dark:border-white/10 overflow-hidden relative">
                <MapComponent
                  markers={macs}
                  selectedMacId={selectedMacId}
                  onSelectMac={handleSelectMac}
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
    <div className={`landing-page min-h-screen font-sans flex flex-col ${isDarkMode ? 'dark bg-black' : 'bg-gray-50'}`}>
      <div className="bg-[#001f50] dark:bg-black text-gray-300 py-1.5 px-4 text-xs font-medium">
        <div className="max-w-7xl mx-auto w-full">
          <span className="truncate">Universidad Autónoma de Sinaloa</span>
        </div>
      </div>

      <header className="bg-[#002D72] dark:bg-black text-white shadow-lg sticky top-0 z-30 border-b border-transparent dark:border-white/10">
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

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
              aria-pressed={isDarkMode}
              className="flex items-center gap-2 rounded-lg border border-white/30 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10 md:px-4 md:py-2.5"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span className="hidden md:inline">{isDarkMode ? 'Modo claro' : 'Modo oscuro'}</span>
            </button>
            <button
              onClick={() => setShowMap(true)}
              className="flex items-center gap-2 bg-[#F2A900] text-[#002D72] px-3 py-2 md:px-5 md:py-2.5 rounded-lg hover:bg-yellow-400 transition-all font-bold shadow-md shadow-[#001f50]/50 shrink-0 text-sm md:text-base"
            >
              <Compass size={18} />
              <span className="hidden sm:inline">Explorar el mapa</span>
              <span className="sm:hidden">Mapa</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#002D72] dark:bg-black text-white">
        {/* Fondo decorativo tipo mapa */}
        <div className="absolute inset-0 opacity-[0.12] dark:hidden" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="absolute inset-0 bg-gradient-to-br from-[#002D72] via-[#002D72]/95 to-[#001433] dark:hidden" />
        <div className="absolute -top-20 -right-24 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#F2A900]/15 blur-3xl dark:hidden" />
        <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-[#1D4ED8]/20 blur-3xl dark:hidden" />

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
          <div className="max-w-3xl">
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
        <div className="relative z-20 h-10 sm:h-14 bg-gray-50 dark:bg-black rounded-t-[2rem] -mb-px" />
      </section>

      {/* ¿QUÉ ES UN MAC? + FEATURES */}
      <section className="py-14 sm:py-20 bg-gray-50 dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-2 text-[#F2A900] font-bold text-sm mb-3">
              <HeartHandshake size={18} /> Servicio Social con impacto
            </span>
            <h3 className="text-2xl sm:text-4xl font-black font-heading text-[#002D72] dark:text-white mb-4">¿Qué es un Módulo de Atención Comunitaria?</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
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
              <div key={f.title} className="bg-white dark:bg-[#111] rounded-2xl p-6 border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-5 shadow-md ${f.color}`}>
                  <f.icon size={26} />
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{f.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="py-14 sm:py-20 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h3 className="text-2xl sm:text-4xl font-black font-heading text-[#002D72] dark:text-white mb-3">Así de fácil es usar el mapa</h3>
            <p className="text-gray-500 dark:text-gray-300 max-w-2xl mx-auto text-sm sm:text-base">En tres pasos conoces todo lo que necesitas saber sobre cualquier módulo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
            {[
              { n: '01', icon: Search, title: 'Abre el mapa', desc: 'Entra al mapa interactivo y filtra por asesor o muestra todos los módulos a la vez.' },
              { n: '02', icon: MapPin, title: 'Selecciona un módulo', desc: 'Toca un pin para ver el asesor encargado, su horario y la distancia desde tu ubicación.' },
              { n: '03', icon: Navigation, title: 'Explora y llega', desc: 'Revisa los puntos de interés cercanos y genera la ruta para llegar al módulo.' },
            ].map((step) => (
              <div key={step.n} className="relative bg-gray-50 dark:bg-[#111] rounded-2xl p-7 border border-gray-100 dark:border-white/10 overflow-hidden">
                <span className="absolute -top-3 right-4 text-6xl font-black font-heading text-[#002D72]/5 select-none">{step.n}</span>
                <div className="w-12 h-12 bg-[#002D72] text-[#F2A900] rounded-xl flex items-center justify-center mb-5 shadow-md relative z-10">
                  <step.icon size={24} />
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 relative z-10">{step.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed relative z-10">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-14 sm:py-20 bg-gray-50 dark:bg-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-[#002D72] dark:bg-black border border-transparent dark:border-white/10 px-6 py-12 sm:px-12 sm:py-16 text-center shadow-2xl">
            <div className="absolute inset-0 opacity-[0.1] dark:hidden" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#F2A900]/15 blur-3xl dark:hidden" />
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
