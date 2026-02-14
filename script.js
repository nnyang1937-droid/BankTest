function toggleDropdown() {
    const menu = document.getElementById("dropdownMenu");
    const arrow = document.getElementById("arrow");

    const isOpen = menu.style.display === "block";

    menu.style.display = isOpen ? "none" : "block";
    arrow.classList.toggle("rotate");
}

function selectFilter(value) {
    document.getElementById("selectedFilter").innerText = value;
    document.getElementById("dropdownMenu").style.display = "none";
    document.getElementById("arrow").classList.remove("rotate");

    const transactions = document.querySelectorAll(".transaction");

    transactions.forEach(item => {
        if (value === "전체") {
            item.style.display = "flex";
        } else if (value === "입금" && item.classList.contains("deposit")) {
            item.style.display = "flex";
        } else if (value === "출금" && item.classList.contains("withdraw")) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });
}

// --- CSV / transactions management ---
function parseAmount(raw) {
    if (typeof raw === 'number') return raw;
    raw = String(raw).trim();
    if (!raw) return 0;
    // remove currency symbols, commas, spaces
    const sign = raw[0] === '+' || raw[0] === '-' ? raw[0] : '';
    const num = raw.replace(/[+,원\s]/g, '').replace(/,/g, '');
    const parsed = parseInt((sign || '') + num || '0', 10) || 0;
    return parsed;
}

function formatAmount(num) {
    const n = Number(num) || 0;
    return n.toLocaleString('ko-KR') + '원';
}

function formatShortDate(dateStr) {
    if (!dateStr) return '';
    const s = String(dateStr).trim();
    // split by common separators
    const parts = s.split(/[.\-\/]/).map(p=>p.trim()).filter(p=>p.length);
    let month = null, day = null;
    if (parts.length === 3 && /^\d{4}$/.test(parts[0])) {
        month = parts[1];
        day = parts[2];
    } else if (parts.length === 2) {
        month = parts[0];
        day = parts[1];
    } else {
        // try to capture last two numeric parts
        const m = s.match(/(\d{1,2})[.\-\/](\d{1,2})$/);
        if (m) {
            month = m[1];
            day = m[2];
        } else {
            return s;
        }
    }
    month = String(Number(month || 0)).padStart(2, '0');
    day = String(Number(day || 0)).padStart(2, '0');
    return month + '.' + day;
}

function renderTransactions(list) {
    const container = document.querySelector('.transaction-list');
    container.innerHTML = '';
    const base = parseAmount(window.__baseTotal || 0);

    // cumulative tracks sum of amounts of all previous rows (above current)
    let cumulative = 0;
    // infer/assign years for items without explicit year: use previous item's year or current year
    let inferredYear = null;
    const currentYear = new Date().getFullYear();
    list.forEach(it => {
        if (it.year) {
            inferredYear = it.year;
        } else {
            it.year = inferredYear || currentYear;
            inferredYear = it.year;
        }
    });

    let prevYear = null;

    list.forEach(item => {
        // if year changes (or first item), insert a year separator
        if (item.year && item.year !== prevYear) {
            const sep = document.createElement('div');
            sep.className = 'year-separator';
            const lineLeft = document.createElement('span');
            lineLeft.className = 'line';
            const label = document.createElement('span');
            label.className = 'label';
            label.innerText = item.year + '년';
            const lineRight = document.createElement('span');
            lineRight.className = 'line';
            sep.appendChild(lineLeft);
            sep.appendChild(label);
            sep.appendChild(lineRight);
            container.appendChild(sep);
            prevYear = item.year;
        }

        
        const tr = document.createElement('div');
        tr.className = 'transaction ' + (item.amount > 0 ? 'deposit' : 'withdraw');

        const left = document.createElement('div');
        left.className = 'left';

        const date = document.createElement('div');
        date.className = 'date';
        date.innerText = formatShortDate(item.date || '');

        const info = document.createElement('div');
        info.className = 'info';
        const name = document.createElement('div');
        name.className = 'name';
        name.innerText = item.title || '';
        const time = document.createElement('div');
        time.className = 'time';
        time.innerText = item.time || '';

        info.appendChild(name);
        info.appendChild(time);
        left.appendChild(date);
        left.appendChild(info);

        const right = document.createElement('div');
        right.className = 'right';
        const amount = document.createElement('div');
        amount.className = 'amount ' + (item.amount > 0 ? 'deposit-amount' : 'withdraw-amount');
        amount.innerText = formatAmount(item.amount);

        const total = document.createElement('div');
        total.className = 'total';
        // new logic: first row shows base, subsequent rows show base - sum(prev amounts)
        const totalValue = base - cumulative;
        total.innerText = formatAmount(totalValue);

        right.appendChild(amount);
        right.appendChild(total);

        tr.appendChild(left);
        tr.appendChild(right);
        container.appendChild(tr);

        // after rendering this row, add its amount to cumulative for next rows
        cumulative += Number(item.amount || 0);
    });

    // remove previous footer if any
    const oldFooter = container.querySelector('.transactions-footer');
    if (oldFooter) oldFooter.remove();

    // compute visible month range from items
    const monthItems = [];
    list.forEach(it => {
        const d = String(it.date || '').trim();
        let y = it.year || (new Date().getFullYear());
        let m = null;
        const yMatch = d.match(/^(\d{4})[.\-\/](\d{1,2})/);
        if (yMatch) {
            y = Number(yMatch[1]);
            m = Number(yMatch[2]);
        } else {
            const mMatch = d.match(/^(\d{1,2})[.\-\/](\d{1,2})/);
            if (mMatch) m = Number(mMatch[1]);
        }
        if (m) monthItems.push({year: y, month: m});
    });

    if (monthItems.length) {
        // find min and max by numeric key year*100 + month
        monthItems.sort((a,b)=> (a.year*100 + a.month) - (b.year*100 + b.month));
        const start = monthItems[0];
        const end = monthItems[monthItems.length-1];
        const startLabel = start.year + '.' + start.month;
        const endLabel = end.year + '.' + end.month;
        const labelText = start.year === end.year && start.month === end.month
            ? `${startLabel} 까지 조회했어요`
            : `${startLabel} ~ ${endLabel} 까지 조회했어요`;

        const footer = document.createElement('div');
        footer.className = 'transactions-footer';
        footer.innerText = labelText;
        container.appendChild(footer);
    }
}

