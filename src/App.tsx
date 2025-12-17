import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardAdmin from "./pages/DashboardAdmin";
import Configuration from "./pages/Configuration";
import NewRequest from "./pages/NewRequest";
import RequestDetail from "./pages/RequestDetail";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><DashboardAdmin /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracion" element={<ProtectedRoute><DashboardLayout><Configuration /></DashboardLayout></ProtectedRoute>} />
            <Route path="/nueva-solicitud" element={<ProtectedRoute><DashboardLayout><NewRequest /></DashboardLayout></ProtectedRoute>} />
            <Route path="/solicitud/:id" element={<ProtectedRoute><DashboardLayout><RequestDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
