import { useAuth } from '../../lib/auth';
import OwnerDashboard from './dashboards/OwnerDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import ClientDashboard from './dashboards/ClientDashboard';
import ConnectorDashboard from './dashboards/ConnectorDashboard';
import DeveloperDashboard from './dashboards/DeveloperDashboard';
import OperatorDashboard from './dashboards/OperatorDashboard';

export default function PortalHome() {
  const { user, roles } = useAuth();

  const renderDashboardContent = () => {
    if (roles.includes('owner')) {
      return <OwnerDashboard />;
    } else if (roles.includes('admin')) {
      return <AdminDashboard />;
    } else if (roles.includes('connector')) {
      return <ConnectorDashboard />;
    } else if (roles.includes('developer')) {
      return <DeveloperDashboard />;
    } else if (roles.includes('operator')) {
      return <OperatorDashboard />;
    } else {
      return <ClientDashboard />;
    }
  };

  return (
    <>
      <div className="mb-10">
        <div className="text-xs font-bold text-accent-500 uppercase tracking-widest mb-2">Overview</div>
        <h1 className="text-3xl font-light tracking-tight text-white">Welcome back, {user?.email?.split('@')[0]}</h1>
      </div>

      {renderDashboardContent()}
    </>
  );
}
