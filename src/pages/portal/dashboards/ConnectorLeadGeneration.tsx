import { Link } from 'react-router-dom';
import ConnectorLeadGenerationToolkit from '../../../components/portal/ConnectorLeadGenerationToolkit';

export default function ConnectorLeadGeneration() {
  return <div className="space-y-6"><Link to="/portal/connector" className="inline-flex items-center text-sm text-gray-400 hover:text-white">← Back to Dashboard</Link><ConnectorLeadGenerationToolkit /></div>;
}
