import type { PoiType } from '../types/supabase';

export interface PoiCatalogItem {
  type: PoiType;
  label: string;
  description: string;
  emoji: string;
  markerHtml: string;
  cardBg: string;
  cardText: string;
  cardBorder: string;
}

export const POI_CATALOG: PoiCatalogItem[] = [
  {
    type: 'hospital',
    label: 'Centros de salud',
    description: 'Hospitales y clinicas cercanas',
    emoji: '🏥',
    markerHtml: '<div class="w-8 h-8 rounded-full border-2 border-white bg-red-500 shadow-md flex items-center justify-center text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 16v6"/><path d="M16 19h6"/><path d="M12 2v20"/><path d="M2 12h20"/><path d="M2 12c0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-10 10S2 17.5 2 12Z"/></svg></div>',
    cardBg: 'bg-red-50',
    cardText: 'text-red-600',
    cardBorder: 'border-red-200',
  },
  {
    type: 'police',
    label: 'Seguridad publica',
    description: 'Cruz Roja, policia y proteccion civil',
    emoji: '👮',
    markerHtml: '<div class="w-8 h-8 rounded-full border-2 border-white bg-blue-500 shadow-md flex items-center justify-center text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>',
    cardBg: 'bg-blue-50',
    cardText: 'text-blue-600',
    cardBorder: 'border-blue-200',
  },
  {
    type: 'school',
    label: 'Educacion',
    description: 'Escuelas y centros educativos',
    emoji: '🏫',
    markerHtml: '<div class="w-8 h-8 rounded-full border-2 border-white bg-yellow-500 shadow-md flex items-center justify-center text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>',
    cardBg: 'bg-yellow-50',
    cardText: 'text-yellow-600',
    cardBorder: 'border-yellow-200',
  },
  {
    type: 'services',
    label: 'Comercial y comida',
    description: 'Zonas comerciales, tiendas y comida',
    emoji: '🛍️',
    markerHtml: '<div class="w-8 h-8 rounded-full border-2 border-white bg-emerald-500 shadow-md flex items-center justify-center text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>',
    cardBg: 'bg-emerald-50',
    cardText: 'text-emerald-600',
    cardBorder: 'border-emerald-200',
  },
];

export const POI_CATALOG_MAP = POI_CATALOG.reduce<Record<PoiType, PoiCatalogItem>>((acc, item) => {
  acc[item.type] = item;
  return acc;
}, {} as Record<PoiType, PoiCatalogItem>);
