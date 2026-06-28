/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, MapPin, Briefcase, Filter, Heart, SlidersHorizontal, 
  Map as MapIcon, ChevronRight, BookmarkCheck, CheckCircle2, 
  AlertCircle, Sparkles, Loader2, ArrowRight, Columns
} from 'lucide-react';
import Header from './components/Header';
import MapContainer from './components/MapContainer';
import JobCard from './components/JobCard';
import JobDetailDrawer from './components/JobDetailDrawer';
import AIParsingTool from './components/AIParsingTool';
import AdminPanel from './components/AdminPanel';
import ContactModal from './components/ContactModal';
import Logo from './components/Logo';
import { Job, User, Bookmark } from './types';

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [adminJobsList, setAdminJobsList] = useState<Job[]>([]); // Full list including pending for Admin
  const [loading, setLoading] = useState(true);
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 'u1',
    name: 'Nguyễn Văn Hải',
    email: 'hai.nguyen@student.kr',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: 'user',
    createdAt: new Date('2026-05-10T12:00:00Z').toISOString()
  });

  // Bookmark state
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  
  // View/Route control
  const [activeTab, setActiveTab] = useState<string>('jobs');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [mobileLayoutMode, setMobileLayoutMode] = useState<'cards' | 'split' | 'list'>('cards');

  // Mobile Bottom Sheet Draggable Panel Height
  const [mobileHeightPercent, setMobileHeightPercent] = useState(58);
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // Swipe Container Refs & Flag to prevent selection scroll-loop
  const swipeContainerRef = useRef<HTMLDivElement | null>(null);
  const isAutoScrolling = useRef<boolean>(false);

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
    const containerHeight = window.innerHeight - 64;
    const deltaPercent = (deltaY / containerHeight) * 100;
    let newHeight = dragStartHeight.current - deltaPercent;
    if (newHeight < 15) newHeight = 15;
    if (newHeight > 85) newHeight = 85;
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
      const containerHeight = window.innerHeight - 64;
      const deltaPercent = (deltaY / containerHeight) * 100;
      let newHeight = dragStartHeight.current - deltaPercent;
      if (newHeight < 15) newHeight = 15;
      if (newHeight > 85) newHeight = 85;
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

  // Advanced Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [salaryTypeFilter, setSalaryTypeFilter] = useState('All');
  const [minSalaryFilter, setMinSalaryFilter] = useState('');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [hideSwipeCards, setHideSwipeCards] = useState(true);

  // Compute displayed jobs based on normal filters and showSavedOnly toggle
  const displayedJobs = showSavedOnly ? jobs.filter(j => bookmarkedIds.includes(j.id)) : jobs;

  // Automatically reveal swipe cards when a job is selected
  useEffect(() => {
    if (selectedJob) {
      setHideSwipeCards(false);
    }
  }, [selectedJob]);

  // Auto-scroll center active card on mobile
  useEffect(() => {
    if (selectedJob && mobileLayoutMode === 'cards') {
      const cardEl = document.getElementById(`job-card-${selectedJob.id}`);
      if (cardEl) {
        isAutoScrolling.current = true;
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        
        // Release lock after smooth scroll completes
        const timeout = setTimeout(() => {
          isAutoScrolling.current = false;
        }, 600);
        return () => clearTimeout(timeout);
      }
    }
  }, [selectedJob, mobileLayoutMode]);

  // Swipe detection scroll handler - updates map center when swiping cards
  const handleSwipeScroll = () => {
    if (isAutoScrolling.current) return;
    const container = swipeContainerRef.current;
    if (!container) return;

    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    // Center of the scroll viewport
    const containerCenter = container.scrollLeft + container.clientWidth / 2;

    let closestJobId: string | null = null;
    let minDistance = Infinity;

    children.forEach((child) => {
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const distance = Math.abs(childCenter - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
        const idParts = child.id.split('job-card-');
        if (idParts.length > 1) {
          closestJobId = idParts[1];
        }
      }
    });

    if (closestJobId) {
      const foundJob = jobs.find(j => String(j.id) === closestJobId);
      if (foundJob && selectedJob?.id !== foundJob.id) {
        setSelectedJob(foundJob);
      }
    }
  };

  // Fetch Jobs from backend API
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (cityFilter && cityFilter !== 'All') params.append('city', cityFilter);
      if (categoryFilter && categoryFilter !== 'All') params.append('category', categoryFilter);
      if (salaryTypeFilter && salaryTypeFilter !== 'All') params.append('salaryType', salaryTypeFilter);
      if (minSalaryFilter) params.append('minSalary', minSalaryFilter);

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full list for Admin
  const fetchAdminJobs = async () => {
    if (currentUser?.role !== 'admin') return;
    try {
      const r1 = await fetch('/api/jobs?status=approved');
      const r2 = await fetch('/api/jobs?status=pending');
      const r3 = await fetch('/api/jobs?status=rejected');
      
      const approved = r1.ok ? await r1.json() : [];
      const pending = r2.ok ? await r2.json() : [];
      const rejected = r3.ok ? await r3.json() : [];

      setAdminJobsList([...pending, ...approved, ...rejected]);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch user bookmarks from backend
  const fetchBookmarks = async () => {
    if (!currentUser) {
      setBookmarkedIds([]);
      return;
    }
    try {
      const res = await fetch(`/api/bookmarks/${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setBookmarkedIds(data.map((b: Bookmark) => b.jobId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchJobs();
    if (currentUser?.role === 'admin') {
      fetchAdminJobs();
    }
  }, [searchQuery, cityFilter, categoryFilter, salaryTypeFilter, minSalaryFilter, activeTab]);

  useEffect(() => {
    fetchBookmarks();
    if (currentUser?.role === 'admin') {
      fetchAdminJobs();
    }
  }, [currentUser]);

  // Handle Quick Search Suggestions
  const handleQuickSearch = (keyword: string, cityVal?: string, catVal?: string) => {
    setSearchQuery(keyword);
    if (cityVal) setCityFilter(cityVal);
    if (catVal) setCategoryFilter(catVal);
    setActiveTab('jobs');
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setCityFilter('All');
    setCategoryFilter('All');
    setSalaryTypeFilter('All');
    setMinSalaryFilter('');
    fetchJobs();
  };

  // Bookmarking Toggle
  const handleToggleBookmark = async (jobId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!currentUser) {
      // Alert standard login or open header login
      const btn = document.getElementById('btn-login-trigger');
      if (btn) btn.click();
      return;
    }

    try {
      const res = await fetch('/api/bookmarks/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: currentUser.id, jobId })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.bookmarked) {
          setBookmarkedIds(prev => [...prev, jobId]);
        } else {
          setBookmarkedIds(prev => prev.filter(id => id !== jobId));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Auth logins
  const handleLogin = (email: string, name: string, avatar: string, role: 'user' | 'admin') => {
    setCurrentUser({
      id: email === 'lechidaicma@gmail.com' ? 'u2' : 'u3',
      name,
      email,
      avatar,
      role,
      createdAt: new Date().toISOString()
    });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setBookmarkedIds([]);
    setActiveTab('home');
  };

  // MODERATOR ACTIONS
  const handleStatusUpdate = async (jobId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchAdminJobs();
        fetchJobs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn công việc này khỏi hệ thống?')) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAdminJobs();
        fetchJobs();
        if (selectedJob?.id === jobId) {
          setSelectedJob(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateCrawl = async (source: string, url: string) => {
    try {
      const res = await fetch('/api/crawler/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, url })
      });
      if (res.ok) {
        fetchAdminJobs();
        fetchJobs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger when new job created from AI Parser
  const handleNewJobCreated = (newJob: Job) => {
    setJobs(prev => [newJob, ...prev]);
    if (currentUser?.role === 'admin') {
      fetchAdminJobs();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-800">
      
      {/* HEADER */}
      <Header 
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenContact={() => setContactOpen(true)}
      />

      {/* DETAILED OVERLAY DRAWER */}
      <AnimatePresence>
        {selectedJob && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedJob(null)}
              className="fixed inset-0 bg-black z-[1400]"
            />
            <JobDetailDrawer 
              job={selectedJob}
              onClose={() => setSelectedJob(null)}
              isBookmarked={bookmarkedIds.includes(selectedJob.id)}
              onToggleBookmark={handleToggleBookmark}
              currentUser={currentUser}
            />
          </>
        )}
      </AnimatePresence>

      {/* CONTACT MODAL */}
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />

      {/* MAIN CONTAINER */}
      {activeTab === 'jobs' ? (
        // Map-Centric Explorer Layout (no separate container limits, expands 100% height)
        <div className="w-full h-[calc(100vh-4rem)] flex flex-col-reverse lg:flex-row relative overflow-hidden bg-slate-50 animate-in fade-in duration-300">
          
          {/* LEFT SIDE PANEL (Sidebar with Filters & Results) */}
          <aside 
            style={
              typeof window !== 'undefined' && window.innerWidth < 1024 
                ? (mobileLayoutMode === 'split' 
                    ? { height: `${mobileHeightPercent}vh`, flex: 'none' } 
                    : mobileLayoutMode === 'list' 
                      ? { height: '100%', flex: '1' } 
                      : { display: 'none' }) 
                : undefined
            }
            className={`w-full lg:w-[420px] xl:w-[460px] flex-shrink-0 bg-white lg:border-r border-slate-200/80 flex flex-col z-10 transition-all ${
              mobileLayoutMode === 'cards' ? 'hidden lg:flex' : 'flex'
            } h-0 overflow-hidden rounded-t-[2rem] border-t border-slate-200/80 lg:rounded-t-none lg:border-t-0 lg:h-full shadow-[0_-10px_30px_rgba(0,0,0,0.06)] lg:shadow-none`}
          >
            
            {/* Mobile Drag Handle for Split View */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              className="lg:hidden flex justify-center pt-3.5 pb-2 bg-slate-50/50 cursor-ns-resize active:bg-slate-100 transition-colors"
            >
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>
            
            {/* Sidebar Branding & Summary */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-1.5">
                  <Logo className="h-7 w-auto" />
                  <span className="text-[10px] bg-blue-50 text-blue-600 font-extrabold px-1.5 py-0.5 rounded border border-blue-200/30">Hàn Quốc</span>
                </div>
                <p className="text-[10.5px] text-slate-400 font-medium mt-1">Bản đồ việc làm thêm cho cộng đồng Việt</p>
              </div>
              <span className="text-xs font-bold text-slate-900 bg-white border border-slate-200/80 px-2.5 py-1 rounded-full shadow-sm">
                {jobs.length} tin tuyển
              </span>
            </div>

            {/* Sidebar Search and Filters panel */}
            <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
              {/* Search bar */}
              <div className="relative flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 focus-within:border-blue-500/80 focus-within:bg-white transition-all shadow-sm">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm việc, khu vực, xưởng, quán ăn..."
                  className="w-full bg-transparent text-xs font-bold outline-none text-slate-800"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer p-0.5 px-1.5"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Integrated Filters selectors */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Khu vực</label>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="All">Tất cả TP</option>
                    <option value="Seoul">Seoul (서울)</option>
                    <option value="Daejeon">Daejeon (대전)</option>
                    <option value="Busan">Busan (부산)</option>
                    <option value="Incheon">Incheon (인천)</option>
                    <option value="Gyeonggi">Gyeonggi (경기)</option>
                    <option value="Gwangju">Gwangju (광주)</option>
                    <option value="Daegu">Daegu (대구)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ngành nghề</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="All">Tất cả ngành</option>
                    <option value="Restaurant">Nhà hàng / Quán ăn</option>
                    <option value="Cafe">Cà phê / Bánh ngọt</option>
                    <option value="Factory">Nhà xưởng / Công xưởng</option>
                    <option value="Warehouse">Kho bãi</option>
                    <option value="Convenience Store">Cửa hàng tiện lợi</option>
                    <option value="Office">Văn phòng / Dịch thuật</option>
                    <option value="Other">Khác</option>
                  </select>
                </div>
              </div>

              {/* Collapsible toggle for Advanced Filters (Salary) */}
              <div className="pt-1">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Lọc chi tiết (Lương, ca làm)...</span>
                </button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 animate-in slide-in-from-top-2 duration-150">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cách trả lương</label>
                    <select
                      value={salaryTypeFilter}
                      onChange={(e) => setSalaryTypeFilter(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="All">Mọi hình thức</option>
                      <option value="Hourly">Theo giờ (시급)</option>
                      <option value="Monthly">Theo tháng (월급)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lương tối thiểu (KRW)</label>
                    <input
                      type="number"
                      value={minSalaryFilter}
                      onChange={(e) => setMinSalaryFilter(e.target.value)}
                      placeholder="Ví dụ: 10000"
                      className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-700 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Quick suggestion tags inside sidebar */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 pt-1">
                <span className="font-semibold">Tìm nhanh:</span>
                <button
                  onClick={() => handleQuickSearch('식당', 'Daejeon')}
                  className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-full hover:bg-slate-100 hover:border-slate-300 cursor-pointer"
                >
                  Daejeon 식당
                </button>
                <button
                  onClick={() => handleQuickSearch('카페', 'Seoul')}
                  className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-full hover:bg-slate-100 hover:border-slate-300 cursor-pointer"
                >
                  Seoul Cafe
                </button>
                <button
                  onClick={() => handleQuickSearch('공장')}
                  className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-full hover:bg-slate-100 hover:border-slate-300 cursor-pointer"
                >
                  Công xưởng
                </button>
              </div>
            </div>

            {/* Sidebar Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-2">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <span className="text-xs text-slate-400 font-bold">Đang tải dữ liệu...</span>
                </div>
              ) : displayedJobs.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-700">Không tìm thấy bài tuyển dụng phù hợp.</p>
                  <p className="text-[11px] text-slate-400">Hãy thử xóa bộ lọc, tìm nhanh, hoặc di chuyển vùng bản đồ.</p>
                  <button 
                    onClick={handleResetFilters}
                    className="text-xs font-bold text-blue-600 underline cursor-pointer mt-1"
                  >
                    Xóa tất cả bộ lọc
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pb-8">
                  {displayedJobs.map(job => (
                    <JobCard 
                      key={job.id}
                      job={job}
                      isBookmarked={bookmarkedIds.includes(job.id)}
                      onToggleBookmark={handleToggleBookmark}
                      onSelect={(j) => setSelectedJob(j)}
                      isSelected={selectedJob?.id === job.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar mini footer links */}
            <div className="p-3 border-t border-slate-100 text-[10px] text-slate-400 text-center bg-white">
              <span>86Job © 2026 • </span>
              <button onClick={() => setContactOpen(true)} className="hover:text-blue-600 underline cursor-pointer">Liên hệ Hỗ trợ</button>
              <span> • </span>
              <button onClick={() => setActiveTab('parse')} className="hover:text-blue-600 underline cursor-pointer">Đăng tin bằng AI</button>
            </div>
          </aside>

          {/* RIGHT SIDE MAP VIEW (Immersive Map occupying remaining space) */}
          <main 
            style={
              typeof window !== 'undefined' && window.innerWidth < 1024 
                ? (mobileLayoutMode === 'cards' 
                    ? { height: '100%', flex: '1' } 
                    : mobileLayoutMode === 'split' 
                      ? { height: `${100 - mobileHeightPercent}vh`, flex: 'none' } 
                      : { display: 'none' }) 
                : undefined
            }
            className={`transition-all relative lg:h-full lg:flex-1 w-full shrink-0 border-b border-slate-200/80 lg:border-b-0 ${
              mobileLayoutMode === 'list' ? 'hidden lg:block' : 'block'
            }`}
          >
            <MapContainer 
              jobs={displayedJobs}
              selectedJob={selectedJob}
              onSelectJob={(j) => setSelectedJob(j)}
            />

            {/* MODERN FLOATING FILTER & SEARCH PANEL (Airbnb / Google Maps Inspired) */}
            <div className="absolute top-4 left-4 right-4 z-[900] space-y-2.5 pointer-events-none flex flex-col">
              
              {/* Top Row: Search Input & Live status badge */}
              <div className="flex flex-col sm:flex-row gap-2 w-full pointer-events-auto">
                
                {/* Search Bar */}
                <div className="flex-1 bg-white/95 backdrop-blur-md border border-slate-200/85 rounded-full py-2.5 px-4 shadow-xl flex items-center gap-2 transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <Search className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm việc làm, khu vực, tên xưởng..."
                    className="bg-transparent outline-none text-xs font-bold w-full text-slate-800"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')} 
                      className="text-slate-400 text-xs font-bold p-1 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* thongtincuuho style Live Status Tracker */}
                <div className="bg-slate-900/90 backdrop-blur-md text-white border border-slate-800 rounded-full py-2 px-4 shadow-xl flex items-center gap-2.5 flex-shrink-0 self-start sm:self-auto">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                    LIVE • {displayedJobs.length} Tin tuyển
                  </span>
                </div>
              </div>

              {/* Horizontally Scrollable Filter Chips (Airbnb style) */}
              <div className="w-full overflow-x-auto flex gap-1.5 py-1 pointer-events-auto no-scrollbar scroll-smooth">
                {[
                  { id: 'All', label: 'Tất cả ngành', emoji: '🌐' },
                  { id: 'Restaurant', label: 'Nhà hàng', emoji: '🍲' },
                  { id: 'Cafe', label: 'Cà phê', emoji: '☕' },
                  { id: 'Factory', label: 'Nhà xưởng', emoji: '🏭' },
                  { id: 'Warehouse', label: 'Kho bãi', emoji: '📦' },
                  { id: 'Convenience Store', label: 'Cửa hàng', emoji: '🏪' },
                  { id: 'Office', label: 'Văn phòng', emoji: '🏢' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-full border transition-all cursor-pointer whitespace-nowrap shadow-md ${
                      categoryFilter === cat.id
                        ? 'bg-blue-600 border-blue-700 text-white shadow-blue-500/20 scale-105'
                        : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}

                <div className="w-[1.5px] bg-slate-300/60 self-stretch my-1 mx-1 flex-shrink-0" />

                {[
                  { id: 'All', label: 'Tất cả TP', emoji: '📍' },
                  { id: 'Seoul', label: 'Seoul', emoji: '🗼' },
                  { id: 'Gyeonggi', label: 'Gyeonggi', emoji: '🏡' },
                  { id: 'Incheon', label: 'Incheon', emoji: '✈️' },
                  { id: 'Daejeon', label: 'Daejeon', emoji: '🚄' },
                  { id: 'Busan', label: 'Busan', emoji: '🌊' }
                ].map(city => (
                  <button
                    key={city.id}
                    onClick={() => setCityFilter(city.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-full border transition-all cursor-pointer whitespace-nowrap shadow-md ${
                      cityFilter === city.id
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-emerald-500/20 scale-105'
                        : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{city.emoji}</span>
                    <span>{city.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* FLOATING ACTION BUTTONS STACK (Grab Driver & Google Maps Inspired FABs) */}
            <div className="absolute right-4 top-36 sm:top-28 z-[900] flex flex-col gap-2.5 pointer-events-auto">
              
              {/* Locate GPS / Center button */}
              <button
                onClick={() => {
                  if (displayedJobs.length > 0) {
                    const firstJob = displayedJobs[0];
                    setSelectedJob(firstJob);
                  }
                }}
                className="w-11 h-11 bg-white/95 backdrop-blur-md text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xl rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer group"
                title="Định vị lại trung tâm bản đồ"
              >
                <MapPin className="w-5 h-5 text-blue-600 group-hover:animate-bounce" />
              </button>

              {/* Bookmark Toggle filter */}
              <button
                onClick={() => setShowSavedOnly(!showSavedOnly)}
                className={`w-11 h-11 border shadow-xl rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                  showSavedOnly 
                    ? 'bg-amber-500 border-amber-600 text-white shadow-amber-500/20' 
                    : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="Chỉ hiển thị công việc đã lưu"
              >
                <Heart className="w-5 h-5" fill={showSavedOnly ? '#ffffff' : 'none'} />
              </button>

              {/* Fast Emergency Post Button */}
              <button
                onClick={() => setActiveTab('parse')}
                className="w-11 h-11 bg-rose-600 hover:bg-rose-700 border border-rose-700 text-white shadow-xl rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer animate-pulse"
                title="Đăng tin khẩn cấp / Cứu trợ bằng AI"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            </div>

            {/* HORIZONTAL SWIPE CARDS OVERLAY FOR MOBILE 'CARDS' LAYOUT */}
            {mobileLayoutMode === 'cards' && (
              <div className="lg:hidden absolute bottom-5 left-0 right-0 z-[900] px-4 pointer-events-none flex flex-col gap-2">
                {hideSwipeCards ? (
                  /* Floating pill to show the card overlay again if hidden */
                  <div className="flex justify-center pointer-events-auto">
                    <button
                      onClick={() => setHideSwipeCards(false)}
                      className="bg-slate-900/95 text-white text-[11px] font-extrabold px-4 py-2 rounded-full shadow-2xl border border-slate-800 flex items-center gap-2 cursor-pointer hover:bg-slate-800 transition-all active:scale-95 animate-bounce"
                    >
                      <span>📋 Hiện danh sách tin</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Header bar to close/dismiss the deck */}
                    <div className="flex justify-between items-center px-1 pointer-events-auto">
                      <div className="bg-slate-900/90 text-white text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-slate-800">
                        Vuốt ngang để xem • {displayedJobs.length} tin
                      </div>
                      <button 
                        onClick={() => setHideSwipeCards(true)}
                        className="w-7 h-7 bg-slate-900/95 hover:bg-slate-800 border border-slate-800 text-white font-black text-xs rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all active:scale-90"
                        title="Ẩn danh sách thẻ"
                      >
                        ✕
                      </button>
                    </div>

                    <div 
                      ref={swipeContainerRef}
                      onScroll={handleSwipeScroll}
                      className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 pointer-events-auto no-scrollbar scroll-smooth"
                    >
                      {displayedJobs.map(job => (
                        <div 
                          key={job.id} 
                          id={`job-card-${job.id}`}
                          className="w-[280px] sm:w-[310px] flex-shrink-0 snap-center"
                        >
                          <JobCard 
                            job={job}
                            isBookmarked={bookmarkedIds.includes(job.id)}
                            onToggleBookmark={handleToggleBookmark}
                            onSelect={(j) => setSelectedJob(j)}
                            isSelected={selectedJob?.id === job.id}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </main>

        </div>
      ) : (
        // Standard max-width container for content tabs (parse, bookmarks, admin)
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* ========================================== */}
          {/* TAB 4: AI PARSING TOOL & MANUAL POSTING */}
          {/* ========================================== */}
          {activeTab === 'parse' && (
            <AIParsingTool 
              currentUser={currentUser}
              onJobCreated={handleNewJobCreated}
              setActiveTab={setActiveTab}
            />
          )}

          {/* ========================================== */}
          {/* TAB 5: SAVED BOOKMARKS */}
          {/* ========================================== */}
          {activeTab === 'bookmarks' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h1 className="font-display text-2xl font-extrabold text-slate-950">Việc làm đã lưu của bạn ({bookmarkedIds.length})</h1>
                <p className="text-xs text-slate-400 mt-1">Lưu trữ các công việc lương cao, hỗ trợ visa tốt để ứng tuyển sau</p>
              </div>

              {!currentUser ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-md space-y-4">
                  <p className="text-sm font-bold text-slate-700">Vui lòng đăng nhập để lưu trữ công việc yêu thích.</p>
                  <button
                    onClick={() => {
                      const btn = document.getElementById('btn-login-trigger');
                      if (btn) btn.click();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-6 rounded-full shadow cursor-pointer transition-colors"
                  >
                    Đăng nhập nhanh
                  </button>
                </div>
              ) : bookmarkedIds.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-md space-y-2">
                  <p className="text-sm font-bold text-slate-700">Danh sách yêu thích trống.</p>
                  <p className="text-xs text-slate-400">Hãy nhấn biểu tượng trái tim ở các thẻ công việc để lưu trữ lại đây.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {jobs.filter(job => bookmarkedIds.includes(job.id)).map(job => (
                    <JobCard 
                      key={job.id}
                      job={job}
                      isBookmarked={true}
                      onToggleBookmark={handleToggleBookmark}
                      onSelect={(j) => setSelectedJob(j)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 6: ADMIN CONTROL PANEL (ADMINS ONLY) */}
          {/* ========================================== */}
          {activeTab === 'admin' && currentUser?.role === 'admin' && (
            <AdminPanel 
              jobs={adminJobsList}
              onStatusUpdate={handleStatusUpdate}
              onDeleteJob={handleDeleteJob}
              onSimulateCrawl={handleSimulateCrawl}
            />
          )}

        </main>
      )}

      {/* FOOTER */}
      {activeTab !== 'jobs' && (
        <footer className="bg-white border-t border-slate-200/80 mt-24 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-sm font-extrabold text-blue-600 font-display">86Job</p>
              <p className="text-xs text-slate-400 mt-1">© 2026 86Job. Nền tảng tổng hợp việc làm uy tín cho cộng đồng Việt Nam tại Hàn Quốc.</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold text-slate-400">
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => setContactOpen(true)}>Hỗ trợ kĩ thuật</span>
              <span>•</span>
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => setActiveTab('parse')}>Đăng tin bằng AI</span>
              <span>•</span>
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => {
                // Quick login as Admin
                handleLogin('lechidaicma@gmail.com', 'Admin 86Job', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'admin');
                setActiveTab('admin');
              }}>Quản trị</span>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}
