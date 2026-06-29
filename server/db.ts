/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { User, Job, Bookmark, CrawlerLog } from '../src/types';

// Load config safely
let firebaseConfig: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.log('[Firebase] Warning: No firebase-applet-config.json file found. Checking environment variables...');
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig?.projectId;
const databaseId = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig?.firestoreDatabaseId;

export let db: any = null;

const isGoogleCloud = !!process.env.K_SERVICE || !!process.env.GOOGLE_CLOUD_PROJECT || !!process.env.GAE_ENV;
const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
const shouldConnectFirebase = !!projectId && (isGoogleCloud || hasServiceAccount || process.env.FORCE_FIREBASE === 'true');

if (shouldConnectFirebase) {
  try {
    if (getApps().length === 0) {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (serviceAccountJson) {
        try {
          const serviceAccount = JSON.parse(serviceAccountJson);
          initializeApp({
            credential: cert(serviceAccount),
            projectId: projectId,
          });
          console.log('[Firebase] Initialized with Service Account JSON.');
        } catch (credErr: any) {
          console.error('[Firebase] Failed to load Service Account JSON, falling back to default:', credErr.message);
          initializeApp({ projectId });
        }
      } else {
        initializeApp({ projectId });
      }
    }
    db = getFirestore(getApp(), databaseId);
    console.log('[Firebase] Firestore initialized successfully for project:', projectId, 'database:', databaseId || '(default)');
  } catch (err: any) {
    console.warn('[Firebase] Initialization warning (falling back to local db.json):', err.message);
    db = null;
  }
} else {
  if (projectId) {
    console.log('[Firebase] Firebase configuration found but credentials or GCP environment is missing. Skipping Firestore to prevent timeouts. Falling back to local db.json.');
  } else {
    console.log('[Firebase] No Firebase configuration found. Running with local db.json storage only.');
  }
}

// --- SUPABASE CONFIGURATION ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Supabase] Client initialized successfully.');
  } catch (err: any) {
    console.error('[Supabase] Initialization error:', err.message);
  }
} else {
  console.log('[Supabase] No Supabase credentials found. Running in hybrid/fallback mode.');
}

// --- SUPABASE DATA MAPPING HELPERS ---
function mapJobToDb(job: Job): any {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    salary: job.salary,
    salary_type: job.salaryType,
    city: job.city,
    district: job.district,
    address: job.address,
    category: job.category,
    working_time: job.workingTime,
    description: job.description,
    phone: job.phone || null,
    kakao: job.kakao || null,
    line: job.line || null,
    source: job.source,
    source_url: job.sourceUrl || null,
    latitude: job.latitude,
    longitude: job.longitude,
    created_at: job.createdAt,
    status: job.status,
    views: job.views
  };
}

function mapJobFromDb(row: any): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    salary: Number(row.salary),
    salaryType: row.salary_type,
    city: row.city,
    district: row.district,
    address: row.address,
    category: row.category,
    workingTime: row.working_time,
    description: row.description,
    phone: row.phone || undefined,
    kakao: row.kakao || undefined,
    line: row.line || undefined,
    source: row.source,
    sourceUrl: row.source_url || undefined,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    createdAt: row.created_at,
    status: row.status,
    views: Number(row.views || 0)
  };
}

function mapBookmarkToDb(b: Bookmark): any {
  return {
    id: b.id,
    user_id: b.userId,
    job_id: b.jobId,
    created_at: b.createdAt
  };
}

function mapBookmarkFromDb(row: any): Bookmark {
  return {
    id: row.id,
    userId: row.user_id,
    jobId: row.job_id,
    createdAt: row.created_at
  };
}

function mapUserToDb(u: User): any {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar || null,
    role: u.role,
    created_at: u.createdAt
  };
}

function mapUserFromDb(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar || undefined,
    role: row.role as 'user' | 'admin',
    createdAt: row.created_at
  };
}

function mapLogToDb(l: CrawlerLog): any {
  return {
    id: l.id,
    source: l.source,
    status: l.status,
    message: l.message,
    created_at: l.createdAt
  };
}

