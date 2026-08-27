import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Nav from './components/Nav';
import Footer from './components/Footer';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import SEO from './components/SEO';

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
import Login from './pages/portal/Login';
import Signup from './pages/portal/Signup';
import ResetPassword from './pages/portal/ResetPassword';
import SetPassword from './pages/portal/SetPassword';
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
import ConnectorLeads from './pages/portal/ConnectorLeads';
import ConnectorTerms from './pages/portal/ConnectorTerms';
import CommunicationCenter from './pages/portal/CommunicationCenterV2';
import ReviewsModeration from './pages/portal/ReviewsModeration';
import PortfolioManagement from './pages/portal/PortfolioManagement';
import FinanceDashboard from './pages/portal/FinanceDashboard';
import ConnectorApplications from './pages/portal/ConnectorApplications';
import WebsiteLinks from './pages/portal/WebsiteLinks';

import ServiceCatalogue from './pages/portal/ServiceCatalogue';
import WebsitePackages from './pages/portal/WebsitePackages';
import MaintenancePlans from './pages/portal/MaintenancePlans';
import Hosting from './pages/portal/Hosting';
import RevenueOperations from './pages/portal/RevenueOperations';

import AdminDashboard from './pages/portal/dashboards/AdminDashboard';
import OwnerDashboard from './pages/portal/dashboards/OwnerDashboard';
import OperatorDashboard from './pages/portal/dashboards/OperatorDashboard';
import ConnectorDashboard from './pages/portal/dashboards/ConnectorDashboard';

import Clients from './pages/portal/Client';
import ClientDetails from './pages/portal/ClientDetails';
import AdminProjects from './pages/portal/dashboards/AdminProjects';
import TeamManagement from './pages/portal/TeamManagement';
import TeamPayouts from './pages/portal/TeamPayouts';
import OwnerUserManagement from './pages/portal/OwnerUserManagement';

function PublicLayout({ children }: { children: React.ReactNode }) {
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
        <SEO />
        <Routes>
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/services" element={<PublicLayout><Services /></PublicLayout>} />
          <Route path="/work" element={<PublicLayout><Work /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
          <Route path="/pricing" element={<PublicLayout><Pricing /></PublicLayout>} />
          <Route path="/reviews" element={<PublicLayout><Reviews /></PublicLayout>} />
          <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
          <Route path="/connector-apply" element={<PublicLayout><ConnectorApplication /></PublicLayout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/portal/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/set-password" element={<SetPassword />} />

          <Route path="/portal" element={<ProtectedRoute><PortalLayout /></ProtectedRoute>}>
            <Route index element={<PortalHome />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:projectId" element={<ProjectDetails />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/:invoiceId" element={<InvoiceDetails />} />
            <Route path="documents" element={<Documents />} />
            <Route path="activity" element={<Activity />} />
            <Route path="settings" element={<Settings />} />
            <Route path="messages" element={<CommunicationCenter />} />

            <Route path="connector/terms" element={<ProtectedRoute requiredRoles={['connector']}><ConnectorTerms /></ProtectedRoute>} />
            <Route path="leads/new" element={<ProtectedRoute requiredRoles={['connector']} requiresConnectorTerms><SubmitLead /></ProtectedRoute>} />
            <Route path="connector" element={<ProtectedRoute requiredRoles={['connector']} requiresConnectorTerms><ConnectorDashboard /></ProtectedRoute>} />
            <Route path="connector/leads" element={<ProtectedRoute requiredRoles={['connector']} requiresConnectorTerms><ConnectorLeads /></ProtectedRoute>} />
            <Route path="connector/applications" element={<ProtectedRoute requiredRoles={['owner', 'admin']}><ConnectorApplications /></ProtectedRoute>} />

            <Route path="admin" element={<ProtectedRoute requiredRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="admin/projects" element={<ProtectedRoute requiredRoles={['admin']}><AdminProjects /></ProtectedRoute>} />
            <Route path="admin/team" element={<ProtectedRoute requiredRoles={['admin']}><TeamManagement /></ProtectedRoute>} />
            <Route path="admin/team/payouts" element={<ProtectedRoute requiredRoles={['admin']}><TeamPayouts /></ProtectedRoute>} />

            <Route path="owner" element={<ProtectedRoute requiredRoles={['owner']}><OwnerDashboard /></ProtectedRoute>} />
            <Route path="owner/finance" element={<ProtectedRoute requiredRoles={['owner']}><FinanceDashboard /></ProtectedRoute>} />
            <Route path="owner/users" element={<ProtectedRoute requiredRoles={['owner']}><OwnerUserManagement /></ProtectedRoute>} />

            <Route path="connector-applications" element={<ProtectedRoute requiredRoles={['owner', 'admin']}><ConnectorApplications /></ProtectedRoute>} />
            <Route path="website-links" element={<ProtectedRoute requiredRoles={['owner']}><WebsiteLinks /></ProtectedRoute>} />

            <Route path="clients" element={<ProtectedRoute requiredRoles={['owner', 'admin']}><Clients /></ProtectedRoute>} />
            <Route path="clients/:clientId" element={<ProtectedRoute requiredRoles={['owner', 'admin']}><ClientDetails /></ProtectedRoute>} />
            <Route path="reviews" element={<ProtectedRoute requiredRoles={['owner', 'admin']}><ReviewsModeration /></ProtectedRoute>} />
            <Route path="portfolio" element={<ProtectedRoute requiredRoles={['owner', 'admin']}><PortfolioManagement /></ProtectedRoute>} />
            <Route path="services" element={<ProtectedRoute requiredRoles={['owner', 'admin']}><ServiceCatalogue /></ProtectedRoute>} />
            <Route path="website-packages" element={<ProtectedRoute requiredRoles={['owner', 'admin']}><WebsitePackages /></ProtectedRoute>} />
            <Route path="maintenance" element={<ProtectedRoute requiredRoles={['owner', 'admin']}><MaintenancePlans /></ProtectedRoute>} />
            <Route path="hosting" element={<ProtectedRoute requiredRoles={['owner', 'admin']}><Hosting /></ProtectedRoute>} />
            <Route path="revenue" element={<ProtectedRoute requiredRoles={['owner', 'admin']}><RevenueOperations /></ProtectedRoute>} />
            <Route path="operator" element={<ProtectedRoute requiredRoles={['operator']}><OperatorDashboard /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
