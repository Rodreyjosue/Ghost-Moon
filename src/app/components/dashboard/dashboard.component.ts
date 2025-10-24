import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface DatoVenta {
  mes: string;
  ventas2024: number;
  inversion2025: number;
  impacto: number;
  ventas2025: number;
  roi: number;
}

interface Proyeccion {
  mes: string;
  ventasBase: number;
  inversion: number;
  impacto: number;
  ventasProyectadas: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  @ViewChild('ventasChart') ventasChartRef!: ElementRef;
  @ViewChild('roiChart') roiChartRef!: ElementRef;

  meses: string[] = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  datosVentas: DatoVenta[] = [
    { mes: 'Ene', ventas2024: 45200, inversion2025: 0, impacto: 0, ventas2025: 47952, roi: 0 },
    { mes: 'Feb', ventas2024: 38700, inversion2025: 0, impacto: 0, ventas2025: 41056, roi: 0 },
    { mes: 'Mar', ventas2024: 52100, inversion2025: 0, impacto: 0, ventas2025: 55273, roi: 0 },
    { mes: 'Abr', ventas2024: 48900, inversion2025: 0, impacto: 0, ventas2025: 51878, roi: 0 },
    { mes: 'May', ventas2024: 42300, inversion2025: 2000, impacto: 0.25, ventas2025: 42966, roi: 0 },
    { mes: 'Jun', ventas2024: 35800, inversion2025: 3500, impacto: 0.3, ventas2025: 76682, roi: 0 },
    { mes: 'Jul', ventas2024: 29500, inversion2025: 4000, impacto: 0.35, ventas2025: 87651, roi: 0 },
    { mes: 'Ago', ventas2024: 32400, inversion2025: 4500, impacto: 0.4, ventas2025: 102334, roi: 0 },
    { mes: 'Sep', ventas2024: 55600, inversion2025: 5000, impacto: 0.45, ventas2025: 111527, roi: 0 },
    { mes: 'Oct', ventas2024: 61200, inversion2025: 5500, impacto: 0.5, ventas2025: 128304, roi: 0 },
    { mes: 'Nov', ventas2024: 68900, inversion2025: 6000, impacto: 0.55, ventas2025: 148797, roi: 0 },
    { mes: 'Dic', ventas2024: 72500, inversion2025: 6500, impacto: 0.6, ventas2025: 171200, roi: 0 }
  ];

  proyecciones: Proyeccion[] = [
    { mes: 'Oct 2025', ventasBase: 61200, inversion: 5500, impacto: 0.5, ventasProyectadas: 97391 },
    { mes: 'Nov 2025', ventasBase: 68900, inversion: 6000, impacto: 0.55, ventasProyectadas: 113299 },
    { mes: 'Dic 2025', ventasBase: 72500, inversion: 6500, impacto: 0.6, ventasProyectadas: 123064 }
  ];

  margenUtilidad: number = 0.35;
  crecimientoBase: number = 0.03;

  private ventasChart!: Chart;
  private roiChart!: Chart;

  ngOnInit() {
    this.calcularTodosROI();
    setTimeout(() => {
      this.inicializarGraficas();
    }, 100);
  }

  calcularVentas2025(index: number) {
    const dato = this.datosVentas[index];
    
    if (dato.inversion2025 === 0) {
      // Solo crecimiento base del 3%
      dato.ventas2025 = dato.ventas2024 * (1 + this.crecimientoBase);
    } else {
      // Crecimiento base + impacto de publicidad
      const ventasBase = dato.ventas2024 * (1 + this.crecimientoBase);
      dato.ventas2025 = ventasBase * (1 + dato.impacto);
    }
    
    this.calcularROI(index);
  }

  calcularROI(index: number) {
    const dato = this.datosVentas[index];
    if (dato.inversion2025 > 0) {
      const ventasAdicionales = dato.ventas2025 - (dato.ventas2024 * (1 + this.crecimientoBase));
      dato.roi = (ventasAdicionales / dato.inversion2025) * 100;
    } else {
      dato.roi = 0;
    }
  }

