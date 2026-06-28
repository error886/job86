/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Briefcase, Map, Heart, Send, MessageSquare, Shield, LogIn, LogOut, Menu, X, User } from 'lucide-react';
import { User as UserType } from '../types';
import Logo from './Logo';

interface HeaderProps {
  currentUser: UserType | null;
  onLogin: (email: string, name: string, avatar: string, role: 'user' | 'admin') => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenContact: () => void;
}

export default function Header({ 
  currentUser, 
  onLogin, 
  onLogout, 
  activeTab, 
  setActiveTab,
  onOpenContact
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);

  const menuItems = [
    { id: 'jobs', label: 'Bản đồ việc làm', icon: Map },
    { id: 'parse', label: 'Phân tích AI ✨', icon: Send },
    { id: 'bookmarks', label: 'Yêu thích', icon: Heart },
  ];

  const handleQuickLogin = (role: 'user' | 'admin') => {
    if (role === 'admin') {
      onLogin('lechidaicma@gmail.com', 'Admin 86Job', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'admin');
    } else {
      onLogin('sinhvien.hanquoc@student.kr', 'Nguyễn Minh Anh', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'user');
    }
    setShowLoginDropdown(false);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-[1000] w-full bg-white/80 border-b border-slate-200/80 backdrop-blur-md shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('jobs')}>
            <div className="flex flex-col">
              <Logo className="h-9 w-auto" />
              <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase block -mt-1 pl-1">
                Việc làm thêm Hàn Quốc
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}

            {/* Admin panel only visible to Admin */}
            {currentUser?.role === 'admin' && (
              <button
                id="nav-admin"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-purple-600 hover:bg-purple-50/50'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </button>
            )}

            <button
              onClick={onOpenContact}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              Liên hệ
            </button>
          </nav>

          {/* User Section (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {currentUser.role === 'admin' ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">
                        Học sinh
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {currentUser.email.split('@')[0]}
                    </span>
                  </div>
                </div>
                <div className="relative group">
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name} 
                    className="w-10 h-10 rounded-full border-2 border-slate-100 shadow-sm cursor-pointer"
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200/80 py-1 hidden group-hover:block hover:block z-[2000]">
                    <button 
                      onClick={onLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <button
                  id="btn-login-trigger"
                  onClick={() => setShowLoginDropdown(!showLoginDropdown)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-full shadow-md hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Đăng nhập
                </button>

                {showLoginDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200/80 py-2 z-[2000] animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-1.5 border-b border-slate-100/50 mb-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Chọn tài khoản giả lập
                      </span>
                    </div>
                    <button
                      id="btn-login-student"
                      onClick={() => handleQuickLogin('user')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 font-medium transition-colors text-left cursor-pointer"
                    >
                      <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50" className="w-6 h-6 rounded-full" />
                      <div>
                        <p className="font-bold text-xs">Du học sinh</p>
                        <p className="text-[10px] text-slate-400 leading-none mt-0.5">Quick Student Login</p>
                      </div>
                    </button>
                    <button
                      id="btn-login-admin"
                      onClick={() => handleQuickLogin('admin')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-600 font-medium transition-colors text-left cursor-pointer"
                    >
                      <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50" className="w-6 h-6 rounded-full" />
                      <div>
                        <p className="font-bold text-xs text-purple-700">Admin</p>
                        <p className="text-[10px] text-slate-400 leading-none mt-0.5">Quick Admin Login</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {currentUser && (
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-8 h-8 rounded-full border border-gray-100"
              />
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md px-4 pt-2 pb-6 space-y-1 shadow-lg animate-in fade-in duration-200">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => {
                setActiveTab('admin');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-purple-600 hover:bg-purple-50'
              }`}
            >
              <Shield className="w-5 h-5" />
              Admin Panel
            </button>
          )}

          <button
            onClick={() => {
              onOpenContact();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
          >
            <MessageSquare className="w-5 h-5" />
            Liên hệ
          </button>

          <div className="pt-4 border-t border-gray-100 mt-4">
            {currentUser ? (
              <div className="space-y-3">
                <div className="px-4">
                  <p className="font-bold text-gray-900">{currentUser.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{currentUser.email}</p>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 font-bold text-base rounded-xl cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 px-4 uppercase tracking-wider mb-2">Đăng nhập nhanh (Simulate)</p>
                <div className="grid grid-cols-2 gap-2 px-2">
                  <button
                    onClick={() => handleQuickLogin('user')}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-blue-200 text-blue-600 bg-blue-50 text-xs font-bold cursor-pointer"
                  >
                    Du học sinh
                  </button>
                  <button
                    onClick={() => handleQuickLogin('admin')}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-purple-200 text-purple-600 bg-purple-50 text-xs font-bold cursor-pointer"
                  >
                    Admin
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
