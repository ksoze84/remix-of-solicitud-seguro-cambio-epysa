import { useState, useEffect } from "react";
import { Save, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentForm } from "./payment-form";
import { CurrencyRequest, Payment, RequestStatus } from "@/types";
import { validateRUT, formatRUT, validatePositiveNumber } from "@/utils/validation";
import { calculateCoverage, formatCurrency } from "@/utils/coverage";
import { useToast } from "@/hooks/use-toast";
import { exec } from "@/integrations/epy/EpysaApi";


interface RequestFormProps {
  request?: CurrencyRequest;
  onSave: (request: Partial<CurrencyRequest>, status: RequestStatus, selectedUserId?: string) => void;
  onCancel: () => void;
  isAdmin?: boolean;
}

export function RequestForm({ request, onSave, onCancel, isAdmin = false }: Readonly<RequestFormProps>) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    cliente: request?.cliente || '',
    rut: request?.rut || '',
    montoNegocioUsd: request?.montoNegocioUsd?.toString() || '',
    unidades: request?.unidades?.toString() || '1',
    tcReferencial: request?.tcCliente?.toString() || '950',
    notas: request?.notas || ''
  });
  const [numerosInternos, setNumerosInternos] = useState<string[]>(
    request?.numerosInternos || ['']
  );
  const [payments, setPayments] = useState<Payment[]>(request?.payments || []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [sellers, setSellers] = useState<Array<{ id: string; user_id: string | null; nombre_apellido: string; email?: string }>>([]);

  // Parse Chilean format number (1.234,56) to float - defined early for coverage calc
  const parseChileanNumberEarly = (value: string): number => {
    if (!value) return 0;
    const normalized = value.replace(/\./g, '').replace(',', '.');
    const num = Number.parseFloat(normalized);
    return Number.isNaN(num) ? 0 : num;
  };

  const coverage = calculateCoverage(
    payments, 
    undefined, 
    Number.parseFloat(formData.tcReferencial) || 950,
    parseChileanNumberEarly(formData.montoNegocioUsd)
  );

  // Fetch sellers if admin (only those who have registered)
  useEffect(() => {
    if (isAdmin) {
      const fetchSellers = async () => {

        const data = (await exec('ECP_ListaVendedores_Consola')).data;

        if (data) {
          setSellers(data.map(s => ({ 
            id: s.Entidad_comercial,
            user_id: s.Entidad_comercial,
            nombre_apellido: s.Nombre,
            email: s.email || s.nombre 
          })));
        }
      };
      fetchSellers();
    }
  }, [isAdmin]);

  // Update internal numbers array when units change
  useEffect(() => {
    const unitsCount = Number.parseInt(formData.unidades) || 1;
    setNumerosInternos(prev => {
      const newArray = [...prev];
      if (newArray.length < unitsCount) {
        // Add empty strings for new units
        while (newArray.length < unitsCount) {
          newArray.push('');
        }
      } else if (newArray.length > unitsCount) {
        // Remove excess internal numbers
        newArray.splice(unitsCount);
      }
      return newArray;
    });
  }, [formData.unidades]);

  const validateForm = (forSubmission = false) => {
    const newErrors: Record<string, string> = {};

    // Only require seller selection if there are sellers available
    if (isAdmin && !selectedUserId && sellers.length > 0) {
      newErrors.selectedUserId = "Debe seleccionar un vendedor";
    }

    if (!formData.cliente.trim()) {
      newErrors.cliente = "Cliente es requerido";
    }

    if (!formData.rut.trim()) {
      newErrors.rut = "RUT es requerido";
    } else if (!validateRUT(formData.rut)) {
      newErrors.rut = "RUT inválido";
    }

    if (!validatePositiveNumber(formData.montoNegocioUsd)) {
      newErrors.montoNegocioUsd = "Debe ser un monto válido mayor a 0";
    }

    if (!validatePositiveNumber(formData.unidades)) {
      newErrors.unidades = "Debe ser un número válido mayor a 0";
    }

    if (!validatePositiveNumber(formData.tcReferencial)) {
      newErrors.tcReferencial = "Debe ser un tipo de cambio válido mayor a 0";
    }

    // Validate internal numbers if submission
    if (forSubmission) {
      numerosInternos.forEach((numero, index) => {
        if (!numero.trim()) {
          newErrors[`numeroInterno${index}`] = `Número interno ${index + 1} es requerido`;
        }
      });
    }

    if (forSubmission) {
      if (payments.length === 0) {
        newErrors.payments = "Debe agregar al menos una forma de pago";
      }

      if (coverage.totalNegocio === 0) {
        newErrors.payments = "El total de las formas de pago debe ser mayor a 0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Parse Chilean format number (1.234,56) to float
  const parseChileanNumber = (value: string): number => {
    if (!value) return 0;
    // Remove dots (thousands separator) and replace comma (decimal separator) with dot
    const normalized = value.replace(/\./g, '').replace(',', '.');
    const num = Number.parseFloat(normalized);
    return Number.isNaN(num) ? 0 : num;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleMontoChange = (value: string) => {
    // Allow only digits, dots (thousands separator) and comma (decimal separator)
    // Store raw value to allow digit-by-digit entry
    const cleanValue = value.replace(/[^\d.,]/g, '');
    setFormData(prev => ({ ...prev, montoNegocioUsd: cleanValue }));
    
    // Clear error for this field
    if (errors.montoNegocioUsd) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.montoNegocioUsd;
        return newErrors;
      });
    }
  };

  const handleRUTChange = (value: string) => {
    const formatted = formatRUT(value);
    handleInputChange('rut', formatted);
  };

  const handleNumeroInternoChange = (index: number, value: string) => {
    setNumerosInternos(prev => {
      const newArray = [...prev];
      newArray[index] = value;
      return newArray;
    });
    
    // Clear error for this field
    const fieldName = `numeroInterno${index}`;
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleSave = async (status: RequestStatus) => {
    const isValid = validateForm(status === RequestStatus.EN_REVISION);
    
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const requestData: Partial<CurrencyRequest> = {
        cliente: formData.cliente.trim(),
        rut: formData.rut.trim(),
        montoNegocioUsd: parseChileanNumber(formData.montoNegocioUsd),
        unidades: parseInt(formData.unidades),
        tcReferencial: parseFloat(formData.tcReferencial),
        numerosInternos: numerosInternos.filter(n => n.trim() !== ""),
        notas: formData.notas.trim() || undefined,
        payments: payments,
        estado: status
      };

      await onSave(requestData, status, isAdmin ? selectedUserId : undefined);
      
      toast({
        title: status === RequestStatus.BORRADOR ? "Borrador guardado" : "Solicitud enviada",
        description: status === RequestStatus.BORRADOR 
          ? "Los cambios han sido guardados como borrador"
          : "La solicitud ha sido enviada para revisión"
      });
    } catch {
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar la solicitud",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEdit = !request || request.estado === RequestStatus.BORRADOR;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>
            {request ? 'Editar solicitud' : 'Nueva solicitud de seguro de cambio'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isAdmin && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <Label htmlFor="seller">
                Vendedor asignado {sellers.length > 0 ? '*' : '(opcional)'}
              </Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={sellers.length === 0}>
                <SelectTrigger className={errors.selectedUserId ? "border-destructive" : ""}>
                  <SelectValue placeholder={sellers.length === 0 ? "No hay vendedores registrados" : "Seleccionar vendedor"} />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.user_id}>
                      {seller.nombre_apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sellers.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Los vendedores deben registrarse antes. La solicitud se creará sin asignar.
                </p>
              ) : (
                errors.selectedUserId && (
                  <p className="text-xs text-destructive">{errors.selectedUserId}</p>
                )
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente *</Label>
              <Input
                id="cliente"
                value={formData.cliente}
                onChange={(e) => handleInputChange('cliente', e.target.value)}
                placeholder="Nombre del cliente"
                disabled={!canEdit}
                className={errors.cliente ? "border-destructive" : ""}
              />
              {errors.cliente && (
                <p className="text-xs text-destructive">{errors.cliente}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rut">RUT *</Label>
              <Input
                id="rut"
                value={formData.rut}
                onChange={(e) => handleRUTChange(e.target.value)}
                placeholder="12.345.678-9"
                disabled={!canEdit}
                className={errors.rut ? "border-destructive" : ""}
              />
              {errors.rut && (
                <p className="text-xs text-destructive">{errors.rut}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="montoUsd">Monto del negocio (USD) *</Label>
              <Input
                id="montoUsd"
                type="text"
                value={formData.montoNegocioUsd}
                onChange={(e) => handleMontoChange(e.target.value)}
                placeholder="0"
                disabled={!canEdit}
                className={errors.montoNegocioUsd ? "border-destructive" : ""}
              />
              {errors.montoNegocioUsd && (
                <p className="text-xs text-destructive">{errors.montoNegocioUsd}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unidades">Unidades *</Label>
              <Input
                id="unidades"
                type="number"
                value={formData.unidades}
                onChange={(e) => handleInputChange('unidades', e.target.value)}
                placeholder="1"
                disabled={!canEdit}
                className={errors.unidades ? "border-destructive" : ""}
              />
              {errors.unidades && (
                <p className="text-xs text-destructive">{errors.unidades}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tcReferencial">Tipo de Cambio Referencial (CLP/USD) *</Label>
              <Input
                id="tcReferencial"
                type="number"
                step="0.01"
                value={formData.tcReferencial}
                onChange={(e) => handleInputChange('tcReferencial', e.target.value)}
                placeholder="950.00"
                disabled={!canEdit}
                className={errors.tcReferencial ? "border-destructive" : ""}
              />
              {errors.tcReferencial && (
                <p className="text-xs text-destructive">{errors.tcReferencial}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Total del Negocio (CLP)</Label>
              <div className="text-lg font-semibold">
                {formatCurrency(parseChileanNumber(formData.montoNegocioUsd) * (parseFloat(formData.tcReferencial) || 950))}
              </div>
            </div>
          </div>

          {/* Internal Numbers Section */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Números internos</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {numerosInternos.map((numero, index) => (
                <div key={index} className="space-y-2">
                  <Label htmlFor={`numeroInterno${index}`}>
                    Número interno {index + 1} *
                  </Label>
                  <Input
                    id={`numeroInterno${index}`}
                    value={numero}
                    onChange={(e) => handleNumeroInternoChange(index, e.target.value)}
                    placeholder={`Ingrese número interno ${index + 1}`}
                    disabled={!canEdit}
                    className={errors[`numeroInterno${index}`] ? "border-destructive" : ""}
                  />
                  {errors[`numeroInterno${index}`] && (
                    <p className="text-xs text-destructive">{errors[`numeroInterno${index}`]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas adicionales</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => handleInputChange('notas', e.target.value)}
              placeholder="Información adicional sobre la solicitud..."
              rows={3}
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-4">
            <PaymentForm
              payments={payments}
              onChange={setPayments}
              disabled={!canEdit}
              totalNegocioClp={coverage.totalNegocioClp || 0}
            />
            {errors.payments && (
              <p className="text-sm text-destructive">{errors.payments}</p>
            )}
          </div>

          {canEdit && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => handleSave(RequestStatus.BORRADOR)}
                variant="outline"
                disabled={isSubmitting}
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar borrador
              </Button>
              
              <Button
                onClick={() => handleSave(RequestStatus.EN_REVISION)}
                disabled={isSubmitting}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar a revisión
              </Button>

              <Button
                onClick={onCancel}
                variant="ghost"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {request && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen financiero</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Total negocio</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(coverage.totalNegocio, 'USD')}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Base de cobertura</div>
                <div className="text-xl font-semibold">
                  {formatCurrency(coverage.baseCoberturaClp || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  (Pie + Contra Entrega + Financiamiento)
                </div>
              </div>

              {coverage.totalNegocio > 0 && (
                <div className="pt-4 border-t space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exposición cubierta:</span>
                    <span className="font-medium">{formatCurrency(coverage.exposicionCubierta || 0, 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exposición descubierta:</span>
                    <span className="font-medium">{formatCurrency(coverage.exposicionDescubierta || 0, 'USD')}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}