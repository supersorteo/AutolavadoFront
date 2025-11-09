import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Subject, takeUntil, combineLatest, BehaviorSubject } from 'rxjs';
import { Client, Space, Subsuelo } from '../../models/autolavado.model';
import { AutolavadoService } from '../../services/autolavado.service';
import { QrService } from '../../services/qr.service';

declare var bootstrap: any;

@Component({
  selector: 'app-spaces',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl:'./spaces.component.html',
  styleUrls: ['./spaces.component.scss']
})

export class SpacesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  @ViewChild('occQRElm', { static: false }) occQRContainer!: ElementRef<HTMLDivElement>;
  private searchTermSubject = new BehaviorSubject<string>('');
  newSpaceKey = '';
  selectedNewSubsuelo = '';
  subsuelos: Subsuelo[] = [];
  spaces: { [key: string]: Space } = {};
  clients: { [key: string]: Client } = {};
  currentSubId: string | null = null;
  currentSubTitle = 'Espacios';
  filteredSpaces: Space[] = [];
  searchTerm = '';
  addSpacesCount = 5;

  //editedSpace: any = {}; // Nueva propiedad para datos del espacio editado
  editedSpace: Space | null = null;
  currentPage: number = 1;
  itemsPerPage: number = 14;

  // Modal data
  selectedSpaceKey = '';
  selectedSpace: Space | null = null;
  selectedClient: Client | null = null;
  showQR = false;
  showOccupiedQR = false;
  qrCaption = '';
  whatsappLink = '';

  clientForm: FormGroup;
  editedSubsueloLabel = '';

  whatsappMessage: string = '';

  showWhatsAppModal: boolean = false;

  hasCopiedMessage: boolean = false;

  showWhatsAppModalOccupied = false;
  whatsappMessageOccupied = '';
  hasCopiedMessageOccupied = false;

  constructor(
    private autolavadoService: AutolavadoService,
    private qrService: QrService,
    private fb: FormBuilder,
     private cdr: ChangeDetectorRef
  ) {
    this.clientForm = this.fb.group({
      name: ['', Validators.required],
     // phone: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{8,10}$/)]],
      vehicle: [''],
      plate: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    combineLatest([
      this.autolavadoService.subsuelos$,
      this.autolavadoService.spaces$,
      this.autolavadoService.clients$,
      this.autolavadoService.currentSubId$,
      this.searchTermSubject
    ]).pipe(takeUntil(this.destroy$))
    .subscribe(([subsuelos, spaces, clients, currentSubId]) => {
      this.subsuelos = subsuelos;
      this.spaces = spaces;
      this.clients = clients;
      this.currentSubId = currentSubId;
      this.updateCurrentSubTitle();
      this.filterSpaces();
    });

    // Suscripción reactiva a searchTerm
  this.searchTermSubject.subscribe(() => {
    this.currentPage = 1;
    this.filterSpaces();
  });

    // Timer para actualizar tiempos transcurridos
    setInterval(() => {
      // Forzar actualización de la vista cada minuto
      this.cdr.detectChanges();
    }, 60000);





  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateCurrentSubTitle(): void {
    const sub = this.subsuelos.find(s => s.id === this.currentSubId);
    this.currentSubTitle = `Espacios — ${sub?.label || this.currentSubId || ''}`;
  }





private filterSpaces(): void {
  if (!this.currentSubId) {
    this.filteredSpaces = [];
    return;
  }

  let allSpaces = Object.values(this.spaces)
    .filter(sp => sp.subsueloId === this.currentSubId);

  // Filtrar solo por displayName y key si searchTerm existe
  const currentSearchTerm = this.searchTermSubject.value.trim();
  if (currentSearchTerm) {
    const term = currentSearchTerm.toLowerCase();
    allSpaces = allSpaces.filter(space => {
      return (
        (space.displayName || '').toLowerCase().includes(term) ||
        space.key.toLowerCase().includes(term)
      );
    });
  }

  // Ordenar alfabéticamente por key
  allSpaces = allSpaces.sort((a, b) => a.key.localeCompare(b.key));

  // Paginación
  const startIndex = (this.currentPage - 1) * this.itemsPerPage;
  const endIndex = startIndex + this.itemsPerPage;
  this.filteredSpaces = allSpaces.slice(startIndex, endIndex);
}



  onSubsueloChange(): void {
    if (this.currentSubId) {
      this.autolavadoService.setCurrentSubsuelo(this.currentSubId);
    }
  }

  addSubsuelo(): void {
    this.autolavadoService.addSubsuelo();
  }



editSubsuelo(): void {
  if (this.currentSubId) {
    const currentSub = this.subsuelos.find(sub => sub.id === this.currentSubId);
    this.editedSubsueloLabel = currentSub?.label || '';
    this.showModal('editSubsueloModal');
  }
}

confirmEditSubsuelo(): void {
  if (this.editedSubsueloLabel.trim() && this.currentSubId) {
    try {
      this.autolavadoService.updateSubsuelo(this.currentSubId, this.editedSubsueloLabel);
      this.filterSpaces(); // Actualizar vista
      this.cdr.detectChanges();
      alert('Subsuelo actualizado exitosamente!');
    } catch (error) {
      alert('Error al actualizar subsuelo: ' + error);
    }
  }
  this.hideModal('editSubsueloModal');
}


  addSpaces(): void {
    this.autolavadoService.addSpacesToCurrent(this.addSpacesCount);
  }




onSearch(): void {

this.searchTermSubject.next(this.searchTerm); // Actualizar subject para reactividad
  this.currentPage = 1;
}

  isSearchHit(space: Space): boolean {
    if (!this.searchTerm.trim()) return false;

    const term = this.searchTerm.trim().toLowerCase();
    const client = this.clients[space.clientId || ''];

    return space.key.toLowerCase().includes(term) ||
           (client && (
             (client.name || '').toLowerCase().includes(term) ||
             (client.phoneRaw || '').replace(/\D/g, '').includes(term.replace(/\D/g, '')) ||
             (client.vehicle || '').toLowerCase().includes(term) ||
             (client.plate || '').toLowerCase().includes(term)
           ));
  }



  getElapsed(startTime: number | null | undefined): string {
  return this.autolavadoService.elapsedFrom(startTime);
}

getFormattedDate(timestamp: number | null | undefined): string {
  return timestamp ? new Date(timestamp).toLocaleString() : '-';
}

  onSpaceClick(space: Space): void {
    this.selectedSpaceKey = space.key;
    this.selectedSpace = space;
    this.showQR = false;
    this.showOccupiedQR = false;

    if (space.occupied) {
      // Mostrar modal de ocupado
      this.selectedClient = this.clients[space.clientId!];
      if (this.selectedClient) {
        this.whatsappLink = this.autolavadoService.buildWhatsAppLink(this.selectedClient, space);
        this.qrCaption = `${this.selectedClient.name} — ${this.selectedClient.code}`;
      }
      this.showModal('occupiedModal');
    } else {
      // Mostrar modal de cliente
      this.clientForm.reset();
      this.whatsappLink = '';
      this.showModal('clientModal');
    }
  }



/*saveClient(): void {
  if (this.clientForm.invalid) {
    alert('Por favor completa todos los campos obligatorios.');
    return;
  }

  try {
    const client = this.autolavadoService.saveClient(this.clientForm.value, this.selectedSpaceKey);

    console.log('Número WhatsApp:', client.phoneIntl);
    console.log('Link WhatsApp:', this.whatsappLink);

    const space = this.spaces[this.selectedSpaceKey];
    this.whatsappLink = this.autolavadoService.buildWhatsAppLink(client, space);
    this.qrCaption = `${client.name} — ${client.code}`;

    this.showQR = true; // Setear showQR antes para renderizar div #qrcode

    // Generar QR con delay para asegurar DOM
    setTimeout(() => {
      this.qrService.generateQR('qrcode', client.qrText);
    }, 300); // Aumentar delay a 300ms para renderizado del modal

    alert('Cliente guardado exitosamente!');
  } catch (error) {
    alert('Error al guardar cliente: ' + error);
  }
}*/

saveClient(): void {
  if (this.clientForm.invalid) {
    alert('Por favor completa todos los campos obligatorios.');
    return;
  }

  try {
    const client = this.autolavadoService.saveClient(this.clientForm.value, this.selectedSpaceKey);
    const space = this.spaces[this.selectedSpaceKey];


    this.whatsappMessage = this.autolavadoService.buildWhatsAppMessage(client, space);
    this.whatsappLink = this.autolavadoService.buildWhatsAppLink(client, space);
    console.log('Número WhatsApp:', client.phoneIntl);
    console.log('Link WhatsApp:', this.whatsappLink);
    console.log('Mensaje para WhatsApp:', this.whatsappMessage);

    this.hasCopiedMessage = false;

    this.qrCaption = `${client.name} — ${client.code}`;
    this.showQR = true;

    setTimeout(() => {
      this.qrService.generateQR('qrcode', client.qrText);
    }, 300);

    alert('Cliente guardado exitosamente!');
  } catch (error) {
    alert('Error al guardar cliente: ' + error);
  }
}


   openWhatsApp0(): void {
    if (this.whatsappLink) {
      window.location.href = this.whatsappLink;
    }
  }

  openWhatsApp2(): void {
  if (this.whatsappLink) {
    // Descargar QR antes de abrir WhatsApp
    this.qrService.downloadQR('qrcode', `${this.qrCaption}.png`);
    window.open(this.whatsappLink, '_blank'); // Abrir en nueva pestaña para attach manual
  }
}

openWhatsApp(): void {
  this.showWhatsAppModal = true;
}

closeWhatsAppModal(): void {
  this.showWhatsAppModal = false;
}




copyMessage0(): void {
  navigator.clipboard.writeText(this.whatsappMessage).then(() => {
    this.hasCopiedMessage = true;
    alert('Mensaje copiado al portapapeles');
  });
}

copyMessage(): void {
  navigator.clipboard.writeText(this.whatsappMessage).then(() => {
    this.hasCopiedMessage = true;
    // Activar toast
    const toastEl = document.getElementById('copyToast');
    if (toastEl) {
      const toast = new bootstrap.Toast(toastEl);
      toast.show();
    }
  }).catch(err => {
    console.error('Error copying message:', err);
    // Fallback alert si clipboard falla
    alert('Error al copiar mensaje');
  });
}

launchWhatsApp(): void {
  if (this.whatsappLink) {
    this.qrService.downloadQR('qrcode', `${this.qrCaption}.png`);
    window.open(this.whatsappLink, '_blank');
    // this.closeWhatsAppModalOccupied();

    this.hasCopiedMessageOccupied = false
    // No cerramos el modal aquí
  }
}



launchWhatsAppOccupied(): void {
  if (this.whatsappLink) {
    //this.qrService.downloadQR('qrcode', `${this.qrCaption}.png`);
    window.open(this.whatsappLink, '_blank');


  }
}

 downloadQR(): void {
    this.qrService.downloadQR('qrcode', `cliente_${this.selectedSpaceKey, this.qrCaption}.png`);

  }

  downloadOccupiedQR(): void {
    this.qrService.downloadQR('occQRElm', `cliente_${this.selectedClient?.code, this.qrCaption || 'cliente'}.png`);
  }



// En tu componente .ts
openWhatsApp1(): void {
  if (this.whatsappLink) {
    // Primero descargar QR
    this.qrService.downloadQR('qrcode', `${this.qrCaption}.png`);

    // Pequeño delay para que termine la descarga
    setTimeout(() => {
      // Abrir WhatsApp en la misma ventana para mejor experiencia
      window.location.href = this.whatsappLink;

      // Alternativa: abrir en nueva pestaña
      // window.open(this.whatsappLink, '_blank', 'noopener,noreferrer');
    }, 100);
  } else {
    alert('No se pudo generar el link de WhatsApp');
  }
}

  toggleQR(): void {
    this.showQR = !this.showQR;
    if (this.showQR && this.clientForm.valid) {
      // Generar QR previo con datos actuales
      const tempClient = {
        id: 'temp',
        code: 'PREVIA',
        name: this.clientForm.value.name || '—',
        phone: `+${this.autolavadoService.toPhoneAR(this.clientForm.value.phone)}`
      };
      const fakeSpace = {
        key: this.selectedSpaceKey,
        subsuelo: this.selectedSpaceKey.split('-')[0]
      };
      const tempQR = JSON.stringify({
        t: 'autolavado-ticket',
        client: tempClient,
        space: fakeSpace,
        start: Date.now()
      });

      this.qrService.generateQR('qrcode', tempQR);
      this.qrCaption = `${tempClient.name} — ${tempClient.code}`;
    }
  }



toggleOccupiedQR(): void {
  this.showOccupiedQR = !this.showOccupiedQR;
  if (this.showOccupiedQR && this.selectedClient) {
    console.log('toggleOccupiedQR: Generando QR para', this.selectedClient.qrText);
    // Esperar renderizado completo del modal
    setTimeout(() => {
      const container = document.getElementById('occQRElm');
      if (container) {
        this.qrService.generateQR('occQRElm', this.selectedClient!.qrText);
        console.log('QR generado para occupied modal');
      } else {
        console.error('Container #occQRElm no encontrado - Modal no renderizado aún');
        // Reintento si no está listo
        setTimeout(() => {
          const retryContainer = document.getElementById('occQRElm');
          if (retryContainer) {
            this.qrService.generateQR('occQRElm', this.selectedClient!.qrText);
            console.log('QR generado en reintento');
          }
        }, 200);
      }
    }, 600); // Aumentar delay para modal Bootstrap
  }
}


  releaseSpace(): void {
    if (confirm(`¿Liberar espacio ${this.selectedSpaceKey}?`)) {
      this.autolavadoService.releaseSpace(this.selectedSpaceKey);
      this.hideModal('occupiedModal');
    }
  }

  private showModal(modalId: string): void {
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
  }

  private hideModal(modalId: string): void {
    const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
    if (modal) {
      modal.hide();
    }
  }



  resetData(): void {
  if (confirm('Esto borrará todos los datos de clientes.')) {
    this.autolavadoService.resetData();
    this.filterSpaces();
    this.cdr.detectChanges();
  }
}


 deleteSpace(): void {
    if (confirm(`¿Eliminar espacio ${this.selectedSpaceKey}?`)) {
      try {
        this.autolavadoService.deleteSpace(this.selectedSpaceKey);
        this.hideModal('clientModal');
      } catch (error) {
        alert('Error al eliminar espacio: ' + error);
      }
    }
  }




deleteSubsuelo(): void {
  if (this.currentSubId && confirm(`¿Eliminar subsuelo ${this.currentSubId}?`)) {
    try {
      this.autolavadoService.deleteSubsuelo(this.currentSubId);
    } catch (error) {
      alert('Error al eliminar subsuelo: ' + error);
    }
  }
}

deleteSpaces(): void {
  if (this.currentSubId && confirm(`¿Eliminar ${this.addSpacesCount} espacios del subsuelo ${this.currentSubId}?`)) {
    try {
      this.autolavadoService.deleteSpacesFromCurrent(this.addSpacesCount);
      this.filterSpaces();
      this.cdr.detectChanges();
      this.currentPage = 1;
    } catch (error) {
      alert('Error al eliminar espacios: ' + error);
    }
  }
}



get totalPages(): number {
  if (!this.currentSubId) return 1;
  const totalSpaces = Object.values(this.spaces)
    .filter(sp => sp.subsueloId === this.currentSubId)
    .length;
  return Math.ceil(totalSpaces / this.itemsPerPage);
}

goToPage(page: number): void {
  if (page >= 1 && page <= this.totalPages) {
    this.currentPage = page;
    this.filterSpaces();
    this.cdr.detectChanges();
  }
}

nextPage(): void {
  this.goToPage(this.currentPage + 1);
}

prevPage(): void {
  this.goToPage(this.currentPage - 1);
}





editSpace(space: Space): void {
  this.selectedSpaceKey = space.key;
  this.editedSpace = {
    ...space,
    client: space.client ? { ...space.client } : null // Copia completa del espacio y cliente
  };
  this.newSpaceKey = space.key; // Prellenar clave (no editable)

  this.showModal('editSpaceModal');
  console.log('Datos del espacio antes de editar:', this.editedSpace); // Logging para depurar
}


confirmEditSpace(): void {
  console.log('confirmEditSpace ejecutado', { newSpaceKey: this.newSpaceKey, selectedSpaceKey: this.selectedSpaceKey, editedSpace: this.editedSpace });

  if (this.editedSpace) { // Siempre intentar guardar si hay datos
    let hasError = false;
    if (this.newSpaceKey !== this.selectedSpaceKey) { // Validar solo si la clave cambió
      const pattern = /^SUB\d+-[A-Za-z0-9]+$/;
      if (!pattern.test(this.newSpaceKey)) {
        console.log('Patrón inválido');
        alert('La clave debe seguir el patrón SUBN-XXX (donde XXX son letras o números).');
        hasError = true;
      }
    }
    if (!hasError) {
      try {
        console.log('Llamando al servicio editSpace');
        this.autolavadoService.editSpace(this.selectedSpaceKey, this.newSpaceKey, this.editedSpace);
        console.log('Servicio exitoso, actualizando vista');
        this.filterSpaces();
        this.cdr.detectChanges();
        console.log('Vista actualizada, alert mostrado');
        alert('Espacio editado exitosamente!');
      } catch (error) {
        console.error('Error en confirmEditSpace:', error);
        alert('Error al editar espacio: ' + error);
      }
    }
  } else {
    console.log('No hay datos para editar');
  }
  this.hideModal('editSpaceModal');
}


transferSpace(): void {
  if (confirm(`¿Transferir espacio ${this.selectedSpaceKey} a otro subsuelo?`)) {
    const newSubsuelo = prompt('Ingresa el ID del subsuelo destino (ej. SUB2):', this.subsuelos[0]?.id || '');
    if (newSubsuelo && newSubsuelo !== this.selectedSpace?.subsueloId) {
      try {
        this.autolavadoService.transferSpace(this.selectedSpaceKey, newSubsuelo);
        this.filterSpaces();
        this.cdr.detectChanges();
        alert('Espacio transferido exitosamente!');
      } catch (error) {
        alert('Error al transferir espacio: ' + error);
      }
    }
  }
}


openWhatsAppModalOccupied(): void {
  if (this.selectedClient && this.selectedSpace) {
    this.whatsappMessageOccupied = this.autolavadoService.buildWhatsAppMessage(this.selectedClient, this.selectedSpace);
    this.showWhatsAppModalOccupied = true;
  }
}

// Método para cerrar modal WhatsApp
closeWhatsAppModalOccupied(): void {
  this.showWhatsAppModalOccupied = false;
}

// Método para copiar mensaje
copyMessageOccupied(): void {
  navigator.clipboard.writeText(this.whatsappMessageOccupied).then(() => {
    this.hasCopiedMessageOccupied = true;

       const toastEl = document.getElementById('copyToast');
    if (toastEl) {
      const toast = new bootstrap.Toast(toastEl);
      toast.show();
    }
  }).catch(err => {
    console.error('Error copying message:', err);
    // Fallback alert si clipboard falla
    alert('Error al copiar mensaje');
  });


}



}
