import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Nav from './components/Nav';
import Footer from './components/Footer';
import FloatingWhatsApp from './components/FloatingWhatsApp';

import Home from './pages/Home';
import Services from './pages/Services';
import Work from './pages/Work';
import About from './pages/About';
import Pricing from './pages/Pricing';
import Reviews from './pages/Reviews';
import Contact from './pages/Contact';
import ConnectorApplication from './pages/ConnectorApplication';

import { AuthProvider } from './lib/auth';
import ProtectedRoute from './components/portal/ProtectedRoute';
import OwnerFinanceGate from './components/portal/OwnerFinanceGate';

import Login from './pages/portal/Login';
import ResetPassword from './pages/portal/ResetPassword';
import PortalLayout from './pages/portal/PortalLayout';
import ClientDashboard from './pages/portal/dashboards/ClientDashboard';
import Projects from './pages/portal/Projects';
import ProjectDetails from './pages/portal/ProjectDetails';
import Invoices from './pages/portal/Invoices';
import InvoiceDetails from './pages/portal/InvoiceDetails';
import Documents from './pages/portal/Documents';
import Activity from './pages/portal/Activity';
import Messages from './pages/portal/Messages';
import Settings from './pages/portal/Settings';
import SubmitLead from './pages/portal/SubmitLead';
import TeamManagement from './pages/portal/TeamManagement';
import TeamPayouts from './pages/portal/TeamPayouts';
import OwnerUserManagement from './pages/portal/OwnerUserManagement';

import ConnectorLeads from './pages/portal/connector/ConnectorLeads';
import ConnectorRules from './pages/portal/connector/ConnectorRules';

import Clients from './pages/portal/Client';
import ClientDetails from './pages/portal/ClientDetails';

import OwnerDashboard from './pages/portal/dashboards/OwnerDashboard';
import AdminDashboard from './pages/portal/dashboards/AdminDashboard';
import AdminProjects from './pages/portal/dashboards/AdminProjects';
import FinanceDashboard from './pages/portal/dashboards/FinanceDashboard';
import ConnectorDashboard from './pages/portal/dashboards/ConnectorDashboard';
import OperatorDashboard from './pages/portal/dashboards/OperatorDashboard';

function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-ink-950 overflow-x-hidden">
      <Nav />

      <main>{children}</main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* PUBLIC WEBSITE */}

          <Route
            path="/"
            element={
              <PublicLayout>
                <Home />
              </PublicLayout>
            }
          />

          <Route
            path="/services"
            element={
              <PublicLayout>
                <Services />
              </PublicLayout>
            }
          />

          <Route
            path="/work"
            element={
              <PublicLayout>
                <Work />
              </PublicLayout>
            }
          />

          <Route
            path="/about"
            element={
              <PublicLayout>
                <About />
              </PublicLayout>
            }
          />

          <Route
            path="/pricing"
            element={
              <PublicLayout>
                <Pricing />
              </PublicLayout>
            }
          />

          <Route
            path="/reviews"
            element={
              <PublicLayout>
                <Reviews />
              </PublicLayout>
            }
          />

          <Route
            path="/contact"
            element={
              <PublicLayout>
                <Contact />
              </PublicLayout>
            }
          />

          <Route
            path="/connector-apply"
            element={
              <PublicLayout>
                <ConnectorApplication />
              </PublicLayout>
            }
          />

          {/* AUTHENTICATION */}

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          {/* PORTAL */}

          <Route
            path="/portal"
            element={
              <ProtectedRoute>
                <PortalLayout />
              </ProtectedRoute>
            }
          >
            {/* CLIENT WORKSPACE */}

            <Route
              index
              element={
                <ProtectedRoute requiredRoles={['client']}>
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="projects"
              element={<Projects />}
            />

            <Route
              path="projects/:projectId"
              element={<ProjectDetails />}
            />

            <Route
              path="invoices"
              element={<Invoices />}
            />

            <Route
              path="invoices/:invoiceId"
              element={<InvoiceDetails />}
            />

            <Route
              path="documents"
              element={<Documents />}
            />

            <Route
              path="activity"
              element={<Activity />}
            />

            <Route
              path="messages"
              element={
                <ProtectedRoute
                  requiredRoles={[
                    'operator',
                    'owner',
                    'admin',
                  ]}
                >
                  <Messages />
                </ProtectedRoute>
              }
            />

            <Route
              path="settings"
              element={<Settings />}
            />

            {/* OWNER WORKSPACE */}

            <Route
              path="owner"
              element={
                <ProtectedRoute requiredRoles={['owner']}>
                  <OwnerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="owner/users"
              element={
                <ProtectedRoute requiredRoles={['owner']}>
                  <OwnerUserManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="owner/projects"
              element={
                <ProtectedRoute requiredRoles={['owner']}>
                  <AdminProjects />
                </ProtectedRoute>
              }
            />

            <Route
              path="owner/finance"
              element={
                <ProtectedRoute requiredRoles={['owner']}>
                  <OwnerFinanceGate>
                    <FinanceDashboard />
                  </OwnerFinanceGate>
                </ProtectedRoute>
              }
            />

            <Route
              path="owner/team"
              element={
                <ProtectedRoute requiredRoles={['owner']}>
                  <TeamManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="owner/team/payouts"
              element={
                <ProtectedRoute requiredRoles={['owner']}>
                  <TeamPayouts />
                </ProtectedRoute>
              }
            />

            {/* ADMIN WORKSPACE */}

            <Route
              path="admin"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="admin/projects"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AdminProjects />
                </ProtectedRoute>
              }
            />

            <Route
              path="admin/team"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <TeamManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="admin/team/payouts"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <TeamPayouts />
                </ProtectedRoute>
              }
            />

            {/* OWNER + ADMIN CLIENT MANAGEMENT */}

            <Route
              path="clients"
              element={
                <ProtectedRoute
                  requiredRoles={['admin', 'owner']}
                >
                  <Clients />
                </ProtectedRoute>
              }
            />

            <Route
              path="clients/:clientId"
              element={
                <ProtectedRoute
                  requiredRoles={['admin', 'owner']}
                >
                  <ClientDetails />
                </ProtectedRoute>
              }
            />

            {/* CONNECTOR WORKSPACE */}

            <Route
              path="connector"
              element={
                <ProtectedRoute requiredRoles={['connector']}>
                  <ConnectorDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="connector/leads"
              element={
                <ProtectedRoute requiredRoles={['connector']}>
                  <ConnectorLeads />
                </ProtectedRoute>
              }
            />

            <Route
              path="connector/rules"
              element={
                <ProtectedRoute requiredRoles={['connector']}>
                  <ConnectorRules />
                </ProtectedRoute>
              }
            />

            <Route
              path="leads/new"
              element={
                <ProtectedRoute requiredRoles={['connector']}>
                  <SubmitLead />
                </ProtectedRoute>
              }
            />

            {/* OPERATOR WORKSPACE */}

            <Route
              path="operator"
              element={
                <ProtectedRoute requiredRoles={['operator']}>
                  <OperatorDashboard />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}