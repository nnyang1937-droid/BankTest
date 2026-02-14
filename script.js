let transactions = [];
let baseTotal = 0;

async function loadData() {
    const transRes = await fetch('./transactions.csv?v=' + Date.now());
    const baseRes = await fetch('./base_total.csv?v=' + Date.now());

    const transText = await transRes.text();
    const baseText = await baseRes.text();

    parseTransactions(transText);
    parseBase(baseText);

    renderTransactions('all');
    calculateTotal('all');
}

function parseTransactions(csv) {
    const rows = csv.trim().split('\n');
    transactions = [];

    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',');

        transactions.push({
            date: cols[0],
            desc: cols[1],
            type: cols[2],
            amount: parseInt(cols[3])
        });
    }
}

function parseBase(csv) {
    const rows = csv.trim().split('\n');
    baseTotal = parseInt(rows[1]);
}

function renderTransactions(filter) {
    const list = document.getElementById('transactionList');
    list.innerHTML = '';

    let filtered = transactions;

    if (filter !== 'all') {
        filtered = transactions.filter(t => t.type === filter);
    }

    filtered.forEach(t => {
        const div = document.createElement('div');
        div.className = 'transaction';

        div.innerHTML = `
            <div class="info">
                <div class="date">${t.date}</div>
                <div class="desc">${t.desc}</div>
            </div>
            <div class="money ${t.type}">
                ${t.type === 'deposit' ? '+' : '-'}
                ${t.amount.toLocaleString()}원
            </div>
        `;

        list.appendChild(div);
    });
}

function calculateTotal(filter) {
    let total = baseTotal;

    let filtered = transactions;

    if (filter !== 'all') {
        filtered = transactions.filter(t => t.type === filter);
        total = 0;
    }

    filtered.forEach(t => {
        if (t.type === 'deposit') total += t.amount;
        else total -= t.amount;
    });

    document.getElementById('totalAmount').innerText =
        total.toLocaleString() + '원';
}

/* 드롭다운 */
const filterBtn = document.getElementById('filterBtn');
const dropdownMenu = document.getElementById('dropdownMenu');
const filterText = document.getElementById('filterText');

filterBtn.addEventListener('click', () => {
    dropdownMenu.style.display =
        dropdownMenu.style.display === 'block' ? 'none' : 'block';
});

dropdownMenu.addEventListener('click', (e) => {
    const value = e.target.dataset.value;
    const text = e.target.innerText;

    filterText.innerText = text;

    renderTransactions(value);
    calculateTotal(value);

    dropdownMenu.style.display = 'none';
});

loadData();
