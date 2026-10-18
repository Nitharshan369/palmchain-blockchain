import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Truck, 
  Package, 
  Sprout, 
  PauseCircle 
} from 'lucide-react';

export default function StatusBadge({ status, className = '' }) {
  const normalized = (status || '').toLowerCase().replace(/[\s-]/g, '_');

  const configs = {
    certified: {
      label: 'Certified Pure',
      icon: ShieldCheck,
      classes: 'bg-forest-100 text-forest-800 border-forest-300',
    },
    anchored: {
      label: 'On-Chain Anchored',
      icon: Layers,
      classes: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    processing: {
      label: 'In Processing',
      icon: Clock,
      classes: 'bg-gold-100 text-gold-900 border-gold-300',
    },
    in_progress: {
      label: 'Assay In Progress',
      icon: Clock,
      classes: 'bg-gold-100 text-gold-900 border-gold-300',
    },
    pending_assay: {
      label: 'Awaiting Lab Assay',
      icon: AlertTriangle,
      classes: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    flagged: {
      label: 'Flagged / Mismatch',
      icon: ShieldAlert,
      classes: 'bg-rose-100 text-rose-800 border-rose-300',
    },
    draft: {
      label: 'Draft Batch',
      icon: Package,
      classes: 'bg-cream-200 text-earth-800 border-cream-300',
    },
    paid: {
      label: 'Payment Verified',
      icon: CheckCircle2,
      classes: 'bg-forest-100 text-forest-800 border-forest-300',
    },
    pending: {
      label: 'Payment Pending',
      icon: Clock,
      classes: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    dispatched: {
      label: 'Dispatched',
      icon: Truck,
      classes: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    delivered: {
      label: 'Delivered',
      icon: CheckCircle2,
      classes: 'bg-forest-100 text-forest-800 border-forest-300',
    },
    thriving: {
      label: 'Thriving',
      icon: Sprout,
      classes: 'bg-forest-100 text-forest-800 border-forest-300',
    },
    healthy: {
      label: 'Healthy',
      icon: CheckCircle2,
      classes: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    resting: {
      label: 'Resting Cycle',
      icon: PauseCircle,
      classes: 'bg-stone-200 text-stone-700 border-stone-300',
    },
    authorized: {
      label: 'Authorized',
      icon: ShieldCheck,
      classes: 'bg-forest-100 text-forest-800 border-forest-300',
    },
  };

  const config = configs[normalized] || {
    label: status || 'Unknown',
    icon: Package,
    classes: 'bg-cream-100 text-earth-800 border-cream-300',
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.classes} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}
