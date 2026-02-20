import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Subject, takeUntil, combineLatest, BehaviorSubject, forkJoin, debounceTime, distinctUntilChanged } from 'rxjs';
import { Client, Space, Subsuelo, VehicleType } from '../../models/autolavado.model';
import { AutolavadoService } from '../../services/autolavado.service';
import { QrService } from '../../services/qr.service';
import { ToastService } from '../../services/toast.service';

import intlTelInput from 'intl-tel-input';
import { FormatPhonePipe } from "../../services/format-phone.pipe";
import * as XLSX from 'xlsx';
declare var bootstrap: any;

interface ClientVehicleItem {
  model: string;
  plate?: string;
  notes?: string;
}

@Component({
  selector: 'app-spaces',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FormatPhonePipe],
  templateUrl:'./spaces.component.html',
  styleUrls: ['./spaces.component.scss']
})

export class SpacesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  @ViewChild('occQRElm', { static: false }) occQRContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;
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
  isClientsDbOpen = false;


  allClients: Client[] = [];
  searchTermClients = '';
  filteredClientsAdmin: Client[] = [];
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
  whatsappMessageOccupied0 = '';
  hasCopiedMessageOccupied = false;
  sentReleaseWhatsappBySpace = new Set<string>();
  private readonly WHATSAPP_SENT_KEY = 'exellsior_whatsapp_sent_';
  private readonly WHATSAPP_SENT_STORAGE_KEY = 'exellsior_whatsapp_sent_spaces';
  cerrarDiaModalMessage = '';
  cerrarDiaResultMessage = '';
  saveClientHeaderMessage = '';
  private saveClientHeaderTimer: any = null;

vehicles: VehicleType[] = [];
existingClientId: any | null = null;
horaCierreAutomatico = '23:59';

showVehicleModal = false;
newVehicle = {
  model: '',
  category: '',
  price: 35000
};
vehicleTypes: VehicleType[] = []; // Lista actualizada
selectedVehicleModel = '';



showNewVehicleModal = false;
newVehicleModel = ''; // Se prellenará con lo que escribió el usuario
newVehicleCategory = 'AUTO'; // Valor por defecto
newVehiclePrice = 35000; // Valor por defecto

showVehicleAside = false;          // Abre/cierra el aside lateral
vehicleFilter = '';                // Para filtrar la tabla en el aside
selectedVehicleCategory = '';      // Filtro por tipo en el aside
showAddVehicleModal = false;

currentVehiclePage = 1;
vehiclePageSize = 20;

clientModalInstance: any = null;


//phoneCountry: string = 'Argentina';   // Nombre
//phoneFlag: string = '🇦🇷';            // Bandera
//phoneCode: string = '+54';            // ← NUEVO: mostrar el código
//phoneIsValid: boolean = false;
public detectedCountryCode: string | null = null;




  private iti: any; // Instancia de intl-tel-input

  phoneIsValid = false;
  phoneCountry = '';
  phoneFlag = '';
  phoneCode = '';
  isModalOpen = false;
  phoneErrorMessage: string = '';

  isClientModalOpen = false;


isNewClientModalOpen = false;
isSavingClient = false;
newClient: any = {
  name: '',
  dni: '',
  phoneIntl: '',
  vehicle: '',
  plate: '',
  category: '',
  price: null,
  paymentMethod: '',
  clover: null,
  notes: ''
};

isLoading = false;
showNewClientModal = false;

newClientForm!: FormGroup;
newPhoneInput!: ElementRef<HTMLInputElement>;
newPhoneIsValid = false;
newPhoneFlag = '';
newPhoneCode = '';
newPhoneCountry = '';
private newIti: any;
isSavingNewClient = false;
isVehicleAsideFromManual = false;
newPhoneErrorMessage: string = '';
showClientVehiclesModal = false;
clientVehiclesList: ClientVehicleItem[] = []; // lista temporal para el modal
//clientVehicleEditor = { model: '', plate: '', notes: '' };
editingClientVehicleIndex: number | null = null;
//clientVehiclesStore: { [clientKey: string]: ClientVehicleItem[] } = {};

clientVehicleEditor: ClientVehicleItem = { model: '', plate: '', notes: '' };
clientVehiclesStore: { [key: string]: ClientVehicleItem[] } = {};
showFrequentClientModal = false;
frequentClientVisitsSnapshot: Client[] = [];

  constructor(
    private autolavadoService: AutolavadoService,
    private qrService: QrService,
    private fb: FormBuilder,
     private cdr: ChangeDetectorRef,
     private toastService: ToastService
  ) {
    this.clientForm = this.fb.group({
      name: ['', Validators.required],
      dni: ['', [Validators.required, Validators.pattern('[0-9]{7,8}')]],
      //phone: ['', [Validators.required, Validators.pattern(/^[0-9]{8,10}$/)]],
      phone: ['', Validators.required],
      vehicle: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(1)]],
      plate: [''],
      notes: ['']
    });

    this.newClientForm = this.fb.group({
  name: ['', Validators.required],
  //dni: ['', [Validators.pattern('[0-9]{7,8}')]],
  dni: ['', [Validators.required, Validators.pattern('[0-9]{7,8}')]],
  phoneIntl: ['', Validators.required],
  vehicle: ['', Validators.required],
  plate: ['', Validators.required],
  category: [''],
  price: [null]
});
  }


ngOnInit(): void {
  // 1. VERIFICAR SI HAY DATOS EN LOCALSTORAGE
  const localSubsuelos = localStorage.getItem('subsuelos');
  const localSpaces = localStorage.getItem('spaces');

  if (!localSubsuelos || !localSpaces || JSON.parse(localSubsuelos).length === 0) {
    console.log('LocalStorage vacío → cargando desde backend como respaldo');
    this.loadDataFromBackend();
  } else {
    console.log('Datos encontrados en localStorage → usando local');
    // Aquí NO llamamos a ningún método → el servicio ya cargó los datos al iniciar
    // (tu servicio probablemente los carga en el constructor o al instanciarse)
  }

  // 2. SUSCRIPCIONES REACTIVAS (igual que antes)
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

  this.searchTermSubject.subscribe(() => {
    this.currentPage = 1;
    this.filterSpaces();
  });

  setInterval(() => {
    this.cdr.detectChanges();
  }, 60000);

  // 3. CARGAR VEHÍCULOS DESDE BACKEND (siempre)
  this.autolavadoService.loadVehicleTypes().subscribe({
    next: (vehicles: VehicleType[]) => {
      this.vehicles = vehicles;
      console.log('Tipos de vehículos cargados desde backend:', vehicles);
      const currentVehicle = this.clientForm.get('vehicle')?.value;
      if (!currentVehicle && vehicles.length > 0) {
        const defaultVehicle = vehicles[0];
        this.clientForm.patchValue({
          vehicle: defaultVehicle.model,
          price: defaultVehicle.price
        });
      }
    },
    error: (err) => {
      console.error('Error al cargar vehículos', err);
      alert('No se pudieron cargar los tipos de vehículos');
    }
  });



this.clientForm.get('dni')?.valueChanges
  .pipe(
    debounceTime(600),
    distinctUntilChanged()
  )
  .subscribe(dni => {
    if (dni && dni.length >= 7) {
      this.autolavadoService.searchClientByDni(dni).subscribe({
        next: (client) => {
          if (client) {
            const isInactive = client.spaceKey === null || client.spaceKey === '';

            if (isInactive) {
              this.existingClientId = client.id;
              alert(`Cliente encontrado: ${client.name}\nSe reutilizará su información (sin reserva activa).`);
            } else {
              this.existingClientId = null;
              alert(`Cliente encontrado: ${client.name}\nYa tiene una reserva activa.\nSe creará una NUEVA reserva para otro vehículo.`);
            }

            // Cargar todos los datos EXCEPTO el teléfono
            this.clientForm.patchValue({
              name: client.name || '',
              plate: client.plate || '',
              notes: client.notes || '',
              vehicle: client.vehicle || '',
              price: client.price || null,
              entryTimestamp: Date.now()
            }, { emitEvent: false });

            // Cargar el teléfono por separado con un pequeño delay
            setTimeout(() => {
              const phoneToLoad = client.phoneIntl || client.phoneRaw || '';
              if (phoneToLoad && this.iti) {
                console.log('[DNI búsqueda] Cargando teléfono desde backend:', phoneToLoad);

                // 1. Actualizar la librería intl-tel-input
                this.iti.setNumber(phoneToLoad);

                // 2. Forzar actualización visual y validación
                this.updatePhoneInfo(false); // false = carga externa

                // 3. Actualizar el formControl (por seguridad)
                this.clientForm.patchValue({ phone: phoneToLoad }, { emitEvent: false });

                console.log('[DNI búsqueda] Teléfono cargado y validado visualmente');
              }
            }, 150);

          } else {
            this.existingClientId = null;
            alert('Cliente nuevo. Se creará un registro.');
          }
        },
        error: () => {
          this.existingClientId = null;
        }
      });
    } else {
      this.existingClientId = null;
    }
  });


 this.limpiarEspaciosDeDiasAnteriores();
// NUEVO: Mantener allClients y filteredClientsAdmin sincronizados con el servicio
  this.autolavadoService.clients$.subscribe((clientsMap) => {
    this.allClients = Object.values(clientsMap);
    this.filterClientsAdmin();  // Recalcula la búsqueda actual
    console.log('allClients actualizado desde clientsSubject:', this.allClients.length);
  });

  this.loadSentWhatsappState();

}



  ngAfterViewInit0(): void {
  this.iti = intlTelInput(this.phoneInput.nativeElement, {
    initialCountry: 'ar',
    preferredCountries: ['ar', 'br', 'cl', 'co', 've', 'pe', 'bo', 'py', 'uy', 'ec', 'cu'],
    utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/19.2.15/js/utils.js',
    separateDialCode: true,
    nationalMode: false,
    formatOnDisplay: true,
    autoPlaceholder: 'polite',
    placeholderNumberType: 'MOBILE'
  });



  // Escuchar input y cambio de país
  this.phoneInput.nativeElement.addEventListener('input', () => this.updatePhoneInfo());
  this.phoneInput.nativeElement.addEventListener('countrychange', () => this.updatePhoneInfo());

this.phoneInput.nativeElement.addEventListener('input', () => {
    this.updatePhoneInfo();
  });

  this.phoneInput.nativeElement.addEventListener('countrychange', () => {
    this.updatePhoneInfo();
  });

  // Escuchar cambios del formControl 'phone' (incluyendo patchValue desde DNI)
  this.clientForm.get('phone')?.valueChanges.subscribe(newPhone => {
    if (newPhone && this.iti) {
      this.iti.setNumber(newPhone); // Fuerza que intl-tel-input detecte y cambie el país
      this.updatePhoneInfo();       // Actualiza visuales
    }
  });
}

ngAfterViewInit00(): void {
  this.iti = intlTelInput(this.phoneInput.nativeElement, {
    initialCountry: 'ar',
    preferredCountries: ['ar', 'br', 'cl', 'co', 've', 'pe', 'bo', 'py', 'uy', 'ec', 'cu'],
    utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/19.2.15/js/utils.js',
    separateDialCode: true,
    nationalMode: false,
    formatOnDisplay: true,
    autoPlaceholder: 'polite',
    placeholderNumberType: 'MOBILE'
  });

  // Listener para cuando el usuario escribe/pega (actualiza formControl)
  this.phoneInput.nativeElement.addEventListener('input', () => {
    this.updatePhoneInfo();
  });

  // Listener para cambio de país (solo visual)
  this.phoneInput.nativeElement.addEventListener('countrychange', () => {
    this.updatePhoneInfo();
  });

  // Listener para cambios externos (ej: DNI patchValue) → solo actualiza la librería
  this.clientForm.get('phone')?.valueChanges.subscribe(newPhone => {
    if (newPhone && this.iti) {
      // Evitar loop infinito: solo actualizar si el valor es diferente
      if (this.iti.getNumber() !== newPhone) {
        this.iti.setNumber(newPhone);
        this.updatePhoneInfo();
      }
    }
  });
}


