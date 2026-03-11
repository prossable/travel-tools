class Config {
    static timeZones = [
        { label: 'Honolulu', tz: 'Pacific/Honolulu' },
        { label: 'Anchorage', tz: 'America/Anchorage' },
        { label: 'Los Angeles', tz: 'America/Los_Angeles' },
        { label: 'Phoenix', tz: 'America/Phoenix' },
        { label: 'Denver', tz: 'America/Denver' },
        { label: 'Chicago', tz: 'America/Chicago' },
        { label: 'New York', tz: 'America/New_York' },
        { label: 'Toronto', tz: 'America/Toronto' },
        { label: 'São Paulo', tz: 'America/Sao_Paulo' },
        { label: 'London', tz: 'Europe/London' },
        { label: 'Lisbon', tz: 'Europe/Lisbon' },
        { label: 'Paris', tz: 'Europe/Paris' },
        { label: 'Berlin', tz: 'Europe/Berlin' },
        { label: 'Rome', tz: 'Europe/Rome' },
        { label: 'Athens', tz: 'Europe/Athens' },
        { label: 'Moscow', tz: 'Europe/Moscow' },
        { label: 'Dubai', tz: 'Asia/Dubai' },
        { label: 'Bangkok', tz: 'Asia/Bangkok' },
        { label: 'Singapore', tz: 'Asia/Singapore' },
        { label: 'Hong Kong', tz: 'Asia/Hong_Kong' },
        { label: 'Shanghai', tz: 'Asia/Shanghai' },
        { label: 'Tokyo', tz: 'Asia/Tokyo' },
        { label: 'Seoul', tz: 'Asia/Seoul' },
        { label: 'Sydney', tz: 'Australia/Sydney' },
        { label: 'Melbourne', tz: 'Australia/Melbourne' },
        { label: 'Auckland', tz: 'Pacific/Auckland' },
        { label: 'Mexico City', tz: 'America/Mexico_City' },
        { label: 'Cancún', tz: 'America/Cancun' },
        { label: 'Bogotá', tz: 'America/Bogota' },
        { label: 'Lima', tz: 'America/Lima' },
        { label: 'Buenos Aires', tz: 'America/Argentina/Buenos_Aires' },
        { label: 'Casablanca', tz: 'Africa/Casablanca' },
        { label: 'Cairo', tz: 'Africa/Cairo' },
    ];

    static conversions = [
        {
            id: 'temp',
            labelA: '°C',
            labelB: '°F',
            toB: c => (c * 9 / 5) + 32,
            toA: f => (f - 32) * 5 / 9,
            decimals: 1
        },
        {
            id: 'weight',
            labelA: 'kg',
            labelB: 'lbs',
            toB: kg => kg * 2.20462,
            toA: lbs => lbs / 2.20462,
            decimals: 2
        },
        {
            id: 'volume',
            labelA: 'Liter',
            labelB: 'fl oz',
            toB: l => l * 33.814,
            toA: oz => oz / 33.814,
            decimals: 2
        },
        {
            id: 'distance',
            labelA: 'km',
            labelB: 'mile',
            toB: km => km * 0.621371,
            toA: mi => mi / 0.621371,
            decimals: 2
        },
        {
            id: 'length',
            labelA: 'cm',
            labelB: 'inch',
            toB: cm => cm * 0.393701,
            toA: inches => inches / 0.393701,
            decimals: 2
        }
    ];

    static currencies = {
        USD: {
            code: 'USD',
            name: 'US Dollar',
            symbol: '$',
            apiTarget: 'USD',
            defaultRate: 1,
            flag: '🇺🇸',
            decimals: 2,
            locale: 'en-US'
        },
        MXN: {
            code: 'MXN',
            name: 'Mexican Peso',
            symbol: '$',
            apiTarget: 'MXN',
            defaultRate: 17.57,
            flag: '🇲🇽',
            decimals: 2,
            locale: 'es-MX'
        },
        JPY: {
            code: 'JPY',
            name: 'Japanese Yen',
            symbol: '¥',
            apiTarget: 'JPY',
            defaultRate: 149.50,
            flag: '🇯🇵',
            decimals: 0,
            locale: 'ja-JP'
        }
    };

    static getCurrency(code) {
        return Config.currencies[code];
    }
}

class RateService extends EventTarget {
    static API_TIMEOUT = 5000;
    #localCurrency = Config.currencies['USD'];
    #foreignCurrency = Config.currencies['MXN'];
    #rate = null;

    getLocalCurrency() { return this.#localCurrency; }
    getForeignCurrency() { return this.#foreignCurrency; }
    setForeignCurrency(code) {
        const currency = Config.getCurrency(code);
        if (currency === null) {
            throw new Error(`Unknown currency code: ${code}`);
        }
        this.#foreignCurrency = currency;
        this.#rate = null;
        this.fetchRate();
    }

    getRate() {
        return this.#rate ?? this.#foreignCurrency.defaultRate;
    }

    setRate(value) {
        const changed = this.#rate !== parseFloat(value);
        this.#rate = parseFloat(value);
        if (changed) {
            this.dispatchEvent(new CustomEvent('rateChanged', {
                detail: { rate: this.#rate }
            }));
        }
    }

    fetchRate(force = false) {
        const today = this.getLocalDate();

        // fetch rate
        const custom = localStorage.getItem('customRate');
        if (custom && !force) {
            this.setRate(parseFloat(custom));
            this.dispatchEvent(new CustomEvent('messageSent', {
                detail: { msg: 'Using a custom rate' }
            }));
            return;
        }

        // check cache
        const cached = JSON.parse(localStorage.getItem('cachedRate'));
        if (!force && cached && cached.date === today && cached.currency === this.#foreignCurrency.code) {
            this.setRate(cached.rate);
            this.dispatchEvent(new CustomEvent('messageSent', {
                detail: { msg: `Cached rate as of ${this.formatDate(cached.date)}` }
            }));
            return;
        }

        console.log("==== FETCH RATE ===");
        // fetch live
        this.dispatchEvent(new CustomEvent('stateChanged', { detail: { busy: true } }));
        this.dispatchEvent(new CustomEvent('messageSent', { detail: { msg: 'Fetching live rate…' } }));

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), RateService.API_TIMEOUT);
        const url = `https://api.frankfurter.app/latest?from=${this.#localCurrency.apiTarget}&to=${this.#foreignCurrency.apiTarget}`;

        fetch(url, { signal: controller.signal })
            .then(r => r.json())
            .then(data => {
                clearTimeout(timeout);
                const val = data.rates[this.#foreignCurrency.apiTarget];
                localStorage.setItem('cachedRate', JSON.stringify({
                    rate: val,
                    date: today,
                    currency: this.#foreignCurrency.code
                }));
                this.setRate(val);
                this.dispatchEvent(new CustomEvent('messageSent', {
                    detail: { msg: `Live rate as of ${this.formatDate(today)} · European Central Bank` }
                }));
            })
            .catch(err => {
                console.log(err);
                clearTimeout(timeout);
                const msg = err.name === 'AbortError' ?
                    'Request timed out · using fallback' :
                    'Could not fetch live rate · using fallback';
                this.dispatchEvent(new CustomEvent('messageSent', { detail: { msg: msg } }));
            })
            .finally(() => {
                this.dispatchEvent(new CustomEvent('stateChanged', { detail: { busy: false } }));
            });
    }

    toForeign(amount) { return amount * this.getRate(); }
    toLocal(amount) { return amount / this.getRate(); }

    #format(value, currency) {
        if (isNaN(value) || !isFinite(value)) return '—';
        return value.toLocaleString(this.#localCurrency.locale, {
            minimumFractionDigits: currency.decimals,
            maximumFractionDigits: currency.decimals
        });
    }