  calcularTodosROI() {
    this.datosVentas.forEach((_, index) => this.calcularROI(index));
  }

  // Métodos de cálculo de totales
  getTotalVentas2024(): number {
    return this.datosVentas.reduce((sum, dato) => sum + dato.ventas2024, 0);
  }

  getTotalVentas2025(): number {
    return this.datosVentas.reduce((sum, dato) => sum + dato.ventas2025, 0);
  }

  getTotalInversion(): number {
    return this.datosVentas.reduce((sum, dato) => sum + dato.inversion2025, 0);
  }

  getCrecimientoPorcentual(): number {
    return ((this.getTotalVentas2025() - this.getTotalVentas2024()) / this.getTotalVentas2024()) * 100;
  }

  getROI(): number {
    const ventasAdicionales = this.getTotalVentas2025() - (this.getTotalVentas2024() * (1 + this.crecimientoBase));
    const inversionTotal = this.getTotalInversion();
    return inversionTotal > 0 ? (ventasAdicionales / inversionTotal) * 100 : 0;
  }

  getUtilidad2024(): number {
    return this.getTotalVentas2024() * this.margenUtilidad;
  }

  getUtilidadNeta(): number {
    const utilidadBruta = this.getTotalVentas2025() * this.margenUtilidad;
    return utilidadBruta - this.getTotalInversion();
  }

  getIncrementoUtilidad(): number {
    return this.getUtilidadNeta() - this.getUtilidad2024();
  }

  getPorcentajeCrecimientoUtilidad(): number {
    return (this.getIncrementoUtilidad() / this.getUtilidad2024()) * 100;
  }

  getROIClass(roi: number): string {
    if (roi >= 1000) return 'text-success fw-bold';
    if (roi >= 500) return 'text-success';
    if (roi >= 100) return 'text-warning';
    return 'text-danger';
  }

  // Gestión de datos
  agregarMes() {
    const nuevoMes: DatoVenta = {
      mes: 'Ene',
      ventas2024: 0,
      inversion2025: 0,
      impacto: 0,
      ventas2025: 0,
      roi: 0
    };
    this.datosVentas.push(nuevoMes);
  }

  eliminarMes(index: number) {
    if (this.datosVentas.length > 1) {
      this.datosVentas.splice(index, 1);
      this.actualizarGraficas();
    }
  }

  // Gráficas
  private inicializarGraficas() {
    this.crearGraficaVentas();
    this.crearGraficaROI();
  }

  private crearGraficaVentas() {
    const ctx = this.ventasChartRef.nativeElement.getContext('2d');
    
    this.ventasChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.datosVentas.map(d => d.mes),
        datasets: [
          {
            label: 'Ventas 2024',
            data: this.datosVentas.map(d => d.ventas2024),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Ventas 2025',
            data: this.datosVentas.map(d => d.ventas2025),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Comparativo de Ventas Anual'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Ventas (Q)'
            }
          }
        }
      }
    });
  }

  private crearGraficaROI() {
    const ctx = this.roiChartRef.nativeElement.getContext('2d');
    
    this.roiChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.datosVentas.map(d => d.mes),
        datasets: [{
          label: 'ROI Mensual (%)',
          data: this.datosVentas.map(d => d.roi),
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'ROI por Mes'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'ROI (%)'
            }
          }
        }
      }
    });
  }

  private actualizarGraficas() {
    if (this.ventasChart) {
      this.ventasChart.data.labels = this.datosVentas.map(d => d.mes);
      this.ventasChart.data.datasets[0].data = this.datosVentas.map(d => d.ventas2024);
      this.ventasChart.data.datasets[1].data = this.datosVentas.map(d => d.ventas2025);
      this.ventasChart.update();
    }

    if (this.roiChart) {
      this.roiChart.data.labels = this.datosVentas.map(d => d.mes);
      this.roiChart.data.datasets[0].data = this.datosVentas.map(d => d.roi);
      this.roiChart.update();
    }
  }
}