ngAfterViewInit(): void {
 /* this.iti = intlTelInput(this.phoneInput.nativeElement, {
    initialCountry: 'ar',
    preferredCountries: ['ar', 'br', 'cl', 'co', 've', 'pe', 'bo', 'py', 'uy', 'ec', 'cu'],
    utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/19.2.15/js/utils.js',
    separateDialCode: true,
    nationalMode: false,
    formatOnDisplay: true,
    autoPlaceholder: 'polite',
    placeholderNumberType: 'MOBILE'
  });

  // Listener para cuando el usuario escribe/pega
  this.phoneInput.nativeElement.addEventListener('input', () => {
    this.updatePhoneInfo(true); // true = usuario escribiendo
  });

  // Listener para cambio de país
  this.phoneInput.nativeElement.addEventListener('countrychange', () => {
    this.updatePhoneInfo(true);
  });

  // Listener para cambios externos (ej: DNI patchValue)
  this.clientForm.get('phone')?.valueChanges
    .pipe(
      debounceTime(100), // Pequeño delay para evitar loops
      distinctUntilChanged()
    )
    .subscribe(newPhone => {
      if (newPhone && this.iti) {
        const currentNumber = this.iti.getNumber();

        // Solo actualizar si el valor es diferente
        if (currentNumber !== newPhone) {
          this.iti.setNumber(newPhone);
          this.updatePhoneInfo(false); // false = carga externa
        }
      }
    });*/


    this.iti = intlTelInput(this.phoneInput.nativeElement, {
    initialCountry: 'ar',
    preferredCountries: ['ar', 'br', 'cl', 'co', 've', 'pe', 'bo', 'py', 'uy', 'ec', 'cu'],
    utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/19.2.15/js/utils.js',
    separateDialCode: true,
    nationalMode: false,
    formatOnDisplay: true,
    autoPlaceholder: 'polite',
    placeholderNumberType: 'MOBILE'
  });

  // Listener para input manual
  this.phoneInput.nativeElement.addEventListener('input', () => {
    this.updatePhoneInfo(true);
  });

  // Listener para cambio de país
  this.phoneInput.nativeElement.addEventListener('countrychange', () => {
    this.updatePhoneInfo(true);
  });

  // Listener para cambios externos (DNI, patchValue, etc.)
  this.clientForm.get('phone')?.valueChanges
    .pipe(
      debounceTime(300), // Más tiempo para evitar loops rápidos
      distinctUntilChanged()
    )
    .subscribe(newPhone => {
      console.log('[valueChanges] Teléfono cambiado desde código:', newPhone);
      if (newPhone && this.iti) {
        const currentNumber = this.iti.getNumber();

        // Solo actualizar si es diferente (evita loops infinitos)
        if (currentNumber !== newPhone) {
          console.log('[valueChanges] Actualizando iti con:', newPhone);
          this.iti.setNumber(newPhone);
          this.updatePhoneInfo(false); // false = carga externa
        }
      }
    });

  // Fuerza validación inicial si ya hay valor al cargar el modal
  const initialPhone = this.clientForm.get('phone')?.value;
  if (initialPhone && this.iti) {
    console.log('[ngAfterViewInit] Validación inicial con teléfono existente:', initialPhone);
    this.iti.setNumber(initialPhone);
    this.updatePhoneInfo(false);
  }


  setTimeout(() => {
  const phoneEl = document.getElementById('newPhoneIntlInput');
  if (phoneEl) {
    this.newIti = intlTelInput(phoneEl, {
      initialCountry: 'ar',
      preferredCountries: ['ar', 'br', 'cl', 'co', 've', 'pe', 'bo', 'py', 'uy', 'ec', 'cu'],
      utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/19.2.15/js/utils.js',
      separateDialCode: true,
      nationalMode: false,
      formatOnDisplay: true,
      autoPlaceholder: 'polite',
      placeholderNumberType: 'MOBILE'
    });

    phoneEl.addEventListener('input', () => this.updateNewPhoneInfo());
    phoneEl.addEventListener('countrychange', () => this.updateNewPhoneInfo());

    // Sincronizar valueChanges
    this.newClientForm.get('phoneIntl')?.valueChanges.subscribe(value => {
      if (value && this.newIti && this.newIti.getNumber() !== value) {
        this.newIti.setNumber(value);
        this.updateNewPhoneInfo();
      }
    });
  }
}, 0);

}








private updatePhoneInfo0(fromUserInput: boolean = false): void {
  if (!this.iti) return;

  let fullNumber: string;

  if (fromUserInput) {
    // Usuario escribiendo: tomar valor del input
    fullNumber = this.iti.getNumber();
  } else {
    // Carga externa (DNI): usar el valor del form
    fullNumber = this.iti.getNumber();
  }

  // Asegurar que tiene el signo +
  if (!fullNumber.startsWith('+')) {
    const countryData = this.iti.getSelectedCountryData();
    fullNumber = '+' + countryData.dialCode + fullNumber.replace(/^\+/, '');
  }

  // Validación
  const countryData = this.iti.getSelectedCountryData();
  const dialCode = countryData.dialCode;
  let isValid = false;
  let errorMessage = '';

  if (dialCode === '54') {
    // ========================================
    // VALIDACIÓN ESTRICTA PARA ARGENTINA
    // ========================================
    // Formato: +54 9 [código de área] [número]
    // El 9 es OBLIGATORIO para móviles

    const match = fullNumber.match(/^\+54(\d+)$/);

    if (match) {
      const digits = match[1]; // Todos los dígitos después de +54

      // REGLA 1: Debe empezar con 9 (obligatorio para móviles)
      if (!digits.startsWith('9')) {
        isValid = false;
        errorMessage = 'Los móviles argentinos deben tener el 9 después de +54';
      } else {
        // REGLA 2: Después del 9, validar código de área + número
        const afterNine = digits.substring(1); // Quitar el '9'

        // Códigos de área comunes en Argentina:
        // 11 (CABA/GBA): 8 dígitos después → total 10 dígitos (9 + 11 + 8)
        // 2XX (Provincia Bs As): 6-8 dígitos después
        // 3XX (otras provincias): 6-7 dígitos después

        if (afterNine.startsWith('11')) {
          // Buenos Aires: 9 11 + 8 dígitos = 11 dígitos totales
          isValid = digits.length === 11;
          if (!isValid) {
            errorMessage = `Buenos Aires: debe tener 8 dígitos después del 11 (formato: +54 9 11 XXXXXXXX)`;
          }
        } else if (afterNine.match(/^2\d{2}/)) {
          // Provincia de Buenos Aires (código 2XX): 9 + 3 dígitos + 6-8 dígitos
          isValid = digits.length >= 10 && digits.length <= 12;
          if (!isValid) {
            errorMessage = `Provincia de Buenos Aires: formato +54 9 2XX XXXXXX`;
          }
        } else if (afterNine.match(/^3\d{2}/)) {
          // Otras provincias (código 3XX): 9 + 3 dígitos + 6-7 dígitos
          isValid = digits.length >= 10 && digits.length <= 11;
          if (!isValid) {
            errorMessage = `Código de área 3XX: formato +54 9 3XX XXXXXX`;
          }
        } else if (afterNine.match(/^4\d{2}/)) {
          // Códigos 4XX: similar a 3XX
          isValid = digits.length >= 10 && digits.length <= 11;
          if (!isValid) {
            errorMessage = `Código de área 4XX: formato +54 9 4XX XXXXXX`;
          }
        } else {
          // Otros códigos: validación general
          // Mínimo: 9 + 2 dígitos de área + 6 dígitos = 9 dígitos
          // Máximo: 9 + 4 dígitos de área + 8 dígitos = 13 dígitos
          isValid = digits.length >= 9 && digits.length <= 13;
          if (!isValid) {
            errorMessage = `Formato general: +54 9 [código área] [número]`;
          }
        }
      }
    } else {
      isValid = false;
      errorMessage = 'Formato inválido para Argentina';
    }
  } else {
    // Otros países: usar validación de la librería
    isValid = this.iti.isValidNumber();
  }

  // Actualizar el formControl SOLO si viene del usuario
  if (fromUserInput) {
    this.clientForm.patchValue({ phone: fullNumber }, { emitEvent: false });
  }

  // Actualizar variables de estado
  this.phoneIsValid = isValid;
  this.phoneErrorMessage = errorMessage; // Nueva variable para mostrar el error
  this.phoneCountry = countryData.name || 'Desconocido';
  this.phoneFlag = this.getFlagEmoji(countryData.iso2);
  this.phoneCode = '+' + dialCode;

  this.cdr.detectChanges();
}

private updatePhoneInfo(fromUserInput: boolean = false): void {
  if (!this.iti) {
    console.warn('[updatePhoneInfo] intl-tel-input no inicializado');
    return;
  }

  let fullNumber = this.iti.getNumber();

  // Asegurar + al inicio
  if (!fullNumber.startsWith('+')) {
    const countryData = this.iti.getSelectedCountryData();
    fullNumber = '+' + countryData.dialCode + fullNumber;
    console.log('[updatePhoneInfo] Agregado + manualmente:', fullNumber);
  }

  // Validación completa
  const countryData = this.iti.getSelectedCountryData();
  const dialCode = countryData.dialCode;
  let isValid = this.iti.isValidNumber(); // Validación base de la librería
  let errorMessage = '';

  if (dialCode === '54') {
    const digits = fullNumber.replace('+54', '');
    if (!digits.startsWith('9')) {
      isValid = false;
      errorMessage = 'Los móviles argentinos deben tener el 9 después de +54';
    } else {
      const afterNine = digits.substring(1);
      if (afterNine.startsWith('11')) {
        isValid = digits.length === 11;
        if (!isValid) errorMessage = 'Buenos Aires: debe tener 8 dígitos después del 11';
      } else if (afterNine.match(/^[234]\d{2}/)) {
        isValid = digits.length >= 10 && digits.length <= 12;
        if (!isValid) errorMessage = 'Provincia Bs As: formato +54 9 2XX XXXXXX';
      } else {
        isValid = digits.length >= 10 && digits.length <= 11;
        if (!isValid) errorMessage = 'Formato general: +54 9 [código área] [número]';
      }
    }
  }

  // Guardar en el form SOLO si viene del usuario (evita loops)
  if (fromUserInput) {
    this.clientForm.patchValue({ phone: fullNumber }, { emitEvent: false });
    console.log('[updatePhoneInfo] Actualizado formControl:', fullNumber);
  }

  // ACTUALIZAR ESTADO VISUAL (esto es lo clave para que cambie la palomita)
  this.phoneIsValid = isValid;
  this.phoneErrorMessage = errorMessage;
  this.phoneCountry = countryData.name || 'Desconocido';
  this.phoneFlag = this.getFlagEmoji(countryData.iso2);
  this.phoneCode = '+' + dialCode;

  console.log('[updatePhoneInfo] Resultado:', {
    fullNumber,
    isValid,
    errorMessage,
    phoneIsValid: this.phoneIsValid,
    fromUserInput
  });

  this.cdr.detectChanges(); // Forzar actualización visual
}

getPhoneFormatHint(): string {
  if (!this.iti) return '';

  const countryData = this.iti.getSelectedCountryData();
  const dialCode = countryData.dialCode;

  if (dialCode === '54') {
    const phone = this.clientForm.get('phone')?.value || '';
    const match = phone.match(/^\+549(\d+)/);

    if (match) {
      const afterNine = match[1];
      if (afterNine.startsWith('11')) {
        return '+54 9 11 XXXXXXXX (8 dígitos)';
      } else if (afterNine.match(/^[234]\d{2}/)) {
        return '+54 9 XXX XXXXXX/XXXXXXX (6-7 dígitos)';
      }
    }
    return '+54 9 [código área] [número]';
  }

  return '';
}



private updateNewPhoneInfo(): void {
  if (!this.newIti) return;

  let fullNumber = this.newIti.getNumber();
  if (!fullNumber.startsWith('+')) {
    const countryData = this.newIti.getSelectedCountryData();
    fullNumber = '+' + countryData.dialCode + fullNumber;
  }

  this.newPhoneIsValid = this.newIti.isValidNumber();

  const countryData = this.newIti.getSelectedCountryData();
  this.newPhoneFlag = this.getFlagEmoji(countryData.iso2);
  this.newPhoneCode = '+' + countryData.dialCode;
  this.newPhoneCountry = countryData.name || 'Desconocido';

  // Guardar en form
  this.newClientForm.patchValue({ phoneIntl: fullNumber }, { emitEvent: false });

  // Validación extra Argentina (copia tu código)
  this.newPhoneErrorMessage = '';
  if (countryData.dialCode === '54') {
    const digits = fullNumber.replace('+54', '');
    if (!digits.startsWith('9')) {
      this.newPhoneIsValid = false;
      this.newPhoneErrorMessage = 'Los móviles argentinos deben tener el 9 después de +54';
    }
  }

  this.cdr.detectChanges();
}



  private getFlagEmoji(iso2: string): string {
    if (!iso2) return '🌍';
    return iso2.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
  }


  private loadSentWhatsappState0() {
  const saved = localStorage.getItem(this.WHATSAPP_SENT_KEY);
  if (saved) {
    const keys = JSON.parse(saved) as string[];
    this.sentReleaseWhatsappBySpace = new Set(keys);
  }
}

