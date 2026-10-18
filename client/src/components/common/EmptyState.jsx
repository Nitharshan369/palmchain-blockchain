import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({
  icon: Icon = PackageOpen,
  title = 'No items found',
  description = 'Try adjusting your search criteria or clear active filters.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`p-10 text-center flex flex-col items-center justify-center space-y-3 bg-white/60 rounded-2xl border border-dashed border-cream-300 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-cream-100 flex items-center justify-center text-earth-700 shadow-xs">
        <Icon className="w-6 h-6 text-earth-600" />
      </div>
      <div className="max-w-sm space-y-1">
        <h4 className="text-sm font-bold text-earth-950">{title}</h4>
        <p className="text-xs text-stone-500 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-forest-800 text-white hover:bg-forest-900 transition-colors shadow-xs"
        >
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
