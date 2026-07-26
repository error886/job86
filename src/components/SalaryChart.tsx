/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
  CartesianGrid,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  MapPin, 
  Briefcase, 
  Award, 
  Info, 
  DollarSign, 
  BarChart3, 
  PieChart as PieIcon,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Job, JobCategory } from '../types';

interface SalaryChartProps {
  jobs: Job[];
  onSelectCategory?: (category: string) => void;
  onSelectCity?: (city: string) => void;
  currentCityFilter?: string;
  currentCategoryFilter?: string;
}

const CATEGORY_NAMES: Record<JobCategory, string> = {
  Restaurant: 'Nhà hàng',
  Cafe: 'Cà phê',
  Factory: 'Nhà xưởng',
  Warehouse: 'Kho bãi',
  'Convenience Store': 'CH Tiện lợi',
  Office: 'Văn phòng',
  Other: 'Khác'
};

const CATEGORY_COLORS: Record<string, string> = {
  Restaurant: '#EF4444',     // Red
  Cafe: '#F59E0B',           // Amber
  Factory: '#10B981',        // Emerald
  Warehouse: '#3B82F6',      // Blue
  'Convenience Store': '#8B5CF6', // Purple
  Office: '#EC4899',         // Pink
  Other: '#64748B'           // Slate
};

const CITY_COLORS: Record<string, string> = {
  Seoul: '#2563EB',     // Blue
  Daejeon: '#059669',   // Emerald
  Busan: '#D97706',     // Amber
  Incheon: '#7C3AED',   // Purple
  Gyeonggi: '#DC2626',  // Red
  Gwangju: '#0284C7',   // Sky
  Daegu: '#DB2777'      // Pink
};

// Standard Minimum Hourly Wage in S. Korea (2025/2026 reference)
const KOREA_MIN_HOURLY_WAGE = 10030;
// Approx Exchange Rate: 1 KRW ~ 18.8 VND
const KRW_TO_VND_RATE = 18.8;

