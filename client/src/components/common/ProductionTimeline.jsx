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
  UserCheck,
  Wind,
  CheckCircle,
  Tag
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
    if (lower.includes('neera') || lower.includes('sap') || lower.includes('tap') || lower.includes('harvest')) return Sprout;
    if (lower.includes('filter') || lower.includes('clarif')) return Filter;
    if (lower.includes('boil') || lower.includes('hearth') || lower.includes('evaporat')) return Flame;
    if (lower.includes('concentrat') || lower.includes('strike')) return Flame;
    if (lower.includes('mould') || lower.includes('mold') || lower.includes('shell')) return Box;
    if (lower.includes('dry') || lower.includes('cure') || lower.includes('aerat')) return Wind;
    if (lower.includes('pack') || lower.includes('label')) return Tag;
    if (lower.includes('lab') || lower.includes('assay') || lower.includes('certif') || lower.includes('verif')) return ShieldCheck;
    return Clock;
  };

  return (
    <div className="relative border-l-2 border-forest-200 ml-4 space-y-7 py-2">
      {timeline.map((item, idx) => {
        const Icon = getStepIcon(item.title || item.name, item.step || item.order || idx + 1);
        const isVerified = Boolean(
          item.isVerified ||
          item.stageType === 'independently_verified' ||
          item.stageCategory === 'Independently Verified'
        );

        return (
          <div key={idx} className="relative pl-6 sm:pl-8 group">
            {/* Step Node Icon */}
            <div
              className={`absolute -left-[17px] top-0 flex items-center justify-center w-8 h-8 rounded-xl bg-white border-2 shadow-sm group-hover:scale-110 transition-transform ${
                isVerified
                  ? 'border-gold-500 text-gold-700 bg-gold-50'
                  : 'border-forest-600 text-forest-800'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>

            {/* Content Card */}
            <div
              className={`rounded-2xl p-5 border shadow-warm transition-all ${
                isVerified
                  ? 'bg-gold-50/40 border-gold-300/80 hover:border-gold-400'
                  : 'bg-white border-cream-200/90 hover:border-gold-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cream-100 pb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cream-100 text-forest-900 border border-cream-200">
                    Stage {item.step || item.order || idx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-earth-950">
                    {item.title || item.name}
                  </h4>
                  {/* Distinct Attribution Badge */}
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      isVerified
                        ? 'bg-gold-200/90 text-gold-950 border-gold-300'
                        : 'bg-forest-100 text-forest-800 border-forest-200'
                    }`}
                  >
                    {isVerified ? '★ Independently Verified' : 'Application-Recorded'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-stone-500 font-medium">{item.date}</span>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed pt-1">
                {item.description || item.notes}
              </p>

              {/* Location & Operator details */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500 pt-1.5">
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
                {isVerified && item.verifiedBy && (
                  <span className="inline-flex items-center space-x-1 text-gold-800 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                    <span>Attested: {item.verifiedBy.slice(0, 8)}...</span>
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
                      <span className="font-mono font-bold text-forest-800">{String(val)}</span>
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
