import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { User, MapPin, Briefcase, DollarSign, Calendar, Target, CheckCircle2, Loader } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [profile, setProfile]   = useState({
    name: '', preferred_name: '', dob: '', height_cm: '',
    weight_reference_kg: '', location: '', occupation: '',
    work_schedule: '', current_focus: '',
    priorities_short: '', priorities_long: '', income_monthly: '',
  });

  useEffect(() => { if (user) getProfile(); }, [user]);

  async function getProfile() {
    try {
      setLoading(true);
      const { data, error, status } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error && status !== 406) throw error;
      if (data) setProfile(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error('Profile load error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const { error } = await supabase.from('profiles').upsert({
        ...profile,
        id: user.id,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  const handleChange = (e) => setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const displayName = profile.preferred_name || profile.name || user?.email?.split('@')[0] || 'You';
  const initial = displayName.charAt(0).toUpperCase();

  if (loading) return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-xl)' }} />
      {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-md)' }} />)}
    </div>
  );

  return (
    <form onSubmit={updateProfile} style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', animation: 'page-enter var(--dur-normal) var(--ease-decel)' }}>

      {/* Avatar hero */}
      <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top, var(--accent-primary-subtle) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, #9180f5 100%)',
            color: '#fff', margin: '0 auto var(--space-4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800,
            boxShadow: '0 0 0 4px var(--bg-surface), 0 0 0 6px var(--accent-primary-muted)',
          }}>
            {initial}
          </div>
          <h2 style={{ margin: '0 0 4px' }}>{displayName}</h2>
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
            {user?.email}
          </p>
        </div>
      </div>

      {/* Identity */}
      <Section icon={User} title="Identity">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <Field label="Full Name" name="name" value={profile.name} onChange={handleChange} placeholder="Your full name" />
          <Field label="Preferred Name" name="preferred_name" value={profile.preferred_name} onChange={handleChange} placeholder="What do you go by?" />
        </div>
        <Field label="Date of Birth" name="dob" type="date" value={profile.dob} onChange={handleChange} />
      </Section>

      {/* Life context */}
      <Section icon={MapPin} title="Life Context">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <Field label="Location" name="location" value={profile.location} onChange={handleChange} placeholder="City, Country" />
          <Field label="Occupation" name="occupation" value={profile.occupation} onChange={handleChange} placeholder="Role / job title" />
        </div>
        <Field label="Work Schedule" name="work_schedule" value={profile.work_schedule} onChange={handleChange} placeholder="e.g. Mon–Fri 9-6, Remote" />
      </Section>

      {/* Health basics */}
      <Section icon={Calendar} title="Health Basics">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <Field label="Height (cm)" name="height_cm" type="number" value={profile.height_cm} onChange={handleChange} placeholder="175" />
          <Field label="Reference Weight (kg)" name="weight_reference_kg" type="number" value={profile.weight_reference_kg} onChange={handleChange} placeholder="70" />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          Used in Health trends. Your actual weight is logged daily in the Check-in.
        </p>
      </Section>

      {/* Finance */}
      <Section icon={DollarSign} title="Finance">
        <Field label="Monthly Income (₹)" name="income_monthly" type="number" value={profile.income_monthly} onChange={handleChange} placeholder="50000" />
        <p style={{ margin: '8px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          Used to calculate savings rate in Finance module.
        </p>
      </Section>

      {/* Focus & priorities */}
      <Section icon={Target} title="Focus & Priorities">
        <Field label="Current Focus" name="current_focus" value={profile.current_focus} onChange={handleChange} placeholder="What's your main priority right now?" />
        <Field label="Short-term Priorities (3–6 months)" name="priorities_short" as="textarea" value={profile.priorities_short} onChange={handleChange} placeholder="What are you working toward in the next few months?" rows={3} />
        <Field label="Long-term Priorities (1–3 years)" name="priorities_long" as="textarea" value={profile.priorities_long} onChange={handleChange} placeholder="Where do you want to be in the next few years?" rows={3} />
      </Section>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 'var(--space-6)' }}>
        <button
          type="submit"
          className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
          disabled={saving}
          style={{ minWidth: 140, gap: 'var(--space-2)' }}
        >
          {saving ? (
            <><Loader size={16} className="spin" /> Saving…</>
          ) : saved ? (
            <><CheckCircle2 size={16} /> Saved!</>
          ) : 'Save Profile'}
        </button>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </form>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--accent-primary-muted)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} strokeWidth={2.5} />
        </div>
        <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 600 }}>{title}</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', as, placeholder, rows = 3 }) {
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      {as === 'textarea' ? (
        <textarea
          className="textarea"
          name={name}
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          style={{ resize: 'vertical', minHeight: `${rows * 24}px` }}
        />
      ) : (
        <input
          className="input"
          type={type}
          name={name}
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
