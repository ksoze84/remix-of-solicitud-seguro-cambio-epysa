import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Check, X, Download, CalendarIcon, Send } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { CoverageIndicator } from "@/components/ui/coverage-indicator";
import { CurrencyRequest, UserRole, RequestStatus, PAYMENT_TYPE_LABELS, Payment, NumeroInterno } from "@/types";
import { PaymentForm } from "@/components/forms/payment-form";
import { useBanks } from "@/hooks/useBanks";
import { useBankExecutives } from '@/hooks/useBankExecutives';
import { formatCurrency, calculateCoverage, formatNumber } from "@/utils/coverage";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useViewRole } from "@/contexts/ViewRoleContext";
import { exec } from "@/integrations/epy/EpysaApi";

export default function RequestDetail() { //NOSONAR
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: authUser, userProfile } = useAuth();
  const { currentViewRole } = useViewRole();
  const { banks } = useBanks();
  const [request, setRequest] = useState<CurrencyRequest | null>(null);
  const [requestNumber, setRequestNumber] = useState<string>("");

  const requestId = id;
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingRequestData, setIsEditingRequestData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Request data editing states
  const [editCliente, setEditCliente] = useState("");
  const [editRut, setEditRut] = useState("");
  const [editMontoNegocioUsd, setEditMontoNegocioUsd] = useState("");
  const [editUnidades, setEditUnidades] = useState("");
  const [editTcReferencial, setEditTcReferencial] = useState("");
  const [editPayments, setEditPayments] = useState<Payment[]>([]);

  // Admin parameters
  const [forwardDate, setForwardDate] = useState<Date | undefined>();
  const [approvalDate, setApprovalDate] = useState<Date | undefined>();
  const [porcentajeCobertura, setPorcentajeCobertura] = useState([0]);
  const [banco, setBanco] = useState("");
  const [tcCliente, setTcCliente] = useState("");
  const [tcSpot, setTcSpot] = useState("");
  const [puntosForwards, setPuntosForwards] = useState("");
  const [tcAllIn, setTcAllIn] = useState("");
  const [numeroSie, setNumeroSie] = useState("");
  const [numerosInternos, setNumerosInternos] = useState<NumeroInterno[]>([]);
  const [reservedProducts, setReservedProducts] = useState<Array<{ numeroInterno: number; modelo: string }>>([]);
  const [isLoadingReserved, setIsLoadingReserved] = useState(false);

  // Bank comparison states
  const [selectedBank1, setSelectedBank1] = useState("SCOTIABANK");
  const [selectedBank2, setSelectedBank2] = useState("ESTADO");  
  const [selectedBank3, setSelectedBank3] = useState("BCI");
  
  // Historical bank comparison data (frozen at approval)
  const [historicalBankData, setHistoricalBankData] = useState<any>(null);
  
  // Selected bank for highlighting (only one can be selected)
  const [selectedBankForHighlight, setSelectedBankForHighlight] = useState<number | null>(null);

  // Bank executives for comparison table
  const { executives: bankExecutives1, loading: executivesLoading1 } = useBankExecutives(selectedBank1);
  const { executives: bankExecutives2, loading: executivesLoading2 } = useBankExecutives(selectedBank2);
  const { executives: bankExecutives3, loading: executivesLoading3 } = useBankExecutives(selectedBank3);

  // Debug logging
  console.log('Debug - Selected banks:', { selectedBank1, selectedBank2, selectedBank3 });
  console.log('Debug - Available banks list:', banks);
  console.log('Debug - Bank executives:', { 
    bank1: { selected: selectedBank1, executives: bankExecutives1, loading: executivesLoading1 },
    bank2: { selected: selectedBank2, executives: bankExecutives2, loading: executivesLoading2 },
    bank3: { selected: selectedBank3, executives: bankExecutives3, loading: executivesLoading3 }
  });

  // TC Spot and Puntos Forward states for each bank
  const [tcSpot1, setTcSpot1] = useState("");
  const [tcSpot2, setTcSpot2] = useState("");
  const [tcSpot3, setTcSpot3] = useState("");
  const [puntosForward1, setPuntosForward1] = useState("");
  const [puntosForward2, setPuntosForward2] = useState("");
  const [puntosForward3, setPuntosForward3] = useState("");

  // Recargo states for each bank (editable, default 1)
  const [recargo1, setRecargo1] = useState("1");
  const [recargo2, setRecargo2] = useState("1");
  const [recargo3, setRecargo3] = useState("1");


  const user = {
    email: authUser.email || '',
    role: getUserRole(userProfile.role)
  };


  // Calculate TC All-in for each bank
  const calculateTcAllIn = (tcSpot: string, puntosForward: string): number => {
    const spot = Number.parseFloat(tcSpot) || 0;
    const puntos = Number.parseFloat(puntosForward) || 0;
    return spot + puntos;
  };

  // Calculate TC Cliente (Costo + Recargo)
  const calculateTcCliente = (tcSpot: string, puntosForward: string, recargo: string): number => {
    const tcAllIn = calculateTcAllIn(tcSpot, puntosForward);
    const recargoValue = Number.parseFloat(recargo) || 0;
    return tcAllIn + recargoValue;
  };

  // Bell sound function using uploaded audio
  const playBellSound = () => {
    const audio = new Audio(new URL('../assets/wall_street_bell.wav', import.meta.url).href);
    audio.volume = 0.5;
    audio.play().catch(err => console.error('Error playing bell sound:', err));
  };

  // Handle bank selection for highlighting
  const handleBankSelection = (bankIndex: number) => {
    if (selectedBankForHighlight === bankIndex) {
      setSelectedBankForHighlight(null); // Deselect if already selected
    } else {
      setSelectedBankForHighlight(bankIndex); // Select the new bank
    }
  };

  // Handle TC Cliente double click
  const handleTcClienteDoubleClick = (bankIndex: number) => {
    let selectedTcCliente: number;
    let selectedBank: string;
    let selectedTcSpot: string;
    let selectedPuntosForward: string;
    
    switch(bankIndex) {
      case 1:
        selectedTcCliente = calculateTcCliente(tcSpot1, puntosForward1, recargo1);
        selectedBank = selectedBank1;
        selectedTcSpot = tcSpot1;
        selectedPuntosForward = puntosForward1;
        break;
      case 2:
        selectedTcCliente = calculateTcCliente(tcSpot2, puntosForward2, recargo2);
        selectedBank = selectedBank2;
        selectedTcSpot = tcSpot2;
        selectedPuntosForward = puntosForward2;
        break;
      case 3:
        selectedTcCliente = calculateTcCliente(tcSpot3, puntosForward3, recargo3);
        selectedBank = selectedBank3;
        selectedTcSpot = tcSpot3;
        selectedPuntosForward = puntosForward3;
        break;
      default:
        return;
    }
    
    // Play bell sound
    playBellSound();
    
    // Update TC Cliente parameter
    setTcCliente(selectedTcCliente.toFixed(4));
    
    // Update coverage parameters
    setBanco(selectedBank);
    setTcSpot(selectedTcSpot);
    setPuntosForwards(selectedPuntosForward);
    setTcAllIn(calculateTcAllIn(selectedTcSpot, selectedPuntosForward).toFixed(4));
    
    // Calculate new total business in CLP
    const montoNegocioUsd = parseFloat(editMontoNegocioUsd) || request?.montoNegocioUsd || 0;
    const totalNegocioClp = montoNegocioUsd * selectedTcCliente;
    
    // Update payments: recalculate balance payment to match the new total
    const updatedPayments = [...editPayments];
    
    // Find the payment with isRemainingBalance = true
    const balancePaymentIndex = updatedPayments.findIndex(p => p.isRemainingBalance);
    
    if (balancePaymentIndex !== -1) {
      // Sum all non-balance payments
      const sumOtherPayments = updatedPayments.reduce((sum, payment, idx) => {
        if (idx !== balancePaymentIndex) {
          return sum + (payment.montoClp || 0);
        }
        return sum;
      }, 0);
      
      // Update the balance payment to make the total match
      updatedPayments[balancePaymentIndex] = {
        ...updatedPayments[balancePaymentIndex],
        montoClp: totalNegocioClp - sumOtherPayments
      };
      
      setEditPayments(updatedPayments);
      
      // Also update request.payments for immediate display
      if (request) {
        setRequest({
          ...request,
          payments: [...updatedPayments]
        });
      }
    }
    
    // Show success notification
    toast({
      title: "TC Cliente cerrado con éxito",
      description: `TC Cliente actualizado a $${formatNumber(selectedTcCliente, 4)} - Banco: ${selectedBank}. Pagos actualizados.`,
    });
  };

  // Load request data
  // Sync numerosInternos array when editUnidades changes
  useEffect(() => {
    if (isEditingRequestData) {
      const unitsCount = parseInt(editUnidades) || 1;
      setNumerosInternos(prev => {
        const newArray = [...prev];
        if (newArray.length < unitsCount) {
          // Add empty objects for new units
          while (newArray.length < unitsCount) {
            newArray.push({ numeroInterno: 0, modelo: '' });
          }
        } else if (newArray.length > unitsCount) {
          // Remove excess internal numbers
          newArray.splice(unitsCount);
        }
        return newArray;
      });
    }
  }, [editUnidades, isEditingRequestData]);

  // Fetch reserved products when editing starts
  useEffect(() => {
    const fetchReservedProducts = async () => {
      if (isEditingRequestData && request?.rut) {
        setIsLoadingReserved(true);
        try {
          const cleanRut = request.rut.replace(/[.-]/g, '');
          const reservedResult = await exec('frwrd/lista_reservados', { cliente: cleanRut });
          if (reservedResult.data && reservedResult.data.length > 0) {
            setReservedProducts(reservedResult.data.map((p: { numeroInterno: number; modelo: string }) => ({
              numeroInterno: p.numeroInterno,
              modelo: p.modelo || ''
            })));
          } else {
            setReservedProducts([]);
          }
        } catch (err) {
          console.error('Error fetching reserved products:', err);
          setReservedProducts([]);
        } finally {
          setIsLoadingReserved(false);
        }
      }
    };
    fetchReservedProducts();
  }, [isEditingRequestData, request?.rut]);

  // Get available options for numeroInterno select (exclude already selected ones)
  const getAvailableProducts = (currentIndex: number) => {
    const selectedNumerosInternos = new Set(
      numerosInternos
        .filter((_, idx) => idx !== currentIndex)
        .map(n => n.numeroInterno)
        .filter(n => n > 0)
    );
    
    return reservedProducts.filter(p => !selectedNumerosInternos.has(p.numeroInterno));
  };

  // Handle numeroInterno change from Select
  const handleNumeroInternoChange = (index: number, value: string) => {
    const numValue = Number.parseInt(value, 10) || 0;
    const selectedProduct = reservedProducts.find(p => p.numeroInterno === numValue);
    const modelo = selectedProduct?.modelo || '';
    
    const newNumbers = [...numerosInternos];
    newNumbers[index] = { numeroInterno: numValue, modelo };
    setNumerosInternos(newNumbers);
  };

  useEffect(() => {
    const loadRequest = async () => {
      try {
        const data = (await exec('frwrd/list_currency_requests', { id: requestId })).data[0];

        // Convert database format to CurrencyRequest format
        const convertedRequest: CurrencyRequest = {
          id: data.id,
          sellerId: data.user_id,
          estado: data.estado as RequestStatus,
          cliente: data.cliente,
          rut: data.rut,
          montoNegocioUsd: data.monto_negocio_usd,
          unidades: data.unidades,
          banco: data.banco,
          diasForward: data.dias_forward,
          porcentajeCobertura: data.porcentaje_cobertura,
          tcCliente: data.tc_cliente ? Number.parseFloat(data.tc_cliente.toString()) : undefined,
          tcSpot: data.tc_spot ? Number.parseFloat(data.tc_spot.toString()) : undefined,
          puntosForwards: data.puntos_forwards ? Number.parseFloat(data.puntos_forwards.toString()) : undefined,
          tcAllIn: data.tc_all_in ? Number.parseFloat(data.tc_all_in.toString()) : undefined,
          tcReferencial: data.tc_referencial ? Number.parseFloat(data.tc_referencial.toString()) : undefined,
          numeroSie: data.numero_sie || undefined,
          requestNumber: data.request_number,
          numerosInternos: (JSON.parse(data.numeros_internos) || []) as NumeroInterno[],
          payments: (JSON.parse(data.payments) || []) as any[],
          notas: data.notas,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        };

        setRequest(convertedRequest);
        setRequestNumber(convertedRequest.requestNumber || '');

        setRequest(convertedRequest);
        
        // Load historical bank comparison data for approved requests
        if (data.bank_comparison_data && convertedRequest.estado === RequestStatus.APROBADA) {
          const bankData = JSON.parse(data.bank_comparison_data);
          console.log('Loading historical bank comparison data:', bankData);
          setHistoricalBankData(bankData);
          
          // Set comparison states from historical data
          if (bankData.banks) {
            setSelectedBank1(bankData.banks.bank1 || "SCOTIABANK");
            setSelectedBank2(bankData.banks.bank2 || "ESTADO");
            setSelectedBank3(bankData.banks.bank3 || "BCI");
          }
          
          // Convert numbers to strings for input fields
          if (bankData.tcSpot) {
            setTcSpot1(bankData.tcSpot.bank1?.toString() || "0");
            setTcSpot2(bankData.tcSpot.bank2?.toString() || "0");
            setTcSpot3(bankData.tcSpot.bank3?.toString() || "0");
          }
          
          if (bankData.puntosForward) {
            setPuntosForward1(bankData.puntosForward.bank1?.toString() || "0");
            setPuntosForward2(bankData.puntosForward.bank2?.toString() || "0");
            setPuntosForward3(bankData.puntosForward.bank3?.toString() || "0");
          }
          
          if (bankData.recargo) {
            setRecargo1(bankData.recargo.bank1?.toString() || "1");
            setRecargo2(bankData.recargo.bank2?.toString() || "1");
            setRecargo3(bankData.recargo.bank3?.toString() || "1");
          }
        }
        
        // Initialize admin parameters
        // For approved requests, use the stored fecha_vencimiento
        // Otherwise, calculate from dias_forward
        if (convertedRequest.estado === RequestStatus.APROBADA && data.fecha_vencimiento) {
          setForwardDate(new Date(data.fecha_vencimiento));
        } else if (convertedRequest.diasForward) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + convertedRequest.diasForward);
          setForwardDate(futureDate);
        }
        setPorcentajeCobertura([convertedRequest.porcentajeCobertura || 0]);
        
        // For approved requests, fallback to bank_comparison_data if individual fields are empty
        if (convertedRequest.estado === RequestStatus.APROBADA && data.bank_comparison_data && 
            (!convertedRequest.banco || !convertedRequest.tcSpot)) {
          console.log('Using bank_comparison_data fallback for approved request');
          const bankData = data.bank_comparison_data;
          // Find the selected bank (first one with seleccionado: true, or first bank if none selected)
          const selectedBank = Object.values(bankData).find((b: any) => b.seleccionado) || 
                               Object.values(bankData)[0];
          
          if (selectedBank && typeof selectedBank === 'object') {
            const bankInfo = selectedBank as any;
            setBanco(bankInfo.nombre || convertedRequest.banco || "");
            setTcCliente(bankInfo.tcCliente?.toString() || convertedRequest.tcCliente?.toString() || "");
            setTcSpot(bankInfo.tcSpot?.toString() || convertedRequest.tcSpot?.toString() || "");
            setPuntosForwards(bankInfo.puntosForwards?.toString() || convertedRequest.puntosForwards?.toString() || "");
            setTcAllIn(bankInfo.tcAllIn?.toString() || convertedRequest.tcAllIn?.toString() || "");
            console.log('Loaded bank data from comparison:', bankInfo);
          }
        } else {
          setBanco(convertedRequest.banco || "");
          setTcCliente(convertedRequest.tcCliente?.toString() || "");
          setTcSpot(convertedRequest.tcSpot?.toString() || "");
          setPuntosForwards(convertedRequest.puntosForwards?.toString() || "");
          setTcAllIn(convertedRequest.tcAllIn?.toString() || "");
        }
        
        setNumeroSie(convertedRequest.numeroSie || "");
        setNumerosInternos(convertedRequest.numerosInternos || []);
        
        // Initialize request data editing values
        setEditCliente(convertedRequest.cliente);
        setEditRut(convertedRequest.rut);
        setEditMontoNegocioUsd(convertedRequest.montoNegocioUsd.toString());
        setEditUnidades(convertedRequest.unidades.toString());
        setEditTcReferencial(convertedRequest.tcReferencial?.toString() || "");
        setEditPayments([...convertedRequest.payments]);

        // Fetch approval date from audit_logs for approved requests
        if (convertedRequest.estado === RequestStatus.APROBADA) {

          const auditData = (await exec('frwrd/get_approval_info', { request_id: requestId })).data[0];

          if (auditData) {
            setApprovalDate(new Date(auditData.created_at));
          }
        }
        
      } catch (error) {
        console.error('Error loading request:', error);
        toast({
          title: "Error",
          description: "No se pudo cargar la solicitud",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (requestId) {
      loadRequest();
    }
  }, [requestId, toast]);

  const effectiveRole = currentViewRole || user.role;
  const isAdmin = effectiveRole === UserRole.ADMIN;
  const isVendedor = effectiveRole === UserRole.VENDEDOR;
  const canEdit = isAdmin && request && request.estado !== RequestStatus.ANULADA;
  // Admins can edit request data anytime (except anulada), Vendedores only in BORRADOR or EN_REVISION
  const canEditRequestData = request && request.estado !== RequestStatus.ANULADA && (
    isAdmin || (isVendedor && (request.estado === RequestStatus.BORRADOR || request.estado === RequestStatus.EN_REVISION))
  );
  const canEditCoverageParams = isAdmin && request && request.estado !== RequestStatus.ANULADA;
  const coverage = request ? calculateCoverage(request.payments, porcentajeCobertura[0], parseFloat(tcCliente) || undefined, request.montoNegocioUsd, request.tcReferencial) : { totalNegocio: 0, baseCobertura: 0, baseCoberturaAprobado: 0, coberturaSugerida: 0, exposicionCubierta: 0, exposicionDescubierta: 0 };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p>Cargando solicitud...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p>Solicitud no encontrada</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const diasForward = forwardDate ? differenceInDays(forwardDate, new Date()) : undefined;
      
      await exec('frwrd/save_currency_request', {
        id: requestId,
        dias_forward: diasForward,
        fecha_vencimiento: forwardDate?.toISOString() || null,
        porcentaje_cobertura: porcentajeCobertura[0],
        banco: banco || null,
        numero_sie: numeroSie || null,
        tc_cliente: Number.parseFloat(tcCliente) || null,
        tc_spot: Number.parseFloat(tcSpot) || null,
        puntos_forwards: Number.parseFloat(puntosForwards) || null,
        tc_all_in: Number.parseFloat(tcAllIn) || null,
        numeros_internos: numerosInternos.filter(n => n.numeroInterno > 0),
        payments: editPayments as any,
        updated_at: new Date().toISOString(),
        user_id : authUser.login
      });

      setRequest(prev => ({
        ...prev!,
        diasForward,
        fechaVencimiento: forwardDate,
        porcentajeCobertura: porcentajeCobertura[0],
        banco,
        tcCliente: Number.parseFloat(tcCliente) || undefined,
        tcSpot: Number.parseFloat(tcSpot) || undefined,
        puntosForwards: Number.parseFloat(puntosForwards) || undefined,
        tcAllIn: Number.parseFloat(tcAllIn) || undefined,
        numeroSie: numeroSie || undefined,
        numerosInternos: numerosInternos.filter(n => n.numeroInterno > 0),
        payments: [...editPayments],
        updatedAt: new Date()
      }));
      
      setIsEditing(false);
      
      toast({
        title: "Cambios guardados",
        description: "Los parámetros de cobertura han sido actualizados"
      });
    } catch (error) {
      console.error('Error saving request:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRequestData = async () => {
    // Validate tcReferencial is required
    if (!editTcReferencial || parseFloat(editTcReferencial) <= 0) {
      toast({
        title: "Error de validación",
        description: "TC Referencial es obligatorio y debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);

    
    
    try {
      await exec('frwrd/save_currency_request', {
        id: requestId,
        cliente: editCliente,
        rut: editRut,
        monto_negocio_usd: Number.parseFloat(editMontoNegocioUsd) || 0,
        unidades: Number.parseInt(editUnidades) || 0,
        tc_referencial: editTcReferencial ? Number.parseFloat(editTcReferencial) : null,
        numeros_internos: numerosInternos.filter(n => n.numeroInterno > 0),
        payments: editPayments as any,
        updated_at: new Date().toISOString(),
        user_id : authUser.login
      });

      setRequest(prev => prev ? {
        ...prev,
        cliente: editCliente,
        rut: editRut,
        montoNegocioUsd: Number.parseFloat(editMontoNegocioUsd) || 0,
        unidades: Number.parseInt(editUnidades) || 0,
        tcReferencial: editTcReferencial ? Number.parseFloat(editTcReferencial) : undefined,
        numerosInternos: numerosInternos.filter(n => n.numeroInterno > 0),
        payments: [...editPayments],
        updatedAt: new Date()
      } : null);
      
      setIsEditingRequestData(false);
      
      toast({
        title: "Cambios guardados",
        description: "Los datos de la solicitud han sido actualizados"
      });
    } catch (error) {
      console.error('Error saving request data:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelRequestDataEdit = () => {
    if (request) {
      setEditCliente(request.cliente);
      setEditRut(request.rut);
      setEditMontoNegocioUsd(request.montoNegocioUsd.toString());
      setEditUnidades(request.unidades.toString());
      setEditPayments([...request.payments]);
    }
    setIsEditingRequestData(false);
  };

  const handleStatusChange = async (newStatus: RequestStatus) => {
    setIsSaving(true);
    
    try {
      // Capture bank comparison data when approving
      let bankComparisonData = null;
      if (newStatus === RequestStatus.APROBADA) {
        // Convert strings to numbers for proper storage
        const parseNumber = (val: string) => {
          const num = parseFloat(val);
          return isNaN(num) ? 0 : num;
        };

        bankComparisonData = {
          banks: {
            bank1: selectedBank1 || "",
            bank2: selectedBank2 || "",
            bank3: selectedBank3 || ""
          },
          tcSpot: {
            bank1: parseNumber(tcSpot1),
            bank2: parseNumber(tcSpot2),
            bank3: parseNumber(tcSpot3)
          },
          puntosForward: {
            bank1: parseNumber(puntosForward1),
            bank2: parseNumber(puntosForward2),
            bank3: parseNumber(puntosForward3)
          },
          recargo: {
            bank1: parseNumber(recargo1),
            bank2: parseNumber(recargo2),
            bank3: parseNumber(recargo3)
          },
          executives: {
            bank1: bankExecutives1.map(e => ({ name: e.name, contact_number: e.contact_number })),
            bank2: bankExecutives2.map(e => ({ name: e.name, contact_number: e.contact_number })),
            bank3: bankExecutives3.map(e => ({ name: e.name, contact_number: e.contact_number }))
          },
          timestamp: new Date().toISOString()
        };

        console.log('Capturing bank comparison data for approval:', bankComparisonData);
      }
      
      console.log('Attempting to save with bank comparison data:', bankComparisonData);
      
      const updateData: any = {
        estado: newStatus,
        updated_at: new Date().toISOString(),
        // Always save fecha_vencimiento when approving
        fecha_vencimiento: forwardDate?.toISOString() || null,
        // Save individual bank fields
        banco: banco || null,
        tc_spot: tcSpot || null,
        puntos_forwards: puntosForwards || null,
        tc_all_in: tcAllIn || null,
        tc_cliente: tcCliente || null
      };
      
      // Only add bank_comparison_data if it exists
      if (bankComparisonData) {
        updateData.bank_comparison_data = bankComparisonData;
      }
      
      console.log('Saving approval data:', updateData);

      const updatedData = (await exec('frwrd/save_currency_request', {
        id: requestId,
        user_id : authUser.login,
        ...updateData
      })).data[0];

      console.log('Successfully updated request with data:', updatedData);

      setRequest(prev => ({
        ...prev,
        estado: newStatus,
        updatedAt: new Date()
      }));
      
      // Set historical data after approval
      if (bankComparisonData) {
        setHistoricalBankData(bankComparisonData);
        console.log('Historical bank data set:', bankComparisonData);
      }
      
      const statusMessages = {
        [RequestStatus.APROBADA]: "Solicitud aprobada exitosamente",
        [RequestStatus.RECHAZADA]: "Solicitud rechazada",
        [RequestStatus.ANULADA]: "Solicitud anulada"
      };
      
      toast({
        title: "Estado actualizado",
        description: bankComparisonData 
          ? `${statusMessages[newStatus]} - Datos bancarios guardados: ${selectedBank1}, ${selectedBank2}, ${selectedBank3}`
          : statusMessages[newStatus]
      });

      // Send approval email if status is APROBADA
      if (newStatus === RequestStatus.APROBADA) {
        try {
          console.log('Sending approval email for request:', requestId);
          const emailResult = await exec('frwrd/send_approval_email', {
            request_id: requestId
          });
          
          const emailData = emailResult.data?.[0];
          
          if (emailData?.error_msg) {
            console.error('Error sending approval email:', emailData.error_msg);
            toast({
              title: "Email no enviado",
              description: "La solicitud fue aprobada pero hubo un error al enviar el email de notificación: " + emailData.error_msg,
              variant: "destructive"
            });
          } else if (emailData?.success) {
            console.log('Approval email sent successfully:', emailData.message);
            toast({
              title: "Email enviado",
              description: "Se ha enviado la notificación de aprobación por correo electrónico",
            });
          }
        } catch (emailError) {
          console.error('Exception sending approval email:', emailError);
          toast({
            title: "Email no enviado",
            description: "La solicitud fue aprobada pero hubo un error al enviar el email de notificación",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error updating request status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la solicitud",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoUrl = '/epysa-logo.jpg';

    // Format numbers for Chilean format (1.000,00)
    const tcSpotFormatted = tcSpot ? `$${formatNumber(parseFloat(tcSpot), 4)}` : '';
    const puntosForwardsFormatted = puntosForwards ? formatNumber(parseFloat(puntosForwards), 4) : '';
    const tcAllInFormatted = tcAllIn ? `$${formatNumber(parseFloat(tcAllIn), 4)}` : '';
    const tcClienteFormatted = tcCliente ? `$${formatNumber(parseFloat(tcCliente), 4)}` : '';
    
    // Format facturación values
    const getFacturacionValues = () => {
      const tcAllInValue = parseFloat(tcAllIn) || 0;
      const tcClienteValue = parseFloat(tcCliente) || 0;
      const unidades = request.unidades || 1;
      const montoNegocio = request.montoNegocioUsd || 0;
      
      if (tcAllInValue === 0 || unidades === 0) {
        return {
          valorFacturaNeto: 'US$ 0,00',
          valorFacturaTotal: 'US$ 0,00'
        };
      }
      
      const valorFacturaTotal = (montoNegocio * tcClienteValue) / (tcAllInValue * unidades);
      const valorFacturaNeto = valorFacturaTotal / 1.19;
      
      return {
        valorFacturaNeto: formatCurrency(valorFacturaNeto, 'USD'),
        valorFacturaTotal: formatCurrency(valorFacturaTotal, 'USD')
      };
    };
    
    const facturacionValues = getFacturacionValues();

    const pdfContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Solicitud ${requestNumber ? `#${requestNumber}` : `#${request.id}`}</title>
          <style>
            @page {
              margin: 1cm;
              size: A4 portrait;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 10px;
              line-height: 1.3;
              color: #1a1a1a;
              background: white;
              padding: 15px;
            }
            .pdf-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-bottom: 10px;
              border-bottom: 2px solid #b91c1c;
              margin-bottom: 12px;
            }
            .pdf-logo { max-width: 120px; height: auto; }
            .pdf-title-section { text-align: right; }
            .pdf-title {
              font-size: 18px;
              font-weight: 700;
              color: #b91c1c;
              line-height: 1.2;
            }
            .pdf-subtitle {
              font-size: 9px;
              color: #6b7280;
              margin-top: 2px;
            }
            .pdf-status-badge {
              display: inline-block;
              padding: 3px 10px;
              border-radius: 12px;
              font-size: 8px;
              font-weight: 700;
              text-transform: uppercase;
              margin-top: 4px;
            }
            .pdf-status-aprobada { background: #dcfce7; color: #166534; }
            .pdf-status-en-revision { background: #fef3c7; color: #92400e; }
            .pdf-status-borrador { background: #f3f4f6; color: #374151; }
            .pdf-status-rechazada { background: #fee2e2; color: #991b1b; }
            .pdf-status-anulada { background: #f3f4f6; color: #6b7280; }
            
            .two-column-layout {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 12px;
            }
            .full-width { grid-column: 1 / -1; }
            
            .pdf-section {
              margin-bottom: 10px;
              page-break-inside: avoid;
            }
            .pdf-section-title {
              font-size: 11px;
              font-weight: 700;
              color: #b91c1c;
              margin-bottom: 6px;
              padding-bottom: 3px;
              border-bottom: 1px solid #e5e7eb;
            }
            .pdf-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 6px;
            }
            .pdf-field {
              padding: 6px;
              background: #f9fafb;
              border-radius: 4px;
              border: 1px solid #e5e7eb;
            }
            .pdf-field-label {
              font-size: 7px;
              color: #6b7280;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              margin-bottom: 2px;
            }
            .pdf-field-value {
              font-size: 10px;
              font-weight: 700;
              color: #1a1a1a;
            }
            
            .pdf-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 4px;
              font-size: 9px;
            }
            .pdf-table th {
              background: #b91c1c;
              color: white;
              padding: 4px 6px;
              text-align: left;
              font-size: 8px;
              font-weight: 700;
            }
            .pdf-table td {
              padding: 4px 6px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 8px;
            }
            .pdf-table tbody tr:nth-child(even) {
              background: #f9fafb;
            }
            
            .pdf-bank-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 4px;
              font-size: 8px;
            }
            .pdf-bank-table th {
              background: #fee;
              padding: 4px;
              text-align: center;
              font-size: 8px;
              font-weight: 700;
              border: 1px solid #e5e7eb;
              color: #b91c1c;
            }
            .pdf-bank-table td {
              padding: 4px;
              text-align: center;
              border: 1px solid #e5e7eb;
              font-size: 8px;
            }
            .pdf-bank-table tr:nth-child(even) {
              background: #f9fafb;
            }
            .pdf-highlight {
              background: #fef3c7 !important;
              font-weight: 700;
            }
            
            .coverage-card {
              background: linear-gradient(135deg, #fee 0%, #fff 100%);
              border: 1px solid #b91c1c;
              border-radius: 4px;
              padding: 8px;
              margin-top: 6px;
            }
            .coverage-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px;
            }
            .coverage-value {
              font-size: 11px;
              font-weight: 700;
              color: #b91c1c;
              margin-top: 2px;
            }
            
            .pdf-footer {
              margin-top: 10px;
              padding-top: 8px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 7px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="pdf-content">
            <div class="pdf-header">
              <img src="${logoUrl}" alt="SSC EPpysa" class="pdf-logo" />
              <div class="pdf-title-section">
                <div class="pdf-title">Solicitud de Divisas</div>
                <div class="pdf-subtitle">Folio: ${requestNumber ? `#${requestNumber}` : `#${request.id}`}</div>
                <div class="pdf-subtitle">${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
                <span class="pdf-status-badge pdf-status-${request.estado.toLowerCase().replace(/_/g, '-')}">
                  ${request.estado.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div class="two-column-layout">
              <!-- Left Column -->
              <div>
                <!-- Client Information -->
                <div class="pdf-section">
                  <div class="pdf-section-title">Datos de la Solicitud</div>
                  <div class="pdf-grid">
                    <div class="pdf-field">
                      <div class="pdf-field-label">Cliente</div>
                      <div class="pdf-field-value">${request.cliente}</div>
                    </div>
                    <div class="pdf-field">
                      <div class="pdf-field-label">RUT</div>
                      <div class="pdf-field-value">${request.rut}</div>
                    </div>
                    <div class="pdf-field">
                      <div class="pdf-field-label">Monto (USD)</div>
                      <div class="pdf-field-value">${formatCurrency(request.montoNegocioUsd, 'USD')}</div>
                    </div>
                    <div class="pdf-field">
                      <div class="pdf-field-label">Unidades</div>
                      <div class="pdf-field-value">${request.unidades}</div>
                    </div>
                  </div>
                </div>

                <!-- Payment Methods -->
                ${request.payments.length > 0 ? `
                <div class="pdf-section">
                  <div class="pdf-section-title">Formas de Pago</div>
                  <table class="pdf-table">
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Monto CLP</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${request.payments.map(payment => `
                        <tr>
                          <td>${PAYMENT_TYPE_LABELS[payment.tipo]}</td>
                          <td>${formatCurrency(payment.montoClp)}</td>
                          <td>${format(new Date(payment.fechaVencimiento), 'dd/MM/yy')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  
                  <!-- Internal Numbers and SIE -->
                  <div class="pdf-grid" style="margin-top: 8px;">
                    <div class="pdf-field">
                      <div class="pdf-field-label">Números Internos</div>
                      <div class="pdf-field-value">${numerosInternos.length > 0 ? numerosInternos.filter(n => n.numeroInterno > 0).map(n => `${n.numeroInterno}${n.modelo ? ` (${n.modelo})` : ''}`).join(', ') || '-' : '-'}</div>
                    </div>
                    <div class="pdf-field">
                      <div class="pdf-field-label">Número SIE</div>
                      <div class="pdf-field-value">${numeroSie || '-'}</div>
                    </div>
                  </div>
                </div>
                ` : ''}

                ${request.notas ? `
                <div class="pdf-section">
                  <div class="pdf-section-title">Notas</div>
                  <div class="pdf-field">
                    <div class="pdf-field-value" style="font-weight: 400; font-size: 8px; white-space: pre-wrap;">${request.notas}</div>
                  </div>
                </div>
                ` : ''}
              </div>

              <!-- Right Column -->
              <div>
                ${request.estado === RequestStatus.APROBADA ? `
                <div class="pdf-section">
                  <div class="pdf-section-title">Parámetros de Cobertura</div>
                  <div class="pdf-grid">
                    ${forwardDate ? `
                    <div class="pdf-field">
                      <div class="pdf-field-label">Fecha Vencimiento</div>
                      <div class="pdf-field-value">${format(forwardDate, 'dd/MM/yyyy')}</div>
                    </div>
                    ` : ''}
                    ${banco ? `
                    <div class="pdf-field">
                      <div class="pdf-field-label">Banco</div>
                      <div class="pdf-field-value">${banco}</div>
                    </div>
                    ` : ''}
                    ${tcSpot ? `
                    <div class="pdf-field">
                      <div class="pdf-field-label">TC Spot</div>
                      <div class="pdf-field-value">${tcSpotFormatted}</div>
                    </div>
                    ` : ''}
                    ${puntosForwards ? `
                    <div class="pdf-field">
                      <div class="pdf-field-label">Puntos Forward</div>
                      <div class="pdf-field-value">${puntosForwardsFormatted}</div>
                    </div>
                    ` : ''}
                    ${tcAllIn ? `
                    <div class="pdf-field">
                      <div class="pdf-field-label">TC All-In</div>
                      <div class="pdf-field-value">${tcAllInFormatted}</div>
                    </div>
                    ` : ''}
                    ${tcCliente ? `
                    <div class="pdf-field">
                      <div class="pdf-field-label">TC Cliente</div>
                      <div class="pdf-field-value">${tcClienteFormatted}</div>
                    </div>
                    ` : ''}
                  </div>
                  
                  <div class="coverage-card">
                    <div class="pdf-field-label" style="margin-bottom: 4px;">Resumen Cobertura</div>
                    <div class="coverage-grid">
                      <div>
                        <div class="pdf-field-label">Total Negocio</div>
                        <div class="coverage-value">${formatCurrency(coverage.totalNegocio)}</div>
                      </div>
                      <div>
                        <div class="pdf-field-label">Base Cobertura</div>
                        <div class="coverage-value">${formatCurrency(coverage.baseCoberturaAprobado)}</div>
                      </div>
                      <div>
                        <div class="pdf-field-label">Exp. Cubierta</div>
                        <div class="coverage-value">${formatCurrency(coverage.exposicionCubierta, 'USD')}</div>
                      </div>
                      <div>
                        <div class="pdf-field-label">Exp. Descubierta</div>
                        <div class="coverage-value">${formatCurrency(coverage.exposicionDescubierta, 'USD')}</div>
                      </div>
                    </div>
                  </div>
                </div>
                ` : ''}
              </div>
            </div>

            <!-- Billing Section (full width if approved) -->
            ${request.estado === RequestStatus.APROBADA && tcAllIn && tcCliente ? `
            <div class="pdf-section full-width">
              <div class="pdf-section-title">Facturación</div>
              <div class="pdf-grid" style="grid-template-columns: repeat(4, 1fr);">
                <div class="pdf-field">
                  <div class="pdf-field-label">Valor Factura USD por Bus Neto</div>
                  <div class="pdf-field-value">${facturacionValues.valorFacturaNeto}</div>
                </div>
                <div class="pdf-field">
                  <div class="pdf-field-label">Valor Factura USD por Bus Total</div>
                  <div class="pdf-field-value">${facturacionValues.valorFacturaTotal}</div>
                </div>
                <div class="pdf-field">
                  <div class="pdf-field-label">TC Factura</div>
                  <div class="pdf-field-value">${tcAllInFormatted}</div>
                </div>
                <div class="pdf-field">
                  <div class="pdf-field-label">Total Factura CLP por Bus</div>
                  <div class="pdf-field-value">${(() => {
                    const tcAllInValue = parseFloat(tcAllIn) || 0;
                    const tcClienteValue = parseFloat(tcCliente) || 0;
                    const unidades = request.unidades || 1;
                    const montoNegocio = request.montoNegocioUsd || 0;
                    
                    if (tcAllInValue === 0 || unidades === 0) return formatCurrency(0);
                    
                    const valorFacturaTotal = (montoNegocio * tcClienteValue) / (tcAllInValue * unidades);
                    const totalFacturaClp = valorFacturaTotal * tcAllInValue;
                    
                    return formatCurrency(totalFacturaClp);
                  })()}</div>
                </div>
              </div>
            </div>
            ` : ''}

            <div class="pdf-footer">
              <div>SSC EPpysa - Sistema de Gestión de Divisas</div>
              <div>Documento generado el ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 100);
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(pdfContent);
    printWindow.document.close();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate("/")} aria-label="Volver al dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Solicitud {requestNumber ? `#${requestNumber}` : `#${request.id}`}</h1>
              <p className="text-muted-foreground">
                Creada el {request.createdAt?.toLocaleDateString('es-CL')}
                {request.updatedAt && request.updatedAt > request.createdAt! && (
                  <span> • Actualizada el {request.updatedAt.toLocaleDateString('es-CL')}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isEditingRequestData ? (
              <Button onClick={handleSaveRequestData} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
            ) : (
              <>
                <StatusBadge status={request.estado} />
                {request.estado === RequestStatus.APROBADA && (
                  <Button variant="outline" onClick={handleExportPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div id="request-content" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Request Data */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Datos de la solicitud</CardTitle>
                {canEditRequestData && !isEditingRequestData && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingRequestData(true)}>
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Information */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  {isEditingRequestData ? (
                    <Input
                      value={editCliente}
                      onChange={(e) => setEditCliente(e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <div className="text-lg font-medium">{request.cliente}</div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">RUT</Label>
                  {isEditingRequestData ? (
                    <Input
                      value={editRut}
                      onChange={(e) => setEditRut(e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <div className="text-lg">{request.rut}</div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Monto Negocio (USD)</Label>
                  {isEditingRequestData ? (
                    <Input
                      type="number"
                      value={editMontoNegocioUsd}
                      onChange={(e) => setEditMontoNegocioUsd(e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <div className="text-lg font-semibold">{formatCurrency(request.montoNegocioUsd, 'USD')}</div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Unidades</Label>
                  {isEditingRequestData ? (
                    <Input
                      type="number"
                      value={editUnidades}
                      onChange={(e) => setEditUnidades(e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <div className="text-lg">{request.unidades.toLocaleString()}</div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">TC Referencial</Label>
                  {isEditingRequestData && (isAdmin || (isVendedor && request.estado === RequestStatus.EN_REVISION)) ? (
                    <Input
                      type="number"
                      step="0.0001"
                      value={editTcReferencial}
                      onChange={(e) => setEditTcReferencial(e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <div className="text-lg">{request.tcReferencial ? formatNumber(request.tcReferencial, 4) : '-'}</div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Monto Negocio (CLP)</Label>
                  <div className="text-lg font-semibold">
                    {formatCurrency(
                      (isEditingRequestData ? parseFloat(editMontoNegocioUsd) : request.montoNegocioUsd) * 
                      (isEditingRequestData && (isAdmin || (isVendedor && request.estado === RequestStatus.EN_REVISION)) ? parseFloat(editTcReferencial) || 0 : request.tcReferencial || 0)
                    )}
                  </div>
                </div>
              </div>

              {/* Request Data Action Buttons */}
              {canEditRequestData && isEditingRequestData && (
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveRequestData} disabled={isSaving} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleCancelRequestDataEdit}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              {/* Internal Numbers Section */}
              {isEditingRequestData && (
                <div className="space-y-4">
                  <Label className="text-base font-medium">Números internos</Label>
                  {isLoadingReserved && (
                    <p className="text-sm text-muted-foreground">Cargando productos reservados...</p>
                  )}
                  {!isLoadingReserved && reservedProducts.length === 0 && (
                    <p className="text-sm text-amber-600">No hay productos reservados para este cliente</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {numerosInternos.map((numero, index) => {
                      const availableProducts = getAvailableProducts(index);
                      const currentProduct = reservedProducts.find(p => p.numeroInterno === numero.numeroInterno);
                      
                      return (
                        <div key={`interno-${numero.numeroInterno || index}`} className="space-y-2">
                          <Label htmlFor={`numeroInterno${index}`}>
                            Número interno {index + 1}
                          </Label>
                          <Select
                            value={numero.numeroInterno > 0 ? numero.numeroInterno.toString() : ''}
                            onValueChange={(value) => handleNumeroInternoChange(index, value)}
                            disabled={reservedProducts.length === 0}
                          >
                            <SelectTrigger
                              className={numero.modelo ? "bg-green-50 border-green-200" : ""}
                            >
                              <SelectValue placeholder="Seleccionar número interno" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Show current selection even if it's not in available */}
                              {currentProduct && !availableProducts.some(p => p.numeroInterno === currentProduct.numeroInterno) && (
                                <SelectItem key={currentProduct.numeroInterno} value={currentProduct.numeroInterno.toString()}>
                                  {currentProduct.numeroInterno} - {currentProduct.modelo}
                                </SelectItem>
                              )}
                              {availableProducts.map((product) => (
                                <SelectItem key={product.numeroInterno} value={product.numeroInterno.toString()}>
                                  {product.numeroInterno} - {product.modelo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {numero.modelo && (
                            <p className="text-xs text-green-600">✓ {numero.modelo}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {request.notas && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notas</Label>
                  <div className="text-sm bg-muted p-3 rounded-lg">{request.notas}</div>
                </div>
              )}

              <Separator />

              {/* Payment Methods */}
              {isEditingRequestData ? (
                <PaymentForm
                  payments={editPayments}
                  onChange={setEditPayments}
                  disabled={isSaving}
                  totalNegocioClp={parseFloat(editMontoNegocioUsd) * (parseFloat(editTcReferencial) || request.tcReferencial || 950)}
                />
              ) : (
                <div>
                  <Label className="text-base font-medium">Formas de pago</Label>
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
                      <div className="col-span-3">Tipo</div>
                      <div className="col-span-3">Monto CLP</div>
                      <div className="col-span-3">Fecha vencimiento</div>
                      <div className="col-span-3">Observaciones</div>
                    </div>
                    
                    {request.payments.map((payment, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 py-2 border-b border-border last:border-0">
                        <div className="col-span-3">
                          <Badge variant="outline">
                            {PAYMENT_TYPE_LABELS[payment.tipo]}
                          </Badge>
                        </div>
                        <div className="col-span-3 font-medium">
                          {formatCurrency(payment.montoClp)}
                        </div>
                        <div className="col-span-3">
                          {new Date(payment.fechaVencimiento).toLocaleDateString('es-CL')}
                        </div>
                        <div className="col-span-3 text-sm text-muted-foreground">
                          {payment.observaciones || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Billing Section - Facturación */}
              {!isEditingRequestData && (
                <>
                  <div>
                    <Label className="text-base font-medium">Facturación</Label>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Valor Factura USD por Bus Neto</div>
                        <div className="text-lg font-semibold">
                          {(() => {
                            const tcAllInValue = parseFloat(tcAllIn) || 0;
                            const tcClienteValue = parseFloat(tcCliente) || 0;
                            const unidades = request.unidades || 1;
                            const montoNegocio = request.montoNegocioUsd || 0;
                            
                            if (tcAllInValue === 0 || unidades === 0) return "US$ 0,00";
                            
                            const valorFacturaTotal = (montoNegocio * tcClienteValue) / (tcAllInValue * unidades);
                            const valorFacturaNeto = valorFacturaTotal / 1.19;
                            
                            return formatCurrency(valorFacturaNeto, 'USD');
                          })()}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Valor Factura USD por Bus Total</div>
                        <div className="text-lg font-semibold">
                          {(() => {
                            const tcAllInValue = parseFloat(tcAllIn) || 0;
                            const tcClienteValue = parseFloat(tcCliente) || 0;
                            const unidades = request.unidades || 1;
                            const montoNegocio = request.montoNegocioUsd || 0;
                            
                            if (tcAllInValue === 0 || unidades === 0) return "US$ 0,00";
                            
                            const valorFacturaTotal = (montoNegocio * tcClienteValue) / (tcAllInValue * unidades);
                            
                            return formatCurrency(valorFacturaTotal, 'USD');
                          })()}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">TC Factura</div>
                        <div className="text-lg font-semibold">
                          {parseFloat(tcAllIn) > 0 ? `$${formatNumber(parseFloat(tcAllIn), 4)}` : "-"}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Total Factura CLP por Bus</div>
                        <div className="text-lg font-semibold">
                          {(() => {
                            const tcAllInValue = parseFloat(tcAllIn) || 0;
                            const tcClienteValue = parseFloat(tcCliente) || 0;
                            const unidades = request.unidades || 1;
                            const montoNegocio = request.montoNegocioUsd || 0;
                            
                            if (tcAllInValue === 0 || unidades === 0) return formatCurrency(0);
                            
                            const valorFacturaTotal = (montoNegocio * tcClienteValue) / (tcAllInValue * unidades);
                            const totalFacturaClp = valorFacturaTotal * tcAllInValue;
                            
                            return formatCurrency(totalFacturaClp);
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />
                </>
              )}

              {/* Banking Comparison Section - Only visible to admins */}
              {isAdmin && (
                <div>
                  <Label className="text-base font-medium">Comparación de Bancos</Label>
                  <div className="mt-6 overflow-x-auto rounded-lg shadow-sm">
                    <div className="min-w-full bg-background rounded-lg overflow-hidden border border-border/50">
                      {/* Header Row */}
                      <div className="grid grid-cols-4 gap-0 bg-muted/30">
                        <div className="p-4 border-r border-border/30"></div>
                        <div className="p-4 border-r border-border/30 bg-emerald-50 dark:bg-emerald-950/30">
                          {request.estado === RequestStatus.APROBADA && historicalBankData ? (
                            <div className="text-center font-bold text-emerald-800 dark:text-emerald-200 py-2">
                              {selectedBank1}
                            </div>
                          ) : (
                            <Select value={selectedBank1} onValueChange={setSelectedBank1}>
                              <SelectTrigger className="w-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800 font-semibold shadow-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {banks.map((bank) => (
                                  <SelectItem key={bank} value={bank}>
                                    {bank}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <div className="flex items-center justify-center mt-3">
                            <Checkbox
                              checked={selectedBankForHighlight === 1}
                              onCheckedChange={() => handleBankSelection(1)}
                              className="h-5 w-5 border-2 border-emerald-400 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                              disabled={request.estado === RequestStatus.APROBADA}
                            />
                          </div>
                        </div>
                        <div className="p-4 border-r border-border/30 bg-blue-50 dark:bg-blue-950/30">
                          {request.estado === RequestStatus.APROBADA && historicalBankData ? (
                            <div className="text-center font-bold text-blue-800 dark:text-blue-200 py-2">
                              {selectedBank2}
                            </div>
                          ) : (
                            <Select value={selectedBank2} onValueChange={setSelectedBank2}>
                              <SelectTrigger className="w-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800 font-semibold shadow-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {banks.map((bank) => (
                                  <SelectItem key={bank} value={bank}>
                                    {bank}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <div className="flex items-center justify-center mt-3">
                            <Checkbox
                              checked={selectedBankForHighlight === 2}
                              onCheckedChange={() => handleBankSelection(2)}
                              className="h-5 w-5 border-2 border-blue-400 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                              disabled={request.estado === RequestStatus.APROBADA}
                            />
                          </div>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-950/30">
                          {request.estado === RequestStatus.APROBADA && historicalBankData ? (
                            <div className="text-center font-bold text-purple-800 dark:text-purple-200 py-2">
                              {selectedBank3}
                            </div>
                          ) : (
                            <Select value={selectedBank3} onValueChange={setSelectedBank3}>
                              <SelectTrigger className="w-full bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800 font-semibold shadow-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {banks.map((bank) => (
                                  <SelectItem key={bank} value={bank}>
                                    {bank}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <div className="flex items-center justify-center mt-3">
                            <Checkbox
                              checked={selectedBankForHighlight === 3}
                              onCheckedChange={() => handleBankSelection(3)}
                              className="h-5 w-5 border-2 border-purple-400 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                              disabled={request.estado === RequestStatus.APROBADA}
                            />
                          </div>
                        </div>
                      </div>

                      {/* TC Spot Row */}
                      <div className="grid grid-cols-4 gap-0 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                        <div className="p-4 border-r border-t border-border/30 font-semibold text-sm text-foreground/80">TC Spot</div>
                        <div className="p-4 border-r border-t border-border/30">
                          {request.estado === RequestStatus.APROBADA && historicalBankData ? (
                            <div className="text-center font-medium text-lg">{formatNumber(parseFloat(tcSpot1 || "0"), 2)}</div>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              value={tcSpot1}
                              onChange={(e) => setTcSpot1(e.target.value)}
                              className="w-full text-center border-0 bg-transparent focus:ring-2 focus:ring-emerald-500/50 font-medium text-lg"
                              placeholder="0.00"
                            />
                          )}
                        </div>
                        <div className="p-4 border-r border-t border-border/30">
                          {request.estado === RequestStatus.APROBADA && historicalBankData ? (
                            <div className="text-center font-medium text-lg">{formatNumber(parseFloat(tcSpot2 || "0"), 2)}</div>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              value={tcSpot2}
                              onChange={(e) => setTcSpot2(e.target.value)}
                              className="w-full text-center border-0 bg-transparent focus:ring-2 focus:ring-blue-500/50 font-medium text-lg"
                              placeholder="0.00"
                            />
                          )}
                        </div>
                        <div className="p-4 border-t border-border/30">
                          {request.estado === RequestStatus.APROBADA && historicalBankData ? (
                            <div className="text-center font-medium text-lg">{formatNumber(parseFloat(tcSpot3 || "0"), 2)}</div>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              value={tcSpot3}
                              onChange={(e) => setTcSpot3(e.target.value)}
                              className="w-full text-center border-0 bg-transparent focus:ring-2 focus:ring-purple-500/50 font-medium text-lg"
                              placeholder="0.00"
                            />
                          )}
                        </div>
                      </div>

                      {/* Puntos Forward Row */}
                      <div className="grid grid-cols-4 gap-0 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                        <div className="p-4 border-r border-t border-border/30 font-semibold text-sm text-foreground/80">Puntos Forward</div>
                        <div className="p-4 border-r border-t border-border/30">
                          {request.estado === RequestStatus.APROBADA && historicalBankData ? (
                            <div className="text-center font-medium text-lg">{formatNumber(parseFloat(puntosForward1 || "0"), 2)}</div>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              value={puntosForward1}
                              onChange={(e) => setPuntosForward1(e.target.value)}
                              className="w-full text-center border-0 bg-transparent focus:ring-2 focus:ring-emerald-500/50 font-medium text-lg"
                              placeholder="0.00"
                            />
                          )}
                        </div>
                        <div className="p-4 border-r border-t border-border/30">
                          {request.estado === RequestStatus.APROBADA && historicalBankData ? (
                            <div className="text-center font-medium text-lg">{formatNumber(parseFloat(puntosForward2 || "0"), 2)}</div>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              value={puntosForward2}
                              onChange={(e) => setPuntosForward2(e.target.value)}
                              className="w-full text-center border-0 bg-transparent focus:ring-2 focus:ring-blue-500/50 font-medium text-lg"
                              placeholder="0.00"
                            />
                          )}
                        </div>
                        <div className="p-4 border-t border-border/30">
                          {request.estado === RequestStatus.APROBADA && historicalBankData ? (
                            <div className="text-center font-medium text-lg">{formatNumber(parseFloat(puntosForward3 || "0"), 2)}</div>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              value={puntosForward3}
                              onChange={(e) => setPuntosForward3(e.target.value)}
                              className="w-full text-center border-0 bg-transparent focus:ring-2 focus:ring-purple-500/50 font-medium text-lg"
                              placeholder="0.00"
                            />
                          )}
                        </div>
                      </div>
                      
                      {/* TC All-in Row */}
                      <div className="grid grid-cols-4 gap-0 bg-amber-100/70 dark:bg-amber-950/30">
                        <div className="p-4 border-r border-t border-border/30 font-bold text-sm text-foreground">TC All-in</div>
                        <div className="p-4 border-r border-t border-border/30 text-center font-bold text-lg text-emerald-700 dark:text-emerald-400">
                          {calculateTcAllIn(tcSpot1, puntosForward1).toFixed(4)}
                        </div>
                        <div className="p-4 border-r border-t border-border/30 text-center font-bold text-lg text-blue-700 dark:text-blue-400">
                          {calculateTcAllIn(tcSpot2, puntosForward2).toFixed(4)}
                        </div>
                        <div className="p-4 border-t border-border/30 text-center font-bold text-lg text-purple-700 dark:text-purple-400">
                          {calculateTcAllIn(tcSpot3, puntosForward3).toFixed(4)}
                        </div>
                      </div>

                      {/* Separator */}
                      <div className="h-2 bg-muted/20"></div>

                      {/* Monto USD Row */}
                      <div className="grid grid-cols-4 gap-0 hover:bg-muted/30 transition-colors">
                        <div className="p-4 border-r border-t border-border/30 font-semibold text-sm text-foreground/80">Monto USD</div>
                        <div className="p-4 border-r border-t border-border/30 text-center font-bold text-lg">{coverage.exposicionCubierta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="p-4 border-r border-t border-border/30 text-center font-bold text-lg">{coverage.exposicionCubierta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="p-4 border-t border-border/30 text-center font-bold text-lg">{coverage.exposicionCubierta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>

                      {/* Ejecutivo Row */}
                      <div className="grid grid-cols-4 gap-0 hover:bg-muted/30 transition-colors">
                        <div className="p-4 border-r border-t border-border/30 font-semibold text-sm text-foreground/80">Ejecutivo</div>
                        <div className="p-4 border-r border-t border-border/30 text-center text-sm">
                          {executivesLoading1 ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
                            </div>
                          ) : bankExecutives1.length > 0 ? 
                            bankExecutives1.map(exec => exec.name).join(', ') : 
                            <span className="text-muted-foreground">No disponible</span>
                          }
                        </div>
                        <div className="p-4 border-r border-t border-border/30 text-center text-sm">
                          {executivesLoading2 ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            </div>
                          ) : bankExecutives2.length > 0 ? 
                            bankExecutives2.map(exec => exec.name).join(', ') : 
                            <span className="text-muted-foreground">No disponible</span>
                          }
                        </div>
                        <div className="p-4 border-t border-border/30 text-center text-sm">
                          {executivesLoading3 ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                            </div>
                          ) : bankExecutives3.length > 0 ? 
                            bankExecutives3.map(exec => exec.name).join(', ') : 
                            <span className="text-muted-foreground">No disponible</span>
                          }
                        </div>
                      </div>

                      {/* Telefono Row */}
                      <div className="grid grid-cols-4 gap-0 hover:bg-muted/30 transition-colors">
                        <div className="p-4 border-r border-t border-border/30 font-semibold text-sm text-foreground/80">Teléfono</div>
                        <div className="p-4 border-r border-t border-border/30 text-center text-sm font-mono">
                          {executivesLoading1 ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
                            </div>
                          ) : bankExecutives1.length > 0 ? 
                            bankExecutives1.map(exec => exec.contact_number).join(', ') : 
                            <span className="text-muted-foreground">No disponible</span>
                          }
                        </div>
                        <div className="p-4 border-r border-t border-border/30 text-center text-sm font-mono">
                          {executivesLoading2 ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            </div>
                          ) : bankExecutives2.length > 0 ? 
                            bankExecutives2.map(exec => exec.contact_number).join(', ') : 
                            <span className="text-muted-foreground">No disponible</span>
                          }
                        </div>
                        <div className="p-4 border-t border-border/30 text-center text-sm font-mono">
                          {executivesLoading3 ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                            </div>
                          ) : bankExecutives3.length > 0 ? 
                            bankExecutives3.map(exec => exec.contact_number).join(', ') : 
                            <span className="text-muted-foreground">No disponible</span>
                          }
                        </div>
                      </div>

                      {/* Separator */}
                      <div className="h-2 bg-muted/20"></div>

                      {/* Costo Row */}
                      <div className="grid grid-cols-4 gap-0 hover:bg-muted/30 transition-colors">
                        <div className="p-4 border-r border-t border-border/30 font-bold text-sm text-foreground">Costo</div>
                        <div className="p-4 border-r border-t border-border/30 text-center font-bold text-2xl text-emerald-700 dark:text-emerald-400">
                          {calculateTcAllIn(tcSpot1, puntosForward1).toFixed(4)}
                        </div>
                        <div className="p-4 border-r border-t border-border/30 text-center font-bold text-2xl text-blue-700 dark:text-blue-400">
                          {calculateTcAllIn(tcSpot2, puntosForward2).toFixed(4)}
                        </div>
                        <div className="p-4 border-t border-border/30 text-center font-bold text-2xl text-purple-700 dark:text-purple-400">
                          {calculateTcAllIn(tcSpot3, puntosForward3).toFixed(4)}
                        </div>
                      </div>

                      {/* Recargo Row */}
                      <div className="grid grid-cols-4 gap-0 hover:bg-muted/30 transition-colors">
                        <div className="p-4 border-r border-t border-border/30 font-semibold text-sm text-foreground/80">Recargo</div>
                        <div className="p-4 border-r border-t border-border/30">
                          {request.estado === RequestStatus.APROBADA && historicalBankData ? (
                            <div className="text-center font-bold text-lg">{parseFloat(recargo1 || "1").toFixed(2)}</div>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              value={recargo1}
                              onChange={(e) => setRecargo1(e.target.value)}
                              className="w-full text-center border-0 bg-transparent focus:ring-2 focus:ring-emerald-500/50 font-bold text-lg"
                              placeholder="1.00"
                            />
                          )}
                        </div>
                        <div className="p-4 border-r border-t border-border/30">
                          {request.estado === RequestStatus.APROBADA && historicalBankData ? (
                            <div className="text-center font-bold text-lg">{parseFloat(recargo2 || "1").toFixed(2)}</div>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              value={recargo2}
                              onChange={(e) => setRecargo2(e.target.value)}
                              className="w-full text-center border-0 bg-transparent focus:ring-2 focus:ring-blue-500/50 font-bold text-lg"
                              placeholder="1.00"
                            />
                          )}
                        </div>
                        <div className="p-4 border-t border-border/30">
                          {request.estado === RequestStatus.APROBADA && historicalBankData ? (
                            <div className="text-center font-bold text-lg">{parseFloat(recargo3 || "1").toFixed(2)}</div>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              value={recargo3}
                              onChange={(e) => setRecargo3(e.target.value)}
                              className="w-full text-center border-0 bg-transparent focus:ring-2 focus:ring-purple-500/50 font-bold text-lg"
                              placeholder="1.00"
                            />
                          )}
                        </div>
                      </div>

                      {/* TC Cliente Row */}
                      <div className="grid grid-cols-4 gap-0">
                        <div className="p-4 border-r border-t border-border/30 font-bold text-sm text-foreground">TC Cliente</div>
                        <div 
                          className={cn(
                            "p-4 border-r border-t border-border/30 text-center font-bold text-3xl cursor-pointer transition-all duration-200 group",
                            selectedBankForHighlight === 1 
                              ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg" 
                              : "hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          )}
                          onDoubleClick={() => handleTcClienteDoubleClick(1)}
                          title="Doble click para seleccionar este TC Cliente"
                        >
                          <span className={cn(
                            "group-hover:scale-105 transition-transform",
                            selectedBankForHighlight === 1 ? "text-white" : "text-emerald-700 dark:text-emerald-400"
                          )}>
                            {calculateTcCliente(tcSpot1, puntosForward1, recargo1).toFixed(4)}
                          </span>
                        </div>
                        <div 
                          className={cn(
                            "p-4 border-r border-t border-border/30 text-center font-bold text-3xl cursor-pointer transition-all duration-200 group",
                            selectedBankForHighlight === 2 
                              ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg" 
                              : "hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          )}
                          onDoubleClick={() => handleTcClienteDoubleClick(2)}
                          title="Doble click para seleccionar este TC Cliente"
                        >
                          <span className={cn(
                            "group-hover:scale-105 transition-transform",
                            selectedBankForHighlight === 2 ? "text-white" : "text-blue-700 dark:text-blue-400"
                          )}>
                            {calculateTcCliente(tcSpot2, puntosForward2, recargo2).toFixed(4)}
                          </span>
                        </div>
                        <div 
                          className={cn(
                            "p-4 border-t border-border/30 text-center font-bold text-3xl cursor-pointer transition-all duration-200 group",
                            selectedBankForHighlight === 3 
                              ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg" 
                              : "hover:bg-purple-50 dark:hover:bg-purple-950/30"
                          )}
                          onDoubleClick={() => handleTcClienteDoubleClick(3)}
                          title="Doble click para seleccionar este TC Cliente"
                        >
                          <span className={cn(
                            "group-hover:scale-105 transition-transform",
                            selectedBankForHighlight === 3 ? "text-white" : "text-purple-700 dark:text-purple-400"
                          )}>
                            {calculateTcCliente(tcSpot3, puntosForward3, recargo3).toFixed(4)}
                          </span>
                        </div>
                      </div>

                      {/* Valor Total Row */}
                      <div className="grid grid-cols-4 gap-0 bg-gradient-to-r from-muted/50 to-muted/30 border-t-2 border-border">
                        <div className="p-6 border-r border-border/30 font-bold text-lg text-foreground">Valor Total</div>
                        <div className="p-6 border-r border-border/30 text-center text-xl font-bold text-emerald-700 dark:text-emerald-400">
                          {request ? (calculateTcCliente(tcSpot1, puntosForward1, recargo1) * request.montoNegocioUsd).toLocaleString('es-CL') : ''}
                        </div>
                        <div className="p-6 border-r border-border/30 text-center text-xl font-bold text-blue-700 dark:text-blue-400">
                          {request ? (calculateTcCliente(tcSpot2, puntosForward2, recargo2) * request.montoNegocioUsd).toLocaleString('es-CL') : ''}
                        </div>
                        <div className="p-6 text-center text-xl font-bold text-purple-700 dark:text-purple-400">
                          {request ? (calculateTcCliente(tcSpot3, puntosForward3, recargo3) * request.montoNegocioUsd).toLocaleString('es-CL') : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column - Coverage Parameters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Parámetros de cobertura</CardTitle>
                {canEditCoverageParams && !isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Due Date */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Fecha Vencimiento</Label>
                {isEditing ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !forwardDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {forwardDate ? (
                          <>
                            {format(forwardDate, "PPP")} 
                            <span className="ml-2 text-muted-foreground">
                              ({differenceInDays(forwardDate, new Date())} días)
                            </span>
                          </>
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={forwardDate}
                        onSelect={setForwardDate}
                        disabled={(date) => date <= new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div>
                    {forwardDate ? (
                      <>
                        <div className="text-base font-semibold text-foreground">
                          {format(forwardDate, "MMMM do, yyyy")}
                        </div>
                        <div className="text-sm font-normal text-muted-foreground mt-1">
                          {approvalDate 
                            ? `${differenceInDays(forwardDate, approvalDate)} días forward`
                            : `${differenceInDays(forwardDate, new Date())} días desde hoy`
                          }
                        </div>
                      </>
                    ) : (
                      <div className="text-base text-muted-foreground">-</div>
                    )}
                  </div>
                )}
              </div>

              {/* Coverage Percentage - Hidden for Vendedor */}
              {isAdmin && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground">% Cobertura</Label>
                  
                  {isEditing ? (
                    <>
                      <Slider
                        value={porcentajeCobertura}
                        onValueChange={setPorcentajeCobertura}
                        max={100}
                        step={0.01}
                        className="w-full"
                      />
                      <Input
                        type="number"
                        value={porcentajeCobertura[0]}
                        onChange={(e) => setPorcentajeCobertura([parseFloat(e.target.value) || 0])}
                        min="0"
                        max="100"
                        step="0.01"
                        className="text-center"
                      />
                    </>
                  ) : (
                    <CoverageIndicator
                      percentage={porcentajeCobertura[0]}
                      suggested={coverage.coberturaSugerida}
                      showProgress={true}
                    />
                  )}
                </div>
              )}

              {/* Bank */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Banco</Label>
                {isEditing ? (
                  <Select value={banco} onValueChange={setBanco}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map(bank => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-base font-semibold text-foreground">{banco || "-"}</div>
                )}
              </div>

              {/* TC Spot */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">TC Spot</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={tcSpot}
                    onChange={(e) => {
                      setTcSpot(e.target.value);
                      // Auto-calculate TC All-in
                      const spotValue = parseFloat(e.target.value) || 0;
                      const forwardsValue = parseFloat(puntosForwards) || 0;
                      setTcAllIn((spotValue + forwardsValue).toString());
                    }}
                    placeholder="0.0000"
                    step="0.0001"
                  />
                ) : (
                  <div className="text-base font-semibold text-foreground">
                    {tcSpot ? `$${parseFloat(tcSpot).toFixed(4)}` : "-"}
                  </div>
                )}
              </div>

              {/* Puntos Forwards */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Puntos Forwards</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={puntosForwards}
                    onChange={(e) => {
                      setPuntosForwards(e.target.value);
                      // Auto-calculate TC All-in
                      const spotValue = parseFloat(tcSpot) || 0;
                      const forwardsValue = parseFloat(e.target.value) || 0;
                      setTcAllIn((spotValue + forwardsValue).toString());
                    }}
                    placeholder="0.0000"
                    step="0.0001"
                  />
                ) : (
                  <div className="text-base font-semibold text-foreground">
                    {puntosForwards ? `${parseFloat(puntosForwards).toFixed(4)}` : "-"}
                  </div>
                )}
              </div>

              {/* TC All-in */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">TC All-in</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={tcAllIn}
                    onChange={(e) => setTcAllIn(e.target.value)}
                    placeholder="0.0000"
                    step="0.0001"
                    disabled
                    className="bg-muted"
                  />
                ) : (
                  <div className="text-base font-semibold text-foreground">
                    {tcAllIn ? `$${parseFloat(tcAllIn).toFixed(4)}` : "-"}
                  </div>
                )}
              </div>

              {/* Exchange Rate */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">TC Cliente</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={tcCliente}
                    onChange={(e) => setTcCliente(e.target.value)}
                    placeholder="0.0000"
                    step="0.0001"
                  />
                ) : (
                  <div className="text-base font-semibold text-foreground">
                    {tcCliente ? `$${parseFloat(tcCliente).toFixed(4)}` : "-"}
                  </div>
                )}
              </div>

              {/* Internal Numbers */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Números Internos</Label>
                {isEditing ? (
                  <div className="space-y-2">
                    {numerosInternos.map((numero, index) => (
                      <div key={index} className="space-y-1">
                        <Input
                          type="number"
                          value={numero.numeroInterno || ''}
                          onChange={(e) => {
                            const newNumbers = [...numerosInternos];
                            newNumbers[index] = { ...newNumbers[index], numeroInterno: Number.parseInt(e.target.value) || 0 };
                            setNumerosInternos(newNumbers);
                          }}
                          placeholder={`Número interno ${index + 1}`}
                        />
                        {numero.modelo && (
                          <p className="text-xs text-green-600">✓ {numero.modelo}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {numerosInternos.length > 0 ? numerosInternos.map((numero, index) => (
                      <div key={index} className="text-base font-semibold text-foreground">
                        {numero.numeroInterno}
                        {numero.modelo && (
                          <span className="text-xs text-green-600 ml-2">({numero.modelo})</span>
                        )}
                      </div>
                    )) : <div className="text-base text-muted-foreground">-</div>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">N° SIE</Label>
                  {isEditing ? (
                    <Input
                      value={numeroSie}
                      onChange={(e) => setNumeroSie(e.target.value)}
                      placeholder="SIE-XXXX-XXX"
                    />
                  ) : (
                    <div className="text-base font-semibold text-foreground">{numeroSie || "-"}</div>
                  )}
                </div>
              </div>

              {isAdmin && <Separator />}

              {/* Coverage Summary - Hidden for Vendedor */}
              {isAdmin && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Total negocio:</span>
                    <span className="text-base font-semibold text-foreground">US${coverage.totalNegocio.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Base cobertura:</span>
                    <span className="text-base font-semibold text-foreground">US${coverage.baseCoberturaAprobado.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Exposición cubierta:</span>
                    <span className="text-base font-semibold text-success">US${coverage.exposicionCubierta.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Exposición descubierta:</span>
                    <span className="text-base font-semibold text-destructive">US${coverage.exposicionDescubierta.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {canEdit && isEditing && (
                <div className="pt-4 space-y-2">
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Send to Revision button for BORRADOR status - always visible */}
              {request.estado === RequestStatus.BORRADOR && !isEditing && (
                <div className="pt-4">
                  <Button 
                    onClick={() => handleStatusChange(RequestStatus.EN_REVISION)}
                    disabled={isSaving}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSaving ? "Enviando..." : "Enviar a revisión"}
                  </Button>
                </div>
              )}
              
              {/* Approve/Reject buttons for EN_REVISION status (Admin only) */}
              {isAdmin && request.estado === RequestStatus.EN_REVISION && (
                <div className="pt-4 flex flex-col gap-2">
                  <Button 
                    onClick={() => handleStatusChange(RequestStatus.APROBADA)}
                    disabled={isSaving}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprobar
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleStatusChange(RequestStatus.RECHAZADA)}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rechazar
                  </Button>
                </div>
              )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}


const getUserRole = (profileRole: string): UserRole => {
    if (profileRole === 'ADMIN') return UserRole.ADMIN;
    if (profileRole === 'COORDINADOR') return UserRole.COORDINADOR;
    return UserRole.VENDEDOR;
  };