function mapLogFromDb(row: any): CrawlerLog {
  return {
    id: row.id,
    source: row.source,
    status: row.status as 'success' | 'failed',
    message: row.message,
    createdAt: row.created_at
  };
}

const DATA_PATH = process.env.DATA_PATH || process.cwd();
const DB_FILE = path.resolve(DATA_PATH, 'db.json');

// Ensure the directory for the database file exists
try {
  const dbDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch (dirErr: any) {
  console.error('[Database] Failed to create data directory:', dirErr.message);
}

const DEFAULT_USERS: User[] = [
  {
    id: 'u1',
    name: 'Nguyễn Văn Hải',
    email: 'hai.nguyen@student.kr',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: 'user',
    createdAt: new Date('2026-05-10T12:00:00Z').toISOString()
  },
  {
    id: 'u2',
    name: 'Admin 86Job',
    email: 'lechidaicma@gmail.com', // Setting default user to user's email
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    role: 'admin',
    createdAt: new Date('2026-01-01T08:00:00Z').toISOString()
  },
  {
    id: 'u3',
    name: 'Trần Thị Mai',
    email: 'mai.tran@student.kr',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    role: 'user',
    createdAt: new Date('2026-06-01T10:00:00Z').toISOString()
  }
];

const DEFAULT_JOBS: Job[] = [
  {
    id: 'j1',
    title: 'Nhân viên phục vụ quán lẩu nướng (주방/홀)',
    company: 'Baekjeong BBQ Gangnam',
    salary: 11000,
    salaryType: 'Hourly',
    city: 'Seoul',
    district: 'Gangnam-gu',
    address: '서울특별시 강남구 강nam-daero 94-gil 10',
    category: 'Restaurant',
    workingTime: '18:00 ~ 23:00 (Thứ 2 đến Thứ 6)',
    description: 'Tuyển du học sinh Việt Nam phục vụ bàn hoặc làm phụ bếp. Yêu cầu tiếng Hàn giao tiếp cơ bản (TOPIK 2 trở lên). Môi trường thân thiện, có hỗ trợ bữa ăn tối. Lương tăng theo năng lực.',
    phone: '010-1234-5678',
    kakao: 'baekjeong_gangnam',
    source: 'User',
    latitude: 37.498,
    longitude: 127.027,
    createdAt: new Date('2026-06-25T14:30:00Z').toISOString(),
    status: 'approved',
    views: 124
  },
  {
    id: 'j2',
    title: 'Part-time Pha chế & Thu ngân Cafe',
    company: 'Compose Coffee Mapo',
    salary: 10500,
    salaryType: 'Hourly',
    city: 'Seoul',
    district: 'Mapo-gu',
    address: '서울특별시 마포구 백범로 35',
    category: 'Cafe',
    workingTime: '08:00 ~ 13:00 (Thứ 7 & Chủ Nhật)',
    description: 'Cần tuyển 1 bạn du học sinh trực ca sáng cuối tuần. Công việc bao gồm pha chế các món nước cơ bản, thanh toán tại quầy và dọn dẹp quán. Tiếng Hàn TOPIK 3 trở lên vì cần giao tiếp với khách Hàn nhiều.',
    phone: '010-9876-5432',
    kakao: 'compose_mapo',
    source: 'Alba',
    sourceUrl: 'https://www.albamon.com/recruit/view/compose-coffee',
    latitude: 37.556,
    longitude: 126.923,
    createdAt: new Date('2026-06-26T09:15:00Z').toISOString(),
    status: 'approved',
    views: 89
  },
  {
    id: 'j3',
    title: 'Công nhân đóng gói sản phẩm mỹ phẩm',
    company: 'K-Beauty Packaging Factory',
    salary: 9860,
    salaryType: 'Hourly',
    city: 'Daejeon',
    district: 'Yuseong-gu',
    address: '대전광역시 유성구 테크노2로 120',
    category: 'Factory',
    workingTime: '09:00 ~ 18:00 (Thứ 2 đến Thứ 6)',
    description: 'Tuyển lao động part-time/full-time làm việc tại xưởng đóng gói mỹ phẩm. Không yêu cầu tiếng Hàn, công việc đơn giản chỉ cần nhanh tay. Chấp nhận các bạn visa D2, D4 chăm chỉ, chịu khó.',
    phone: '010-4444-5555',
    source: 'Karrot',
    latitude: 36.362,
    longitude: 127.341,
    createdAt: new Date('2026-06-24T11:00:00Z').toISOString(),
    status: 'approved',
    views: 210
  },
  {
    id: 'j4',
    title: 'Nhân viên soạn hàng kho Coupang (야간)',
    company: 'Coupang Logistics Center Incheon',
    salary: 13500,
    salaryType: 'Hourly',
    city: 'Incheon',
    district: 'Seo-gu',
    address: '인천광역시 서구 오류동 1650',
    category: 'Warehouse',
    workingTime: '19:00 ~ 03:00 (Đăng ký theo ngày)',
    description: 'Kho Coupang tuyển nhân viên soạn hàng ca đêm. Công việc bao gồm phân loại hàng hóa, đóng thùng hàng. Lương cao, có xe đưa đón từ ga lớn. Không yêu cầu tiếng Hàn cao, chỉ cần sức khỏe tốt.',
    phone: '010-1111-2222',
    source: 'Alba',
    sourceUrl: 'https://www.alba.co.kr/recruit/view/coupang-incheon',
    latitude: 37.456,
    longitude: 126.705,
    createdAt: new Date('2026-06-26T22:45:00Z').toISOString(),
    status: 'approved',
    views: 345
  },
  {
    id: 'j5',
    title: 'Nhân viên bán hàng GS25 ca đêm',
    company: 'GS25 Tanbang-dong',
    salary: 10000,
    salaryType: 'Hourly',
    city: 'Daejeon',
    district: 'Seo-gu',
    address: '대전광역시 서구 탄방로 55',
    category: 'Convenience Store',
    workingTime: '22:00 ~ 06:00 (Thứ 3 & Thứ 5)',
    description: 'Tuyển nhân viên trực đêm cửa hàng tiện lợi GS25. Yêu cầu tiếng Hàn giao tiếp tốt để giải quyết thanh toán, kiểm kho và nhận hàng hóa lúc sáng sớm. Ưu tiên các bạn sống gần khu vực Tanbang-dong.',
    phone: '010-8888-9999',
    kakao: 'gs25_tanbang',
    source: 'Karrot',
    latitude: 36.347,
    longitude: 127.389,
    createdAt: new Date('2026-06-27T02:00:00Z').toISOString(),
    status: 'approved',
    views: 64
  },
  {
    id: 'j6',
    title: 'Biên dịch viên tiếng Việt tại Văn phòng Du học',
    company: 'K-Study Global Office',
    salary: 2200000,
    salaryType: 'Monthly',
    city: 'Seoul',
    district: 'Mapo-gu',
    address: '서울특별시 마포구 신촌로 100',
    category: 'Office',
    workingTime: '09:00 ~ 18:00 (Thứ 2 đến Thứ 6)',
    description: 'Hỗ trợ dịch hồ sơ du học, viết nội dung fanpage tiếng Việt và tư vấn trực tiếp cho học sinh Việt Nam. Yêu cầu TOPIK 5 trở lên, sử dụng máy tính văn phòng thành thạo, cẩn thận, tỉ mỉ.',
    phone: '010-7777-8888',
    kakao: 'kstudy_global',
    source: 'User',
    latitude: 37.555,
    longitude: 126.936,
    createdAt: new Date('2026-06-23T16:00:00Z').toISOString(),
    status: 'approved',
    views: 180
  },
  {
    id: 'j7',
    title: '[Tuyển gấp] Rửa bát và Phụ bếp quán canh xương',
    company: 'Gamjatang Haeundae',
    salary: 12000,
    salaryType: 'Hourly',
    city: 'Busan',
    district: 'Haeundae-gu',
    address: '부산광역시 해운대구 우동 540-1',
    category: 'Restaurant',
    workingTime: '12:00 ~ 17:00 (Thứ Bảy, Chủ Nhật)',
    description: 'Quán canh xương tuyết Haeundae cần tuyển gấp 1 bạn nam phụ bếp, rửa bát, bưng bê nồi lẩu cuối tuần. Tiếng Hàn cơ bản nghe hiểu lời chủ dặn là được. Công việc mệt nhưng chủ nhà hàng rất tốt tính, thường xuyên cho đồ ăn mang về.',
    phone: '010-3333-2222',
    source: 'Facebook',
    sourceUrl: 'https://facebook.com/groups/vietnamkrjobs/permalink/999111',
    latitude: 35.159,
    longitude: 129.161,
    createdAt: new Date('2026-06-26T15:20:00Z').toISOString(),
    status: 'pending',
    views: 42
  }
];

const DEFAULT_BOOKMARKS: Bookmark[] = [
  {
    id: 'b1',
    userId: 'u1',
    jobId: 'j1',
    createdAt: new Date('2026-06-26T18:00:00Z').toISOString()
  },
  {
    id: 'b2',
    userId: 'u1',
    jobId: 'j4',
    createdAt: new Date('2026-06-27T01:00:00Z').toISOString()
  }
];

const DEFAULT_CRAWLER_LOGS: CrawlerLog[] = [
  {
    id: 'l1',
    source: 'Albamon',
    status: 'success',
    message: 'Quét thành công 45 công việc mới phù hợp với từ khóa "D2/D4 visa allowed".',
    createdAt: new Date('2026-06-27T06:00:00Z').toISOString()
  },
  {
    id: 'l2',
    source: 'Facebook Group (Du học sinh Hàn Quốc)',
    status: 'success',
    message: 'Phân tích thành công 12 bài đăng tuyển dụng tự động qua link Facebook.',
    createdAt: new Date('2026-06-27T05:30:00Z').toISOString()
  },
  {
    id: 'l3',
    source: 'Alba Heaven',
    status: 'failed',
    message: 'Lỗi timeout khi kết nối đến API mô phỏng của Alba Heaven.',
    createdAt: new Date('2026-06-27T04:00:00Z').toISOString()
  },
  {
    id: 'l4',
    source: 'Karrot Market (당근마켓)',
    status: 'success',
    message: 'Đã cập nhật vị trí và khoảng cách cho 8 công việc cafe/tiện lợi quanh Daejeon.',
    createdAt: new Date('2026-06-27T03:00:00Z').toISOString()
  }
];

// Helper to read local DB
function readLocalDb(): { users: User[]; jobs: Job[]; bookmarks: Bookmark[]; crawlerLogs: CrawlerLog[] } {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading local db:', err);
  }
  return {
    users: DEFAULT_USERS,
    jobs: DEFAULT_JOBS,
    bookmarks: DEFAULT_BOOKMARKS,
    crawlerLogs: DEFAULT_CRAWLER_LOGS
  };
}

