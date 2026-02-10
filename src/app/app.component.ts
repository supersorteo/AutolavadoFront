import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SpacesComponent } from "./componentes/spaces/spaces.component";
import { ReportsComponent } from "./componentes/reports/reports.component";
import { ArribaComponent } from "./componentes/arriba/arriba.component";
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SpacesComponent, ReportsComponent, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Gestión de Autolavado-Parking — Bosquejo';
  isLoggedIn = false;
  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;
  showPassword = false;
  isCheckingAuth = true;
  //private apiUrl = "http://localhost:8080";
  private apiUrl = "https://excellsiorback-production.up.railway.app"
  token = '';

  constructor(private http: HttpClient) {
      this.checkAuth();

  }

private checkAuth() {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      this.token = savedToken;
      this.verifyToken();
    } else {
      this.isCheckingAuth = false; // Sin token → mostrar login
    }
  }



login() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Ingresá usuario y contraseña';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.http.post(`${this.apiUrl}/api/auth/login`, {
      username: this.username,
      password: this.password

    }).subscribe({
      next: (response: any) => {
        this.token = response.token;
        this.username = response.username;
        localStorage.setItem('token', this.token);
        localStorage.setItem('username', this.username);
        this.isLoggedIn = true;
        this.isCheckingAuth = false;
        this.isLoading = false;
        //this.username = '';
        this.password = '';
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Credenciales inválidas';
        this.isLoading = false;
      }
    });
  }


  private verifyToken() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
    this.http.get(`${this.apiUrl}/api/auth/users`, { headers }).subscribe({
      next: () => {
        this.isLoggedIn = true;
        this.isCheckingAuth = false;

      },
      error: () => {
        this.logout();
        this.isCheckingAuth = false;
      }
    });
  }


  private tryLogin(username: string, password: string, silent: boolean = false) {
    if (!silent) {
      this.isLoading = true;
      this.errorMessage = '';
    }

    const authHeader = 'Basic ' + btoa(username + ':' + password);

    this.http.get(`${this.apiUrl}/api/auth/users`, {
      headers: { Authorization: authHeader }
    }).subscribe({
      next: () => {
        this.isLoggedIn = true;
        this.isCheckingAuth = false;
        this.username = username;
        localStorage.setItem('auth', JSON.stringify({ username, password }));
       /* if (!silent) {
          alert('¡Bienvenido de nuevo!');
        }*/
      },
      error: (err) => {
        this.isLoading = false;
        this.isCheckingAuth = false;
        this.errorMessage = 'Sesión expirada o credenciales inválidas. Iniciá sesión nuevamente.';
        localStorage.removeItem('auth');
      }
    });
  }



logout() {
    this.isLoggedIn = false;
    this.token = '';
    this.username = '';
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    this.isCheckingAuth = false;
  }

}
