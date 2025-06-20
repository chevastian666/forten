import Handlebars from 'handlebars';
import { TemplateContent } from '../../domain/entities/Template';
import { ITemplateEngine, RenderResult } from '../../application/interfaces/ITemplateEngine';
import { Logger } from '../../application/interfaces/ILogger';

export class TemplateEngine implements ITemplateEngine {
  private handlebars: typeof Handlebars;

  constructor(private logger: Logger) {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  async render(template: TemplateContent, variables: Record<string, any>): Promise<RenderResult> {
    try {
      const result: RenderResult = {
        body: ''
      };

      // Render subject if present
      if (template.subject) {
        const subjectTemplate = this.handlebars.compile(template.subject);
        result.subject = subjectTemplate(variables);
      }

      // Render body
      const bodyTemplate = this.handlebars.compile(template.body);
      result.body = bodyTemplate(variables);

      // Render HTML body if present
      if (template.htmlBody) {
        const htmlTemplate = this.handlebars.compile(template.htmlBody);
        result.htmlBody = htmlTemplate(variables);
      }

      return result;
    } catch (error: any) {
      this.logger.error('Template rendering failed', { 
        error: error.message,
        locale: template.locale 
      });
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  async compile(template: string): Promise<any> {
    try {
      return this.handlebars.compile(template);
    } catch (error: any) {
      throw new Error(`Template compilation failed: ${error.message}`);
    }
  }

  async validate(template: string): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      this.handlebars.compile(template);
      return { valid: true };
    } catch (error: any) {
      return { 
        valid: false, 
        errors: [error.message] 
      };
    }
  }

  private registerHelpers(): void {
    // Date formatting helper
    this.handlebars.registerHelper('formatDate', (date: Date | string, format: string) => {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Simple date formatting (you can use date-fns for more complex formatting)
      switch (format) {
        case 'short':
          return dateObj.toLocaleDateString();
        case 'long':
          return dateObj.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        case 'time':
          return dateObj.toLocaleTimeString();
        default:
          return dateObj.toISOString();
      }
    });

    // Number formatting helper
    this.handlebars.registerHelper('formatNumber', (number: number, decimals: number = 2) => {
      if (typeof number !== 'number') return '';
      return number.toFixed(decimals);
    });

    // Currency formatting helper
    this.handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'USD') => {
      if (typeof amount !== 'number') return '';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
      }).format(amount);
    });

    // Conditional helpers
    this.handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    this.handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    this.handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    this.handlebars.registerHelper('gte', (a: any, b: any) => a >= b);
    this.handlebars.registerHelper('lt', (a: any, b: any) => a < b);
    this.handlebars.registerHelper('lte', (a: any, b: any) => a <= b);

    // String helpers
    this.handlebars.registerHelper('uppercase', (str: string) => {
      return typeof str === 'string' ? str.toUpperCase() : '';
    });

    this.handlebars.registerHelper('lowercase', (str: string) => {
      return typeof str === 'string' ? str.toLowerCase() : '';
    });

    this.handlebars.registerHelper('capitalize', (str: string) => {
      if (typeof str !== 'string') return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    this.handlebars.registerHelper('truncate', (str: string, length: number = 100) => {
      if (typeof str !== 'string') return '';
      if (str.length <= length) return str;
      return str.substring(0, length) + '...';
    });

    // Array helpers
    this.handlebars.registerHelper('join', (array: any[], separator: string = ', ') => {
      if (!Array.isArray(array)) return '';
      return array.join(separator);
    });

    this.handlebars.registerHelper('first', (array: any[]) => {
      if (!Array.isArray(array) || array.length === 0) return '';
      return array[0];
    });

    this.handlebars.registerHelper('last', (array: any[]) => {
      if (!Array.isArray(array) || array.length === 0) return '';
      return array[array.length - 1];
    });

    // URL encoding helper
    this.handlebars.registerHelper('urlEncode', (str: string) => {
      return typeof str === 'string' ? encodeURIComponent(str) : '';
    });

    // Default value helper
    this.handlebars.registerHelper('default', (value: any, defaultValue: any) => {
      return value !== undefined && value !== null && value !== '' ? value : defaultValue;
    });

    // Pluralization helper
    this.handlebars.registerHelper('pluralize', (count: number, singular: string, plural: string) => {
      return count === 1 ? singular : plural;
    });

    // JSON stringify helper (useful for debugging)
    this.handlebars.registerHelper('json', (context: any) => {
      return JSON.stringify(context, null, 2);
    });
  }
}