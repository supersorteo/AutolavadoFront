import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Report } from '../models/autolavado.model';

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

  //API_BASE = 'http://localhost:8080/api'
   private API_BASE = 'https://talented-connection-production.up.railway.app/api'

  // Observables públicos
  public subsuelos$ = this.subsuelosSubject.asObservable();
  public spaces$ = this.spacesSubject.asObservable();
  public clients$ = this.clientsSubject.asObservable();
  public currentSubId$ = this.currentSubIdSubject.asObservable();


public filteredClients$ = combineLatest([this.clients$, this.searchTermSubject, this.spaces$]).pipe(
  map(([clients, searchTerm, spaces]) => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = Object.values(clients).filter(client => {
      const space = spaces[client.spaceKey];
      if (!space || !space.occupied) return false;
      if (!term) return true;
      return (
        (client.name || '').toLowerCase().includes(term) ||
        (client.code || '').toLowerCase().includes(term) ||
        (client.spaceKey || '').toLowerCase().includes(term) ||
        (client.phoneIntl || '').toLowerCase().includes(term) ||
        (client.vehicle || '').toLowerCase().includes(term)
      );
    }).map(client => { // Enriquecer con displayName
      const space = spaces[client.spaceKey];
      return {
        ...client,
        spaceDisplayName: space ? (space.displayName || space.key) : client.spaceKey
      } as any; // Type assertion para evitar error TS
    });
    console.log('Filtered Clients enriquecidos:', filtered); // Logging para depurar
    return filtered;
  })
);

  constructor(private http: HttpClient) {
    this.loadAll();
    this.ensureAtLeastOneSubsuelo();
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



private saveToLocalStorage(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`Sync local for ${key}`);
  } catch (error) {
    console.error('Error saving to localStorage', error);
  }
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

  buildWhatsAppLink1(client: Client, space: Space): string {
    const phone = client.phoneIntl;
    const msg = `¡Hola ${client.name}! 🚗\n\nDatos de tu estadía en el autolavado:\n• Código cliente: ${client.code} 🔑\n• Espacio: ${space.key} (${space.subsueloId}) 📍\n• Ingreso: ${new Date(space.startTime!).toLocaleString()} 🕒\n\nMostrá este QR al personal. 📱`;
    const text = encodeURIComponent(msg);
    return `whatsapp://send?phone=${phone}&text=${text}`;
  }

  buildWhatsAppLink00(client: Client, space: Space): string {
  const phone = client.phoneIntl; // Debe estar en formato 549XXXXXXXXXX
  const msg = `¡Hola ${client.name}! 🚗\n\nDatos de tu estadía en excellsior:\n• Código cliente: ${client.code} 🔑\n• Espacio: ${space.key} (${space.subsueloId}) 📍\n• Ingreso: ${new Date(space.startTime!).toLocaleString()} 🕒\n\nMostrá este QR al personal. 📱`;
  const text = encodeURIComponent(msg);

  // Usar wa.me en lugar de whatsapp://send
  return `https://wa.me/${phone}?text=${text}`;
}

buildWhatsAppLink(client: Client, space: Space): string {
  const phone = client.phoneIntl;
  const message = this.buildWhatsAppMessage(client, space);
  const encoded = encodeURIComponent(message);
 // return `https://wa.me/${client.phoneIntl}?text=${encoded}`;
  return `whatsapp://send?phone=${phone}&text=${encoded}`;
}

buildWhatsAppLink2(client: Client): string {
  return `https://wa.me/${client.phoneIntl}`;
}


buildWhatsAppMessage(client: Client, space: Space): string {
 //return `Hola ${client.name}!\n\nDatos de tu estadía en el autolavado:\n- Código cliente: ${client.code}\n- Espacio: ${space.key} (${space.subsueloId})\n- Ingreso: ${new Date(space.startTime!).toLocaleString()}\n\nMostrá este QR al personal.`;
 return `¡Hola ${client.name}! 🚗\n\nDatos de tu estadía en exellssior:\n• Código cliente: ${client.code} estarás ocupando el🔑\n• Espacio: ${space.displayName} ubicado en el subsuelo:(${space.displayName}) 📍\n• Ingreso: ${new Date(space.startTime!).toLocaleString()} 🕒\n\nMostrá este QR al personal. 📱`;


}





