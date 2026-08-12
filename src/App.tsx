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

// Portal
import { AuthProvider } from './lib/auth';
import ProtectedRoute from './components/portal/ProtectedRoute';
import Login from './pages/portal/Login';
import PortalLayout from './pages/portal/PortalLayout';
import PortalHome from './pages/portal/PortalHome';
import Projects from './pages/portal/Projects';
import ProjectDetails from './pages/portal/ProjectDetails';
import Invoices from './pages/portal/Invoices';
import InvoiceDetails from './pages/portal/InvoiceDetails';
import Documents from './pages/portal/Documents';
import Activity from './pages/portal/Activity';
import Settings from './pages/portal/Settings';
import SubmitLead from './pages/portal/SubmitLead';

// Client Management
import Clients from './pages/portal/Client';
import ClientDetails from './pages/portal/ClientDetails';


function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-ink-950 overflow-x-hidden">
      <Nav />

      <main>
        {children}
      </main>

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

          {/* =========================
              PUBLIC WEBSITE
          ========================== */}

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


          {/* =========================
              PORTAL AUTHENTICATION
          ========================== */}

          <Route
            path="/login"
            element={<Login />}
          />


          {/* =========================
              PROTECTED PORTAL
          ========================== */}

          <Route
            path="/portal"
            element={
              <ProtectedRoute>
                <PortalLayout />
              </ProtectedRoute>
            }
          >

            {/* Portal Dashboard */}
            <Route
              index
              element={<PortalHome />}
            />


            {/* Projects */}
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
              path="settings"
              element={<Settings />}
            />

            {/* Submit Lead */}
            <Route
              path="leads/new"
              element={<SubmitLead />}
            />


            {/* =========================
                CLIENT MANAGEMENT
            ========================== */}

            <Route
              path="clients"
              element={
                <ProtectedRoute requiredRoles={['owner', 'admin']}>
                  <Clients />
                </ProtectedRoute>
              }
            />

            <Route
              path="clients/:clientId"
              element={
                <ProtectedRoute requiredRoles={['owner', 'admin']}>
                  <ClientDetails />
                </ProtectedRoute>
              }
            />

          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