private loadSentWhatsappState() {
  const saved = localStorage.getItem(this.WHATSAPP_SENT_STORAGE_KEY);
  if (saved) {
    try {
      const keys = JSON.parse(saved) as string[];
      this.sentReleaseWhatsappBySpace = new Set(keys);
    } catch (e) {
      console.warn('Error cargando estado WhatsApp enviado', e);
    }
  }
}

// Guardar estado en localStorage (llamar cada vez que agregues/quites)
private saveSentWhatsappState0() {
  const keys = Array.from(this.sentReleaseWhatsappBySpace);
  localStorage.setItem(this.WHATSAPP_SENT_KEY, JSON.stringify(keys));
}

private saveSentWhatsappState() {
  const keys = Array.from(this.sentReleaseWhatsappBySpace);
  localStorage.setItem(this.WHATSAPP_SENT_STORAGE_KEY, JSON.stringify(keys));
}

resetNewClientForm() {
  this.newClientForm.reset();
  this.newPhoneIsValid = false;
  this.newPhoneFlag = '';
  this.newPhoneCode = '';
  this.newPhoneCountry = '';
  this.newPhoneErrorMessage = '';
  if (this.newIti) {
    this.newIti.setNumber('');
    this.newIti.setCountry('ar');
  }
  this.isSavingNewClient = false;
}

// Abrir modal
openNewClientModal() {
  this.resetNewClientForm(); // Resetear siempre al abrir
  const modal = new bootstrap.Modal(document.getElementById('newClientModal'));
  modal.show();
}


openNewClientModal0() {
  this.newClientForm.reset();
  this.newPhoneIsValid = false;
  this.newPhoneFlag = '';
  this.newPhoneCode = '';
  this.newPhoneCountry = '';
  if (this.newIti) {
    this.newIti.setCountry('ar');
    this.newIti.setNumber('');
  }
  this.showNewClientModal = true;

  // Si usás Bootstrap modal
  const modal = new bootstrap.Modal(document.getElementById('newClientModal'));
  modal.show();
}

openVehicleAsideForManual() {
  this.isVehicleAsideFromManual = true; // Bandera para saber desde dónde se abrió
  this.openVehicleAside(); // Tu método actual
}



selectVehicle1(vehicle: VehicleType): void {
  // Llenar el formulario con el vehículo seleccionado
  this.clientForm.patchValue({
    vehicle: vehicle.model,
    price: vehicle.price
  });

  console.log('Vehículo seleccionado desde tabla:', {
    model: vehicle.model,
    category: vehicle.category,
    price: vehicle.price
  });

  // Cerrar el aside automáticamente después de seleccionar
  this.closeVehicleAside();

  this.toastService.showSuccess(`Vehículo seleccionado: ${vehicle.model} - $${vehicle.price}`);
  console.log(`Vehículo seleccionado: ${vehicle.model} - $${vehicle.price}`)
}

selectVehicle00(v: VehicleType) {
  if (this.isVehicleAsideFromManual) {
    // Desde modal de nuevo cliente manual
    this.newClientForm.patchValue({
      vehicle: v.model,
      category: v.category,
      price: v.price
    });
  } else {
    // Desde modal de reserva de espacio (tu lógica original)
    this.clientForm.patchValue({
      vehicle: v.model,
      category: v.category,
      price: v.price
    });
  }

  // Cerrar aside y resetear bandera (común a ambos)
  this.closeVehicleAside();
  this.isVehicleAsideFromManual = false;

  // Toast y log (opcional, pero recomendado)
  this.toastService.showSuccess(`Vehículo seleccionado: ${v.model} - $${v.price}`);
  console.log('Vehículo seleccionado:', {
    model: v.model,
    category: v.category,
    price: v.price,
    desde: this.isVehicleAsideFromManual ? 'nuevo cliente manual' : 'reserva de espacio'
  });
}


selectVehicle(v: VehicleType) {
  // Cargar en el formulario (tu lógica actual)
  if (this.isVehicleAsideFromManual) {
    // Desde modal de nuevo cliente manual (si aplica)
    this.newClientForm.patchValue({
      vehicle: v.model,
      category: v.category,
      price: v.price
    });
  } else {
    // Desde modal de reserva de espacio
    this.clientForm.patchValue({
      vehicle: v.model,
      category: v.category,
      price: v.price
    });
  }

  // NUEVO: Agregar automáticamente al store de vehículos del cliente (si no existe ya)
  const key = this.getCurrentClientVehiclesKey();
  if (key !== `space:${this.selectedSpaceKey || 'temp'}`) { // solo si hay DNI o nombre
    const currentList = this.clientVehiclesStore[key] || [];

    // Verificar si ya existe (por modelo)
    const exists = currentList.some(item => item.model.toLowerCase() === v.model.toLowerCase());
    if (!exists) {
      const newVehicle: ClientVehicleItem = {
        model: v.model,
        plate: this.clientForm.get('plate')?.value?.trim() || '',
        notes: ''
      };
      currentList.push(newVehicle);
      this.clientVehiclesStore[key] = currentList;
      console.log(`Vehículo "${v.model}" agregado al store del cliente (${key})`);
    }
  }

  // Cerrar aside
  this.closeVehicleAside();
  this.isVehicleAsideFromManual = false;

  this.toastService.showSuccess(`Vehículo seleccionado: ${v.model} - $${v.price}`);
}



saveNewClient0() {
  console.log('[saveNewClient] === INICIO ===');

  // Marcar campos para mostrar errores
  this.newClientForm.markAllAsTouched();
  console.log('[saveNewClient] Form marcado como tocado');
  console.log('[saveNewClient] ¿Formulario válido?', this.newClientForm.valid);
  console.log('[saveNewClient] ¿Teléfono válido?', this.newPhoneIsValid);
  console.log('[saveNewClient] Valores del form:', this.newClientForm.value);

  // Validación estricta
  if (this.newClientForm.invalid || !this.newPhoneIsValid) {
    console.warn('[saveNewClient] Validación fallida → no se guarda');
    alert('Completa todos los campos obligatorios y verifica el teléfono');
    return;
  }

  const clientData = this.newClientForm.value;
  console.log('[saveNewClient] Datos a enviar:', clientData);

  this.isSavingNewClient = true;
  console.log('[saveNewClient] Spinner activado');

  this.autolavadoService.addManualClient(clientData).subscribe({
    next: (savedClient) => {
      console.log('[saveNewClient] Guardado exitoso:', savedClient);

      this.isSavingNewClient = false;

      // Mostrar éxito
      alert('Cliente agregado correctamente');

      // CERRAR MODAL DE FORMA SEGURA
      const modalElement = document.getElementById('newClientModal');
      if (modalElement) {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
          modalInstance.hide();
          setTimeout(() => {
  const backdrop = document.querySelector('.modal-backdrop');
  if (backdrop) backdrop.remove();
  document.body.classList.remove('modal-open');
}, 300);
          console.log('[saveNewClient] Modal cerrado con bootstrap.Modal.hide()');
        } else {
          console.warn('[saveNewClient] No se encontró instancia del modal');
        }
      } else {
        console.warn('[saveNewClient] No se encontró elemento #newClientModal');
      }

      // Resetear formulario y variables
      this.newClientForm.reset();
      this.newPhoneIsValid = false;
      this.newPhoneFlag = '';
      this.newPhoneCode = '';
      this.newPhoneCountry = '';
      if (this.newIti) {
        this.newIti.setNumber('');
        this.newIti.setCountry('ar');
      }

      // Recargar lista
      this.loadAllClientsFromBackend();
      this.cdr.detectChanges();
      console.log('[saveNewClient] Lista recargada');

      this.cdr.detectChanges();
      console.log('[saveNewClient] Change detection forzado');
    },

    error: (err) => {
      console.error('[saveNewClient] ERROR al guardar:', err);
      this.isSavingNewClient = false;

      const msg = err.error?.message || err.message || 'Error desconocido';
      alert('Error al guardar: ' + msg);
      console.error('[saveNewClient] Mensaje mostrado:', msg);
    },

    complete: () => {
      console.log('[saveNewClient] === FINALIZADO (complete) ===');
      this.isSavingNewClient = false; // por seguridad
      this.cdr.detectChanges();
    }
  });
}

saveNewClient() {
  console.log('[saveNewClient] === INICIO ===');

  // Marcar todos los campos para mostrar errores
  this.newClientForm.markAllAsTouched();
  console.log('[saveNewClient] Form marcado como tocado');

  // Validación manual + teléfono
  if (this.newClientForm.invalid || !this.newPhoneIsValid) {
    console.warn('[saveNewClient] Validación fallida');
    this.isSavingNewClient = false;
    return; // No envía nada
  }

  const clientData = {
    ...this.newClientForm.value,
    phoneIntl: this.newClientForm.value.phoneIntl,
    vehicle: this.newClientForm.value.vehicle,
    plate: this.newClientForm.value.plate,
    price: this.newClientForm.value.price
  };

  console.log('[saveNewClient] Datos a enviar:', clientData);

  this.isSavingNewClient = true;

  this.autolavadoService.addManualClient(clientData).subscribe({
    next: (savedClient) => {
      console.log('[saveNewClient] Guardado exitoso:', savedClient);
      this.isSavingNewClient = false;

      alert('Cliente agregado correctamente');

          const modalElement = document.getElementById('newClientModal');
      if (modalElement) {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
          modalInstance.hide();
          setTimeout(() => {
           const backdrop = document.querySelector('.modal-backdrop');
           if (backdrop) backdrop.remove();
           document.body.classList.remove('modal-open');
         }, 300);
          console.log('[saveNewClient] Modal cerrado con bootstrap.Modal.hide()');
        } else {
          console.warn('[saveNewClient] No se encontró instancia del modal');
        }
      } else {
        console.warn('[saveNewClient] No se encontró elemento #newClientModal');
      }
      // Cerrar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('newClientModal'));
      if (modal) modal.hide();

          this.newClientForm.reset();
      this.newPhoneIsValid = false;
      this.newPhoneFlag = '';
      this.newPhoneCode = '';
      this.newPhoneCountry = '';

      if (this.newIti) {
        this.newIti.setNumber('');
        this.newIti.setCountry('ar');
      }

      // Recargar lista
      this.loadAllClientsFromBackend();
      this.cdr.detectChanges();
      console.log('[saveNewClient] Lista recargada');

      this.cdr.detectChanges();
      console.log('[saveNewClient] Change detection forzado');
    },
    error: (err) => {
      console.error('[saveNewClient] ERROR:', err);
      this.isSavingNewClient = false;
      alert('Error al guardar: ' + (err.error?.message || 'Intenta de nuevo'));
    }
  });
}

// Cerrar modal
closeNewClientModal() {
  this.showNewClientModal = false;
}

get paginatedVehicles(): VehicleType[] {
  const start = (this.currentVehiclePage - 1) * this.vehiclePageSize;
  return this.filteredVehicles.slice(start, start + this.vehiclePageSize);
}



get totalVehiclePages(): number {
  return Math.ceil(this.filteredVehicles.length / this.vehiclePageSize);
}

get vehiclePageNumbers(): number[] {
  const total = this.totalVehiclePages;
  const pages: number[] = [];
  for (let i = 1; i <= total; i++) {
    pages.push(i);
  }
  return pages;
}



onPhoneInput0(event: Event): void {
  const input = event.target as HTMLInputElement;
  let phone = input.value.trim().replace(/\s+/g, ''); // Quitar espacios

  // Si empieza con + → tomar el código de país
  if (phone.startsWith('+')) {
    const code = phone.substring(1, phone.length).replace(/[^0-9]/g, ''); // Solo números
    this.detectCountryFromCode(code);
  } else {
    // Si no tiene +, asumir Argentina por defecto (+54)
    this.detectCountryFromCode('54');
    phone = '+54' + phone; // Agregar +54 automáticamente
    input.value = phone;   // Mostrar con +54
  }

  // Validación básica internacional (8-15 dígitos)
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  this.phoneIsValid = digitsOnly.length >= 8 && digitsOnly.length <= 15;

  // Guardar el teléfono limpio en el formulario (con + y código)
  this.clientForm.patchValue({ phone: phone });
}

