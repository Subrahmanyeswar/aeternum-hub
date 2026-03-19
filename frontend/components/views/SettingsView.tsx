import React, { useState, useEffect } from 'react';
import { 
  User, Shield, FileText, HelpCircle, Info, Phone, ChevronRight, 
  ArrowLeft, Bell, PhoneCall, AlertTriangle, CheckCircle, LogOut, Mail, Edit2, Save
} from 'lucide-react';
import { BACKEND_URL } from '@/utils/config';

// PROPS INTERFACE
interface SettingsProps {
  userName: string;
  setUserName: (name: string) => void;
  userPhone: string;
  setUserPhone: (phone: string) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;
}

// =========================================================================
//  STABLE SUB-COMPONENTS (KEPT OUTSIDE TO PREVENT RE-RENDER FOCUS LOSS)
// =========================================================================

const InputField = ({ label, icon: Icon, value, onChange, type = "text" }: any) => (
  <div>
    <label className="text-xs text-[#888] font-bold uppercase ml-1 mb-2 flex items-center gap-1">
      <Icon size={12} /> {label}
    </label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#121212] border border-[#262626] rounded-xl p-4 text-white font-medium focus:border-cyan-400 outline-none transition-colors"
      />
    </div>
  </div>
);

const MenuItem = ({ icon: Icon, label, subLabel, onClick }: any) => (
  <button 
    onClick={onClick}
    className="w-full bg-[#121212] p-4 rounded-xl border border-[#262626] flex items-center gap-4 hover:border-cyan-500/30 hover:bg-[#181818] transition-all group"
  >
    <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center group-hover:bg-[#222]">
      <Icon size={20} className="text-[#888] group-hover:text-white transition-colors" />
    </div>
    <div className="text-left flex-1">
      <h4 className="font-bold text-sm text-white">{label}</h4>
      <p className="text-xs text-[#666]">{subLabel}</p>
    </div>
    <ChevronRight size={18} className="text-[#444] group-hover:text-cyan-400 transition-colors" />
  </button>
);

const HelpItem = ({ title, desc }: any) => (
  <div className="bg-[#121212] p-4 rounded-xl border border-[#262626]">
    <h3 className="font-bold text-white text-sm mb-1">{title}</h3>
    <p className="text-xs text-[#888] leading-relaxed">{desc}</p>
  </div>
);

// --- SUB-PAGES ---

const EditProfilePage = ({ userName, setUserName, userPhone, setUserPhone, userEmail, setUserEmail, goBack }: any) => {
  const [isSaving, setIsSaving] = useState(false);
  const handleSave = () => { setIsSaving(true); setTimeout(() => { setIsSaving(false); goBack(); }, 500); };

  const initials = userName ? userName.split(' ').map((n:any) => n[0]).join('').toUpperCase().substring(0, 2) : '??';

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-3xl font-bold mb-4 relative border-4 border-[#121212] shadow-xl">
          {initials}
          <div className="absolute bottom-0 right-0 bg-[#262626] p-2 rounded-full border border-[#121212]"><Edit2 size={14} /></div>
        </div>
        <p className="text-xs text-[#666]">Profile Picture</p>
      </div>
      <div className="space-y-4">
        <InputField label="Full Name" icon={User} value={userName} onChange={setUserName} />
        <InputField label="Phone Number" icon={Phone} value={userPhone} onChange={setUserPhone} type="tel" />
        <InputField label="Email Address" icon={Mail} value={userEmail} onChange={setUserEmail} type="email" />
      </div>
      <button onClick={handleSave} disabled={isSaving} className="w-full mt-8 py-4 rounded-xl bg-cyan-500 text-black font-bold text-sm hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
        {isSaving ? 'SAVING...' : <><Save size={18} /> SAVE CHANGES</>}
      </button>
    </div>
  );
};

const LogsPage = () => {
  const [logFilter, setLogFilter] = useState<'all' | 'alerts' | 'calls' | 'system'>('all');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/logs`)
      .then(res => res.json())
      .then(data => { setLogs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredLogs = logFilter === 'all' ? logs : logs.filter(l => l.type === logFilter.replace('alerts', 'alert').replace('calls', 'call'));

  return (
    <div className="flex flex-col h-full">
      <div className="flex p-1 bg-[#121212] rounded-xl mb-4 border border-[#262626]">
        {['all', 'alerts', 'calls', 'system'].map((tab) => (
          <button key={tab} onClick={() => setLogFilter(tab as any)} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${logFilter === tab ? 'bg-[#262626] text-white' : 'text-[#666]'}`}>{tab}</button>
        ))}
      </div>
      <div className="space-y-3 overflow-y-auto pb-20 no-scrollbar">
        {loading ? ( <p className="text-center text-xs text-[#444] mt-10">Syncing with system...</p> ) : filteredLogs.length === 0 ? ( <p className="text-center text-xs text-[#444] mt-10">No history found.</p> ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="bg-[#121212] p-4 rounded-xl border border-[#262626] flex gap-4 items-start">
              <div className={`p-2 rounded-full ${log.type === 'alert' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                {log.type === 'alert' ? <AlertTriangle size={16} /> : log.type === 'call' ? <PhoneCall size={16} /> : <CheckCircle size={16} />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start"><h4 className="font-bold text-sm text-white">{log.title}</h4><span className="text-[10px] text-[#666]">{log.time}</span></div>
                <p className="text-xs text-[#888] mt-1">{log.desc}</p><span className="text-[10px] text-[#444] mt-2 block">{log.date}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =========================================================================
//  MAIN COMPONENT
// =========================================================================

export default function SettingsView({ userName, setUserName, userPhone, setUserPhone, userEmail, setUserEmail }: SettingsProps) {
  const [activeSubPage, setActiveSubPage] = useState<string | null>(null);

  const initials = userName ? userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '??';

  return (
    <div className="min-h-screen px-4 pt-6 pb-32 bg-black text-white overflow-hidden relative">
      <div className="flex items-center gap-3 mb-8">
        {activeSubPage && (<button onClick={() => setActiveSubPage(null)} className="p-2 -ml-2 hover:bg-[#222] rounded-full transition-colors"><ArrowLeft size={24} /></button>)}
        <div>
          <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase mb-1">{activeSubPage ? 'SYSTEM' : 'CONFIGURATION'}</h2>
          <h1 className="text-3xl font-bold text-white">
            {activeSubPage === 'logs' ? 'System Logs' : activeSubPage === 'help' ? 'Help Center' : activeSubPage === 'about' ? 'About Us' : activeSubPage === 'editProfile' ? 'Edit Details' : 'Settings'}
          </h1>
        </div>
      </div>

      {!activeSubPage ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
          <button onClick={() => setActiveSubPage('editProfile')} className="w-full bg-[#121212] p-4 rounded-xl border border-[#262626] flex items-center gap-4 mb-6 hover:border-cyan-500/30 transition-all group text-left">
            <div className="w-14 h-14 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-xl font-bold">
              {initials}
            </div>
            <div className="flex-1"><h3 className="font-bold text-lg text-white group-hover:text-cyan-400">{userName}</h3><p className="text-xs text-[#888]">{userPhone}</p></div>
            <div className="bg-[#262626] p-2 rounded-lg group-hover:bg-[#333]"><Edit2 size={18} className="text-[#888] group-hover:text-white" /></div>
          </button>

          <MenuItem icon={FileText} label="System Logs" subLabel="Alerts, Calls, & Events" onClick={() => setActiveSubPage('logs')} />
          <MenuItem icon={HelpCircle} label="Help Center" subLabel="Troubleshooting & Guides" onClick={() => setActiveSubPage('help')} />
          <MenuItem icon={Info} label="About & Contact" subLabel="Company Info & Support" onClick={() => setActiveSubPage('about')} />
          
          <div className="pt-6"><button className="w-full py-4 rounded-xl border border-red-900/30 text-red-500 font-bold text-sm bg-red-900/10 hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"><LogOut size={18} /> LOGOUT</button></div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 h-full overflow-y-auto no-scrollbar pb-20">
          {activeSubPage === 'editProfile' && <EditProfilePage userName={userName} setUserName={setUserName} userPhone={userPhone} setUserPhone={setUserPhone} userEmail={userEmail} setUserEmail={setUserEmail} goBack={() => setActiveSubPage(null)} />}
          {activeSubPage === 'logs' && <LogsPage />}
          {activeSubPage === 'help' && (
             <div className="space-y-4">
                <HelpItem title="System Offline?" desc={`Ensure the tunnel URL in utils/config.ts matches your current Cloudflare URL: ${BACKEND_URL}`} />
                <HelpItem title="No Video Feed?" desc="Check if your camera is connected and the 'ai_worker.py' is running. GPU must have 75-85% utilization." />
                <HelpItem title="Vault is Empty?" desc="Recording only begins when an 'UNKNOWN' person is detected for more than 20 continuous seconds (Stage 3)." />
                <HelpItem title="Not receiving calls?" desc="Verify your Twilio balance and ensure the receiver phone number matches notifications.py configuration." />
                <HelpItem title="Low GPU Usage?" desc="Check SKIP_FRAMES=1 in ai_worker.py. Verify TensorRT export completed. Monitor with 'nvidia-smi -l 1'." />
                <HelpItem title="CUDA Not Available?" desc="Reinstall PyTorch with correct CUDA version. Run: pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118" />
             </div>
          )}
          {activeSubPage === 'about' && (
            <div className="space-y-6 text-center pt-8">
              <div className="w-56 h-56 mx-auto mb-4 relative"><img src="/icons/icon.png" className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(34,211,238,0.25)]" /></div>
              <div><h2 className="text-2xl font-bold text-white">Aeternum Hub GPU</h2><p className="text-xs text-[#666] uppercase tracking-widest mt-1">v2.0.0 • GPU ACCELERATED</p></div>
              <p className="text-sm text-[#888] px-4 leading-relaxed">Aeternum Hub GPU Edition leverages NVIDIA CUDA acceleration for real-time threat detection at 75-85% GPU utilization. Powered by YOLO11m + ArcFace on TensorRT.</p>
              <div className="bg-[#121212] mx-4 p-6 rounded-xl border border-[#262626] text-left">
                <h3 className="text-xs font-bold text-cyan-400 uppercase mb-4">Founder Contact</h3>
                <div className="flex items-center gap-3 mb-4"><Phone size={18} className="text-cyan-400"/><div className="text-sm font-bold text-white">+91 95739 49549</div></div>
                <div className="flex items-center gap-3"><Mail size={18} className="text-cyan-400"/><div className="text-sm font-bold text-white">subrahmanyeswarkolluru@gmail.com</div></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}