/**
 * Main Application Logic
 */

// State Management
const state = {
    currentSection: 'home',
    booking: {
        step: 1,
        service: null,
        date: '',
        time: '',
        name: '',
        phone: '',
        note: ''
    },
    services: []
};

// Router
const router = {
    navigate(sectionId) {
        // Update URL hash
        window.location.hash = sectionId;
        
        // Update UI
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');
        
        // Update Nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${sectionId}`) {
                item.classList.add('active');
            }
        });

        state.currentSection = sectionId;
        
        // Section specific initializations
        if (sectionId === 'booking') this.initBooking();
    },

    async initBooking() {
        if (state.services.length === 0) {
            await loadServices();
        }
        updateBookingStep(1);
        renderServiceOptions();
    }
};

// Initialization
window.addEventListener('load', () => {
    // Handle initial route
    const initialHash = window.location.hash.substring(1) || 'home';
    router.navigate(initialHash);

    // Initial data load
    loadServices();

    // Event Listeners
    setupEventListeners();
});

// Load Services
async function loadServices() {
    const container = document.getElementById('service-options');
    const grid = document.getElementById('services-grid');
    
    if (container) container.innerHTML = '<div class="loader">讀取服務中...</div>';
    
    try {
        const res = await api.get('getServices');
        if (res.status === 'success') {
            state.services = res.data;
            renderServicesGrid(res.data);
            renderServiceOptions();
        } else {
            throw new Error(res.message || '未知錯誤');
        }
    } catch (err) {
        console.error('Failed to load services', err);
        if (container) container.innerHTML = `<div class="error">載入失敗: ${err.message}</div>`;
        if (grid) grid.innerHTML = `<div class="error">無法載入服務項目</div>`;
    }
}

function renderServicesGrid(services) {
    const grid = document.getElementById('services-grid');
    grid.innerHTML = services.map(s => `
        <div class="service-card" onclick="startBooking(${s.service_id})">
            <img src="S__13189122.jpg" alt="Service" class="service-card-img" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjBlNmU3Ii8+PC9zdmc+'" />
            <div class="service-card-content">
                <h4 class="service-card-title">${s.name}</h4>
                <p class="service-card-meta">Today <span class="service-card-meta-dot"></span> $${s.price} <span class="service-card-meta-dot"></span> ${s.duration} mins</p>
                <div class="service-badge">LAST MINUTE</div>
            </div>
            <div class="service-discount">預約</div>
        </div>
    `).join('');
    if (window.lucide) {
        lucide.createIcons();
    }
}

function startBooking(serviceId) {
    state.booking.service = state.services.find(s => s.service_id == serviceId);
    router.navigate('booking');
    updateBookingStep(1);
    renderServiceOptions();
}

// Booking Flow Logic
function updateBookingStep(step) {
    state.booking.step = step;
    
    // Update Indicators
    document.querySelectorAll('.step').forEach(el => {
        const s = parseInt(el.dataset.step);
        el.classList.remove('active', 'completed');
        if (s === step) el.classList.add('active');
        if (s < step) el.classList.add('completed');
    });

    // Show/Hide Form Steps
    document.querySelectorAll('.form-step').forEach((el, index) => {
        el.classList.toggle('active', index + 1 === step);
    });

    if (step === 2) {
        if (!state.booking.date) {
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            state.booking.date = dateStr;
            const input = document.getElementById('booking-date');
            if (input) input.value = dateStr;
            loadAvailableSlots();
        }
        renderDateList();
    }
}

function renderDateList() {
    const list = document.getElementById('date-list');
    if (!list) return;

    const dates = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay());

    for (let i = 0; i < 42; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        dates.push(d);
    }

    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    list.innerHTML = dates.map((d, i) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const dayNum = d.getDate();
        
        const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const isPast = dMidnight < todayMidnight;
        
        const showMonth = (dayNum === 1 || i === 0);
        const displayDay = showMonth ? `${d.getMonth() + 1}/${dayNum}` : `${dayNum}`;
        const labelClass = showMonth ? 'date-day-num month-start' : 'date-day-num';
        
        return `
            <div class="date-item ${state.booking.date === dateStr ? 'selected' : ''} ${isPast ? 'disabled' : ''}" 
                 ${isPast ? '' : `onclick="selectDate('${dateStr}')"`}>
                <span class="${labelClass}">${displayDay}</span>
            </div>
        `;
    }).join('');
}

function selectDate(dateStr) {
    state.booking.date = dateStr;
    const input = document.getElementById('booking-date');
    if (input) {
        input.value = dateStr;
        input.dispatchEvent(new Event('change'));
    }
    renderDateList();
}

function renderServiceOptions() {
    const container = document.getElementById('service-options');
    if (!container) return;

    if (state.services.length === 0) {
        container.innerHTML = '<div class="empty">目前無可用服務</div>';
        return;
    }

    container.innerHTML = state.services.map(s => `
        <div class="service-card ${state.booking.service?.service_id == s.service_id ? 'selected' : ''}" 
             onclick="selectService('${s.service_id}')">
            <img src="S__13189122.jpg" alt="Service" class="service-card-img" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjBlNmU3Ii8+PC9zdmc+'" />
            <div class="service-card-content">
                <h4 class="service-card-title">${s.name}</h4>
                <p class="service-card-meta">Today <span class="service-card-meta-dot"></span> $${s.price} <span class="service-card-meta-dot"></span> ${s.duration} mins</p>
                <div class="service-badge">選擇</div>
            </div>
        </div>
    `).join('');
    
    validateStep1();
}

