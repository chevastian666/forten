import { Report, ReportType, ReportFormat, ReportParameters } from '@domain/entities/Report';
import { IReportRepository } from '@domain/repositories/IReportRepository';
import { IQueryRepository } from '@domain/repositories/IQueryRepository';
import { IMetricRepository } from '@domain/repositories/IMetricRepository';
import { PDFGenerationService } from '@infrastructure/services/PDFGenerationService';
import { ExcelExportService } from '@infrastructure/services/ExcelExportService';
import { CSVExportService } from '@infrastructure/services/CSVExportService';
import { ChartGenerationService } from '@infrastructure/services/ChartGenerationService';
import { FileStorageService } from '@infrastructure/services/FileStorageService';
import { EmailService } from '@infrastructure/services/EmailService';

export interface GenerateReportInput {
  type: ReportType;
  name: string;
  description: string;
  format: ReportFormat;
  parameters: ReportParameters;
  userId: string;
  recipients?: string[];
}

export interface GenerateReportOutput {
  report: Report;
  fileUrl: string;
}

export class GenerateReportUseCase {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly queryRepository: IQueryRepository,
    private readonly metricRepository: IMetricRepository,
    private readonly pdfService: PDFGenerationService,
    private readonly excelService: ExcelExportService,
    private readonly csvService: CSVExportService,
    private readonly chartService: ChartGenerationService,
    private readonly fileStorage: FileStorageService,
    private readonly emailService: EmailService
  ) {}

  async execute(input: GenerateReportInput): Promise<GenerateReportOutput> {
    // Create report entity
    const report = Report.create(
      input.type,
      input.name,
      input.description,
      input.format,
      input.parameters,
      input.userId
    );

    // Save initial report
    let savedReport = await this.reportRepository.save(report);

    try {
      // Mark as processing
      savedReport = await this.reportRepository.update(savedReport.markAsProcessing());

      // Fetch report data based on type
      const reportData = await this.fetchReportData(savedReport);

      // Generate charts if requested
      let charts: Buffer[] = [];
      if (input.parameters.includeCharts) {
        charts = await this.generateCharts(reportData, input.type);
      }

      // Generate report file based on format
      let fileBuffer: Buffer;
      let mimeType: string;
      let extension: string;

      switch (input.format) {
        case ReportFormat.PDF:
          fileBuffer = await this.pdfService.generateReport(reportData, charts);
          mimeType = 'application/pdf';
          extension = 'pdf';
          break;
        case ReportFormat.EXCEL:
          fileBuffer = await this.excelService.generateReport(reportData);
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          extension = 'xlsx';
          break;
        case ReportFormat.CSV:
          fileBuffer = await this.csvService.generateReport(reportData);
          mimeType = 'text/csv';
          extension = 'csv';
          break;
        case ReportFormat.JSON:
          fileBuffer = Buffer.from(JSON.stringify(reportData, null, 2));
          mimeType = 'application/json';
          extension = 'json';
          break;
        default:
          throw new Error(`Unsupported report format: ${input.format}`);
      }

      // Store file
      const fileName = `${report.id}_${Date.now()}.${extension}`;
      const fileUrl = await this.fileStorage.upload(fileBuffer, fileName, mimeType);

      // Update report with file URL
      savedReport = await this.reportRepository.update(savedReport.markAsCompleted(fileUrl));

      // Send email if recipients specified
      if (input.recipients && input.recipients.length > 0) {
        await this.emailService.sendReportEmail(
          input.recipients,
          savedReport,
          fileBuffer,
          fileName
        );
      }

      return {
        report: savedReport,
        fileUrl
      };
    } catch (error) {
      // Mark report as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      savedReport = await this.reportRepository.update(savedReport.markAsFailed(errorMessage));
      throw error;
    }
  }

  private async fetchReportData(report: Report): Promise<any> {
    const { type, parameters } = report;
    let data: any = {};

    switch (type) {
      case ReportType.SALES:
        data = await this.fetchSalesData(parameters);
        break;
      case ReportType.INVENTORY:
        data = await this.fetchInventoryData(parameters);
        break;
      case ReportType.FINANCIAL:
        data = await this.fetchFinancialData(parameters);
        break;
      case ReportType.CUSTOMER:
        data = await this.fetchCustomerData(parameters);
        break;
      case ReportType.PERFORMANCE:
        data = await this.fetchPerformanceData(parameters);
        break;
      case ReportType.CUSTOM:
        if (parameters.customQuery) {
          const result = await this.queryRepository.executeRaw(parameters.customQuery);
          data = { custom: result.data };
        }
        break;
    }

    return {
      report: {
        name: report.name,
        description: report.description,
        type: report.type,
        generatedAt: new Date(),
        parameters
      },
      data
    };
  }

  private async fetchSalesData(parameters: ReportParameters): Promise<any> {
    const salesQuery = `
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as order_count,
        SUM(total_amount) as total_sales,
        AVG(total_amount) as avg_order_value,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `;

    const result = await this.queryRepository.executeRaw(salesQuery, [
      parameters.startDate,
      parameters.endDate
    ]);

    // Fetch related metrics
    const metrics = await this.metricRepository.findByCategory('SALES');
    const metricValues = await Promise.all(
      metrics.map(async (metric) => ({
        metric: metric.name,
        value: metric.currentValue,
        trend: metric.getTrend(),
        changePercentage: metric.getChangePercentage()
      }))
    );

    return {
      summary: result.data,
      metrics: metricValues,
      charts: {
        dailySales: result.data,
        topProducts: await this.fetchTopProducts(parameters),
        salesByCategory: await this.fetchSalesByCategory(parameters)
      }
    };
  }

  private async fetchInventoryData(parameters: ReportParameters): Promise<any> {
    const inventoryQuery = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        i.quantity,
        i.reorder_point,
        i.reorder_quantity,
        CASE 
          WHEN i.quantity <= i.reorder_point THEN 'Low Stock'
          WHEN i.quantity = 0 THEN 'Out of Stock'
          ELSE 'In Stock'
        END as status
      FROM products p
      JOIN inventory i ON p.id = i.product_id
      ORDER BY i.quantity ASC
    `;

    const result = await this.queryRepository.executeRaw(inventoryQuery);

    return {
      inventory: result.data,
      summary: {
        totalProducts: result.data.length,
        lowStock: result.data.filter((p: any) => p.status === 'Low Stock').length,
        outOfStock: result.data.filter((p: any) => p.status === 'Out of Stock').length,
        totalValue: result.data.reduce((sum: number, p: any) => sum + (p.quantity * p.unit_cost || 0), 0)
      }
    };
  }

  private async fetchFinancialData(parameters: ReportParameters): Promise<any> {
    const financialQuery = `
      SELECT 
        DATE_TRUNC('month', date) as month,
        SUM(revenue) as revenue,
        SUM(expenses) as expenses,
        SUM(revenue - expenses) as profit,
        (SUM(revenue - expenses) / NULLIF(SUM(revenue), 0)) * 100 as profit_margin
      FROM financial_transactions
      WHERE date BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month
    `;

    const result = await this.queryRepository.executeRaw(financialQuery, [
      parameters.startDate,
      parameters.endDate
    ]);

    return {
      financial: result.data,
      summary: {
        totalRevenue: result.data.reduce((sum: number, m: any) => sum + m.revenue, 0),
        totalExpenses: result.data.reduce((sum: number, m: any) => sum + m.expenses, 0),
        totalProfit: result.data.reduce((sum: number, m: any) => sum + m.profit, 0),
        avgProfitMargin: result.data.reduce((sum: number, m: any) => sum + m.profit_margin, 0) / result.data.length
      }
    };
  }

  private async fetchCustomerData(parameters: ReportParameters): Promise<any> {
    const customerQuery = `
      SELECT 
        c.id,
        c.name,
        c.email,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as lifetime_value,
        MAX(o.created_at) as last_order_date,
        AVG(o.total_amount) as avg_order_value
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE o.created_at BETWEEN $1 AND $2
      GROUP BY c.id, c.name, c.email
      ORDER BY lifetime_value DESC
    `;

    const result = await this.queryRepository.executeRaw(customerQuery, [
      parameters.startDate,
      parameters.endDate
    ]);

    return {
      customers: result.data,
      summary: {
        totalCustomers: result.data.length,
        totalRevenue: result.data.reduce((sum: number, c: any) => sum + c.lifetime_value, 0),
        avgLifetimeValue: result.data.reduce((sum: number, c: any) => sum + c.lifetime_value, 0) / result.data.length,
        avgOrdersPerCustomer: result.data.reduce((sum: number, c: any) => sum + c.order_count, 0) / result.data.length
      }
    };
  }

  private async fetchPerformanceData(parameters: ReportParameters): Promise<any> {
    // Fetch performance metrics from all services
    const metrics = await this.metricRepository.findByCategory('PERFORMANCE');
    
    return {
      metrics: metrics.map(m => ({
        name: m.name,
        value: m.formatValue(),
        status: m.checkThresholds(),
        trend: m.getTrend()
      })),
      services: await this.fetchServicePerformance(parameters)
    };
  }

  private async fetchTopProducts(parameters: ReportParameters): Promise<any> {
    const query = `
      SELECT 
        p.name,
        COUNT(oi.id) as sales_count,
        SUM(oi.quantity * oi.unit_price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at BETWEEN $1 AND $2
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT 10
    `;

    const result = await this.queryRepository.executeRaw(query, [
      parameters.startDate,
      parameters.endDate
    ]);

    return result.data;
  }

  private async fetchSalesByCategory(parameters: ReportParameters): Promise<any> {
    const query = `
      SELECT 
        c.name as category,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity * oi.unit_price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at BETWEEN $1 AND $2
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
    `;

    const result = await this.queryRepository.executeRaw(query, [
      parameters.startDate,
      parameters.endDate
    ]);

    return result.data;
  }

  private async fetchServicePerformance(parameters: ReportParameters): Promise<any> {
    const query = `
      SELECT 
        service_name,
        AVG(response_time) as avg_response_time,
        COUNT(*) as request_count,
        SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as error_count,
        (COUNT(*) - SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END)) * 100.0 / COUNT(*) as success_rate
      FROM service_metrics
      WHERE timestamp BETWEEN $1 AND $2
      GROUP BY service_name
      ORDER BY service_name
    `;

    const result = await this.queryRepository.executeRaw(query, [
      parameters.startDate,
      parameters.endDate
    ]);

    return result.data;
  }

  private async generateCharts(data: any, reportType: ReportType): Promise<Buffer[]> {
    const charts: Buffer[] = [];

    switch (reportType) {
      case ReportType.SALES:
        if (data.data.charts.dailySales) {
          const salesChart = await this.chartService.generateLineChart({
            title: 'Daily Sales Trend',
            data: data.data.charts.dailySales,
            xField: 'date',
            yField: 'total_sales',
            width: 800,
            height: 400
          });
          charts.push(salesChart);
        }

        if (data.data.charts.salesByCategory) {
          const categoryChart = await this.chartService.generatePieChart({
            title: 'Sales by Category',
            data: data.data.charts.salesByCategory,
            labelField: 'category',
            valueField: 'revenue',
            width: 600,
            height: 400
          });
          charts.push(categoryChart);
        }
        break;

      case ReportType.FINANCIAL:
        if (data.data.financial) {
          const profitChart = await this.chartService.generateBarChart({
            title: 'Monthly Profit/Loss',
            data: data.data.financial,
            xField: 'month',
            yFields: ['revenue', 'expenses', 'profit'],
            width: 800,
            height: 400
          });
          charts.push(profitChart);
        }
        break;
    }

    return charts;
  }
}