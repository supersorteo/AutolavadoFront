import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { Client, Space, Subsuelo } from '../../models/autolavado.model';
import { AutolavadoService } from '../../services/autolavado.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  subsuelos: Subsuelo[] = [];
  spaces: { [key: string]: Space } = {};
  clients: { [key: string]: Client } = {};
  filteredClients: any[] = [];
  searchTerm = '';

  totalSpaces = 0;
  occupiedSpaces = 0;
  freeSpaces = 0;
  occupancyRate = 0;

  subsueloStats: any[] = [];
  timeStats = {
    under1h: 0,
    between1h3h: 0,
    over3h: 0
  };

  pageSize = 5;
  currentPage = 1;
  currentClients!: Client[];

  constructor(private autolavadoService: AutolavadoService, private cdr: ChangeDetectorRef) {}


  ngOnInit(): void {
    combineLatest([
      this.autolavadoService.subsuelos$,
      this.autolavadoService.spaces$,
      this.autolavadoService.clients$,
      this.autolavadoService.filteredClients$
    ]).pipe(takeUntil(this.destroy$))
    .subscribe(([subsuelos, spaces, clients, filteredClients]) => {
      this.subsuelos = subsuelos;
      this.spaces = spaces;
      this.clients = clients;
      this.filteredClients = filteredClients;
      this.calculateStats();
      this.cdr.detectChanges();
    });

    setInterval(() => {
      this.calculateStats();
      this.cdr.detectChanges();
    }, 60000);
  }



  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private calculateStats(): void {
    const spacesArray = Object.values(this.spaces);

    // Estadísticas generales
    this.totalSpaces = spacesArray.length;
    this.occupiedSpaces = spacesArray.filter(s => s.occupied).length;
    this.freeSpaces = this.totalSpaces - this.occupiedSpaces;
    this.occupancyRate = this.totalSpaces > 0 ? Math.round((this.occupiedSpaces / this.totalSpaces) * 100) : 0;

    // Estadísticas por subsuelo
    this.subsueloStats = this.subsuelos.map(sub => {
      const subSpaces = spacesArray.filter(s => s.subsueloId === sub.id);
      const subOccupied = subSpaces.filter(s => s.occupied).length;
      const subTotal = subSpaces.length;
      const subFree = subTotal - subOccupied;
      const subOccupancyRate = subTotal > 0 ? Math.round((subOccupied / subTotal) * 100) : 0;

      return {
        id: sub.id,
        label: sub.label,
        total: subTotal,
        occupied: subOccupied,
        free: subFree,
        occupancyRate: subOccupancyRate
      };


    });

       this.currentClients = Object.values(this.clients).filter(client => {
      const space = this.spaces[client.spaceKey];
      return space && space.occupied;
    });

    // Estadísticas de tiempo
    const now = Date.now();
    this.timeStats = {
      under1h: 0,
      between1h3h: 0,
      over3h: 0
    };

    spacesArray.filter(s => s.occupied).forEach(space => {
      if (!space.startTime) return;

      const elapsedMs = now - space.startTime;
      const elapsedHours = elapsedMs / (1000 * 60 * 60);

      if (elapsedHours < 1) {
        this.timeStats.under1h++;
      } else if (elapsedHours <= 3) {
        this.timeStats.between1h3h++;
      } else {
        this.timeStats.over3h++;
      }
    });
  }

  getProgressBarClass(rate: number): string {
    if (rate < 50) return 'bg-success';
    if (rate < 80) return 'bg-warning';
    return 'bg-danger';
  }

  getElapsedTime(spaceKey: string): string {
    const space = this.spaces[spaceKey];
    return this.autolavadoService.elapsedFrom(space?.startTime);
  }

  onSearchClients(): void {
    this.autolavadoService.setSearchTerm(this.searchTerm);
    this.currentPage = 1;
  }

  get paginatedClients(): Client[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredClients.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredClients.length / this.pageSize);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const maxPages = 5;
    let start = Math.max(1, current - Math.floor(maxPages / 2));
    let end = Math.min(total, start + maxPages - 1);

    if (end - start + 1 < maxPages) {
      start = Math.max(1, end - maxPages + 1);
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  refreshStats(): void {
    this.calculateStats();
    this.cdr.detectChanges();
  }

  exportData(): void {
    const data = {
      timestamp: new Date().toISOString(),
      subsuelos: this.subsuelos,
      spaces: this.spaces,
      clients: this.clients,
      stats: {
        total: this.totalSpaces,
        occupied: this.occupiedSpaces,
        free: this.freeSpaces,
        occupancyRate: this.occupancyRate
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `exellssior_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  generateReport0(): void {
    const report = `
REPORTE EXELLSSIOR - ${new Date().toLocaleString()}
===================================================

RESUMEN GENERAL:
- Total de espacios: ${this.totalSpaces}
- Espacios ocupados: ${this.occupiedSpaces}
- Espacios libres: ${this.freeSpaces}
- Tasa de ocupación: ${this.occupancyRate}%

DETALLE POR SUBSUELO:
${this.subsueloStats.map(stat =>
  `- ${stat.label}: ${stat.occupied}/${stat.total} (${stat.occupancyRate}%)`
).join('\n')}

DISTRIBUCIÓN POR TIEMPO:
- Menos de 1 hora: ${this.timeStats.under1h} espacios
- Entre 1 y 3 horas: ${this.timeStats.between1h3h} espacios
- Más de 3 horas: ${this.timeStats.over3h} espacios

CLIENTES ACTIVOS (${this.filteredClients.length}):
${this.filteredClients.map(client =>
  `- ${client.name} (${client.code}) - ${client.spaceKey} - ${this.getElapsedTime(client.spaceKey)}`
).join('\n')}
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_exellssior_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

generateReport(): void {
  const reportHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte Exellsior - ${new Date().toLocaleString()}</title>
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
    .no-data { text-align: center; color: #94a3b8; font-style: italic; padding: 40px; }
  </style>
</head>
<body>
  <h1>Reporte Exellssior - ${new Date().toLocaleString()}</h1>

  <div class="section">
    <h2>Resumen General</h2>
    <div class="stats">
      <div class="stat-card">
        <div class="stat-number">${this.totalSpaces}</div>
        <div>Total Espacios</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color: #10b981;">${this.occupiedSpaces}</div>
        <div>Ocupados</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color: #3b82f6;">${this.freeSpaces}</div>
        <div>Libres</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color: #f59e0b;">${this.occupancyRate}%</div>
        <div>Ocupación</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Detalle por Subsuelo</h2>
    <table>
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
        ${this.subsueloStats.map(stat => `
          <tr>
            <td>${stat.label}</td>
            <td>${stat.total}</td>
            <td style="color: #ef4444;">${stat.occupied}</td>
            <td style="color: #10b981;">${stat.free}</td>
            <td>
              <div class="progress">
                <div class="progress-bar bg-${this.getProgressBarClass(stat.occupancyRate)}" style="width: ${stat.occupancyRate}%">
                  ${stat.occupancyRate}%
                </div>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Distribución por Tiempo</h2>
    <div class="time-stats">
      <div class="time-card">
        <div class="time-number" style="color: #10b981;">${this.timeStats.under1h}</div>
        <div>Menos de 1h</div>
      </div>
      <div class="time-card">
        <div class="time-number" style="color: #f59e0b;">${this.timeStats.between1h3h}</div>
        <div>1h - 3h</div>
      </div>
      <div class="time-card">
        <div class="time-number" style="color: #ef4444;">${this.timeStats.over3h}</div>
        <div>Más de 3h</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Clientes Activos (${this.filteredClients.length})</h2>
    ${this.filteredClients.length > 0 ? `
      <table>
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
          ${this.filteredClients.map(client => `
            <tr>
              <td><span style="background: #1e293b; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${client.code}</span></td>
              <td>${client.name}</td>
              <td style="color: #3b82f6;">${client.spaceKey}</td>
              <td>+${client.phoneIntl}</td>
              <td>${client.vehicle || '-'}</td>
              <td style="color: #f59e0b;">${this.getElapsedTime(client.spaceKey)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<div class="no-data">No hay clientes actualmente</div>'}
  </div>

  <script>
    // Auto-imprimir al cargar
    window.onload = function() { window.print(); };
  </script>
</body>
</html>
  `;

  const blob = new Blob([reportHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reporte_exellssior_${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

}
