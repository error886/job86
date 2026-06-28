/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { X, Heart, MapPin, Calendar, MessageSquare, Phone, Send, Info, Eye, ExternalLink, BookmarkCheck } from 'lucide-react';
import { Job } from '../types';

interface JobDetailDrawerProps {
  job: Job | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (jobId: string) => void;
  currentUser: any;
}

export default function JobDetailDrawer({ 
  job, 
  onClose, 
  isBookmarked, 
  onToggleBookmark,
  currentUser
}: JobDetailDrawerProps) {
  if (!job) return null;

  const [mobileHeightPercent, setMobileHeightPercent] = useState(65);
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    dragStartY.current = e.touches[0].clientY;
    dragStartHeight.current = mobileHeightPercent;
    document.body.style.userSelect = 'none';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const clientY = e.touches[0].clientY;
    const deltaY = clientY - dragStartY.current;
    
    // Dragging UP (negative deltaY) increases the height.
    const containerHeight = window.innerHeight;
    const deltaPercent = (deltaY / containerHeight) * 100;
    
    let newHeight = dragStartHeight.current - deltaPercent;
    
    if (newHeight < 25) {
      onClose();
      return;
    }
    if (newHeight > 92) newHeight = 92;
    
    setMobileHeightPercent(newHeight);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    document.body.style.userSelect = '';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = mobileHeightPercent;
    document.body.style.userSelect = 'none';
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - dragStartY.current;
      const containerHeight = window.innerHeight;
      const deltaPercent = (deltaY / containerHeight) * 100;
      let newHeight = dragStartHeight.current - deltaPercent;
      
      if (newHeight < 25) {
        onClose();
        return;
      }
      if (newHeight > 92) newHeight = 92;
      setMobileHeightPercent(newHeight);
    };
    
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'Restaurant': 'Nhà hàng / Quán ăn',
      'Cafe': 'Cà phê / Bánh ngọt',
      'Factory': 'Nhà xưởng / Công xưởng',
      'Warehouse': 'Kho bãi / Coupang',
      'Convenience Store': 'Cửa hàng tiện lợi',
      'Office': 'Văn phòng / Biên dịch',
      'Other': 'Khác'
    };
    return labels[category] || category;
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      'Facebook': 'Nhóm cộng đồng Facebook',
      'Alba': 'Cổng tuyển dụng Albamon',
      'Karrot': 'Ứng dụng Karrot (당근알바)',
      'User': 'Người dùng 86Job đăng tin'
    };
    return labels[source] || source;
  };

  return (
    <div 
      style={typeof window !== 'undefined' && window.innerWidth < 768 ? { height: `${mobileHeightPercent}vh` } : undefined}
      className="fixed bottom-0 inset-x-0 md:h-full md:inset-y-0 md:right-0 md:left-auto md:w-[500px] bg-white shadow-2xl z-[1500] flex flex-col rounded-t-[2.5rem] md:rounded-t-none border-t md:border-t-0 md:border-l border-slate-200/80 transition-all duration-100 ease-out animate-in slide-in-from-bottom md:slide-in-from-right"
    >
      {/* Mobile Swipe Handle */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        className="md:hidden flex justify-center py-3.5 bg-slate-50/50 hover:bg-slate-100/50 active:bg-slate-200/50 rounded-t-[2.5rem] cursor-ns-resize transition-colors"
      >
        <div className="w-14 h-1.5 bg-slate-300 rounded-full" />
      </div>

      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200/30">
            Chi tiết việc làm
          </span>
          <span className="text-[11px] text-slate-400 font-semibold font-mono">ID: {job.id}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Bookmark on drawer */}
          <button
            onClick={() => onToggleBookmark(job.id)}
            className={`p-2 rounded-full border transition-all cursor-pointer ${
              isBookmarked
                ? 'bg-rose-50 border-rose-100 text-rose-500'
                : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-400'
            }`}
            title={isBookmarked ? 'Bỏ lưu' : 'Lưu công việc'}
          >
            <Heart className="w-4 h-4" fill={isBookmarked ? '#f43f5e' : 'none'} />
          </button>
          
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Title & Company */}
        <div className="space-y-2">
          <h2 className="font-display text-xl font-extrabold text-slate-900 leading-snug">
            {job.title}
          </h2>
          <p className="text-base font-bold text-blue-600">
            {job.company}
          </p>
          
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200/30">
              {getCategoryLabel(job.category)}
            </span>
            <span className="px-2.5 py-1 bg-blue-50/50 text-blue-600 text-xs font-semibold rounded-full flex items-center gap-1 border border-blue-100/50">
              <Eye className="w-3 h-3" /> {job.views} lượt xem
            </span>
          </div>
        </div>

        {/* Salary Banner */}
        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl p-5 text-white shadow-md shadow-blue-500/15">
          <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Mức Lương Đề Xuất</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-sm font-bold opacity-90">{job.salaryType === 'Hourly' ? 'Theo giờ (시급):' : 'Theo tháng (월급):'}</span>
            <span className="text-2xl font-extrabold font-display">{job.salary.toLocaleString()}</span>
            <span className="text-sm font-bold opacity-95">KRW</span>
          </div>
          <p className="text-blue-100/80 text-[11px] mt-1.5 leading-relaxed">
            * Lương tối thiểu Hàn Quốc năm 2026 hiện là 10,030 KRW/giờ. Các việc làm thấp hơn mức này cần được phản ánh.
          </p>
        </div>

        {/* Quick Contacts */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wider">Liên hệ Nhà tuyển dụng</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {job.phone ? (
              <a 
                href={`tel:${job.phone}`}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-3 px-4 rounded-full shadow-sm transition-all"
              >
                <Phone className="w-4 h-4" />
                <span>Gọi Điện</span>
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-slate-100 text-slate-400 font-semibold text-sm py-3 px-4 rounded-full cursor-not-allowed">
                <Phone className="w-4 h-4" />
                <span>Không có SĐT</span>
              </div>
            )}

            {job.kakao ? (
              <a 
                href={`https://open.kakao.com/me/${job.kakao}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-sm py-3 px-4 rounded-full shadow-sm transition-all"
              >
                <MessageSquare className="w-4 h-4 text-amber-950" />
                <span>KakaoTalk</span>
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-slate-100 text-slate-400 font-semibold text-sm py-3 px-4 rounded-full cursor-not-allowed">
                <MessageSquare className="w-4 h-4" />
                <span>Không có Kakao</span>
              </div>
            )}
          </div>

          {(job.phone || job.kakao || job.line) && (
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 space-y-1.5 text-xs text-amber-800">
              <p className="font-bold flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-amber-600" /> Thông tin liên lạc nhanh:
              </p>
              {job.phone && <p><strong>Số điện thoại:</strong> {job.phone}</p>}
              {job.kakao && <p><strong>Kakao ID:</strong> {job.kakao}</p>}
              {job.line && <p><strong>Line ID:</strong> {job.line}</p>}
            </div>
          )}
        </div>

        {/* Schedule & Address details */}
        <div className="space-y-3.5">
          <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wider">Thông tin địa điểm & Ca làm</h3>
          
          <div className="space-y-3 border border-slate-200/80 rounded-xl p-4 bg-slate-50/30">
            <div className="flex items-start gap-3">
              <MapPin className="w-4.5 h-4.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Địa chỉ cụ thể</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{job.address}</p>
                <p className="text-xs text-slate-500 mt-0.5">Tỉnh/Thành phố: {job.city} ({job.district})</p>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
              <Calendar className="w-4.5 h-4.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Thời gian làm việc</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{job.workingTime}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Job Description */}
        <div className="space-y-2.5">
          <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wider">Mô tả công việc chi tiết</h3>
          <div className="border border-slate-200/80 rounded-xl p-4.5 bg-white text-sm text-slate-700 leading-relaxed space-y-2 whitespace-pre-line">
            {job.description}
          </div>
        </div>

        {/* Data Provenance */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-4.5 h-4.5 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-500 leading-relaxed">
            <p className="font-bold text-slate-700">Nguồn tin tuyển dụng:</p>
            <p className="mt-0.5">{getSourceLabel(job.source)}</p>
            {job.sourceUrl && (
              <a 
                href={job.sourceUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="text-blue-600 hover:underline font-semibold flex items-center gap-1 mt-1.5"
              >
                Xem tin gốc <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <p className="mt-2 text-[10px] text-slate-400">
              Ngày đăng hệ thống: {new Date(job.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
        </div>
      </div>

      {/* Footer warning */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 text-center text-[10.5px] text-slate-400">
        Hãy cẩn trọng trước các yêu cầu đóng phí đặt cọc. Báo cáo quản trị viên nếu có nghi ngờ lừa đảo.
      </div>
    </div>
  );
}
