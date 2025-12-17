import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Payment, PaymentType, PAYMENT_TYPE_LABELS } from "@/types";
import { validatePositiveNumber } from "@/utils/validation";
import { formatCurrency } from "@/utils/coverage";

interface PaymentFormProps {
  payments: Payment[];
  onChange: (payments: Payment[]) => void;
  disabled?: boolean;
  totalNegocioClp?: number;
}

export function PaymentForm({ payments, onChange, disabled = false, totalNegocioClp = 0 }: PaymentFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Track raw input values for each payment to allow digit-by-digit entry
  const [rawMontoInputs, setRawMontoInputs] = useState<Record<number, string>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const formatNumberForDisplay = (value: number) => {
    if (value === 0 || !value) return '';
    return new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const parseChileanNumber = (value: string): number => {
    if (!value) return 0;
    // Remove dots (thousand separators) and replace comma with dot for parsing
    const normalized = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  const addPayment = () => {
    const newPayment: Payment = {
      tipo: PaymentType.PIE,
      montoClp: 0,
      fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      observaciones: "",
      isRemainingBalance: false
    };
    onChange([...payments, newPayment]);
  };

  const removePayment = (index: number) => {
    onChange(payments.filter((_, i) => i !== index));
  };

  const updatePayment = (index: number, field: keyof Payment, value: any) => {
    const updatedPayments = [...payments];
    
    // Si se está marcando isRemainingBalance, desmarcar todas las demás
    if (field === 'isRemainingBalance' && value === true) {
      updatedPayments.forEach((payment, i) => {
        if (i !== index) {
          payment.isRemainingBalance = false;
        }
      });
    }
    
    updatedPayments[index] = { ...updatedPayments[index], [field]: value };
    onChange(updatedPayments);

    // Clear error for this field
    const errorKey = `${index}-${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const validatePayment = (payment: Payment, index: number) => {
    const newErrors: Record<string, string> = {};

    if (!validatePositiveNumber(payment.montoClp)) {
      newErrors[`${index}-montoClp`] = "Debe ser un monto válido mayor a 0";
    }

    // Fechas de vencimiento pueden ser pasadas o futuras para todas las formas de pago

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const totalAmount = payments.reduce((sum, p) => sum + (p.montoClp || 0), 0);
  const remainingAmount = totalNegocioClp - totalAmount;

  // Auto-ajustar el pago con isRemainingBalance=true cuando cambien los montos
  useEffect(() => {
    const remainingBalanceIndex = payments.findIndex(p => p.isRemainingBalance);
    if (remainingBalanceIndex !== -1 && totalNegocioClp > 0) {
      const otherPaymentsTotal = payments.reduce((sum, p, i) => 
        i === remainingBalanceIndex ? sum : sum + (p.montoClp || 0), 0
      );
      const newRemainingAmount = Math.max(0, totalNegocioClp - otherPaymentsTotal);
      
      if (payments[remainingBalanceIndex].montoClp !== newRemainingAmount) {
        const updatedPayments = [...payments];
        updatedPayments[remainingBalanceIndex] = {
          ...updatedPayments[remainingBalanceIndex],
          montoClp: newRemainingAmount
        };
        onChange(updatedPayments);
      }
    }
  }, [totalNegocioClp, payments.map(p => p.isRemainingBalance ? 0 : p.montoClp).join(',')]);

  const handleRemainingBalanceClick = (index: number, checked: boolean) => {
    if (checked) {
      // Calcular el saldo restante actual
      const currentTotal = payments.reduce((sum, p, i) => sum + (i === index ? 0 : (p.montoClp || 0)), 0);
      const currentRemaining = Math.max(0, totalNegocioClp - currentTotal);
      
      // Actualizar tanto el checkbox como el monto
      const updatedPayments = [...payments];
      updatedPayments.forEach((payment, i) => {
        payment.isRemainingBalance = i === index;
      });
      updatedPayments[index].montoClp = currentRemaining;
      onChange(updatedPayments);
    } else {
      updatePayment(index, 'isRemainingBalance', false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Formas de pago</Label>
        <div className="text-sm text-muted-foreground">
          Total: {formatCurrency(totalAmount)}
          {totalNegocioClp > 0 && (
            <span className={`ml-2 ${remainingAmount === 0 ? 'text-success' : remainingAmount < 0 ? 'text-destructive' : 'text-warning'}`}>
              Saldo restante: {formatCurrency(remainingAmount)}
            </span>
          )}
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">No hay formas de pago agregadas</p>
          <Button onClick={addPayment} disabled={disabled}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar forma de pago
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
              <div className="col-span-2">Tipo</div>
              <div className="col-span-2">Monto CLP</div>
              <div className="col-span-1">Saldo</div>
              <div className="col-span-3">Fecha vencimiento</div>
              <div className="col-span-3">Observaciones</div>
              <div className="col-span-1"></div>
            </div>

            {payments.map((payment, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-2">
                  <Select
                    value={payment.tipo}
                    onValueChange={(value) => updatePayment(index, 'tipo', value as PaymentType)}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Input
                    type="text"
                    value={editingIndex === index 
                      ? (rawMontoInputs[index] ?? '') 
                      : formatNumberForDisplay(payment.montoClp || 0)}
                    onChange={(e) => {
                      // Allow only digits, dots and comma
                      const cleanValue = e.target.value.replace(/[^\d.,]/g, '');
                      setRawMontoInputs(prev => ({ ...prev, [index]: cleanValue }));
                    }}
                    onFocus={() => {
                      setEditingIndex(index);
                      // Initialize raw input with current value
                      setRawMontoInputs(prev => ({ 
                        ...prev, 
                        [index]: payment.montoClp ? String(payment.montoClp) : '' 
                      }));
                    }}
                    onBlur={() => {
                      // Parse and update the actual payment value
                      const parsedValue = parseChileanNumber(rawMontoInputs[index] || '');
                      updatePayment(index, 'montoClp', parsedValue);
                      setEditingIndex(null);
                      validatePayment({ ...payment, montoClp: parsedValue }, index);
                    }}
                    placeholder="0"
                    disabled={disabled || payment.isRemainingBalance}
                    className={errors[`${index}-montoClp`] ? "border-destructive" : ""}
                  />
                  {errors[`${index}-montoClp`] && (
                    <p className="text-xs text-destructive mt-1">{errors[`${index}-montoClp`]}</p>
                  )}
                </div>

                <div className="col-span-1 flex items-center justify-center">
                  <Checkbox
                    id={`remaining-${index}`}
                    checked={payment.isRemainingBalance || false}
                    disabled={disabled}
                    onCheckedChange={(checked) => {
                      handleRemainingBalanceClick(index, checked as boolean);
                    }}
                    title="Completar saldo restante"
                  />
                  <Label 
                    htmlFor={`remaining-${index}`} 
                    className="text-xs ml-1 cursor-pointer"
                    title="Completar saldo restante"
                  >
                    Saldo
                  </Label>
                </div>

                <div className="col-span-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !payment.fechaVencimiento && "text-muted-foreground",
                          errors[`${index}-fechaVencimiento`] && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {payment.fechaVencimiento 
                          ? format(new Date(payment.fechaVencimiento + 'T00:00:00'), "dd-MM-yyyy")
                          : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={payment.fechaVencimiento ? new Date(payment.fechaVencimiento + 'T00:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            updatePayment(index, 'fechaVencimiento', format(date, "yyyy-MM-dd"));
                          }
                        }}
                        defaultMonth={new Date()}
                        locale={es}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {errors[`${index}-fechaVencimiento`] && (
                    <p className="text-xs text-destructive mt-1">{errors[`${index}-fechaVencimiento`]}</p>
                  )}
                </div>

                <div className="col-span-3">
                  <Textarea
                    value={payment.observaciones || ''}
                    onChange={(e) => updatePayment(index, 'observaciones', e.target.value)}
                    placeholder="Opcional"
                    rows={1}
                    disabled={disabled}
                    className="resize-none"
                  />
                </div>

                <div className="col-span-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePayment(index)}
                    disabled={disabled}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={addPayment} variant="outline" disabled={disabled}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar forma de pago
          </Button>
        </>
      )}
    </div>
  );
}