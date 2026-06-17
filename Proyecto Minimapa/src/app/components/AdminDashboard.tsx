import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { MacWithAdvisor, Advisor, AdvisorTitle, AcademicProgram, Poi, PoiType } from '../types/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Plus, Pencil, Trash2, MapPin, User, Loader2, X, Crosshair, Bus, GraduationCap } from 'lucide-react';
import { CoordinatePicker } from './CoordinatePicker';
import { DEFAULT_TRANSPORT_DATA } from '../data/transport';
import type { TransportInfo, TransportData } from '../data/transport';
import { toast } from 'sonner';
import { POI_CATALOG, POI_CATALOG_MAP } from '../data/poiCatalog';
import { applyPinColorsToAdvisors, applyPinColorsToMacs, savePinColorOverlay, isMissingPinColorError } from '../lib/pinColors';

const ADVISOR_TITLES: AdvisorTitle[] = ['Ing', 'Lic', 'Dr'];
const COLOR_BADGE: Record<string, string> = { blue: 'bg-blue-600', green: 'bg-green-600', orange: 'bg-orange-500' };
const ADVISOR_PIN_PRESETS = [
  '#002D72', '#F2A900', '#DC2626', '#16A34A', '#7C3AED',
  '#0891B2', '#EA580C', '#DB2777', '#92400E', '#4338CA', '#0369A1', '#059669',
];
const DEFAULT_ACADEMIC_PROGRAMS = [
  'Lic. en Derecho', 'Lic. en Psicologia', 'Lic. en Trabajo Social', 'Lic. en Educacion', 'Lic. en Administracion',
  'Lic. en Contaduria', 'Lic. en Enfermeria', 'Lic. en Nutricion', 'Lic. en Comunicacion', 'Lic. en Mercadotecnia',
  'Ing. Civil', 'Ing. en Software', 'Ing. en Sistemas Computacionales', 'Ing. Industrial', 'Ing. Mecatronica',
  'Ing. Electrica', 'Ing. Arquitectura', 'Ing. Agronoma', 'Medico General', 'Odontologia',
  'Maestria en Educacion', 'Maestria en Administracion', 'Doctorado en Educacion', 'Doctorado en Ciencias Sociales'
];

