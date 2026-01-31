import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { dbService } from '../services/db';
import { Visitor, User } from '../types';

interface CheckOutScreenProps {
  user: User;
}

export const CheckOutScreen: React.FC<CheckOutScreenProps> = ({ user }) => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadActive();
  }, []);

  const loadActive = async () => {
    const active = await dbService.getActiveVisitors();
    setVisitors(active);
  };

  const handleCheckOut = async (visitorId: string) => {
    const visitor = visitors.find(v => v.id === visitorId);
    if (visitor && window.confirm(`Confirm check out for ${visitor.name}?`)) {
        const updated = { ...visitor, status: 'CHECKED_OUT' as const, checkOutTime: Date.now() };
        await dbService.updateVisitor(updated);
        loadActive();
    }
  };

  const filtered = visitors.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) || 
    v.passId.includes(search)
  );

  return (
    <div className="p-4">
      <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-md">Check Out</h1>
      
      <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={20} />
          <input 
              type="text"
              placeholder="Search by Name or Pass ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl glass-panel border border-white/10 text-white placeholder:text-white/40 focus:outline-none"
          />
       </div>

      {filtered.length === 0 ? (
          <div className="text-center py-20">
              <p className="text-white/50">No active visitors match your search.</p>
          </div>
      ) : (
        <div className="glass-panel rounded-xl">
          {filtered.map((v, index) => (
            <div key={v.id}>
              <div className="flex items-center p-3">
                  <img src={v.photoBase64} alt={v.name} className="w-12 h-12 rounded-full object-cover border border-white/20" />
                  <div className="ml-4 flex-1">
                      <p className="font-semibold text-white uppercase">{v.name}</p>
                      <p className="text-sm text-white/60">{v.passId}</p>
                  </div>
                  <button onClick={() => handleCheckOut(v.id)} className="bg-[var(--ios-blue)] text-white font-bold text-sm px-4 py-1.5 rounded-full ios-press shadow-lg backdrop-blur-sm">
                      Check Out
                  </button>
              </div>
              {index < filtered.length - 1 && <div className="h-[1px] bg-white/10 ml-20" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};