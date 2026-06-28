/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Heart, MapPin, Calendar, ExternalLink, Flame, Sparkles } from 'lucide-react';
import { Job } from '../types';

interface JobCardProps {
  job: Job;
  isBookmarked: boolean;
  onToggleBookmark: (jobId: string, e?: React.MouseEvent) => void | Promise<void>;
  onSelect: (job: Job) => void;
  isSelected?: boolean;
}

const JobCard: React.FC<JobCardProps> = ({ 
  job, 
  isBookmarked, 
  onToggleBookmark, 
  onSelect,
  isSelected = false
}) => {
  
  // Custom Category Styling
  const getCategoryStyles = (category: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      'Restaurant': { bg: 'bg-green-50 text-green-700 border-green-100', text: 'text-green-600', label: 'Nhà hàng / Quán ăn' },
      'Cafe': { bg: 'bg-orange-50 text-orange-700 border-orange-100', text: 'text-orange-600', label: 'Cà phê / Bánh ngọt' },
      'Factory': { bg: 'bg-purple-50 text-purple-700 border-purple-100', text: 'text-purple-600', label: 'Xưởng / Công xưởng' },
      'Warehouse': { bg: 'bg-indigo-50 text-indigo-700 border-indigo-100', text: 'text-indigo-600', label: 'Kho bãi / Coupang' },
      'Convenience Store': { bg: 'bg-blue-50 text-blue-700 border-blue-100', text: 'text-blue-600', label: 'Cửa hàng tiện lợi' },
      'Office': { bg: 'bg-pink-50 text-pink-700 border-pink-100', text: 'text-pink-600', label: 'Văn phòng / Dịch thuật' },
      'Other': { bg: 'bg-gray-50 text-gray-700 border-gray-100', text: 'text-gray-600', label: 'Khác' }
    };
    return styles[category] || styles['Other'];
  };

  const getSourceStyles = (source: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      'Facebook': { bg: 'bg-blue-600/10 text-blue-700', text: 'text-blue-600', label: 'Facebook Group' },
      'Alba': { bg: 'bg-amber-500/10 text-amber-700', text: 'text-amber-600', label: 'Albamon' },
      'Karrot': { bg: 'bg-orange-500/10 text-orange-700', text: 'text-orange-600', label: 'Karrot (당근)' },
      'User': { bg: 'bg-emerald-600/10 text-emerald-700', text: 'text-emerald-600', label: '86Job Direct' }
    };
    return styles[source] || { bg: 'bg-gray-100 text-gray-700', text: 'text-gray-500', label: source };
  };

  const catStyle = getCategoryStyles(job.category);
  const srcStyle = getSourceStyles(job.source);

  // Time format helper
  const formatDate = (isoStr: string) => {
    const date = new Date(isoStr);
    const diffTime = Math.abs(new Date().getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) return 'Vừa đăng';
      return `${diffHours} giờ trước`;
    }
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      id={`job-card-${job.id}`}
      onClick={() => onSelect(job)}
      className={`relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
        isSelected 
          ? 'border-l-4 border-y border-r border-l-blue-600 border-y-slate-200 border-r-slate-200 bg-blue-50/10 ring-1 ring-blue-500/10 shadow-md shadow-blue-500/5' 
          : 'border-l-4 border-y border-r border-l-transparent border-y-slate-200/80 border-r-slate-200/80 bg-white hover:border-l-blue-600 hover:border-y-slate-300 hover:border-r-slate-300 hover:bg-slate-50/40 hover:shadow-lg hover:shadow-slate-100/60'
      }`}
    >
      {/* Dynamic badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${catStyle.bg}`}>
            {catStyle.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${srcStyle.bg}`}>
            {srcStyle.label}
          </span>
        </div>
        
        {/* Bookmark heart */}
        <button
          id={`btn-bookmark-${job.id}`}
          onClick={(e) => onToggleBookmark(job.id, e)}
          className={`p-2 rounded-xl transition-all cursor-pointer border ${
            isBookmarked 
              ? 'bg-rose-50 border-rose-100 text-rose-500' 
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
          }`}
        >
          <Heart className="w-4 h-4" fill={isBookmarked ? '#f43f5e' : 'none'} />
        </button>
      </div>

      {/* Title and Company */}
      <div className="mb-3">
        <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-blue-600 line-clamp-2 leading-snug">
          {job.title}
        </h3>
        <p className="text-sm font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
          {job.company}
          {job.views > 150 && (
            <span className="inline-flex items-center gap-0.5 text-orange-600 text-[10px] font-bold bg-orange-50 px-1 py-0.2 rounded">
              <Flame className="w-3 h-3" /> Hot
            </span>
          )}
        </p>
      </div>

      {/* Salary & Location */}
      <div className="grid grid-cols-2 gap-2 border-y border-slate-100/80 py-3 mb-4">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Mức Lương</span>
          <p className="text-sm font-extrabold text-blue-600 mt-0.5 font-display">
            {job.salaryType === 'Hourly' ? '시급' : '월급'} <span className="text-base text-slate-900 font-extrabold">{job.salary.toLocaleString()}</span> <span className="text-[11px] text-slate-500 font-bold">KRW</span>
          </p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Khu Vực</span>
          <p className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <span className="truncate">{job.city} {job.district}</span>
          </p>
        </div>
      </div>

      {/* Footer information */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(job.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{job.views.toLocaleString()} lượt xem</span>
          {job.sourceUrl && (
            <a 
              href={job.sourceUrl} 
              target="_blank" 
              rel="noreferrer" 
              onClick={(e) => e.stopPropagation()}
              className="text-slate-400 hover:text-blue-600 transition-colors"
              title="Xem liên kết nguồn bài tuyển"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobCard;
