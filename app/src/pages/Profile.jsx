import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    preferred_name: '',
    dob: '',
    height_cm: '',
    weight_reference_kg: '',
    location: '',
    occupation: '',
    work_schedule: '',
    current_focus: '',
    priorities_short: '',
    priorities_long: '',
    income_monthly: 0
  });

  useEffect(() => {
    getProfile();
  }, [user]);

  async function getProfile() {
    try {
      setLoading(true);
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }
      
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading user data:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(e) {
    e.preventDefault();
    try {
      setSaving(true);
      
      const updates = {
        ...profile,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }
      alert('Profile updated');
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  const handleChange = (e) => {
    setProfile({...profile, [e.target.name]: e.target.value});
  };

  if (loading) return <div>Loading Profile...</div>;

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>Profile</h2>
      <form onSubmit={updateProfile}>
        <div className="form-group">
          <label>Email</label>
          <input className="input" type="text" value={user.email} disabled />
        </div>
        
        <div className="form-group">
          <label>Name</label>
          <input className="input" name="name" type="text" value={profile.name || ''} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Preferred Name</label>
          <input className="input" name="preferred_name" type="text" value={profile.preferred_name || ''} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Monthly Income</label>
          <input className="input" name="income_monthly" type="number" value={profile.income_monthly || 0} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Location</label>
          <input className="input" name="location" type="text" value={profile.location || ''} onChange={handleChange} />
        </div>
        
        <div className="form-group">
          <label>Occupation</label>
          <input className="input" name="occupation" type="text" value={profile.occupation || ''} onChange={handleChange} />
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving ...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
}
