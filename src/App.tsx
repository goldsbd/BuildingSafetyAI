import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Index from "./pages/Index";
import Projects from "./pages/Projects";
import Companies from "./pages/Companies";
import CompanyProjects from "./pages/CompanyProjects";
import DocumentUpload from "./pages/DocumentUpload";
import ProjectDetailsCompact from "./pages/ProjectDetailsCompact";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/auth/Login";
import Dashboard from "./pages/Dashboard";
import DocumentAssessment from "./pages/DocumentAssessment";
import DocumentLibrary from "./pages/DocumentLibrary";
import DocumentCategories from "./pages/DocumentCategories";
import EvaluationsInProgress from "./pages/EvaluationsInProgress";
import AdminQuestions from "./pages/admin/AdminQuestions";
import AdminPrompts from "./pages/admin/AdminPrompts";
import ModelConfiguration from "./pages/ai-models/ModelConfiguration";
import TokenUsage from "./pages/ai-models/TokenUsage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/auth/login" element={<LoginPage />} />
            
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            {/* Companies routes */}
            <Route
              path="/companies"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Companies />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies/:companyId/projects"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CompanyProjects />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies/:companyId/projects/:projectId/documents"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProjectDetailsCompact />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies/:companyId/projects/:projectId/documents/upload"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProjectDetailsCompact />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Legacy projects route - redirect to companies */}
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Projects />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/active"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Projects />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/archived"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Projects />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents/upload"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DocumentUpload />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DocumentLibrary />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents/categories"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DocumentCategories />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents/:documentId/assess"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DocumentAssessment />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Evaluation routes */}
            <Route
              path="/evaluations/progress"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <EvaluationsInProgress />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluations/completed"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="p-6">
                      <h1 className="text-2xl font-bold">Completed Evaluations</h1>
                    </div>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluations/reports"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="p-6">
                      <h1 className="text-2xl font-bold">Evaluation Reports</h1>
                    </div>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Settings routes */}
            <Route
              path="/settings/account"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="p-6">
                      <h1 className="text-2xl font-bold">Account Settings</h1>
                    </div>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/team"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="p-6">
                      <h1 className="text-2xl font-bold">Team Settings</h1>
                    </div>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/preferences"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <div className="p-6">
                      <h1 className="text-2xl font-bold">Preferences</h1>
                    </div>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Admin routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AppLayout>
                    <Routes>
                      <Route path="questions" element={<AdminQuestions />} />
                      <Route path="prompts" element={<AdminPrompts />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="companies" element={<div>Companies Management</div>} />
                      <Route path="users" element={<div>Users Management</div>} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            {/* AI Models routes */}
            <Route
              path="/ai-models/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AppLayout>
                    <Routes>
                      <Route path="config" element={<ModelConfiguration />} />
                      <Route path="usage" element={<TokenUsage />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Error pages */}
            <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
