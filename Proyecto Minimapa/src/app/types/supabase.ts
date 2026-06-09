export type AdvisorTitle = 'Ing' | 'Lic' | 'Dr';
export type PoiType = 'hospital' | 'school' | 'services' | 'police';

export interface Advisor {
  id: string;
  title: AdvisorTitle;
  name: string;
  email: string;
  phone: string;
  photo_url: string | null;
  pin_color?: string | null;
  academic_program_id?: string | null;
  academic_program?: AcademicProgram | null;
  created_at: string;
}

export interface AcademicProgram {
  id: string;
  name: string;
  created_at: string;
}

export interface MacImage {
  id: string;
  mac_id: string;
  photo_url: string;
  sort_order: number;
  created_at: string;
}

export interface Poi {
  id: string;
  mac_id: string;
  type: PoiType;
  name: string;
  description: string;
  lat: number;
  lng: number;
  image_url?: string | null;
  sort_order: number;
  created_at: string;
  updated_at?: string;
}

export interface Mac {
  id: string;
  name: string;
  lat: number;
  lng: number;
  details: string;
  schedule: string;
  image_url: string | null;
  advisor_id: string | null;
  created_at: string;
  advisor?: Advisor;
  mac_images?: MacImage[];
  pois?: Poi[];
}

export interface MacWithAdvisor extends Mac {
  advisor: Advisor | null;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
}