function selectService(id) {
    state.booking.service = state.services.find(s => s.service_id == id);
    renderServiceOptions();
}

function validateStep1() {
    const nextBtn = document.querySelector('#step-1 .next-step');
    nextBtn.disabled = !state.booking.service;
}

// Date & Time Logic
async function loadAvailableSlots() {
    const date = document.getElementById('booking-date').value;
    if (!date) return;
    
    state.booking.date = date;
    const timeGrid = document.getElementById('time-slots');
    timeGrid.innerHTML = '<div class="loader">讀取時段中...</div>';
    
    try {
        const res = await api.get('getAvailableSlots', { 
            serviceId: state.booking.service.service_id,
            date: date 
        });
        
        if (res.status === 'success') {
            renderTimeSlots(res.data);
        }
    } catch (err) {
        timeGrid.innerHTML = '<div class="error">無法取得時段</div>';
    }
}

function renderTimeSlots(slots) {
    const grid = document.getElementById('time-slots');
    if (slots.length === 0) {
        grid.innerHTML = '<div class="empty">此日期已無可預約時段</div>';
        return;
    }
    
    grid.innerHTML = slots.map(slot => `
        <div class="option-item slot-item ${state.booking.time === slot ? 'selected' : ''}" 
             onclick="selectTime('${slot}')">
            ${slot}
        </div>
    `).join('');
    
    validateStep2();
}

function selectTime(time) {
    state.booking.time = time;
    renderTimeSlots(document.querySelectorAll('.slot-item').length > 0 ? 
        Array.from(document.querySelectorAll('.slot-item')).map(el => el.innerText.trim()) : []);
}

function validateStep2() {
    const nextBtn = document.querySelector('#step-2 .next-step');
    nextBtn.disabled = !state.booking.date || !state.booking.time;
}

// Event Listeners Setup
function setupEventListeners() {
    // Next/Prev Buttons
    document.querySelectorAll('.next-step').forEach(btn => {
        btn.addEventListener('click', () => updateBookingStep(state.booking.step + 1));
    });
    
    document.querySelectorAll('.prev-step').forEach(btn => {
        btn.addEventListener('click', () => updateBookingStep(state.booking.step - 1));
    });

    // Date Change
    document.getElementById('booking-date').addEventListener('change', loadAvailableSlots);

    // Form Submit
    document.getElementById('booking-form').addEventListener('submit', handleBookingSubmit);

    // Search
    document.getElementById('btn-search').addEventListener('click', handleSearch);
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    
    state.booking.name = document.getElementById('user-name').value;
    state.booking.phone = document.getElementById('user-phone').value;
    state.booking.note = document.getElementById('user-note').value;

    Swal.fire({
        title: '確認預約內容',
        html: `
            服務：${state.booking.service.name}<br>
            時間：${state.booking.date} ${state.booking.time}<br>
            姓名：${state.booking.name}
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '確定預約',
        cancelButtonText: '返回修改',
        confirmButtonColor: '#6366f1'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                Swal.showLoading();
                const res = await api.post('createBooking', {
                    serviceId: state.booking.service.service_id,
                    date: state.booking.date,
                    time: state.booking.time,
                    name: state.booking.name,
                    phone: state.booking.phone,
                    note: state.booking.note
                });

                if (res.status === 'success') {
                    Swal.fire({
                        title: '預約成功！',
                        text: '您將會收到 WhatsApp 通知確認訊息。',
                        icon: 'success',
                        confirmButtonColor: '#6366f1'
                    }).then(() => {
                        window.location.hash = 'home';
                        location.reload();
                    });
                } else {
                    throw new Error(res.message);
                }
            } catch (err) {
                Swal.fire('錯誤', '預約失敗: ' + err.message, 'error');
            }
        }
    });
}

async function handleSearch() {
    const phone = document.getElementById('search-phone').value;
    if (!phone) return;

    const resultsDiv = document.getElementById('booking-results');
    resultsDiv.innerHTML = '<div class="loader">搜尋中...</div>';

    try {
        const res = await api.get('getUserBookings', { phone });
        if (res.status === 'success') {
            renderBookingResults(res.data);
        }
    } catch (err) {
        resultsDiv.innerHTML = '<div class="error">查詢出錯</div>';
    }
}

function renderBookingResults(bookings) {
    const resultsDiv = document.getElementById('booking-results');
    if (bookings.length === 0) {
        resultsDiv.innerHTML = '<div class="empty">查無預約記錄</div>';
        return;
    }

    resultsDiv.innerHTML = bookings.map(b => `
        <div class="booking-item glass">
            <div class="booking-info">
                <strong>${b.date} ${b.time}</strong>
                <span>狀態: ${b.status}</span>
            </div>
            ${b.status !== 'cancelled' ? `
                <button class="btn btn-sm btn-outline" onclick="cancelBooking('${b.booking_id}')">取消預約</button>
            ` : ''}
        </div>
    `).join('');
}

async function cancelBooking(id) {
    const confirm = await Swal.fire({
        title: '確定要取消預約嗎？',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '確定取消',
        cancelButtonText: '不要取消'
    });

    if (confirm.isConfirmed) {
        try {
            const res = await api.get('cancelBooking', { bookingId: id });
            if (res.status === 'success') {
                Swal.fire('已取消', '預約已成功取消', 'success');
                handleSearch(); // Refresh
            }
        } catch (err) {
            Swal.fire('錯誤', '取消失敗', 'error');
        }
    }
}
