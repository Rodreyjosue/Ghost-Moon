import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

interface Producto {
  nombre: string;
  utilidad: number;
  tiempo: number;
  material: number;
  maxAlmacen: number;
}

interface Restricciones {
  horasDisponibles: number;
  materialDisponible: number;
}

interface Solucion {
  x: number;
  y: number;
  utilidadTotal: number;
  factible: boolean;
  mensaje: string;
}

interface Punto {
  x: number;
  y: number;
  label?: string;
  tipo?: string;
}

@Component({
  selector: 'app-programacion-lineal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './programacion-lineal.component.html',
  styleUrls: ['./programacion-lineal.component.css']
})
export class ProgramacionLinealComponent implements AfterViewInit, OnDestroy {
  @ViewChild('graficoCanvas') graficoCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  // Productos editables
  productoX: Producto = {
    nombre: 'Playera',
    utilidad: 45,
    tiempo: 0.7,
    material: 1.5,
    maxAlmacen: 50
  };

  productoY: Producto = {
    nombre: 'Suéter',
    utilidad: 60,
    tiempo: 1.2,
    material: 2.0,
    maxAlmacen: 50
  };

  // Restricciones editables
  restricciones: Restricciones = {
    horasDisponibles: 90,
    materialDisponible: 200
  };

  // Solución
  solucion: Solucion = {
    x: 0,
    y: 0,
    utilidadTotal: 0,
    factible: false,
    mensaje: ''
  };

  // Control de visualización
  mostrarGrafico = false;

  ngAfterViewInit() {
    setTimeout(() => {
      this.calcularSolucion();
    }, 500);
  }

  calcularSolucion() {
    const puntosExtremos = this.calcularPuntosExtremos();
    this.evaluarPuntosExtremos(puntosExtremos);
    
    if (this.solucion.factible) {
      this.mostrarGrafico = true;
      setTimeout(() => {
        this.inicializarGrafico();
      }, 100);
    }
  }