// Helper to write local DB
function writeLocalDb(data: any): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing local db:', err);
  }
}

// Initialize and seed database if completely empty
export async function initializeDb(): Promise<void> {
  // Always ensure local db.json exists and is seeded if empty
  if (!fs.existsSync(DB_FILE)) {
    writeLocalDb({
      users: DEFAULT_USERS,
      jobs: DEFAULT_JOBS,
      bookmarks: DEFAULT_BOOKMARKS,
      crawlerLogs: DEFAULT_CRAWLER_LOGS
    });
  }

  if (!db) {
    console.log('[Database] Running in Local Storage Mode (using db.json).');
    return;
  }

  try {
    const jobsSnapshot = await db.collection('jobs').limit(1).get();
    if (jobsSnapshot.empty) {
      console.log('[Firestore] Database is empty. Seeding default data...');
      
      // Seed users
      const usersBatch = db.batch();
      DEFAULT_USERS.forEach(user => {
        const userRef = db.collection('users').doc(user.id);
        usersBatch.set(userRef, user);
      });
      await usersBatch.commit();
      
      // Seed jobs
      const jobsBatch = db.batch();
      DEFAULT_JOBS.forEach(job => {
        const jobRef = db.collection('jobs').doc(job.id);
        jobsBatch.set(jobRef, job);
      });
      await jobsBatch.commit();

      // Seed bookmarks
      const bookmarksBatch = db.batch();
      DEFAULT_BOOKMARKS.forEach(b => {
        const bRef = db.collection('bookmarks').doc(b.id);
        bookmarksBatch.set(bRef, b);
      });
      await bookmarksBatch.commit();

      // Seed crawler logs
      const logsBatch = db.batch();
      DEFAULT_CRAWLER_LOGS.forEach(log => {
        const logRef = db.collection('crawlerLogs').doc(log.id);
        logsBatch.set(logRef, log);
      });
      await logsBatch.commit();

      console.log('[Firestore] Seed data populated successfully!');
    } else {
      console.log('[Firestore] Database already has data. Skipping seed.');
    }
  } catch (error) {
    console.warn('[Firestore] Initialization warning (falling back to local db.json):', error instanceof Error ? error.message : error);
  }
}