onPhoneInput1(event: Event): void {
  const input = event.target as HTMLInputElement;
  let phone = input.value.trim();

  let detectedCode = '54'; // Argentina por defecto

  // Limpiar caracteres no numéricos excepto el +
  phone = phone.replace(/[^0-9+]/g, '');

  if (phone.startsWith('+')) {
    // Extraer posible código de país (hasta 3 dígitos)
    const possibleCode = phone.substring(1, 4);
    if (this.countryPhonePatterns[possibleCode]) {
      detectedCode = possibleCode;
    } else {
      // Si no encuentra código válido, mantener default
    }
  }

  this.detectCountryFromCode(detectedCode);

  // Validación básica: 8-15 dígitos totales (incluyendo código)
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  this.phoneIsValid = digitsOnly.length >= 8 && digitsOnly.length <= 15;

  // Guardar el teléfono tal como lo escribió el usuario
  this.clientForm.patchValue({ phone });
}


onPhoneInput2(event: Event): void {
  const input = event.target as HTMLInputElement;
  let phone = input.value.trim();

  let detectedCode = '54'; // Argentina por defecto

  // Limpiar caracteres no numéricos excepto el +
  phone = phone.replace(/[^0-9+]/g, '');

  if (phone.startsWith('+')) {
    // Extraer posible código de país (hasta 3 dígitos)
    const possibleCode = phone.substring(1, 4);
    if (this.countryPhonePatterns[possibleCode]) {
      detectedCode = possibleCode;
    } else {
      // Si no encuentra código válido, mantener default
    }
  }

  this.detectCountryFromCode(detectedCode);

  // Validación básica: 8-15 dígitos totales (incluyendo código)
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  this.phoneIsValid = digitsOnly.length >= 8 && digitsOnly.length <= 15;

  // Guardar el teléfono tal como lo escribió el usuario
  this.clientForm.patchValue({ phone });
}

onPhoneInput3(event: Event): void {
  const input = event.target as HTMLInputElement;
  let phone = input.value.trim();

  // Limpiar todo excepto números y el signo +
  phone = phone.replace(/[^0-9+]/g, '');

  let currentCode: string | null = null;

  // Si hay + → intentar detectar código
  if (phone.startsWith('+')) {
    // Buscar el código más largo posible que coincida (hasta 3 dígitos)
    for (let len = 3; len >= 1; len--) {
      const possible = phone.substring(1, len + 1);
      if (this.countryPhonePatterns[possible]) {
        currentCode = possible;
        break;
      }
    }
  }

  // Si encontramos código → fijarlo (y mantenerlo)
  if (currentCode) {
    this.detectedCountryCode = currentCode;
  }
  // Si el usuario borra el + o el código → resetear a default
  else if (!phone.startsWith('+') || phone === '+') {
    this.detectedCountryCode = null;
  }

  // Código a usar (fijado o default)
  const codeToUse = this.detectedCountryCode || '54';
  this.detectCountryFromCode(codeToUse);

  // Extraer solo los dígitos locales (sin el + ni código)
  let localDigits = phone;
  if (phone.startsWith('+' + codeToUse)) {
    localDigits = phone.substring(codeToUse.length + 1);
  } else {
    localDigits = phone.replace('+', ''); // Por si queda algún +
  }

  // Validación estricta según país
  const country = this.countryPhonePatterns[codeToUse];
  this.phoneIsValid = country
    ? localDigits.length === country.localDigits
    : (localDigits.length >= 8 && localDigits.length <= 15); // fallback genérico

  // Guardar teléfono completo (con + y código)
  this.clientForm.patchValue({ phone: phone });
}


onPhoneInput4(event: Event): void {
  const input = event.target as HTMLInputElement;
  let phone = input.value.trim();

  // Limpiar todo menos números y +
  phone = phone.replace(/[^0-9+]/g, '');

  let detectedCode = '54'; // Default Argentina

  if (phone.startsWith('+')) {
    // Buscar código de país
    for (let i = 1; i <= 4; i++) {
      const possible = phone.substring(1, i + 1);
      if (this.countryPhonePatterns[possible]) {
        detectedCode = possible;
        break;
      }
    }
  }

  this.detectedCountryCode = detectedCode;
  this.detectCountryFromCode(detectedCode);

  // Extraer dígitos locales (quitar + y código)
  let localDigits = phone;
  if (phone.startsWith('+' + detectedCode)) {
    localDigits = phone.substring(detectedCode.length + 1);
  } else {
    localDigits = phone.replace('+', '');
  }

  // Validación exacta para Argentina: 10 dígitos locales (9 + 9)
  const country = this.countryPhonePatterns[detectedCode];
  let isValid = false;

  if (country) {
    isValid = localDigits.length === country.localDigits;
  } else {
    isValid = localDigits.length >= 8 && localDigits.length <= 15;
  }

  this.phoneIsValid = isValid;
  this.clientForm.patchValue({ phone });

  // Opcional: mostrar con formato limpio
  // input.value = `+${detectedCode}${localDigits}`;
}



onPhoneInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  let phone = input.value.trim();

  // Limpiar todo menos números y +
  phone = phone.replace(/[^0-9+]/g, '');

  let detectedCode = '54'; // Default Argentina

  if (phone.startsWith('+')) {
    // Buscar código de país
    for (let i = 1; i <= 4; i++) {
      const possible = phone.substring(1, i + 1);
      if (this.countryPhonePatterns[possible]) {
        detectedCode = possible;
        break;
      }
    }
  }

  this.detectedCountryCode = detectedCode;
  this.detectCountryFromCode(detectedCode);

  // Extraer dígitos locales (quitar + y código)
  let localDigits = phone;
  if (phone.startsWith('+' + detectedCode)) {
    localDigits = phone.substring(detectedCode.length + 1);
  } else {
    localDigits = phone.replace('+', '');
  }

  // Validación específica para Argentina: 10 o 11 dígitos locales
  const country = this.countryPhonePatterns[detectedCode];
  let isValid = false;

  if (country) {
    if (detectedCode === '54') {
      // Argentina: permite 10 o 11 dígitos locales (más realista)
      isValid = localDigits.length === 10 || localDigits.length === 11;
    } else {
      // Otros países: longitud exacta
      isValid = localDigits.length === country.localDigits;
    }
  } else {
    // Fallback genérico
    isValid = localDigits.length >= 8 && localDigits.length <= 15;
  }

  this.phoneIsValid = isValid;
  this.clientForm.patchValue({ phone });
}




public countryPhonePatterns: { [code: string]: { name: string; flag: string; code: string; localDigits: number } } = {
  '54': { name: 'Argentina', flag: '🇦🇷', code: '+54', localDigits: 10 },  // 9 + 9 dígitos (o 10 sin 9)
  '55': { name: 'Brasil', flag: '🇧🇷', code: '+55', localDigits: 10 },    // 10-11 dígitos
  '56': { name: 'Chile', flag: '🇨🇱', code: '+56', localDigits: 9 },
  '57': { name: 'Colombia', flag: '🇨🇴', code: '+57', localDigits: 10 },
  '58': { name: 'Venezuela', flag: '🇻🇪', code: '+58', localDigits: 10 },
  '51': { name: 'Perú', flag: '🇵🇪', code: '+51', localDigits: 9 },
  '591': { name: 'Bolivia', flag: '🇧🇴', code: '+591', localDigits: 8 },
  '595': { name: 'Paraguay', flag: '🇵🇾', code: '+595', localDigits: 9 },
  '598': { name: 'Uruguay', flag: '🇺🇾', code: '+598', localDigits: 8 },
  '593': { name: 'Ecuador', flag: '🇪🇨', code: '+593', localDigits: 9 },
  '53': { name: 'Cuba', flag: '🇨🇺', code: '+53', localDigits: 8 },
  '52': { name: 'México', flag: '🇲🇽', code: '+52', localDigits: 10 },
  '1': { name: 'EE.UU./Canadá', flag: '🇺🇸', code: '+1', localDigits: 10 },
  '34': { name: 'España', flag: '🇪🇸', code: '+34', localDigits: 9 },
};


private detectCountryFromCode0(code: string): void {
  const countryMap: { [key: string]: { name: string; flag: string } } = {
    // Argentina y vecinos cercanos (los más probables)
    '54': { name: 'Argentina', flag: '🇦🇷' },
    '55': { name: 'Brasil', flag: '🇧🇷' },
    '56': { name: 'Chile', flag: '🇨🇱' },
    '57': { name: 'Colombia', flag: '🇨🇴' },
    '58': { name: 'Venezuela', flag: '🇻🇪' },
    '51': { name: 'Perú', flag: '🇵🇪' },
    '591': { name: 'Bolivia', flag: '🇧🇴' },
    '595': { name: 'Paraguay', flag: '🇵🇾' },
    '598': { name: 'Uruguay', flag: '🇺🇾' },
    '593': { name: 'Ecuador', flag: '🇪🇨' },
    '597': { name: 'Surinam', flag: '🇸🇷' },
    '592': { name: 'Guyana', flag: '🇬🇾' },
    '53': { name: 'Cuba', flag: '🇨🇺' },

    // Otros muy comunes en la región
    '52': { name: 'México', flag: '🇲🇽' },
    '1': { name: 'Estados Unidos / Canadá', flag: '🇺🇸' },
    '34': { name: 'España', flag: '🇪🇸' },
    '507': { name: 'Panamá', flag: '🇵🇦' },
    '506': { name: 'Costa Rica', flag: '🇨🇷' },
    '505': { name: 'Nicaragua', flag: '🇳🇮' },
    '504': { name: 'Honduras', flag: '🇭🇳' },
    '503': { name: 'El Salvador', flag: '🇸🇻' },
    '502': { name: 'Guatemala', flag: '🇬🇹' },

    // Fallback para códigos desconocidos
    'default': { name: 'Desconocido', flag: '🌍' }
  };

  const country = countryMap[code] || countryMap['default'];
  this.phoneCountry = country.name;
  this.phoneFlag = country.flag;
}




private detectCountryFromCode(code: string): void {
  const countryMap: { [key: string]: { name: string; flag: string; code: string } } = {
    '54': { name: 'Argentina', flag: '🇦🇷', code: '+54' },
    '55': { name: 'Brasil', flag: '🇧🇷', code: '+55' },
    '56': { name: 'Chile', flag: '🇨🇱', code: '+56' },
    '57': { name: 'Colombia', flag: '🇨🇴', code: '+57' },
    '58': { name: 'Venezuela', flag: '🇻🇪', code: '+58' },
    '51': { name: 'Perú', flag: '🇵🇪', code: '+51' },
    '591': { name: 'Bolivia', flag: '🇧🇴', code: '+591' },
    '595': { name: 'Paraguay', flag: '🇵🇾', code: '+595' },
    '598': { name: 'Uruguay', flag: '🇺🇾', code: '+598' },
    '593': { name: 'Ecuador', flag: '🇪🇨', code: '+593' },
    '597': { name: 'Surinam', flag: '🇸🇷', code: '+597' },
    '592': { name: 'Guyana', flag: '🇬🇾', code: '+592' },
    '53': { name: 'Cuba', flag: '🇨🇺', code: '+53' },
    '52': { name: 'México', flag: '🇲🇽', code: '+52' },
    '1': { name: 'EE.UU./Canadá', flag: '🇺🇸', code: '+1' },
    '34': { name: 'España', flag: '🇪🇸', code: '+34' },
  };

  const country = countryMap[code];
  if (country) {
    this.phoneCountry = country.name;
    this.phoneFlag = country.flag;
    this.phoneCode = country.code;
  } else {
    this.phoneCountry = 'País desconocido';
    this.phoneFlag = '🌍';
    this.phoneCode = '+??';
  }
}


private limpiarEspaciosDeDiasAnteriores0(): void {
  const spaces = this.autolavadoService.spacesSubject.value;
  const clients = this.autolavadoService.clientsSubject.value;

  const hoyInicio = new Date();
  hoyInicio.setHours(0, 0, 0, 0);
  const hoyTimestamp = hoyInicio.getTime();

  let necesitaLiberar = false;

  Object.values(spaces).forEach(space => {
    if (space.occupied && space.startTime) {
      if (space.startTime < hoyTimestamp) {
        console.log(`Espacio ${space.key} ocupado desde día anterior (${new Date(space.startTime).toLocaleDateString()}) → liberando`);

        // Liberar localmente
        space.occupied = false;
        space.clientId = null;
        space.startTime = null;
        space.hold = false;
        space.client = null;

        // Limpiar cliente local si existe
        if (space.clientId) {
          delete clients[space.clientId];
        }

        necesitaLiberar = true;
      }
    }
  });

  if (necesitaLiberar) {
    console.log('Espacios de días anteriores detectados → actualizando local y backend');

    // Actualizar subjects
    this.autolavadoService.spacesSubject.next({ ...spaces });
    this.autolavadoService.clientsSubject.next({ ...clients });
    this.autolavadoService.saveAll();

    // Liberar en backend (tu método ya limpia clientes también)
    this.autolavadoService.resetData().subscribe({
      next: () => {
        console.log('Backend sincronizado: espacios liberados');
        this.filterSpaces();
        this.cdr.detectChanges();
      },
      error: (err) => console.warn('Error sincronizando backend', err)
    });

    this.filterSpaces();
    this.cdr.detectChanges();
  } else {
    console.log('Todos los espacios ocupados son de hoy → nada que limpiar');
  }
}

