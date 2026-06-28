/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export type JobCategory = 'Restaurant' | 'Cafe' | 'Factory' | 'Warehouse' | 'Convenience Store' | 'Office' | 'Other';

export interface Job {
  id: string;
  title: string;
  company: string;
  salary: number;
  salaryType: 'Hourly' | 'Monthly';
  city: string; // e.g., Seoul, Daejeon, Busan
  district: string; // e.g., Tanbang-dong, Mapo-gu
  address: string;
  category: JobCategory;
  workingTime: string; // e.g., "18:00~23:00" or "Part-time"
  description: string;
  phone?: string;
  kakao?: string;
  line?: string;
  source: 'User' | 'Facebook' | 'Alba' | 'Karrot';
  sourceUrl?: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  views: number;
}

export interface Bookmark {
  id: string;
  userId: string;
  jobId: string;
  createdAt: string;
}

export interface CrawlerLog {
  id: string;
  source: string;
  status: 'success' | 'failed';
  message: string;
  createdAt: string;
}

export interface AIParserResult {
  title: string;
  city: string;
  district: string;
  salary: number;
  working_time: string;
  phone: string;
  category: JobCategory;
}
