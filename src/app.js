/**
 * Main Application Logic
 */

// State Management
const state = {
    currentSection: 'home',
    booking: {
        step: 1,
        service: null,
        addon_massage: false,
        date: '',
        time: '',
        name: '',
        phone: '',
        note: ''
    },
    services: [],
    activeCategory: '首次預約'
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
            // Auto-set activeCategory to first type found in data (if current doesn't match any)
            const availableTypes = [...new Set(res.data.map(s => s.type || '單堂'))];
            if (availableTypes.length > 0 && !availableTypes.includes(state.activeCategory)) {
                state.activeCategory = availableTypes[0];
            }
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

function changeHomepageCategory(cat) {
    state.activeCategory = cat;
    renderServicesGrid(state.services);
}

function renderServicesGrid(services) {
    const grid = document.getElementById('services-grid');
    if (!grid) return;
    
    // Add category tabs above the grid if they don't exist
    let tabsContainer = document.getElementById('homepage-service-tabs');
    if (!tabsContainer) {
        tabsContainer = document.createElement('div');
        tabsContainer.id = 'homepage-service-tabs';
        tabsContainer.className = 'category-tabs';
        grid.parentNode.insertBefore(tabsContainer, grid);
    }
    
    // Derive categories dynamically from real data
    const categories = [...new Set(services.map(s => s.type || '單堂'))];
    // Keep a preferred order if those types exist
    const preferredOrder = ['首次預約', '單堂', '包卡'];
    const sortedCategories = [
        ...preferredOrder.filter(c => categories.includes(c)),
        ...categories.filter(c => !preferredOrder.includes(c))
    ];

    tabsContainer.innerHTML = sortedCategories.map(cat => `
        <button class="category-tab-btn ${state.activeCategory === cat ? 'active' : ''}" 
                onclick="changeHomepageCategory('${cat}')">
            ${cat}
        </button>
    `).join('');
    
    const filteredServices = services.filter(s => (s.type || '單堂') === state.activeCategory);
    
    if (filteredServices.length === 0) {
        grid.innerHTML = `<div class="empty">目前無此類別的服務</div>`;
        return;
    }

    grid.innerHTML = filteredServices.map(s => `
        <div class="service-card" onclick="startBooking(${s.service_id})">
            <img src="S__13189122.jpg" alt="Service" class="service-card-img" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjBlNmU3Ii8+PC9zdmc+'" />
            <div class="service-card-content">
                <h4 class="service-card-title">${s.name}</h4>
                <p class="service-card-meta">$${s.price} <span class="service-card-meta-dot"></span> ${s.duration} 分鐘</p>
                <div class="service-badge">${s.type || '單堂'}</div>
            </div>
            <div class="service-discount">預約</div>
        </div>
    `).join('');
    if (window.lucide) {
        lucide.createIcons();
    }
}

function startBooking(serviceId) {
    const s = state.services.find(srv => srv.service_id == serviceId);
    if (s) {
        state.booking.service = s;
        state.activeCategory = s.type || '單堂';
        const isSingleOrPackage = s.type === '單堂' || s.type === '包卡' || !s.type;
        if (!isSingleOrPackage) {
            state.booking.addon_massage = false;
        }
    }
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

function changeBookingCategory(cat) {
    state.activeCategory = cat;
    renderServiceOptions();
}

function toggleAddonMassage(checked) {
    state.booking.addon_massage = checked;
}

function renderServiceOptions() {
    const container = document.getElementById('service-options');
    if (!container) return;

    if (state.services.length === 0) {
        container.innerHTML = '<div class="empty">目前無可用服務</div>';
        return;
    }

    // Add category tabs above the options if they don't exist
    let tabsContainer = document.getElementById('booking-service-tabs');
    if (!tabsContainer) {
        tabsContainer = document.createElement('div');
        tabsContainer.id = 'booking-service-tabs';
        tabsContainer.className = 'category-tabs';
        tabsContainer.style.marginBottom = '1.5rem';
        container.parentNode.insertBefore(tabsContainer, container);
    }
    
    // Derive categories dynamically from real data
    const allTypes = [...new Set(state.services.map(s => s.type || '單堂'))];
    const preferredOrder = ['首次預約', '單堂', '包卡'];
    const sortedCategories = [
        ...preferredOrder.filter(c => allTypes.includes(c)),
        ...allTypes.filter(c => !preferredOrder.includes(c))
    ];

    tabsContainer.innerHTML = sortedCategories.map(cat => `
        <button type="button" class="category-tab-btn ${state.activeCategory === cat ? 'active' : ''}" 
                onclick="changeBookingCategory('${cat}')">
            ${cat}
        </button>
    `).join('');

    const filteredServices = state.services.filter(s => (s.type || '單堂') === state.activeCategory);

    let html = '';
    if (filteredServices.length === 0) {
        html = '<div class="empty">目前此類別無可用服務</div>';
    } else {
        html = filteredServices.map(s => `
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
    }

    const s = state.booking.service;
    const showAddon = s && (s.type === '單堂' || s.type === '包卡' || !s.type);
    
    let addonHtml = '';
    if (showAddon) {
        addonHtml = `
            <div id="addon-section" class="addon-wrapper" style="margin-top: 1.5rem; padding: 1.5rem; background: var(--badge-bg); border-radius: var(--radius); border: 1px solid var(--glass-border); width: 100%;">
                <h4 style="margin-bottom: 0.75rem; color: var(--primary-dark); font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="sparkles" style="width: 18px; height: 18px;"></i> 加購服務
                </h4>
                <label class="addon-item" style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; width: 100%;">
                    <input type="checkbox" id="addon-massage-checkbox" ${state.booking.addon_massage ? 'checked' : ''} onchange="toggleAddonMassage(this.checked)" style="width: 20px; height: 20px; accent-color: var(--primary);">
                    <div>
                        <span style="font-weight: 600; color: var(--text);">加購 30 分鐘按摩服務</span>
                        <span style="display: block; font-size: 0.85rem; color: var(--text-light); margin-top: 0.15rem;">預約時長將額外延長 30 分鐘</span>
                    </div>
                </label>
            </div>
        `;
    }
    
    container.innerHTML = html + addonHtml;
    
    if (window.lucide) {
        lucide.createIcons();
    }
    
    validateStep1();
}

function selectService(id) {
    state.booking.service = state.services.find(s => s.service_id == id);
    const s = state.booking.service;
    const isSingleOrPackage = s && (s.type === '單堂' || s.type === '包卡' || !s.type);
    if (!isSingleOrPackage) {
        state.booking.addon_massage = false;
    }
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
    if (slots) {
        state.slots = slots;
    } else {
        slots = state.slots || [];
    }

    const grid = document.getElementById('time-slots');
    if (slots.length === 0) {
        grid.innerHTML = '<div class="empty">此日期已無可預約時段</div>';
        return;
    }
    
    grid.innerHTML = slots.map(slot => {
        const isObj = typeof slot === 'object';
        const time = isObj ? slot.time : slot;
        const available = isObj ? slot.available : true;
        const isSelected = state.booking.time === time;
        
        return `
            <div class="option-item slot-item ${isSelected ? 'selected' : ''} ${available ? '' : 'disabled'}" 
                 ${available ? `onclick="selectTime('${time}')"` : ''}>
                ${time}
            </div>
        `;
    }).join('');
    
    validateStep2();
}

function selectTime(time) {
    state.booking.time = time;
    renderTimeSlots();
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

    const serviceName = state.booking.service.name + (state.booking.addon_massage ? ' (+30分鐘按摩)' : '');

    Swal.fire({
        title: '確認預約內容',
        html: `
            服務：${serviceName}<br>
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
                    type: state.activeCategory,
                    date: state.booking.date,
                    time: state.booking.time,
                    name: state.booking.name,
                    phone: state.booking.phone,
                    note: state.booking.note,
                    addonMassage: state.booking.addon_massage ? '是' : '否'
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

    resultsDiv.innerHTML = bookings.map(b => {
        const addonText = b.addon_massage === '是' ? ' (+30分鐘按摩)' : '';
        const statusText = b.status === 'confirmed' ? '已確認' : '已取消';
        const statusBg = b.status === 'confirmed' ? '#dcfce7' : '#fee2e2';
        const statusColor = b.status === 'confirmed' ? '#166534' : '#b91c1c';
        
        return `
            <div class="booking-item glass" style="display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem; padding: 1.25rem;">
                <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                    <strong style="font-size: 1.1rem; color: var(--text);">${b.date} ${b.time}</strong>
                    <span class="service-badge" style="margin:0; background: ${statusBg}; color: ${statusColor};">
                        ${statusText}
                    </span>
                </div>
                <div style="color: var(--text-light); font-size: 0.95rem;">
                    服務項目: <span style="color: var(--text); font-weight: 500;">${b.service_name}${addonText}</span>
                </div>
                ${b.note ? `<div style="color: var(--text-light); font-size: 0.95rem; background: rgba(0,0,0,0.02); padding: 0.5rem; border-radius: 6px; width: 100%;">備註: ${b.note}</div>` : ''}
                ${b.status !== 'cancelled' ? `
                    <button class="btn btn-outline" style="padding: 0.4rem 1rem; font-size: 0.85rem; border-radius: 50px; margin-top: 0.5rem;" onclick="cancelBooking('${b.booking_id}')">取消預約</button>
                ` : ''}
            </div>
        `;
    }).join('');
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
