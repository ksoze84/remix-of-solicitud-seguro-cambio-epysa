import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OTPEmailRequest {
  email: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp }: OTPEmailRequest = await req.json();

    console.log(`Simulating OTP email to: ${email}, OTP: ${otp}`);

    // For now, we'll simulate sending the email
    // In production, you would implement actual email sending here
    const simulatedResponse = {
      id: `simulated_${Date.now()}`,
      from: "SSC Epysa <noreply@epysa.cl>",
      to: [email],
      subject: "Código de verificación - SSC Epysa",
      created_at: new Date().toISOString()
    };

    console.log("Simulated OTP email sent:", simulatedResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "OTP email simulated successfully",
      emailResponse: simulatedResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-otp-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);