import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Wifi, Clock, TrendingUp, TrendingDown, BarChart3, RefreshCw, Download, Zap, Users, Database } from 'lucide-react';
import { realTimeDataManager, SystemMetrics } from '../utils/realtimeData';

interface StatCard {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  description?: string;
}

const SystemStatistics: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [historicalData, setHistoricalData] = useState<SystemMetrics[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h'>('1h');

  useEffect(() => {
    // Subscribe to system metrics updates
    const handleSystemMetrics = (newMetrics: SystemMetrics) => {
      setMetrics(newMetrics);
      setLastUpdated(new Date());
      
      // Add to historical data (keep last 100 entries)
      setHistoricalData(prev => {
        const updated = [...prev, newMetrics];
        return updated.slice(-100);
      });
    };

    realTimeDataManager.on('systemMetrics', handleSystemMetrics);
    
    // Load initial metrics
    const initialMetrics = realTimeDataManager.getSystemMetrics();
    if (initialMetrics) {
      setMetrics(initialMetrics);
      setHistoricalData([initialMetrics]);
    }

    return () => {
      realTimeDataManager.off('systemMetrics', handleSystemMetrics);
    };
  }, []);

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      const currentMetrics = realTimeDataManager.getSystemMetrics();
      if (currentMetrics) {
        setMetrics(currentMetrics);
        setLastUpdated(new Date());
      }
      setIsRefreshing(false);
    }, 1000);
  };

  const calculateTrend = (current: number, previous: number): { trend: 'up' | 'down' | 'stable', value: number } => {
    const diff = current - previous;
    const percentage = previous > 0 ? (diff / previous) * 100 : 0;
    
    if (Math.abs(percentage) < 1) {
      return { trend: 'stable', value: 0 };
    }
    
    return {
      trend: percentage > 0 ? 'up' : 'down',
      value: Math.abs(percentage)
    };
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3" />;
      case 'down':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <BarChart3 className="w-3 h-3" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isGoodWhenUp: boolean = false) => {
    if (trend === 'stable') return 'text-gray-400';
    
    if (isGoodWhenUp) {
      return trend === 'up' ? 'text-green-400' : 'text-red-400';
    } else {
      return trend === 'up' ? 'text-red-400' : 'text-green-400';
    }
  };

  const formatUptime = (uptimeMs: number) => {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m ${seconds % 60}s`;
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (percentage >= 70) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-green-400 bg-green-500/10 border-green-500/20';
  };

  const getUsageBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const exportMetrics = () => {
    const dataStr = JSON.stringify({
      current: metrics,
      historical: historicalData,
      exportedAt: new Date().toISOString()
    }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system-metrics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!metrics) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
              <p className="text-gray-400">Loading system metrics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate trends if we have historical data
  const previousMetrics = historicalData.length > 1 ? historicalData[historicalData.length - 2] : null;
  const cpuTrend = previousMetrics ? calculateTrend(metrics.cpuUsage, previousMetrics.cpuUsage) : null;
  const memoryTrend = previousMetrics ? calculateTrend(metrics.memoryUsage, previousMetrics.memoryUsage) : null;
  const networkTrend = previousMetrics ? calculateTrend(metrics.networkActivity, previousMetrics.networkActivity) : null;

  const statCards: StatCard[] = [
    {
      title: 'CPU Usage',
      value: metrics.cpuUsage.toFixed(1),
      unit: '%',
      icon: <Cpu className="w-6 h-6" />,
      color: getUsageColor(metrics.cpuUsage),
      trend: cpuTrend?.trend,
      trendValue: cpuTrend?.value,
      description: 'Current processor utilization'
    },
    {
      title: 'Memory Usage',
      value: metrics.memoryUsage.toFixed(1),
      unit: '%',
      icon: <HardDrive className="w-6 h-6" />,
      color: getUsageColor(metrics.memoryUsage),
      trend: memoryTrend?.trend,
      trendValue: memoryTrend?.value,
      description: 'RAM utilization percentage'
    },
    {
      title: 'Network Activity',
      value: formatBytes(metrics.networkActivity),
      unit: '/s',
      icon: <Wifi className="w-6 h-6" />,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      trend: networkTrend?.trend,
      trendValue: networkTrend?.value,
      description: 'Current network throughput'
    },
    {
      title: 'Active Connections',
      value: metrics.activeConnections,
      unit: '',
      icon: <Users className="w-6 h-6" />,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      description: 'Number of active connections'
    },
    {
      title: 'System Uptime',
      value: formatUptime(metrics.uptime),
      unit: '',
      icon: <Clock className="w-6 h-6" />,
      color: 'text-green-400 bg-green-500/10 border-green-500/20',
      description: 'Time since last system restart'
    },
    {
      title: 'Performance Score',
      value: Math.max(0, 100 - (metrics.cpuUsage + metrics.memoryUsage) / 2).toFixed(0),
      unit: '/100',
      icon: <Zap className="w-6 h-6" />,
      color: getUsageColor(100 - Math.max(0, 100 - (metrics.cpuUsage + metrics.memoryUsage) / 2)),
      description: 'Overall system performance'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <Activity className="w-6 h-6 mr-3" />
              System Statistics
              <span className="ml-3 flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                <span className="text-green-400 text-sm">LIVE</span>
              </span>
            </h1>
            <p className="text-gray-400 mt-1">
              Real-time system performance metrics • Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as '1h' | '6h' | '24h')}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
            </select>
            <button
              onClick={exportMetrics}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={refreshMetrics}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className={`bg-black/20 backdrop-blur-lg rounded-2xl border p-6 ${card.color}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {card.icon}
                <h3 className="font-semibold text-white">{card.title}</h3>
              </div>
              {card.trend && card.trendValue !== undefined && (
                <div className={`flex items-center space-x-1 text-xs ${getTrendColor(card.trend, card.title === 'Network Activity')}`}>
                  {getTrendIcon(card.trend)}
                  <span>{card.trendValue.toFixed(1)}%</span>
                </div>
              )}
            </div>
            
            <div className="mb-2">
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-bold text-white">{card.value}</span>
                {card.unit && <span className="text-lg text-gray-400">{card.unit}</span>}
              </div>
            </div>
            
            {card.description && (
              <p className="text-sm text-gray-400">{card.description}</p>
            )}
            
            {/* Usage bar for percentage values */}
            {card.unit === '%' && typeof card.value === 'string' && (
              <div className="mt-3">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getUsageBarColor(parseFloat(card.value))}`}
                    style={{ width: `${Math.min(100, parseFloat(card.value))}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health Overview */}
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2" />
            System Health Overview
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-300">CPU Temperature</span>
              <span className="text-white">Normal (65°C)</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-300">Disk I/O</span>
              <span className="text-white">{formatBytes(metrics.networkActivity * 0.3)}/s</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-300">Load Average</span>
              <span className="text-white">{(metrics.cpuUsage / 100 * 4).toFixed(2)}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-300">Available Memory</span>
              <span className="text-white">{formatBytes((100 - metrics.memoryUsage) * 1024 * 1024 * 100)}</span>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Performance Insights
          </h2>
          
          <div className="space-y-4">
            {metrics.cpuUsage > 80 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center space-x-2 text-red-400 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">High CPU Usage</span>
                </div>
                <p className="text-sm text-gray-300">CPU usage is above 80%. Consider closing unnecessary applications.</p>
              </div>
            )}
            
            {metrics.memoryUsage > 85 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center space-x-2 text-yellow-400 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">High Memory Usage</span>
                </div>
                <p className="text-sm text-gray-300">Memory usage is above 85%. Consider restarting memory-intensive applications.</p>
              </div>
            )}
            
            {metrics.cpuUsage < 30 && metrics.memoryUsage < 50 && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center space-x-2 text-green-400 mb-1">
                  <TrendingDown className="w-4 h-4" />
                  <span className="font-medium">Optimal Performance</span>
                </div>
                <p className="text-sm text-gray-300">System is running efficiently with low resource usage.</p>
              </div>
            )}
            
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-400 mb-1">
                <Activity className="w-4 h-4" />
                <span className="font-medium">System Status</span>
              </div>
              <p className="text-sm text-gray-300">
                Uptime: {formatUptime(metrics.uptime)} • 
                Connections: {metrics.activeConnections} • 
                Last update: {metrics.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatistics;