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
let mockServices = [
    { service_id: 1, name: '首次諮詢預約', duration: 30, price: 0, type: '首次預約' },
    { service_id: 2, name: '單堂睫毛嫁接', duration: 90, price: 1500, type: '單堂' },
    { service_id: 3, name: '單堂基礎保養', duration: 60, price: 1200, type: '單堂' },
    { service_id: 4, name: '包卡美睫保養（5堂）', duration: 90, price: 6000, type: '包卡' },
    { service_id: 5, name: '包卡手部美甲（3堂）', duration: 60, price: 3000, type: '包卡' }
];

let mockBookings = [
    { booking_id: 'BK001', customer_name: 'Clarice', customer_phone: '0912345678', service_id: 2, service_name: '單堂睫毛嫁接', price: 1500, duration: 90, date: '2026-06-15', time: '13:00', status: 'confirmed', note: '加強眼尾拉提', addon_massage: '是', created_at: new Date() },
    { booking_id: 'BK002', customer_name: 'Amber', customer_phone: '0987654321', service_id: 1, service_name: '首次諮詢預約', price: 0, duration: 30, date: '2026-06-16', time: '13:00', status: 'confirmed', note: '無', addon_massage: '否', created_at: new Date() }
];

const mockApi = {
    async get(action, params) {
        console.log(`Mocking GET: ${action}`, params);
        await new Promise(r => setTimeout(r, 600));
        
        switch(action) {
            case 'getServices':
                return { status: 'success', data: mockServices };
            case 'deleteService':
                const idToDelete = parseInt(params.serviceId);
                mockServices = mockServices.filter(s => s.service_id !== idToDelete);
                return { status: 'success' };
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
                return { status: 'success', data: mockBookings.map(b => {
                    const s = mockServices.find(srv => srv.service_id == b.service_id);
                    return {
                        ...b,
                        service_name: s ? s.name : b.service_name,
                        price: s ? s.price : b.price,
                        duration: s ? s.duration : b.duration
                    };
                })};
            case 'getUserBookings':
                const phone = params.phone;
                const filtered = mockBookings.filter(b => b.customer_phone === phone).map(b => {
                    const s = mockServices.find(srv => srv.service_id == b.service_id);
                    return {
                        booking_id: b.booking_id,
                        customer_id: 'CU_MOCK',
                        service_id: b.service_id,
                        service_name: s ? s.name : b.service_name,
                        addon_massage: b.addon_massage || '否',
                        date: b.date,
                        time: b.time,
                        status: b.status,
                        note: b.note,
                        created_at: b.created_at
                    };
                });
                return { status: 'success', data: filtered };
            case 'cancelBooking':
                const bookingId = params.bookingId;
                const bIdx = mockBookings.findIndex(b => b.booking_id === bookingId);
                if (bIdx > -1) {
                    mockBookings[bIdx].status = 'cancelled';
                    return { status: 'success' };
                }
                return { status: 'error', message: 'Booking not found' };
            case 'getSchedules':
                return { status: 'success', data: mockSchedules };
            default:
                return { status: 'success', data: [] };
        }
    },
    async post(action, data) {
        console.log(`Mocking POST: ${action}`, data);
        await new Promise(r => setTimeout(r, 800));
        
        switch(action) {
            case 'updateSchedule':
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
            case 'createBooking':
                const newBookingId = 'BK' + Date.now();
                const s = mockServices.find(srv => srv.service_id == data.serviceId);
                mockBookings.push({
                    booking_id: newBookingId,
                    customer_name: data.name,
                    customer_phone: data.phone,
                    service_id: data.serviceId,
                    service_name: s ? s.name : '未知服務',
                    price: s ? s.price : 0,
                    duration: s ? s.duration : 60,
                    date: data.date,
                    time: data.time,
                    status: 'confirmed',
                    note: data.note || '',
                    addon_massage: data.addonMassage || '否',
                    created_at: new Date()
                });
                return { status: 'success', bookingId: newBookingId };
            case 'addService':
                const newId = mockServices.length > 0 ? Math.max(...mockServices.map(srv => srv.service_id)) + 1 : 1;
                mockServices.push({
                    service_id: newId,
                    name: data.name,
                    duration: parseInt(data.duration),
                    price: parseFloat(data.price),
                    type: data.type || '單堂'
                });
                return { status: 'success', service_id: newId };
            case 'updateService':
                const sIdx = mockServices.findIndex(srv => srv.service_id == data.service_id);
                if (sIdx > -1) {
                    mockServices[sIdx] = {
                        service_id: parseInt(data.service_id),
                        name: data.name,
                        duration: parseInt(data.duration),
                        price: parseFloat(data.price),
                        type: data.type
                    };
                    return { status: 'success' };
                }
                return { status: 'error', message: 'Service not found' };
            default:
                return { status: 'success' };
        }
    }
};

// Use mock if URL is placeholder, if protocol is file://, or on localhost / mock query param
const api = (
    GAS_URL.includes('YOUR_GAS') || 
    window.location.search.includes('mock=true') || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.protocol === 'file:'
) ? mockApi : gasApi;