private limpiarEspaciosDeDiasAnteriores(): void {
  const hoyInicio = new Date();
  hoyInicio.setHours(0, 0, 0, 0);
  const hoyTimestamp = hoyInicio.getTime();

  let necesitaLiberar = false;

  // Primero: verificar si hay algo que limpiar (esto es solo para log, no modifica nada)
  Object.values(this.autolavadoService.spacesSubject.value).forEach(space => {
    if (space.occupied && space.startTime && space.startTime < hoyTimestamp) {
      console.log(`Espacio ${space.key} ocupado desde día anterior → necesita reset completo`);
      necesitaLiberar = true;
    }
  });

  if (necesitaLiberar) {
    console.log('Días anteriores detectados → ejecutando reset completo (local + backend + recarga)');

    // Llamar al método completo: limpia local, backend y RECARGA todo fresco
    this.autolavadoService.resetData().subscribe({
      next: () => {
        console.log('Reset automático completado: espacios liberados y datos recargados');
        this.filterSpaces();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Error en reset automático', err);
        // Opcional: alert o toast
      }
    });
  } else {
    console.log('Todos los espacios ocupados son de hoy → nada que limpiar');
  }
}


private loadDataFromBackend01(): void {
  forkJoin({
    subsuelos: this.autolavadoService.loadSubsuelosFromBackend(),
    spaces: this.autolavadoService.loadSpacesFromBackend(),
    clients: this.autolavadoService.loadClientsFromBackend()  // ← NUEVO
  }).subscribe({
    next: ({ subsuelos, spaces, clients }) => {
      console.log('Datos cargados desde backend como respaldo');

      // Convertir spaces a mapa
      const spacesObj: { [key: string]: Space } = {};
      spaces.forEach(s => spacesObj[s.key] = s);

      // Convertir clients a mapa por ID real
      const clientsMap: { [key: string]: Client } = {};
      clients.forEach(c => clientsMap[c.id.toString()] = c);

      // ACTUALIZAR TODOS LOS SUBJECTS DEL SERVICIO
      this.autolavadoService.subsuelosSubject.next(subsuelos);
      this.autolavadoService.spacesSubject.next(spacesObj);
      this.autolavadoService.clientsSubject.next(clientsMap);  // ← NUEVO

      // Guardar todo en localStorage (sobrescribe lo viejo)
      this.autolavadoService.saveAll();

      // Establecer subsuelo actual
      if (subsuelos.length > 0) {
        this.autolavadoService.currentSubIdSubject.next(subsuelos[0].id);
      }

      console.log('Datos sincronizados desde backend → localStorage actualizado');
    },
    error: (err) => {
      console.error('Error cargando datos desde backend', err);
      alert('No hay conexión. Usando datos locales si existen...');
      // Si falla, el servicio ya cargó lo que había en localStorage
    }
  });
}


private loadDataFromBackend0(): void {
  forkJoin({
    subsuelos: this.autolavadoService.loadSubsuelosFromBackend(),
    spaces: this.autolavadoService.loadSpacesFromBackend(),
    clients: this.autolavadoService.loadClientsFromBackend()  // ← Agrega esto
  }).subscribe({
    next: ({ subsuelos, spaces, clients }) => {
      console.log('Datos cargados desde backend como respaldo');

      // Convertir spaces a mapa
      const spacesObj: { [key: string]: Space } = {};
      spaces.forEach(s => spacesObj[s.key] = s);

      // Convertir clients a mapa + CONVERTIR entryTimestamp a number
      const clientsMap: { [key: string]: Client } = {};
      clients.forEach(c => {
        if (c.entryTimestamp) {
          c.entryTimestamp = new Date(c.entryTimestamp).getTime();  // ← AQUÍ VA EL FRAGMENTO
        }
        clientsMap[c.id.toString()] = c;
      });

      // ACTUALIZAR LOS BEHAVIOR SUBJECTS DEL SERVICIO
      this.autolavadoService.subsuelosSubject.next(subsuelos);
      this.autolavadoService.spacesSubject.next(spacesObj);
      this.autolavadoService.clientsSubject.next(clientsMap);  // ← Con entryTimestamp ya convertido

      // Guardar en localStorage para próxima vez
      this.autolavadoService.saveAll();

      // Establecer subsuelo actual
      if (subsuelos.length > 0) {
        this.autolavadoService.currentSubIdSubject.next(subsuelos[0].id);
      }

      console.log('Datos sincronizados desde backend → localStorage actualizado');
    },
    error: (err) => {
      console.error('Error cargando datos desde backend', err);
      alert('No hay conexión. Usando datos locales si existen...');
    }
  });
}

private loadDataFromBackend(): void {
  forkJoin({
    subsuelos: this.autolavadoService.loadSubsuelosFromBackend(),
    spaces: this.autolavadoService.loadSpacesFromBackend(),
    clients: this.autolavadoService.loadClientsFromBackend()
  }).subscribe({
    next: ({ subsuelos, spaces, clients }) => {
      console.log('Datos cargados desde backend como respaldo');

      // Convertir spaces a mapa
      const spacesObj: { [key: string]: Space } = {};
      spaces.forEach(s => spacesObj[s.key] = s);

      // Convertir clients a mapa + CONVERTIR entryTimestamp a number
      const clientsMap: { [key: string]: Client } = {};
      clients.forEach(c => {
        // Convertir entryTimestamp de string (ISO) a number (timestamp)
        if (c.entryTimestamp && typeof c.entryTimestamp === 'string') {
          c.entryTimestamp = new Date(c.entryTimestamp).getTime();
        } else if (c.entryTimestamp && typeof c.entryTimestamp === 'object') {
          // Si es Date object (raro, pero por seguridad)
          c.entryTimestamp = (c.entryTimestamp as any).getTime();
        }
        // Si ya es number, lo dejamos como está

        clientsMap[c.id.toString()] = c;
      });

      // ACTUALIZAR LOS BEHAVIOR SUBJECTS
      this.autolavadoService.subsuelosSubject.next(subsuelos);
      this.autolavadoService.spacesSubject.next(spacesObj);
      this.autolavadoService.clientsSubject.next(clientsMap);

      // Guardar en localStorage con entryTimestamp como number
      this.autolavadoService.saveAll();

      // Subsuelo actual
      if (subsuelos.length > 0) {
        this.autolavadoService.currentSubIdSubject.next(subsuelos[0].id);
      }

      console.log('Datos sincronizados desde backend → localStorage actualizado');
    },
    error: (err) => {
      console.error('Error cargando datos desde backend', err);
      alert('No hay conexión. Usando datos locales si existen...');
    }
  });
}





openVehicleAside0(): void {
  this.showVehicleAside = true;
  document.body.classList.add('vehicle-aside-open');
  this.vehicleFilter = ''; // Limpiar filtro
}

openVehicleAside(): void {
  // 1. Cerrar el modal de reserva si está abierto
  const clientModalElement = document.getElementById('clientModal');
  if (clientModalElement) {
    this.clientModalInstance = bootstrap.Modal.getInstance(clientModalElement);
    if (this.clientModalInstance) {
      this.clientModalInstance.hide();
      console.log('Modal de reserva cerrado para abrir aside');
    }
  }

  // 2. Abrir el aside
  this.showVehicleAside = true;
  this.vehicleFilter = '';
}

// Cierra el aside
closeVehicleAside0(): void {
  this.showVehicleAside = false;

  // 3. Volver a abrir el modal de reserva si estaba abierto antes
  if (this.clientModalInstance) {
    this.clientModalInstance.show();
    console.log('Modal de reserva reabierto después de cerrar aside');
  }
}

closeVehicleAside(): void {
  this.showVehicleAside = false;
  console.log('Aside de vehículos cerrado');

  // Solo reabrir el modal de RESERVA si NO venimos del modal manual
  if (!this.isVehicleAsideFromManual && this.clientModalInstance) {
    this.clientModalInstance.show();
    console.log('Modal de RESERVA reabierto después de cerrar aside');
  } else if (this.isVehicleAsideFromManual) {
    console.log('No reabrimos modal de reserva porque venimos del modal manual');
  }

  // Resetear la bandera para la próxima vez
  this.isVehicleAsideFromManual = false;
}

onVehicleInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  const typed = input.value.trim();

  if (typed && !this.vehicles.some(v => v.model.toLowerCase() === typed.toLowerCase())) {
    // Si escribió algo que no existe → ofrecer agregar
    if (confirm(`"${typed}" no existe. ¿Agregar como nuevo?`)) {
      this.newVehicleModel = typed;
      this.showAddVehicleModal = true;
    }
  }
}


get filteredVehicles(): VehicleType[] {
  const term = this.vehicleFilter.toLowerCase().trim();
  return this.vehicles.filter(v => {
    const matchesText = !term ||
      v.model.toLowerCase().includes(term) ||
      v.category.toLowerCase().includes(term);

    const matchesCategory = !this.selectedVehicleCategory ||
      v.category === this.selectedVehicleCategory;

    return matchesText && matchesCategory;
  });
}

setVehicleCategoryFilter(category: string): void {
  this.selectedVehicleCategory =
    this.selectedVehicleCategory === category ? '' : category;
  this.currentVehiclePage = 1;
}

// Abre modal para agregar nuevo desde el aside
openAddVehicleModal(): void {
  this.newVehicleModel = '';
  this.newVehicleCategory = 'AUTO';
  this.newVehiclePrice = 35000;
  this.showAddVehicleModal = true;
}

// NUEVO MÉTODO: Cargar subsuelos y espacios desde backend como respaldo
openClientsAdminModal(): void {
  this.loadAllClientsFromBackend();
  const modal = new bootstrap.Modal(document.getElementById('clientsAdminModal')!);
  modal.show();
}

openClientsDb(): void {
  this.isClientsDbOpen = true;
  this.loadAllClientsFromBackend();
}

closeClientsDb(): void {
  this.isClientsDbOpen = false;
  this.searchTermClients = '';
  this.filteredClientsAdmin = [];
}


closeClientModal(): void {
  this.isClientModalOpen = false;
  this.clientForm.reset();
  this.whatsappLink = '';
  this.showClientVehiclesModal = false;
  this.showFrequentClientModal = false;

  if (this.iti) {
    this.iti.setCountry('ar');
    this.iti.setNumber('');
    this.updatePhoneInfo();
  }
}

