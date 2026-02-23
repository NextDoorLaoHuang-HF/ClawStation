// Gateway Settings Component
// Multi-gateway configuration UI

import { useEffect, useState } from 'react';
import { useGatewayStore } from '../../stores/gatewayStore';
import type { GatewayProfile } from '../../types/gateway';

interface ProfileFormData {
  name: string;
  url: string;
  token: string;
  canvasPort: number;
}

const defaultFormData: ProfileFormData = {
  name: '',
  url: 'ws://127.0.0.1:18789',
  token: '',
  canvasPort: 18793,
};

export function GatewaySettings() {
  const {
    profiles,
    connections,
    activeProfileId,
    isLoading,
    error,
    loadProfiles,
    addProfile,
    updateProfile,
    removeProfile,
    setDefault,
    connect,
    disconnect,
  } = useGatewayStore();
  
  const [formData, setFormData] = useState<ProfileFormData>(defaultFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        const existing = profiles.find(p => p.id === editingId);
        if (existing) {
          await updateProfile({
            ...existing,
            name: formData.name,
            url: formData.url,
            token: formData.token || undefined,
            canvasPort: formData.canvasPort,
          });
        }
      } else {
        await addProfile({
          name: formData.name,
          url: formData.url,
          token: formData.token || undefined,
          canvasPort: formData.canvasPort,
          isDefault: profiles.length === 0,
        });
      }
      
      setFormData(defaultFormData);
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };
  
  const handleEdit = (profile: GatewayProfile) => {
    setFormData({
      name: profile.name,
      url: profile.url,
      token: profile.token || '',
      canvasPort: profile.canvasPort,
    });
    setEditingId(profile.id);
    setShowForm(true);
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this gateway profile?')) {
      await removeProfile(id);
    }
  };
  
  const handleConnect = async (id: string) => {
    try {
      await connect(id);
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };
  
  const handleDisconnect = async (id: string) => {
    try {
      await disconnect(id);
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };
  
  const handleSetDefault = async (id: string) => {
    try {
      await setDefault(id);
    } catch (err) {
      console.error('Failed to set default:', err);
    }
  };
  
  const getConnectionStatus = (id: string) => {
    const conn = connections.get(id);
    return conn?.status || 'disconnected';
  };
  
  const isActive = (id: string) => activeProfileId === id;
  
  return (
    <div className="gateway-settings">
      <div className="settings-header">
        <h2>Gateway Settings</h2>
        <button
          className="btn btn-primary"
          onClick={() => {
            setFormData(defaultFormData);
            setEditingId(null);
            setShowForm(true);
          }}
        >
          Add Gateway
        </button>
      </div>
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      {showForm && (
        <div className="profile-form">
          <h3>{editingId ? 'Edit Gateway' : 'Add New Gateway'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Gateway"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="url">WebSocket URL</label>
              <input
                type="text"
                id="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="ws://127.0.0.1:18789"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="token">Token (optional)</label>
              <input
                type="password"
                id="token"
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                placeholder="Enter gateway token"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="canvasPort">Canvas Port</label>
              <input
                type="number"
                id="canvasPort"
                value={formData.canvasPort}
                onChange={(e) => setFormData({ ...formData, canvasPort: parseInt(e.target.value) || 18793 })}
                placeholder="18793"
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData(defaultFormData);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="gateway-list">
        {profiles.length === 0 ? (
          <div className="empty-state">
            <p>No gateway profiles configured.</p>
            <p>Click "Add Gateway" to get started.</p>
          </div>
        ) : (
          profiles.map((profile) => {
            const status = getConnectionStatus(profile.id);
            const active = isActive(profile.id);
            
            return (
              <div
                key={profile.id}
                className={`gateway-card ${active ? 'active' : ''} ${status}`}
              >
                <div className="gateway-info">
                  <div className="gateway-header">
                    <h3>{profile.name}</h3>
                    {profile.isDefault && (
                      <span className="badge badge-default">Default</span>
                    )}
                  </div>
                  
                  <div className="gateway-details">
                    <div className="detail-row">
                      <span className="label">URL:</span>
                      <span className="value">{profile.url}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Canvas Port:</span>
                      <span className="value">{profile.canvasPort}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Status:</span>
                      <span className={`status status-${status}`}>
                        {status === 'connected' && '● '}
                        {status === 'connecting' && '◯ '}
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="gateway-actions">
                  {status === 'connected' ? (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDisconnect(profile.id)}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleConnect(profile.id)}
                      disabled={status === 'connecting'}
                    >
                      {status === 'connecting' ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                  
                  {!profile.isDefault && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleSetDefault(profile.id)}
                    >
                      Set as Default
                    </button>
                  )}
                  
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEdit(profile)}
                  >
                    Edit
                  </button>
                  
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(profile.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default GatewaySettings;