    #formatInput(value, currency) {
        return this.#format(value, currency).replace(/,/g, '');
    }

    #formatSymbol(value, currency) {
        return `${currency.symbol}${this.#format(value, currency)}`;
    }

    #formatFull(value, currency) {
        return `${currency.symbol}${this.#format(value, currency)} ${currency.code}`;
    }

    formatLocalInput(value) {
        return this.#formatInput(value, this.#localCurrency);
    }

    formatForeignInput(value) {
        return this.#formatInput(value, this.#foreignCurrency);
    }

    formatLocalSymbol(value) {
        return this.#formatSymbol(value, this.#localCurrency);
    }

    formatForeignSymbol(value) {
        return this.#formatSymbol(value, this.#foreignCurrency);
    }

    formatLocalFull(value) {
        return this.#formatFull(value, this.#localCurrency);
    }

    formatForeignFull(value) {
        return this.#formatFull(value, this.#foreignCurrency);
    }

    getLocalDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatDate(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString(
            this.#localCurrency.locale, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
}

class Card {
    constructor(cardId) {
        this.cardElement = document.getElementById(cardId);
        this.cardHeader = this.cardElement.querySelector('.header');
        this.cardBody = this.cardElement.querySelector('.body');
        this.summaryOutput = this.cardHeader.querySelector('.summary');
        this.collapseButton = this.cardHeader.querySelector('.collapse-btn');

        // bindings
        this.collapse = this.collapse.bind(this);
        this.expand = this.expand.bind(this);

        // listeners
        this.cardElement.addEventListener('click', () => this.expand());
        this.collapseButton.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent card click from firing
            this.collapse();
        });
    }

    expand() {
        if (this.isOpen()) return;
        document.querySelectorAll('.card').forEach(b => b.classList.remove('open'));
        this.cardElement.classList.add('open');
    }

    collapse() {
        this.cardElement.classList.remove('open');
    }

    isOpen() {
        return this.cardBody.classList.contains('open');
    }

    updateSummary(value) {
        this.summaryOutput.textContent = value;
    }
}

class RateCard extends Card {
    constructor(rateService) {
        super('card-rate');
        this.rateService = rateService;

        // elements
        this.rateInput = document.getElementById('rate');
        this.hintOutput = document.getElementById('rate-hint');
        this.autoFetchCheckbox = document.getElementById('rate-auto-fetch');
        this.refreshButton = document.getElementById('rate-refresh');

        // settings
        const saved = localStorage.getItem('autoFetchRate');
        this.autoFetchCheckbox.checked = saved === null ? true : saved === 'true';

        // listeners
        this.rateInput.addEventListener('input', () => {
            this.hintOutput.textContent = 'Using a custom rate';
            const val = parseFloat(this.rateInput.value);
            localStorage.setItem('customRate', val);
            this.rateService.setRate(val);
            this.autoFetchCheckbox.checked = false;
            localStorage.setItem('autoFetchRate', false);
        });
        this.autoFetchCheckbox.addEventListener('change', () => {
            localStorage.setItem('autoFetchRate', this.autoFetchCheckbox.checked);
        });
        this.refreshButton.addEventListener('click', () => {
            localStorage.removeItem('customRate');
            this.rateService.fetchRate(true);
        });
        this.rateService.addEventListener('rateChanged', (e) => {
            if (document.activeElement !== this.rateInput) {
                this.rateInput.value = e.detail.rate;
            }
            this.updateSummary(this.rateService.formatForeignFull(e.detail.rate));
        });
        this.rateService.addEventListener('stateChanged', (e) => this.refreshButton.disabled = e.detail.busy);
        this.rateService.addEventListener('messageSent', (e) => this.hintOutput.textContent = e.detail.msg);
    }
}

class ReferenceCard extends Card {
    static referenceAmounts = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 5000];

    constructor(rateService) {
        super('card-reference');
        this.rateService = rateService;

        // init
        this.#build();

        // listeners
        this.rateService.addEventListener('rateChanged', (e) => this.update());
    }

    #build() {
        const localCurrency = this.rateService.getLocalCurrency();
        const foreignCurrency = this.rateService.getForeignCurrency();
        const table = document.getElementById('reference-table');
        const rows = ReferenceCard.referenceAmounts.map(amount => `<div class="ref-row"><span>${this.rateService.formatForeignSymbol(amount)}</span><span class="ref-local highlight" data-foreign="${amount}">—</span></div>`).join('');
        table.innerHTML = `<div class="ref-row ref-header"><span>${foreignCurrency.code}</span><span class="highlight">${localCurrency.code}</span></div>${rows}`;
    }

    update() {
        document.querySelectorAll('.ref-local').forEach(cell => {
            const foreign = parseFloat(cell.dataset.foreign);
            cell.textContent = this.rateService.formatLocalSymbol(this.rateService.toLocal(foreign));
        });
    }
}

class CostCard extends Card {
    lastCost = null;

    constructor(rateService) {
        super('card-cost');
        this.rateService = rateService;

        // binding
        this.calculate = this.calculate.bind(this);
        this.update = this.update.bind(this);
        this.getQuantity = this.getQuantity.bind(this);

        // elements
        this.costInput = document.getElementById('cost-from-val');
        this.costOutput = document.getElementById('cost-to-val');
        this.costQuantityInput = document.getElementById('cost-qty');
        this.costQuantityMinusButton = document.getElementById('cost-qty-minus');
        this.costQuantityPlusButton = document.getElementById('cost-qty-plus');
        this.costTotalOutput = document.getElementById('cost-total');

        // listeners
        this.costQuantityMinusButton.addEventListener('click', () => {
            if (this.getQuantity() > 1) { this.costQuantityInput.value = this.getQuantity() - 1; this.update(); }
        });
        this.costQuantityPlusButton.addEventListener('click', () => {
            this.costQuantityInput.value = this.getQuantity() + 1; this.update();
        });
        this.costQuantityInput.addEventListener('input', this.update);
        this.costInput.addEventListener('input', this.calculate);
        this.rateService.addEventListener('rateChanged', (e) => {
            this.calculate();
        });
    }

