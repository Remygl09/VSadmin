import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";
import FounderLayout from "@/components/FounderLayout";
import LoginPage from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminClientDetail from "./pages/admin/ClientDetail";
import AdminSettings from "./pages/admin/Settings";
import AdminPayments from "./pages/admin/Payments";
import AdminArchived from "./pages/admin/Archived";
import FounderDashboard from "./pages/founder/Dashboard";
import NotFound from "./pages/NotFound";
import PublicVoiceForm from "./pages/PublicVoiceForm";
import ErrorBoundary from "./pages/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} errorElement={<ErrorBoundary />} />
            <Route path="/login" element={<LoginPage />} errorElement={<ErrorBoundary />} />

            {/* Admin routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout><AdminDashboard /></AdminLayout>
                </ProtectedRoute>
              }
              errorElement={<ErrorBoundary />}
            />
            <Route
              path="/admin/clients/:id"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout><AdminClientDetail /></AdminLayout>
                </ProtectedRoute>
              }
              errorElement={<ErrorBoundary />}
            />
            <Route
              path="/admin/archived"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout><AdminArchived /></AdminLayout>
                </ProtectedRoute>
              }
              errorElement={<ErrorBoundary />}
            />
            <Route
              path="/admin/payments"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout><AdminPayments /></AdminLayout>
                </ProtectedRoute>
              }
              errorElement={<ErrorBoundary />}
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout><AdminSettings /></AdminLayout>
                </ProtectedRoute>
              }
              errorElement={<ErrorBoundary />}
            />

            {/* Founder routes */}
            <Route
              path="/founder/dashboard"
              element={
                <ProtectedRoute allowedRole="founder">
                  <FounderLayout><FounderDashboard /></FounderLayout>
                </ProtectedRoute>
              }
              errorElement={<ErrorBoundary />}
            />

            {/* Public voice form route */}
            <Route path="/forms/:token" element={<PublicVoiceForm />} errorElement={<ErrorBoundary />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
