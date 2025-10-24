import { Component, OnInit, AfterViewInit, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Actividad {
  id: string;
  nombre: string;
  duracion: number;
  predecesoras: string[];
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  holgura: number;
  esCritica: boolean;
}

interface Proyecto {
  nombre: string;
  actividades: Actividad[];
  duracionTotal: number;
  rutaCritica: string[];
}

interface NodoRed {
  actividad: Actividad;
  x: number;
  y: number;
  esCritica: boolean;
}

interface ConexionRed {
  from: string;
  to: string;
  esCritica: boolean;
}

@Component({
  selector: 'app-administracion-proyectos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './administracion-proyectos.component.html',
  styleUrls: ['./administracion-proyectos.component.css']
})
export class AdministracionProyectosComponent implements OnInit, AfterViewInit, OnDestroy {
  proyecto: Proyecto = {
    nombre: 'Proyecto de Expansión',
    actividades: [],
    duracionTotal: 0,
    rutaCritica: []
  };

  nuevaActividad: Omit<Actividad, 'id' | 'earlyStart' | 'earlyFinish' | 'lateStart' | 'lateFinish' | 'holgura' | 'esCritica'> = {
    nombre: '',
    duracion: 0,
    predecesoras: []
  };

  proyectoPredefinido = {
    nombre: 'Expansión de Almacén',
    actividades: [
      { id: 'A', nombre: 'Análisis espacio disponible', duracion: 2, predecesoras: [] },
      { id: 'B', nombre: 'Cotización materiales', duracion: 3, predecesoras: ['A'] },
      { id: 'C', nombre: 'Diseño distribución', duracion: 4, predecesoras: ['A'] },
      { id: 'D', nombre: 'Compra materiales', duracion: 5, predecesoras: ['B', 'C'] },
      { id: 'E', nombre: 'Preparación área', duracion: 3, predecesoras: ['C'] },
      { id: 'F', nombre: 'Construcción estanterías', duracion: 4, predecesoras: ['D'] },
      { id: 'G', nombre: 'Instalación eléctrica', duracion: 2, predecesoras: ['E'] },
      { id: 'H', nombre: 'Montaje almacén', duracion: 3, predecesoras: ['F', 'G'] },
      { id: 'I', nombre: 'Pruebas y ajustes', duracion: 2, predecesoras: ['H'] },
      { id: 'J', nombre: 'Capacitación personal', duracion: 1, predecesoras: ['I'] }
    ]
  };

  mostrarRed = false;
  tablaExpandida = false;
  nuevaActividadPredecesoraId: string = '';
  predecesoraSeleccionada: { [key: string]: string } = {};
  componenteInicializado = false;
  calculando = false;

  // Optimizaciones
  private cacheNodos = new Map<string, { x: number, y: number }>();
  private cacheConexiones: ConexionRed[] = [];
  private actividadesMap = new Map<string, Actividad>();
  private sucesorasMap = new Map<string, Actividad[]>();
  private redNecesitaActualizacion = true;
  private frameId: any = null;

  constructor(private ngZone: NgZone) {}

  ngOnInit() {
    console.log('Componente inicializado');
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.componenteInicializado = true;
        this.cargarProyectoPredefinido();
      }, 0);
    });
  }

  ngOnDestroy() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
  }

  cargarProyectoPredefinido() {
    if (!this.componenteInicializado) {
      setTimeout(() => this.cargarProyectoPredefinido(), 100);
      return;
    }

    this.proyecto = {
      nombre: this.proyectoPredefinido.nombre,
      actividades: this.proyectoPredefinido.actividades.map(act => ({
        ...act,
        earlyStart: 0,
        earlyFinish: 0,
        lateStart: 0,
        lateFinish: 0,
        holgura: 0,
        esCritica: false
      })),
      duracionTotal: 0,
      rutaCritica: []
    };

    this.actualizarEstructurasDatos();
    setTimeout(() => this.calcularCPM(), 50);
  }

  private actualizarEstructurasDatos() {
    this.actividadesMap.clear();
    this.sucesorasMap.clear();
    
    this.proyecto.actividades.forEach(act => {
      this.actividadesMap.set(act.id, act);
      this.sucesorasMap.set(act.id, []);
    });

    this.proyecto.actividades.forEach(actividad => {
      actividad.predecesoras.forEach(predId => {
        const sucesoras = this.sucesorasMap.get(predId) || [];
        const sucesora = this.actividadesMap.get(actividad.id);
        if (sucesora) {
          sucesoras.push(sucesora);
          this.sucesorasMap.set(predId, sucesoras);
        }
      });
    });
  }

  agregarActividad() {
    if (this.nuevaActividad.nombre && this.nuevaActividad.duracion >= 0) {
      const nuevaId = this.generarNuevoId();
      const actividad: Actividad = {
        id: nuevaId,
        nombre: this.nuevaActividad.nombre,
        duracion: this.nuevaActividad.duracion,
        predecesoras: [...this.nuevaActividad.predecesoras],
        earlyStart: 0,
        earlyFinish: 0,
        lateStart: 0,
        lateFinish: 0,
        holgura: 0,
        esCritica: false
      };

      this.proyecto.actividades.push(actividad);
      this.actualizarEstructurasDatos();
      this.resetearFormulario();
      this.forzarActualizacionRed();
      
      setTimeout(() => this.calcularCPM(), 0);
    }
  }

  private generarNuevoId(): string {
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const idsExistentes = new Set(this.proyecto.actividades.map(a => a.id));
    
    for (let letra of letras) {
      if (!idsExistentes.has(letra)) return letra;
    }
    
    let numero = 1;
    while (idsExistentes.has(`A${numero}`)) numero++;
    return `A${numero}`;
  }

  eliminarActividad(id: string) {
    this.proyecto.actividades.forEach(act => {
      act.predecesoras = act.predecesoras.filter(p => p !== id);
    });
    this.proyecto.actividades = this.proyecto.actividades.filter(a => a.id !== id);
    
    this.actualizarEstructurasDatos();
    this.forzarActualizacionRed();
    setTimeout(() => this.calcularCPM(), 0);
  }

  calcularCPM() {
    if (this.proyecto.actividades.length === 0 || this.calculando) {
      this.mostrarRed = false;
      return;
    }

    this.calculando = true;
    this.ngZone.runOutsideAngular(() => {
      try {
        this.resetearCalculos();
        this.calcularEarlyTimesOptimizado();
        this.calcularLateTimesOptimizado();
        this.calcularHolgurasYRutaCritica();
        this.programarActualizacionRed();
      } catch (error) {
        console.error('Error en cálculo CPM:', error);
        this.ngZone.run(() => {
          this.mostrarRed = false;
          this.calculando = false;
        });
      }
    });
  }

  private resetearCalculos() {
    this.proyecto.actividades.forEach(act => {
      act.earlyStart = 0;
      act.earlyFinish = 0;
      act.lateStart = 0;
      act.lateFinish = 0;
      act.holgura = 0;
      act.esCritica = false;
    });
    this.proyecto.duracionTotal = 0;
    this.proyecto.rutaCritica = [];
  }

  private calcularEarlyTimesOptimizado() {
    const actividades = this.proyecto.actividades;
    const procesadas = new Set<string>();
    let iteracion = 0;
    const maxIteraciones = actividades.length * 2;

    while (procesadas.size < actividades.length && iteracion < maxIteraciones) {
      let progreso = false;

      for (const actividad of actividades) {
        if (procesadas.has(actividad.id)) continue;

        let todasProcesadas = true;
        for (const predId of actividad.predecesoras) {
          if (!procesadas.has(predId)) {
            todasProcesadas = false;
            break;
          }
        }

        if (actividad.predecesoras.length === 0 || todasProcesadas) {
          if (actividad.predecesoras.length === 0) {
            actividad.earlyStart = 0;
          } else {
            let maxEarlyFinish = 0;
            for (const predId of actividad.predecesoras) {
              const pred = this.actividadesMap.get(predId);
              if (pred && pred.earlyFinish > maxEarlyFinish) {
                maxEarlyFinish = pred.earlyFinish;
              }
            }
            actividad.earlyStart = maxEarlyFinish;
          }
          
          actividad.earlyFinish = actividad.earlyStart + actividad.duracion;
          procesadas.add(actividad.id);
          progreso = true;
        }
      }

      iteracion++;
      if (!progreso) break;
    }

    let maxDuracion = 0;
    for (const actividad of actividades) {
      if (actividad.earlyFinish > maxDuracion) {
        maxDuracion = actividad.earlyFinish;
      }
    }
    this.proyecto.duracionTotal = maxDuracion;
  }

  private calcularLateTimesOptimizado() {
    const actividades = this.proyecto.actividades;
    const procesadas = new Set<string>();
    let iteracion = 0;
    const maxIteraciones = actividades.length * 2;

    for (const actividad of actividades) {
      actividad.lateFinish = this.proyecto.duracionTotal;
      actividad.lateStart = this.proyecto.duracionTotal - actividad.duracion;
    }

    while (procesadas.size < actividades.length && iteracion < maxIteraciones) {
      let progreso = false;

      for (let i = actividades.length - 1; i >= 0; i--) {
        const actividad = actividades[i];
        if (procesadas.has(actividad.id)) continue;

        const sucesoras = this.sucesorasMap.get(actividad.id) || [];

        if (sucesoras.length === 0) {
          procesadas.add(actividad.id);
          progreso = true;
        } else {
          let todasProcesadas = true;
          for (const suc of sucesoras) {
            if (!procesadas.has(suc.id)) {
              todasProcesadas = false;
              break;
            }
          }

          if (todasProcesadas) {
            let minLateStart = Infinity;
            for (const suc of sucesoras) {
              if (suc.lateStart < minLateStart) {
                minLateStart = suc.lateStart;
              }
            }
            actividad.lateFinish = minLateStart;
            actividad.lateStart = actividad.lateFinish - actividad.duracion;
            procesadas.add(actividad.id);
            progreso = true;
          }
        }
      }

      iteracion++;
      if (!progreso) break;
    }
  }

  private calcularHolgurasYRutaCritica() {
    this.proyecto.actividades.forEach(actividad => {
      actividad.holgura = actividad.lateStart - actividad.earlyStart;
      actividad.esCritica = actividad.holgura === 0;
    });

    this.proyecto.rutaCritica = this.proyecto.actividades
      .filter(a => a.esCritica)
      .sort((a, b) => a.earlyStart - b.earlyStart)
      .map(a => a.id);
  }

  private programarActualizacionRed() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }

    this.frameId = requestAnimationFrame(() => {
      this.ngZone.run(() => {
        this.mostrarRed = true;
        this.calculando = false;
        this.redNecesitaActualizacion = false;
      });
    });
  }

  // DIAGRAMA DE RED OPTIMIZADO
  get nodosRedMejorados(): NodoRed[] {
    if (!this.componenteInicializado || this.proyecto.actividades.length === 0) {
      return [];
    }

    if (!this.redNecesitaActualizacion && this.cacheNodos.size > 0) {
      return this.obtenerNodosDesdeCache();
    }

    const actividadesPorColumna = this.agruparActividadesPorEarlyStart();
    const nodos: NodoRed[] = [];
    
    this.cacheNodos.clear();
    const columnas = Object.keys(actividadesPorColumna).sort((a, b) => parseInt(a) - parseInt(b));
    
    columnas.forEach((earlyStart, colIndex) => {
      const actividades = actividadesPorColumna[earlyStart];
      const totalEnColumna = actividades.length;
      
      actividades.forEach((actividad: Actividad, rowIndex: number) => {
        const x = colIndex * 120 + 40;
        const y = this.calcularPosicionY(rowIndex, totalEnColumna);
        
        this.cacheNodos.set(actividad.id, { x, y });
        
        nodos.push({
          actividad,
          x,
          y,
          esCritica: actividad.esCritica
        });
      });
    });
    
    return nodos;
  }

  private obtenerNodosDesdeCache(): NodoRed[] {
    const nodos: NodoRed[] = [];
    for (const actividad of this.proyecto.actividades) {
      const posicion = this.cacheNodos.get(actividad.id);
      if (posicion) {
        nodos.push({
          actividad,
          x: posicion.x,
          y: posicion.y,
          esCritica: actividad.esCritica
        });
      }
    }
    return nodos;
  }

  private agruparActividadesPorEarlyStart(): { [key: string]: Actividad[] } {
    const grupos: { [key: string]: Actividad[] } = {};
    
    for (const actividad of this.proyecto.actividades) {
      const key = actividad.earlyStart.toString();
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(actividad);
    }
    
    for (const key in grupos) {
      grupos[key].sort((a, b) => a.id.localeCompare(b.id));
    }
    
    return grupos;
  }

  private calcularPosicionY(rowIndex: number, totalEnColumna: number): number {
    const espacioVertical = 300;
    const espacioEntreNodos = 80;
    
    if (totalEnColumna === 1) return espacioVertical / 2 - 25;
    
    const startY = (espacioVertical - (totalEnColumna - 1) * espacioEntreNodos) / 2;
    return startY + rowIndex * espacioEntreNodos;
  }

  get conexionesRed(): ConexionRed[] {
    if (!this.componenteInicializado || this.proyecto.actividades.length === 0) {
      return [];
    }

    if (!this.redNecesitaActualizacion && this.cacheConexiones.length > 0) {
      return this.cacheConexiones;
    }

    const conexiones: ConexionRed[] = [];
    
    for (const actividad of this.proyecto.actividades) {
      for (const predecesoraId of actividad.predecesoras) {
        const predecesora = this.actividadesMap.get(predecesoraId);
        if (predecesora) {
          conexiones.push({
            from: predecesoraId,
            to: actividad.id,
            esCritica: actividad.esCritica && predecesora.esCritica
          });
        }
      }
    }

    this.cacheConexiones = conexiones;
    return conexiones;
  }

  getNodoXMejorado(id: string): number {
    const cached = this.cacheNodos.get(id);
    return cached ? cached.x : 0;
  }

  getNodoYMejorado(id: string): number {
    const cached = this.cacheNodos.get(id);
    return cached ? cached.y : 0;
  }

  private forzarActualizacionRed() {
    this.redNecesitaActualizacion = true;
    this.cacheNodos.clear();
    this.cacheConexiones = [];
  }

  // Métodos de UI
  get actividadesDisponiblesParaPredecesoras(): Actividad[] {
    return this.proyecto.actividades;
  }

  agregarPredecesora() {
    if (this.nuevaActividadPredecesoraId && 
        !this.nuevaActividad.predecesoras.includes(this.nuevaActividadPredecesoraId)) {
      this.nuevaActividad.predecesoras.push(this.nuevaActividadPredecesoraId);
      this.nuevaActividadPredecesoraId = '';
    }
  }

  eliminarPredecesora(index: number) {
    this.nuevaActividad.predecesoras.splice(index, 1);
  }

  agregarPredecesoraExistente(actividad: Actividad) {
    const predecesoraId = this.predecesoraSeleccionada[actividad.id];
    if (predecesoraId && !actividad.predecesoras.includes(predecesoraId) && actividad.id !== predecesoraId) {
      if (!this.creariaCiclo(actividad.id, predecesoraId)) {
        actividad.predecesoras.push(predecesoraId);
        this.actualizarEstructurasDatos();
        this.predecesoraSeleccionada[actividad.id] = '';
        this.forzarActualizacionRed();
        setTimeout(() => this.calcularCPM(), 0);
      }
    }
  }

  eliminarPredecesoraExistente(actividad: Actividad, predecesoraId: string) {
    actividad.predecesoras = actividad.predecesoras.filter(p => p !== predecesoraId);
    this.actualizarEstructurasDatos();
    this.forzarActualizacionRed();
    setTimeout(() => this.calcularCPM(), 0);
  }

  private creariaCiclo(actividadId: string, predecesoraId: string): boolean {
    if (actividadId === predecesoraId) return true;

    const visitadas = new Set<string>();
    const cola: string[] = [predecesoraId];
    
    while (cola.length > 0) {
      const actual = cola.shift()!;
      if (actual === actividadId) return true;
      
      if (!visitadas.has(actual)) {
        visitadas.add(actual);
        const actividadActual = this.actividadesMap.get(actual);
        if (actividadActual) {
          for (const pred of actividadActual.predecesoras) {
            if (!visitadas.has(pred)) cola.push(pred);
          }
        }
      }
    }
    return false;
  }

  getPredecesorasDisponiblesParaActividad(actividad: Actividad): Actividad[] {
    return this.proyecto.actividades.filter(a => 
      a.id !== actividad.id && !this.creariaCiclo(actividad.id, a.id)
    );
  }

  nuevoProyecto() {
    this.proyecto = {
      nombre: 'Nuevo Proyecto',
      actividades: [],
      duracionTotal: 0,
      rutaCritica: []
    };
    this.mostrarRed = false;
    this.tablaExpandida = false;
    this.predecesoraSeleccionada = {};
    this.resetearFormulario();
    this.actualizarEstructurasDatos();
    this.forzarActualizacionRed();
  }

  private resetearFormulario() {
    this.nuevaActividad = { nombre: '', duracion: 0, predecesoras: [] };
    this.nuevaActividadPredecesoraId = '';
  }

  toggleTablaExpandida() {
    this.tablaExpandida = !this.tablaExpandida;
  }

  // TrackBy functions para optimización
  trackByNodo(index: number, nodo: NodoRed): string {
    return nodo.actividad.id;
  }

  trackByConexion(index: number, conexion: ConexionRed): string {
    return `${conexion.from}-${conexion.to}`;
  }

  trackByActividad(index: number, actividad: Actividad): string {
    return actividad.id;
  }
}