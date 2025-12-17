import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowRight, Lock, KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateEmail } from "@/utils/validation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signInWithPassword, signUpWithPassword, resetPassword, user } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un email corporativo válido (@epysa.cl)",
        variant: "destructive"
      });
      return;
    }

    if (!password) {
      toast({
        title: "Contraseña requerida",
        description: "Por favor ingresa tu contraseña",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await signInWithPassword(email, password);
      
      if (error) {
        toast({
          title: "Error de inicio de sesión",
          description: error.message === 'Invalid login credentials' 
            ? "Email o contraseña incorrectos"
            : error.message || "No se pudo iniciar sesión",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido al sistema SSC"
      });
      
      setIsLoading(false);
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error al procesar tu solicitud",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un email corporativo válido (@epysa.cl)",
        variant: "destructive"
      });
      return;
    }

    if (!password || password.length < 6) {
      toast({
        title: "Contraseña inválida",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Contraseñas no coinciden",
        description: "Las contraseñas ingresadas no coinciden",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await signUpWithPassword(email, password);
      
      if (error) {
        toast({
          title: "Error de registro",
          description: error.message === 'User already registered'
            ? "El usuario ya está registrado. Intenta iniciar sesión."
            : error.message || "No se pudo registrar el usuario",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Registro exitoso",
        description: "Tu cuenta ha sido creada. Ahora puedes iniciar sesión."
      });
      
      setMode('signin');
      setPassword('');
      setConfirmPassword('');
      setIsLoading(false);
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error al procesar tu solicitud",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un email corporativo válido (@epysa.cl)",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        toast({
          title: "Error al enviar email",
          description: error.message || "No se pudo enviar el email de recuperación",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Email enviado",
        description: `Se ha enviado un email de recuperación a ${email}`
      });
      
      setMode('signin');
      setIsLoading(false);
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error al procesar tu solicitud",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-financial-bg flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/epysa-logo.jpg" 
              alt="Epysa Logo" 
              className="h-16 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">SSC Epysa</h1>
          <p className="text-muted-foreground">Solicitudes de Seguro de Cambio</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mode === 'signin' ? (
                <>
                  <Mail className="h-5 w-5" />
                  Iniciar sesión
                </>
              ) : mode === 'signup' ? (
                <>
                  <Lock className="h-5 w-5" />
                  Crear cuenta
                </>
              ) : (
                <>
                  <KeyRound className="h-5 w-5" />
                  Recuperar contraseña
                </>
              )}
            </CardTitle>
            <CardDescription>
              {mode === 'signin' 
                ? 'Ingresa tu email corporativo y contraseña'
                : mode === 'signup'
                ? 'Crea tu cuenta con email corporativo'
                : 'Ingresa tu email para recuperar tu contraseña'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email corporativo</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@epysa.cl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
                </Button>
                
                <div className="text-center space-y-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMode('reset')}
                  >
                    ¿Olvidaste tu contraseña?
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMode('signup')}
                  >
                    ¿No tienes cuenta? Crear una
                  </Button>
                </div>
              </form>
            ) : mode === 'signup' ? (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email corporativo</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@epysa.cl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirma tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creando cuenta..." : "Crear cuenta"}
                </Button>
                
                <div className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMode('signin');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    ¿Ya tienes cuenta? Iniciar sesión
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email corporativo</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@epysa.cl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Enviando..." : "Enviar email de recuperación"}
                </Button>
                
                <div className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMode('signin');
                      setPassword('');
                    }}
                  >
                    Volver a iniciar sesión
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-xs text-muted-foreground">
          <p>Solo usuarios con email @epysa.cl pueden acceder al sistema</p>
        </div>
      </div>
    </div>
  );
}