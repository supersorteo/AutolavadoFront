import { Injectable } from '@angular/core';

declare var QRCode: any;

@Injectable({
  providedIn: 'root'
})
export class QrService {

  generateQR(elementId: string, text: string, size: number = 192): void {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.innerHTML = '';
    const qr = new QRCode(element, {
      width: size,
      height: size,
      colorDark: '#000000',
      colorLight: '#ffffff'
    });
    qr.makeCode(text);
  }

  downloadQR(elementId: string, filename: string = 'qr.png'): void {
    const element = document.getElementById(elementId);
    const table = element?.querySelector('table');
    if (!table) return;

    const size = table.offsetWidth;
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const cellSize = size / table.rows.length;

    for (let r = 0; r < table.rows.length; r++) {
      for (let c = 0; c < table.rows[r].cells.length; c++) {
        const cell = table.rows[r].cells[c] as HTMLElement;
        const bg = cell.style.backgroundColor || '#ffffff';
        ctx.fillStyle = bg;
        ctx.fillRect(
          c * cellSize * scale,
          r * cellSize * scale,
          cellSize * scale,
          cellSize * scale
        );
      }
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