    calculate() {
        const val = parseFloat(this.costInput.value);
        if (isNaN(val) || this.costInput.value === '') {
            this.lastCost = null;
            this.update();
            return;
        }
        this.lastCost = this.rateService.toLocal(val);
        this.update();
    }

    update() {
        if (this.lastCost === null) {
            this.costOutput.value = '';
            this.costTotalOutput.value = '';
            return;
        }
        const total = this.lastCost * this.getQuantity();
        this.costOutput.value = this.rateService.formatLocalSymbol(this.lastCost);
        this.costTotalOutput.value = this.rateService.formatLocalSymbol(total);
        this.updateSummary(this.rateService.formatLocalFull(total));
    }

    getQuantity() {
        return Math.max(1, parseInt(this.costQuantityInput.value) || 1);
    }
}

class MarketWeightCard extends Card {
    lastCost = null;

    constructor(rateService) {
        super('card-market');
        this.rateService = rateService;

        // binding
        this.update = this.update.bind(this);

        // elements
        this.rateInput = document.getElementById('market-rate');
        this.weightInput = document.getElementById('market-kg');
        this.total1Output = document.getElementById('market-total1');
        this.total2Output = document.getElementById('market-total2');

        // listeners
        this.rateInput.addEventListener('input', this.update);
        this.weightInput.addEventListener('input', this.update);
        this.rateService.addEventListener('rateChanged', (e) => {
            this.update();
        });
    }

    update() {
        const rate = parseFloat(this.rateInput.value);
        const weight = parseFloat(this.weightInput.value);
        if (isNaN(rate) || isNaN(weight) || this.rateInput.value === '' || this.weightInput.value === '') {
            this.total1Output.value = '';
            this.total2Output.value = '';
            this.updateSummary('');
            return;
        }
        const totalForeign = rate * weight;
        const totalLocal = this.rateService.toLocal(totalForeign);
        this.total1Output.value = this.rateService.formatForeignSymbol(totalForeign);
        this.total2Output.value = this.rateService.formatLocalSymbol(totalLocal);
        this.updateSummary(this.rateService.formatLocalFull(totalLocal));
    }
}

class BillCard extends Card {
    lastBillCurrency = 'foreign';
    lastBillPercent = null;

    constructor(rateService) {
        super('card-bill');
        this.rateService = rateService;

        // binding
        this.setTipPreset = this.setTipPreset.bind(this);
        this.setTipCustom = this.setTipCustom.bind(this);
        this.getPeople = this.getPeople.bind(this);
        this.update = this.update.bind(this);

        // elements
        this.subtotalElement = document.getElementById('bill-subtotal');
        this.total1FInput = document.getElementById('bill-total1');
        this.totalLInput = document.getElementById('bill-total2');
        this.peopleInput = document.getElementById('bill-people');
        this.peopleMinusButton = document.getElementById('bill-people-minus');
        this.peoplePlusButton = document.getElementById('bill-people-plus');
        this.tipButtons = document.getElementById('tip-options').querySelectorAll('button');
        this.tipCustomInput = document.getElementById('bill-tip-custom');
        this.tipFOutput = document.getElementById('bill-tip1');
        this.tipLOutput = document.getElementById('bill-tip2');
        this.subFOutput = document.getElementById('bill-sub1');
        this.subLOutput = document.getElementById('bill-sub2');
        this.finalFOutput = document.getElementById('bill-final1');
        this.finalLOutput = document.getElementById('bill-final2');

        // listeners
        this.total1FInput.addEventListener('input', () => { this.lastBillCurrency = 'foreign'; this.update(); });
        this.totalLInput.addEventListener('input', () => { this.lastBillCurrency = 'local'; this.update(); });
        this.peopleInput.addEventListener('input', this.update);
        this.peopleMinusButton.addEventListener('click', () => {
            if (this.getPeople() > 1) { this.peopleInput.value = this.getPeople() - 1; this.update(); }
        });
        this.peoplePlusButton.addEventListener('click', () => {
            this.peopleInput.value = this.getPeople() + 1; this.update();
        });
        this.tipButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.lastBillPercent = parseFloat(btn.dataset.pct);
                this.tipCustomInput.value = '';
                this.setTipPreset(btn);
                this.update();
            });
        });
        this.tipCustomInput.addEventListener('input', () => {
            this.lastBillPercent = parseFloat(this.tipCustomInput.value) || null;
            this.setTipCustom();
            this.update();
        });
        this.rateService.addEventListener('rateChanged', (e) => {
            this.update();
        });
    }

    setTipPreset(btn) {
        this.tipButtons.forEach(b => b.classList.remove('active'));
        this.tipCustomInput.classList.remove('active');
        if (btn) btn.classList.add('active');
    }

    setTipCustom() {
        this.tipButtons.forEach(b => b.classList.remove('active'));
        this.tipCustomInput.classList.add('active');
    }

    getPeople() { return Math.max(1, parseInt(this.peopleInput.value) || 1); }

    update() {
        const people = this.getPeople();
        const pct = this.lastBillPercent;

        this.subtotalElement.style.display = people > 1 ? 'grid' : 'none';

        // sync bill fields
        let totalF, totalLocal;
        if (this.lastBillCurrency === 'foreign') {
            totalF = parseFloat(this.total1FInput.value);
            if (!isNaN(totalF) && this.total1FInput.value !== '') {
                totalLocal = this.rateService.toLocal(totalF);
                this.totalLInput.value = this.rateService.formatLocalInput(totalLocal);
            } else {
                this.totalLInput.value = '';
            }
        } else {
            totalLocal = parseFloat(this.totalLInput.value);
            if (!isNaN(totalLocal) && this.totalLInput.value !== '') {
                totalF = this.rateService.toForeign(totalLocal);
                this.total1FInput.value = this.rateService.formatForeignInput(totalF);
            } else {
                totalF = NaN;
                this.total1FInput.value = '';
            }
        }

        // bail if we don't have what we need
        if (isNaN(totalF) || totalF === '' || pct === null || isNaN(pct)) {
            this.tipFOutput.value = '';
            this.tipLOutput.value = '';
            this.subFOutput.value = '';
            this.subLOutput.value = '';
            this.finalFOutput.value = '';
            this.finalLOutput.value = '';
            this.updateSummary('');
            return;
        }

        const tipF = totalF * (pct / 100);
        const tipL = this.rateService.toLocal(tipF);
        const tipPerF = tipF / people;
        const tipPerL = this.rateService.toLocal(tipPerF);
        const subF = totalF / people;
        const subL = this.rateService.toLocal(subF);
        const finalF = subF + tipPerF;
        const finalL = this.rateService.toLocal(finalF);

        this.subFOutput.value = this.rateService.formatForeignSymbol(subF);
        this.subLOutput.value = this.rateService.formatLocalSymbol(subL);
        if (people > 1) {
            this.tipFOutput.value = `${this.rateService.formatForeignSymbol(tipPerF)} (${this.rateService.formatForeignSymbol(tipF)})`;
            this.tipLOutput.value = `${this.rateService.formatLocalSymbol(tipPerL)} (${this.rateService.formatLocalSymbol(tipL)})`;
            this.finalFOutput.value = `${this.rateService.formatForeignSymbol(finalF)} (${this.rateService.formatForeignSymbol(totalF + tipF)})`;
            this.finalLOutput.value = `${this.rateService.formatLocalSymbol(finalL)} (${this.rateService.formatLocalSymbol(totalLocal + tipL)})`;
            this.updateSummary(`${this.rateService.formatLocalFull(finalL)} / person`);
        } else {
            this.tipFOutput.value = this.rateService.formatForeignSymbol(tipF);
            this.tipLOutput.value = this.rateService.formatLocalSymbol(tipL);
            this.finalFOutput.value = this.rateService.formatForeignSymbol(finalF);
            this.finalLOutput.value = this.rateService.formatLocalSymbol(finalL);
            this.updateSummary(this.rateService.formatLocalFull(finalL));
        }
    }
}

