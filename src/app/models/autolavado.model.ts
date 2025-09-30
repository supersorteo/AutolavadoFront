export interface Subsuelo {
  id: string;
  label: string;
}

export interface Space {
  key: string;
  subsueloId: string;
  occupied: boolean;
  hold: boolean;
  clientId: string | null;
  startTime: number | null;
}

export interface Client {
  id: string;
  code: string;
  name: string;
  phoneIntl: string;
  phoneRaw: string;
  vehicle?: string;
  plate?: string;
  notes?: string;
  spaceKey: string;
  qrText: string;
}

export interface QRData {
  t: string;
  client: {
    id: string;
    code: string;
    name: string;
    phone: string;
  };
  space: {
    key: string;
    subsuelo: string;
  };
  start: number;
}
