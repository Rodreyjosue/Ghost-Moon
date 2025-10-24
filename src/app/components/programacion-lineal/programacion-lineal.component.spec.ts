import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProgramacionLinealComponent } from './programacion-lineal.component';

describe('ProgramacionLinealComponent', () => {
  let component: ProgramacionLinealComponent;
  let fixture: ComponentFixture<ProgramacionLinealComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgramacionLinealComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProgramacionLinealComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
