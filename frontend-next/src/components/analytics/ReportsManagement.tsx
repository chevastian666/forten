'use client';

import { useState } from 'react';
import { useReports } from '@/hooks/useReports';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Download,
  Mail,
  Calendar,
  MoreVertical,
  Plus,
  Copy,
  Eye,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  FileJson,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Report, ReportType, ReportFormat, TimeRange } from '@/services/analytics/types';
import { ANALYTICS_CONFIG } from '@/services/analytics/config';

export function ReportsManagement() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('month');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [newReport, setNewReport] = useState({
    name: '',
    type: 'custom' as ReportType,
    description: '',
    template: {
      id: '',
      name: '',
      sections: []
    },
    format: ['pdf'] as ReportFormat[],
    recipients: [] as string[]
  });

  const {
    reports,
    isLoading,
    isGenerating,
    generationProgress,
    generateReport,
    generateAndEmailReport,
    scheduleReport,
    createReport,
    deleteReport,
    duplicateReport,
    previewReport,
    getReportTemplates
  } = useReports();

  const { getDateRange } = useAnalytics({ timeRange: selectedTimeRange });

  const templates = getReportTemplates();

  const getFormatIcon = (format: ReportFormat) => {
    switch (format) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'csv':
        return <FileText className="h-4 w-4" />;
      case 'json':
        return <FileJson className="h-4 w-4" />;
    }
  };

  const getReportTypeLabel = (type: ReportType) => {
    const labels: Record<ReportType, string> = {
      access: 'Accesos',
      security: 'Seguridad',
      maintenance: 'Mantenimiento',
      financial: 'Financiero',
      occupancy: 'Ocupación',
      custom: 'Personalizado'
    };
    return labels[type];
  };

  const handleCreateReport = () => {
    if (!newReport.name || !newReport.type) return;

    const selectedTemplate = templates.find(t => t.id === newReport.template.id);
    
    createReport({
      ...newReport,
      template: selectedTemplate ? {
        id: selectedTemplate.id,
        name: selectedTemplate.name,
        sections: [], // Would be populated from template
        header: {
          title: newReport.name,
          date: true,
          pageNumbers: true
        },
        footer: {
          showDate: true,
          showPageNumber: true
        }
      } : newReport.template
    });

    setShowCreateDialog(false);
    resetNewReport();
  };

  const resetNewReport = () => {
    setNewReport({
      name: '',
      type: 'custom',
      description: '',
      template: {
        id: '',
        name: '',
        sections: []
      },
      format: ['pdf'],
      recipients: []
    });
  };

  const scheduledReports = reports?.filter(r => r.schedule?.enabled) || [];
  const unscheduledReports = reports?.filter(r => !r.schedule?.enabled) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reportes</h2>
          <p className="text-muted-foreground">
            Genera y programa reportes analíticos
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Reporte
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reportes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledReports.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generados Hoy</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Programado</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">En 2 horas</div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos los Reportes</TabsTrigger>
          <TabsTrigger value="scheduled">
            Programados
            {scheduledReports.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {scheduledReports.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Reportes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Programación</TableHead>
                    <TableHead>Última Generación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No hay reportes configurados
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports?.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getReportTypeLabel(report.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {report.format.map((format) => (
                              <div key={format} title={format.toUpperCase()}>
                                {getFormatIcon(format)}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {report.schedule?.enabled ? (
                            <Badge variant="success">
                              {report.schedule.frequency}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Manual</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {format(new Date(report.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => generateReport(report.id, undefined, selectedTimeRange)}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Generar ahora
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => previewReport(report.id, undefined, selectedTimeRange)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Vista previa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedReport(report);
                                  setShowScheduleDialog(true);
                                }}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                Programar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => duplicateReport(report.id)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => deleteReport(report.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Reportes Programados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scheduledReports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay reportes programados
                  </p>
                ) : (
                  scheduledReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div>
                        <h4 className="font-medium">{report.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {report.schedule?.frequency} - {report.schedule?.time || 'Sin hora definida'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {report.recipients && report.recipients.length > 0 && (
                          <Badge variant="secondary">
                            <Mail className="mr-1 h-3 w-3" />
                            {report.recipients.length} destinatarios
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowScheduleDialog(true);
                          }}
                        >
                          Configurar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Plantillas de Reportes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {template.description}
                      </p>
                      <Badge>{getReportTypeLabel(template.type)}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generation Progress */}
      {isGenerating && (
        <Card className="fixed bottom-4 right-4 w-80 shadow-lg">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Generando reporte...</span>
                <span className="text-sm text-muted-foreground">{generationProgress}%</span>
              </div>
              <Progress value={generationProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Report Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Reporte</DialogTitle>
            <DialogDescription>
              Configura un nuevo reporte analítico
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre del Reporte</Label>
              <Input
                id="name"
                value={newReport.name}
                onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                placeholder="Ej: Reporte Mensual de Accesos"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={newReport.description}
                onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                placeholder="Describe el contenido del reporte"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo de Reporte</Label>
                <Select
                  value={newReport.type}
                  onValueChange={(value) => setNewReport({ ...newReport, type: value as ReportType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="access">Accesos</SelectItem>
                    <SelectItem value="security">Seguridad</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    <SelectItem value="financial">Financiero</SelectItem>
                    <SelectItem value="occupancy">Ocupación</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Plantilla</Label>
                <Select
                  value={newReport.template.id}
                  onValueChange={(value) => 
                    setNewReport({ 
                      ...newReport, 
                      template: { ...newReport.template, id: value }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates
                      .filter(t => t.type === newReport.type || newReport.type === 'custom')
                      .map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Formatos de Exportación</Label>
              <div className="flex gap-2">
                {(['pdf', 'excel', 'csv', 'json'] as ReportFormat[]).map((format) => (
                  <Button
                    key={format}
                    variant={newReport.format.includes(format) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const formats = newReport.format.includes(format)
                        ? newReport.format.filter(f => f !== format)
                        : [...newReport.format, format];
                      setNewReport({ ...newReport, format: formats });
                    }}
                  >
                    {getFormatIcon(format)}
                    <span className="ml-2">{format.toUpperCase()}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="recipients">Destinatarios (opcional)</Label>
              <Input
                id="recipients"
                placeholder="email1@ejemplo.com, email2@ejemplo.com"
                onChange={(e) => 
                  setNewReport({ 
                    ...newReport, 
                    recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateReport}>
              Crear Reporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Report Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programar Reporte</DialogTitle>
            <DialogDescription>
              Configura la generación automática de este reporte
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Frecuencia</Label>
              <Select defaultValue={selectedReport?.schedule?.frequency || 'monthly'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Hora de Generación</Label>
              <Input type="time" defaultValue="08:00" />
            </div>

            <div className="grid gap-2">
              <Label>Enviar por Email a</Label>
              <Textarea
                placeholder="email1@ejemplo.com, email2@ejemplo.com"
                rows={2}
                defaultValue={selectedReport?.recipients?.join(', ')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancelar
            </Button>
            <Button>
              <Calendar className="mr-2 h-4 w-4" />
              Programar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}