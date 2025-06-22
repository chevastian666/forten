/**
 * Report Generation Service
 * Service for generating and exporting analytics reports
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Report,
  ReportType,
  ReportFormat,
  ReportTemplate,
  ReportSection,
  ReportSchedule,
  DateRange,
  ChartData
} from './types';
import { analyticsService } from './analytics.service';

export class ReportService {
  private reports: Map<string, Report> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.loadReports();
  }

  // Report Management
  async createReport(report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<Report> {
    const newReport: Report = {
      ...report,
      id: `report-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.reports.set(newReport.id, newReport);
    
    if (report.schedule?.enabled) {
      this.scheduleReport(newReport);
    }
    
    return newReport;
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report | null> {
    const report = this.reports.get(id);
    if (!report) return null;
    
    const updatedReport = {
      ...report,
      ...updates,
      updatedAt: new Date()
    };
    
    this.reports.set(id, updatedReport);
    
    // Update schedule if needed
    if (updates.schedule) {
      this.cancelScheduledReport(id);
      if (updatedReport.schedule?.enabled) {
        this.scheduleReport(updatedReport);
      }
    }
    
    return updatedReport;
  }

  async deleteReport(id: string): Promise<boolean> {
    this.cancelScheduledReport(id);
    return this.reports.delete(id);
  }

  async getReports(): Promise<Report[]> {
    return Array.from(this.reports.values());
  }

  async getReport(id: string): Promise<Report | null> {
    return this.reports.get(id) || null;
  }

  // Report Generation
  async generateReport(reportId: string, dateRange: DateRange): Promise<Blob> {
    const report = this.reports.get(reportId);
    if (!report) throw new Error('Report not found');
    
    const reportData = await this.collectReportData(report, dateRange);
    
    // Generate report in requested formats
    const format = report.format[0] || 'pdf';
    
    switch (format) {
      case 'pdf':
        return this.generatePDF(report, reportData, dateRange);
      case 'excel':
        return this.generateExcel(report, reportData, dateRange);
      case 'csv':
        return this.generateCSV(report, reportData, dateRange);
      case 'json':
        return this.generateJSON(report, reportData, dateRange);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // PDF Generation
  private async generatePDF(report: Report, data: any, dateRange: DateRange): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margins = report.template.style?.margins || { top: 20, right: 20, bottom: 20, left: 20 };
    
    let yPosition = margins.top;
    
    // Header
    if (report.template.header) {
      // Logo
      if (report.template.header.logo) {
        // In real implementation, load and add logo image
        // pdf.addImage(logoData, 'PNG', margins.left, yPosition, 30, 10);
      }
      
      // Title
      pdf.setFontSize(20);
      pdf.setTextColor(report.template.style?.primaryColor || '#000000');
      pdf.text(report.template.header.title, pageWidth / 2, yPosition + 10, { align: 'center' });
      
      // Subtitle
      if (report.template.header.subtitle) {
        pdf.setFontSize(14);
        pdf.setTextColor('#666666');
        pdf.text(report.template.header.subtitle, pageWidth / 2, yPosition + 20, { align: 'center' });
      }
      
      // Date
      if (report.template.header.date) {
        pdf.setFontSize(10);
        pdf.text(
          `Período: ${dateRange.start.toLocaleDateString('es-UY')} - ${dateRange.end.toLocaleDateString('es-UY')}`,
          pageWidth / 2,
          yPosition + 30,
          { align: 'center' }
        );
      }
      
      yPosition += 40;
    }
    
    // Sections
    for (const section of report.template.sections) {
      if (yPosition > pageHeight - margins.bottom - 30) {
        pdf.addPage();
        yPosition = margins.top;
      }
      
      switch (section.type) {
        case 'title':
          pdf.setFontSize(16);
          pdf.setTextColor(report.template.style?.primaryColor || '#000000');
          pdf.text(section.title || '', margins.left, yPosition);
          yPosition += 10;
          break;
          
        case 'summary':
          pdf.setFontSize(12);
          pdf.setTextColor('#000000');
          const summaryText = this.generateSummaryText(data, report.type);
          const lines = pdf.splitTextToSize(summaryText, pageWidth - margins.left - margins.right);
          pdf.text(lines, margins.left, yPosition);
          yPosition += lines.length * 5 + 10;
          break;
          
        case 'chart':
          // In real implementation, generate chart image and add to PDF
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margins.left, yPosition, pageWidth - margins.left - margins.right, 60, 'F');
          pdf.setFontSize(10);
          pdf.text('[Gráfico: ' + (section.title || 'Datos') + ']', pageWidth / 2, yPosition + 30, { align: 'center' });
          yPosition += 70;
          break;
          
        case 'table':
          const tableData = this.getTableData(data, section.config);
          if (tableData.length > 0) {
            autoTable(pdf, {
              startY: yPosition,
              head: [Object.keys(tableData[0])],
              body: tableData.map(row => Object.values(row)),
              theme: 'striped',
              styles: {
                fontSize: 10,
                cellPadding: 2
              },
              headStyles: {
                fillColor: report.template.style?.primaryColor || '#3b82f6'
              },
              margin: { left: margins.left, right: margins.right }
            });
            yPosition = (pdf as any).lastAutoTable.finalY + 10;
          }
          break;
          
        case 'text':
          pdf.setFontSize(11);
          pdf.setTextColor('#333333');
          const textLines = pdf.splitTextToSize(section.content || '', pageWidth - margins.left - margins.right);
          pdf.text(textLines, margins.left, yPosition);
          yPosition += textLines.length * 5 + 10;
          break;
          
        case 'pagebreak':
          pdf.addPage();
          yPosition = margins.top;
          break;
      }
    }
    
    // Footer
    if (report.template.footer) {
      const totalPages = pdf.getNumberOfPages();
      
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        
        let footerY = pageHeight - 10;
        
        if (report.template.footer.text) {
          pdf.setFontSize(9);
          pdf.setTextColor('#666666');
          pdf.text(report.template.footer.text, pageWidth / 2, footerY, { align: 'center' });
          footerY -= 5;
        }
        
        if (report.template.footer.showPageNumber) {
          pdf.setFontSize(9);
          pdf.text(`Página ${i} de ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
        }
        
        if (report.template.footer.showDate) {
          pdf.setFontSize(9);
          pdf.text(
            new Date().toLocaleDateString('es-UY'),
            pageWidth - margins.right,
            footerY,
            { align: 'right' }
          );
        }
      }
    }
    
    return pdf.output('blob');
  }

  // Excel Generation
  private async generateExcel(report: Report, data: any, dateRange: DateRange): Promise<Blob> {
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Reporte', report.name],
      ['Descripción', report.description || ''],
      ['Período', `${dateRange.start.toLocaleDateString('es-UY')} - ${dateRange.end.toLocaleDateString('es-UY')}`],
      ['Generado', new Date().toLocaleString('es-UY')],
      [],
      ['Resumen Ejecutivo'],
      [this.generateSummaryText(data, report.type)]
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
    
    // Data sheets based on report type
    switch (report.type) {
      case 'access':
        this.addAccessSheets(workbook, data);
        break;
      case 'security':
        this.addSecuritySheets(workbook, data);
        break;
      case 'maintenance':
        this.addMaintenanceSheets(workbook, data);
        break;
      case 'financial':
        this.addFinancialSheets(workbook, data);
        break;
      case 'occupancy':
        this.addOccupancySheets(workbook, data);
        break;
    }
    
    // Generate blob
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  // CSV Generation
  private async generateCSV(report: Report, data: any, dateRange: DateRange): Promise<Blob> {
    let csvContent = '';
    
    // Header
    csvContent += `"${report.name}"\n`;
    csvContent += `"Período: ${dateRange.start.toLocaleDateString('es-UY')} - ${dateRange.end.toLocaleDateString('es-UY')}"\n`;
    csvContent += `"Generado: ${new Date().toLocaleString('es-UY')}"\n\n`;
    
    // Data based on report type
    const tableData = this.getAllTableData(data, report.type);
    
    if (tableData.length > 0) {
      // Headers
      csvContent += Object.keys(tableData[0]).map(key => `"${key}"`).join(',') + '\n';
      
      // Rows
      tableData.forEach(row => {
        csvContent += Object.values(row).map(value => `"${value}"`).join(',') + '\n';
      });
    }
    
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  // JSON Generation
  private async generateJSON(report: Report, data: any, dateRange: DateRange): Promise<Blob> {
    const jsonData = {
      report: {
        id: report.id,
        name: report.name,
        type: report.type,
        description: report.description,
        generatedAt: new Date().toISOString(),
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString()
        }
      },
      data: data
    };
    
    return new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
  }

  // Data Collection
  private async collectReportData(report: Report, dateRange: DateRange): Promise<any> {
    const data: any = {};
    
    switch (report.type) {
      case 'access':
        data.access = await analyticsService.getAccessAnalytics(dateRange);
        break;
      case 'security':
        data.security = await analyticsService.getSecurityAnalytics(dateRange);
        break;
      case 'maintenance':
        data.maintenance = await analyticsService.getMaintenanceAnalytics(dateRange);
        break;
      case 'financial':
        data.financial = await analyticsService.getFinancialAnalytics(dateRange);
        break;
      case 'occupancy':
        data.resident = await analyticsService.getResidentAnalytics(dateRange);
        break;
      case 'custom':
        // Collect all data types for custom reports
        data.access = await analyticsService.getAccessAnalytics(dateRange);
        data.security = await analyticsService.getSecurityAnalytics(dateRange);
        data.maintenance = await analyticsService.getMaintenanceAnalytics(dateRange);
        data.financial = await analyticsService.getFinancialAnalytics(dateRange);
        data.resident = await analyticsService.getResidentAnalytics(dateRange);
        break;
    }
    
    // Apply filters if any
    if (report.filters && report.filters.length > 0) {
      // Apply filters to data
      // Implementation depends on filter structure
    }
    
    return data;
  }

  // Report Scheduling
  private scheduleReport(report: Report) {
    if (!report.schedule || !report.schedule.enabled) return;
    
    const schedule = report.schedule;
    let interval: number;
    
    switch (schedule.frequency) {
      case 'daily':
        interval = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'weekly':
        interval = 7 * 24 * 60 * 60 * 1000; // 7 days
        break;
      case 'monthly':
        interval = 30 * 24 * 60 * 60 * 1000; // 30 days
        break;
      case 'quarterly':
        interval = 90 * 24 * 60 * 60 * 1000; // 90 days
        break;
      case 'yearly':
        interval = 365 * 24 * 60 * 60 * 1000; // 365 days
        break;
      default:
        return;
    }
    
    const job = setInterval(async () => {
      await this.executeScheduledReport(report);
    }, interval);
    
    this.scheduledJobs.set(report.id, job);
    
    // Calculate initial delay to run at scheduled time
    if (schedule.time) {
      const [hours, minutes] = schedule.time.split(':').map(Number);
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      if (scheduledTime <= now) {
        // If scheduled time has passed today, schedule for tomorrow
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }
      
      const initialDelay = scheduledTime.getTime() - now.getTime();
      
      setTimeout(async () => {
        await this.executeScheduledReport(report);
      }, initialDelay);
    }
  }

  private cancelScheduledReport(reportId: string) {
    const job = this.scheduledJobs.get(reportId);
    if (job) {
      clearInterval(job);
      this.scheduledJobs.delete(reportId);
    }
  }

  private async executeScheduledReport(report: Report) {
    try {
      // Determine date range based on frequency
      const dateRange = this.getScheduledDateRange(report.schedule!.frequency);
      
      // Generate report
      const reportBlob = await this.generateReport(report.id, dateRange);
      
      // Send to recipients
      if (report.recipients && report.recipients.length > 0) {
        await this.sendReport(report, reportBlob, dateRange);
      }
      
      console.log(`Scheduled report ${report.name} executed successfully`);
    } catch (error) {
      console.error(`Failed to execute scheduled report ${report.name}:`, error);
    }
  }

  private getScheduledDateRange(frequency: ReportSchedule['frequency']): DateRange {
    const end = new Date();
    const start = new Date();
    
    switch (frequency) {
      case 'daily':
        start.setDate(end.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(end.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(end.getMonth() - 3);
        break;
      case 'yearly':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }
    
    return { start, end };
  }

  private async sendReport(report: Report, reportBlob: Blob, dateRange: DateRange) {
    // In real implementation, this would send the report via email or other channels
    console.log(`Sending report ${report.name} to ${report.recipients?.join(', ')}`);
  }

  // Helper Methods
  private generateSummaryText(data: any, type: ReportType): string {
    switch (type) {
      case 'access':
        return `Durante el período analizado, se registraron ${data.access.totalAccess} accesos totales con ${data.access.uniqueVisitors} visitantes únicos. El promedio diario fue de ${data.access.averageAccessPerDay} accesos.`;
      
      case 'security':
        return `Se generaron ${data.security.totalAlerts} alertas de seguridad, con ${data.security.unresolvedAlerts} aún pendientes de resolución. El tiempo promedio de respuesta fue de ${data.security.responseTime} minutos.`;
      
      case 'maintenance':
        return `Se recibieron ${data.maintenance.totalRequests} solicitudes de mantenimiento, de las cuales ${data.maintenance.completedRequests} fueron completadas. El tiempo promedio de resolución fue de ${data.maintenance.averageResolutionTime} horas.`;
      
      case 'financial':
        return `Los ingresos totales fueron de $${data.financial.totalRevenue.toLocaleString('es-UY')} con gastos de $${data.financial.totalExpenses.toLocaleString('es-UY')}, resultando en un ingreso neto de $${data.financial.netIncome.toLocaleString('es-UY')}. La tasa de cobro alcanzó el ${data.financial.collectionRate}%.`;
      
      case 'occupancy':
        return `El edificio cuenta con ${data.resident.totalResidents} residentes, de los cuales ${data.resident.activeResidents} están activos. La satisfacción promedio es de ${data.resident.satisfactionScore}/5.`;
      
      default:
        return 'Resumen del reporte personalizado.';
    }
  }

  private getTableData(data: any, config: any): any[] {
    // Extract table data based on report type and configuration
    // This is a simplified implementation
    if (data.access) {
      return Object.entries(data.access.accessByType).map(([type, count]) => ({
        'Tipo de Acceso': type,
        'Cantidad': count,
        'Porcentaje': `${((count as number / data.access.totalAccess) * 100).toFixed(1)}%`
      }));
    }
    
    return [];
  }

  private getAllTableData(data: any, type: ReportType): any[] {
    // Extract all relevant table data for CSV export
    const tableData: any[] = [];
    
    switch (type) {
      case 'access':
        if (data.access) {
          Object.entries(data.access.accessByType).forEach(([accessType, count]) => {
            tableData.push({
              'Categoría': 'Tipo de Acceso',
              'Tipo': accessType,
              'Cantidad': count,
              'Porcentaje': `${((count as number / data.access.totalAccess) * 100).toFixed(1)}%`
            });
          });
        }
        break;
      
      // Add other report types as needed
    }
    
    return tableData;
  }

  // Excel Sheet Helpers
  private addAccessSheets(workbook: XLSX.WorkBook, data: any) {
    if (!data.access) return;
    
    // Access by Type
    const accessByTypeData = Object.entries(data.access.accessByType).map(([type, count]) => ({
      'Tipo de Acceso': type,
      'Cantidad': count,
      'Porcentaje': `${((count as number / data.access.totalAccess) * 100).toFixed(1)}%`
    }));
    
    const accessSheet = XLSX.utils.json_to_sheet(accessByTypeData);
    XLSX.utils.book_append_sheet(workbook, accessSheet, 'Accesos por Tipo');
    
    // Access by Building
    const buildingData = Object.entries(data.access.accessByBuilding).map(([building, count]) => ({
      'Edificio': building,
      'Cantidad': count,
      'Porcentaje': `${((count as number / data.access.totalAccess) * 100).toFixed(1)}%`
    }));
    
    const buildingSheet = XLSX.utils.json_to_sheet(buildingData);
    XLSX.utils.book_append_sheet(workbook, buildingSheet, 'Accesos por Edificio');
  }

  private addSecuritySheets(workbook: XLSX.WorkBook, data: any) {
    if (!data.security) return;
    
    // Alerts by Type
    const alertsData = Object.entries(data.security.alertsByType).map(([type, count]) => ({
      'Tipo de Alerta': type,
      'Cantidad': count
    }));
    
    const alertsSheet = XLSX.utils.json_to_sheet(alertsData);
    XLSX.utils.book_append_sheet(workbook, alertsSheet, 'Alertas por Tipo');
  }

  private addMaintenanceSheets(workbook: XLSX.WorkBook, data: any) {
    if (!data.maintenance) return;
    
    // Requests by Category
    const requestsData = Object.entries(data.maintenance.requestsByCategory).map(([category, count]) => ({
      'Categoría': category,
      'Cantidad': count
    }));
    
    const requestsSheet = XLSX.utils.json_to_sheet(requestsData);
    XLSX.utils.book_append_sheet(workbook, requestsSheet, 'Solicitudes por Categoría');
    
    // Cost Analysis
    const costSheet = XLSX.utils.json_to_sheet(data.maintenance.costAnalysis);
    XLSX.utils.book_append_sheet(workbook, costSheet, 'Análisis de Costos');
  }

  private addFinancialSheets(workbook: XLSX.WorkBook, data: any) {
    if (!data.financial) return;
    
    // Revenue by Category
    const revenueData = Object.entries(data.financial.revenueByCategory).map(([category, amount]) => ({
      'Categoría': category,
      'Monto': `$${(amount as number).toLocaleString('es-UY')}`
    }));
    
    const revenueSheet = XLSX.utils.json_to_sheet(revenueData);
    XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Ingresos por Categoría');
    
    // Expenses by Category
    const expensesData = Object.entries(data.financial.expensesByCategory).map(([category, amount]) => ({
      'Categoría': category,
      'Monto': `$${(amount as number).toLocaleString('es-UY')}`
    }));
    
    const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
    XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Gastos por Categoría');
  }

  private addOccupancySheets(workbook: XLSX.WorkBook, data: any) {
    if (!data.resident) return;
    
    // Demographics
    const ageData = Object.entries(data.resident.demographicData.ageGroups).map(([group, percentage]) => ({
      'Grupo de Edad': group,
      'Porcentaje': `${percentage}%`
    }));
    
    const ageSheet = XLSX.utils.json_to_sheet(ageData);
    XLSX.utils.book_append_sheet(workbook, ageSheet, 'Demografía por Edad');
    
    // Engagement Metrics
    const engagementData = [
      { 'Métrica': 'Uso de App', 'Valor': `${data.resident.engagementMetrics.appUsage}%` },
      { 'Métrica': 'Tasa de Comunicación', 'Valor': `${data.resident.engagementMetrics.communicationRate}%` },
      { 'Métrica': 'Pago a Tiempo', 'Valor': `${data.resident.engagementMetrics.paymentOnTime}%` },
      { 'Métrica': 'Solicitudes Mensuales', 'Valor': data.resident.engagementMetrics.maintenanceRequests },
      { 'Métrica': 'Participación Comunitaria', 'Valor': `${data.resident.engagementMetrics.communityParticipation}%` }
    ];
    
    const engagementSheet = XLSX.utils.json_to_sheet(engagementData);
    XLSX.utils.book_append_sheet(workbook, engagementSheet, 'Métricas de Engagement');
  }

  // Load saved reports
  private loadReports() {
    // In real implementation, load from database
    // For now, create some sample reports
    const sampleReports: Report[] = [
      {
        id: 'report-1',
        name: 'Reporte Mensual de Accesos',
        type: 'access',
        description: 'Análisis detallado de accesos del último mes',
        template: {
          id: 'access-monthly',
          name: 'Plantilla Mensual de Accesos',
          sections: [
            { id: '1', type: 'title', title: 'Resumen de Accesos' },
            { id: '2', type: 'summary' },
            { id: '3', type: 'chart', title: 'Tendencia de Accesos' },
            { id: '4', type: 'table', title: 'Accesos por Tipo' },
            { id: '5', type: 'table', title: 'Accesos por Edificio' }
          ],
          header: {
            title: 'Reporte Mensual de Accesos',
            subtitle: 'FORTEN - Sistema de Gestión',
            date: true,
            pageNumbers: true
          },
          footer: {
            text: 'Confidencial - Solo para uso interno',
            showDate: true,
            showPageNumber: true
          }
        },
        format: ['pdf', 'excel'],
        schedule: {
          frequency: 'monthly',
          time: '08:00',
          dayOfMonth: 1,
          enabled: true
        },
        recipients: ['admin@forten.com', 'operations@forten.com'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'report-2',
        name: 'Reporte Financiero Trimestral',
        type: 'financial',
        description: 'Resumen financiero del trimestre',
        template: {
          id: 'financial-quarterly',
          name: 'Plantilla Financiera Trimestral',
          sections: [
            { id: '1', type: 'title', title: 'Resumen Financiero' },
            { id: '2', type: 'summary' },
            { id: '3', type: 'chart', title: 'Flujo de Caja' },
            { id: '4', type: 'table', title: 'Ingresos por Categoría' },
            { id: '5', type: 'table', title: 'Gastos por Categoría' }
          ],
          header: {
            title: 'Reporte Financiero Trimestral',
            date: true
          }
        },
        format: ['pdf', 'excel'],
        schedule: {
          frequency: 'quarterly',
          enabled: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    sampleReports.forEach(report => {
      this.reports.set(report.id, report);
      if (report.schedule?.enabled) {
        this.scheduleReport(report);
      }
    });
  }

  // Cleanup
  destroy() {
    this.scheduledJobs.forEach(job => clearInterval(job));
    this.scheduledJobs.clear();
  }
}

// Export singleton instance
export const reportService = new ReportService();