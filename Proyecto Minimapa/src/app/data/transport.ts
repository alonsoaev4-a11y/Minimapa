export interface TransportRoute {
  destino: string;
  ida: string;
  regreso: string;
}

export type TransportLineColor = 'blue' | 'green' | 'orange';

export interface TransportLine {
  empresa: string;
  telefono: string;
  terminal: string;
  color: TransportLineColor;
  rutas: TransportRoute[];
}

export interface TransportData {
  lineas: TransportLine[];
}

export interface TransportInfo {
  id: string;
  mac_name: string;
  data: TransportData;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_TRANSPORT_DATA: Array<{ mac_name: string; data: TransportData }> = [
  {
    mac_name: 'Topolobampo / 1ro de Mayo',
    data: {
      lineas: [{
        empresa: 'Azules del Noroeste',
        telefono: '668 812 3491',
        terminal: 'Callejon Tenochtitlan 399, Centro',
        color: 'blue',
        rutas: [{ destino: 'Topolobampo / 1ro de Mayo', ida: 'Cada 20 min, 6:00 am - 8:00 pm. ~$23 (OXXO)', regreso: 'Mismo horario en sentido inverso (OXXO)' }],
      }],
    },
  },
  {
    mac_name: 'San Blas / Charay',
    data: {
      lineas: [{
        empresa: 'Azules del Noroeste',
        telefono: '668 812 3491',
        terminal: 'Callejon Tenochtitlan 399, Centro',
        color: 'blue',
        rutas: [{ destino: 'San Blas / Charay', ida: 'Ruta cubierta - consultar taquilla', regreso: 'Mismo servicio de regreso' }],
      }],
    },
  },
  {
    mac_name: 'Ahome / Higuera de Zaragoza',
    data: {
      lineas: [{
        empresa: 'Azules del Noroeste',
        telefono: '668 812 3491',
        terminal: 'Callejon Tenochtitlan 399, Centro',
        color: 'blue',
        rutas: [
          { destino: 'Ahome', ida: 'Ruta Ahome cubierta - consultar taquilla', regreso: 'Mismo servicio' },
          { destino: 'Higuera de Zaragoza', ida: 'Taxi/Uber ~$100', regreso: 'Taxi/Uber ~$100' },
        ],
      }],
    },
  },
  {
    mac_name: 'Gabriel Leyva Solano',
    data: {
      lineas: [{
        empresa: 'Azules del Noroeste',
        telefono: '668 812 3491',
        terminal: 'Callejon Tenochtitlan 399, Centro',
        color: 'blue',
        rutas: [{ destino: 'Gabriel Leyva Solano', ida: 'Salidas: 05:55, 07:30, 09:00, 11:35, 12:30, 14:40, 17:20, 18:15, 19:30', regreso: 'Mismo servicio de regreso' }],
      }],
    },
  },
  {
    mac_name: 'Mochicahui / 5 de Mayo',
    data: {
      lineas: [{
        empresa: 'ANS - Norte de Sinaloa',
        telefono: '668 818 0357',
        terminal: 'Zaragoza 800 Sur',
        color: 'green',
        rutas: [{ destino: 'Mochicahui / 5 de Mayo', ida: 'Cada 20 min, 6:00 - 19:40', regreso: 'Mismo intervalo de regreso' }],
      }],
    },
  },
  {
    mac_name: 'Ejido Porvenir / Flor Azul',
    data: {
      lineas: [{
        empresa: 'ANS - Norte de Sinaloa',
        telefono: '668 818 0357',
        terminal: 'Zaragoza 800 Sur',
        color: 'green',
        rutas: [{ destino: 'Ejido Porvenir / Flor Azul', ida: 'Cada 20 min, 6:00 - 19:40', regreso: 'Mismo intervalo de regreso' }],
      }],
    },
  },
  {
    mac_name: 'Bagojo',
    data: {
      lineas: [{
        empresa: 'ANS - Norte de Sinaloa',
        telefono: '668 818 0357',
        terminal: 'Zaragoza 800 Sur',
        color: 'green',
        rutas: [{ destino: 'Bagojo', ida: 'Cada 20 min, 6:00 - 19:40', regreso: 'Mismo intervalo de regreso' }],
      }],
    },
  },
  {
    mac_name: 'Ruiz Cortines',
    data: {
      lineas: [{
        empresa: 'ANS - Norte de Sinaloa',
        telefono: '668 818 0357',
        terminal: 'Zaragoza 800 Sur',
        color: 'green',
        rutas: [{ destino: 'Ruiz Cortines', ida: 'Cada 20 min, 6:00 - 19:40', regreso: 'Mismo intervalo de regreso' }],
      }],
    },
  },
  {
    mac_name: 'Juan Jose Rios',
    data: {
      lineas: [{
        empresa: 'ANS - Norte de Sinaloa',
        telefono: '668 818 0357',
        terminal: 'Zaragoza 800 Sur',
        color: 'green',
        rutas: [{ destino: 'Juan Jose Rios', ida: 'Cada 20 min, 6:00 - 19:40', regreso: 'Mismo intervalo de regreso' }],
      }],
    },
  },
  {
    mac_name: 'Flores Magon / Paredones',
    data: {
      lineas: [{
        empresa: 'ANS - Norte de Sinaloa',
        telefono: '668 818 0357',
        terminal: 'Zaragoza 800 Sur',
        color: 'green',
        rutas: [{ destino: 'Flores Magon / Paredones', ida: 'Cada 20 min, 6:00 - 19:40', regreso: 'Mismo intervalo de regreso' }],
      }],
    },
  },
  {
    mac_name: '9 de Diciembre / Alamos',
    data: {
      lineas: [{
        empresa: 'ANS - Norte de Sinaloa',
        telefono: '668 818 0357',
        terminal: 'Zaragoza 800 Sur',
        color: 'green',
        rutas: [{ destino: '9 de Diciembre / Alamos', ida: 'Cada 20 min, 6:00 - 19:40', regreso: 'Mismo intervalo de regreso' }],
      }],
    },
  },
  {
    mac_name: 'San Miguel',
    data: {
      lineas: [{
        empresa: 'ATUSUM (Transporte Urbano/Suburbano)',
        telefono: '',
        terminal: 'Centro de Los Mochis',
        color: 'orange',
        rutas: [{ destino: 'San Miguel', ida: 'Ruta urbana/suburbana sin horario fijo publicado', regreso: 'Mismo servicio' }],
      }],
    },
  },
  {
    mac_name: 'Guayabo',
    data: {
      lineas: [{
        empresa: 'ATUSUM (Transporte Urbano/Suburbano)',
        telefono: '',
        terminal: 'Centro de Los Mochis',
        color: 'orange',
        rutas: [{ destino: 'Guayabo', ida: 'Ruta urbana/suburbana sin horario fijo publicado', regreso: 'Mismo servicio' }],
      }],
    },
  },
  {
    mac_name: 'Malvinas',
    data: {
      lineas: [{
        empresa: 'ATUSUM (Transporte Urbano/Suburbano)',
        telefono: '',
        terminal: 'Centro de Los Mochis',
        color: 'orange',
        rutas: [{ destino: 'Malvinas', ida: 'Ruta urbana/suburbana sin horario fijo publicado', regreso: 'Mismo servicio' }],
      }],
    },
  },
  {
    mac_name: 'Ferrusquilla',
    data: {
      lineas: [{
        empresa: 'ATUSUM (Transporte Urbano/Suburbano)',
        telefono: '',
        terminal: 'Centro de Los Mochis',
        color: 'orange',
        rutas: [{ destino: 'Ferrusquilla', ida: 'Ruta urbana/suburbana sin horario fijo publicado', regreso: 'Mismo servicio' }],
      }],
    },
  },
];
