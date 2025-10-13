import { Injectable } from '@angular/core';
import QRCode from 'qrcode-generator'; // Cambiar a import default

@Injectable({
  providedIn: 'root'
})
export class QrService {

  generateQR0(elementId: string, text: string): void {
    const qr = QRCode(0, 'M'); // Ahora funciona como función
    qr.addData(text);
    qr.make();
    const size = qr.getModuleCount();
    const canvas = document.createElement('canvas');
    canvas.width = size * 8;
    canvas.height = size * 8;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        ctx.fillStyle = qr.isDark(r, c) ? '#000000' : '#ffffff';
        ctx.fillRect(c * 8, r * 8, 8, 8);
      }
    }
    const container = document.getElementById(elementId);
    if (container) {
      container.innerHTML = '';
      container.appendChild(canvas);
    }
  }

  generateQR1(elementId: string, text: string): void {
  console.log('generateQR llamado', { elementId, text }); // Log para depurar
  const container = document.getElementById(elementId);
  if (!container) {
    console.error('Container #qrcode no encontrado');
    return;
  }

  const qr = QRCode(0, 'M');
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  const canvas = document.createElement('canvas');
  canvas.width = size * 8;
  canvas.height = size * 8;
  canvas.style.display = 'block'; // Asegurar visibilidad
  canvas.style.maxWidth = '100%'; // Responsivo
  const ctx = canvas.getContext('2d')!;
  if (!ctx) {
    console.error('No se pudo obtener contexto 2D');
    return;
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      ctx.fillStyle = qr.isDark(r, c) ? '#000000' : '#ffffff';
      ctx.fillRect(c * 8, r * 8, 8, 8);
    }
  }
  container.innerHTML = '';
  container.appendChild(canvas);
  console.log('QR generado y agregado al container');
}

generateQR(elementId: string, text: string): void {
  console.log('generateQR llamado', { elementId, text });
  const container = document.getElementById(elementId);
  if (!container) {
    console.error(`Container #${elementId} no encontrado`);
    return;
  }

  const qr = QRCode(0, 'M');
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  const canvas = document.createElement('canvas');
  canvas.width = size * 8;
  canvas.height = size * 8;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      ctx.fillStyle = qr.isDark(r, c) ? '#000000' : '#ffffff';
      ctx.fillRect(c * 8, r * 8, 8, 8);
    }
  }
  container.innerHTML = '';
  container.appendChild(canvas);
  console.log('QR generado y agregado al container');
}

  downloadQR(elementId: string, filename: string): void {
    const canvas = document.getElementById(elementId)?.querySelector('canvas') as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = filename;
      link.click();
    }
  }
}