// JOBS APIs
export async function getJobs(): Promise<Job[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const jobs = (data || []).map(mapJobFromDb);

      // Sync with local db.json
      const local = readLocalDb();
      local.jobs = jobs;
      writeLocalDb(local);

      return jobs;
    } catch (err: any) {
      console.warn('[Supabase] getJobs warning (falling back to Firestore/local DB):', err.message);
    }
  }

  if (!db) {
    const local = readLocalDb();
    return local.jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  try {
    const snapshot = await db.collection('jobs').get();
    const jobs: Job[] = [];
    snapshot.forEach(doc => {
      jobs.push(doc.data() as Job);
    });
    
    // Sync with local db.json
    const local = readLocalDb();
    local.jobs = jobs;
    writeLocalDb(local);

    return jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('[Firestore] getJobs warning (falling back to local db.json):', err instanceof Error ? err.message : err);
    const local = readLocalDb();
    return local.jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function getJobById(id: string): Promise<Job | undefined> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        const local = readLocalDb();
        return local.jobs.find(j => j.id === id);
      }

      const job = mapJobFromDb(data);
      const newViews = (job.views || 0) + 1;

      // Update views in background / async
      supabase
        .from('jobs')
        .update({ views: newViews })
        .eq('id', id)
        .then(({ error: uErr }: any) => {
          if (uErr) console.warn('[Supabase] Failed to update views:', uErr.message);
        });

      return { ...job, views: newViews };
    } catch (err: any) {
      console.warn('[Supabase] getJobById warning (falling back to Firestore/local DB):', err.message);
    }
  }

  if (!db) {
    const local = readLocalDb();
    const jobIndex = local.jobs.findIndex(j => j.id === id);
    if (jobIndex === -1) return undefined;
    
    // Update local views count
    local.jobs[jobIndex].views = (local.jobs[jobIndex].views || 0) + 1;
    writeLocalDb(local);
    return local.jobs[jobIndex];
  }
  try {
    const docRef = db.collection('jobs').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      // Check local db.json
      const local = readLocalDb();
      return local.jobs.find(j => j.id === id);
    }
    
    const job = docSnap.data() as Job;
    const newViews = (job.views || 0) + 1;
    await docRef.update({ views: newViews });
    
    return { ...job, views: newViews };
  } catch (err) {
    console.warn('[Firestore] getJobById warning (falling back to local db.json):', err instanceof Error ? err.message : err);
    const local = readLocalDb();
    const jobIndex = local.jobs.findIndex(j => j.id === id);
    if (jobIndex === -1) return undefined;
    
    // Update local views count
    local.jobs[jobIndex].views = (local.jobs[jobIndex].views || 0) + 1;
    writeLocalDb(local);
    return local.jobs[jobIndex];
  }
}

