import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle, Eye, EyeOff, Loader2, Link as LinkIcon, Sparkles } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type FormData = { fullName:string; email:string; phone:string; nationalId:string; county:string; town:string; password:string; confirmPassword:string; referringConnector:string };

export default function ConnectorApplication() {
  const [searchParams] = useSearchParams();
  const referralFromLink = searchParams.get('ref')?.trim() || '';
  const capturedReferral = useRef(referralFromLink).current;
  const [form, setForm] = useState<FormData>({fullName:'',email:'',phone:'',nationalId:'',county:'',town:'',password:'',confirmPassword:'',referringConnector:capturedReferral});
  const [showPassword,setShowPassword]=useState(false);
  const [showConfirm,setShowConfirm]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState(false);
  const [emailConfirmationRequired,setEmailConfirmationRequired]=useState(false);

  useEffect(()=>{ if(capturedReferral) setForm(v=>({...v,referringConnector:capturedReferral})); },[capturedReferral]);

  const change=(e:React.ChangeEvent<HTMLInputElement>)=>setForm(v=>({...v,[e.target.name]:e.target.value}));

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setLoading(true); setError('');
    try {
      const email=form.email.trim().toLowerCase();
      const referral=capturedReferral || form.referringConnector.trim() || null;
      if(form.password.length<8) throw new Error('Password must be at least 8 characters.');
      if(form.password!==form.confirmPassword) throw new Error('Passwords do not match.');

      const {data:registered,error:checkError}=await supabase.rpc('check_email_registered',{p_email:email});
      if(checkError) throw checkError;
      if(registered===true) throw new Error('This email address is already registered. Please log in or reset your password instead.');

      if(referral){
        const {data:referralResult,error:referralError}=await supabase.rpc('validate_connector_referral',{p_referral:referral});
        if(referralError) throw referralError;
        if(!referralResult?.valid) throw new Error('The referring Connector ID was not found or is inactive.');
      }

      const {data,error:signUpError}=await supabase.auth.signUp({
        email,password:form.password,
        options:{data:{
          registration_type:'connector', full_name:form.fullName.trim(), phone:form.phone.trim(),
          national_id:form.nationalId.trim(), county:form.county.trim(), town:form.town.trim(),
          referring_connector:referral,
        }},
      });
      if(signUpError) throw signUpError;
      if(!data.user) throw new Error('Avelixa could not create the account. Please try again.');
      setEmailConfirmationRequired(!data.session); setSuccess(true);
    } catch(err:unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create your Connector account.');
    } finally { setLoading(false); }
  };

  if(success) return <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6"><div className="w-full max-w-xl glass rounded-3xl p-8 text-center">
    <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-5"/>
    <h1 className="text-3xl font-semibold text-white">Connector account created</h1>
    <p className="mt-4 text-gray-400">Your Connector role and profile are provisioned automatically. The existing Connector Terms gate remains in place.</p>
    <div className="mt-6 rounded-2xl border border-accent-400/20 bg-accent-400/[0.06] p-5 text-sm text-gray-300">
      {emailConfirmationRequired ? 'Confirm your email address first, then sign in with the password you created.' : 'You can sign in now with the email and password you created.'}
    </div>
    <Link to="/login" className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-100 text-black font-semibold">Go to login <ArrowRight className="w-4 h-4"/></Link>
  </div></div>;

  const fields=[['fullName','Full Name','John Doe','text'],['email','Email Address','you@example.com','email'],['phone','Phone Number','+254 XXX XXX XXX','tel'],['nationalId','National ID','ID Number','text'],['county','County','Nairobi','text'],['town','City/Town','Westlands','text']] as const;

  return <div className="min-h-screen bg-ink-950 py-16 px-6"><div className="max-w-3xl mx-auto glass rounded-3xl p-8 md:p-12">
    <div className="flex justify-center items-center gap-3 mb-8"><div className="w-10 h-10 rounded-lg bg-accent-600 flex items-center justify-center"><Sparkles className="w-5 h-5 text-white"/></div><span className="text-2xl text-white">Avelixa</span></div>
    <div className="text-center mb-10"><div className="text-xs font-semibold uppercase tracking-widest text-accent-400">Avelixa Connector Program</div><h1 className="mt-3 text-4xl font-light text-white">Become a Connector</h1><p className="mt-4 text-gray-400">Create your Connector account directly. No Owner approval or activation invitation is required.</p></div>
    {capturedReferral && <div className="mb-6 rounded-2xl border border-accent-400/20 bg-accent-400/[0.06] p-4 text-sm text-gray-300">Referral captured from your invitation link: <strong className="text-white">{capturedReferral}</strong></div>}
    <form onSubmit={submit} className="space-y-6">
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm"><AlertCircle className="inline w-5 h-5 mr-2"/>{error}</div>}
      <div className="grid md:grid-cols-2 gap-5">{fields.map(([name,label,placeholder,type])=><label key={name}><span className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{label}</span><input required type={type} name={name} value={form[name]} onChange={change} placeholder={placeholder} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60"/></label>)}</div>
      <div className="grid md:grid-cols-2 gap-5">
        <label><span className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Password</span><div className="relative"><input required minLength={8} type={showPassword?'text':'password'} name="password" value={form.password} onChange={change} className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white"/><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-3 text-gray-500">{showPassword?<EyeOff/>:<Eye/>}</button></div></label>
        <label><span className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Confirm Password</span><div className="relative"><input required minLength={8} type={showConfirm?'text':'password'} name="confirmPassword" value={form.confirmPassword} onChange={change} className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white"/><button type="button" onClick={()=>setShowConfirm(v=>!v)} className="absolute right-3 top-3 text-gray-500">{showConfirm?<EyeOff/>:<Eye/>}</button></div></label>
      </div>
      <label><span className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Referral ID — Optional</span><div className="relative"><LinkIcon className="absolute left-4 top-3.5 w-4 h-4 text-gray-500"/><input name="referringConnector" value={form.referringConnector} onChange={change} readOnly={Boolean(capturedReferral)} placeholder="AVL-XXXX" className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"/></div><span className="block mt-2 text-xs text-gray-500">Leave blank if nobody referred you.</span></label>
      <button disabled={loading} className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-zinc-100 text-black font-bold disabled:opacity-50">{loading?<Loader2 className="animate-spin"/>:'Become a Connector'}{!loading&&<ArrowRight/>}</button>
      <p className="text-center text-sm text-gray-500">Already have an account? <Link to="/login" className="text-accent-400">Log in</Link></p>
    </form>
  </div></div>;
}