export const AdminDashboard: React.FC = () => {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'macs' | 'advisors' | 'transport'>('macs');
  const [macs, setMacs] = useState<MacWithAdvisor[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [academicPrograms, setAcademicPrograms] = useState<AcademicProgram[]>([]);
  const [transportInfos, setTransportInfos] = useState<TransportInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [macModalOpen, setMacModalOpen] = useState(false);
  const [advisorModalOpen, setAdvisorModalOpen] = useState(false);
  const [transportModalOpen, setTransportModalOpen] = useState(false);
  const [coordinatePickerOpen, setCoordinatePickerOpen] = useState(false);
  const [editingMac, setEditingMac] = useState<MacWithAdvisor | null>(null);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [editingTransport, setEditingTransport] = useState<TransportInfo | null>(null);

  const [macForm, setMacForm] = useState({
    name: '',
    lat: '',
    lng: '',
    details: '',
    schedule: '',
    advisor_ids: [] as string[]
  });
  const [macPhotoFiles, setMacPhotoFiles] = useState<File[]>([]);
  const [macPhotoPreviews, setMacPhotoPreviews] = useState<string[]>([]);

  const [advisorForm, setAdvisorForm] = useState({
    title: 'Ing' as AdvisorTitle,
    name: '',
    email: '',
    phone: '',
    photo_url: '',
    pin_color: '#002D72'
  });
  const [advisorPhotoFile, setAdvisorPhotoFile] = useState<File | null>(null);
  const [advisorPhotoPreview, setAdvisorPhotoPreview] = useState('');
  const [advisorAcademicSelect, setAdvisorAcademicSelect] = useState('none');
  const [advisorAcademicCustom, setAdvisorAcademicCustom] = useState('');

  const [transportForm, setTransportForm] = useState({
    mac_name: '',
    data_json: JSON.stringify({ lineas: [] }, null, 2)
  });

  interface FormRuta { destino: string; ida: string; regreso: string; }
  interface FormLine { empresa: string; telefono: string; terminal: string; color: 'blue' | 'green' | 'orange'; rutas: FormRuta[]; }
  interface PoiFormItem {
    id?: string;
    type: PoiType;
    name: string;
    description: string;
    lat: string;
    lng: string;
    image_url: string;
  }
  type PickerTarget = { kind: 'mac' } | { kind: 'poi'; index: number };

  const [transportMacSelect, setTransportMacSelect] = useState<string>('none');
  const [transportMacCustom, setTransportMacCustom] = useState<string>('');
  const [transportLines, setTransportLines] = useState<FormLine[]>([]);
  const [macPoisForm, setMacPoisForm] = useState<PoiFormItem[]>([]);
  const [coordinatePickerTarget, setCoordinatePickerTarget] = useState<PickerTarget>({ kind: 'mac' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setSaveError('');
    
    if (!isSupabaseConfigured()) {
      const storedMacs = localStorage.getItem('admin_macs');
      const storedAdvisors = localStorage.getItem('admin_advisors');
      const storedPrograms = localStorage.getItem('admin_academic_programs');
      const storedTransport = localStorage.getItem('admin_transport');
      setMacs(applyPinColorsToMacs(storedMacs ? JSON.parse(storedMacs) : []));
      setAdvisors(applyPinColorsToAdvisors(storedAdvisors ? JSON.parse(storedAdvisors) : []));
      setAcademicPrograms(storedPrograms ? JSON.parse(storedPrograms) : DEFAULT_ACADEMIC_PROGRAMS.map((name, idx) => ({ id: `local-program-${idx}`, name, created_at: new Date().toISOString() })));
      setTransportInfos(storedTransport ? JSON.parse(storedTransport) : DEFAULT_TRANSPORT_DATA.map((item, idx) => ({
        id: `local-${idx}`,
        mac_name: item.mac_name,
        data: item.data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })));
    } else {
      const [macsResult, advisorsResult, programsResult, transportResult] = await Promise.all([
        supabase.from('macs').select('*, advisors:mac_advisors(advisor:advisors(*, academic_program:academic_programs(*))), mac_images(*), pois(*)'),
        supabase.from('advisors').select('*, academic_program:academic_programs(*)'),
        supabase.from('academic_programs').select('*').order('name', { ascending: true }),
        supabase.from('transport_info').select('*').order('mac_name', { ascending: true })
      ]);

      if (macsResult.data) {
        // Transform the data to flatten the nested structure
        const transformedData = (macsResult.data as any[]).map(mac => ({
          ...mac,
          advisors: (mac.advisors || []).map((item: any) => item.advisor).filter(Boolean)
        }));
        setMacs(applyPinColorsToMacs(transformedData as MacWithAdvisor[]));
      } else {
        const { data: macsFallback } = await supabase
          .from('macs')
          .select('*, advisors:mac_advisors(advisor:advisors(*, academic_program:academic_programs(*))), mac_images(*)');
        if (macsFallback) {
          const transformedData = (macsFallback as any[]).map(mac => ({
            ...mac,
            advisors: (mac.advisors || []).map((item: any) => item.advisor).filter(Boolean)
          }));
          const fallbackWithoutPois = transformedData.map((mac) => ({ ...mac, pois: [] }));
          setMacs(applyPinColorsToMacs(fallbackWithoutPois));
        }
      }

      if (advisorsResult.data) {
        setAdvisors(applyPinColorsToAdvisors(advisorsResult.data as Advisor[]));
      } else {
        const { data: advisorsFallback } = await supabase
          .from('advisors')
          .select('*');
        if (advisorsFallback) setAdvisors(applyPinColorsToAdvisors(advisorsFallback as Advisor[]));
      }

      if (programsResult.data) setAcademicPrograms(programsResult.data as AcademicProgram[]);
      if (transportResult.data) setTransportInfos(transportResult.data as TransportInfo[]);
    }
    
    setIsLoading(false);
  };

  const saveToLocalStorage = (newMacs: MacWithAdvisor[], newAdvisors: Advisor[], newTransportInfos: TransportInfo[] = transportInfos, newPrograms: AcademicProgram[] = academicPrograms) => {
    localStorage.setItem('admin_macs', JSON.stringify(newMacs));
    localStorage.setItem('admin_advisors', JSON.stringify(newAdvisors));
    localStorage.setItem('admin_transport', JSON.stringify(newTransportInfos));
    localStorage.setItem('admin_academic_programs', JSON.stringify(newPrograms));
  };

  const createEmptyPoi = (): PoiFormItem => ({
    type: 'services',
    name: '',
    description: '',
    lat: '',
    lng: '',
    image_url: '',
  });

  const parseCoordinate = (value: string): number | null => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const normalizePoisFromForm = (macId: string): Poi[] => {
    const filledRows = macPoisForm.filter((poi) =>
      poi.name.trim() || poi.description.trim() || poi.lat.trim() || poi.lng.trim() || poi.image_url.trim(),
    );

    return filledRows.map((poi, index) => {
      const lat = parseCoordinate(poi.lat);
      const lng = parseCoordinate(poi.lng);

      if (!poi.name.trim()) {
        throw new Error(`El punto de interés #${index + 1} necesita un título`);
      }
      if (lat === null || lng === null) {
        throw new Error(`El punto de interés "${poi.name}" necesita coordenadas válidas`);
      }

      return {
        id: poi.id || crypto.randomUUID(),
        mac_id: macId,
        type: poi.type,
        name: poi.name.trim(),
        description: poi.description.trim(),
        lat,
        lng,
        image_url: poi.image_url.trim() || null,
        sort_order: index,
        created_at: new Date().toISOString(),
      };
    });
  };

  const addPoiRow = () => {
    setMacPoisForm((prev) => [...prev, createEmptyPoi()]);
  };

  const updatePoiRow = <K extends keyof PoiFormItem>(index: number, key: K, value: PoiFormItem[K]) => {
    setMacPoisForm((prev) => prev.map((poi, i) => (i === index ? { ...poi, [key]: value } : poi)));
  };

  const removePoiRow = (index: number) => {
    setMacPoisForm((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveMac = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      const isEditing = Boolean(editingMac);
      const macData = {
        name: macForm.name.trim(),
        lat: parseFloat(macForm.lat),
        lng: parseFloat(macForm.lng),
        details: macForm.details.trim(),
        schedule: macForm.schedule.trim()
      };

      // Validar coordenadas
      if (isNaN(macData.lat) || isNaN(macData.lng)) {
        throw new Error('Latitud y Longitud deben ser números válidos');
      }

      if (!isSupabaseConfigured()) {
        let newMacs = [...macs];
        const localMacId = editingMac?.id || crypto.randomUUID();
        const normalizedPois = normalizePoisFromForm(localMacId);
        const selectedAdvisors = advisors.filter(a => macForm.advisor_ids.includes(a.id));
        if (editingMac) {
          newMacs = newMacs.map(m => m.id === editingMac.id ? {
            ...m,
            ...macData,
            pois: normalizedPois,
            advisors: selectedAdvisors,
          } : m);
        } else {
          const newMac: MacWithAdvisor = {
            id: localMacId,
            ...macData,
            created_at: new Date().toISOString(),
            pois: normalizedPois,
            advisors: selectedAdvisors
          };
          newMacs.push(newMac);
        }
        setMacs(newMacs);
        saveToLocalStorage(newMacs, advisors);
        toast.success(isEditing ? 'MAC actualizado correctamente' : 'MAC creado correctamente');
      } else {
        const { error: poiTableCheckError } = await supabase
          .from('pois')
          .select('id')
          .limit(1);
        if (poiTableCheckError) {
          throw new Error('La tabla de POIs no está lista en Supabase. Ejecuta el script de POIs para continuar.');
        }

        let targetMacId = editingMac?.id || '';
        if (editingMac) {
          const { data, error: updateError } = await supabase
            .from('macs')
            .update(macData)
            .eq('id', editingMac.id)
            .select('id');
          if (updateError) throw updateError;
          if (!data || data.length === 0) {
            throw new Error(`MAC con ID ${editingMac.id} no se actualizó. Verifica permisos de RLS.`);
          }
          targetMacId = editingMac.id;
          
          // Delete existing mac_advisors relationships
          const { error: deleteError } = await supabase
            .from('mac_advisors')
            .delete()
            .eq('mac_id', targetMacId);
          if (deleteError) throw deleteError;
        } else {
          const { data: inserted, error: insertError } = await supabase.from('macs').insert(macData).select('id').single();
          if (insertError) throw insertError;
          targetMacId = inserted.id;
        }

        // Insert new mac_advisors relationships
        if (macForm.advisor_ids.length > 0) {
          const macAdvisorsToInsert = macForm.advisor_ids.map((advisorId, index) => ({
            mac_id: targetMacId,
            advisor_id: advisorId,
            sort_order: index
          }));
          const { error: insertError } = await supabase
            .from('mac_advisors')
            .insert(macAdvisorsToInsert);
          if (insertError) throw insertError;
        }

        if (macPhotoFiles.length > 0 && targetMacId) {
          const uploadedUrls: string[] = [];
          for (let i = 0; i < macPhotoFiles.length; i += 1) {
            const photoUrl = await uploadMacPhoto(macPhotoFiles[i], targetMacId, i);
            uploadedUrls.push(photoUrl);
            const { error: imageInsertError } = await supabase
              .from('mac_images')
              .insert({ mac_id: targetMacId, photo_url: photoUrl, sort_order: i });
            if (imageInsertError) throw imageInsertError;
          }

          // Images are now stored in mac_images table only
        }

        if (targetMacId) {
          const normalizedPois = normalizePoisFromForm(targetMacId);
          const { error: deletePoiError } = await supabase
            .from('pois')
            .delete()
            .eq('mac_id', targetMacId);
          if (deletePoiError) throw deletePoiError;

          if (normalizedPois.length > 0) {
            const poiRows = normalizedPois.map((poi, index) => ({
              mac_id: targetMacId,
              type: poi.type,
              name: poi.name,
              description: poi.description,
              lat: poi.lat,
              lng: poi.lng,
              image_url: poi.image_url || null,
              sort_order: index,
            }));
            const { error: insertPoiError } = await supabase.from('pois').insert(poiRows);
            if (insertPoiError) throw insertPoiError;
          }
        }

        await fetchData();
        toast.success(isEditing ? 'MAC actualizado correctamente' : 'MAC creado correctamente');
      }

      setMacModalOpen(false);
      resetMacForm();
    } catch (error: any) {
      const message = error?.message || 'No se pudo guardar el MAC';
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMac = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este MAC?')) return;

    try {
      const selectedMac = macs.find(m => m.id === id);
      const label = selectedMac?.name ? `MAC ${selectedMac.name}` : 'MAC';

      if (!isSupabaseConfigured()) {
        const newMacs = macs.filter(m => m.id !== id);
        setMacs(newMacs);
        saveToLocalStorage(newMacs, advisors);
      } else {
        const { error } = await supabase.from('macs').delete().eq('id', id);
        if (error) throw error;
        await fetchData();
      }

      toast.success(`${label} eliminado correctamente`);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo eliminar el MAC');
    }
  };

  const resizeImageToSquare = (file: File, size: number = 512): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo procesar la imagen'));
            return;
          }

          const sourceSize = Math.min(img.width, img.height);
          const sx = (img.width - sourceSize) / 2;
          const sy = (img.height - sourceSize) / 2;
          ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, size, size);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('No se pudo generar la imagen comprimida'));
              return;
            }
            resolve(blob);
          }, 'image/jpeg', 0.9);
        };
        img.onerror = () => reject(new Error('No se pudo leer la imagen'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(file);
    });
  };

  const uploadAdvisorPhoto = async (file: File, advisorId?: string): Promise<string> => {
    const compressed = await resizeImageToSquare(file, 512);
    const id = advisorId || crypto.randomUUID();
    const filePath = `advisor-${id}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('advisor-photos')
      .upload(filePath, compressed, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('advisor-photos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const uploadMacPhoto = async (file: File, macId: string, index: number): Promise<string> => {
    const compressed = await resizeImageToSquare(file, 1024);
    const filePath = `mac-${macId}-${Date.now()}-${index}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('mac-photos')
      .upload(filePath, compressed, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('mac-photos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleMacFilesChange = (files: FileList | null) => {
    if (!files || files.length === 0) {
      setMacPhotoFiles([]);
      setMacPhotoPreviews([]);
      return;
    }

    const selected = Array.from(files);
    setMacPhotoFiles(selected);
    const readers = selected.map((file) => new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.readAsDataURL(file);
    }));
    Promise.all(readers).then((urls) => setMacPhotoPreviews(urls));
  };

  const handleSaveAdvisor = async () => {
    setIsSaving(true);
    setSaveError('');
    
    try {
      const isEditing = Boolean(editingAdvisor);
      let finalAcademicProgramId: string | null = null;
      let effectivePrograms = academicPrograms;
      if (advisorAcademicSelect === 'other') {
        const programName = advisorAcademicCustom.trim();
        if (!programName) {
          setSaveError('Escribe la formación académica en el campo "Otro"');
          setIsSaving(false);
          return;
        }

        if (!isSupabaseConfigured()) {
          const exists = academicPrograms.find(p => p.name.toLowerCase() === programName.toLowerCase());
          if (exists) {
            finalAcademicProgramId = exists.id;
          } else {
            const newProgram: AcademicProgram = { id: crypto.randomUUID(), name: programName, created_at: new Date().toISOString() };
            const updatedPrograms = [...academicPrograms, newProgram];
            setAcademicPrograms(updatedPrograms);
            saveToLocalStorage(macs, advisors, transportInfos, updatedPrograms);
            effectivePrograms = updatedPrograms;
            finalAcademicProgramId = newProgram.id;
          }
        } else {
          const existing = academicPrograms.find(p => p.name.toLowerCase() === programName.toLowerCase());
          if (existing) {
            finalAcademicProgramId = existing.id;
          } else {
            const { data: created, error: createProgramError } = await supabase
              .from('academic_programs')
              .insert({ name: programName })
              .select('id')
              .single();
            if (createProgramError) throw createProgramError;
            finalAcademicProgramId = created.id;
          }
        }
      } else if (advisorAcademicSelect !== 'none') {
        finalAcademicProgramId = advisorAcademicSelect;
      }

      let finalPhotoUrl = advisorForm.photo_url || null;

      if (advisorPhotoFile && isSupabaseConfigured()) {
        finalPhotoUrl = await uploadAdvisorPhoto(advisorPhotoFile, editingAdvisor?.id);
      } else if (advisorPhotoFile && !isSupabaseConfigured()) {
        finalPhotoUrl = advisorPhotoPreview || finalPhotoUrl;
      }

      const advisorData = {
        title: advisorForm.title,
        name: advisorForm.name,
        email: advisorForm.email,
        phone: advisorForm.phone,
        photo_url: finalPhotoUrl,
        academic_program_id: finalAcademicProgramId,
        pin_color: advisorForm.pin_color
      };
      const selectedProgram = finalAcademicProgramId
        ? (effectivePrograms.find(p => p.id === finalAcademicProgramId) || null)
        : null;

      if (!isSupabaseConfigured()) {
        let newAdvisors = [...advisors];
        if (editingAdvisor) {
          newAdvisors = newAdvisors.map(a => a.id === editingAdvisor.id ? { 
            ...a, 
            ...advisorData, 
            academic_program: selectedProgram || a.academic_program 
          } : a);
          const newMacs = macs.map(m => {
            // Update advisors in this MAC if it includes the edited advisor
            if (m.advisors && m.advisors.some(a => a.id === editingAdvisor.id)) {
              return {
                ...m,
                advisors: m.advisors.map(a => a.id === editingAdvisor.id ? newAdvisors.find(na => na.id === editingAdvisor.id) || a : a)
              };
            }
            return m;
          });
          setMacs(newMacs);
          saveToLocalStorage(newMacs, newAdvisors, transportInfos, effectivePrograms);
          savePinColorOverlay(editingAdvisor.id, advisorForm.pin_color);
        } else {
          const newAdvisor: Advisor = {
            id: crypto.randomUUID(),
            ...advisorData,
            academic_program: selectedProgram,
            created_at: new Date().toISOString()
          };
          newAdvisors.push(newAdvisor);
          setAdvisors(newAdvisors);
          saveToLocalStorage(macs, newAdvisors, transportInfos, effectivePrograms);
          savePinColorOverlay(newAdvisor.id, advisorForm.pin_color);
        }
        toast.success(isEditing ? 'Asesor actualizado correctamente' : 'Asesor creado correctamente');
      } else {
        if (editingAdvisor) {
          let { data, error: updateError } = await supabase
            .from('advisors')
            .update(advisorData)
            .eq('id', editingAdvisor.id)
            .select('id');
          if (updateError) throw updateError;
          if (!data || data.length === 0) {
            throw new Error(`Asesor con ID ${editingAdvisor.id} no se actualizó. Verifica permisos de RLS.`);
          }
          savePinColorOverlay(editingAdvisor.id, advisorForm.pin_color);
        } else {
          let { data: insertedAdvisor, error: insertError } = await supabase
            .from('advisors')
            .insert(advisorData)
            .select('id')
            .single();
          if (insertError && isMissingPinColorError(insertError)) {
            const { pin_color, ...advisorDataNoColor } = advisorData;
            ({ data: insertedAdvisor, error: insertError } = await supabase
              .from('advisors')
              .insert(advisorDataNoColor)
              .select('id')
              .single());
          }
          if (insertError) throw insertError;
          if (insertedAdvisor?.id) savePinColorOverlay(insertedAdvisor.id, advisorForm.pin_color);
        }
        await fetchData();
        toast.success(isEditing ? 'Asesor actualizado correctamente' : 'Asesor creado correctamente');
      }

      setAdvisorModalOpen(false);
      resetAdvisorForm();
    } catch (error: any) {
      const message = error?.message || 'No se pudo guardar el asesor';
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTransport = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      const isEditing = Boolean(editingTransport);
      const finalMacName = editingTransport
        ? editingTransport.mac_name
        : (transportMacSelect === 'other' ? transportMacCustom.trim() : transportMacSelect);
      if (!finalMacName) {
        setSaveError('Selecciona o escribe el nombre del MAC');
        setIsSaving(false);
        return;
      }
      const filteredLines = transportLines.filter(l => l.empresa.trim());
      if (filteredLines.length === 0) {
        setSaveError('Agrega al menos una empresa');
        setIsSaving(false);
        return;
      }
      const payloadData: TransportData = {
        lineas: filteredLines.map(l => ({
          empresa: l.empresa,
          telefono: l.telefono,
          terminal: l.terminal,
          color: l.color,
          rutas: l.rutas.filter(r => r.destino.trim())
        }))
      };
      const payload = { mac_name: finalMacName, data: payloadData };

      if (!isSupabaseConfigured()) {
        let next = [...transportInfos];
        if (editingTransport) {
          next = next.map(t => t.id === editingTransport.id ? { ...t, ...payload, updated_at: new Date().toISOString() } : t);
        } else {
          next.push({
            id: crypto.randomUUID(),
            ...payload,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        setTransportInfos(next);
        saveToLocalStorage(macs, advisors, next);
        toast.success(isEditing ? 'Transporte actualizado correctamente' : 'Transporte creado correctamente');
      } else {
        if (editingTransport) {
          const { error: updateError } = await supabase.from('transport_info').update(payload).eq('id', editingTransport.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase.from('transport_info').insert(payload);
          if (insertError) throw insertError;
        }
        await fetchData();
        toast.success(isEditing ? 'Transporte actualizado correctamente' : 'Transporte creado correctamente');
      }

      setTransportModalOpen(false);
      setEditingTransport(null);
      setTransportForm({ mac_name: '', data_json: JSON.stringify({ lineas: [] }, null, 2) });
    } catch (error: any) {
      const message = error?.message || 'Error al guardar transporte';
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditTransport = (item: TransportInfo) => {
    setSaveError('');
    setEditingTransport(item);
    const matchedMac = macs.find(m => m.name === item.mac_name);
    setTransportMacSelect(matchedMac ? item.mac_name : 'other');
    setTransportMacCustom(matchedMac ? '' : item.mac_name);
    const lines: FormLine[] = (item.data.lineas || []).map(l => ({
      empresa: l.empresa,
      telefono: l.telefono,
      terminal: l.terminal,
      color: (l.color as 'blue' | 'green' | 'orange') || 'blue',
      rutas: (l.rutas || []).map(r => ({ destino: r.destino, ida: r.ida, regreso: r.regreso }))
    }));
    setTransportLines(lines);
    setTransportForm({ mac_name: item.mac_name, data_json: JSON.stringify(item.data, null, 2) });
    setTransportModalOpen(true);
  };

  const addLine = () => {
    setTransportLines(prev => [...prev, { empresa: '', telefono: '', terminal: '', color: 'blue', rutas: [{ destino: '', ida: '', regreso: '' }] }]);
  };
  const removeLine = (idx: number) => {
    setTransportLines(prev => prev.filter((_, i) => i !== idx));
  };
  const updateLine = (idx: number, field: keyof FormLine, value: string) => {
    setTransportLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };
  const addRuta = (lineIdx: number) => {
    setTransportLines(prev => prev.map((l, i) => i === lineIdx ? { ...l, rutas: [...l.rutas, { destino: '', ida: '', regreso: '' }] } : l));
  };
  const removeRuta = (lineIdx: number, rutaIdx: number) => {
    setTransportLines(prev => prev.map((l, i) => i === lineIdx ? { ...l, rutas: l.rutas.filter((_, j) => j !== rutaIdx) } : l));
  };
  const updateRuta = (lineIdx: number, rutaIdx: number, field: keyof FormRuta, value: string) => {
    setTransportLines(prev => prev.map((l, i) => i === lineIdx ? { ...l, rutas: l.rutas.map((r, j) => j === rutaIdx ? { ...r, [field]: value } : r) } : l));
  };
  const duplicateLine = (idx: number) => {
    setTransportLines(prev => {
      const copy = { ...prev[idx], rutas: prev[idx].rutas.map(r => ({ ...r })) };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };
  const COLOR_LINE_LABEL: Record<string, string> = { blue: 'Azul', green: 'Verde', orange: 'Naranja' };
  const COLOR_LINE_STYLE: Record<string, string> = {
    blue: 'border-l-4 border-l-blue-500 bg-blue-50',
    green: 'border-l-4 border-l-green-500 bg-green-50',
    orange: 'border-l-4 border-l-orange-400 bg-orange-50'
  };

  const handleDeleteTransport = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro de transporte?')) return;

    try {
      const selectedTransport = transportInfos.find(t => t.id === id);
      const label = selectedTransport?.mac_name ? `Transporte de ${selectedTransport.mac_name}` : 'Transporte';

      if (!isSupabaseConfigured()) {
        const next = transportInfos.filter(t => t.id !== id);
        setTransportInfos(next);
        saveToLocalStorage(macs, advisors, next);
      } else {
        const { error } = await supabase.from('transport_info').delete().eq('id', id);
        if (error) throw error;
        await fetchData();
      }

      toast.success(`${label} eliminado correctamente`);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo eliminar el transporte');
    }
  };

  const handleDeleteAdvisor = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este asesor?')) return;

    try {
      const selectedAdvisor = advisors.find(a => a.id === id);
      const label = selectedAdvisor ? `${selectedAdvisor.title} ${selectedAdvisor.name}` : 'Asesor';

      if (!isSupabaseConfigured()) {
        const newAdvisors = advisors.filter(a => a.id !== id);
        const newMacs = macs.map(m => ({
          ...m,
          advisors: m.advisors ? m.advisors.filter(a => a.id !== id) : []
        }));
        setAdvisors(newAdvisors);
        setMacs(newMacs);
        saveToLocalStorage(newMacs, newAdvisors);
      } else {
        // The cascade delete on mac_advisors will handle removing the relationships
        const { error: deleteError } = await supabase.from('advisors').delete().eq('id', id);
        if (deleteError) throw deleteError;

        await fetchData();
      }

      toast.success(`${label} eliminado correctamente`);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo eliminar el asesor');
    }
  };

  const openEditMac = (mac: MacWithAdvisor) => {
    setSaveError('');
    setEditingMac(mac);
    setMacPhotoFiles([]);
    setMacPhotoPreviews([]);
    setMacPoisForm(
      (mac.pois || [])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((poi) => ({
          id: poi.id,
          type: poi.type,
          name: poi.name,
          description: poi.description || '',
          lat: Number.isFinite(poi.lat) ? poi.lat.toString() : '',
          lng: Number.isFinite(poi.lng) ? poi.lng.toString() : '',
          image_url: poi.image_url || '',
        })),
    );
    const advisorIds = (mac.advisors || []).map(a => a.id);
    setMacForm({
      name: mac.name,
      lat: mac.lat.toString(),
      lng: mac.lng.toString(),
      details: mac.details,
      schedule: mac.schedule,
      advisor_ids: advisorIds
    });
    setMacModalOpen(true);
  };

  const openEditAdvisor = (advisor: Advisor) => {
    setSaveError('');
    setEditingAdvisor(advisor);
    setAdvisorAcademicSelect(advisor.academic_program_id || 'none');
    setAdvisorAcademicCustom('');
    setAdvisorForm({
      title: advisor.title,
      name: advisor.name,
      email: advisor.email,
      phone: advisor.phone,
      photo_url: advisor.photo_url || '',
      pin_color: advisor.pin_color || '#002D72'
    });
    setAdvisorPhotoPreview(advisor.photo_url || '');
    setAdvisorPhotoFile(null);
    setAdvisorModalOpen(true);
  };

  const resetMacForm = () => {
    setSaveError('');
    setEditingMac(null);
    setMacPhotoFiles([]);
    setMacPhotoPreviews([]);
    setMacPoisForm([]);
    setCoordinatePickerTarget({ kind: 'mac' });
    setMacForm({ name: '', lat: '', lng: '', details: '', schedule: '', advisor_ids: [] });
  };

  const resetAdvisorForm = () => {
    setSaveError('');
    setEditingAdvisor(null);
    setAdvisorAcademicSelect('none');
    setAdvisorAcademicCustom('');
    setAdvisorForm({ title: 'Ing', name: '', email: '', phone: '', photo_url: '', pin_color: '#002D72' });
    setAdvisorPhotoFile(null);
    setAdvisorPhotoPreview('');
  };

  const handleAdvisorFileChange = (file: File | null) => {
    setAdvisorPhotoFile(file);
    if (!file) {
      setAdvisorPhotoPreview(advisorForm.photo_url);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAdvisorPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#002D72]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 py-2 sm:py-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#002D72] flex items-center justify-center font-black font-heading text-[#F2A900] text-sm shrink-0">
              UAS
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#002D72] truncate">Panel de Administración</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Gestión de MACs y Asesores</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <span className="text-sm text-gray-500 hidden md:inline truncate max-w-[180px]">{user?.email}</span>
            <Button onClick={logout} variant="outline" size="sm" className="text-gray-600">
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'macs' | 'advisors' | 'transport')}>
          <TabsList className="mb-6 w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="macs" className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-none">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">Módulos MAC</span>
              <span className="inline xs:hidden sm:hidden">MAC</span>
            </TabsTrigger>
            <TabsTrigger value="advisors" className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-none">
              <User className="w-4 h-4 shrink-0" />
              Asesores
            </TabsTrigger>
            <TabsTrigger value="transport" className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-none">
              <Bus className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">Transporte</span>
              <span className="inline xs:hidden sm:hidden">Transp.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="macs">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Módulos de Atención Comunitaria</h2>
                <Button onClick={() => { resetMacForm(); setMacModalOpen(true); }} className="bg-[#002D72] hover:bg-[#001f50] w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo MAC
                </Button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Coordenadas</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Asesor</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">POIs</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Horario</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {macs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          No hay módulos registrados. Agrega el primero.
                        </td>
                      </tr>
                    ) : (
                      macs.map((mac) => (
                        <tr key={mac.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {mac.mac_images && mac.mac_images.length > 0 && (
                                <img src={mac.mac_images[0].photo_url} alt={mac.name} className="w-10 h-10 rounded-lg object-cover" />
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{mac.name}</p>
                                <p className="text-xs text-gray-500 truncate max-w-[200px]">{mac.details}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {mac.lat.toFixed(4)}, {mac.lng.toFixed(4)}
                          </td>
                          <td className="px-6 py-4">
                            {mac.advisors && mac.advisors.length > 0 ? (
                              <div className="space-y-1">
                                {mac.advisors.map((advisor) => (
                                  <span key={advisor.id} className="block text-sm">
                                    {advisor.title} {advisor.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">Sin asignar</span>
                            )}
                          </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-full text-xs font-semibold bg-[#002D72]/10 text-[#002D72] border border-[#002D72]/15">
                                {mac.pois?.length || 0}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{mac.schedule}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditMac(mac)}>
                                <Pencil className="w-4 h-4 text-gray-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteMac(mac.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advisors">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Registro de Asesores</h2>
                <Button onClick={() => { resetAdvisorForm(); setAdvisorModalOpen(true); }} className="bg-[#002D72] hover:bg-[#001f50] w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Asesor
                </Button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Foto</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Formación</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Color Pin</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">MACs Asignados</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {advisors.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                          No hay asesores registrados. Agrega el primero.
                        </td>
                      </tr>
                    ) : (
                      advisors.map((advisor) => {
                        const assignedMacs = macs.filter(m => m.advisors && m.advisors.some(a => a.id === advisor.id));
                        return (
                          <tr key={advisor.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              {advisor.photo_url ? (
                                <img src={advisor.photo_url} alt={advisor.name} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                                  <User className="w-5 h-5" />
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-900">{advisor.title} {advisor.name}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {advisor.academic_program?.name || 'Sin especificar'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{advisor.email}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{advisor.phone}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-6 h-6 rounded-full border-2 border-[#F2A900] shadow-sm shrink-0"
                                  style={{ backgroundColor: advisor.pin_color || '#002D72' }}
                                  title={advisor.pin_color || '#002D72'}
                                />
                                <span className="text-xs font-mono text-gray-400">{advisor.pin_color || '#002D72'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-600">
                                {assignedMacs.length > 0 ? assignedMacs.map(m => m.name).join(', ') : 'Sin asignar'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openEditAdvisor(advisor)}>
                                  <Pencil className="w-4 h-4 text-gray-500" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteAdvisor(advisor.id)}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transport">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Información de Transporte</h2>
                <Button
                  onClick={() => {
                    setSaveError('');
                    setEditingTransport(null);
                    setTransportMacSelect('none');
                    setTransportMacCustom('');
                    setTransportLines([{ empresa: '', telefono: '', terminal: '', color: 'blue', rutas: [{ destino: '', ida: '', regreso: '' }] }]);
                    setTransportForm({ mac_name: '', data_json: JSON.stringify({ lineas: [] }, null, 2) });
                    setTransportModalOpen(true);
                  }}
                  className="bg-[#002D72] hover:bg-[#001f50] w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Registro
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">MAC</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Líneas</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transportInfos.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No hay información de transporte registrada.</td>
                      </tr>
                    ) : (
                      transportInfos.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.mac_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{item.data?.lineas?.map((linea) => linea.empresa).join(', ') || 'Sin líneas'}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditTransport(item)}>
                                <Pencil className="w-4 h-4 text-gray-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteTransport(item.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={macModalOpen} onOpenChange={(open) => {
        setMacModalOpen(open);
        if (!open) resetMacForm();
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMac ? `Editar MAC: ${editingMac.name}` : 'Nuevo Módulo MAC'}
            </DialogTitle>
            <DialogDescription>
              Configura datos generales del MAC, asesor asignado, fotos y puntos de interés por pin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editingMac && (
              <div className="px-3 py-2 rounded-lg bg-[#002D72]/5 border border-[#002D72]/20 text-xs text-[#002D72] font-medium">
                Estás editando el MAC <span className="font-bold">{editingMac.name}</span>. Los puntos de interés que guardes quedarán ligados a este MAC.
              </div>
            )}
            {saveError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {saveError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Nombre del Módulo</Label>
              <Input value={macForm.name} onChange={(e) => setMacForm({ ...macForm, name: e.target.value })} placeholder="Ej: Los Mochis" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitud</Label>
                <Input type="number" step="any" value={macForm.lat} onChange={(e) => setMacForm({ ...macForm, lat: e.target.value })} placeholder="24.8101" />
              </div>
              <div className="space-y-2">
                <Label>Longitud</Label>
                <Input type="number" step="any" value={macForm.lng} onChange={(e) => setMacForm({ ...macForm, lng: e.target.value })} placeholder="-107.3940" />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full border-[#002D72]/30 text-[#002D72] hover:bg-[#002D72]/5"
              onClick={() => {
                setCoordinatePickerTarget({ kind: 'mac' });
                setCoordinatePickerOpen(true);
              }}
            >
              <Crosshair className="w-4 h-4 mr-2 text-[#F2A900]" />
              Asignar con pin en el mapa
            </Button>
            <p className="text-xs text-gray-500 -mt-2">
              Usa el picker de coordenadas o escribe los valores manualmente.
            </p>
            <div className="space-y-2">
              <Label>Detalles</Label>
              <Input value={macForm.details} onChange={(e) => setMacForm({ ...macForm, details: e.target.value })} placeholder="Descripción del módulo" />
            </div>
            <div className="space-y-2">
              <Label>Horario</Label>
              <Input value={macForm.schedule} onChange={(e) => setMacForm({ ...macForm, schedule: e.target.value })} placeholder="Martes a Viernes 9:00 a.m a 2:00 p.m" />
            </div>
            <div className="space-y-2">
              <Label>Fotos del MAC (múltiples)</Label>
              <Input type="file" accept="image/jpeg,image/jpg,image/png" multiple onChange={(e) => handleMacFilesChange(e.target.files)} />
              {macPhotoPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {macPhotoPreviews.map((url, idx) => (
                    <img key={idx} src={url} alt={`Preview ${idx + 1}`} className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                  ))}
                </div>
              )}
              {editingMac?.mac_images && editingMac.mac_images.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Fotos actuales ({editingMac.mac_images.length})</p>
                  <div className="grid grid-cols-4 gap-2">
                    {editingMac.mac_images.slice(0, 8).map((img) => (
                      <img key={img.id} src={img.photo_url} alt="MAC" className="w-full h-16 object-cover rounded-md border border-gray-200" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 border border-gray-200 rounded-xl p-4 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-800">Puntos de interés del MAC</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addPoiRow}
                  className="text-[#002D72] border-[#002D72]/30 hover:bg-[#002D72]/5"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Agregar punto
                </Button>
              </div>

              {macPoisForm.length === 0 ? (
                <div className="text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg p-3 bg-white">
                  Sin puntos de interés. Agrega uno para este MAC.
                </div>
              ) : (
                <div className="space-y-3">
                  {macPoisForm.map((poi, idx) => {
                    const poiInfo = POI_CATALOG_MAP[poi.type] || POI_CATALOG_MAP.services;
                    return (
                      <div key={poi.id || idx} className="p-3 rounded-lg border border-gray-200 bg-white space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-gray-600">Punto #{idx + 1}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-700"
                            onClick={() => removePoiRow(idx)}
                            title="Eliminar punto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">Categoría</Label>
                            <Select value={poi.type} onValueChange={(v) => updatePoiRow(idx, 'type', v as PoiType)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {POI_CATALOG.map((item) => (
                                  <SelectItem key={item.type} value={item.type}>{item.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">Título</Label>
                            <Input
                              value={poi.name}
                              onChange={(e) => updatePoiRow(idx, 'name', e.target.value)}
                              placeholder="Ej: Hospital General"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Descripción</Label>
                          <Textarea
                            value={poi.description}
                            onChange={(e) => updatePoiRow(idx, 'description', e.target.value)}
                            placeholder={poiInfo.description}
                            className="min-h-[72px]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">Latitud</Label>
                            <Input
                              type="number"
                              step="any"
                              value={poi.lat}
                              onChange={(e) => updatePoiRow(idx, 'lat', e.target.value)}
                              placeholder="25.7904"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">Longitud</Label>
                            <Input
                              type="number"
                              step="any"
                              value={poi.lng}
                              onChange={(e) => updatePoiRow(idx, 'lng', e.target.value)}
                              placeholder="-108.9858"
                            />
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-[#002D72]/25 text-[#002D72] hover:bg-[#002D72]/5"
                          onClick={() => {
                            setCoordinatePickerTarget({ kind: 'poi', index: idx });
                            setCoordinatePickerOpen(true);
                          }}
                        >
                          <Crosshair className="w-4 h-4 mr-2 text-[#F2A900]" />
                          Fijar punto con pin en el mapa
                        </Button>

                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">URL de imagen (opcional)</Label>
                          <Input
                            value={poi.image_url}
                            onChange={(e) => updatePoiRow(idx, 'image_url', e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Asesores Asignados</Label>
              <div className="border border-gray-200 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                {advisors.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin asesores registrados</p>
                ) : (
                  advisors.map((advisor) => (
                    <div key={advisor.id} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={`advisor-${advisor.id}`}
                        checked={macForm.advisor_ids.includes(advisor.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMacForm({
                              ...macForm,
                              advisor_ids: [...macForm.advisor_ids, advisor.id]
                            });
                          } else {
                            setMacForm({
                              ...macForm,
                              advisor_ids: macForm.advisor_ids.filter(id => id !== advisor.id)
                            });
                          }
                        }}
                        className="w-4 h-4 border-gray-300 rounded text-[#002D72]"
                      />
                      <label htmlFor={`advisor-${advisor.id}`} className="flex-1 text-sm cursor-pointer">
                        {advisor.title} {advisor.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMacModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveMac} disabled={isSaving || !macForm.name || !macForm.lat || !macForm.lng} className="bg-[#002D72] hover:bg-[#001f50]">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingMac ? 'Guardar cambios' : 'Crear MAC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={advisorModalOpen} onOpenChange={(open) => {
        setAdvisorModalOpen(open);
        if (!open) resetAdvisorForm();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAdvisor ? 'Editar Asesor' : 'Nuevo Asesor'}</DialogTitle>
            <DialogDescription>
              Administra información de contacto, foto y formación académica del asesor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {saveError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {saveError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Título</Label>
              <Select value={advisorForm.title} onValueChange={(v) => setAdvisorForm({ ...advisorForm, title: v as AdvisorTitle })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADVISOR_TITLES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Input value={advisorForm.name} onChange={(e) => setAdvisorForm({ ...advisorForm, name: e.target.value })} placeholder="Nombre del asesor" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={advisorForm.email} onChange={(e) => setAdvisorForm({ ...advisorForm, email: e.target.value })} placeholder="email@uas.edu.mx" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={advisorForm.phone} onChange={(e) => setAdvisorForm({ ...advisorForm, phone: e.target.value })} placeholder="(667) 123-4567" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-[#002D72]" />Formación Académica</Label>
              <Select value={advisorAcademicSelect} onValueChange={setAdvisorAcademicSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar formación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {academicPrograms.map((program) => (
                    <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>
                  ))}
                  <SelectItem value="other">Otro (agregar nueva)</SelectItem>
                </SelectContent>
              </Select>
              {advisorAcademicSelect === 'other' && (
                <Input
                  value={advisorAcademicCustom}
                  onChange={(e) => setAdvisorAcademicCustom(e.target.value)}
                  placeholder="Escribe la formación (se guardará en catálogo)"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#002D72]" />
                Color del Pin en el Mapa
              </Label>
              <div className="flex flex-wrap gap-2 items-center">
                {ADVISOR_PIN_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAdvisorForm({ ...advisorForm, pin_color: color })}
                    className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: advisorForm.pin_color === color ? '#111827' : 'transparent',
                      transform: advisorForm.pin_color === color ? 'scale(1.15)' : undefined,
                      outline: advisorForm.pin_color === color ? '2px solid #F2A900' : undefined,
                      outlineOffset: '1px',
                    }}
                    title={color}
                  />
                ))}
                <input
                  type="color"
                  value={advisorForm.pin_color}
                  onChange={(e) => setAdvisorForm({ ...advisorForm, pin_color: e.target.value })}
                  className="w-7 h-7 rounded-full cursor-pointer border border-gray-300 p-0.5 shrink-0"
                  title="Color personalizado"
                />
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div
                  className="w-10 h-10 rounded-full border-[3px] border-[#F2A900] shadow-md flex items-center justify-center"
                  style={{ backgroundColor: advisorForm.pin_color }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#ffffff"/></svg>
                </div>
                <span className="text-xs font-mono text-gray-500">{advisorForm.pin_color}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Foto JPG (Supabase Storage)</Label>
              <Input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={(e) => handleAdvisorFileChange(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label>URL de Foto (opcional)</Label>
              <div className="flex gap-2">
                <Input value={advisorForm.photo_url} onChange={(e) => setAdvisorForm({ ...advisorForm, photo_url: e.target.value })} placeholder="https://..." />
                {advisorForm.photo_url && (
                  <Button variant="outline" size="icon" onClick={() => setAdvisorForm({ ...advisorForm, photo_url: '' })}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {(advisorPhotoPreview || advisorForm.photo_url) && (
                <img src={advisorPhotoPreview || advisorForm.photo_url} alt="Preview" className="w-28 h-28 rounded-full object-cover mt-2 border-4 border-[#002D72]/15" />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvisorModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAdvisor} disabled={isSaving || !advisorForm.name} className="bg-[#002D72] hover:bg-[#001f50]">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingAdvisor ? 'Guardar cambios' : 'Crear Asesor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transportModalOpen} onOpenChange={(open) => {
        setTransportModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTransport ? 'Editar Transporte' : 'Nuevo Registro de Transporte'}</DialogTitle>
            <DialogDescription>
              Define líneas y rutas de transporte asociadas al MAC seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {saveError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {saveError}
              </div>
            )}

            {/* MAC selector */}
            <div className="space-y-2">
              <Label>MAC destino</Label>
              {editingTransport ? (
                <Input value={editingTransport.mac_name} disabled className="bg-gray-100 text-gray-600" />
              ) : (
                <>
                  <Select value={transportMacSelect} onValueChange={(v) => { setTransportMacSelect(v); setSaveError(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un MAC..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Seleccionar MAC --</SelectItem>
                      {macs.map(m => (
                        <SelectItem key={m.id} value={m.name}>MAC {m.name}</SelectItem>
                      ))}
                      <SelectItem value="other">Otro (escribir manualmente)</SelectItem>
                    </SelectContent>
                  </Select>
                  {transportMacSelect === 'other' && (
                    <Input
                      value={transportMacCustom}
                      onChange={(e) => setTransportMacCustom(e.target.value)}
                      placeholder="Escribe el nombre del MAC (ej: Ruiz Cortines)"
                      className="mt-2"
                    />
                  )}
                </>
              )}
            </div>

            {/* Empresas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-gray-800">Empresas de transporte</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addLine}
                  className="text-[#002D72] border-[#002D72]/30 hover:bg-[#002D72]/5"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Agregar empresa
                </Button>
              </div>

              {transportLines.length === 0 && (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <Bus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sin empresas agregadas</p>
                  <p className="text-xs mt-1">Usa el boton de arriba para agregar la primera</p>
                </div>
              )}

              {transportLines.map((line, lineIdx) => (
                <div key={lineIdx} className={`rounded-xl border p-4 space-y-3 ${COLOR_LINE_STYLE[line.color]}`}>
                  {/* Empresa header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${COLOR_BADGE[line.color]}`} />
                      <Input
                        value={line.empresa}
                        onChange={(e) => updateLine(lineIdx, 'empresa', e.target.value)}
                        placeholder="Nombre de la empresa (ej: Azules del Noroeste)"
                        className="font-semibold bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar empresa" onClick={() => duplicateLine(lineIdx)}>
                        <span className="text-xs">Dup</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" title="Eliminar empresa" onClick={() => removeLine(lineIdx)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Telefono y terminal */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Telefono</Label>
                      <Input value={line.telefono} onChange={(e) => updateLine(lineIdx, 'telefono', e.target.value)} placeholder="668 812 3491" className="bg-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Terminal</Label>
                      <Input value={line.terminal} onChange={(e) => updateLine(lineIdx, 'terminal', e.target.value)} placeholder="Callejon Tenochtitlan 399" className="bg-white" />
                    </div>
                  </div>

                  {/* Color selector */}
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-gray-500">Color:</Label>
                    <div className="flex gap-2">
                      {(['blue', 'green', 'orange'] as const).map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateLine(lineIdx, 'color', c)}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${line.color === c ? `border-gray-800 scale-110 ${COLOR_BADGE[c]}` : 'border-gray-300 opacity-50 hover:opacity-80'}`}
                          title={COLOR_LINE_LABEL[c]}
                        />
                      ))}
                      <span className="text-xs text-gray-400 self-center ml-1">{COLOR_LINE_LABEL[line.color]}</span>
                    </div>
                  </div>

                  {/* Rutas */}
                  <div className="space-y-2 border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-gray-600">Rutas</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => addRuta(lineIdx)}
                        className="h-6 text-xs text-[#002D72] hover:bg-[#002D72]/5"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Agregar ruta
                      </Button>
                    </div>

                    {line.rutas.map((ruta, rutaIdx) => (
                      <div key={rutaIdx} className="bg-white/70 rounded-lg p-3 space-y-2 border border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">Ruta {rutaIdx + 1}</span>
                          {line.rutas.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400 hover:text-red-600" onClick={() => removeRuta(lineIdx, rutaIdx)}>
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <Input value={ruta.destino} onChange={(e) => updateRuta(lineIdx, rutaIdx, 'destino', e.target.value)} placeholder="Destino (ej: Topolobampo)" className="text-sm bg-white" />
                        <Input value={ruta.ida} onChange={(e) => updateRuta(lineIdx, rutaIdx, 'ida', e.target.value)} placeholder="Horario de ida (ej: Cada 20 min, 6:00 - 8:00 pm)" className="text-sm bg-white" />
                        <Input value={ruta.regreso} onChange={(e) => updateRuta(lineIdx, rutaIdx, 'regreso', e.target.value)} placeholder="Horario de regreso (ej: Mismo horario en sentido inverso)" className="text-sm bg-white" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setTransportModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveTransport}
              disabled={isSaving}
              className="bg-[#002D72] hover:bg-[#001f50]"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingTransport ? 'Guardar cambios' : 'Crear registro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CoordinatePicker
        isOpen={coordinatePickerOpen}
        onClose={() => {
          setCoordinatePickerOpen(false);
          setCoordinatePickerTarget({ kind: 'mac' });
        }}
        onConfirm={(lat, lng) => {
          if (coordinatePickerTarget.kind === 'poi') {
            updatePoiRow(coordinatePickerTarget.index, 'lat', lat.toFixed(6));
            updatePoiRow(coordinatePickerTarget.index, 'lng', lng.toFixed(6));
          } else {
            setMacForm(prev => ({ ...prev, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
          }
        }}
        initialLat={
          coordinatePickerTarget.kind === 'poi'
            ? (
              parseCoordinate(macPoisForm[coordinatePickerTarget.index]?.lat || '') ??
              parseCoordinate(macForm.lat) ??
              undefined
            )
            : (parseCoordinate(macForm.lat) ?? undefined)
        }
        initialLng={
          coordinatePickerTarget.kind === 'poi'
            ? (
              parseCoordinate(macPoisForm[coordinatePickerTarget.index]?.lng || '') ??
              parseCoordinate(macForm.lng) ??
              undefined
            )
            : (parseCoordinate(macForm.lng) ?? undefined)
        }
        title={
          coordinatePickerTarget.kind === 'poi'
            ? 'Seleccionar ubicacion del punto de interés'
            : 'Seleccionar ubicacion del MAC'
        }
        description={
          coordinatePickerTarget.kind === 'poi'
            ? 'Haz clic en el mapa para fijar el POI. Si es un punto nuevo, se abre centrado en el MAC que estás editando.'
            : 'Haz clic en el mapa para colocar el pin del MAC. Puedes hacer clic varias veces para ajustar la posicion.'
        }
      />
    </div>
  );
};