// En autolavado.service.ts
buildWhatsAppLink0(client: Client, space: Space): string {
  // Limpiar el número: solo dígitos
  const cleanPhone = client.phoneIntl.replace(/\D/g, '');

  // Verificar que tenga el formato correcto (54 + código de área + número)
  if (!cleanPhone.startsWith('54')) {
    console.error('Número sin código de país correcto:', cleanPhone);
  }

  // Mensaje sin emojis para mayor compatibilidad
  const msg = `Hola ${client.name}!

Datos de tu estadia en el autolavado:
- Codigo cliente: ${client.code}
- Espacio: ${space.key} (${space.subsueloId})
- Ingreso: ${new Date(space.startTime!).toLocaleString('es-AR')}

Mostra este QR al personal.`;

  // Codificar mensaje
  const text = encodeURIComponent(msg);

  // Usar wa.me que funciona en web y móvil
  return `https://wa.me/${cleanPhone}?text=${text}`;
}

// Método mejorado para formatear teléfono argentino
toPhoneAR0(phone: string): string {
  // Remover todos los caracteres no numéricos
  const digits = phone.replace(/\D/g, '');

  // Remover el 0 y 15 si están al inicio
  let cleaned = digits;
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith('15')) {
    cleaned = cleaned.substring(2);
  }

  // Agregar código de país 54
  return `54${cleaned}`;
}

  toPhoneAR1(input: string): string {
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

  toPhoneAR(input: string): string {
  if (!input) return '';

  // Eliminar cualquier carácter no numérico
  let s = input.replace(/[^0-9]/g, '');

  // Quitar prefijos comunes
  if (s.startsWith('54')) s = s.slice(2); // quitar código país si está
  if (s.startsWith('0')) s = s.replace(/^0+/, ''); // quitar ceros iniciales
  if (s.startsWith('15')) s = s.slice(2); // quitar 15 si está

  // Asegurar que el número comience con 9 (móvil)
  if (!s.startsWith('9')) {
    s = '9' + s;
  }

  const result = `54${s}`;

  // Validar longitud (debería ser 13 dígitos: 54 + 9 + 10)
  if (result.length !== 13) {
    throw new Error('Número de teléfono inválido para WhatsApp');
  }

  return result;
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





generateReportsListHtml(): string { // Sin parámetro; fetch interno
  const reportHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lista de Reportes - Exellsior</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
  <style>
    body { font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 20px; }
    h1 { color: #0ea5e9; text-align: center; }
    .table-dark { --bs-table-bg: #1e293b; --bs-table-striped-bg: #2d446a; }
    .progress { height: 25px; background: #374151; }
    .progress-bar { height: 100%; line-height: 25px; text-align: center; font-size: 0.875em; }
    .no-data { text-align: center; color: #94a3b8; padding: 40px; }
    .loading { text-align: center; color: #94a3b8; padding: 40px; }
  </style>
</head>
<body>
  <h1>Lista de Reportes - Exellsior</h1>
  <div class="container-fluid px-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="h4 mb-0">Lista de Reportes</h2>
      <button onclick="loadReports()" class="btn btn-outline-primary btn-sm">Recargar</button>
    </div>
    <div id="reportsTableContainer" class="loading">Cargando reportes...</div>
  </div>
  <script>

    const API_BASE1 = 'http://localhost:8080/api';

    const API_BASE = 'https://talented-connection-production.up.railway.app/api'

    function loadReports() {
      document.getElementById('reportsTableContainer').innerHTML = '<div class="loading">Cargando...</div>';
      fetch(\`\${API_BASE}/reports\`)
        .then(response => response.json())
        .then(reports => {
          if (reports.length === 0) {
            document.getElementById('reportsTableContainer').innerHTML = '<div class="no-data">No hay reportes disponibles</div>';
            return;
          }
          const tbody = reports.map(report => \`
            <tr>
              <td>\${report.id}</td>
              <td>\${new Date(report.timestamp).toLocaleString()}</td>
              <td>\${report.totalSpaces}</td>
              <td><span class="badge bg-danger">\${report.occupiedSpaces}</span></td>
              <td><span class="badge bg-success">\${report.freeSpaces}</span></td>
              <td>
                <div class="progress">
                  <div class="progress-bar bg-\${report.occupancyRate < 50 ? 'success' : report.occupancyRate < 80 ? 'warning' : 'danger'}" style="width: \${report.occupancyRate}%">
                    \${report.occupancyRate}%
                  </div>
                </div>
              </td>
              <td>
                <button onclick="viewReport(\${report.id})" class="btn btn-sm btn-outline-primary me-1">Ver</button>
                <button onclick="deleteReport(\${report.id})" class="btn btn-sm btn-outline-danger">Eliminar</button>
              </td>
            </tr>
          \`).join('');
          document.getElementById('reportsTableContainer').innerHTML = \`
            <div class="table-responsive">
              <table class="table table-dark table-striped">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Total Espacios</th>
                    <th>Ocupados</th>
                    <th>Libres</th>
                    <th>% Ocupación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>\${tbody}</tbody>
              </table>
            </div>
          \`;
        })
        .catch(error => {
          document.getElementById('reportsTableContainer').innerHTML = '<div class="no-data">Error al cargar: ' + error + '</div>';
        });
    }

    // Cargar al abrir tab
    window.onload = loadReports;

    function viewReport(id) {
      fetch(\`\${API_BASE}/reports/\${id}\`)
        .then(response => response.json())
        .then(report => {
          const detailHtml = 'HTML detallado del reporte ID ' + report.id; // Implementa como generateReport
          const blob = new Blob([detailHtml], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        })
        .catch(error => alert('Error: ' + error));
    }

    function deleteReport(id) {
      if (confirm('¿Eliminar reporte ID ' + id + '?')) {
        fetch(\`\${API_BASE}/reports/\${id}\`, { method: 'DELETE' })
          .then(response => {
            if (response.ok) {
              loadReports(); // Refetch sin reload
            } else {
              alert('Error al eliminar');
            }
          })
          .catch(error => alert('Error: ' + error));
      }
    }
  </script>
</body>
</html>`;
  return reportHtml;
}



generateReportDetailHtml0(report: Report): string {
  // Parse JSON strings
  const subsueloStats = JSON.parse(report.subsueloStats || '[]');
  const timeStats = JSON.parse(report.timeStats || '{}');
  const filteredClients = JSON.parse(report.filteredClients || '[]');

  const reportHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Detalle Reporte ID ${report.id} - Exellsior</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
  <style>
    body { font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 20px; }
    h1 { color: #0ea5e9; text-align: center; }
    .section { margin-bottom: 30px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .stat-card { background: #1e293b; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #0ea5e9; }
    .stat-number { font-size: 2em; font-weight: bold; color: #0ea5e9; }
    table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
    th { background: #16213e; font-weight: bold; color: #0ea5e9; }
    tr:hover { background: #2d446a; }
    .progress { background: #374151; border-radius: 4px; height: 20px; overflow: hidden; }
    .progress-bar { height: 100%; line-height: 20px; text-align: center; font-size: 0.875em; }
    .time-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
    .time-card { background: #1e293b; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #0ea5e9; }
    .time-number { font-size: 1.5em; font-weight: bold; }
    .no-data { text-align: center; color: #94a3b8; padding: 40px; }
  </style>
</head>
<body>
  <h1>Detalle Reporte ID ${report.id} - ${new Date(report.timestamp).toLocaleString()}</h1>

  <div class="container-fluid px-4">
    <!-- Resumen General -->
    <div class="section">
      <h2>Resumen General</h2>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-number">${report.totalSpaces}</div>
          <div>Total Espacios</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" style="color: #10b981;">${report.occupiedSpaces}</div>
          <div>Ocupados</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" style="color: #3b82f6;">${report.freeSpaces}</div>
          <div>Libres</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" style="color: #f59e0b;">${report.occupancyRate}%</div>
          <div>Ocupación</div>
        </div>
      </div>
    </div>

    <!-- Detalle por Subsuelo -->
    <div class="section">
      <h2>Detalle por Subsuelo</h2>
      <table class="table table-dark table-striped">
        <thead>
          <tr>
            <th>Subsuelo</th>
            <th>Total</th>
            <th>Ocupados</th>
            <th>Libres</th>
            <th>% Ocupación</th>
          </tr>
        </thead>
        <tbody>
          ${subsueloStats.length > 0 ? subsueloStats.map((stat: { label: any; total: any; occupied: any; free: any; occupancyRate: number; }) => `
            <tr>
              <td>${stat.label}</td>
              <td>${stat.total}</td>
              <td><span class="badge bg-danger">${stat.occupied}</span></td>
              <td><span class="badge bg-success">${stat.free}</span></td>
              <td>
                <div class="progress">
                  <div class="progress-bar bg-${stat.occupancyRate < 50 ? 'success' : stat.occupancyRate < 80 ? 'warning' : 'danger'}" style="width: ${stat.occupancyRate}%">
                    ${stat.occupancyRate}%
                  </div>
                </div>
              </td>
            </tr>
          `).join('') : '<tr><td colspan="5" class="no-data">No hay datos de subsuelos</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Distribución por Tiempo -->
    <div class="section">
      <h2>Distribución por Tiempo</h2>
      <div class="time-stats">
        <div class="time-card">
          <div class="time-number" style="color: #10b981;">${timeStats.under1h}</div>
          <div>Menos de 1h</div>
        </div>
        <div class="time-card">
          <div class="time-number" style="color: #f59e0b;">${timeStats.between1h3h}</div>
          <div>1h - 3h</div>
        </div>
        <div class="time-card">
          <div class="time-number" style="color: #ef4444;">${timeStats.over3h}</div>
          <div>Más de 3h</div>
        </div>
      </div>
    </div>

    <!-- Clientes Activos -->
    <div class="section">
      <h2>Clientes Activos (${filteredClients.length})</h2>
      ${filteredClients.length > 0 ? `
        <table class="table table-dark table-striped">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Espacio</th>
              <th>Teléfono</th>
              <th>Vehículo</th>
              <th>Tiempo</th>
            </tr>
          </thead>
          <tbody>
            ${filteredClients.map((client: { code: any; name: any; spaceDisplayName: any; phoneIntl: any; vehicle: any; elapsedTime: any; }) => `
              <tr>
                <td><span style="background: #1e293b; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${client.code}</span></td>
                <td>${client.name}</td>
                <td style="color: #3b82f6;">${client.spaceDisplayName}</td>
                <td>+${client.phoneIntl}</td>
                <td>${client.vehicle || '-'}</td>
                <td style="color: #f59e0b;">${client.elapsedTime || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<div class="no-data">No hay clientes en este reporte</div>'}
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>
  `;
  return reportHtml;
}

generateReportDetailHtml(report: Report): string {
  // Parsear los JSON que vienen como string desde la base de datos
  const subsueloStats = JSON.parse(report.subsueloStats || '[]');
  const timeStats = JSON.parse(report.timeStats || '{}');
  let filteredClients = [];
  try {
    filteredClients = JSON.parse(report.filteredClients || '[]');
  } catch (e) {
    console.error('Error parsing filteredClients', e);
  }

  // Calcular el tiempo transcurrido para cada cliente usando qrText.start
  const now = Date.now();
  filteredClients = filteredClients.map((client: any) => {
    let elapsedTime = 'N/A';
    try {
      const qrData = JSON.parse(client.qrText || '{}');
      const start = qrData.start || 0;
      if (start > 0) {
        const ms = now - start;
        const mins = Math.floor(ms / 60000);
        const hours = Math.floor(mins / 60);
        const min = mins % 60;
        elapsedTime = hours > 0 ? `${hours}h ${min}m` : `${min}m`;
      }
    } catch (e) {
      // Si falla el parse, deja N/A
    }
    return { ...client, elapsedTime };
  });

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Detalle Reporte ID ${report.id} - Exellsior</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 20px; }
    h1 { color: #0ea5e9; text-align: center; }
    .section { margin-bottom: 30px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .stat-card { background: #1e293b; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #0ea5e9; }
    .stat-number { font-size: 2em; font-weight: bold; color: #0ea5e9; }
    table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
    th { background: #16213e; font-weight: bold; color: #0ea5e9; }
    tr:hover { background: #2d446a; }
    .progress { background: #374151; border-radius: 4px; height: 20px; overflow: hidden; }
    .progress-bar { height: 100%; line-height: 20px; text-align: center; font-size: 0.875em; }
    .time-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
    .time-card { background: #1e293b; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #0ea5e9; }
    .time-number { font-size: 1.5em; font-weight: bold; }
    .no-data { text-align: center; color: #94a3b8; padding: 40px; }
  </style>
</head>
<body>
  <h1>Detalle Reporte ID ${report.id} - ${new Date(report.timestamp).toLocaleString()}</h1>

  <div class="container-fluid px-4">
    <!-- Resumen General -->
    <div class="section">
      <h2>Resumen General</h2>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-number">${report.totalSpaces}</div>
          <div>Total Espacios</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" style="color: #10b981;">${report.occupiedSpaces}</div>
          <div>Ocupados</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" style="color: #3b82f6;">${report.freeSpaces}</div>
          <div>Libres</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" style="color: #f59e0b;">${report.occupancyRate}%</div>
          <div>Ocupación</div>
        </div>
      </div>
    </div>

    <!-- Detalle por Subsuelo -->
    <div class="section">
      <h2>Detalle por Subsuelo</h2>
      <table class="table table-dark table-striped">
        <thead>
          <tr>
            <th>Subsuelo</th>
            <th>Total</th>
            <th>Ocupados</th>
            <th>Libres</th>
            <th>% Ocupación</th>
          </tr>
        </thead>
        <tbody>
          ${subsueloStats.length > 0 ? subsueloStats.map((stat: any) => `
            <tr>
              <td>${stat.label}</td>
              <td>${stat.total}</td>
              <td><span class="badge bg-danger">${stat.occupied}</span></td>
              <td><span class="badge bg-success">${stat.free}</span></td>
              <td>
                <div class="progress">
                  <div class="progress-bar bg-${stat.occupancyRate < 50 ? 'success' : stat.occupancyRate < 80 ? 'warning' : 'danger'}" style="width: ${stat.occupancyRate}%">
                    ${stat.occupancyRate}%
                  </div>
                </div>
              </td>
            </tr>
          `).join('') : '<tr><td colspan="5" class="no-data">No hay datos de subsuelos</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Distribución por Tiempo -->
    <div class="section">
      <h2>Distribución por Tiempo</h2>
      <div class="time-stats">
        <div class="time-card">
          <div class="time-number" style="color: #10b981;">${timeStats.under1h || 0}</div>
          <div>Menos de 1h</div>
        </div>
        <div class="time-card">
          <div class="time-number" style="color: #f59e0b;">${timeStats.between1h3h || 0}</div>
          <div>1h - 3h</div>
        </div>
        <div class="time-card">
          <div class="time-number" style="color: #ef4444;">${timeStats.over3h || 0}</div>
          <div>Más de 3h</div>
        </div>
      </div>
    </div>

    <!-- Clientes Activos -->
    <div class="section">
      <h2>Clientes Activos (${filteredClients.length})</h2>
      ${filteredClients.length > 0 ? `
        <table class="table table-dark table-striped">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Espacio</th>
              <th>Teléfono</th>
              <th>Vehículo</th>
              <th>Tiempo</th>
            </tr>
          </thead>
          <tbody>
            ${filteredClients.map((client: any) => `
              <tr>
                <td><span style="background: #1e293b; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${client.code}</span></td>
                <td>${client.name}</td>
                <td style="color: #3b82f6;">${client.spaceDisplayName || client.spaceKey}</td>
                <td>+${client.phoneIntl}</td>
                <td>${client.vehicle || '-'}</td>
                <td style="color: #f59e0b; font-weight: bold;">${client.elapsedTime}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<div class="no-data">No hay clientes en este reporte</div>'}
    </div>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>
  `;
}


}