class MarketTallyCard extends Card {
    #items = [];
    #nextId = 1;
    #mode = 'plan';

    constructor(rateService) {
        super('card-tally');
        this.rateService = rateService;

        // elements
        this.listElement = document.getElementById('tally-list');
        this.addButton = document.getElementById('tally-add');
        this.clearButton = document.getElementById('tally-clear');
        this.spentForeignOutput = document.getElementById('tally-spent-foreign');
        this.spentLocalOutput = document.getElementById('tally-spent-local');
        this.remainingForeignOutput = document.getElementById('tally-remaining-foreign');
        this.remainingLocalOutput = document.getElementById('tally-remaining-local');
        this.modeButtons = document.querySelectorAll('.tally-mode-btn');

        // init
        this.#load();

        // listeners
        this.addButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#addItem();
        });

        this.clearButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Clear all items?')) {
                this.#items = [];
                this.#nextId = 1;
                this.#save();
                this.#renderAll();
            }
        });

        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.#mode = btn.dataset.mode;
                this.modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.listElement.classList.toggle('shop-mode', this.#mode === 'shop');
            });
        });

        this.rateService.addEventListener('rateChanged', () => this.update());
    }

    #createItem(label = '', price = null, checked = false) {
        return { id: this.#nextId++, label, price, checked };
    }

    #addItem(label = '', price = null) {
        const item = this.#createItem(label, price);
        this.#items.push(item);
        this.#save();

        const el = document.createElement('div');
        el.innerHTML = this.#itemHTML(item);
        const itemEl = el.firstElementChild;
        this.listElement.appendChild(itemEl);
        this.#wireListeners(itemEl, item.id);

        // focus new label
        itemEl.querySelector('.tally-label').focus();
        this.update();
    }

    #duplicateItem(id) {
        const source = this.#items.find(i => i.id === id);
        if (!source) return;
        const item = this.#createItem(source.label, source.price);
        this.#items.push(item);
        this.#save();

        const el = document.createElement('div');
        el.innerHTML = this.#itemHTML(item);
        const itemEl = el.firstElementChild;

        // insert after source element
        const sourceEl = document.getElementById(`tally-${id}`);
        sourceEl.insertAdjacentElement('afterend', itemEl);
        this.#wireListeners(itemEl, item.id);
        this.update();
    }

    #removeItem(id) {
        this.#items = this.#items.filter(i => i.id !== id);
        document.getElementById(`tally-${id}`).remove();
        this.#save();
        this.update();
    }

    #toggleItem(id) {
        const item = this.#items.find(i => i.id === id);
        if (!item) return;
        item.checked = !item.checked;
        document.getElementById(`tally-${id}`).classList.toggle('checked', item.checked);
        this.#save();
        this.update();
    }

    #save() {
        localStorage.setItem('tallyItems', JSON.stringify(this.#items));
        localStorage.setItem('tallyNextId', this.#nextId);
    }

    #load() {
        const stored = localStorage.getItem('tallyItems');
        if (stored) {
            this.#items = JSON.parse(stored);
            this.#nextId = parseInt(localStorage.getItem('tallyNextId')) ||
                this.#items.reduce((max, i) => Math.max(max, i.id), 0) + 1;
        }
        this.#renderAll();
    }

    #itemHTML(item) {
        return `
            <div class="tally-item ${item.checked ? 'checked' : ''}" id="tally-${item.id}" data-id="${item.id}">
                <input type="checkbox" class="tally-check" ${item.checked ? 'checked' : ''}>
                <input type="text" class="tally-label" value="${item.label}" placeholder="Item">
                <input type="number" class="tally-price" value="${item.price ?? ''}" placeholder="$0" min="0"step="any">
                <button class="duplicate" title="Duplicate"><svg><use href="#icon-duplicate"/></svg></button>
                <button class="red delete" title="Delete"><svg><use href="#icon-delete"/></svg></button>
            </div>`;
    }

    #wireListeners(row, id) {
        const checkbox = row.querySelector('.tally-check');
        const labelInput = row.querySelector('.tally-label');
        const priceInput = row.querySelector('.tally-price');
        const dupButton = row.querySelector('.duplicate');
        const delButton = row.querySelector('.delete');

        checkbox.addEventListener('change', () => this.#toggleItem(id));

        labelInput.addEventListener('input', () => {
            const item = this.#items.find(i => i.id === id);
            if (item) { item.label = labelInput.value; this.#save(); }
        });

        priceInput.addEventListener('input', () => {
            const item = this.#items.find(i => i.id === id);
            if (item) {
                item.price = parseFloat(priceInput.value) || null;
                this.#save();
                this.update();
            }
        });

        dupButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#duplicateItem(id);
        });

        delButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = this.#items.find(i => i.id === id);
            if (confirm(`Delete "${item?.label || 'this item'}"?`)) {
                this.#removeItem(id);
            }
        });
    }

    #renderAll() {
        this.listElement.innerHTML = this.#items.map(i => this.#itemHTML(i)).join('');
        this.listElement.querySelectorAll('.tally-item').forEach(row => {
            this.#wireListeners(row, parseInt(row.dataset.id));
        });
        this.update();
    }

    addExternalItem(label, price) {
        this.#addItem(label, price);
    }

    update() {
        const withPrice = this.#items.filter(i => i.price !== null);
        const checked = withPrice.filter(i => i.checked);
        const unchecked = withPrice.filter(i => !i.checked);
        const totalForeign = withPrice.reduce((sum, i) => sum + i.price, 0);
        const spentForeign = checked.reduce((sum, i) => sum + i.price, 0);
        const remainingForeign = unchecked.reduce((sum, i) => sum + i.price, 0);

        this.spentForeignOutput.textContent = this.rateService.formatForeignFull(spentForeign);
        this.spentLocalOutput.textContent = this.rateService.formatLocalFull(this.rateService.toLocal(spentForeign));
        this.remainingForeignOutput.textContent = this.rateService.formatForeignFull(remainingForeign);
        this.remainingLocalOutput.textContent = this.rateService.formatLocalFull(this.rateService.toLocal(remainingForeign));
        this.updateSummary(this.rateService.formatLocalFull(this.rateService.toLocal(totalForeign)));
    }
}