  private inicializarGrafico() {
  if (this.chart) {
    this.chart.destroy();
    this.chart = null;
  }

  const canvas = this.graficoCanvas?.nativeElement;
  if (!canvas) {
    console.error('Canvas no encontrado');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('No se pudo obtener el contexto 2D');
    return;
  }

  try {
    const verticesFactibles = this.calcularVerticesRegionFactible();
    
    // Calcular límites más apropiados basados en los datos reales
    const maxX = Math.max(
      this.productoX.maxAlmacen,
      this.restricciones.horasDisponibles / this.productoX.tiempo,
      this.restricciones.materialDisponible / this.productoX.material,
      ...verticesFactibles.map(v => v.x)
    );
    
    const maxY = Math.max(
      this.productoY.maxAlmacen,
      this.restricciones.horasDisponibles / this.productoY.tiempo,
      this.restricciones.materialDisponible / this.productoY.material,
      ...verticesFactibles.map(v => v.y)
    );

    // Añadir un pequeño margen
    const margin = 5;
    const xMax = Math.ceil(maxX) + margin;
    const yMax = Math.ceil(maxY) + margin;

    this.chart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          // Región factible como polígono - PRIMERO para que quede detrás
          {
            label: 'Región Factible',
            data: verticesFactibles,
            backgroundColor: 'rgba(144, 238, 144, 0.5)',
            borderColor: 'rgba(144, 238, 144, 0.8)',
            borderWidth: 2,
            pointRadius: 0,
            showLine: true,
            fill: true,
            tension: 0,
            order: 1 // Más bajo = más atrás
          },
          // Líneas de restricciones - DESPUÉS de la región
          {
            label: `Tiempo: ${this.productoX.tiempo}x + ${this.productoY.tiempo}y ≤ ${this.restricciones.horasDisponibles}`,
            data: this.calcularLineaParaGrafico('tiempo', xMax, yMax),
            backgroundColor: 'rgba(255, 159, 64, 0.1)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 3,
            borderDash: [5, 5],
            pointRadius: 0,
            showLine: true,
            fill: false,
            order: 2
          },
          {
            label: `Material: ${this.productoX.material}x + ${this.productoY.material}y ≤ ${this.restricciones.materialDisponible}`,
            data: this.calcularLineaParaGrafico('material', xMax, yMax),
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 3,
            borderDash: [5, 5],
            pointRadius: 0,
            showLine: true,
            fill: false,
            order: 3
          },
          {
            label: `Almacén X: x ≤ ${this.productoX.maxAlmacen}`,
            data: [
              { x: this.productoX.maxAlmacen, y: 0 },
              { x: this.productoX.maxAlmacen, y: yMax }
            ],
            backgroundColor: 'rgba(153, 102, 255, 0.1)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 2,
            borderDash: [3, 3],
            pointRadius: 0,
            showLine: true,
            fill: false,
            order: 4
          },
          {
            label: `Almacén Y: y ≤ ${this.productoY.maxAlmacen}`,
            data: [
              { x: 0, y: this.productoY.maxAlmacen },
              { x: xMax, y: this.productoY.maxAlmacen }
            ],
            backgroundColor: 'rgba(201, 203, 207, 0.1)',
            borderColor: 'rgba(201, 203, 207, 1)',
            borderWidth: 2,
            borderDash: [3, 3],
            pointRadius: 0,
            showLine: true,
            fill: false,
            order: 5
          },
          // Puntos extremos - ENCIMA de las líneas
          {
            label: 'Vértices Factibles',
            data: verticesFactibles,
            backgroundColor: 'rgba(54, 162, 235, 1)',
            borderColor: 'rgba(54, 162, 235, 1)',
            pointRadius: 8,
            pointHoverRadius: 12,
            order: 6
          },
          // Solución óptima - ENCIMA de todo
          {
            label: 'Solución Óptima',
            data: [{ x: this.solucion.x, y: this.solucion.y }],
            backgroundColor: 'rgba(255, 99, 132, 1)',
            borderColor: 'rgba(255, 99, 132, 1)',
            pointRadius: 12,
            pointHoverRadius: 16,
            order: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: {
              display: true,
              text: this.productoX.nombre + ' (unidades)',
              font: { size: 14, weight: 'bold' }
            },
            min: 0,
            max: xMax,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              stepSize: Math.ceil(xMax / 10) // Ajuste automático de pasos
            }
          },
          y: {
            type: 'linear',
            title: {
              display: true,
              text: this.productoY.nombre + ' (unidades)',
              font: { size: 14, weight: 'bold' }
            },
            min: 0,
            max: yMax,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              stepSize: Math.ceil(yMax / 10) // Ajuste automático de pasos
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 12
              }
            }
          },
          title: {
            display: true,
            text: 'Solución de Programación Lineal - Región Factible',
            font: {
              size: 16,
              weight: 'bold'
            },
            padding: 20
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const point = context.raw;
                if (context.datasetIndex === 6) { // Solución óptima
                  return `SOLUCIÓN: ${point.x} ${this.productoX.nombre}, ${point.y} ${this.productoY.nombre}`;
                } else if (context.datasetIndex === 5) { // Vértices
                  return `Vértice: (${point.x}, ${point.y})`;
                }
                return `${this.productoX.nombre}: ${point.x}, ${this.productoY.nombre}: ${point.y}`;
              }
            }
          }
        },
        elements: {
          point: {
            hoverBorderWidth: 3
          }
        }
      }
    });
  } catch (error) {
    console.error('Error al crear el gráfico:', error);
  }
}

