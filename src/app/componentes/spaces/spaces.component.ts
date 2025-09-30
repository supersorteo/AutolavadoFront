import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Subject, takeUntil, combineLatest } from 'rxjs';
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

  subsuelos: Subsuelo[] = [];
  spaces: { [key: string]: Space } = {};
  clients: { [key: string]: Client } = {};
  currentSubId: string | null = null;
  currentSubTitle = 'Espacios';
  filteredSpaces: Space[] = [];
  searchTerm = '';
  addSpacesCount = 5;

  // Modal data
  selectedSpaceKey = '';
  selectedSpace: Space | null = null;
  selectedClient: Client | null = null;
  showQR = false;
  showOccupiedQR = false;
  qrCaption = '';
  whatsappLink = '';

  clientForm: FormGroup;

  constructor(
    private autolavadoService: AutolavadoService,
    private qrService: QrService,
    private fb: FormBuilder,
     private cdr: ChangeDetectorRef
  ) {
    this.clientForm = this.fb.group({
      name: ['', Validators.required],
      phone: ['', Validators.required],
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
      this.autolavadoService.currentSubId$
    ]).pipe(takeUntil(this.destroy$))
    .subscribe(([subsuelos, spaces, clients, currentSubId]) => {
      this.subsuelos = subsuelos;
      this.spaces = spaces;
      this.clients = clients;
      this.currentSubId = currentSubId;
      this.updateCurrentSubTitle();
      this.filterSpaces();
    });

    // Timer para actualizar tiempos transcurridos
    setInterval(() => {
      // Forzar actualización de la vista cada minuto
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

    this.filteredSpaces = Object.values(this.spaces)
      .filter(sp => sp.subsueloId === this.currentSubId)
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  onSubsueloChange(): void {
    if (this.currentSubId) {
      this.autolavadoService.setCurrentSubsuelo(this.currentSubId);
    }
  }

  addSubsuelo(): void {
    this.autolavadoService.addSubsuelo();
  }

  addSpaces(): void {
    this.autolavadoService.addSpacesToCurrent(this.addSpacesCount);
  }

  onSearch(): void {
    // El filtrado se maneja en isSearchHit
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

  saveClient(): void {
    if (this.clientForm.invalid) {
      alert('Por favor completa todos los campos obligatorios.');
      return;
    }

    try {
      const client = this.autolavadoService.saveClient(this.clientForm.value, this.selectedSpaceKey);

      // Actualizar enlaces
      const space = this.spaces[this.selectedSpaceKey];
      this.whatsappLink = this.autolavadoService.buildWhatsAppLink(client, space);
      this.qrCaption = `${client.name} — ${client.code}`;

      // Generar QR final
      this.qrService.generateQR('qrcode', client.qrText);
      this.showQR = true;

      alert('Cliente guardado exitosamente!');
    } catch (error) {
      alert('Error al guardar cliente: ' + error);
    }
  }

   openWhatsApp(): void {
    if (this.whatsappLink) {
      window.location.href = this.whatsappLink;
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
      this.qrService.generateQR('occQRElm', this.selectedClient.qrText);
    }
  }

  downloadQR(): void {
    this.qrService.downloadQR('qrcode', `cliente_${this.selectedSpaceKey}.png`);
  }

  downloadOccupiedQR(): void {
    this.qrService.downloadQR('occQRElm', `${this.selectedClient?.code || 'cliente'}.png`);
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

resetData0(): void {
    if (confirm('Esto borrará todos los datos de clientes.')) {
      localStorage.removeItem('alw_clients');
      Object.values(this.spaces).forEach(space => {
        space.occupied = false;
        space.clientId = null;
        space.startTime = null;
      });
      this.clients = {};
      localStorage.setItem('alw_spaces', JSON.stringify(this.spaces));
      this.filterSpaces();
      this.cdr.detectChanges();
    }
  }

  resetData(): void {
  if (confirm('Esto borrará todos los datos de clientes.')) {
    this.autolavadoService.resetData();
    this.filterSpaces();
    this.cdr.detectChanges();
  }
}

}