class NotesCard extends Card {
    #notes = [];
    #nextId = 1;
    #activeNoteId = null;

    constructor() {
        super('card-notes');

        // elements
        this.listElement = document.getElementById('notes-list');
        this.addButton = document.getElementById('notes-add');
        this.clearButton = document.getElementById('notes-clear');

        // init        
        const stored = localStorage.getItem('notes');
        if (stored) {
            this.#notes = JSON.parse(stored);
            this.#nextId = parseInt(localStorage.getItem('notesNextId')) ||
                this.#notes.reduce((max, n) => Math.max(max, n.id), 0) + 1;
        }
        this.#renderAll();

        // listeners
        this.addButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#addNote();
        });

        this.clearButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Clear all notes?')) {
                this.#notes = [];
                this.#nextId = 1;
                this.#activeNoteId = null;
                this.#save();
                this.#renderAll();
            }
        });
    }

    #createNote(title = '', body = '') {
        return { id: this.#nextId++, title, body };
    }

    #addNote() {
        const note = this.#createNote();
        this.#notes.push(note);
        this.#activeNoteId = note.id;
        this.#save();

        const el = document.createElement('div');
        el.innerHTML = this.#noteHTML(note);
        const noteEl = el.firstElementChild;
        this.listElement.appendChild(noteEl);
        this.#wireListeners(noteEl, note.id);
        this.#updateCollapseState();
        this.#updateSummaryCount();

        noteEl.querySelector('.title').focus();
    }

    #removeNote(id) {
        this.#notes = this.#notes.filter(n => n.id !== id);
        if (this.#activeNoteId === id) this.#activeNoteId = null;
        document.getElementById(`note-${id}`).remove();
        this.#save();
        this.#updateSummaryCount();
    }

    #toggleCollapse(id) {
        this.#activeNoteId = this.#activeNoteId === id ? null : id;
        this.#updateCollapseState();
        this.#save();
    }

    #updateCollapseState() {
        this.listElement.querySelectorAll('.note').forEach(b => b.classList.remove('open'));
        if (this.#activeNoteId !== null) {
            const noteElement = document.getElementById(`note-${this.#activeNoteId}`);
            noteElement.classList.add('open');
            const textarea = noteElement.querySelector('textarea');
            this.#autoResize(textarea);
        }
    }

    #autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    #updateSummaryCount() {
        const count = this.#notes.length;
        this.updateSummary(count > 0 ? `${count} note${count > 1 ? 's' : ''}` : '');
    }

    #save() {
        localStorage.setItem('notes', JSON.stringify(this.#notes));
        localStorage.setItem('notesNextId', this.#nextId);
    }

    #noteHTML(note) {
        return `
            <div class="note" id="note-${note.id}" data-id="${note.id}">
                <div class="header">
                    <button class="toggle" title="Toggle"><svg><use href="#icon-collapse"/></svg></button>
                    <input type="text" class="title" value="${note.title}" placeholder="Note title">
                </div>
                <div class="body">
                    <textarea placeholder="Type your note here…">${note.body}</textarea>
                    <div class="actions">
                        <button class="copy" title="Copy"><svg><use href="#icon-clipboard"/></svg></button>
                        <button class="red delete" title="Delete"><svg><use href="#icon-delete"/></svg></button>
                    </div>
                </div>
            </div>`;
    }

    #wireListeners(row, id) {
        const toggleBtn = row.querySelector('.toggle');
        const titleInput = row.querySelector('.title');
        const textarea = row.querySelector('textarea');
        const deleteBtn = row.querySelector('.delete');
        const copyBtn = row.querySelector('.copy');

        this.#autoResize(textarea);

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#toggleCollapse(id);
        });

        titleInput.addEventListener('input', () => {
            const note = this.#notes.find(n => n.id === id);
            if (note) { note.title = titleInput.value; this.#save(); }
        });

        textarea.addEventListener('input', () => {
            const note = this.#notes.find(n => n.id === id);
            if (note) {
                note.body = textarea.value;
                this.#save();
                this.#autoResize(textarea);
            }
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const note = this.#notes.find(n => n.id === id);
            if (confirm(`Delete "${note?.title || 'this note'}"?`)) {
                this.#removeNote(id);
            }
        });

        copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const note = this.#notes.find(n => n.id === id);
            if (!note) return;
            const text = note.title ? `${note.title}\n\n${note.body}` : note.body;
            try {
                await navigator.clipboard.writeText(text);
                copyBtn.innerHTML = '<svg><use href="#icon-check"/></svg>';
                setTimeout(() => copyBtn.innerHTML = '<svg><use href="#icon-clipboard"/></svg>', 1500);
            } catch {
                console.warn('Copy failed');
            }
        });
    }

    #renderAll() {
        this.listElement.innerHTML = this.#notes.map(n => this.#noteHTML(n)).join('');
        this.listElement.querySelectorAll('.note').forEach(row => {
            this.#wireListeners(row, parseInt(row.dataset.id));
            this.#autoResize(row.querySelector('textarea'));
        });
        this.#updateCollapseState();
        this.#updateSummaryCount();
    }
}

class DebtCard extends Card {
    #debts = [];
    #nextId = 1;
    #direction = 'owe';
    #formVisible = false;