export async function addJob(job: Omit<Job, 'id' | 'createdAt' | 'views'>): Promise<Job> {
  const id = 'j_' + Math.random().toString(36).substr(2, 9);
  const newJob: Job = {
    ...job,
    id,
    createdAt: new Date().toISOString(),
    views: 0
  };

  // 1. Save to local DB first
  const local = readLocalDb();
  local.jobs.push(newJob);
  writeLocalDb(local);

  // 2. Try saving to Supabase if available
  if (supabase) {
    try {
      const { error } = await supabase
        .from('jobs')
        .insert(mapJobToDb(newJob));
      if (error) throw error;
    } catch (err: any) {
      console.warn('[Supabase] addJob warning (saved to local db.json only):', err.message);
    }
  }

  // 3. Try saving to Firestore if available
  if (db) {
    try {
      await db.collection('jobs').doc(id).set(newJob);
    } catch (err) {
      console.warn('[Firestore] addJob warning (saved to local db.json only):', err instanceof Error ? err.message : err);
    }
  }

  return newJob;
}

export async function updateJobStatus(id: string, status: 'approved' | 'rejected'): Promise<Job | undefined> {
  // Update local DB first
  const local = readLocalDb();
  const jobIndex = local.jobs.findIndex(j => j.id === id);
  if (jobIndex !== -1) {
    local.jobs[jobIndex].status = status;
    writeLocalDb(local);
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .update({ status })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (data) {
        return mapJobFromDb(data);
      }
    } catch (err: any) {
      console.warn('[Supabase] updateJobStatus warning (updated in local db.json only):', err.message);
    }
  }

  if (!db) {
    return jobIndex !== -1 ? local.jobs[jobIndex] : undefined;
  }

  // Try update in Firestore
  try {
    const docRef = db.collection('jobs').doc(id);
    await docRef.update({ status });
    const updatedSnap = await docRef.get();
    return updatedSnap.data() as Job;
  } catch (err) {
    console.warn('[Firestore] updateJobStatus warning (updated in local db.json only):', err instanceof Error ? err.message : err);
    return jobIndex !== -1 ? local.jobs[jobIndex] : undefined;
  }
}

