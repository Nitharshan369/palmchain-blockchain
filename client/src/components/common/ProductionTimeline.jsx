import React from 'react';
import { 
  Sprout, 
  Filter, 
  Flame, 
  Box, 
  ShieldCheck, 
  Layers, 
  Clock, 
  MapPin, 
  UserCheck 
} from 'lucide-react';

export default function ProductionTimeline({ timeline = [] }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-6 text-stone-500 text-xs">
        No lifecycle events recorded for this batch yet.
      </div>
    );
  }

  const getStepIcon = (title = '', step = 1) => {
    const lower = title.toLowerCase();
    if (lower.includes('tap') || lower.includes('sap') || lower.includes('harvest')) return Sprout;
    if (lower.includes('filter') || lower.includes('clarif')) return Filter;
    if (lower.includes('boil') || lower.includes('evaporat') || lower.includes('pan')) return Flame;
    if (lower.includes('mold') || lower.includes('cur') || lower.includes('siev') || lower.includes('pack')) return Box;
    if (lower.includes('lab') || lower.includes('assay') || lower.includes('certif')) return ShieldCheck;
    if (lower.includes('hash') || lower.includes('anchor') || lower.includes('blockchain') || lower.includes('sepolia')) return Layers;
    return Clock;
  };

  return (
    <div className="relative border-l-2 border-forest-200 ml-4 space-y-8 py-2">
      {timeline.map((item, idx) => {
        const Icon = getStepIcon(item.title, item.step || idx + 1);
        const isLast = idx === timeline.length - 1;

        return (
          <div key={idx} className="relative pl-6 sm:pl-8 group">
            {/* Step Node Icon */}
            <div className="absolute -left-[17px] top-0 flex items-center justify-center w-8 h-8 rounded-xl bg-white border-2 border-forest-600 text-forest-800 shadow-sm group-hover:scale-110 transition-transform">
              <Icon className="w-4 h-4 text-forest-700" />
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-2xl p-5 border border-cream-200/90 shadow-warm hover:border-gold-300 transition-colors space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-cream-100 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cream-100 text-forest-900 border border-cream-200">
                    Step {item.step || idx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-earth-950">{item.title}</h4>
                </div>
                <span className="text-[11px] font-mono text-stone-500 font-medium">{item.date}</span>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                {item.description}
              </p>

              {/* Location & Operator details */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500 pt-1">
                {item.location && (
                  <span className="inline-flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                    <span>{item.location}</span>
                  </span>
                )}
                {item.operator && (
                  <span className="inline-flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                    <span>{item.operator}</span>
                  </span>
                )}
              </div>

              {/* Parameter badges if provided */}
              {item.parameters && Object.keys(item.parameters).length > 0 && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {Object.entries(item.parameters).map(([key, val]) => (
                    <span
                      key={key}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cream-50 border border-cream-200 text-[11px] text-earth-800"
                    >
                      <span className="font-semibold text-stone-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="font-mono font-bold text-forest-800">{val}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