    constructor(rateService) {
        super('card-debt');
        this.rateService = rateService;

        // elements
        this.listElement = document.getElementById('debt-list');
        this.formElement = document.getElementById('debt-form');
        this.personInput = document.getElementById('debt-person');
        this.noteInput = document.getElementById('debt-note');
        this.amountForeignInput = document.getElementById('debt-amount-foreign');
        this.amountLocalInput = document.getElementById('debt-amount-local');
        this.dirButtons = document.querySelectorAll('.debt-dir-btn');
        this.addButton = document.getElementById('debt-add');
        this.clearButton = document.getElementById('debt-clear');
        this.toggleButton = document.getElementById('debt-toggle');

        // init — form hidden by default
        this.formElement.style.display = 'none';

        // load
        this.#load();

        // toggle form
        this.toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#setFormVisible(!this.#formVisible);
        });

        // direction buttons
        this.dirButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.#direction = btn.dataset.dir;
                this.dirButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // bidirectional amount
        this.amountForeignInput.addEventListener('input', () => {
            const val = parseFloat(this.amountForeignInput.value);
            if (!isNaN(val) && this.amountForeignInput.value !== '') {
                this.amountLocalInput.value =
                    this.rateService.formatLocalInput(this.rateService.toLocal(val));
            } else {
                this.amountLocalInput.value = '';
            }
        });

        this.amountLocalInput.addEventListener('input', () => {
            const val = parseFloat(this.amountLocalInput.value);
            if (!isNaN(val) && this.amountLocalInput.value !== '') {
                this.amountForeignInput.value =
                    this.rateService.formatForeignInput(this.rateService.toForeign(val));
            } else {
                this.amountForeignInput.value = '';
            }
        });

        this.addButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#addDebt();
        });

        this.clearButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Clear all debts?')) {
                this.#debts = [];
                this.#nextId = 1;
                this.#save();
                this.#renderAll();
            }
        });
    }

    #setFormVisible(visible) {
        this.#formVisible = visible;
        this.formElement.style.display = visible ? '' : 'none';
        if (visible) this.personInput.focus();
    }

    #addDebt() {
        const person = this.personInput.value.trim();
        const note = this.noteInput.value.trim();

        if (!person) { this.personInput.focus(); return; }

        const foreignVal = parseFloat(this.amountForeignInput.value);
        if (isNaN(foreignVal) || foreignVal <= 0) { this.amountForeignInput.focus(); return; }

        const debt = {
            id: this.#nextId++,
            person,
            amount: this.rateService.toLocal(foreignVal),
            direction: this.#direction,
            note,
            settled: false
        };

        this.#debts.push(debt);
        this.#save();

        // append single element
        const el = document.createElement('div');
        el.innerHTML = this.#debtHTML(debt);
        const debtEl = el.firstElementChild;
        this.listElement.appendChild(debtEl);
        this.#wireListeners(debtEl, debt.id);

        this.#clearForm();
        this.#setFormVisible(false);
        this.update();
    }

    #clearForm() {
        this.personInput.value = '';
        this.noteInput.value = '';
        this.amountForeignInput.value = '';
        this.amountLocalInput.value = '';
        this.dirButtons.forEach(b => b.classList.remove('active'));
        this.dirButtons[0].classList.add('active');
        this.#direction = 'owe';
    }

    #removeDebt(id) {
        this.#debts = this.#debts.filter(d => d.id !== id);
        document.getElementById(`debt-${id}`).remove();
        this.#save();
        this.update();
    }

    #toggleSettled(id) {
        const debt = this.#debts.find(d => d.id === id);
        if (!debt) return;
        debt.settled = !debt.settled;
        document.getElementById(`debt-${id}`).classList.toggle('settled', debt.settled);
        this.#save();
        this.update();
    }

    #save() {
        localStorage.setItem('debts', JSON.stringify(this.#debts));
        localStorage.setItem('debtsNextId', this.#nextId);
    }

    #load() {
        const stored = localStorage.getItem('debts');
        if (stored) {
            this.#debts = JSON.parse(stored);
            this.#nextId = parseInt(localStorage.getItem('debtsNextId')) ||
                this.#debts.reduce((max, d) => Math.max(max, d.id), 0) + 1;
        }
        this.#renderAll();
    }

    #debtHTML(debt) {
        return `
            <div class="debt-entry ${debt.settled ? 'settled' : ''}" id="debt-${debt.id}" data-id="${debt.id}">
                <input type="checkbox" class="settled" title="Mark settled" ${debt.settled ? 'checked' : ''}>
                <div class="info">
                    <span>${debt.person}</span>
                    <span class="direction ${debt.direction}">${debt.direction === 'owe' ? 'is owed' : 'owes me'}</span>
                    <span class="highlight">${this.rateService.formatLocalFull(debt.amount)}</span>
                    ${debt.note ? ` for ${debt.note}` : ''}
                </div>
                <button class="red delete" title="Delete"><svg><use href="#icon-delete"/></svg></button>
            </div>`;
    }

    #wireListeners(row, id) {
        const checkbox = row.querySelector('.settled');
        const deleteBtn = row.querySelector('.delete');

        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.#toggleSettled(id);
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const debt = this.#debts.find(d => d.id === id);
            if (confirm(`Delete debt with ${debt?.person || 'this person'}?`)) {
                this.#removeDebt(id);
            }
        });
    }

    #renderAll() {
        this.listElement.innerHTML = this.#debts.map(d => this.#debtHTML(d)).join('');
        this.listElement.querySelectorAll('.debt-entry').forEach(row => {
            this.#wireListeners(row, parseInt(row.dataset.id));
        });
        this.update();
    }

    update() {
        const active = this.#debts.filter(d => !d.settled);
        const oweCount = active.filter(d => d.direction === 'owe').length;
        const owedCount = active.filter(d => d.direction === 'owedBy').length;

        if (this.#debts.length === 0) {
            this.updateSummary('');
        } else if (oweCount === 0 && owedCount === 0) {
            this.updateSummary('All settled');
        } else {
            this.updateSummary(`Owe ${oweCount} · Owed ${owedCount}`);
        }
    }
}

class ConversionsCard extends Card {
    constructor() {
        super('card-conversions');
        this.listElement = document.getElementById('conversions-list');
        this.#build();
    }

    #build() {
        this.listElement.innerHTML = Config.conversions.map(conv => `
            <div class="row-equation conversion-row" data-id="${conv.id}">
                <div class="label-group">
                    <label>${conv.labelA}</label>
                    <input type="number" class="conv-a" placeholder="0" step="any">
                </div>
                <div class="arrow-label">
                    <svg><use href="#icon-sync"/></svg>
                </div>
                <div class="label-group">
                    <label>${conv.labelB}</label>
                    <input type="number" class="conv-b" placeholder="0" step="any">
                </div>
            </div>
        `).join('');

