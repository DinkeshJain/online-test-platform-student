import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

const ApiDebugger = () => {
  const [apiInfo, setApiInfo] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshApiInfo = async () => {
    setIsRefreshing(true);
    try {
      // Force reconfiguration
      const info = await api.reconfigure();
      setApiInfo(info);
    } catch (error) {
      console.error('Failed to refresh API info:', error);
      setApiInfo(api.getBackendInfo());
    } finally {
      setIsRefreshing(false);
    }
  };

  const testLocalhost = async () => {
    const success = await api.switchToLocalhost();
    if (success) {
      refreshApiInfo();
    }
  };

  const useDeployed = () => {
    api.switchToDeployed();
    refreshApiInfo();
  };

  useEffect(() => {
    refreshApiInfo();
  }, []);

  if (!apiInfo) return null;

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-sm text-blue-800">API Configuration Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs space-y-1">
          <div><strong>Current URL:</strong> {apiInfo.currentUrl}</div>
          <div><strong>Using Localhost:</strong> {apiInfo.isLocal ? '✅ Yes' : '❌ No'}</div>
          <div><strong>Environment:</strong> {apiInfo.environment}</div>
          <div><strong>Local URL:</strong> {apiInfo.localUrl}</div>
          <div><strong>Deployed URL:</strong> {apiInfo.deployedUrl}</div>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={refreshApiInfo}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={testLocalhost}
          >
            Try Localhost
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={useDeployed}
          >
            Use Deployed
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiDebugger;
