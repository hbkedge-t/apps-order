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
                return { status: 'success', data: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] };
            default:
                return { status: 'success', data: [] };
        }
    },
    async post(action, data) {
        console.log(`Mocking POST: ${action}`, data);
        await new Promise(r => setTimeout(r, 1500));
        return { status: 'success', bookingId: 'BK' + Date.now() };
    }
};

// Use mock if URL is placeholder
const api = (GAS_URL.includes('YOUR_GAS')) ? mockApi : gasApi;