        this.listElement.querySelectorAll('.conversion-row').forEach(row => {
            const id = row.dataset.id;
            const conv = Config.conversions.find(c => c.id === id);
            const convA = row.querySelector('.conv-a');
            const convB = row.querySelector('.conv-b');

            convA.addEventListener('input', () => {
                if (convA.value === '') { convB.value = ''; return; }
                const result = conv.toB(parseFloat(convA.value));
                convB.value = this.#format(result, conv.decimals);
            });

            convB.addEventListener('input', () => {
                if (convB.value === '') { convA.value = ''; return; }
                const result = conv.toA(parseFloat(convB.value));
                convA.value = this.#format(result, conv.decimals);
            });
        });
    }

    #format(value, decimals) {
        if (isNaN(value) || !isFinite(value)) return '';
        return parseFloat(value.toFixed(decimals));
    }
}

class TimezonesCard extends Card {
    #zones = [];
    #nextId = 1;
    #interval = null;
    #pendingZone = null; // { tz, displayName } waiting for label confirmation

    constructor() {
        super('card-timezones');

        // elements
        this.listElement = document.getElementById('tz-list');
        this.formElement = document.getElementById('tz-form');
        this.addBtn = document.getElementById('tz-add-btn');
        this.searchInput = document.getElementById('tz-search');
        this.searchBtn = document.getElementById('tz-search-btn');
        this.resultEl = document.getElementById('tz-result');
        this.labelRow = document.getElementById('tz-label-row');
        this.labelInput = document.getElementById('tz-label');
        this.confirmBtn = document.getElementById('tz-confirm-btn');
        this.curatedEl = document.getElementById('tz-curated');
        this.curatedSelect = document.getElementById('tz-curated-select');

        // init
        this.#load();
        this.#startClock();

        // toggle form
        this.addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#toggleForm();
        });

        // search
        this.searchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#search();
        });

        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.stopPropagation(); this.#search(); }
        });
        this.curatedSelect.addEventListener('change', (e) => {
            e.stopPropagation();
            const selected = Config.timeZones.find(z => z.tz === e.target.value);
            if (!selected) return;
            this.#pendingZone = { tz: selected.tz, displayName: selected.label };
            this.labelRow.style.display = '';
            this.labelInput.value = selected.label;
            this.labelInput.focus();
            this.labelInput.select();
        });

        // confirm add
        this.confirmBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#confirmAdd();
        });

        this.labelInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.stopPropagation(); this.#confirmAdd(); }
        });
    }

    #toggleForm() {
        const visible = this.formElement.classList.toggle('visible');
        if (visible) {
            this.searchInput.focus();
        } else {
            this.#resetForm();
        }
    }

    #resetForm() {
        this.searchInput.value = '';
        this.labelInput.value = '';
        this.resultEl.textContent = 'Enter a city, region, or landmark';
        this.resultEl.className = 'tz-result';
        this.labelRow.style.display = 'none';
        this.curatedEl.style.display = 'none';
        this.curatedSelect.innerHTML = '<option value="">— select —</option>';
        this.#pendingZone = null;
    }

    #searchCurated(query) {
        const q = query.toLowerCase();
        return Config.timeZones.filter(z =>
            z.label.toLowerCase().includes(q) ||
            z.tz.toLowerCase().includes(q)
        );
    }

    async #search() {
        const query = this.searchInput.value.trim();
        if (!query) { this.searchInput.focus(); return; }

        this.resultEl.className = 'tz-result';
        this.resultEl.textContent = 'Searching…';
        this.labelRow.style.display = 'none';
        this.curatedEl.style.display = 'none';
        this.searchBtn.disabled = true;

        const result = await this.#lookupTimezone(query);
        this.searchBtn.disabled = false;

        if (result.error) {
            this.resultEl.className = 'tz-result error';
            this.resultEl.textContent = result.error === 'timeout' ? 'Request timed out · select from list below' :
                result.error === 'notfound' ? `No results found · select from list below` :
                    'Web call failed · select from list below';

            const matches = this.#searchCurated(query);
            const list = matches.length ? matches : Config.timeZones;

            this.curatedSelect.innerHTML = '<option value="">— select —</option>' +
                list.map(z => `<option value="${z.tz}">${z.label} · ${z.tz}</option>`).join('');

            this.curatedEl.style.display = '';
        } else {
            this.#pendingZone = result;
            this.resultEl.className = 'tz-result';
            this.resultEl.textContent = `Found: ${result.displayName} · ${result.tz}`; 
            this.labelRow.style.display = '';
            this.labelInput.value = result.displayName.split(',')[0].trim();
            this.labelInput.focus();
            this.labelInput.select();
        }
    }

    async #lookupTimezone(city) {
        try {
            const signal = AbortSignal.timeout(5000);

            const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
                { signal }
            );
            const geoData = await geoRes.json();
            if (!geoData.length) return { error: 'notfound' };

            const { lat, lon, display_name } = geoData[0];

            const tzRes = await fetch(
                `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`,
                { signal }
            );
            const tzData = await tzRes.json();

            return {
                tz: tzData.timeZone,
                displayName: display_name.split(',').slice(0, 2).join(',').trim()
            };
        } catch (err) {
            return { error: err.name === 'AbortError' ? 'timeout' : 'offline' };
        }
    }

    #confirmAdd() {
        if (!this.#pendingZone) return;
        const label = this.labelInput.value.trim() || this.#pendingZone.displayName;

        const zone = {
            id: this.#nextId++,
            label,
            tz: this.#pendingZone.tz
        };

        this.#zones.push(zone);
        this.#save();

        // append single element
        const el = document.createElement('div');
        el.innerHTML = this.#zoneHTML(zone);
        const zoneEl = el.firstElementChild;
        this.listElement.appendChild(zoneEl);
        this.#wireListeners(zoneEl, zone.id);
        this.#updateTime(zoneEl, zone.tz);

        this.#resetForm();
        this.formElement.classList.remove('visible');
        this.#updateSummary();
    }

    #removeZone(id) {
        this.#zones = this.#zones.filter(z => z.id !== id);
        document.getElementById(`tz-${id}`).remove();
        this.#save();
        this.#updateSummary();
    }

    #startClock() {
        this.#updateAllTimes();
        this.#interval = setInterval(() => this.#updateAllTimes(), 1000);
    }

    #updateAllTimes() {
        this.listElement.querySelectorAll('.tz-entry').forEach(row => {
            const id = parseInt(row.dataset.id);
            const zone = row.dataset.local === 'true'
                ? { tz: Intl.DateTimeFormat().resolvedOptions().timeZone }
                : this.#zones.find(z => z.id === id);
            if (zone) this.#updateTime(row, zone.tz);
        });
    }

    #updateTime(row, tz) {
        const now = new Date();

        const timeStr = now.toLocaleTimeString('en-US', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        const offsetStr = now.toLocaleDateString('en-US', {
            timeZone: tz,
            timeZoneName: 'short'
        }).split(', ')[1] || '';

        const dateStr = now.toLocaleDateString('en-US', {
            timeZone: tz,
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        const timeEl = row.querySelector('.tz-entry-time');
        const offsetEl = row.querySelector('.tz-entry-offset');

        if (timeEl) timeEl.textContent = timeStr;
        if (offsetEl) offsetEl.textContent = `${offsetStr} · ${dateStr}`;
    }

    #save() {
        localStorage.setItem('timezones', JSON.stringify(this.#zones));
        localStorage.setItem('timezonesNextId', this.#nextId);
    }

    #load() {
        const stored = localStorage.getItem('timezones');
        if (stored) {
            this.#zones = JSON.parse(stored);
            this.#nextId = parseInt(localStorage.getItem('timezonesNextId')) ||
                this.#zones.reduce((max, z) => Math.max(max, z.id), 0) + 1;
        }
        this.#renderAll();
    }

    #localZoneHTML() {
        const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return `
            <div class="tz-entry local" data-id="0" data-local="true">
                <div class="tz-entry-info">
                    <span class="tz-entry-label">Local</span>
                    <span class="tz-entry-tz">${localTz}</span>
                </div>
                <div>
                    <div class="tz-entry-time">—</div>
                    <div class="tz-entry-offset">—</div>
                </div>
            </div>`;
    }

    #zoneHTML(zone) {
        return `
            <div class="tz-entry" id="tz-${zone.id}" data-id="${zone.id}">
                <div class="tz-entry-info">
                    <span class="tz-entry-label">${zone.label}</span>
                    <span class="tz-entry-tz">${zone.tz}</span>
                </div>
                <div>
                    <div class="tz-entry-time">—</div>
                    <div class="tz-entry-offset">—</div>
                </div>
                <button class="red tz-delete" title="Delete">
                    <svg><use href="#icon-delete"/></svg>
                </button>
            </div>`;
    }

    #wireListeners(row, id) {
        const deleteBtn = row.querySelector('.tz-delete');
        if (!deleteBtn) return; // local entry has no delete
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const zone = this.#zones.find(z => z.id === id);
            if (confirm(`Remove ${zone?.label || 'this timezone'}?`)) {
                this.#removeZone(id);
            }
        });
    }

    #renderAll() {
        this.listElement.innerHTML = this.#localZoneHTML() +
            this.#zones.map(z => this.#zoneHTML(z)).join('');

        this.listElement.querySelectorAll('.tz-entry:not(.local)').forEach(row => {
            this.#wireListeners(row, parseInt(row.dataset.id));
        });

        this.#updateAllTimes();
        this.#updateSummary();
    }

    #updateSummary() {
        const count = this.#zones.length;
        this.updateSummary(count > 0 ? `+${count}` : '');
    }
}

