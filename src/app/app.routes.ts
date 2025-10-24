import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ProgramacionLinealComponent } from './components/programacion-lineal/programacion-lineal.component';
import { AdministracionProyectosComponent } from './components/administracion-proyectos/administracion-proyectos.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'programacion-lineal', component: ProgramacionLinealComponent },
  { path: 'administracion-proyectos', component: AdministracionProyectosComponent },
  { path: '**', redirectTo: '/dashboard' }
];
