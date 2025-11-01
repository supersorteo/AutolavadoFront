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
  client: Client | null;
  startTime: number | null;
   displayName?: string;
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
  private loadAll0(): void {
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

  loadAll1(): void {
  try {
    const subsuelos = JSON.parse(localStorage.getItem(this.LS_KEYS.subs) || '[]') as Subsuelo[];
    const spaces = JSON.parse(localStorage.getItem(this.LS_KEYS.spaces) || '{}') as { [key: string]: Space };
    const clients = JSON.parse(localStorage.getItem(this.LS_KEYS.clients) || '{}') as { [key: string]: Client };

    // Resolver clientes completos para espacios ocupados
    Object.values(spaces).forEach(space => {
      if (space.occupied && space.clientId && clients[space.clientId]) {
        space.client = clients[space.clientId];
      }
    });

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

loadAll(): void {
  try {
    const subsuelos = JSON.parse(localStorage.getItem(this.LS_KEYS.subs) || '[]') as Subsuelo[];
    const spaces = JSON.parse(localStorage.getItem(this.LS_KEYS.spaces) || '{}') as { [key: string]: Space };
    const clients = JSON.parse(localStorage.getItem(this.LS_KEYS.clients) || '{}') as { [key: string]: Client };

    // Poblar space.client para espacios ocupados
    Object.values(spaces).forEach(space => {
      if (space.occupied && space.clientId && clients[space.clientId]) {
        space.client = clients[space.clientId];
      } else {
        space.client = null;
      }
    });

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

  addSubsuelo0(): void {
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


  addSubsuelo(): void {
  const subsuelos = this.subsuelosSubject.value;
  // Calcular máximo ID existente
  let maxNum = 0;
  subsuelos.forEach(sub => {
    const numMatch = sub.id.match(/^SUB(\d+)$/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  const nextNum = maxNum + 1;
  const id = `SUB${nextNum}`;
  const newSub: Subsuelo = { id, label: `Subsuelo ${nextNum}` };
  const spaces = this.spacesSubject.value;

  this.createSpacesForSubsuelo(id, 5, spaces);

  this.subsuelosSubject.next([...subsuelos, newSub]);
  this.spacesSubject.next({ ...spaces });
  this.currentSubIdSubject.next(id);
  this.saveAll();

  // Logging para depurar
  console.log('Nuevo subsuelo creado:', newSub);
  console.log('Subsuelos actuales:', this.subsuelosSubject.value);
}

  // Gestión de espacios
 /* private createSpacesForSubsuelo(subsueloId: string, count: number, spaces: { [key: string]: Space }): void {
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
  }*/


private createSpacesForSubsuelo(subsueloId: string, count: number, spaces: { [key: string]: Space }): void {
  for (let i = 1; i <= count; i++) {
    const key = this.formatSpaceCode(subsueloId, i);
    spaces[key] = {
      key,
      subsueloId,
      occupied: false,
      hold: false,
      clientId: null,
      startTime: null,
      client: null,
      displayName: `Nombre ${i}` // Por defecto 'Nombre'
    };
  }
}


  /*
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
  }*/



updateSubsuelo(id: string, newLabel: string): void {
  const subsuelos = this.subsuelosSubject.value;
  const index = subsuelos.findIndex(sub => sub.id === id);
  if (index === -1) throw new Error('Subsuelo no encontrado');

  subsuelos[index].label = newLabel.trim();
  this.subsuelosSubject.next([...subsuelos]);
  this.saveAll();
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
      startTime: null,
      client: null,
      displayName: `Nombre ${n}` // Por defecto 'Nombre'
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
  space.client = client; // Asignar objeto completo del cliente

  client.qrText = this.buildQRText(client, space);
  clients[id] = client;

  this.spacesSubject.next({ ...spaces });
  this.clientsSubject.next({ ...clients });
  this.saveAll();

  return client;
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

  private formatSpaceCode0(subId: string, idx: number): string {
    return `${subId}-${this.padNumber(idx)}`;
  }

  private formatSpaceCode(subId: string, idx: number): string {
  return `${subId}-${String(idx).padStart(3, '0')}`; // Mantiene numérico para agregar, pero permite edición libre
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


    deleteSpace(spaceKey: string): void {
    const spaces = this.spacesSubject.value;
    const space = spaces[spaceKey];
    if (!space) return;
    if (space.occupied) throw new Error('No se puede eliminar un espacio ocupado');


    delete spaces[spaceKey];
    this.spacesSubject.next({ ...spaces });
    this.saveAll();
  }

  deleteSubsuelo(subsueloId: string): void {
  const subsuelos = this.subsuelosSubject.value;
  const spaces = this.spacesSubject.value;

  // Verificar si hay espacios ocupados en el subsuelo
  const hasOccupiedSpaces = Object.values(spaces)
    .some(space => space.subsueloId === subsueloId && space.occupied);
  if (hasOccupiedSpaces) {
    throw new Error('No se puede eliminar el subsuelo porque tiene espacios ocupados');
  }

  // Verificar que no sea el último subsuelo
  if (subsuelos.length <= 1) {
    throw new Error('No se puede eliminar el único subsuelo');
  }

  // Eliminar todos los espacios del subsuelo
  Object.keys(spaces)
    .filter(key => spaces[key].subsueloId === subsueloId)
    .forEach(key => delete spaces[key]);

  // Eliminar el subsuelo
  const updatedSubsuelos = subsuelos.filter(sub => sub.id !== subsueloId);

  // Actualizar el subsuelo actual si era el eliminado
  const currentSubId = this.currentSubIdSubject.value;
  if (currentSubId === subsueloId) {
    this.currentSubIdSubject.next(updatedSubsuelos[0]?.id || null);
  }

  // Actualizar subjects
  this.subsuelosSubject.next(updatedSubsuelos);
  this.spacesSubject.next({ ...spaces });
  this.saveAll();
}

deleteSpacesFromCurrent(count: number): void {
  const currentSubId = this.currentSubIdSubject.value;
  if (!currentSubId) return;

  const spaces = this.spacesSubject.value;
  const subSpaces = Object.keys(spaces)
    .filter(key => spaces[key].subsueloId === currentSubId)
    .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));

  // Verificar que haya suficientes espacios para eliminar
  if (subSpaces.length < count) {
    throw new Error(`No hay suficientes espacios en ${currentSubId} para eliminar`);
  }

  /*
  if(subSpaces.length <=1 ){
    throw new Error('No se puede eliminar el único espacio del subsuelo')
  }*/


  // Verificar que los últimos 'count' espacios no estén ocupados ni reservados
  const spacesToDelete = subSpaces.slice(-count);
  const hasOccupiedOrHeld = spacesToDelete.some(key => spaces[key].occupied || spaces[key].hold);
  if (hasOccupiedOrHeld) {
    throw new Error('No se pueden eliminar espacios ocupados o reservados');
  }

  // Eliminar los espacios
  spacesToDelete.forEach(key => delete spaces[key]);

  // Actualizar spacesSubject y persistir
  this.spacesSubject.next({ ...spaces });
  this.saveAll();
}

editSpace0(spaceKey: string, newKey: string): void {
  const spaces = this.spacesSubject.value;
  const space = spaces[spaceKey];
  if (!space || space.occupied || space.hold) {
    throw new Error('No se puede editar un espacio ocupado o reservado');
  }

  if (spaces[newKey]) {
    throw new Error('La nueva clave ya existe');
  }

  space.key = newKey;
  delete spaces[spaceKey];
  spaces[newKey] = space;

  this.spacesSubject.next({ ...spaces });
  this.saveAll();
}

editSpace1(spaceKey: string, newKey: string): void {
  const spaces = this.spacesSubject.value;
  const space = spaces[spaceKey];
  if (!space || space.occupied || space.hold) {
    throw new Error('No se puede editar un espacio ocupado o reservado');
  }

  if (spaces[newKey]) {
    throw new Error('La nueva clave ya existe');
  }

  space.key = newKey;
  delete spaces[spaceKey];
  spaces[newKey] = space;

  this.spacesSubject.next({ ...spaces });
  this.saveAll();
}

editSpace2(oldKey: string, newKey: string, editedSpace: Space | null): void {
  if (!editedSpace) return;

  const spaces = this.spacesSubject.value;
  const space = spaces[oldKey];
  if (!space || space.occupied || space.hold) {
    throw new Error('No se puede editar un espacio ocupado o reservado');
  }

  // Validar unicidad solo si la clave cambió
  if (newKey !== oldKey && spaces[newKey]) {
    throw new Error('La nueva clave ya existe');
  }

  // Actualizar clave (si cambió)
  if (newKey !== oldKey) {
    space.key = newKey;
  }

  // Actualizar campos editables (excepto key)
  space.displayName = editedSpace.displayName || space.displayName;
  space.subsueloId = editedSpace.subsueloId || space.subsueloId;

  // Actualizar cliente si existe y se editó
  if (space.client && editedSpace.client) {
    space.client.name = editedSpace.client.name || space.client.name;
    space.client.notes = editedSpace.client.notes || space.client.notes;
    space.client.vehicle = editedSpace.client.vehicle || space.client.vehicle;
    space.client.plate = editedSpace.client.plate || space.client.plate;
    space.client.phoneIntl = editedSpace.client.phoneIntl || space.client.phoneIntl;
    space.client.phoneRaw = editedSpace.client.phoneRaw || space.client.phoneRaw;
  }

  // Si la clave cambió, mover la entrada
  if (newKey !== oldKey) {
    delete spaces[oldKey];
    spaces[newKey] = space;
  }

  this.spacesSubject.next({ ...spaces });
  this.saveAll();
}

editSpace(oldKey: string, newKey: string, editedSpace: Space | null): void {
  if (!editedSpace) return;

  const spaces = this.spacesSubject.value;
  const space = spaces[oldKey];
  if (!space || space.hold) { // Solo bloquear si hold es true (reservado)
    throw new Error('No se puede editar un espacio reservado');
  }

  // Validar unicidad solo si la clave cambió
  if (newKey !== oldKey && spaces[newKey]) {
    throw new Error('La nueva clave ya existe');
  }

  // Actualizar clave (si cambió)
  if (newKey !== oldKey) {
    space.key = newKey;
  }

  // Actualizar campos editables (excepto key)
  space.displayName = editedSpace.displayName || space.displayName;
  space.subsueloId = editedSpace.subsueloId || space.subsueloId;

  // Actualizar cliente si existe y se editó
  if (space.client && editedSpace.client) {
    space.client.name = editedSpace.client.name || space.client.name;
    space.client.notes = editedSpace.client.notes || space.client.notes;
    space.client.vehicle = editedSpace.client.vehicle || space.client.vehicle;
    space.client.plate = editedSpace.client.plate || space.client.plate;
    space.client.phoneIntl = editedSpace.client.phoneIntl || space.client.phoneIntl;
    space.client.phoneRaw = editedSpace.client.phoneRaw || space.client.phoneRaw;
  }

  // Si la clave cambió, mover la entrada
  if (newKey !== oldKey) {
    delete spaces[oldKey];
    spaces[newKey] = space;
  }

  this.spacesSubject.next({ ...spaces });
  this.saveAll();
}


transferSpace0(spaceKey: string, newSubsueloId: string): void {
  const spaces = this.spacesSubject.value;
  const clients = this.clientsSubject.value;
  const space = spaces[spaceKey];
  if (!space) throw new Error('Espacio no encontrado');
  if (space.occupied) throw new Error('No se puede transferir un espacio ocupado');
  if (!this.subsuelosSubject.value.some(sub => sub.id === newSubsueloId)) throw new Error('Subsuelo destino no existe');

  // Verificar unicidad de clave en destino
  if (Object.values(spaces).some(s => s.subsueloId === newSubsueloId && s.key === spaceKey)) {
    throw new Error('La clave ya existe en el subsuelo destino');
  }

  // Actualizar subsueloId
  space.subsueloId = newSubsueloId;

  // Actualizar cliente si existe
  if (space.client) {
    space.client.spaceKey = spaceKey; // Mantener spaceKey igual
  }

  this.spacesSubject.next({ ...spaces });
  this.clientsSubject.next({ ...clients });
  this.saveAll();
}

transferSpace(spaceKey: string, newSubsueloId: string): void {
  const spaces = this.spacesSubject.value;
  const clients = this.clientsSubject.value;
  const space = spaces[spaceKey];
  if (!space) throw new Error('Espacio no encontrado');
  if (space.occupied) throw new Error('No se puede transferir un espacio ocupado');
  if (!this.subsuelosSubject.value.some(sub => sub.id === newSubsueloId)) throw new Error('Subsuelo destino no existe');

  // Verificar unicidad de clave en destino
  if (Object.values(spaces).some(s => s.subsueloId === newSubsueloId && s.key === spaceKey)) {
    throw new Error('La clave ya existe en el subsuelo destino');
  }

  // Verificar coincidencia de displayName en destino
  const destinationSpaces = Object.values(spaces).filter(s => s.subsueloId === newSubsueloId);
  const originalDisplayName = space.displayName || space.key;
  const nameExists = destinationSpaces.some(s => (s.displayName || s.key) === originalDisplayName);
  if (nameExists) {
    throw new Error('Ya existe un space con ese nombre. Cambie el nombre para transferirlo.');
  }

  // Actualizar subsueloId
  space.subsueloId = newSubsueloId;

  // Actualizar cliente si existe
  if (space.client) {
    space.client.spaceKey = spaceKey;
  }

  this.spacesSubject.next({ ...spaces });
  this.clientsSubject.next({ ...clients });
  this.saveAll();
}

}
