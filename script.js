/* ===============================
   Dropdown
================================= */

let currentFilter = "전체";

function toggleDropdown() {
    const menu = document.getElementById("dropdownMenu");
    const arrow = document.getElementById("arrow");

    const isOpen = menu.style.display === "block";
    menu.style.display = isOpen ? "none" : "block";
    arrow.classList.toggle("rotate");
}

function selectFilter(value) {
    currentFilter = value;

    document.getElementById("selectedFilter").innerText = value;
    document.getElementById("dropdownMenu").style.display = "none";
    document.getElementById("arrow").classList.remove("rotate");

    applyFilter();
}

function applyFilter() {
    const transactions = document.querySelectorAll(".transaction");

    transactions.forEach(item => {
        if (currentFilter === "전체") {
            item.style.display = "flex";
        } else if (currentFilter === "입금" && item.classList.contains("deposit")) {
            item.style.display = "flex";
        } else if (currentFilter === "출금" && item.classList.contains("withdraw")) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });
}


/* ===============================
   CSV 안전 파서 (GitHub 대응)
================================= */

function parseCSV(text) {
    // BOM 제거
    text = text.replace(/^\uFEFF/, '');

    const rows = [];
    const lines = text.split(/\r?\n/);

    for (let line of lines) {
        if (!line.trim()) continue;

        const cols = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"' && line[i + 1] === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                cols.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        cols.push(current.trim());
        rows.push(cols);
    }

    return rows;
}


/* ===============================
   유틸
================================= */

function parseAmount(raw) {
    raw = String(raw || '').trim();
    if (!raw) return 0;

    const cleaned = raw.replace(/[^\d\-+]/g, '');
    return parseInt(cleaned, 10) || 0;
}

function formatAmount(num) {
    return Number(num || 0).toLocaleString('ko-KR') + '원';
}

function formatShortDate(dateStr) {
    if (!dateStr) return '';

    const parts = dateStr.split(/[.\-\/]/);
    if (parts.length >= 2) {
        const month = String(Number(parts[1] || parts[0])).padStart(2, '0');
        const day = String(Number(parts[2] || parts[1])).padStart(2, '0');
        return month + '.' + day;
    }

    return dateStr;
}


/* ===============================
   CSV → 리스트 변환
================================= */

function csvToList(text) {
    const rows = parseCSV(text);
    const list = [];

    if (!rows.length) return list;

    let start = 0;
    const header = rows[0].map(h => h.toLowerCase());

    if (header.includes('date') || header.includes('amount')) {
        start = 1;
    }

    for (let i = start; i < rows.length; i++) {
        const cols = rows[i];
        if (cols.length < 4) continue;

        const date = cols[0];
        const title = cols[1];
        const time = cols[2];
        const amount = parseAmount(cols[3]);

        let year = null;
        const yMatch = date.match(/^(\d{4})/);
        if (yMatch) year = Number(yMatch[1]);

        list.push({ date, title, time, amount, year });
    }

    return list;
}


/* ===============================
   렌더링
================================= */

function renderTransactions(list) {
    const container = document.querySelector('.transaction-list');
    container.innerHTML = '';

    const base = window.__baseTotal || 0;
    let cumulative = 0;
    let prevYear = null;

    list.forEach(item => {

        if (item.year && item.year !== prevYear) {
            const sep = document.createElement('div');
            sep.className = 'year-separator';
            sep.innerHTML = `
                <span class="line"></span>
                <span class="label">${item.year}년</span>
                <span class="line"></span>
            `;
            container.appendChild(sep);
            prevYear = item.year;
        }

        const tr = document.createElement('div');
        tr.className = 'transaction ' + (item.amount > 0 ? 'deposit' : 'withdraw');

        const totalValue = base - cumulative;

        tr.innerHTML = `
            <div class="left">
                <div class="date">${formatShortDate(item.date)}</div>
                <div class="info">
                    <div class="name">${item.title}</div>
                    <div class="time">${item.time}</div>
                </div>
            </div>
            <div class="right">
                <div class="amount ${item.amount > 0 ? 'deposit-amount' : 'withdraw-amount'}">
                    ${formatAmount(item.amount)}
                </div>
                <div class="total">${formatAmount(totalValue)}</div>
            </div>
        `;

        container.appendChild(tr);

        cumulative += item.amount;
    });

    applyFilter();
}


/* ===============================
   초기 로딩 (GitHub 대응 fetch)
================================= */

document.addEventListener('DOMContentLoaded', () => {

    window.__baseTotal = 0;

    // 1️⃣ base_total.csv 로드
    fetch('base_total.csv?v=' + Date.now())
        .then(res => res.ok ? res.text() : Promise.reject())
        .then(text => {
            const rows = text.split(/\r?\n/).filter(r => r.trim());
            window.__baseTotal = parseAmount(rows[0]);
            updateBalanceUI();
            return loadTransactions();
        })
        .catch(() => {
            updateBalanceUI();
            return loadTransactions();
        });

    function updateBalanceUI() {
        const amountEl = document.querySelector('.balance .amount');
        if (amountEl) {
            amountEl.innerText =
                Number(window.__baseTotal).toLocaleString('ko-KR');
        }
    }

    function loadTransactions() {
        return fetch('transactions.csv?v=' + Date.now())
            .then(res => res.ok ? res.text() : Promise.reject())
            .then(text => {
                const list = csvToList(text);
                renderTransactions(list);
            })
            .catch(err => {
                console.error('CSV load failed', err);
            });
    }
});
