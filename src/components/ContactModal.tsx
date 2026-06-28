/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Mail, Phone, MessageSquare, Send, CheckCircle, HelpCircle } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !msg) return;
    setSubmitted(true);
    setTimeout(() => {
      setName('');
      setEmail('');
      setMsg('');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200/80 max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <h3 className="font-display text-base font-extrabold text-slate-950">Liên hệ Ban quản trị 86Job</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6">
          {submitted ? (
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-display text-lg font-extrabold text-slate-950">Gửi lời nhắn thành công!</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Cảm ơn bạn đã gửi đóng góp ý kiến. Ban quản trị du học sinh sẽ phản hồi lại email của bạn trong vòng 24h.</p>
              </div>
              <button 
                onClick={() => setSubmitted(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-6 rounded-full shadow cursor-pointer transition-colors"
              >
                Gửi lời nhắn khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-xs font-semibold outline-none focus:border-blue-500/80"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email liên lạc *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@student.kr"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-xs font-semibold outline-none focus:border-blue-500/80"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nội dung đóng góp ý kiến / Giải đáp visa *</label>
                <textarea
                  required
                  rows={4}
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Nhập phản hồi, lỗi hệ thống, hoặc đề nghị hỗ trợ chuyển đổi visa D2/D4 sang E7..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-xs font-medium outline-none focus:border-blue-500/80 resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold py-3.5 px-4 rounded-full shadow-md transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi lời nhắn liên hệ</span>
              </button>
            </form>
          )}

          {/* Quick Contact cards */}
          <div className="pt-5 border-t border-slate-100 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                <p className="text-xs font-bold text-slate-700">support@kjobvn.vn</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hotline Korea</p>
                <p className="text-xs font-bold text-slate-700">+82 10-2345-6789</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
