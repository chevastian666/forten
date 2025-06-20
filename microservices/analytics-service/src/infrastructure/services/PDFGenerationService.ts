import puppeteer, { Browser, Page } from 'puppeteer';
import { Logger } from '@infrastructure/logging/Logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import Handlebars from 'handlebars';

export interface PDFOptions {
  format?: 'A4' | 'A3' | 'Letter' | 'Legal';
  landscape?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}

export class PDFGenerationService {
  private browser: Browser | null = null;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(private readonly logger: Logger) {
    this.initializeTemplates();
  }

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
    }
  }

  async generateReport(data: any, charts?: Buffer[], options?: PDFOptions): Promise<Buffer> {
    await this.initialize();

    const page = await this.browser!.newPage();

    try {
      // Generate HTML from template
      const html = await this.generateHTML(data, charts);

      // Set content
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: options?.format || 'A4',
        landscape: options?.landscape || false,
        margin: options?.margin || {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        displayHeaderFooter: options?.displayHeaderFooter || true,
        headerTemplate: options?.headerTemplate || this.getDefaultHeaderTemplate(),
        footerTemplate: options?.footerTemplate || this.getDefaultFooterTemplate(),
        printBackground: true
      });

      return pdfBuffer;
    } finally {
      await page.close();
    }
  }

  async generateInvoice(invoiceData: any): Promise<Buffer> {
    const template = this.templates.get('invoice');
    if (!template) {
      throw new Error('Invoice template not found');
    }

    const html = template(invoiceData);
    return this.generatePDFFromHTML(html);
  }

  async generateStatement(statementData: any): Promise<Buffer> {
    const template = this.templates.get('statement');
    if (!template) {
      throw new Error('Statement template not found');
    }

    const html = template(statementData);
    return this.generatePDFFromHTML(html);
  }

  private async generateHTML(data: any, charts?: Buffer[]): Promise<string> {
    const template = this.templates.get('report');
    if (!template) {
      throw new Error('Report template not found');
    }

    // Convert chart buffers to base64 for embedding
    const chartImages = charts?.map(chart => ({
      data: `data:image/png;base64,${chart.toString('base64')}`
    })) || [];

    const context = {
      ...data,
      charts: chartImages,
      generatedAt: new Date().toLocaleString(),
      styles: this.getReportStyles()
    };

    return template(context);
  }

  private async generatePDFFromHTML(html: string, options?: PDFOptions): Promise<Buffer> {
    await this.initialize();

    const page = await this.browser!.newPage();

    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: options?.format || 'A4',
        landscape: options?.landscape || false,
        margin: options?.margin || {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        printBackground: true
      });

      return pdfBuffer;
    } finally {
      await page.close();
    }
  }

  private async initializeTemplates(): Promise<void> {
    // Register Handlebars helpers
    Handlebars.registerHelper('formatCurrency', (value: number, currency: string = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
      }).format(value);
    });

    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      return new Date(date).toLocaleDateString();
    });

    Handlebars.registerHelper('formatNumber', (value: number) => {
      return new Intl.NumberFormat('en-US').format(value);
    });

    Handlebars.registerHelper('formatPercentage', (value: number) => {
      return `${(value * 100).toFixed(2)}%`;
    });

    // Load templates
    const reportTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{report.name}}</title>
  <style>{{{styles}}}</style>
