import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Report } from '../../models/autolavado.model';



@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports-list.component.html',
  styleUrl: './reports-list.component.scss'
})
export class ReportsListComponent implements OnInit{

  reports: Report[] = [];
  private apiBase = 'http://localhost:8080/api';

   constructor(private http: HttpClient) {}

   ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.http.get<Report[]>(`${this.apiBase}/reports`).subscribe({
      next: (data) => {
        this.reports = data;
        console.log('Reportes recibidos:', data);
      },
      error: (error) => {
        console.error('Error loading reports', error);
      alert('Error al cargar reportes: ' + error.message + '. Verifica backend.');
      this.reports = [];
      }
    });
  }

  viewReport(id: number): void {
    this.http.get<Report>(`${this.apiBase}/reports/${id}`).subscribe({
      next: (report) => {
        // Aquí puedes mostrar detalles o descargar (ej. generar HTML como en generateReport)
        console.log('Reporte detallado:', report);
        alert('Reporte ID ' + id + ' cargado. Implementa visualización.');
      },
      error: (error) => {
        console.error('Error viewing report', error);
      }
    });
  }

  deleteReport(id: number): void {
    if (confirm('¿Eliminar reporte ID ' + id + '?')) {
      this.http.delete<void>(`${this.apiBase}/reports/${id}`).subscribe({
        next: () => {
          this.loadReports(); // Reload list
          alert('Reporte eliminado.');
        },
        error: (error) => {
          console.error('Error deleting report', error);
          alert('Error al eliminar.');
        }
      });
    }
  }

  refreshReports(): void {
  this.loadReports();
}

}
