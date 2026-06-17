import type { Advisor, MacWithAdvisor } from '../types/supabase';

// Color por defecto del pin (azul institucional UAS)
export const DEFAULT_PIN_COLOR = '#002D72';

// Paleta amplia de colores visualmente distintos para asignar
// automáticamente un color propio a cada asesor que aún no tenga uno.
const AUTO_PIN_PALETTE = [
  '#002D72', '#F2A900', '#DC2626', '#16A34A', '#7C3AED',
  '#0891B2', '#EA580C', '#DB2777', '#92400E', '#4338CA',
  '#0369A1', '#059669', '#CA8A04', '#9333EA', '#E11D48',
  '#15803D', '#1D4ED8', '#B45309', '#0D9488', '#BE123C',
  '#4D7C0F', '#7E22CE', '#0F766E', '#A16207',
];

// Azul brillante reservado para asesores específicos por nombre.
const BLUE_PIN_COLOR = '#1D4ED8';

// Normaliza un texto: minúsculas, sin acentos y sin espacios repetidos.
const DIACRITICS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g');
const normalizeName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// Asesores con color fijo asignado por nombre (tiene prioridad sobre el
// color automático y sobre el respaldo local).
const NAME_COLOR_OVERRIDES: { match: string; color: string }[] = [
  { match: 'jose alfredo martinez', color: BLUE_PIN_COLOR },
];

// Devuelve el color forzado por nombre, si aplica.
export const nameColorOverride = (name?: string | null): string | null => {
  if (!name) return null;
  const normalized = normalizeName(name);
  const override = NAME_COLOR_OVERRIDES.find((entry) => normalized.includes(entry.match));
  return override ? override.color : null;
};

// Hash estable (djb2) para derivar siempre el mismo color del id del asesor.
const hashString = (value: string): number => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) + hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

// Devuelve un color propio y consistente para un asesor según su id.
export const autoPinColor = (advisorId: string): string => {
  if (!advisorId) return DEFAULT_PIN_COLOR;
  return AUTO_PIN_PALETTE[hashString(advisorId) % AUTO_PIN_PALETTE.length];
};

// Llave de almacenamiento local para los colores de pin por asesor.
// Sirve como respaldo cuando la columna `pin_color` aún no existe en la
// base de datos de Supabase, de modo que la personalización del pin
// funcione de inmediato sin requerir cambios en el esquema.
const PIN_COLOR_OVERLAY_KEY = 'advisor_pin_colors';

export const loadPinColorOverlay = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(PIN_COLOR_OVERLAY_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
};

export const savePinColorOverlay = (advisorId: string, color: string) => {
  if (!advisorId || !color) return;
  try {
    const overlay = loadPinColorOverlay();
    overlay[advisorId] = color;
    localStorage.setItem(PIN_COLOR_OVERLAY_KEY, JSON.stringify(overlay));
  } catch {
    // Si localStorage no está disponible, simplemente se omite el respaldo.
  }
};

// Detecta el error de Supabase/PostgREST que indica que la columna
// `pin_color` no existe en el esquema, para poder reintentar sin ella.
export const isMissingPinColorError = (error: any): boolean => {
  if (!error) return false;
  if (error.code === 'PGRST204') return true;
  return /pin_color/i.test(error.message || '');
};

// Resuelve el color final de un asesor respetando esta prioridad:
// 1) override fijo por nombre (ej. Jose Alfredo Martinez -> azul)
// 2) color guardado en la base de datos
// 3) respaldo local
// 4) color automático según el id
const resolveAdvisorColor = (advisor: Advisor, overlay: Record<string, string>): string =>
  nameColorOverride(advisor.name) ?? advisor.pin_color ?? overlay[advisor.id] ?? autoPinColor(advisor.id);

export const applyPinColorsToAdvisors = (advisors: Advisor[]): Advisor[] => {
  const overlay = loadPinColorOverlay();
  return advisors.map((advisor) => ({
    ...advisor,
    pin_color: resolveAdvisorColor(advisor, overlay),
  }));
};

export const applyPinColorsToMacs = (macs: MacWithAdvisor[]): MacWithAdvisor[] => {
  const overlay = loadPinColorOverlay();
  return macs.map((mac) => ({
    ...mac,
    advisor: mac.advisor
      ? {
          ...mac.advisor,
          pin_color: resolveAdvisorColor(mac.advisor, overlay),
        }
      : mac.advisor,
  }));
};
