import { useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth';
import { CheckSquare } from 'lucide-react';

export default function OperatorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    tasks: 0,
  });

  useEffect(() => {
    // Similarly we would query tasks if they exist
    setStats({ tasks: 0 });
  }, [user]);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckSquare className="w-5 h-5 text-accent-500" />
            <div className="text-xs font-bold text-ink-500 uppercase tracking-widest">Assigned Tasks</div>
          </div>
          <div className="text-4xl font-light text-white">{stats.tasks}</div>
        </div>
      </div>
    </div>
  );
}
