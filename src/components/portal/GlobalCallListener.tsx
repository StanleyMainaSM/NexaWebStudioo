import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import CallOverlayV2, { ActiveCall } from './CallOverlayV2';

type IncomingRow={id:string;caller_id:string;callee_id:string;call_type:'voice'|'video';status:string;direct_conversation_id?:string|null;admin_conversation_id?:string|null};

type ProfileRow={full_name?:string|null;email?:string|null;avatar_url?:string|null};

const nameOf=(p:ProfileRow|undefined)=>p?.full_name?.trim()||p?.email?.trim()||'Avelixa User';

export default function GlobalCallListener(){
 const [call,setCall]=useState<ActiveCall|null>(null);
 const activeId=useRef<string|null>(null);
 useEffect(()=>{
  let alive=true;
  const load=async()=>{
   const {data:userData}=await supabase.auth.getUser();
   const user=userData.user;
   if(!user||!alive)return;
   const open=async(row:IncomingRow)=>{
    if(!alive||row.status!=='ringing'||row.callee_id!==user.id||activeId.current===row.id)return;
    activeId.current=row.id;
    const {data}=await supabase.from('profiles').select('full_name,email,avatar_url').eq('id',row.caller_id).maybeSingle();
    if(!alive)return;
    setCall({id:row.id,callType:row.call_type,callerId:row.caller_id,calleeId:row.callee_id,remoteName:nameOf(data as ProfileRow|undefined),isIncoming:true,directConversationId:row.direct_conversation_id||null,adminConversationId:row.admin_conversation_id||null});
   };
   const scan=async()=>{
    if(!alive)return;
    const {data}=await supabase.from('call_sessions').select('id,caller_id,callee_id,call_type,status,direct_conversation_id,admin_conversation_id').eq('callee_id',user.id).eq('status','ringing').order('created_at',{ascending:false}).limit(1);
    const row=(data||[])[0] as IncomingRow|undefined;
    if(row)await open(row);
   };
   await scan();
   const channel=supabase.channel(`avelixa-global-calls-${user.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'call_sessions',filter:`callee_id=eq.${user.id}`},({new:row}:any)=>{void open(row as IncomingRow)}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'call_sessions',filter:`callee_id=eq.${user.id}`},({new:row}:any)=>{if(row.id===activeId.current&&row.status!=='ringing'){activeId.current=null;setCall(null)}}).subscribe();
   const timer=window.setInterval(()=>void scan(),1000);
   return()=>{window.clearInterval(timer);void supabase.removeChannel(channel)};
  };
  let cleanup:(()=>void)|undefined;
  void load().then(fn=>{cleanup=fn});
  return()=>{alive=false;cleanup?.();activeId.current=null};
 },[]);
 if(!call)return null;
 return <CallOverlayV2 call={call} onClose={()=>{activeId.current=null;setCall(null)}}/>;
}