export default function SalaryChart({
  jobs,
  onSelectCategory,
  onSelectCity,
  currentCityFilter = 'All',
  currentCategoryFilter = 'All'
}: SalaryChartProps) {
  const [viewMode, setViewMode] = useState<'category' | 'city' | 'distribution'>('category');
  const [salaryType, setSalaryType] = useState<'Hourly' | 'Monthly'>('Hourly');
  const [chartCityScope, setChartCityScope] = useState<string>(currentCityFilter);

  // Filter jobs by selected salary type and city scope
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchType = j.salaryType === salaryType;
      const matchCity = chartCityScope === 'All' || j.city.toLowerCase() === chartCityScope.toLowerCase();
      return matchType && matchCity;
    });
  }, [jobs, salaryType, chartCityScope]);

  // 1. Calculate Average Salary by Category
  const categoryData = useMemo(() => {
    const map: Record<string, { total: number; count: number; category: string }> = {};

    filteredJobs.forEach(job => {
      const cat = job.category || 'Other';
      if (!map[cat]) {
        map[cat] = { total: 0, count: 0, category: cat };
      }
      map[cat].total += job.salary;
      map[cat].count += 1;
    });

    const result = Object.keys(CATEGORY_NAMES).map(catKey => {
      const item = map[catKey];
      const avg = item && item.count > 0 ? Math.round(item.total / item.count) : 0;
      return {
        key: catKey,
        name: CATEGORY_NAMES[catKey as JobCategory] || catKey,
        avgSalary: avg,
        count: item ? item.count : 0,
        color: CATEGORY_COLORS[catKey] || '#64748B'
      };
    }).filter(d => d.count > 0 || filteredJobs.length === 0);

    return result.sort((a, b) => b.avgSalary - a.avgSalary);
  }, [filteredJobs]);

  // 2. Calculate Average Salary by City / Region
  const cityData = useMemo(() => {
    const map: Record<string, { total: number; count: number; city: string }> = {};

    const targetJobs = jobs.filter(j => j.salaryType === salaryType);

    targetJobs.forEach(job => {
      const city = job.city || 'Khác';
      if (!map[city]) {
        map[city] = { total: 0, count: 0, city };
      }
      map[city].total += job.salary;
      map[city].count += 1;
    });

    return Object.keys(map).map(cityName => {
      const item = map[cityName];
      const avg = item.count > 0 ? Math.round(item.total / item.count) : 0;
      return {
        name: cityName,
        avgSalary: avg,
        count: item.count,
        color: CITY_COLORS[cityName] || '#3B82F6'
      };
    }).sort((a, b) => b.avgSalary - a.avgSalary);
  }, [jobs, salaryType]);

  // 3. Salary Distribution Ranges for Pie Chart
  const distributionData = useMemo(() => {
    if (salaryType === 'Hourly') {
      let under10k = 0;
      let range10to12k = 0;
      let range12to15k = 0;
      let over15k = 0;

      filteredJobs.forEach(j => {
        if (j.salary < 10000) under10k++;
        else if (j.salary <= 12000) range10to12k++;
        else if (j.salary <= 15000) range12to15k++;
        else over15k++;
      });

      return [
        { name: '< 10.000 KRW', value: under10k, color: '#94A3B8' },
        { name: '10.000 - 12.000 KRW', value: range10to12k, color: '#3B82F6' },
        { name: '12.000 - 15.000 KRW', value: range12to15k, color: '#10B981' },
        { name: '> 15.000 KRW', value: over15k, color: '#8B5CF6' }
      ].filter(d => d.value > 0);
    } else {
      let under2m = 0;
      let range2to2_5m = 0;
      let range2_5to3m = 0;
      let over3m = 0;

      filteredJobs.forEach(j => {
        if (j.salary < 2000000) under2m++;
        else if (j.salary <= 2500000) range2to2_5m++;
        else if (j.salary <= 3000000) range2_5to3m++;
        else over3m++;
      });

      return [
        { name: '< 2.0Tr KRW', value: under2m, color: '#94A3B8' },
        { name: '2.0 - 2.5Tr KRW', value: range2to2_5m, color: '#3B82F6' },
        { name: '2.5 - 3.0Tr KRW', value: range2_5to3m, color: '#10B981' },
        { name: '> 3.0Tr KRW', value: over3m, color: '#8B5CF6' }
      ].filter(d => d.value > 0);
    }
  }, [filteredJobs, salaryType]);

  // Overall Statistics
  const overallAvg = useMemo(() => {
    if (filteredJobs.length === 0) return 0;
    const sum = filteredJobs.reduce((acc, j) => acc + j.salary, 0);
    return Math.round(sum / filteredJobs.length);
  }, [filteredJobs]);

  const topCategory = useMemo(() => {
    if (categoryData.length === 0) return null;
    return categoryData[0];
  }, [categoryData]);

  const topCity = useMemo(() => {
    if (cityData.length === 0) return null;
    return cityData[0];
  }, [cityData]);

  // Format Helper
  const formatSalaryText = (val: number) => {
    if (!val) return '0';
    return val.toLocaleString('vi-VN');
  };

  const formatVndText = (krwVal: number) => {
    const vnd = Math.round(krwVal * KRW_TO_VND_RATE);
    if (vnd >= 1000000) {
      return `~ ${(vnd / 1000000).toFixed(1)} triệu VNĐ`;
    }
    return `~ ${vnd.toLocaleString('vi-VN')} VNĐ`;
  };

  // Custom Tooltip Component for Bar Chart
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700/80 text-xs backdrop-blur-md">
          <p className="font-extrabold text-blue-300 text-sm flex items-center justify-between gap-3">
            <span>{data.name}</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
              {data.count} tin tuyển
            </span>
          </p>
          <div className="mt-2 space-y-1">
            <p className="flex justify-between items-center gap-4 text-slate-200">
              <span className="text-slate-400">Lương TB:</span>
              <span className="font-bold text-amber-300">
                {formatSalaryText(data.avgSalary)} KRW/{salaryType === 'Hourly' ? 'giờ' : 'tháng'}
              </span>
            </p>
            <p className="text-[10.5px] text-emerald-400 font-medium text-right">
              {formatVndText(data.avgSalary)}
            </p>
            {salaryType === 'Hourly' && data.avgSalary > 0 && (
              <p className="text-[9.5px] text-slate-400 pt-1 border-t border-slate-800">
                {data.avgSalary >= KOREA_MIN_HOURLY_WAGE ? (
                  <span className="text-emerald-400 font-semibold">
                    ▲ +{(((data.avgSalary - KOREA_MIN_HOURLY_WAGE) / KOREA_MIN_HOURLY_WAGE) * 100).toFixed(1)}% so với lương tối thiểu (10.030₩)
                  </span>
                ) : (
                  <span className="text-rose-400 font-semibold">
                    ▼ Dưới lương tối thiểu Hàn Quốc (10.030₩)
                  </span>
                )}
              </p>
            )}
          </div>
          <p className="text-[9px] text-slate-400 mt-2 italic text-center">
            💡 Nhấp để lọc danh sách theo {data.name}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-4 text-slate-800 animate-in fade-in duration-200">
      
      {/* Header & Mode Selectors */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200/50">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                Phân bổ Mức Lương
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                So sánh thu nhập theo ngành & khu vực
              </p>
            </div>
          </div>

          {/* Hourly vs Monthly Toggle */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-[10px] font-bold border border-slate-200/60">
            <button
              onClick={() => setSalaryType('Hourly')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                salaryType === 'Hourly'
                  ? 'bg-white text-blue-600 shadow-xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Theo giờ (시급)
            </button>
            <button
              onClick={() => setSalaryType('Monthly')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                salaryType === 'Monthly'
                  ? 'bg-white text-blue-600 shadow-xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Theo tháng (월급)
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Ngành nghề | Khu vực | Tỷ lệ) */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/70 text-[11px] font-bold">
          <button
            onClick={() => setViewMode('category')}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'category'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80 font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-blue-500" />
            <span>Ngành nghề</span>
          </button>
          <button
            onClick={() => setViewMode('city')}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'city'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80 font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
            <span>Khu vực</span>
          </button>
          <button
            onClick={() => setViewMode('distribution')}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'distribution'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80 font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5 text-purple-500" />
            <span>Tỷ lệ</span>
          </button>
        </div>

        {/* City scope selector when viewing category mode */}
        {viewMode === 'category' && (
          <div className="flex items-center justify-between gap-2 text-[10px] bg-blue-50/50 p-2 rounded-xl border border-blue-100">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Filter className="w-3 h-3 text-blue-600" />
              Lọc khu vực tính toán:
            </span>
            <select
              value={chartCityScope}
              onChange={(e) => setChartCityScope(e.target.value)}
              className="bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-800 px-2 py-0.5 outline-none cursor-pointer"
            >
              <option value="All">Toàn Hàn Quốc</option>
              <option value="Seoul">Seoul</option>
              <option value="Daejeon">Daejeon</option>
              <option value="Busan">Busan</option>
              <option value="Incheon">Incheon</option>
              <option value="Gyeonggi">Gyeonggi</option>
            </select>
          </div>
        )}
      </div>

      {/* Highlights Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
            Lương Trung Bình
          </span>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-xs font-black text-blue-600">
              {formatSalaryText(overallAvg)}
            </span>
            <span className="text-[10px] font-semibold text-slate-500">
              ₩/{salaryType === 'Hourly' ? 'h' : 'tháng'}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
            {formatVndText(overallAvg)}
          </span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
            {viewMode === 'city' ? 'Khu vực Cao Nhất' : 'Ngành Lương Cao Nhất'}
          </span>
          <div className="mt-0.5 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-xs font-black text-slate-800 truncate">
              {viewMode === 'city'
                ? (topCity ? `${topCity.name}` : 'N/A')
                : (topCategory ? `${topCategory.name}` : 'N/A')}
            </span>
          </div>
          <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">
            {viewMode === 'city'
              ? (topCity ? `${formatSalaryText(topCity.avgSalary)}₩` : '')
              : (topCategory ? `${formatSalaryText(topCategory.avgSalary)}₩` : '')}
          </span>
        </div>
      </div>

      {/* CHART CANVAS AREA */}
      <div className="pt-2">
        {filteredJobs.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
            <Info className="w-5 h-5 text-slate-400" />
            <p className="text-xs font-bold text-slate-600">Chưa có dữ liệu việc làm phù hợp</p>
            <p className="text-[10px] text-slate-400">Thử đổi bộ lọc hình thức trả lương hoặc khu vực</p>
          </div>
        ) : (
          <>
            {/* VIEW MODE 1: BAR CHART BY CATEGORY */}
            {viewMode === 'category' && (
              <div className="space-y-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryData}
                      layout="vertical"
                      margin={{ top: 5, right: 15, left: 25, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 9, fill: '#64748B' }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        domain={[0, 'dataMax + 2000']}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#334155' }}
                        width={75}
                      />
                      <Tooltip content={<CustomBarTooltip />} />
                      
                      {/* Standard Minimum Wage Reference Line in Korea */}
                      {salaryType === 'Hourly' && (
                        <ReferenceLine
                          x={KOREA_MIN_HOURLY_WAGE}
                          stroke="#EF4444"
                          strokeDasharray="4 4"
                          label={{
                            value: 'Tối thiểu 10.030₩',
                            fill: '#EF4444',
                            fontSize: 9,
                            fontWeight: 800,
                            position: 'insideTopRight'
                          }}
                        />
                      )}

                      <Bar
                        dataKey="avgSalary"
                        radius={[0, 6, 6, 0]}
                        barSize={16}
                        onClick={(entry) => {
                          if (entry && entry.key && onSelectCategory) {
                            onSelectCategory(entry.key);
                          }
                        }}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-medium px-1">
                  <span className="flex items-center gap-1 text-rose-500 font-semibold">
                    <span className="w-2 h-0.5 bg-rose-500 border border-rose-500 inline-block" />
                    Vạch đỏ: Lương tối thiểu (10.030₩/h)
                  </span>
                  <span>Nhấp vào cột để lọc việc</span>
                </div>
              </div>
            )}

            {/* VIEW MODE 2: BAR CHART BY CITY / REGION */}
            {viewMode === 'city' && (
              <div className="space-y-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={cityData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#334155' }}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: '#64748B' }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        domain={[0, 'dataMax + 2000']}
                      />
                      <Tooltip content={<CustomBarTooltip />} />

                      {salaryType === 'Hourly' && (
                        <ReferenceLine
                          y={KOREA_MIN_HOURLY_WAGE}
                          stroke="#EF4444"
                          strokeDasharray="4 4"
                          label={{
                            value: '10.030₩',
                            fill: '#EF4444',
                            fontSize: 9,
                            fontWeight: 800,
                            position: 'top'
                          }}
                        />
                      )}

                      <Bar
                        dataKey="avgSalary"
                        radius={[6, 6, 0, 0]}
                        barSize={22}
                        onClick={(entry) => {
                          if (entry && entry.name && onSelectCity) {
                            onSelectCity(entry.name);
                          }
                        }}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        {cityData.map((entry, index) => (
                          <Cell key={`cell-city-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-[9.5px] text-slate-400 text-center font-medium">
                  So sánh mức lương trung bình thực tế giữa các thành phố lớn tại Hàn Quốc
                </p>
              </div>
            )}

            {/* VIEW MODE 3: PIE CHART DISTRIBUTION */}
            {viewMode === 'distribution' && (
              <div className="space-y-2">
                <div className="h-52 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`pie-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name: any) => [
                          `${val} tin tuyển`,
                          `Khoảng lương: ${name}`
                        ]}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '12px',
                          color: '#FFF',
                          fontSize: '11px',
                          border: '1px solid #334155'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend list */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {distributionData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium bg-slate-50 p-1.5 rounded-lg border border-slate-200/50">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="truncate">{d.name}:</span>
                      <span className="font-extrabold text-slate-800 ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FOOTER ADVICE / BENCHMARK NOTE */}
      <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-[10.5px] text-amber-900 leading-relaxed flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-extrabold">Lưu ý du học sinh:</span> Mức lương tối thiểu quy định năm 2026 tại Hàn Quốc là <span className="font-bold underline">10.030 KRW/giờ</span>. Làm đêm (22:00 ~ 06:00) hoặc tăng ca theo luật được tính x1.5 lương cơ bản.
        </div>
      </div>
    </div>
  );
}
