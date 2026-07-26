/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Send, Sparkles, Plus, AlertCircle, RefreshCw, FileText, CheckCircle, Info, Edit3, Wand2, Lock, LogIn, UserPlus } from 'lucide-react';
import { JobCategory, Job } from '../types';

interface AIParsingToolProps {
  currentUser: any;
  onJobCreated: (newJob: Job) => void;
  setActiveTab: (tab: string) => void;
  onOpenAuthModal?: (tab?: 'login' | 'register', prompt?: string) => void;
}

export default function AIParsingTool({ currentUser, onJobCreated, setActiveTab, onOpenAuthModal }: AIParsingToolProps) {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [parseMethod, setParseMethod] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields State
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [salary, setSalary] = useState(10030); // 2026 minimum wage default
  const [salaryType, setSalaryType] = useState<'Hourly' | 'Monthly'>('Hourly');
  const [city, setCity] = useState('Seoul');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<JobCategory>('Other');
  const [workingTime, setWorkingTime] = useState('');
  const [phone, setPhone] = useState('');
  const [kakao, setKakao] = useState('');
  const [line, setLine] = useState('');
  const [description, setDescription] = useState('');

  const [formVisible, setFormVisible] = useState(false);

  // Switch to Manual Mode
  const handleOpenManualForm = () => {
    setMode('manual');
    setFormVisible(true);
    setError(null);
    setWarning(null);
    setParseMethod(null);
  };

  // Switch to AI Mode
  const handleOpenAIMode = () => {
    setMode('ai');
    setError(null);
    setWarning(null);
  };

  // Pre-configured templates for easy testing
  const templates = [
    {
      label: 'Mẫu 1 (Hàn Quốc ngắn)',
      text: '대전 탄방동\n시급13000원\n주방보조\n18~23시\n01012341234'
    },
    {
      label: 'Mẫu 2 (Tiếng Việt Cafe Shinchon)',
      text: 'Tuyển gấp phục vụ bàn quán cà phê ở Shinchon Mapo-gu Seoul, lương 10500원/giờ, làm thứ 7 chủ nhật từ 9h sáng đến 3h chiều. Quán Compose Coffee, liên hệ Kakao ID: compose_mapo hoặc ĐT: 01098765432.'
    },
    {
      label: 'Mẫu 3 (Nhà xưởng Ansan)',
      text: 'Cần tìm bạn nam bốc xếp đóng gói mỹ phẩm tại nhà xưởng K-Beauty Packaging Factory ở Yuseong-gu Daejeon. Làm giờ hành chính từ 9h đến 18h các ngày trong tuần. Lương 9860원/giờ. Bao bữa trưa ngon miệng.'
    }
  ];

  const handleApplyTemplate = (text: string) => {
    setRawText(text);
    setError(null);
    setWarning(null);
  };

  const handleParseText = async () => {
    if (!rawText.trim()) {
      setError('Vui lòng nhập nội dung tuyển dụng cần phân tích.');
      return;
    }

    setParsing(true);
    setError(null);
    setWarning(null);
    setParseMethod(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: rawText })
      });

      let data: any = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (jsonErr) {
          console.error('Failed to parse JSON response:', jsonErr);
        }
      }

      if (!res.ok) {
        const errorMsg = data?.error || data?.message || `Lỗi hệ thống từ máy chủ (Mã lỗi: ${res.status})`;
        throw new Error(errorMsg);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Không nhận được dữ liệu phân tích hợp lệ từ máy chủ AI');
      }

      const parsed = data.data;

      // Populate Form Fields
      setTitle(parsed.title || '');
      setSalary(parsed.salary || 10030);
      setSalaryType(parsed.salary > 500000 ? 'Monthly' : 'Hourly');
      setCity(parsed.city || 'Seoul');
      setDistrict(parsed.district || '');
      setCategory(parsed.category || 'Other');
      setWorkingTime(parsed.working_time || '');
      setPhone(parsed.phone || '');
      setKakao(parsed.kakao || '');
      setAddress(parsed.address || `${parsed.city || 'Seoul'} ${parsed.district || ''}`);
      setCompany(parsed.company || 'Doanh nghiệp địa phương');
      
      // Auto generate detailed job description based on the parsed data
      setDescription(
        `[THÔNG TIN PHÂN TÍCH TỰ ĐỘNG BẰNG AI]\n\n` +
        `- Loại công việc: ${parsed.title}\n` +
        `- Ca làm việc: ${parsed.working_time}\n` +
        `- Địa điểm: ${parsed.city} ${parsed.district}\n` +
        `- Mức lương: ${parsed.salary.toLocaleString()} KRW\n\n` +
        `Nội dung tin gốc:\n"${rawText}"`
      );

      setParseMethod(data.method);
      if (data.warning) {
        setWarning(data.warning);
      }
      setFormVisible(true);
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống khi gửi yêu cầu phân tích.');
    } finally {
      setParsing(false);
    }
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !company || !address || !district || !workingTime || !description) {
      setError('Vui lòng điền đầy đủ các trường thông tin bắt buộc (*).');
      return;
    }

    try {
      const is_admin = currentUser?.role === 'admin';
      const payload = {
        title,
        company,
        salary,
        salaryType,
        city,
        district,
        address,
        category,
        workingTime,
        description,
        phone,
        kakao,
        line,
        source: 'User',
        status: is_admin ? 'approved' : 'pending' // Admin posts auto-approved, users go to pending
      };

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi gửi bài đăng lên máy chủ');
      }

      onJobCreated(data);
      setSuccessMsg(
        is_admin 
          ? 'Đăng tin thành công! Công việc đã được duyệt tự động và xuất hiện trên Bản đồ.'
          : 'Gửi bài đăng thành công! Tin tuyển dụng của bạn đang ở trạng thái Chờ phê duyệt từ Admin.'
      );
      
      // Reset form fields
      setRawText('');
      setTitle('');
      setCompany('');
      setDistrict('');
      setAddress('');
      setWorkingTime('');
      setDescription('');
      setPhone('');
      setKakao('');
      setLine('');
      if (mode === 'ai') {
        setFormVisible(false);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu bài đăng.');
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto my-12 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 sm:p-12 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 shadow-sm">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900">
              Yêu cầu đăng nhập tài khoản
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-lg mx-auto">
              Bạn cần đăng nhập tài khoản 86Job để sử dụng tính năng <strong className="text-slate-800">Đăng tin tuyển dụng (AI & Nhập thủ công)</strong>. Điều này giúp bảo vệ uy tín bài đăng và thông tin liên hệ cho cộng đồng du học sinh.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onOpenAuthModal?.('login', '🔒 Vui lòng đăng nhập để tạo bài đăng tuyển dụng!')}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 px-6 rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập ngay</span>
            </button>
            <button
              onClick={() => onOpenAuthModal?.('register')}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3.5 px-6 rounded-full border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>Tạo tài khoản mới</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Title & Mode Switcher */}
      <div className="text-center space-y-4">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
          Hệ thống Đăng tin tuyển dụng <span className="text-blue-600">86Job</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto">
          Tạo bài đăng nhanh chóng bằng Trí tuệ nhân tạo (AI) tự động trích xuất thông tin, hoặc tự điền biểu mẫu thủ công.
        </p>

        {/* Mode Toggle Buttons */}
        <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-xs">
          <button
            type="button"
            onClick={handleOpenAIMode}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              mode === 'ai'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Đăng tin bằng AI (Tự động)</span>
          </button>
          <button
            type="button"
            onClick={handleOpenManualForm}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              mode === 'manual'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-4 h-4 text-slate-600" />
            <span>Nhập thủ công (Form)</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800 text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">{successMsg}</p>
            <div className="mt-3 flex gap-4">
              <button 
                onClick={() => setActiveTab('jobs')}
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Xem danh sách việc làm
              </button>
              <button 
                onClick={() => setSuccessMsg(null)}
                className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
              >
                Tiếp tục đăng tin khác
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode AI Parser Box */}
      {mode === 'ai' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Left Input Field */}
          <div className="md:col-span-7 p-6 sm:p-8 space-y-6 border-b md:border-b-0 md:border-r border-slate-100">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900 font-display uppercase tracking-wider">
                <FileText className="w-4 h-4 text-blue-500" />
                Nội dung tuyển dụng thô
              </span>
              <span className="text-xs text-slate-400">Yêu cầu ít nhất 10 ký tự</span>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Dán nội dung bài tuyển dụng hoặc link vào đây... Ví dụ: 'Tuyển phục vụ bàn quán cà phê ở Seoul Mapo-gu...'"
              className="w-full h-56 p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all resize-none text-sm leading-relaxed"
            />

            {/* Quick Paste Templates */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bài viết mẫu (Thử nhanh)</p>
              <div className="flex flex-wrap gap-2">
                {templates.map((tpl, i) => (
                  <button
                    key={i}
                    id={`btn-template-${i}`}
                    onClick={() => handleApplyTemplate(tpl.text)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-[11px] font-semibold text-slate-600 rounded-full transition-colors cursor-pointer border border-slate-200/40"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Triggers */}
            <div className="space-y-2">
              <button
                id="btn-parse-ai"
                onClick={handleParseText}
                disabled={parsing}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-sm py-3.5 px-6 rounded-full shadow-md shadow-blue-500/10 hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
              >
                {parsing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI đang phân tích dữ liệu...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Phân tích bằng AI ✨</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenManualForm}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-blue-600 py-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Hoặc chuyển sang nhập thông tin thủ công</span>
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {warning && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2 text-amber-800 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>{warning}</span>
              </div>
            )}
          </div>

          {/* Right Info Box */}
          <div className="md:col-span-5 p-6 sm:p-8 bg-slate-50/50 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-display text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-500" />
                Hướng dẫn AI Parser
              </h3>
              <ul className="space-y-3.5 text-xs text-slate-500 leading-relaxed list-disc list-inside">
                <li>Bạn có thể copy bài đăng từ các <strong className="text-slate-800">Hội nhóm Facebook</strong>, tin nhắn Kakao, hoặc văn bản tự nhập.</li>
                <li>Hệ thống tự động quy đổi địa danh Hàn Quốc (ví dụ: "탄방동" → Daejeon Tanbang-dong, "신촌" → Seoul Mapo-gu).</li>
                <li>Lương tự động chuyển đổi sang số nguyên và phân tách đơn vị theo giờ (Hourly) hoặc tháng (Monthly).</li>
                <li>Nhận diện chính xác 6 loại ngành nghề cốt lõi cho du học sinh Việt Nam.</li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200/80">
              {parseMethod ? (
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-blue-500 uppercase">Trạng thái phân tích</p>
                  <p className="text-xs font-bold text-blue-900">
                    Phân tích bởi: <span className="text-blue-600 font-extrabold">{parseMethod}</span>
                  </p>
                  <p className="text-[10px] text-slate-400">Đã bóc tách thành công dữ liệu có cấu trúc JSON.</p>
                </div>
              ) : (
                <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium block">Form cấu trúc sẽ hiển thị sau khi AI chạy</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Job Entry Form (Shown in 'manual' mode OR when AI parsing finishes in 'ai' mode) */}
      {(mode === 'manual' || (mode === 'ai' && formVisible)) && (
        <form onSubmit={handleSubmitJob} className="bg-white rounded-2xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <h3 className="font-display text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" />
              <span>{mode === 'manual' ? 'Điền thông tin tuyển dụng thủ công' : 'Kiểm tra và chuẩn hóa thông tin tuyển dụng'}</span>
            </h3>
            {mode === 'ai' && (
              <span className="text-xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                ✨ Đã trích xuất bởi AI
              </span>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Tiêu đề tin tuyển dụng *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Ví dụ: Phụ bếp quán lẩu / 주방보조"
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-semibold"
              />
            </div>

            {/* Company */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Tên Công ty / Nhà hàng *</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                placeholder="Ví dụ: Baekjeong BBQ Shinchon"
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-semibold"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Danh mục Ngành nghề *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as JobCategory)}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-semibold cursor-pointer"
              >
                <option value="Restaurant">Nhà hàng / Quán ăn</option>
                <option value="Cafe">Cà phê / Bánh ngọt</option>
                <option value="Factory">Nhà xưởng / Công xưởng</option>
                <option value="Warehouse">Kho bãi / Coupang</option>
                <option value="Convenience Store">Cửa hàng tiện lợi</option>
                <option value="Office">Văn phòng / Dịch thuật</option>
                <option value="Other">Ngành nghề khác</option>
              </select>
            </div>

            {/* Salary Type & Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Hình thức & Mức lương *</label>
              <div className="flex gap-2">
                <select
                  value={salaryType}
                  onChange={(e) => setSalaryType(e.target.value as 'Hourly' | 'Monthly')}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:border-blue-500 outline-none transition-all text-sm font-semibold cursor-pointer"
                >
                  <option value="Hourly">Theo giờ</option>
                  <option value="Monthly">Theo tháng</option>
                </select>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(parseInt(e.target.value, 10) || 0)}
                  required
                  className="flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-extrabold"
                />
                <span className="p-3 text-sm font-bold text-slate-500">KRW</span>
              </div>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Tỉnh / Thành phố *</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-semibold cursor-pointer"
              >
                <option value="Seoul">Seoul (서울)</option>
                <option value="Daejeon">Daejeon (대전)</option>
                <option value="Busan">Busan (부산)</option>
                <option value="Incheon">Incheon (인천)</option>
                <option value="Gwangju">Gwangju (광주)</option>
                <option value="Daegu">Daegu (대구)</option>
                <option value="Gyeonggi">Gyeonggi (경기)</option>
              </select>
            </div>

            {/* District */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Quận / Phường / Dong *</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
                placeholder="Ví dụ: Mapo-gu hoặc Tanbang-dong"
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-semibold"
              />
            </div>

            {/* Detailed Address */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Địa chỉ cụ thể *</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                placeholder="Ví dụ: 서울특별시 마포구 백범로 35"
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-semibold"
              />
            </div>

            {/* Working Hours */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Ca làm việc / Thời gian làm *</label>
              <input
                type="text"
                value={workingTime}
                onChange={(e) => setWorkingTime(e.target.value)}
                required
                placeholder="Ví dụ: 18:00 ~ 23:00 (Thứ 2 đến Thứ 6)"
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-semibold"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Số điện thoại liên lạc</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 010-1234-5678"
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-semibold"
              />
            </div>

            {/* Kakao Talk */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">Kakao Talk ID (Nếu có)</label>
              <input
                type="text"
                value={kakao}
                onChange={(e) => setKakao(e.target.value)}
                placeholder="Ví dụ: compose_mapo"
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-semibold"
              />
            </div>

            {/* Job Description */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Mô tả chi tiết công việc *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={5}
                placeholder="Mô tả công việc, môi trường làm việc, yêu cầu tiếng Hàn (TOPIK) hoặc kinh nghiệm..."
                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm leading-relaxed"
              />
            </div>

          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm py-4 px-6 rounded-full shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer mt-4"
          >
            <Plus className="w-5 h-5" />
            <span>Đăng tin lên 86Job</span>
          </button>
        </form>
      )}

    </div>
  );
}