export async function deleteJob(id: string): Promise<boolean> {
  // Update local DB first
  const local = readLocalDb();
  local.jobs = local.jobs.filter(j => j.id !== id);
  local.bookmarks = local.bookmarks.filter(b => b.jobId !== id);
  writeLocalDb(local);

  if (supabase) {
    try {
      // Delete bookmarks first in Supabase
      await supabase
        .from('bookmarks')
        .delete()
        .eq('job_id', id);

      // Delete job in Supabase
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      console.warn('[Supabase] deleteJob warning (deleted from local db.json only):', err.message);
    }
  }

  if (!db) {
    return true;
  }

  // Try Firestore delete
  try {
    await db.collection('jobs').doc(id).delete();
    
    // Also delete bookmarks associated with this job
    const bookmarksSnap = await db.collection('bookmarks').where('jobId', '==', id).get();
    const batch = db.batch();
    bookmarksSnap.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return true;
  } catch (err) {
    console.warn('[Firestore] deleteJob warning (deleted from local db.json only):', err instanceof Error ? err.message : err);
    return true; // Return true because local delete succeeded
  }
}

// BOOKMARKS
export async function getBookmarks(userId: string): Promise<Bookmark[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const bookmarks = (data || []).map(mapBookmarkFromDb);

      // Sync with local db.json
      const local = readLocalDb();
      local.bookmarks = local.bookmarks.filter(b => b.userId !== userId).concat(bookmarks);
      writeLocalDb(local);

      return bookmarks;
    } catch (err: any) {
      console.warn('[Supabase] getBookmarks warning (falling back to Firestore/local DB):', err.message);
    }
  }

  if (!db) {
    const local = readLocalDb();
    return local.bookmarks.filter(b => b.userId === userId);
  }
  try {
    const snapshot = await db.collection('bookmarks').where('userId', '==', userId).get();
    const bookmarks: Bookmark[] = [];
    snapshot.forEach(doc => {
      bookmarks.push(doc.data() as Bookmark);
    });

    // Sync with local db.json
    const local = readLocalDb();
    local.bookmarks = local.bookmarks.filter(b => b.userId !== userId).concat(bookmarks);
    writeLocalDb(local);

    return bookmarks;
  } catch (err) {
    console.warn('[Firestore] getBookmarks warning (falling back to local db.json):', err instanceof Error ? err.message : err);
    const local = readLocalDb();
    return local.bookmarks.filter(b => b.userId === userId);
  }
}