private toTimestamp(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime();
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

private getCurrentClientIdentity(): { dni: string; phone: string; name: string } {
  const dni = (this.clientForm.get('dni')?.value || '').toString().trim();
  const phone = (this.clientForm.get('phone')?.value || '').toString().replace(/\D/g, '');
  const name = (this.clientForm.get('name')?.value || '').toString().trim().toLowerCase();
  return { dni, phone, name };
}

private matchesClientIdentity(client: Client, identity: { dni: string; phone: string; name: string }): boolean {
  const clientDni = (client.dni || '').toString().trim();
  const clientPhone = (client.phoneIntl || '').toString().replace(/\D/g, '');
  const clientName = (client.name || '').toString().trim().toLowerCase();

  if (identity.dni && clientDni) {
    return identity.dni === clientDni;
  }

  if (identity.phone && clientPhone) {
    return identity.phone === clientPhone;
  }

  if (identity.name && clientName) {
    return identity.name === clientName;
  }

  return false;
}

private getVisitsForCurrentClientThisMonth(): Client[] {
  const identity = this.getCurrentClientIdentity();
  if (!identity.dni && !identity.phone && !identity.name) return [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

  return (this.allClients || [])
    .filter(client => this.matchesClientIdentity(client, identity))
    .filter(client => {
      const ts = this.toTimestamp(client.entryTimestamp);
      return ts !== null && ts >= monthStart && ts < nextMonthStart;
    })
    .sort((a, b) => (this.toTimestamp(b.entryTimestamp) || 0) - (this.toTimestamp(a.entryTimestamp) || 0));
}

get frequentClientMonthlyVisitsCount(): number {
  return this.getVisitsForCurrentClientThisMonth().length;
}

get showFrequentClientButton(): boolean {
  return this.frequentClientMonthlyVisitsCount > 3;
}

openFrequentClientModal(): void {
  const visits = this.getVisitsForCurrentClientThisMonth();
  if (visits.length <= 3) return;
  this.frequentClientVisitsSnapshot = visits;
  this.showFrequentClientModal = true;
}

closeFrequentClientModal(): void {
  this.showFrequentClientModal = false;
}

private getCurrentClientVehiclesKey0 (): string {
  const dni = (this.clientForm.get('dni')?.value || '').toString().trim();
  const name = (this.clientForm.get('name')?.value || '').toString().trim().toLowerCase();

  if (dni) return `dni:${dni}`;
  if (name) return `name:${name}`;
  return `space:${this.selectedSpaceKey || 'temp'}`;
}

private getCurrentClientVehiclesKey(): string {
  const dni = (this.clientForm.get('dni')?.value || '').toString().trim();
  const name = (this.clientForm.get('name')?.value || '').toString().trim().toLowerCase();

  if (dni) return `dni:${dni}`;
  if (name) return `name:${name}`;

  // Fallback: timestamp + espacio + random corto (casi imposible colisión)
  const random = Math.random().toString(36).substring(2, 6);
  return `temp:${Date.now()}-${this.selectedSpaceKey || 'unknown'}-${random}`;
}

private persistCurrentClientVehicles(): void {
  const key = this.getCurrentClientVehiclesKey();
  if (this.clientVehiclesList.length === 0) {
    delete this.clientVehiclesStore[key];
    return;
  }
  this.clientVehiclesStore[key] = this.clientVehiclesList.map(v => ({ ...v }));
}

openClientVehiclesModal(): void {
  const key = this.getCurrentClientVehiclesKey();
  const stored = this.clientVehiclesStore[key] || [];
  this.clientVehiclesList = stored.map(v => ({ ...v }));
  this.clientVehicleEditor = { model: '', plate: '', notes: '' };
  this.editingClientVehicleIndex = null;

  const currentModel = (this.clientForm.get('vehicle')?.value || '').toString().trim();
  const currentPlate = (this.clientForm.get('plate')?.value || '').toString().trim();
  if (currentModel && this.clientVehiclesList.length === 0) {
    this.clientVehiclesList.push({
      model: currentModel,
      plate: currentPlate,
      notes: ''
    });
    this.persistCurrentClientVehicles();
  }

  this.showClientVehiclesModal = true;
}

closeClientVehiclesModal(): void {
  this.showClientVehiclesModal = false;
  this.clientVehicleEditor = { model: '', plate: '', notes: '' };
  this.editingClientVehicleIndex = null;
}

saveClientVehicleItem0(): void {
  const model = (this.clientVehicleEditor.model || '').trim();
  if (!model) {
    alert('Debes ingresar el modelo del vehículo.');
    return;
  }

  const payload: ClientVehicleItem = {
    model,
    plate: (this.clientVehicleEditor.plate || '').trim(),
    notes: (this.clientVehicleEditor.notes || '').trim()
  };

  if (this.editingClientVehicleIndex !== null) {
    this.clientVehiclesList[this.editingClientVehicleIndex] = payload;
  } else {
    if (this.clientVehiclesList.length >= 4) {
      alert('Solo se permiten hasta 4 vehículos por cliente.');
      return;
    }
    this.clientVehiclesList.push(payload);
  }

  this.persistCurrentClientVehicles();
  this.clientVehicleEditor = { model: '', plate: '', notes: '' };
  this.editingClientVehicleIndex = null;
}

saveClientVehicleItem(): void {
  const model = (this.clientVehicleEditor.model || '').trim();
  if (!model) {
    alert('Debes ingresar el modelo del vehículo.');
    return;
  }

  const payload: ClientVehicleItem = {
    model,
    plate: (this.clientVehicleEditor.plate || '').trim(),
    notes: (this.clientVehicleEditor.notes || '').trim()
  };

  if (this.editingClientVehicleIndex !== null) {
    this.clientVehiclesList[this.editingClientVehicleIndex] = payload;
  } else {
    if (this.clientVehiclesList.length >= 4) {
      alert('Solo se permiten hasta 4 vehículos por cliente.');
      return;
    }
    this.clientVehiclesList.push(payload);
  }

  // Persistir en el store
  const key = this.getCurrentClientVehiclesKey();
  this.clientVehiclesStore[key] = this.clientVehiclesList.map(v => ({ ...v }));
  console.log(`Vehículos actualizados en store para clave ${key}`);

  // Resetear editor
  this.clientVehicleEditor = { model: '', plate: '', notes: '' };
  this.editingClientVehicleIndex = null;
}

editClientVehicleItem(index: number): void {
  const item = this.clientVehiclesList[index];
  if (!item) return;
  this.clientVehicleEditor = { ...item };
  this.editingClientVehicleIndex = index;
}

deleteClientVehicleItem(index: number): void {
  const item = this.clientVehiclesList[index];
  if (!item) return;

  if (!confirm(`¿Eliminar el vehículo "${item.model}"?`)) return;
  this.clientVehiclesList.splice(index, 1);
  this.persistCurrentClientVehicles();

  if (this.editingClientVehicleIndex === index) {
    this.clientVehicleEditor = { model: '', plate: '', notes: '' };
    this.editingClientVehicleIndex = null;
  }
}

selectClientVehicleItem0(item: ClientVehicleItem): void {
  this.clientForm.patchValue({
    vehicle: item.model || '',
    plate: item.plate || this.clientForm.value.plate || ''
  });

  const selectedVehicleType = this.vehicles.find(v => v.model === item.model);
  if (selectedVehicleType) {
    this.clientForm.patchValue({ price: selectedVehicleType.price });
  }

  this.closeClientVehiclesModal();
}

selectClientVehicleItem(item: ClientVehicleItem): void {
  this.clientForm.patchValue({
    vehicle: item.model || '',
    plate: item.plate || this.clientForm.value.plate || ''
  });

  // Intentar cargar precio desde la lista de tipos de vehículos
  const selectedVehicleType = this.vehicles.find(v => v.model.toLowerCase() === item.model.toLowerCase());
  if (selectedVehicleType) {
    this.clientForm.patchValue({ price: selectedVehicleType.price });
  }

  this.closeClientVehiclesModal();

  this.toastService.showSuccess(`Vehículo cargado: ${item.model}`);
}

filterClientsAdmin(): void {
  if (!this.searchTermClients.trim()) {
    this.filteredClientsAdmin = this.allClients;
    return;
  }

  const term = this.searchTermClients.toLowerCase();
  this.filteredClientsAdmin = this.allClients.filter(client =>
    (client.name?.toLowerCase().includes(term)) ||
    (client.dni?.includes(term)) ||
    (client.phoneIntl?.includes(term)) ||
    (client.vehicle?.toLowerCase().includes(term)) ||
    (client.plate?.toLowerCase().includes(term)) ||
    (client.code?.toLowerCase().includes(term))
  );
}

clearSearchClients(): void {
  this.searchTermClients = '';
  this.filteredClientsAdmin = this.allClients;
}

exportClientsDbToExcel0(): void {
  const confirmed = confirm('¿Deseas exportar la base de datos de clientes a Excel?');
  if (!confirmed) return;

  const rows = this.allClients || [];
  const fileName = `base_datos_clientes_${new Date().toISOString().slice(0, 10)}.xls`;

  const escapeHtml = (value: any): string =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const tableRows = rows.map((client) => `
    <tr>
      <td>${escapeHtml(client.id)}</td>
      <td>${escapeHtml(client.code)}</td>
      <td>${escapeHtml(client.name)}</td>
      <td>${escapeHtml(client.dni)}</td>
      <td>${escapeHtml(client.phoneIntl)}</td>
      <td>${escapeHtml(client.vehicle)}</td>
      <td>${escapeHtml(client.plate)}</td>
      <td>${escapeHtml(client.category)}</td>
      <td>${escapeHtml(client.price)}</td>
      <td>${escapeHtml(client.paymentMethod)}</td>
      <td>${escapeHtml(client.spaceKey)}</td>
      <td>${escapeHtml(client.entryTimestamp)}</td>
      <td>${escapeHtml(client.exitTimestamp)}</td>
    </tr>
  `).join('');

  const htmlExcel = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>
              <th>ID</th>
              <th>Código</th>
              <th>Nombre</th>
              <th>DNI</th>
              <th>Teléfono</th>
              <th>Vehículo</th>
              <th>Matrícula</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Método Pago</th>
              <th>Espacio</th>
              <th>Ingreso</th>
              <th>Salida</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([htmlExcel], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  this.toastService.showSuccess('Base de datos exportada correctamente');
}

exportClientsDbToExcel(): void {
  const confirmed = confirm('¿Deseas exportar la base de datos de clientes a Excel?');
  if (!confirmed) return;

  const rows = this.allClients || [];

  // Preparar datos
  const data = rows.map(client => ({
    ID: client.id,
    Código: client.code,
    Nombre: client.name,
    DNI: client.dni,
    Teléfono: client.phoneIntl,
    Vehículo: client.vehicle,
    Matrícula: client.plate,
    Categoría: client.category,
    Precio: client.price,
    'Método Pago': client.paymentMethod,
    Espacio: client.spaceKey,
    Ingreso: client.entryTimestamp ? new Date(client.entryTimestamp).toLocaleString() : '-',
    Salida: client.exitTimestamp ? new Date(client.exitTimestamp).toLocaleString() : '-'
  }));

  // Crear hoja
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

  // Generar archivo
  const fileName = `base_datos_clientes_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);

  this.toastService.showSuccess('Base de datos exportada correctamente');
}

loadAllClientsFromBackend0(): void {
  this.autolavadoService.getAllClientsFromBackend().subscribe({
    next: (clients) => {
      this.allClients = clients;
      console.log('Todos los clientes cargados desde backend:', clients);
    },
    error: (err) => {
      console.error('Error cargando clientes desde backend', err);
      alert('No se pudieron cargar los clientes');
    }
  });
}

loadAllClientsFromBackend(): void {
  this.autolavadoService.getAllClientsFromBackend().subscribe({
    next: (clients) => {
      this.allClients = clients;
      this.filteredClientsAdmin = clients;
      console.log('Todos los clientes cargados desde backend:', clients);
    },
    error: (err) => {
      console.error('Error cargando clientes', err);
      alert('No se pudieron cargar los clientes');
    }
  });
}

getSpaceByKey(spaceKey: string | null): Space | undefined {
  if (!spaceKey) return undefined;
  return this.autolavadoService.spacesSubject.value[spaceKey];
}

formatDateOnly0(startTime: number | null): string {
  if (!startTime) return '-';
  const date = new Date(startTime);
  return date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

formatDateOnly(timestamp: number | null): string {
  if (!timestamp) return '-'; // Si ninguno existe → -

  const date = new Date(timestamp);
  return date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}



formatStartTime(startTime: number | null): string {
  if (!startTime) return '-';
  const date = new Date(startTime);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) + ', ' + date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  }) + ' hs';
}


formatDateWithTime(timestamp: number | null): string {
  if (!timestamp) return '-';

  const date = new Date(timestamp);
  return date.toLocaleString('es-AR', {
    weekday: 'short',          // lun, mar, etc.
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) + ' hs';
}

formatVisitDateLabel(timestamp: any): string {
  const ts = this.toTimestamp(timestamp);
  if (!ts) return '-';
  return this.formatDateWithTime(ts);
}

getTimeInSpace(startTime: number | null): string {
  if (!startTime) return '-';
  const diff = Date.now() - startTime;

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (hours > 0) {
    return `Hace ${hours}h ${minutes}min`;
  } else {
    return `Hace ${minutes}min`;
  }
}

editClient(client: Client): void {
  alert(`Función editar cliente ID ${client.id} - Puedes implementar un formulario aquí`);
  console.log('Editar cliente:', client);
  // Aquí puedes abrir otro modal con formulario para editar
}



deleteClient(clientId: any): void {
  if (confirm(`¿Eliminar cliente ID ${clientId}? Esto liberará el espacio que ocupa (si lo tiene).`)) {
    console.log('Iniciando eliminación del cliente ID:', clientId);

    this.autolavadoService.deleteClientFromBackend(clientId).subscribe({
      next: () => {
        console.log(`Cliente ${clientId} eliminado correctamente`);

        // La suscripción a clients$ ya actualiza allClients y filteredClientsAdmin automáticamente
        // Solo actualizamos la vista de espacios
        this.filterSpaces();
        this.cdr.detectChanges();

        alert('Cliente eliminado correctamente');
      },
      error: (err) => {
        console.error('Error eliminando cliente', err);
        alert('Error al eliminar cliente');
      }
    });
  }
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
    // Buscar cliente local primero
    let client = this.clients[space.clientId!];

    // Si no está en local, cargarlo desde backend
    if (!client && space.clientId) {
      this.autolavadoService.getClientFromBackend(space.clientId).subscribe({
        next: (serverClient) => {
          client = serverClient;
          this.selectedClient = client;
          this.updateOccupiedModal(client, space);
        },
        error: (err) => {
          console.warn('No se pudo cargar cliente desde backend', err);
          this.selectedClient = null;
        }
      });
    } else {
      this.selectedClient = client;
      this.updateOccupiedModal(client, space);
    }

    this.showModal('occupiedModal');
  } else {
    this.isClientModalOpen = true;
    this.clientForm.reset();
    this.whatsappLink = '';
    //this.showModal('clientModal');

    setTimeout(() => {
      if (this.iti && this.phoneInput?.nativeElement) {
        this.iti.setCountry('ar'); // Volver a Argentina por defecto
        this.iti.setNumber('');    // Limpiar número
        this.updatePhoneInfo();    // Actualizar visuales (bandera, código, país)
      }
    }, 300);

this.showModal('clientModal');

  }
}

private updateOccupiedModal(client: Client | null, space: Space): void {
  if (client) {
    this.whatsappLink = this.autolavadoService.buildWhatsAppLink(client, space);
    this.qrCaption = `${client.name} — ${client.code}`;
  } else {
    this.whatsappLink = '';
    this.qrCaption = '';
  }
}



saveClient0(): void {
  if (this.clientForm.invalid) {
    alert('Por favor completa todos los campos obligatorios.');
    return;
  }

  try {
    const currentVehicleModel = (this.clientForm.value.vehicle || '').toString().trim();
    if (currentVehicleModel) {
      const alreadyExists = this.clientVehiclesList.some(v => v.model.toLowerCase() === currentVehicleModel.toLowerCase());
      if (!alreadyExists && this.clientVehiclesList.length < 4) {
        this.clientVehiclesList.push({
          model: currentVehicleModel,
          plate: (this.clientForm.value.plate || '').toString().trim(),
          notes: ''
        });
      }
      this.persistCurrentClientVehicles();
    }

    const selectedVehicleModel = this.clientForm.value.vehicle;
    const selectedVehicle = this.vehicles.find(v => v.model === selectedVehicleModel);

    const category = selectedVehicle?.category || 'AUTO';
    const price = this.clientForm.value.price || selectedVehicle?.price || 35000;

    const localClientData = {
      ...this.clientForm.value,
      category,
      price
    };

    // GUARDAR EN LOCAL (genera tempId)
    const localClient = this.autolavadoService.saveClient(localClientData, this.selectedSpaceKey);
    const space = this.spaces[this.selectedSpaceKey];

    this.whatsappMessage = this.autolavadoService.buildWhatsAppMessage(localClient, space);
    this.whatsappLink = this.autolavadoService.buildWhatsAppLink(localClient, space);

    this.hasCopiedMessage = false;

    // DATOS PARA BACKEND
    const payload = {
      id: this.existingClientId || null,
      name: localClient.name,
      dni: localClient.dni || '',
      phoneRaw: localClient.phoneRaw,
      phoneIntl: localClient.phoneIntl,
      code: localClient.code,
      vehicle: localClient.vehicle,
      plate: localClient.plate,
      notes: localClient.notes,
      category: localClient.category,
      price: localClient.price,
      vehicleType: selectedVehicle ? { id: selectedVehicle.id } : null
    };

    console.log('Datos enviados al backend:', payload);

    this.autolavadoService.saveClientToBackend({
      spaceKey: this.selectedSpaceKey,
      payload: payload
    }).subscribe({
      next: (serverClient) => {
        console.log('Cliente reservado/actualizado en backend:', serverClient);

        const tempId = localClient.id;
        const realId = serverClient.id.toString();

        const clientsMap = this.autolavadoService.clientsSubject.value;

        // ELIMINAR tempId y GUARDAR con ID real como clave
        if (clientsMap[tempId]) {
          const clientToMove = { ...clientsMap[tempId], id: realId };
          delete clientsMap[tempId];
          clientsMap[realId] = clientToMove;

          this.autolavadoService.clientsSubject.next({ ...clientsMap });
          console.log(`Cliente movido de tempId ${tempId} a realId ${realId}`);
        }

        // Actualizar espacio con ID real
        space.clientId = realId;
        this.autolavadoService.spacesSubject.next({ ...this.spaces });

        // Guardar en localStorage con estructura correcta
        this.autolavadoService.saveAll();

        // Actualizar vista
        //this.calculateStats();
        this.filterSpaces();
        this.cdr.detectChanges();

        this.saveClientHeaderMessage = 'Cliente guardado exitosamente!';
        if (this.saveClientHeaderTimer) {
          clearTimeout(this.saveClientHeaderTimer);
        }
        this.saveClientHeaderTimer = setTimeout(() => {
          this.saveClientHeaderMessage = '';
          this.saveClientHeaderTimer = null;
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        console.warn('Error en backend (funciona offline)', err);
      }
    });
  } catch (error) {
    console.error('Error:', error);
    alert('Error al guardar cliente: ' + error);
  }
}

saveClient(): void {


    if (this.clientForm.invalid || !this.phoneIsValid) {
    alert('Por favor, completa todos los campos obligatorios correctamente.\n\nVerifica que el teléfono sea válido.');
    Object.keys(this.clientForm.controls).forEach(key => {
      this.clientForm.get(key)?.markAsTouched();
    });
    return;
  }

  try {
    const selectedVehicleModel = this.clientForm.value.vehicle;
    const selectedVehicle = this.vehicles.find(v => v.model === selectedVehicleModel);

    const category = selectedVehicle?.category || 'AUTO';
    const price = this.clientForm.value.price || selectedVehicle?.price || 35000;

const phoneIntl = this.clientForm.value.phone || ''; // Ahora SIEMPRE tendrá +53... o +54...
const phoneRaw = phoneIntl.replace(/^\+\d+/, '') || '';// 27783 (opcional)

    const localClientData = {
      ...this.clientForm.value,
      category,
      price,
      phoneIntl,
      phoneRaw,
      entryTimestamp: Date.now(),  // Siempre nueva hora de entrada
      exitTimestamp: null,
    };

    // GUARDAR EN LOCAL (genera tempId)
    const localClient = this.autolavadoService.saveClient(localClientData, this.selectedSpaceKey);
    const space = this.spaces[this.selectedSpaceKey];

    this.whatsappMessage = this.autolavadoService.buildWhatsAppMessage(localClient, space);
    this.whatsappLink = this.autolavadoService.buildWhatsAppLink(localClient, space);

    this.hasCopiedMessage = false;

    // DATOS PARA BACKEND
    const payload = {
      id: this.existingClientId || null,
      name: localClient.name,
      dni: localClient.dni || '',
      phoneRaw: localClient.phoneRaw,
      phoneIntl: localClient.phoneIntl,
      code: localClient.code,
      vehicle: localClient.vehicle,
      plate: localClient.plate,
      notes: localClient.notes,
      category: localClient.category,
      price: localClient.price,
      vehicleType: selectedVehicle ? { id: selectedVehicle.id } : null

    };

    console.log('Datos enviados al backend:', payload);

    this.autolavadoService.saveClientToBackend({
      spaceKey: this.selectedSpaceKey,
      payload: payload
    }).subscribe({
      next: (serverClient) => {
        console.log('Cliente reservado/actualizado en backend:', serverClient);

        const tempId = localClient.id;
        const realId = serverClient.id.toString();  // Siempre string para clave en mapa

        const clientsMap = this.autolavadoService.clientsSubject.value;

        // Mover cliente de tempId a realId
        if (clientsMap[tempId]) {
          const clientToMove = { ...clientsMap[tempId], id: realId };
          delete clientsMap[tempId];
          clientsMap[realId] = clientToMove;

          // Emitir nuevo mapa (crea nueva referencia para que Angular detecte cambio)
          this.autolavadoService.clientsSubject.next({ ...clientsMap });
          console.log(`Cliente movido de tempId ${tempId} a realId ${realId}`);
        }

        // Actualizar espacio con ID real
        space.clientId = realId;
        this.autolavadoService.spacesSubject.next({ ...this.spaces });

        // Guardar en localStorage con el ID real como clave
        this.autolavadoService.saveAll();

        // ACTUALIZAR VISTA INMEDIATAMENTE
        this.filterSpaces();  // ← Actualiza la grid de espacios
        //this.calculateStats();  // ← Actualiza estadísticas y filteredClients
        this.cdr.detectChanges();  // ← Fuerza renderizado inmediato

        alert('Cliente guardado exitosamente!');

        this.openWhatsApp();
      },
      error: (err) => {
        console.warn('Error en backend (funciona offline)', err);
      }
    });
  } catch (error) {
    console.error('Error:', error);
    alert('Error al guardar cliente: ' + error);
  }
}

saveClient1(): void {
  if (this.clientForm.invalid) {
    alert('Por favor completa todos los campos obligatorios.');
    return;
  }

  try {
    const selectedVehicleModel = this.clientForm.value.vehicle;
    const selectedVehicle = this.vehicles.find(v => v.model === selectedVehicleModel);

    const category = selectedVehicle?.category || 'AUTO';
    const price = this.clientForm.value.price || selectedVehicle?.price || 35000;

    const fullPhone = this.iti.getNumber(); // Número completo con + y código correcto
    const localPhone = this.iti.getNumber().replace('+' + this.iti.getSelectedCountryData().dialCode, ''); // Número local

    const localClientData = {
      ...this.clientForm.value,
      category,
      price,
      phoneIntl: fullPhone,
      phoneRaw: localPhone
    };

    // GUARDAR EN LOCAL (genera tempId)
    const localClient = this.autolavadoService.saveClient(localClientData, this.selectedSpaceKey);
    const space = this.spaces[this.selectedSpaceKey];

    this.whatsappMessage = this.autolavadoService.buildWhatsAppMessage(localClient, space);
    this.whatsappLink = this.autolavadoService.buildWhatsAppLink(localClient, space);

    this.hasCopiedMessage = false;

    // DATOS PARA BACKEND
    const payload = {
      id: this.existingClientId || null,
      name: localClient.name,
      dni: localClient.dni || '',
      phoneRaw: localClient.phoneRaw,
      phoneIntl: localClient.phoneIntl,
      code: localClient.code,
      vehicle: localClient.vehicle,
      plate: localClient.plate,
      notes: localClient.notes,
      category: localClient.category,
      price: localClient.price,
      vehicleType: selectedVehicle ? { id: selectedVehicle.id } : null
    };

    console.log('Datos enviados al backend:', payload);

    this.autolavadoService.saveClientToBackend({
      spaceKey: this.selectedSpaceKey,
      payload: payload
    }).subscribe({
      next: (serverClient) => {
        console.log('Cliente reservado/actualizado en backend:', serverClient);

        const tempId = localClient.id;
        const realId = serverClient.id.toString();

        const clientsMap = this.autolavadoService.clientsSubject.value;

        // Reemplazar tempId por ID real
        if (clientsMap[tempId]) {
          const clientToMove = { ...clientsMap[tempId], id: realId };
          delete clientsMap[tempId];
          clientsMap[realId] = clientToMove;

          this.autolavadoService.clientsSubject.next({ ...clientsMap });
          console.log(`Cliente movido de tempId ${tempId} a realId ${realId}`);
        }

        // Actualizar espacio con ID real
        space.clientId = realId;
        this.autolavadoService.spacesSubject.next({ ...this.spaces });

        // Guardar en localStorage
        this.autolavadoService.saveAll();

        // Actualizar vista
        this.filterSpaces();
        this.cdr.detectChanges();

        alert('Cliente guardado exitosamente!');
        this.openWhatsApp();
      },
      error: (err) => {
        console.warn('Error en backend (funciona offline)', err);
      }
    });
  } catch (error) {
    console.error('Error:', error);
    alert('Error al guardar cliente: ' + error);
  }
}


onVehicleSelected0(event: Event): void {
  const select = event.target as HTMLSelectElement;
  const selectedModel = select.value;

  if (!selectedModel) {
    this.clientForm.patchValue({ price: 0 });
    return;
  }

  const selectedVehicle = this.vehicles.find(v => v.model === selectedModel);

  if (selectedVehicle) {
    // Carga el precio por defecto
    this.clientForm.patchValue({ price: selectedVehicle.price });

    console.log('🚗 Vehículo seleccionado:', {
      modelo: selectedVehicle.model,
      categoria: selectedVehicle.category,
      precioPorDefecto: selectedVehicle.price
    });
  }
}


onVehicleSelected(event: Event): void {
  const select = event.target as HTMLSelectElement;
  const selectedModel = select.value.trim();

  // Si no hay selección o es el placeholder, resetear precio
  if (!selectedModel || selectedModel === '') {
    this.clientForm.patchValue({ price: 0 });
    return;
  }

  const selectedVehicle = this.vehicles.find(v => v.model === selectedModel);

  if (selectedVehicle) {
    // Vehículo existe → cargar precio
    this.clientForm.patchValue({ price: selectedVehicle.price });
    console.log('Vehículo existente seleccionado:', selectedVehicle.model);
  } else {
    // Vehículo NO existe → ofrecer agregar nuevo
    if (confirm(`El modelo "${selectedModel}" no existe. ¿Quieres agregarlo ahora?`)) {
      this.newVehicleModel = selectedModel; // Prellenar con lo que escribió
      this.showNewVehicleModal = true;
    } else {
      // Si no quiere agregar, limpiar selección
      select.value = '';
      this.clientForm.patchValue({ vehicle: '', price: 0 });
    }
  }
}




saveNewVehicle(): void {
  if (!this.newVehicleModel.trim()) {
    alert('Debes ingresar un modelo');
    return;
  }

  const payload = {
    model: this.newVehicleModel.trim(),
    category: this.newVehicleCategory,
    price: this.newVehiclePrice
  };

  console.log('Enviando nuevo vehículo al backend:', payload); // ← Log clave

  this.autolavadoService.createVehicleType(payload).subscribe({
    next: (newType) => {
      console.log('Nuevo tipo creado:', newType);
      this.vehicles.push(newType);
      this.vehicles.sort((a, b) => a.model.localeCompare(b.model));
      this.showAddVehicleModal = false;

      this.clientForm.patchValue({
        vehicle: newType.model,
        price: newType.price
      });

      this.toastService.showSuccess(`Vehículo "${newType.model}" agregado`);
    },
    error: (err) => {
      console.error('Error creando vehículo:', err);
      alert('Error al agregar el vehículo');
    }
  });
}


updatePriceFromCategory(): void {
  switch (this.newVehicleCategory) {
    case 'SUV':
      this.newVehiclePrice = 40000;
      break;
    case 'AUTO':
      this.newVehiclePrice = 35000;
      break;
    case 'PICKUP':
      this.newVehiclePrice = 70000;
      break;
    case 'ALTO PORTE':
      this.newVehiclePrice = 100000;
      break;
    case 'MOTO':
      this.newVehiclePrice = 35000;
      break;
    default:
      this.newVehiclePrice = 35000;
  }
}


deleteVehicle(id: number, event: Event): void {
  event.stopPropagation(); // Evita que se seleccione la fila al pulsar eliminar

  if (!confirm('¿Eliminar este tipo de vehículo permanentemente?')) return;

  this.autolavadoService.deleteVehicleType(id).subscribe({
    next: () => {
      this.vehicles = this.vehicles.filter(v => v.id !== id);
      this.toastService.showSuccess('Vehículo eliminado');
    },
    error: (err) => {
      alert('Error al eliminar vehículo');
      console.error(err);
    }
  });
}

selectVehicle0(vehicle: VehicleType): void {
  this.clientForm.patchValue({
    vehicle: vehicle.model,
    price: vehicle.price
  });
  this.toastService.showSuccess(`Vehículo seleccionado: ${vehicle.model}`);
  this.closeVehicleAside(); // Opcional: cerrar aside al seleccionar
}




// Cerrar modal sin guardar
closeNewVehicleModal(): void {
  this.showNewVehicleModal = false;
  this.newVehicleModel = '';
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

    //this.hasCopiedMessageOccupied = false
    this.hasCopiedMessage = false;
    // No cerramos el modal aquí
  }
}

launchWhatsAppRelease0(): void {
  if (!this.selectedClient || !this.whatsappMessageOccupied) return;
  if (!this.hasCopiedMessageOccupied) return;

  const phone = this.selectedClient.phoneIntl;
  const message = this.whatsappMessageOccupied;
  const encoded = encodeURIComponent(message);
  const link = `whatsapp://send?phone=${phone}&text=${encoded}`;

  window.open(link, '_blank');
  const sentSpaceKey = this.selectedSpace?.key || this.selectedSpaceKey;
  if (sentSpaceKey) {
    this.sentReleaseWhatsappBySpace.add(sentSpaceKey);
  }

  this.hasCopiedMessageOccupied = false;
}

launchWhatsAppRelease(): void {
  if (!this.selectedClient || !this.whatsappMessageOccupied) return;
  if (!this.hasCopiedMessageOccupied) return;

  const phone = this.selectedClient.phoneIntl.replace(/\D/g, ''); // Limpia el número
  const message = this.whatsappMessageOccupied;
  const encoded = encodeURIComponent(message);
  const link = `whatsapp://send?phone=${phone}&text=${encoded}`;

  // Abrir WhatsApp
  window.open(link, '_blank');

  // Marcar como enviado y persistir
  const sentSpaceKey = this.selectedSpace?.key || this.selectedSpaceKey;
  if (sentSpaceKey) {
    this.sentReleaseWhatsappBySpace.add(sentSpaceKey);
    this.saveSentWhatsappState(); // Guardar en localStorage
  }

  this.hasCopiedMessageOccupied = false;

  // Cerrar modal WhatsApp
  //this.closeWhatsAppModalOccupied();
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


  releaseSpace0(): void {
    if (confirm(`¿Liberar espacio ${this.selectedSpaceKey}?`)) {
      this.autolavadoService.releaseSpace(this.selectedSpaceKey);
      this.hideModal('occupiedModal');
    }
  }

  releaseSpace1(): void {
  if (confirm(`¿Liberar espacio ${this.selectedSpace?.displayName || this.selectedSpaceKey}?`)) {
    this.autolavadoService.releaseSpace(this.selectedSpaceKey).subscribe({
      next: () => {
        console.log('Espacio liberado y datos sincronizados');
        this.filterSpaces();
        this.cdr.detectChanges();
        this.hideModal('occupiedModal');
        alert('Espacio liberado correctamente');
      },
      error: (err) => {
        console.warn('Error liberando espacio', err);
        alert('Liberado localmente. Se sincronizará con conexión.');
        this.hideModal('occupiedModal');
      }
    });
  }
}

releaseSpace(): void {
  if (confirm(`¿Liberar espacio ${this.selectedSpace?.displayName || this.selectedSpaceKey}?`)) {
    this.autolavadoService.releaseSpace(this.selectedSpaceKey).subscribe({
      next: () => {
        console.log('Espacio liberado y datos sincronizados');

        const spaceKey = this.selectedSpace?.key || this.selectedSpaceKey;
        if (spaceKey && this.sentReleaseWhatsappBySpace.has(spaceKey)) {
          this.sentReleaseWhatsappBySpace.delete(spaceKey);
          this.saveSentWhatsappState(); // Actualizar persistencia
        }

        // Si había cliente, generar mensaje de liberación y abrir modal
        if (this.selectedClient) {
          this.whatsappMessageOccupied = this.autolavadoService.buildWhatsAppMessageRelease(this.selectedClient);
          this.hasCopiedMessageOccupied = false;
          this.showWhatsAppModalOccupied = true;  // ← ABRIR MODAL AUTOMÁTICAMENTE
        }


        this.filterSpaces();
        this.cdr.detectChanges();
        this.hideModal('occupiedModal');


        alert('Espacio liberado correctamente');
      },
      error: (err) => {
        console.warn('Error liberando espacio', err);
        alert('Liberado localmente. Se sincronizará con conexión.');
        this.hideModal('occupiedModal');
      }
    });
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
    this.sentReleaseWhatsappBySpace.clear();
    localStorage.removeItem(this.WHATSAPP_SENT_KEY);
    this.filterSpaces();
    this.cdr.detectChanges();
  }
}

cerrarDia0(): void {
  const hoy = new Date().toLocaleDateString('es-AR');
  if (confirm(`¿Cerrar el día ${hoy}?\n\nEsto hará:\n• Liberar todos los espacios\n• Eliminar todos los clientes del día\n• Limpiar la base de datos\n\n¡No se podrá deshacer!`)) {
    console.log('Cerrando día y limpiando todo...');

    this.autolavadoService.resetData().subscribe({
      next: () => {
        console.log('Día cerrado: todo limpiado local y backend');
        this.filterSpaces();
        this.cdr.detectChanges();
        alert(`Día ${hoy} cerrado correctamente.\nListo para mañana.`);
      },
      error: (err: any) => {
        console.warn('Error cerrando día en backend', err);
        alert('Cerrado localmente. Se sincronizará cuando haya conexión.');
      }
    });
  }
}

openCerrarDiaModal(): void {
  const hoy = new Date().toLocaleDateString('es-AR');
  this.cerrarDiaModalMessage =
    `Cerrar el día ${hoy}?\n
    - Esto liberará todos los espacios.\n
    - Los clientes se mantendrán en el histórico.\n
    - Haga el reporte antes de ejecutar esta acción o perderá los servicios del día.\n
    Continuar?`;
  this.showModal('closeDayModal');
}

confirmCerrarDia(): void {
  this.hideModal('closeDayModal');
  this.cerrarDia();
}

cerrarDia(): void {
  const hoy = new Date().toLocaleDateString('es-AR');
  console.log('Iniciando cierre del dia...');

  this.autolavadoService.resetData().subscribe({
    next: () => {
      console.log('Dia cerrado correctamente');
      this.sentReleaseWhatsappBySpace.clear();
      localStorage.removeItem(this.WHATSAPP_SENT_STORAGE_KEY);

      // Actualizar vista
      this.filterSpaces();
      this.cdr.detectChanges();

      this.cerrarDiaResultMessage =
        `Dia ${hoy} cerrado.\nTodos los espacios estan libres.\nDatos sincronizados con el servidor.`;
      this.showModal('closeDayResultModal');
    },
    error: (err) => {
      console.warn('Error en el cierre del dia', err);
      this.cerrarDiaResultMessage =
        'Cerrado localmente. Intenta de nuevo cuando haya conexion.';
      this.showModal('closeDayResultModal');
    }
  });
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


transferSpace0(): void {
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

transferSpace(): void {
  if (confirm(`¿Transferir espacio ${this.selectedSpaceKey} a otro subsuelo?`)) {
    const newSubsuelo = prompt('Ingresa el ID del subsuelo destino (ej. SUB2):', '');
    if (newSubsuelo && newSubsuelo !== this.selectedSpace?.subsueloId) {
      try {
        // Transferir localmente (tu lógica actual)
        this.autolavadoService.transferSpace(this.selectedSpaceKey, newSubsuelo);

        // Transferir en backend
        this.autolavadoService.transferSpaceInBackend(this.selectedSpaceKey, newSubsuelo).subscribe({
          next: () => {
            console.log('Espacio transferido en backend');
            this.filterSpaces();
            this.cdr.detectChanges();
            alert('Espacio transferido exitosamente!');
          },
          error: (err) => {
            console.warn('Error transferiendo en backend (funciona offline)', err);
            alert('Transferido localmente. Se sincronizará cuando haya conexión.');
          }
        });
      } catch (error: any) {
        alert('Error al transferir espacio: ' + error.message);
      }
    }
  }
}


openWhatsAppModalOccupied0(): void {
  if (this.selectedClient && this.selectedSpace) {
    this.whatsappMessageOccupied = this.autolavadoService.buildWhatsAppMessage(this.selectedClient, this.selectedSpace);
    this.showWhatsAppModalOccupied = true;
  }
}

openWhatsAppModalOccupied(): void {
  if (this.selectedClient && this.selectedSpace) {
    this.whatsappMessageOccupied = this.autolavadoService.buildWhatsAppMessageRelease(this.selectedClient);
    this.hasCopiedMessageOccupied = false;
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

copyMessageOccupied01(): void {
  navigator.clipboard.writeText(this.whatsappMessageOccupied).then(() => {
    this.hasCopiedMessageOccupied = true;

    // Guardar en el Set y persistir
    if (this.selectedSpace?.key) {
      this.sentReleaseWhatsappBySpace.add(this.selectedSpace.key);
      this.saveSentWhatsappState(); // ← Persistir en localStorage
    }

    // Toast de éxito (tu código actual)
    const toastEl = document.getElementById('copyToast');
    if (toastEl) {
      const toast = new bootstrap.Toast(toastEl);
      toast.show();
    }
  }).catch(err => {
    console.error('Error copying message:', err);
    alert('Error al copiar mensaje');
  });
}

isReleaseMessageSentForSpace(space: Space): boolean {
  if (!space?.key) return false;
  return this.sentReleaseWhatsappBySpace.has(space.key);
}





}
