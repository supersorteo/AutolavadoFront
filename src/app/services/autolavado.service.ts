import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

// Interfaces
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

export interface ClientData {
  name: string;
  phone: string;
  vehicle?: string;
  plate?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AutolavadoService {
  private readonly LS_KEYS = {
    subs: 'alw_subsuelos',
    spaces: 'alw_spaces',
    clients: 'alw_clients'
  };

  // Subjects para estado reactivo
  private subsuelosSubject = new BehaviorSubject<Subsuelo[]>([]);
  private spacesSubject = new BehaviorSubject<{ [key: string]: Space }>({});
  private clientsSubject = new BehaviorSubject<{ [key: string]: Client }>({});
  private currentSubIdSubject = new BehaviorSubject<string | null>(null);
  private searchTermSubject = new BehaviorSubject<string>('');

  // Observables públicos
  public subsuelos$ = this.subsuelosSubject.asObservable();
  public spaces$ = this.spacesSubject.asObservable();
  public clients$ = this.clientsSubject.asObservable();
  public currentSubId$ = this.currentSubIdSubject.asObservable();
  public filteredClients$ = combineLatest([this.clients$, this.searchTermSubject]).pipe(
    map(([clients, searchTerm]) => {
      const term = searchTerm.trim().toLowerCase();
      return Object.values(clients).filter(client => {
        const space = this.spacesSubject.value[client.spaceKey];
        if (!space || !space.occupied) return false;
        if (!term) return true;
        return (
          (client.name || '').toLowerCase().includes(term) ||
          (client.code || '').toLowerCase().includes(term) ||
          (client.spaceKey || '').toLowerCase().includes(term) ||
          (client.phoneIntl || '').toLowerCase().includes(term) ||
          (client.vehicle || '').toLowerCase().includes(term)
        );
      });
    })
  );

  constructor() {
    this.loadAll();
    this.ensureAtLeastOneSubsuelo();
  }

  // Gestión de almacenamiento
  private loadAll(): void {
    try {
      const subsuelos = JSON.parse(localStorage.getItem(this.LS_KEYS.subs) || '[]') as Subsuelo[];
      const spaces = JSON.parse(localStorage.getItem(this.LS_KEYS.spaces) || '{}') as { [key: string]: Space };
      const clients = JSON.parse(localStorage.getItem(this.LS_KEYS.clients) || '{}') as { [key: string]: Client };

      this.subsuelosSubject.next(subsuelos);
      this.spacesSubject.next(spaces);
      this.clientsSubject.next(clients);
    } catch (error) {
      console.error('Error al cargar datos de localStorage:', error);
      this.subsuelosSubject.next([]);
      this.spacesSubject.next({});
      this.clientsSubject.next({});
    }
  }

  private saveAll(): void {
    try {
      localStorage.setItem(this.LS_KEYS.subs, JSON.stringify(this.subsuelosSubject.value));
      localStorage.setItem(this.LS_KEYS.spaces, JSON.stringify(this.spacesSubject.value));
      localStorage.setItem(this.LS_KEYS.clients, JSON.stringify(this.clientsSubject.value));
    } catch (error) {
      console.error('Error al guardar datos en localStorage:', error);
    }
  }

  // Gestión de subsuelos
  private ensureAtLeastOneSubsuelo(): void {
    const subsuelos = this.subsuelosSubject.value;
    if (subsuelos.length === 0) {
      const id = 'SUB1';
      const newSub: Subsuelo = { id, label: 'Subsuelo 1' };
      const spaces = this.spacesSubject.value;
      this.createSpacesForSubsuelo(id, 10, spaces);

      this.subsuelosSubject.next([newSub]);
      this.spacesSubject.next(spaces);
      this.currentSubIdSubject.next(id);
      this.saveAll();
    } else {
      this.currentSubIdSubject.next(subsuelos[0].id);
    }
  }

  addSubsuelo(): void {
    const subsuelos = this.subsuelosSubject.value;
    const nextNum = subsuelos.length + 1;
    const id = `SUB${nextNum}`;
    const newSub: Subsuelo = { id, label: `Subsuelo ${nextNum}` };
    const spaces = this.spacesSubject.value;

    this.createSpacesForSubsuelo(id, 5, spaces);

    this.subsuelosSubject.next([...subsuelos, newSub]);
    this.spacesSubject.next({ ...spaces });
    this.currentSubIdSubject.next(id);
    this.saveAll();
  }

  // Gestión de espacios
  private createSpacesForSubsuelo(subsueloId: string, count: number, spaces: { [key: string]: Space }): void {
    for (let i = 1; i <= count; i++) {
      const key = this.formatSpaceCode(subsueloId, i);
      spaces[key] = {
        key,
        subsueloId,
        occupied: false,
        hold: false,
        clientId: null,
        startTime: null
      };
    }
  }

  addSpacesToCurrent(count: number): void {
    const currentSubId = this.currentSubIdSubject.value;
    if (!currentSubId) return;

    const spaces = this.spacesSubject.value;
    const existingKeys = Object.keys(spaces)
      .filter(k => spaces[k].subsueloId === currentSubId)
      .map(k => Number(k.split('-')[1]))
      .sort((a, b) => a - b);

    const start = existingKeys.length ? existingKeys[existingKeys.length - 1] : 0;

    for (let i = 1; i <= count; i++) {
      const n = start + i;
      const key = this.formatSpaceCode(currentSubId, n);
      spaces[key] = {
        key,
        subsueloId: currentSubId,
        occupied: false,
        hold: false,
        clientId: null,
        startTime: null
      };
    }

    this.spacesSubject.next({ ...spaces });
    this.saveAll();
  }

  setCurrentSubsuelo(id: string): void {
    if (this.subsuelosSubject.value.some(sub => sub.id === id)) {
      this.currentSubIdSubject.next(id);
    }
  }

  // Gestión de clientes
  saveClient(clientData: ClientData, spaceKey: string): Client {
    const spaces = this.spacesSubject.value;
    const clients = this.clientsSubject.value;
    const space = spaces[spaceKey];
    if (!space) throw new Error('Espacio no encontrado');
    if (space.occupied) throw new Error('El espacio ya está ocupado');

    const id = this.generateClientId();
    const code = id.toUpperCase();
    const phoneIntl = this.toPhoneAR(clientData.phone);

    const client: Client = {
      id,
      code,
      name: clientData.name.trim(),
      phoneIntl,
      phoneRaw: clientData.phone.trim(),
      vehicle: clientData.vehicle?.trim() || '',
      plate: clientData.plate?.trim() || '',
      notes: clientData.notes?.trim() || '',
      spaceKey,
      qrText: ''
    };

    space.occupied = true;
    space.clientId = id;
    space.startTime = Date.now();
    space.hold = false;

    client.qrText = this.buildQRText(client, space);
    clients[id] = client;

    this.spacesSubject.next({ ...spaces });
    this.clientsSubject.next({ ...clients });
    this.saveAll();

    return client;
  }

  releaseSpace0(spaceKey: string): void {
    const spaces = this.spacesSubject.value;
    const space = spaces[spaceKey];
    if (!space) return;

    space.occupied = false;
    space.clientId = null;
    space.startTime = null;
    space.hold = false;

    this.spacesSubject.next({ ...spaces });
    this.saveAll();
  }

releaseSpace(spaceKey: string): void {
  const spaces = this.spacesSubject.value;
  const clients = this.clientsSubject.value;
  const space = spaces[spaceKey];
  if (!space) return;

  // Eliminar cliente asociado
  if (space.clientId) {
    delete clients[space.clientId];
    this.clientsSubject.next({ ...clients });
  }

  space.occupied = false;
  space.clientId = null;
  space.startTime = null;
  space.hold = false;

  this.spacesSubject.next({ ...spaces });
  this.saveAll();
}

resetData(): void {
  const spaces = this.spacesSubject.value;
  Object.values(spaces).forEach(space => {
    space.occupied = false;
    space.clientId = null;
    space.startTime = null;
    space.hold = false;
  });

  this.spacesSubject.next({ ...spaces });
  this.clientsSubject.next({});
  this.saveAll();
}

  // Gestión de búsqueda
  setSearchTerm(term: string): void {
    this.searchTermSubject.next(term);
  }

  // Utilidades
  private generateClientId(): string {
    return `C-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`;
  }

  private padNumber(n: number): string {
    return String(n).padStart(3, '0');
  }

  private formatSpaceCode(subId: string, idx: number): string {
    return `${subId}-${this.padNumber(idx)}`;
  }

  toPhoneAR(input: string): string {
    if (!input) return '';
    let s = input.replace(/[^0-9+]/g, '');
    s = s.replace(/^\+/, '');
    if (s.startsWith('54')) s = s.slice(2);
    s = s.replace(/^0+/, '');
    s = s.replace(/^15/, '');
    const result = `54${s}`;
    // Validar longitud (por ejemplo, +54 y 10 dígitos para móvil)
    if (result.length < 12 || result.length > 13) {
      throw new Error('Número de teléfono inválido');
    }
    return result;
  }

  elapsedFrom(ts: number | null | undefined): string {
    if (!ts) return '';
    const ms = Date.now() - Number(ts);
    if (ms < 0) return '0m';
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
  }

  buildQRText(client: Client, space: Space): string {
    return JSON.stringify({
      t: 'autolavado-ticket',
      client: {
        id: client.id,
        code: client.code,
        name: client.name,
        phone: `+${client.phoneIntl}`
      },
      space: {
        key: space.key,
        subsuelo: space.subsueloId
      },
      start: space.startTime!
    });
  }

  buildWhatsAppLink(client: Client, space: Space): string {
    const phone = client.phoneIntl;
    const msg = `¡Hola ${client.name}! 🚗\n\nDatos de tu estadía en el autolavado:\n• Código cliente: ${client.code} 🔑\n• Espacio: ${space.key} (${space.subsueloId}) 📍\n• Ingreso: ${new Date(space.startTime!).toLocaleString()} 🕒\n\nMostrá este QR al personal. 📱`;
    const text = encodeURIComponent(msg);
    return `whatsapp://send?phone=${phone}&text=${text}`;
  }

  clearAllData(): void {
    localStorage.removeItem(this.LS_KEYS.subs);
    localStorage.removeItem(this.LS_KEYS.spaces);
    localStorage.removeItem(this.LS_KEYS.clients);

    this.subsuelosSubject.next([]);
    this.spacesSubject.next({});
    this.clientsSubject.next({});
    this.currentSubIdSubject.next(null);
    this.searchTermSubject.next('');

    this.ensureAtLeastOneSubsuelo();
  }
}