export async function toggleBookmark(userId: string, jobId: string): Promise<{ bookmarked: boolean; bookmarkId?: string }> {
  const local = readLocalDb();
  const existingIndex = local.bookmarks.findIndex(b => b.userId === userId && b.jobId === jobId);
  
  let isBookmarked = false;
  let newBookmarkId: string | undefined = undefined;

  if (existingIndex !== -1) {
    local.bookmarks.splice(existingIndex, 1);
    writeLocalDb(local);
  } else {
    newBookmarkId = 'b_' + Math.random().toString(36).substr(2, 9);
    const newBookmark: Bookmark = {
      id: newBookmarkId,
      userId,
      jobId,
      createdAt: new Date().toISOString()
    };
    local.bookmarks.push(newBookmark);
    writeLocalDb(local);
    isBookmarked = true;
  }

  if (supabase) {
    try {
      if (existingIndex !== -1) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', userId)
          .eq('job_id', jobId);
        if (error) throw error;
      } else if (newBookmarkId) {
        const newBookmark: Bookmark = {
          id: newBookmarkId,
          userId,
          jobId,
          createdAt: new Date().toISOString()
        };
        const { error } = await supabase
          .from('bookmarks')
          .insert(mapBookmarkToDb(newBookmark));
        if (error) throw error;
      }
    } catch (err: any) {
      console.warn('[Supabase] toggleBookmark warning (updated in local db.json only):', err.message);
    }
  }

  if (!db) {
    return { bookmarked: isBookmarked, bookmarkId: newBookmarkId };
  }

  // Try Firestore update
  try {
    const snapshot = await db.collection('bookmarks')
      .where('userId', '==', userId)
      .where('jobId', '==', jobId)
      .get();
    
    if (!snapshot.empty) {
      const deleteBatch = db.batch();
      snapshot.forEach(doc => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();
    } else if (newBookmarkId) {
      const newBookmark: Bookmark = {
        id: newBookmarkId,
        userId,
        jobId,
        createdAt: new Date().toISOString()
      };
      await db.collection('bookmarks').doc(newBookmarkId).set(newBookmark);
    }
  } catch (err) {
    console.warn('[Firestore] toggleBookmark warning (updated in local db.json only):', err instanceof Error ? err.message : err);
  }

  return { bookmarked: isBookmarked, bookmarkId: newBookmarkId };
}

// USERS AUTH
export async function getUsers(): Promise<User[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');

      if (error) throw error;

      const users = (data || []).map(mapUserFromDb);

      // Sync with local db.json
      const local = readLocalDb();
      local.users = users;
      writeLocalDb(local);

      return users;
    } catch (err: any) {
      console.warn('[Supabase] getUsers warning (falling back to Firestore/local DB):', err.message);
    }
  }

  if (!db) {
    const local = readLocalDb();
    return local.users;
  }
  try {
    const snapshot = await db.collection('users').get();
    const users: User[] = [];
    snapshot.forEach(doc => {
      users.push(doc.data() as User);
    });

    // Sync with local db.json
    const local = readLocalDb();
    local.users = users;
    writeLocalDb(local);

    return users;
  } catch (err) {
    console.warn('[Firestore] getUsers warning (falling back to local db.json):', err instanceof Error ? err.message : err);
    const local = readLocalDb();
    return local.users;
  }
}

