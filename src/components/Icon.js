import React from 'react';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// lucide 아이콘명 → Feather/MaterialCommunityIcons 매핑
const ICON_MAP = {
  // Navigation
  Home: { lib: 'feather', name: 'home' },
  BarChart3: { lib: 'feather', name: 'bar-chart-2' },
  Image: { lib: 'feather', name: 'image' },
  Bell: { lib: 'feather', name: 'bell' },
  Settings: { lib: 'feather', name: 'settings' },

  // Home
  Camera: { lib: 'feather', name: 'camera' },
  MessageCircle: { lib: 'feather', name: 'message-circle' },
  History: { lib: 'feather', name: 'clock' },
  Heart: { lib: 'feather', name: 'heart' },
  Scan: { lib: 'material', name: 'face-recognition' },
  Users: { lib: 'feather', name: 'users' },
  Activity: { lib: 'feather', name: 'activity' },

  // Report
  Sparkles: { lib: 'ionicons', name: 'sparkles' },
  Calendar: { lib: 'feather', name: 'calendar' },
  Smile: { lib: 'feather', name: 'smile' },
  Eye: { lib: 'feather', name: 'eye' },
  Footprints: { lib: 'material', name: 'walk' },

  // Gallery
  ImagePlus: { lib: 'feather', name: 'plus-circle' },
  RefreshCw: { lib: 'feather', name: 'refresh-cw' },
  Loader: { lib: 'feather', name: 'loader' },

  // Notification
  AlertTriangle: { lib: 'feather', name: 'alert-triangle' },
  Zap: { lib: 'feather', name: 'zap' },
  LayoutGrid: { lib: 'feather', name: 'grid' },
  Share2: { lib: 'feather', name: 'share-2' },
  Phone: { lib: 'feather', name: 'phone' },

  // Settings
  Edit3: { lib: 'feather', name: 'edit-3' },
  ShieldCheck: { lib: 'feather', name: 'shield' },
  ChevronRight: { lib: 'feather', name: 'chevron-right' },
  Tablet: { lib: 'feather', name: 'tablet' },
  Monitor: { lib: 'feather', name: 'monitor' },
  Sun: { lib: 'feather', name: 'sun' },
  Lock: { lib: 'feather', name: 'lock' },
  LogOut: { lib: 'feather', name: 'log-out' },
  Trash2: { lib: 'feather', name: 'trash-2' },
  UserPlus: { lib: 'feather', name: 'user-plus' },

  // Emergency
  X: { lib: 'feather', name: 'x' },

  // Auth
  Mail: { lib: 'feather', name: 'mail' },
  Key: { lib: 'feather', name: 'key' },
  Plus: { lib: 'feather', name: 'plus' },
  ChevronLeft: { lib: 'feather', name: 'chevron-left' },

  // Previously unmapped
  WifiOff: { lib: 'feather', name: 'wifi-off' },
  Clock: { lib: 'feather', name: 'clock' },
  Video: { lib: 'feather', name: 'video' },
  Pill: { lib: 'material', name: 'pill' },
  Frown: { lib: 'feather', name: 'frown' },
  Meh: { lib: 'feather', name: 'meh' },
  TrendingUp: { lib: 'feather', name: 'trending-up' },
  TrendingDown: { lib: 'feather', name: 'trending-down' },
  Minus: { lib: 'feather', name: 'minus' },
};

export default function Icon({ name, size = 24, color = '#000' }) {
  const mapping = ICON_MAP[name];
  if (!mapping) {
    return <Feather name="help-circle" size={size} color={color} />;
  }

  if (mapping.lib === 'material') {
    return <MaterialCommunityIcons name={mapping.name} size={size} color={color} />;
  }
  if (mapping.lib === 'ionicons') {
    return <Ionicons name={mapping.name} size={size} color={color} />;
  }
  return <Feather name={mapping.name} size={size} color={color} />;
}

// 편의용 named exports (기존 코드 호환)
export const createIcon = (iconName) => {
  return function IconComponent({ size = 24, color = '#000' }) {
    return <Icon name={iconName} size={size} color={color} />;
  };
};