function csvToList(text) {
    const rows = text.split(/\r?\n/).map(r=>r.trim()).filter(r=>r);
    const list = [];
    // detect header
    let start = 0;
    const header = rows[0].split(',').map(h=>h.trim().toLowerCase());
    if (header.includes('date') || header.includes('amount') || header.includes('title')) start = 1;
    for (let i = start; i < rows.length; i++) {
        const cols = rows[i].split(',');
        if (cols.length < 4) continue;
        const date = cols[0].trim();
        const title = cols[1].trim();
        const time = cols[2].trim();
        const amount = parseAmount(cols[3].trim());
        // try to extract year from date like 2026.02.02 or 2026-02-02
        let year = null;
        const dateTrim = date;
        const yMatch = dateTrim.match(/^(\d{4})[.\-\/]?/);
        if (yMatch) year = Number(yMatch[1]);
        list.push({date, title, time, amount, year});
    }
    return list;
}

function exportCsv(list) {
    const header = 'date,title,time,amount';
    const lines = list.map(i => [i.date, '"'+i.title.replace(/"/g,'""')+'"', i.time, i.amount].join(','));
    const csv = [header].concat(lines).join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
    // use a global base total variable loaded from CSV
    window.__baseTotal = 0;
    let currentList = [];

    function fetchTransactionsAndRender() {
        fetch('transactions.csv').then(res => {
            if (!res.ok) throw new Error('no csv');
            return res.text();
        }).then(text => {
            currentList = csvToList(text);
            renderTransactions(currentList);
        }).catch(() => {
            // fallback: load any existing transactions present in HTML
            const existing = [];
            document.querySelectorAll('.transaction').forEach(tr => {
                const date = tr.querySelector('.date') ? tr.querySelector('.date').innerText : '';
                const title = tr.querySelector('.name') ? tr.querySelector('.name').innerText : '';
                const time = tr.querySelector('.time') ? tr.querySelector('.time').innerText : '';
                const amountText = tr.querySelector('.amount') ? tr.querySelector('.amount').innerText : '';
                const amount = parseAmount(amountText);
                existing.push({date, title, time, amount});
            });
            if (existing.length) {
                currentList = existing;
                renderTransactions(currentList);
            }
        });
    }

    // load base total from CSV then load transactions
    fetch('base_total.csv').then(res => {
        if (!res.ok) throw new Error('no base csv');
        return res.text();
    }).then(text => {
        const rows = text.split(/\r?\n/).map(r=>r.trim()).filter(r=>r);
        let val = '';
        if (rows.length === 0) val = '';
        else if (rows[0].toLowerCase().startsWith('basetotal')) {
            val = rows[1] || '';
        } else {
            val = rows[0];
        }
        window.__baseTotal = parseAmount(String(val).replace(/[^0-9\-\+]/g,''));
        // update visible balance on the page to reflect loaded base total
        const amountEl = document.querySelector('.balance .amount');
        if (amountEl) {
            amountEl.innerText = Number(window.__baseTotal || 0).toLocaleString('ko-KR');
        }
        fetchTransactionsAndRender();
    }).catch(() => {
        const amountEl = document.querySelector('.balance .amount');
        if (amountEl) {
            window.__baseTotal = parseAmount(amountEl.innerText.replace(/원/g,''));
        }
        fetchTransactionsAndRender();
    });
});
