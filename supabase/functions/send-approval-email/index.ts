import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface ApprovalEmailRequest {
  requestId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId }: ApprovalEmailRequest = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch request data
    const { data: request, error: requestError } = await supabase
      .from('currency_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError) throw new Error(`Error fetching request: ${requestError.message}`);

    // Calculate request number based on creation order
    const { data: allRequests, error: allRequestsError } = await supabase
      .from('currency_requests')
      .select('id, created_at')
      .order('created_at', { ascending: true });

    let requestNumber = request.id.substring(0, 8);
    if (!allRequestsError && allRequests) {
      const requestIndex = allRequests.findIndex(r => r.id === requestId);
      if (requestIndex !== -1) {
        requestNumber = `#${String(requestIndex + 1).padStart(4, '0')}`;
      }
    }

    // Fetch seller profile to get emails
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, nombre_apellido, correo_jefatura_directa, correo_gerente')
      .eq('user_id', request.user_id)
      .single();

    if (profileError) throw new Error(`Error fetching profile: ${profileError.message}`);

    // Format numbers for display
    const formatCurrency = (value: number | null) => {
      if (value === null || value === undefined) return 'N/A';
      return `$${value.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    };

    const formatPercentage = (value: number | null) => {
      if (value === null || value === undefined) return 'N/A';
      return `${value.toFixed(2)}%`;
    };

    // Parse payments
    const payments = Array.isArray(request.payments) ? request.payments : [];
    
    // Get payment type label
    const getPaymentTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        CONTADO: 'Contado',
        CREDITO_DIRECTO: 'Crédito Directo',
        LETRA: 'Letra',
        COBRANZA_EXTRANJERA: 'Cobranza Extranjera',
        COBRANZA_NACIONAL: 'Cobranza Nacional',
        CARTA_CREDITO: 'Carta de Crédito',
        OTRO: 'Otro'
      };
      return labels[type] || type;
    };

    // Get status badge class
    const getStatusBadgeClass = (status: string) => {
      const classes: Record<string, string> = {
        APROBADA: 'pdf-status-aprobada',
        EN_REVISION: 'pdf-status-en-revision',
        BORRADOR: 'pdf-status-borrador',
        RECHAZADA: 'pdf-status-rechazada',
        ANULADA: 'pdf-status-anulada'
      };
      return classes[status] || 'pdf-status-borrador';
    };

    // Generate payment rows HTML
    const paymentsHTML = payments.map((payment: any, index: number) => `
      <tr>
        <td>${index + 1}</td>
        <td>${getPaymentTypeLabel(payment.type)}</td>
        <td>${formatCurrency(payment.amount)}</td>
        <td>${payment.dueDate ? new Date(payment.dueDate).toLocaleDateString('es-CL') : 'N/A'}</td>
        <td>${payment.internNumbers || 'N/A'}</td>
      </tr>
    `).join('');

    // Generate billing HTML if approved
    let billingHTML = '';
    if (request.estado === 'APROBADA' && request.tc_all_in && request.tc_cliente) {
      const tcAllInValue = parseFloat(request.tc_all_in.toString()) || 0;
      const tcClienteValue = parseFloat(request.tc_cliente.toString()) || 0;
      const unidades = request.unidades || 1;
      const montoNegocio = request.monto_negocio_usd || 0;
      
      if (tcAllInValue > 0 && unidades > 0) {
        const valorFacturaTotal = (montoNegocio * tcClienteValue) / (tcAllInValue * unidades);
        const valorFacturaNeto = valorFacturaTotal / 1.19;
        const totalFacturaClp = valorFacturaTotal * tcAllInValue;

        billingHTML = `
          <div class="pdf-section full-width">
            <div class="pdf-section-title">Facturación</div>
            <div class="pdf-grid" style="grid-template-columns: repeat(4, 1fr);">
              <div class="pdf-field">
                <div class="pdf-field-label">Valor Factura USD por Bus Neto</div>
                <div class="pdf-field-value">$${valorFacturaNeto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div class="pdf-field">
                <div class="pdf-field-label">Valor Factura USD por Bus Total</div>
                <div class="pdf-field-value">$${valorFacturaTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div class="pdf-field">
                <div class="pdf-field-label">TC Factura</div>
                <div class="pdf-field-value">${tcAllInValue.toFixed(4)}</div>
              </div>
              <div class="pdf-field">
                <div class="pdf-field-label">Total Factura CLP por Bus</div>
                <div class="pdf-field-value">${formatCurrency(totalFacturaClp)}</div>
              </div>
            </div>
          </div>
        `;
      }
    }

    // Generate coverage parameters HTML if approved
    let coverageHTML = '';
    if (request.estado === 'APROBADA') {
      coverageHTML = `
        <div class="pdf-section">
          <div class="pdf-section-title">Parámetros de Cobertura</div>
          <div class="pdf-grid">
            <div class="pdf-field">
              <div class="pdf-field-label">Banco</div>
              <div class="pdf-field-value">${request.banco || 'N/A'}</div>
            </div>
            <div class="pdf-field">
              <div class="pdf-field-label">Días Forward</div>
              <div class="pdf-field-value">${request.dias_forward || 'N/A'}</div>
            </div>
            <div class="pdf-field">
              <div class="pdf-field-label">Fecha Vencimiento</div>
              <div class="pdf-field-value">${request.fecha_vencimiento ? new Date(request.fecha_vencimiento).toLocaleDateString('es-CL') : 'N/A'}</div>
            </div>
            <div class="pdf-field">
              <div class="pdf-field-label">% Cobertura</div>
              <div class="pdf-field-value">${formatPercentage(request.porcentaje_cobertura)}</div>
            </div>
            <div class="pdf-field">
              <div class="pdf-field-label">TC Cliente</div>
              <div class="pdf-field-value">${formatCurrency(request.tc_cliente)}</div>
            </div>
            <div class="pdf-field">
              <div class="pdf-field-label">TC Spot</div>
              <div class="pdf-field-value">${formatCurrency(request.tc_spot)}</div>
            </div>
            <div class="pdf-field">
              <div class="pdf-field-label">Puntos Forward</div>
              <div class="pdf-field-value">${formatCurrency(request.puntos_forwards)}</div>
            </div>
            <div class="pdf-field">
              <div class="pdf-field-label">TC All-in</div>
              <div class="pdf-field-value">${formatCurrency(request.tc_all_in)}</div>
            </div>
            ${request.numero_sie ? `
              <div class="pdf-field">
                <div class="pdf-field-label">Número SIE</div>
                <div class="pdf-field-value">${request.numero_sie}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    // Generate HTML email content
    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Solicitud Aprobada #${request.id.substring(0, 8)}</title>
          <style>
            @page { margin: 1cm; size: A4 portrait; }
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
          </style>
        </head>
        <body>
          <div class="pdf-header">
            <img src="https://hblbwermqzsbibanrjpy.supabase.co/storage/v1/object/public/assets/epysa-logo.jpg" alt="Epysa Logo" class="pdf-logo" />
            <div class="pdf-title-section">
              <div class="pdf-title">Solicitud de Cobertura</div>
              <div class="pdf-subtitle">Folio: ${requestNumber}</div>
              <div class="pdf-subtitle">Fecha: ${new Date(request.created_at).toLocaleDateString('es-CL')}</div>
              <span class="pdf-status-badge ${getStatusBadgeClass(request.estado)}">${request.estado}</span>
            </div>
          </div>

          <div class="two-column-layout">
            <div class="pdf-section">
              <div class="pdf-section-title">Información del Cliente</div>
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
                  <div class="pdf-field-label">Monto Negocio (USD)</div>
                  <div class="pdf-field-value">${formatCurrency(request.monto_negocio_usd)}</div>
                </div>
                <div class="pdf-field">
                  <div class="pdf-field-label">Unidades</div>
                  <div class="pdf-field-value">${request.unidades}</div>
                </div>
                <div class="pdf-field">
                  <div class="pdf-field-label">Vendedor</div>
                  <div class="pdf-field-value">${profile.nombre_apellido || profile.email}</div>
                </div>
              </div>
            </div>

            ${coverageHTML}
          </div>

          <div class="pdf-section full-width">
            <div class="pdf-section-title">Medios de Pago</div>
            <table class="pdf-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Fecha Vencimiento</th>
                  <th>Números Internos</th>
                </tr>
              </thead>
              <tbody>
                ${paymentsHTML}
              </tbody>
            </table>
            
            <!-- Internal Numbers and SIE Number -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px;">
              <div class="pdf-field">
                <div class="pdf-field-label">Números Internos</div>
                <div class="pdf-field-value">${request.numeros_internos && request.numeros_internos.length > 0 ? request.numeros_internos.filter((n: string) => n).join(', ') || '-' : '-'}</div>
              </div>
              <div class="pdf-field">
                <div class="pdf-field-label">Número SIE</div>
                <div class="pdf-field-value">${request.numero_sie || '-'}</div>
              </div>
            </div>
          </div>

          ${billingHTML}
        </body>
      </html>
    `;

    // Prepare recipient list
    const recipients: string[] = [profile.email];
    
    // Add jefatura if available
    if (profile.correo_jefatura_directa) {
      recipients.push(profile.correo_jefatura_directa);
    }
    
    // Add gerente if available
    if (profile.correo_gerente) {
      recipients.push(profile.correo_gerente);
    }

    // CC list
    const ccList = [
      'marco.navarrete@epysa.cl',
      'analia.sepulveda@epysa.cl',
      'bryan.vickers@epysa.cl',
      'juan.donoso@epysa.cl',
      'juan.villanueva@epysa.cl',
      'kaina.villacura@epysa.cl',
      'gonzalo.calderon@epysa.cl'
    ];

    console.log('Sending email to:', recipients);
    console.log('CC:', ccList);

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: 'SSC Epysa <noreply@epysa.cl>',
      to: recipients,
      cc: ccList,
      subject: `Solicitud de Cobertura Aprobada - ${request.cliente}`,
      html: emailHTML,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email sent successfully',
      emailResponse 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in send-approval-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
