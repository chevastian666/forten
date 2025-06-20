import { TemplateContent } from '../../domain/entities/Template';

export interface RenderResult {
  subject?: string;
  body: string;
  htmlBody?: string;
}

export interface ITemplateEngine {
  render(template: TemplateContent, variables: Record<string, any>): Promise<RenderResult>;
  compile(template: string): Promise<any>;
  validate(template: string): Promise<{ valid: boolean; errors?: string[] }>;
}