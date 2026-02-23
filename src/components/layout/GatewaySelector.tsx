// Gateway Selector Component
// Quick gateway switching in header/layout

import { useGatewayStore } from '../../stores/gatewayStore';

export function GatewaySelector() {
  const {
    profiles,
    connections,
    activeProfileId,
    connect,
    disconnect,
  } = useGatewayStore();
  
  if (profiles.length === 0) {
    return (
      <div className="gateway-selector">
        <span className="no-gateway">No gateways configured</span>
      </div>
    );
  }
  
  const activeConnection = activeProfileId ? connections.get(activeProfileId) : undefined;
  const status = activeConnection?.status || 'disconnected';
  
  const handleToggle = async () => {
    if (status === 'connected') {
      await disconnect();
    } else if (activeProfileId) {
      try {
        await connect(activeProfileId);
      } catch (err) {
        console.error('Failed to connect:', err);
      }
    }
  };
  
  const handleSelect = async (profileId: string) => {
    // Disconnect current if connected
    if (status === 'connected') {
      await disconnect();
    }
    
    // Connect to selected
    try {
      await connect(profileId);
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };
  
  return (
    <div className="gateway-selector">
      <div className="gateway-status">
        <span className={`status-indicator status-${status}`} title={status}>
          {status === 'connected' && '●'}
          {status === 'connecting' && '◯'}
          {status === 'error' && '✕'}
          {status === 'disconnected' && '○'}
        </span>
      </div>
      
      <select
        className="gateway-select"
        value={activeProfileId || ''}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={status === 'connecting'}
      >
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.name} {profile.isDefault ? '(Default)' : ''}
          </option>
        ))}
      </select>
      
      <button
        className={`gateway-toggle btn btn-sm ${status === 'connected' ? 'btn-danger' : 'btn-primary'}`}
        onClick={handleToggle}
        disabled={status === 'connecting'}
      >
        {status === 'connected' ? 'Disconnect' : 
         status === 'connecting' ? '...' : 'Connect'}
      </button>
    </div>
  );
}

export default GatewaySelector;