private calcularLineaParaGrafico(tipo: 'tiempo' | 'material', xMax: number, yMax: number): any[] {
  let a, b, c;
  
  if (tipo === 'tiempo') {
    a = this.productoX.tiempo;
    b = this.productoY.tiempo;
    c = this.restricciones.horasDisponibles;
  } else {
    a = this.productoX.material;
    b = this.productoY.material;
    c = this.restricciones.materialDisponible;
  }
  
  const puntos = [];
  
  // Calcular intersección con eje Y (x=0)
  const yIntercept = c / b;
  if (yIntercept <= yMax) {
    puntos.push({ x: 0, y: yIntercept });
  }
  
  // Calcular intersección con eje X (y=0)
  const xIntercept = c / a;
  if (xIntercept <= xMax) {
    puntos.push({ x: xIntercept, y: 0 });
  }
  
  // Si tenemos ambos puntos, agregar puntos extendidos para mejor visualización
  if (puntos.length === 2) {
    // Extender un poco más allá de los ejes para que se vean las líneas completas
    puntos[0].x = -2; // Extender línea hacia izquierda
    puntos[1].y = -2; // Extender línea hacia abajo
  }
  
  return puntos;
}

  private calcularVerticesRegionFactible(): any[] {
  const vertices: any[] = [];
  
  // 1. Origen (0,0)
  vertices.push({ x: 0, y: 0 });
  
  // 2. Intersección con eje X (solo restricciones de recursos)
  const xPorTiempo = this.restricciones.horasDisponibles / this.productoX.tiempo;
  const xPorMaterial = this.restricciones.materialDisponible / this.productoX.material;
  const xLimitadoPorRecursos = Math.min(xPorTiempo, xPorMaterial);
  const xFinal = Math.min(xLimitadoPorRecursos, this.productoX.maxAlmacen);
  
  if (xFinal > 0) {
    vertices.push({ x: xFinal, y: 0 });
  }
  
  // 3. Intersección entre tiempo y material
  const determinante = this.productoX.tiempo * this.productoY.material - this.productoY.tiempo * this.productoX.material;
  if (Math.abs(determinante) > 0.001) { // Evitar división por cero
    const xInterseccion = (this.restricciones.horasDisponibles * this.productoY.material - this.restricciones.materialDisponible * this.productoY.tiempo) / determinante;
    const yInterseccion = (this.restricciones.materialDisponible * this.productoX.tiempo - this.restricciones.horasDisponibles * this.productoX.material) / determinante;

    if (xInterseccion >= 0 && yInterseccion >= 0 && 
        xInterseccion <= this.productoX.maxAlmacen && 
        yInterseccion <= this.productoY.maxAlmacen) {
      vertices.push({ x: xInterseccion, y: yInterseccion });
    }
  }
  
  // 4. Intersección tiempo con almacén Y
  const yPorTiempoConMaxY = (this.restricciones.horasDisponibles - this.productoX.tiempo * this.productoX.maxAlmacen) / this.productoY.tiempo;
  if (yPorTiempoConMaxY >= 0 && yPorTiempoConMaxY <= this.productoY.maxAlmacen) {
    vertices.push({ x: this.productoX.maxAlmacen, y: yPorTiempoConMaxY });
  }
  
  // 5. Intersección material con almacén Y
  const yPorMaterialConMaxY = (this.restricciones.materialDisponible - this.productoX.material * this.productoX.maxAlmacen) / this.productoY.material;
  if (yPorMaterialConMaxY >= 0 && yPorMaterialConMaxY <= this.productoY.maxAlmacen) {
    vertices.push({ x: this.productoX.maxAlmacen, y: yPorMaterialConMaxY });
  }
  
  // 6. Intersección con eje Y (solo restricciones de recursos)
  const yPorTiempo = this.restricciones.horasDisponibles / this.productoY.tiempo;
  const yPorMaterial = this.restricciones.materialDisponible / this.productoY.material;
  const yLimitadoPorRecursos = Math.min(yPorTiempo, yPorMaterial);
  const yFinal = Math.min(yLimitadoPorRecursos, this.productoY.maxAlmacen);
  
  if (yFinal > 0) {
    vertices.push({ x: 0, y: yFinal });
  }
  
  // Filtrar vértices únicos y ordenar
  const verticesUnicos = this.eliminarDuplicados(vertices);
  return this.ordenarVerticesSentidoHorario(verticesUnicos);
}

