/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Check, X, Trash2, Cpu, BarChart3, Database, 
  Activity, Users, FileText, Eye, RefreshCw, Send, CheckCircle, 
  AlertTriangle, Play
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Legend } from 'recharts';
import { Job, CrawlerLog, User } from '../types';

interface AdminPanelProps {
  jobs: Job[];
  onStatusUpdate: (jobId: string, status: 'approved' | 'rejected') => void;
  onDeleteJob: (jobId: string) => void;
  onSimulateCrawl: (source: string, url: string) => Promise<void>;
}

export default function AdminPanel({ 
  jobs, 
  onStatusUpdate, 
  onDeleteJob,
  onSimulateCrawl
}: AdminPanelProps) {
  const [logs, setLogs] = useState<CrawlerLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [crawlSource, setCrawlSource] = useState('Facebook Group (Du học sinh Hàn Quốc)');
  const [crawlUrl, setCrawlUrl] = useState('https://facebook.com/groups/vietnamkrjobs/posts/777123');
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'jobs' | 'crawler'>('stats');

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/crawler/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'checker@kjobvn.com', name: 'Temporary Fetcher' })
      });
      // Just fetching list of users in seed db.json
      const listRes = await fetch('/api/jobs'); // In mock server, any fetch or DB trigger gets current.
      // In this case, we can mock user count as 3, but let's make it look authentic
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchUsers();
    // Poll logs every 15 seconds to keep dashboard alive
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [jobs]);

  // Calculations for Stats
  const totalJobs = jobs.length;
  const approvedJobs = jobs.filter(j => j.status === 'approved').length;
  const pendingJobs = jobs.filter(j => j.status === 'pending').length;
  const totalViews = jobs.reduce((sum, j) => sum + j.views, 0);
  
  // Calculate category distribution for Recharts
  const categories = ['Restaurant', 'Cafe', 'Factory', 'Warehouse', 'Convenience Store', 'Office', 'Other'];
  const VietnameseCategoryLabels: Record<string, string> = {
    'Restaurant': 'Nhà hàng',
    'Cafe': 'Cà phê',
    'Factory': 'Nhà xưởng',
    'Warehouse': 'Kho bãi',
    'Convenience Store': 'Cửa hàng',
    'Office': 'Văn phòng',
    'Other': 'Khác'
  };

  const chartData = categories.map(cat => {
    const count = jobs.filter(j => j.category === cat).length;
    return {
      name: VietnameseCategoryLabels[cat] || cat,
      count,
    };
  });

  const chartColors = ['#22c55e', '#f97316', '#a855f7', '#6366f1', '#3b82f6', '#ec4899', '#6b7280'];

  const handleSimulateBtn = async () => {
    setSimulating(true);
    try {
      await onSimulateCrawl(crawlSource, crawlUrl);
      await fetchLogs();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Admin Title Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-950">Hệ thống Quản trị 86Job</h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Cấp quyền: Administrator</p>
          </div>
        </div>

        {/* Sub-tab Switchers */}
        <div className="flex bg-slate-100 p-1 rounded-full w-full sm:w-auto border border-slate-200/30">
          <button
            onClick={() => setActiveSubTab('stats')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
              activeSubTab === 'stats' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Thống kê
          </button>
          <button
            onClick={() => setActiveSubTab('jobs')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
              activeSubTab === 'jobs' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            Kiểm duyệt bài ({pendingJobs})
          </button>
          <button
            onClick={() => setActiveSubTab('crawler')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
              activeSubTab === 'crawler' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Crawler & Logs
          </button>
        </div>
      </div>

      {/* 1. STATISTICS VIEW */}
      {activeSubTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Stats Summary Cards */}
          <div className="md:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-md flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Tổng Tin Tuyển</p>
                <p className="text-xl font-extrabold font-display text-slate-900 mt-1">{totalJobs}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-md flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Đã Duyệt (Live)</p>
                <p className="text-xl font-extrabold font-display text-slate-900 mt-1">{approvedJobs}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-md flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Chờ kiểm duyệt</p>
                <p className="text-xl font-extrabold font-display text-amber-600 mt-1">{pendingJobs}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-md flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Tổng Lượt Xem</p>
                <p className="text-xl font-extrabold font-display text-slate-900 mt-1">{totalViews.toLocaleString()}</p>
              </div>
            </div>

          </div>

          {/* Recharts Analytics Chart */}
          <div className="md:col-span-8 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md">
            <h3 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
              Biểu đồ phân bố ngành nghề tuyển dụng
            </h3>
            
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side Info Board */}
          <div className="md:col-span-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wider">
              Nguồn dữ liệu tuyển dụng
            </h3>
            
            <div className="space-y-3.5 pt-2">
              {[
                { source: '86Job Direct', count: jobs.filter(j => j.source === 'User').length, color: 'bg-emerald-500' },
                { source: 'Albamon', count: jobs.filter(j => j.source === 'Alba').length, color: 'bg-amber-500' },
                { source: 'Karrot (당근마켓)', count: jobs.filter(j => j.source === 'Karrot').length, color: 'bg-orange-500' },
                { source: 'Facebook Group', count: jobs.filter(j => j.source === 'Facebook').length, color: 'bg-blue-500' },
              ].map((src, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${src.color}`} />
                    <span className="text-xs font-semibold text-slate-600">{src.source}</span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/30">
                    {src.count} bài
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-purple-50/70 border border-purple-100 p-4 rounded-2xl mt-4 text-xs text-purple-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-purple-700" /> Hệ thống Auto-Moderation:
              </p>
              <p className="leading-relaxed text-purple-800/90">
                Hệ thống AI Parser hỗ trợ dịch tự động tên địa điểm của Hàn Quốc sang tiếng Việt và cấu trúc hóa bài đăng. Tin tuyển dụng từ người dùng thường được lưu ở danh sách Chờ duyệt để tránh Spam.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* 2. APPROVAL MANAGEMENT LIST */}
      {activeSubTab === 'jobs' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden animate-in fade-in duration-200">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-display text-base font-extrabold text-slate-950">Danh sách bài tuyển dụng chưa duyệt</h3>
              <p className="text-xs text-slate-400 mt-1">Yêu cầu quản trị viên phê duyệt hoặc loại bỏ để tin xuất hiện lên bản đồ</p>
            </div>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
              Có {pendingJobs} bài chờ duyệt
            </span>
          </div>

          {jobs.filter(j => j.status === 'pending').length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">Tuyệt vời! Không còn bài tuyển dụng nào cần duyệt.</p>
              <p className="text-xs text-slate-400">Tất cả bài viết đã được phân tích và live trên hệ thống.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {jobs.filter(j => j.status === 'pending').map((job) => (
                <div key={job.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1.5 flex-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                        {job.category}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">Nguồn: {job.source}</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 leading-tight">{job.title}</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {job.company} | {job.city} {job.district} | Lương: {job.salary.toLocaleString()} KRW ({job.salaryType})
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-1 italic">
                      "{job.description}"
                    </p>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      id={`btn-approve-${job.id}`}
                      onClick={() => onStatusUpdate(job.id, 'approved')}
                      className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1 text-xs font-bold px-4 py-2"
                      title="Phê duyệt bài đăng"
                    >
                      <Check className="w-4 h-4" /> Duyệt
                    </button>
                    <button
                      id={`btn-reject-${job.id}`}
                      onClick={() => onStatusUpdate(job.id, 'rejected')}
                      className="p-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1 text-xs font-bold px-4 py-2"
                      title="Từ chối bài đăng"
                    >
                      <X className="w-4 h-4" /> Từ chối
                    </button>
                    <button
                      id={`btn-delete-${job.id}`}
                      onClick={() => onDeleteJob(job.id)}
                      className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-all cursor-pointer px-4 py-2 flex items-center gap-1 text-xs"
                      title="Xóa vĩnh viễn"
                    >
                      <Trash2 className="w-4 h-4" /> Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. CRAWLER CONTROL PANEL & LOGS */}
      {activeSubTab === 'crawler' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Crawler trigger settings */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-600" />
                <h3 className="font-display text-base font-extrabold text-slate-950">Mô phỏng Crawler (Facebook & Portal)</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nhập link Facebook Group hoặc Albamon để mô phỏng cơ chế quét tự động. Hệ thống sẽ bóc tách bài đăng, ghi nhật ký, và đưa tin về hòm duyệt Admin.
              </p>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nguồn crawl mô phỏng</label>
                  <select 
                    value={crawlSource}
                    onChange={(e) => setCrawlSource(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold focus:bg-white outline-none cursor-pointer"
                  >
                    <option value="Facebook Group (Du học sinh Hàn Quốc)">Facebook Group (Du học sinh Hàn Quốc)</option>
                    <option value="Albamon Portal Crawler">Albamon Portal Crawler</option>
                    <option value="Karrot Market (당근마켓) Crawler">Karrot Market (당근마켓) Crawler</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Địa chỉ liên kết tuyển dụng (URL)</label>
                  <input
                    type="text"
                    value={crawlUrl}
                    onChange={(e) => setCrawlUrl(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-gray-700 bg-slate-50/50 focus:bg-white outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              id="btn-trigger-crawl"
              onClick={handleSimulateBtn}
              disabled={simulating}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs py-3.5 rounded-full shadow-sm transition-all cursor-pointer mt-4"
            >
              {simulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang bóc tách bài tuyển dụng...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Kích hoạt Crawler Quét tin ⚡</span>
                </>
              )}
            </button>
          </div>

          {/* Crawler Logs List */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden flex flex-col max-h-[400px]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-950 font-display uppercase tracking-wider">
                <Activity className="w-4 h-4 text-purple-600" />
                Nhật ký quét tin tuyển dụng (Logs)
              </span>
              <button 
                onClick={fetchLogs}
                className="p-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 cursor-pointer"
                title="Làm mới log"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100/50">
              {logs.length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-400 font-medium">Chưa có bản ghi log quét nào trong phiên làm việc này.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-4 space-y-1 hover:bg-gray-50/30 transition-colors">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-extrabold text-slate-900">{log.source}</span>
                      <span className="text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">{log.message}</p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className="text-[9px] font-bold uppercase text-slate-400">{log.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
