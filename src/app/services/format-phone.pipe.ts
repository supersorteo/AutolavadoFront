import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatPhone',
  standalone: true // ← Importante para standalone components (Angular 17+)
})
export class FormatPhonePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '-';

    // Si ya empieza con +, lo dejamos como está
    if (value.startsWith('+')) {
      return value;
    }

    // Si no tiene +, lo agregamos (fallback)
    return '+' + value;
  }
}