export async function loginOrRegister(email: string, name: string, avatar: string, role: 'user' | 'admin' = 'user'): Promise<User> {
  const local = readLocalDb();
  const existingUser = local.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (existingUser) {
    return existingUser;
  }

  // Automatic admin role mapping
  const finalRole = (email.toLowerCase() === 'lechidaicma@gmail.com' || email.toLowerCase() === 'cuong.soft86@gmail.com') ? 'admin' : role;
  const id = 'u_' + Math.random().toString(36).substr(2, 9);
  const newUser: User = {
    id,
    name,
    email,
    avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    role: finalRole,
    createdAt: new Date().toISOString()
  };

  local.users.push(newUser);
  writeLocalDb(local);

  if (supabase) {
    try {
      const { error } = await supabase
        .from('users')
        .insert(mapUserToDb(newUser));
      if (error) throw error;
    } catch (err: any) {
      console.warn('[Supabase] loginOrRegister warning (saved to local db.json only):', err.message);
    }
  }

  // Try Firestore write if available
  if (db) {
    try {
      await db.collection('users').doc(id).set(newUser);
    } catch (err) {
      console.warn('[Firestore] loginOrRegister warning (saved to local db.json only):', err instanceof Error ? err.message : err);
    }
  }

  return newUser;
}

// CRAWLER LOGS
export async function getCrawlerLogs(): Promise<CrawlerLog[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('crawler_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const logs = (data || []).map(mapLogFromDb);

      const local = readLocalDb();
      local.crawlerLogs = logs;
      writeLocalDb(local);

      return logs;
    } catch (err: any) {
      console.warn('[Supabase] getCrawlerLogs warning (falling back to Firestore/local DB):', err.message);
    }
  }

  if (!db) {
    const local = readLocalDb();
    return local.crawlerLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  try {
    const snapshot = await db.collection('crawlerLogs').get();
    const logs: CrawlerLog[] = [];
    snapshot.forEach(doc => {
      logs.push(doc.data() as CrawlerLog);
    });

    const local = readLocalDb();
    local.crawlerLogs = logs;
    writeLocalDb(local);

    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('[Firestore] getCrawlerLogs warning (falling back to local db.json):', err instanceof Error ? err.message : err);
    const local = readLocalDb();
    return local.crawlerLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function addCrawlerLog(source: string, status: 'success' | 'failed', message: string): Promise<CrawlerLog> {
  const id = 'l_' + Math.random().toString(36).substr(2, 9);
  const newLog: CrawlerLog = {
    id,
    source,
    status,
    message,
    createdAt: new Date().toISOString()
  };

  // Save to local
  const local = readLocalDb();
  local.crawlerLogs.push(newLog);
  if (local.crawlerLogs.length > 50) {
    local.crawlerLogs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    local.crawlerLogs = local.crawlerLogs.slice(0, 50);
  }
  writeLocalDb(local);

  if (supabase) {
    try {
      const { error } = await supabase
        .from('crawler_logs')
        .insert(mapLogToDb(newLog));
      if (error) throw error;

      // Optional async pruning in Supabase
      supabase
        .from('crawler_logs')
        .select('id', { count: 'exact', head: true })
        .then(({ count, error: countErr }: any) => {
          if (!countErr && count && count > 50) {
            supabase
              .from('crawler_logs')
              .select('id')
              .order('created_at', { ascending: false })
              .range(50, 100)
              .then(({ data: oldLogs }: any) => {
                if (oldLogs && oldLogs.length > 0) {
                  const idsToDelete = oldLogs.map((l: any) => l.id);
                  supabase
                    .from('crawler_logs')
                    .delete()
                    .in('id', idsToDelete);
                }
              });
          }
        });
    } catch (err: any) {
      console.warn('[Supabase] addCrawlerLog warning (saved to local db.json only):', err.message);
    }
  }

  // Try Firestore write if available
  if (db) {
    try {
      await db.collection('crawlerLogs').doc(id).set(newLog);
      
      // Optionally prune old logs in background to prevent unbounded collection size
      const allLogsSnapshot = await db.collection('crawlerLogs').get();
      if (allLogsSnapshot.size > 50) {
        const logs = allLogsSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() as CrawlerLog }));
        logs.sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime());
        
        const logsToDelete = logs.slice(50);
        const pruneBatch = db.batch();
        logsToDelete.forEach(log => {
          pruneBatch.delete(db.collection('crawlerLogs').doc(log.id));
        });
        await pruneBatch.commit();
      }
    } catch (err) {
      console.warn('[Firestore] addCrawlerLog warning (saved to local db.json only):', err instanceof Error ? err.message : err);
    }
  }

  return newLog;
}