</head>
<body>
  <div class="report-container">
    <header class="report-header">
      <h1>{{report.name}}</h1>
      <p class="report-description">{{report.description}}</p>
      <div class="report-meta">
        <span>Generated: {{generatedAt}}</span>
        <span>Period: {{formatDate report.parameters.startDate}} - {{formatDate report.parameters.endDate}}</span>
      </div>
    </header>

    {{#if data.summary}}
    <section class="summary-section">
      <h2>Summary</h2>
      <div class="summary-grid">
        {{#each data.summary}}
        <div class="summary-card">
          <h3>{{@key}}</h3>
          <p class="summary-value">{{formatNumber this}}</p>
        </div>
        {{/each}}
      </div>
    </section>
    {{/if}}

    {{#if data.metrics}}
    <section class="metrics-section">
      <h2>Key Metrics</h2>
      <table class="metrics-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Trend</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {{#each data.metrics}}
          <tr>
            <td>{{metric}}</td>
            <td>{{formatNumber value}}</td>
            <td class="trend-{{trend}}">{{trend}}</td>
            <td>{{#if changePercentage}}{{formatPercentage changePercentage}}{{else}}-{{/if}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>
    </section>
    {{/if}}

    {{#if charts}}
    <section class="charts-section">
      <h2>Charts & Visualizations</h2>
      <div class="charts-grid">
        {{#each charts}}
        <div class="chart-container">
          <img src="{{data}}" alt="Chart" />
        </div>
        {{/each}}
      </div>
    </section>
    {{/if}}

    {{#if data}}
    <section class="data-section">
      <h2>Detailed Data</h2>
      {{#each data}}
        {{#if (lookup . 0)}}
        <h3>{{@key}}</h3>
        <table class="data-table">
          <thead>
            <tr>
              {{#each (lookup . 0)}}
              <th>{{@key}}</th>
              {{/each}}
            </tr>
          </thead>
          <tbody>
            {{#each .}}
            <tr>
              {{#each .}}
              <td>{{this}}</td>
              {{/each}}
            </tr>
            {{/each}}
          </tbody>
        </table>
        {{/if}}
      {{/each}}
    </section>
    {{/if}}
  </div>
</body>
</html>
    `;

    this.templates.set('report', Handlebars.compile(reportTemplate));

    // Invoice template
    const invoiceTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice #{{invoiceNumber}}</title>
  <style>{{{styles}}}</style>
</head>
<body>
  <div class="invoice-container">
    <header>
      <div class="invoice-header">
        <div class="company-info">
          <h1>{{company.name}}</h1>
          <p>{{company.address}}</p>
          <p>{{company.phone}} | {{company.email}}</p>
        </div>
        <div class="invoice-info">
          <h2>INVOICE</h2>
          <p><strong>Invoice #:</strong> {{invoiceNumber}}</p>
          <p><strong>Date:</strong> {{formatDate date}}</p>
          <p><strong>Due Date:</strong> {{formatDate dueDate}}</p>
        </div>
      </div>
    </header>

    <section class="billing-info">
      <div class="bill-to">
        <h3>Bill To:</h3>
        <p><strong>{{customer.name}}</strong></p>
        <p>{{customer.address}}</p>
        <p>{{customer.email}}</p>
      </div>
    </section>

    <section class="invoice-items">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {{#each items}}
          <tr>
            <td>{{description}}</td>
            <td>{{quantity}}</td>
            <td>{{formatCurrency unitPrice}}</td>
            <td>{{formatCurrency total}}</td>
          </tr>
          {{/each}}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3">Subtotal</td>
            <td>{{formatCurrency subtotal}}</td>
          </tr>
          <tr>
            <td colspan="3">Tax ({{taxRate}}%)</td>
            <td>{{formatCurrency tax}}</td>
          </tr>
          <tr class="total-row">
            <td colspan="3"><strong>Total</strong></td>
            <td><strong>{{formatCurrency total}}</strong></td>
          </tr>
        </tfoot>
      </table>
    </section>
  </div>
</body>
</html>
    `;

    this.templates.set('invoice', Handlebars.compile(invoiceTemplate));
  }

  private getReportStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
      }

      .report-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }

      .report-header {
        text-align: center;
        margin-bottom: 40px;
        padding-bottom: 20px;
        border-bottom: 2px solid #e0e0e0;
      }

      .report-header h1 {
        color: #2c3e50;
        margin-bottom: 10px;
      }

      .report-description {
        color: #666;
        font-size: 16px;
        margin-bottom: 10px;
      }

      .report-meta {
        font-size: 14px;
        color: #999;
      }

      .report-meta span {
        margin: 0 10px;
      }

      .summary-section {
        margin-bottom: 40px;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }

      .summary-card {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
      }

      .summary-card h3 {
        color: #666;
        font-size: 14px;
        margin-bottom: 10px;
        text-transform: uppercase;
      }

      .summary-value {
        font-size: 24px;
        font-weight: bold;
        color: #2c3e50;
      }

      .metrics-table,
      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }

      .metrics-table th,
      .metrics-table td,
      .data-table th,
      .data-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e0e0e0;
      }

      .metrics-table th,
      .data-table th {
        background: #f8f9fa;
        font-weight: 600;
        color: #2c3e50;
      }

      .trend-up {
        color: #27ae60;
      }

      .trend-down {
        color: #e74c3c;
      }

      .trend-stable {
        color: #95a5a6;
      }

      .charts-section {
        margin-bottom: 40px;
      }

      .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }

      .chart-container {
        background: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .chart-container img {
        width: 100%;
        height: auto;
      }

      .data-section h3 {
        margin-top: 30px;
        margin-bottom: 10px;
        color: #2c3e50;
      }

      @media print {
        .report-container {
          max-width: 100%;
        }

        .page-break {
          page-break-after: always;
        }
      }
    `;
  }

  private getDefaultHeaderTemplate(): string {
    return `
      <div style="font-size: 10px; margin: 20px; color: #999;">
        <span>Forten CRM Analytics Report</span>
      </div>
    `;
  }

  private getDefaultFooterTemplate(): string {
    return `
      <div style="font-size: 10px; margin: 20px; color: #999; text-align: center;">
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `;
  }

  async destroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}