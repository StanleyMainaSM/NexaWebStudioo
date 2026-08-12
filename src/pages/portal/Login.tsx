import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/portal');
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
      
      <div className="w-full max-w-md glass rounded-3xl p-8 relative z-10">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-lg bg-accent-600 flex items-center justify-center rotate-3 shadow-lg shadow-accent-500/20">
            <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-medium tracking-tight text-white">
            Avelixa
          </span>
        </div>
        
        <h2 className="text-xl font-bold text-white mb-2 text-center">Sign in to your account</h2>
        <p className="text-gray-400 text-sm mb-8 text-center">Enter your details to access the Avelixa portal.</p>
        
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">Email address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
              placeholder="you@company.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2 flex justify-between">
              <span>Password</span>
              <a href="#" className="text-accent-400 hover:text-accent-300">Forgot?</a>
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-100 text-black hover:bg-accent-400 transition-colors uppercase tracking-widest text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