class App {
    #wakeLock = null;
    #installPrompt = null;
    #isInstalled = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
    #isIOS() {
        return /iphone|ipad|ipod/i.test(navigator.userAgent);
    }

    constructor() {
        // services
        this.rateService = new RateService();

        // cards
        new RateCard(this.rateService);
        new ReferenceCard(this.rateService);
        new CostCard(this.rateService);
        new MarketWeightCard(this.rateService);
        new BillCard(this.rateService);
        new MarketTallyCard(this.rateService);
        new NotesCard(this.rateService);
        new DebtCard(this.rateService);
        new ConversionsCard(this.rateService);
        new TimezonesCard(this.rateService);

        // init
        this.rateService.fetchRate();
        this.#registerServiceWorker();
        this.#setupInstallPrompt();
        this.#setupWakeLock();
        this.#setupShareButton();
        this.#getVersion().then(v => {
            document.getElementById('footer-version').textContent = `v${v}`;
        });
    }

    #registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => {
                // when a new service worker takes control, reload the page
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    window.location.reload();
                });
            })
            .catch(err => console.warn('SW registration failed:', err));
    }

    #setupInstallPrompt() {
        this.installBanner = document.getElementById('install-banner');

        if (this.#isInstalled) {
            this.installBanner.classList.remove('visible');
            return;
        }

        this.installBanner.classList.add('visible');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.#installPrompt = e;
        });

        window.addEventListener('appinstalled', () => {
            this.#installPrompt = null;
            this.#isInstalled = true;
            this.installBanner.innerHTML = '<svg><use href="#icon-check"/></svg> Installed';
        });

        this.installBanner.addEventListener('click', async () => {
            if (this.#installPrompt) {
                this.#installPrompt.prompt();
                const { outcome } = await this.#installPrompt.userChoice;
                if (outcome === 'accepted') {
                    this.#installPrompt = null;
                    this.#isInstalled = true;
                    this.installBanner.innerHTML = '<svg><use href="#icon-check"/></svg> Installed';
                }
            } else if (this.#isIOS()) {
                alert('To install on iOS:\n\n1. Tap the Share button (□↑) at the bottom of Safari\n2. Tap "Add to Home Screen"\n3. Tap "Add"');
            } else {
                this.installBanner.innerHTML = '<svg><use href="#icon-check"/></svg> Installed';
                this.installBanner.style.pointerEvents = 'none';
            }
        });
    }

    #setupWakeLock() {
        if (!('wakeLock' in navigator)) return;

        // request wake lock when app is visible
        const requestWakeLock = async () => {
            try {
                this.#wakeLock = await navigator.wakeLock.request('screen');
            } catch (err) {
                console.warn('Wake lock failed:', err);
            }
        };

        // re-request when tab becomes visible again — wake lock releases on tab switch
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        });

        requestWakeLock();
    }

    #setupShareButton() {
        const shareBtn = document.getElementById('share-btn');

        // hide if Web Share API not supported
        if (!navigator.share) {
            shareBtn.style.display = 'none';
            return;
        }

        shareBtn.addEventListener('click', async () => {
            try {
                await navigator.share({
                    title: 'Travel Tools',
                    text: 'Currency converter and travel calculator',
                    url: 'https://prossable.github.io/travel-tools/'
                });
            } catch (err) {
                // user cancelled or share failed — fail silently
                if (err.name !== 'AbortError') {
                    console.warn('Share failed:', err);
                }
            }
        });
    }

    async #getVersion() {
        if (!('caches' in window)) return 'unknown';

        // wait for service worker to be ready before reading cache
        if ('serviceWorker' in navigator) {
            await navigator.serviceWorker.ready;
        }

        const keys = await caches.keys();
        const cache = keys.find(k => k.startsWith('travel-tools-'));
        return cache ? cache.replace('travel-tools-', '') : 'unknown';
    }
}

new App();