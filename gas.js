/**
 * API communication with Google Apps Script
 */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyd1ykaY_RIr5bkZxz1aNmjwZ8dMMdYovAQ7HSKqROBxlExIiFXibQK-wIhwOTenksJqA/exec'; // To be updated by the user

const gasApi = {
    async get(action, params = {}) {
        const queryParams = new URLSearchParams({ action, ...params }).toString();
        const url = `${GAS_URL}?${queryParams}`;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                redirect: 'follow'
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('GAS returned non-JSON content:', text);
                throw new Error('回傳格式錯誤，請檢查 GAS 是否正確部署為「任何人」均可存取');
            }
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    },

    async post(action, data) {
        try {
            const response = await fetch(`${GAS_URL}?action=${action}`, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8' // GAS often requires text/plain for POST
                }
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    }
};

// Mock data for development if GAS_URL is not set
let mockSchedules = [];

const mockApi = {
    async get(action, params) {
        console.log(`Mocking GET: ${action}`, params);
        await new Promise(r => setTimeout(r, 800));
        
        switch(action) {
            case 'getServices':
                return { status: 'success', data: [
                    { service_id: 1, name: '美睫嫁接', duration: 90, price: 1500 },
                    { service_id: 2, name: '韓式霧眉', duration: 180, price: 8000 },
                    { service_id: 3, name: '手部深層保養', duration: 60, price: 1200 }
                ]};
            case 'getAvailableSlots':
                return { status: 'success', data: [
                    { time: '09:00', available: true },
                    { time: '10:00', available: false },
                    { time: '11:00', available: true },
                    { time: '13:00', available: true },
                    { time: '14:00', available: true },
                    { time: '15:00', available: true },
                    { time: '16:00', available: true },
                    { time: '17:00', available: true }
                ]};
            case 'getAllBookings':
                const today = new Date();
                const formatDateStr = (offset) => {
                    const d = new Date(today);
                    d.setDate(today.getDate() + offset);
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    return `${y}-${m}-${dd}`;
                };
                return { status: 'success', data: [
                    { booking_id: 'BK001', customer_name: 'Clarice', customer_phone: '0912345678', service_name: '美睫嫁接', price: 1500, duration: 90, date: formatDateStr(0), time: '13:00', status: 'confirmed', note: '加強眼尾拉提' },
                    { booking_id: 'BK002', customer_name: 'Amber', customer_phone: '0987654321', service_name: '韓式霧眉', price: 8000, duration: 180, date: formatDateStr(0), time: '13:00', status: 'confirmed', note: '無' },
                    { booking_id: 'BK003', customer_name: 'Clarice', customer_phone: '0912345678', service_name: '美睫嫁接', price: 1500, duration: 90, date: formatDateStr(1), time: '15:00', status: 'confirmed', note: '一般保養' },
                    { booking_id: 'BK004', customer_name: 'Amber', customer_phone: '0987654321', service_name: '韓式霧眉', price: 8000, duration: 180, date: formatDateStr(-1), time: '10:00', status: 'confirmed', note: '過敏體質需注意' }
                ]};
            case 'cancelBooking':
                return { status: 'success' };
            case 'getSchedules':
                return { status: 'success', data: mockSchedules };
            default:
                return { status: 'success', data: [] };
        }
    },
    async post(action, data) {
        console.log(`Mocking POST: ${action}`, data);
        await new Promise(r => setTimeout(r, 1500));
        if (action === 'updateSchedule') {
            const idx = mockSchedules.findIndex(s => s.date === data.date && s.time === data.time);
            if (data.available) {
                if (idx > -1) mockSchedules.splice(idx, 1);
            } else {
                if (idx > -1) {
                    mockSchedules[idx].available = false;
                } else {
                    mockSchedules.push({ date: data.date, time: data.time, available: false });
                }
            }
            return { status: 'success' };
        }
        return { status: 'success', bookingId: 'BK' + Date.now() };
    }
};

// Use mock if URL is placeholder
const api = (GAS_URL.includes('YOUR_GAS')) ? mockApi : gasApi;
