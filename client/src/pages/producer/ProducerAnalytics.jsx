import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Sprout, 
  Droplets, 
  DollarSign, 
  Award, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export default function ProducerAnalytics() {
  const monthlyYield = [
    { month: 'Nov', sapLiters: 1800, jaggeryKg: 240, brix: 14.1 },
    { month: 'Dec', sapLiters: 2400, jaggeryKg: 325, brix: 14.4 },
    { month: 'Jan', sapLiters: 3100, jaggeryKg: 420, brix: 14.6 },
    { month: 'Feb', sapLiters: 3600, jaggeryKg: 490, brix: 15.0 },
    { month: 'Mar (Current)', sapLiters: 3850, jaggeryKg: 520, brix: 15.2 },
  ];

  const maxSap = 4000;

  const productShare = [
    { name: 'Heritage Solid Karupatti Block', percentage: 52, color: 'bg-forest-700' },
    { name: 'Organic Granulated Palmyrah Sugar', percentage: 28, color: 'bg-gold-500' },
    { name: 'Medicinal Palm Candy (Panakarkandu)', percentage: 12, color: 'bg-amber-600' },
    { name: 'Liquid Neera Syrup / Nectar', percentage: 8, color: 'bg-earth-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-cream-200 pb-5">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-100 text-forest-800 uppercase tracking-wider">
          Grove Performance
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-earth-950 mt-1">
          Yield & Quality Analytics
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          Sap harvest consistency, refractometer brix trends, and direct farmgate margin analysis.
        </p>
      </div>

      {/* Top Benchmark Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-2">
          <span className="text-xs font-semibold text-stone-500">Purity Rating</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-forest-900 font-mono">99.4%</span>
            <span className="text-xs text-emerald-700 font-bold">Passed</span>
          </div>
          <p className="text-[11px] text-stone-400">
            NABL tested: Zero synthetic additives or cane sugar detected.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-2">
          <span className="text-xs font-semibold text-stone-500">Average Sap Brix (Season)</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-blue-900 font-mono">14.8° Bx</span>
            <span className="text-xs text-blue-700 font-bold">Grade A+</span>
          </div>
          <p className="text-[11px] text-stone-400">
            Optimal natural sweetness threshold for traditional curing.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-2">
          <span className="text-xs font-semibold text-stone-500">Artisan Price Realization</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-gold-700 font-mono">+240%</span>
            <span className="text-xs text-forest-800 font-bold">vs. Mandi</span>
          </div>
          <p className="text-[11px] text-stone-400">
            Direct customer sales prevent distress selling to wholesale brokers.
          </p>
        </div>
      </div>

      {/* Monthly Harvest Bar Visualizer */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-200 shadow-warm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cream-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-earth-950">
              Neera Sap Volume (Liters) & Jaggery Output (kg)
            </h3>
            <p className="text-xs text-stone-500">Season-to-date harvest trajectory</p>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <span className="flex items-center space-x-1.5 text-stone-600">
              <span className="w-3 h-3 rounded bg-forest-700 inline-block" />
              <span>Sap Harvested (L)</span>
            </span>
            <span className="flex items-center space-x-1.5 text-stone-600">
              <span className="w-3 h-3 rounded bg-gold-500 inline-block" />
              <span>Jaggery Output (kg)</span>
            </span>
          </div>
        </div>

        {/* Custom CSS/SVG Bar Chart */}
        <div className="space-y-6 pt-2">
          {monthlyYield.map((row, idx) => {
            const sapPercent = Math.round((row.sapLiters / maxSap) * 100);
            const jaggeryPercent = Math.round((row.jaggeryKg / (maxSap / 7)) * 100);

            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-earth-950 w-28">{row.month}</span>
                  <div className="flex items-center space-x-4 font-mono text-[11px] text-stone-600">
                    <span className="text-forest-800 font-semibold">{row.sapLiters} L Sap</span>
                    <span className="text-stone-300">•</span>
                    <span className="text-gold-800 font-semibold">{row.jaggeryKg} kg Jaggery</span>
                    <span className="text-stone-300">•</span>
                    <span className="text-blue-700 font-semibold">{row.brix}° Bx</span>
                  </div>
                </div>

                {/* Bars */}
                <div className="space-y-1">
                  <div className="w-full bg-cream-100 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-forest-700 h-full rounded-full transition-all duration-500"
                      style={{ width: `${sapPercent}%` }}
                    />
                  </div>
                  <div className="w-full bg-cream-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gold-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${jaggeryPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Production Distribution & Purity Benchmark */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Category Mix */}
        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-warm space-y-4">
          <h3 className="text-base font-bold text-earth-950 border-b border-cream-100 pb-3">
            Product Category Revenue Mix
          </h3>

          <div className="space-y-3 pt-1">
            {productShare.map((prod, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-800">{prod.name}</span>
                  <span className="font-mono font-bold text-earth-950">{prod.percentage}%</span>
                </div>
                <div className="w-full bg-cream-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`${prod.color} h-full rounded-full`}
                    style={{ width: `${prod.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Benchmark Guarantee */}
        <div className="bg-forest-950 text-white rounded-3xl p-6 border border-forest-900 space-y-4">
          <div className="flex items-center space-x-2 text-gold-300 border-b border-forest-800 pb-3">
            <ShieldCheck className="w-5 h-5 text-gold-400" />
            <h3 className="font-bold text-base text-white">Cryptographic Quality Guarantee</h3>
          </div>

          <p className="text-xs text-cream-200/90 leading-relaxed">
            By anchoring your batches through PalmChain, all test metrics are permanently committed to Ethereum Sepolia.
          </p>

          <div className="space-y-2 pt-2 text-xs">
            <div className="flex items-center space-x-2 text-cream-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Customer QR scans automatically display certified lab reports.</span>
            </div>
            <div className="flex items-center space-x-2 text-cream-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero cane sugar adulteration guarantee builds trusted direct buyer loyalty.</span>
            </div>
            <div className="flex items-center space-x-2 text-cream-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Traceable tree IDs reinforce heritage geographical indication (GI) value.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
