import { TestBed } from '@angular/core/testing';

import { AutolavadoService } from './autolavado.service';

describe('AutolavadoService', () => {
  let service: AutolavadoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AutolavadoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
