import { Link } from 'react-router-dom';
import ConnectorRecruitmentCard from '../../../components/portal/ConnectorRecruitmentCard';

export default function ConnectorRecruitment() {
  return <div className="space-y-6"><Link to="/portal/connector" className="inline-flex items-center text-sm text-gray-400 hover:text-white">← Back to Dashboard</Link><div><h1 className="text-2xl font-bold text-white">Recruitment</h1><p className="mt-2 text-sm text-gray-400">Recruit new Avelixa Connectors using your existing personal AVL referral link.</p></div><ConnectorRecruitmentCard /></div>;
}
