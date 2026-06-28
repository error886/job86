/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  getJobs, 
  getJobById, 
  addJob, 
  updateJobStatus, 
  deleteJob, 
  getBookmarks, 
  toggleBookmark, 
  loginOrRegister, 
  getCrawlerLogs, 
  addCrawlerLog,
  initializeDb
} from './server/db';
import { JobCategory, Job } from './src/types';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json());

// Lazy-initialized Gemini API client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      throw new Error('GEMINI_API_KEY is missing or not configured.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. GET /api/health
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. GET /api/jobs - Supports search and advanced filters
app.get('/api/jobs', async (req: Request, res: Response) => {
  try {
    const { q, city, category, minSalary, salaryType, status, userId } = req.query;
    let jobs = await getJobs();

    // Filtering by status. By default, regular users see approved jobs.
    // Admin can query pending or rejected.
    if (status) {
      jobs = jobs.filter(j => j.status === status);
    } else {
      jobs = jobs.filter(j => j.status === 'approved');
    }

    // Search query (title, company, description, city, district)
    if (q) {
      const searchStr = String(q).toLowerCase();
      jobs = jobs.filter(j => 
        j.title.toLowerCase().includes(searchStr) ||
        j.company.toLowerCase().includes(searchStr) ||
        j.description.toLowerCase().includes(searchStr) ||
        j.city.toLowerCase().includes(searchStr) ||
        j.district.toLowerCase().includes(searchStr)
      );
    }

    // City filter
    if (city && city !== 'All') {
      jobs = jobs.filter(j => j.city.toLowerCase() === String(city).toLowerCase());
    }

    // Category filter
    if (category && category !== 'All') {
      jobs = jobs.filter(j => j.category === String(category) as JobCategory);
    }

    // Salary type filter (Hourly / Monthly)
    if (salaryType && salaryType !== 'All') {
      jobs = jobs.filter(j => j.salaryType === salaryType);
    }

    // Min salary filter
    if (minSalary) {
      const minSal = parseInt(String(minSalary), 10);
      if (!isNaN(minSal)) {
        jobs = jobs.filter(j => j.salary >= minSal);
      }
    }

    res.json(jobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. GET /api/jobs/latest - Returns 3 latest approved jobs
app.get('/api/jobs/latest', async (req: Request, res: Response) => {
  try {
    const latestJobs = (await getJobs())
      .filter(j => j.status === 'approved')
      .slice(0, 3);
    res.json(latestJobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. GET /api/jobs/map - Map markers
app.get('/api/jobs/map', async (req: Request, res: Response) => {
  try {
    const approvedJobs = (await getJobs()).filter(j => j.status === 'approved');
    res.json(approvedJobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. GET /api/jobs/:id - Get detailed job
app.get('/api/jobs/:id', async (req: Request, res: Response) => {
  try {
    const job = await getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }
    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. POST /api/jobs - Post a new job
app.post('/api/jobs', async (req: Request, res: Response) => {
  try {
    const { 
      title, company, salary, salaryType, city, district, 
      address, category, workingTime, description, phone, 
      kakao, line, source, sourceUrl, latitude, longitude, status 
    } = req.body;

    if (!title || !company || !salary || !city || !district || !address || !category || !workingTime || !description) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin bắt buộc' });
    }

    // Standardize lat/long if not provided
    // Set mock coordinates close to the city center to render beautifully on the map
    let finalLat = parseFloat(latitude);
    let finalLong = parseFloat(longitude);

    if (isNaN(finalLat) || isNaN(finalLong)) {
      const cityCoords: Record<string, { lat: number; lng: number }> = {
        'seoul': { lat: 37.5665, lng: 126.9780 },
        'daejeon': { lat: 36.3504, lng: 127.3845 },
        'busan': { lat: 35.1796, lng: 129.0756 },
        'incheon': { lat: 37.4563, lng: 126.7052 },
        'gwangju': { lat: 35.1595, lng: 126.8526 },
        'daegu': { lat: 35.8714, lng: 128.6014 },
        'gyeonggi': { lat: 37.2635, lng: 127.0286 }
      };
      const searchKey = city.toLowerCase();
      const coords = cityCoords[searchKey] || { lat: 36.3504 + (Math.random() - 0.5) * 0.1, lng: 127.3845 + (Math.random() - 0.5) * 0.1 };
      
      // Add slight jitter so multiple jobs in the same city don't overlap completely
      finalLat = coords.lat + (Math.random() - 0.5) * 0.015;
      finalLong = coords.lng + (Math.random() - 0.5) * 0.015;
    }

    const jobData = {
      title,
      company,
      salary: parseInt(salary, 10),
      salaryType: salaryType || 'Hourly',
      city,
      district,
      address,
      category: category as JobCategory,
      workingTime,
      description,
      phone,
      kakao,
      line,
      source: source || 'User',
      sourceUrl,
      latitude: finalLat,
      longitude: finalLong,
      status: status || 'pending' // Admin postings can pass 'approved' immediately
    };

    const newJob = await addJob(jobData);
    res.status(201).json(newJob);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. POST /api/jobs/:id/status - Approve or reject a job (Admin only)
app.post('/api/jobs/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }
    const updatedJob = await updateJobStatus(req.params.id, status);
    if (!updatedJob) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }
    res.json(updatedJob);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. DELETE /api/jobs/:id - Delete a job
app.delete('/api/jobs/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteJob(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Không tìm thấy công việc để xóa' });
    }
    res.json({ success: true, message: 'Đã xóa công việc thành công' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. GET /api/bookmarks/:userId - Get bookmarks
app.get('/api/bookmarks/:userId', async (req: Request, res: Response) => {
  try {
    const bookmarks = await getBookmarks(req.params.userId);
    res.json(bookmarks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. POST /api/bookmarks/toggle - Toggle bookmark
app.post('/api/bookmarks/toggle', async (req: Request, res: Response) => {
  try {
    const { userId, jobId } = req.body;
    if (!userId || !jobId) {
      return res.status(400).json({ error: 'Thiếu userId hoặc jobId' });
    }
    const result = await toggleBookmark(userId, jobId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 11. POST /api/auth/login - Google/Kakao login simulation
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, name, avatar, role } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Thiếu email hoặc tên đăng nhập' });
    }
    const user = await loginOrRegister(email, name, avatar, role || 'user');
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 12. GET /api/crawler/logs - Get crawler/parser history
app.get('/api/crawler/logs', async (req: Request, res: Response) => {
  try {
    res.json(await getCrawlerLogs());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 13. POST /api/crawler/simulate - Simulate scanning Facebook links or Alba apps
app.post('/api/crawler/simulate', async (req: Request, res: Response) => {
  try {
    const { source, url } = req.body;
    if (!source) {
      return res.status(400).json({ error: 'Thiếu nguồn crawling' });
    }

    // List of simulated templates for jobs
    const templates = [
      {
        title: 'Nhân viên đóng gói quần áo tại xưởng Dongdaemun',
        company: 'Dongdaemun Logistics',
        salary: 10200,
        salaryType: 'Hourly',
        city: 'Seoul',
        district: 'Jung-gu',
        address: '서울특별시 중구 을지로 250',
        category: 'Factory',
        workingTime: '13:00 ~ 18:00 (Thứ 2 đến Thứ 6)',
        description: `Được tổng hợp từ tin tuyển dụng đăng trên ${source}. Cần tuyển du học sinh phụ giúp đóng gói, dán nhãn quần áo thời trang Dongdaemun. Công việc nhẹ nhàng, môi trường làm việc cùng nhiều bạn sinh viên Việt Nam khác.`,
        phone: '010-8585-7474',
        latitude: 37.566,
        longitude: 127.006,
        source: source.includes('Facebook') ? 'Facebook' : 'Alba',
        sourceUrl: url || 'https://facebook.com/groups/jobs/1'
      },
      {
        title: 'Tuyển phụ bếp quán súp xương bò',
        company: 'Gukbap Restaurant Seomyeon',
        salary: 11500,
        salaryType: 'Hourly',
        city: 'Busan',
        district: 'Busanjin-gu',
        address: '부산광역시 부산진구 서면로 60',
        category: 'Restaurant',
        workingTime: '17:00 ~ 22:00 (Cuối tuần)',
        description: `Tổng hợp từ ${source}. Công việc gồm dọn dẹp, rửa bát và chuẩn bị nguyên liệu phụ bếp. Được cung cấp cơm ca ngon miệng. Tiếng Hàn cơ bản.`,
        phone: '010-9090-4040',
        latitude: 35.158,
        longitude: 129.059,
        source: source.includes('Facebook') ? 'Facebook' : 'Karrot',
        sourceUrl: url || 'https://daangn.com/alba/detail/2'
      },
      {
        title: 'Nhân viên sắp xếp và quét dọn kho hàng mini',
        company: 'Self-Storage Korea',
        salary: 10800,
        salaryType: 'Hourly',
        city: 'Incheon',
        district: 'Yeonsu-gu',
        address: '인천광역시 연수구 송도동 22-1',
        category: 'Warehouse',
        workingTime: '09:00 ~ 14:00 (Thứ 2, 4, 6)',
        description: `Tìm thấy trên ${source}. Cần tuyển nhân viên sắp xếp thùng carton, vệ sinh kệ hàng. Môi trường thoáng mát, có điều hòa, không bụi bặm. Phù hợp cho sinh viên Songdo Campus.`,
        phone: '010-4321-8765',
        latitude: 37.382,
        longitude: 126.656,
        source: 'Alba',
        sourceUrl: url || 'https://albamon.com/recruit/3'
      }
    ];

    // Pick a random template
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    // Add job with pending state
    const newJob = await addJob({
      ...selectedTemplate,
      status: 'pending' // Must go through admin review
    } as any);

    // Add crawler log
    await addCrawlerLog(
      source,
      'success',
      `Đã phát hiện và phân tích thành công bài đăng "${newJob.title}" từ link: ${url || 'Nguồn mô phỏng'}. Tin đã được lưu ở trạng thái Chờ phê duyệt.`
    );

    res.json({ success: true, job: newJob });
  } catch (error: any) {
    await addCrawlerLog(
      req.body.source || 'Hệ thống',
      'failed',
      `Lỗi trong quá trình mô phỏng crawl: ${error.message}`
    );
    res.status(500).json({ error: error.message });
  }
});

// 14. POST /api/ai/parse - AI Parser with Gemini API (And full regex fallback)
app.post('/api/ai/parse', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text || String(text).trim() === '') {
    return res.status(400).json({ error: 'Nội dung văn bản phân tích không được để trống' });
  }

  const cleanText = String(text).trim();

  // -------------------------------------------------------------
  // REGEX FALLBACK ENGINE
  // -------------------------------------------------------------
  const regexFallback = () => {
    // 1. Extract Salary
    let salary = 9860; // default minimum wage 2024/2025
    const salaryMatch = cleanText.match(/(?:lương|시급|pay|급여|tiền\s+lương)\s*[:=]?\s*(\d+[\d\s.,]*)(?:원|vnd|k|đ)?/i) || cleanText.match(/(\d+[\d.,]*)\s*(?:원|won|sĩ\s+cấp|시급)/i);
    if (salaryMatch) {
      const parsedVal = parseInt(salaryMatch[1].replace(/[\s.,]/g, ''), 10);
      if (!isNaN(parsedVal) && parsedVal > 1000 && parsedVal < 1000000) {
        salary = parsedVal;
      }
    }

    // 2. Extract Phone
    let phone = '010-0000-0000';
    const phoneMatch = cleanText.match(/(010[-.\s]?\d{3,4}[-.\s]?\d{4})/) || cleanText.match(/(\d{10,11})/);
    if (phoneMatch) {
      const rawPhone = phoneMatch[1].replace(/[-.\s]/g, '');
      if (rawPhone.startsWith('010') && rawPhone.length === 11) {
        phone = `${rawPhone.substring(0, 3)}-${rawPhone.substring(3, 7)}-${rawPhone.substring(7)}`;
      } else {
        phone = phoneMatch[1];
      }
    }

    // 3. Extract City / District
    let city = 'Daejeon';
    let district = 'Tanbang-dong';
    
    const textLower = cleanText.toLowerCase();
    if (textLower.includes('seoul') || textLower.includes('서울') || textLower.includes('신촌') || textLower.includes('홍대') || textLower.includes('강남')) {
      city = 'Seoul';
      district = textLower.includes('mapo') || textLower.includes('마포') || textLower.includes('신촌') ? 'Mapo-gu' : 
                 textLower.includes('gangnam') || textLower.includes('강남') ? 'Gangnam-gu' : 'Jung-gu';
    } else if (textLower.includes('daejeon') || textLower.includes('대전') || textLower.includes('탄방동')) {
      city = 'Daejeon';
      district = textLower.includes('탄방동') || textLower.includes('tanbang') ? 'Tanbang-dong' : 'Yuseong-gu';
    } else if (textLower.includes('busan') || textLower.includes('부산') || textLower.includes('해운대')) {
      city = 'Busan';
      district = textLower.includes('haeundae') || textLower.includes('해운대') ? 'Haeundae-gu' : 'Seomyeon';
    } else if (textLower.includes('incheon') || textLower.includes('인천')) {
      city = 'Incheon';
      district = 'Yeonsu-gu';
    }

    // 4. Extract Category & Title
    let category: JobCategory = 'Other';
    let title = 'Tuyển dụng việc làm Part-time';

    if (textLower.includes('주방') || textLower.includes('bếp') || textLower.includes('phục vụ') || textLower.includes('서빙') || textLower.includes('식당') || textLower.includes('bưng bê')) {
      category = 'Restaurant';
      title = textLower.includes('주방') || textLower.includes('bếp') ? 'Phụ bếp / Rửa bát nhà hàng' : 'Nhân viên phục vụ quán ăn';
    } else if (textLower.includes('cafe') || textLower.includes('카페') || textLower.includes('커피') || textLower.includes('pha chế')) {
      category = 'Cafe';
      title = 'Nhân viên pha chế & phục vụ Cafe';
    } else if (textLower.includes('편의점') || textLower.includes('gs25') || textLower.includes('cu') || textLower.includes('tiện lợi') || textLower.includes('bán hàng')) {
      category = 'Convenience Store';
      title = 'Nhân viên bán hàng Cửa hàng tiện lợi';
    } else if (textLower.includes('공장') || textLower.includes('xưởng') || textLower.includes('đóng gói') || textLower.includes('제조') || textLower.includes('포장')) {
      category = 'Factory';
      title = textLower.includes('đóng gói') || textLower.includes('포장') ? 'Nhân viên đóng gói tại xưởng' : 'Lao động phổ thông tại xưởng máy';
    } else if (textLower.includes('kho') || textLower.includes('warehouse') || textLower.includes('coupang') || textLower.includes('물류') || textLower.includes('bốc xếp')) {
      category = 'Warehouse';
      title = textLower.includes('coupang') ? 'Nhân viên soạn hàng kho Coupang' : 'Nhân viên phân loại hàng hóa kho bãi';
    } else if (textLower.includes('văn phòng') || textLower.includes('office') || textLower.includes('사무') || textLower.includes('dịch thuật') || textLower.includes('번역')) {
      category = 'Office';
      title = textLower.includes('번역') || textLower.includes('dịch') ? 'Biên phiên dịch văn phòng' : 'Trợ lý hành chính văn phòng';
    }

    // 5. Working Time extraction
    let workingTime = 'Thời gian thỏa thuận';
    const timeMatch = cleanText.match(/(\d{1,2}\s*(?:h|시|시반|~|-)\s*\d{1,2}\s*(?:h|시|시반)?)/i) || cleanText.match(/((?:thứ|주|ca)\s*\d.*)/i);
    if (timeMatch) {
      workingTime = timeMatch[1].trim();
    }

    return {
      title,
      city,
      district,
      salary,
      working_time: workingTime,
      phone,
      category
    };
  };

  try {
    // Attempt parsing with real Gemini API
    const ai = getAiClient();
    
    const systemPrompt = `You are a professional Korean-Vietnamese Job Advertisement Parser.
Your task is to analyze raw text (which can be in Vietnamese, Korean, or mixed) and extract job posting parameters as structured JSON.
Rules for extraction:
1. "title": Short job title (e.g., "주방보조 / Phụ bếp", "Nhân viên pha chế"). Translating Korean job keywords to beautiful bilingual titles is preferred.
2. "city": City in South Korea. Must be capitalize-first English matching: 'Seoul', 'Daejeon', 'Busan', 'Incheon', 'Gyeonggi', 'Gwangju', 'Daegu'. If not specified, infer from location context or default to 'Seoul'.
3. "district": Neighborhood or district (e.g. 'Tanbang-dong', 'Mapo-gu', 'Gangnam-gu').
4. "salary": Hourly or monthly rate in KRW. Extract only integers. If hourly, it is typically between 9,000 and 20,000. If monthly, between 1,500,000 and 4,000,000. Default to 9860 if not specified.
5. "working_time": Working hours and days (e.g. "18:00~23:00 (Thứ 2 đến Thứ 6)" or "Ca tối cuối tuần").
6. "phone": Phone number formatted as '010-XXXX-XXXX' if found.
7. "category": Must be strictly one of these categories: 'Restaurant', 'Cafe', 'Factory', 'Warehouse', 'Convenience Store', 'Office', 'Other'. Look at the keywords:
   - 'Restaurant': kitchen, serving, washing, bưng bê, phụ bếp, nhà hàng, 식당, 주방, 홀서빙
   - 'Cafe': coffee, barista, pha chế, 카페, 바리스타
   - 'Factory': factory, manufacturing, packaging, xưởng, công xưởng, đóng gói, sản xuất, 공장, 포장, 제조
   - 'Warehouse': logistics, coupang, sorting, kho, kho bãi, soạn hàng, bốc xếp, 물류, 창고
   - 'Convenience Store': gs25, cu, 7-eleven, emart24, tiện lợi, bán hàng, 편의점, 마트
   - 'Office': admin, translator, consulting, văn phòng, biên dịch, trợ lý, 사무, 번역
   - 'Other': any other job.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: cleanText,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            city: { type: Type.STRING },
            district: { type: Type.STRING },
            salary: { type: Type.INTEGER },
            working_time: { type: Type.STRING },
            phone: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ['title', 'city', 'district', 'salary', 'working_time', 'phone', 'category']
        }
      }
    });

    const parsedResult = JSON.parse(response.text.trim());
    
    // Ensure category is valid
    const validCategories: JobCategory[] = ['Restaurant', 'Cafe', 'Factory', 'Warehouse', 'Convenience Store', 'Office', 'Other'];
    if (!validCategories.includes(parsedResult.category)) {
      parsedResult.category = 'Other';
    }

    await addCrawlerLog('AI Parser', 'success', 'Sử dụng thành công Gemini AI để phân tích tin tuyển dụng mới.');

    res.json({
      success: true,
      method: 'Gemini AI',
      data: parsedResult
    });

  } catch (err: any) {
    try {
      // Graceful fallback to Regex parser
      console.log('Gemini API is unavailable or missing key. Falling back to Local Parser Engine.', err.message);
      const mockParsed = regexFallback();
      
      try {
        await addCrawlerLog('Local RegEx Parser', 'success', 'Phân tích tin tuyển dụng qua thuật toán Regex địa phương (Gemini API Chưa cấu hình hoặc lỗi).');
      } catch (logErr: any) {
        console.warn('Failed to add crawler log during fallback:', logErr.message);
      }

      res.json({
        success: true,
        method: 'Local RegEx Fallback Engine',
        data: mockParsed,
        warning: 'Đang chạy trên cơ chế thu thập Regex vì GEMINI_API_KEY chưa cấu hình hoặc bị lỗi kết nối.'
      });
    } catch (fallbackErr: any) {
      console.error('Critical failure in local parser fallback:', fallbackErr);
      res.status(500).json({
        success: false,
        error: `Lỗi hệ thống trong quá trình phân tích dự phòng: ${fallbackErr.message}`
      });
    }
  }
});

// -------------------------------------------------------------
// VITE OR STATIC FILE SERVING MIDDLEWARE
// -------------------------------------------------------------
async function startServer() {
  // Initialize and seed firestore database
  await initializeDb();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[86Job Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