private eliminarDuplicados(vertices: any[]): any[] {
  const unicos: any[] = [];
  const vistos = new Set();
  
  for (const vertice of vertices) {
    const clave = `${vertice.x.toFixed(2)}_${vertice.y.toFixed(2)}`;
    if (!vistos.has(clave)) {
      vistos.add(clave);
      unicos.push(vertice);
    }
  }
  
  return unicos;
}

  private ordenarVerticesSentidoHorario(vertices: any[]): any[] {
    if (vertices.length <= 1) return vertices;
    
    const centro = {
      x: vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length,
      y: vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length
    };
    
    return vertices.sort((a, b) => {
      const anguloA = Math.atan2(a.y - centro.y, a.x - centro.x);
      const anguloB = Math.atan2(b.y - centro.y, b.x - centro.x);
      return anguloA - anguloB;
    });
  }

  private calcularLineaCompleta(tipo: 'tiempo' | 'material'): any[] {
    const puntos = [];
    let maxX, maxY;
    
    if (tipo === 'tiempo') {
      maxX = this.restricciones.horasDisponibles / this.productoX.tiempo;
      maxY = this.restricciones.horasDisponibles / this.productoY.tiempo;
    } else {
      maxX = this.restricciones.materialDisponible / this.productoX.material;
      maxY = this.restricciones.materialDisponible / this.productoY.material;
    }
    
    const extension = 10;
    puntos.push({ x: -extension, y: maxY + (maxY * extension / maxX) });
    puntos.push({ x: maxX + extension, y: -extension });
    
    return puntos;
  }

  private calcularPuntosExtremos(): Punto[] {
    const puntos: Punto[] = [];

    puntos.push({ x: 0, y: 0, label: 'A(0,0)', tipo: 'extremo' });

    puntos.push({ 
      x: this.productoX.maxAlmacen, 
      y: 0,
      label: `B(${this.productoX.maxAlmacen},0)`,
      tipo: 'extremo'
    });

    const yPorTiempoConMaxX = (this.restricciones.horasDisponibles - this.productoX.tiempo * this.productoX.maxAlmacen) / this.productoY.tiempo;
    const yPorMaterialConMaxX = (this.restricciones.materialDisponible - this.productoX.material * this.productoX.maxAlmacen) / this.productoY.material;
    
    const yLimitado = Math.min(yPorTiempoConMaxX, yPorMaterialConMaxX, this.productoY.maxAlmacen);

    if (yLimitado >= 0) {
      puntos.push({ 
        x: this.productoX.maxAlmacen, 
        y: Math.floor(yLimitado),
        label: `C(${this.productoX.maxAlmacen},${Math.floor(yLimitado)})`,
        tipo: 'extremo'
      });
    }

    const xPorTiempoConMaxY = (this.restricciones.horasDisponibles - this.productoY.tiempo * this.productoY.maxAlmacen) / this.productoX.tiempo;
    const xPorMaterialConMaxY = (this.restricciones.materialDisponible - this.productoY.material * this.productoY.maxAlmacen) / this.productoX.material;
    
    const xLimitado = Math.min(xPorTiempoConMaxY, xPorMaterialConMaxY, this.productoX.maxAlmacen);

    if (xLimitado >= 0) {
      puntos.push({ 
        x: Math.floor(xLimitado), 
        y: this.productoY.maxAlmacen,
        label: `D(${Math.floor(xLimitado)},${this.productoY.maxAlmacen})`,
        tipo: 'extremo'
      });
    }

    puntos.push({ 
      x: 0, 
      y: this.productoY.maxAlmacen,
      label: `E(0,${this.productoY.maxAlmacen})`,
      tipo: 'extremo'
    });

    return puntos;
  }

  private evaluarPuntosExtremos(puntos: Punto[]) {
    let mejorUtilidad = -1;
    let mejorPunto = { x: 0, y: 0 };

    for (const punto of puntos) {
      if (this.esFactible(punto.x, punto.y)) {
        const utilidad = this.calcularUtilidad(punto.x, punto.y);
        if (utilidad > mejorUtilidad) {
          mejorUtilidad = utilidad;
          mejorPunto = punto;
        }
      }
    }

    if (mejorUtilidad >= 0) {
      this.solucion = {
        x: mejorPunto.x,
        y: mejorPunto.y,
        utilidadTotal: mejorUtilidad,
        factible: true,
        mensaje: 'Solución óptima encontrada'
      };
    } else {
      this.solucion = {
        x: 0,
        y: 0,
        utilidadTotal: 0,
        factible: false,
        mensaje: 'No se encontró solución factible'
      };
    }
  }

  private esFactible(x: number, y: number): boolean {
    const tiempoUsado = this.productoX.tiempo * x + this.productoY.tiempo * y;
    const materialUsado = this.productoX.material * x + this.productoY.material * y;

    return tiempoUsado <= this.restricciones.horasDisponibles &&
           materialUsado <= this.restricciones.materialDisponible &&
           x <= this.productoX.maxAlmacen &&
           y <= this.productoY.maxAlmacen &&
           x >= 0 && y >= 0;
  }

  private calcularUtilidad(x: number, y: number): number {
    return this.productoX.utilidad * x + this.productoY.utilidad * y;
  }

  get utilizacionRecursos() {
    if (!this.solucion.factible) return null;

    const tiempoUsado = this.productoX.tiempo * this.solucion.x + this.productoY.tiempo * this.solucion.y;
    const materialUsado = this.productoX.material * this.solucion.x + this.productoY.material * this.solucion.y;

    return {
      tiempo: {
        usado: tiempoUsado,
        disponible: this.restricciones.horasDisponibles,
        porcentaje: (tiempoUsado / this.restricciones.horasDisponibles) * 100
      },
      material: {
        usado: materialUsado,
        disponible: this.restricciones.materialDisponible,
        porcentaje: (materialUsado / this.restricciones.materialDisponible) * 100
      },
      almacen: {
        usado: this.solucion.x + this.solucion.y,
        disponible: this.productoX.maxAlmacen + this.productoY.maxAlmacen,
        porcentaje: ((this.solucion.x + this.solucion.y) / (this.productoX.maxAlmacen + this.productoY.maxAlmacen)) * 100
      }
    };
  }

  resetearValores() {
    this.productoX = {
      nombre: 'Playera',
      utilidad: 45,
      tiempo: 0.7,
      material: 1.5,
      maxAlmacen: 50
    };

    this.productoY = {
      nombre: 'Suéter',
      utilidad: 60,
      tiempo: 1.2,
      material: 2.0,
      maxAlmacen: 50
    };

    this.restricciones = {
      horasDisponibles: 90,
      materialDisponible: 200
    };

    this.solucion = {
      x: 0,
      y: 0,
      utilidadTotal: 0,
      factible: false,
      mensaje: ''
    };

    this.mostrarGrafico = false;
    
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}