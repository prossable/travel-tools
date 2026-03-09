class Config {
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
        // check cache
        const cached = JSON.parse(localStorage.getItem('cachedRate'));
        const today = new Date().toISOString().split('T')[0];
        if (!force && cached && cached.date === today && cached.currency === this.#foreignCurrency.code) {
            this.setRate(cached.rate);
            this.dispatchEvent(new CustomEvent('messageSent', {
                detail: { msg: `Cached rate as of ${this.formatDate(cached.date)}` }
            }));
            return;
        }

        // notify
        this.dispatchEvent(new CustomEvent('stateChanged', {
            detail: { busy: true }
        }));
        this.dispatchEvent(new CustomEvent('messageSent', {
            detail: { msg: 'Fetching live rate…' }
        }));

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
                this.dispatchEvent(new CustomEvent('messageSent', {
                    detail: { msg: msg }
                }));
            })
            .finally(() => {
                this.dispatchEvent(new CustomEvent('stateChanged', {
                    detail: { busy: false }
                }));
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

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString(
            this.#localCurrency.locale, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
}

class Card {
    constructor(cardId, summaryId) {
        this.cardElement = document.getElementById(cardId);
        this.cardBody = this.cardElement.querySelector('.card-body');
        this.cardHeader = this.cardElement.querySelector('.card-header');
        this.summaryOutput = document.getElementById(summaryId);
        this.collapseButton = this.cardHeader.querySelector('.collapse-btn');
        this.collapseButton.style.display = 'none';

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
        // collapse all
        document.querySelectorAll('.card').forEach(b => b.classList.remove('open'));
        document.querySelectorAll('.card-body').forEach(b => b.classList.remove('open'));
        document.querySelectorAll('.collapse-btn').forEach(b => b.style.display = 'none');

        // open this one
        this.cardElement.classList.add('open');
        this.cardBody.classList.add('open');
        this.collapseButton.style.display = 'block';
    }

    collapse() {
        this.cardElement.classList.remove('open');
        this.cardBody.classList.remove('open');
        this.collapseButton.style.display = 'none';
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
        super('card-rate', 'summary-rate');
        this.rateService = rateService;

        // elements
        this.rateInput = document.getElementById('rate');
        this.rateHintOutput = document.getElementById('rate-hint');
        this.rateRefreshButton = document.getElementById('rate-refresh');

        // listeners
        this.rateInput.addEventListener('input', () => {
            this.rateHintOutput.textContent = "Manually set rate";
            this.rateService.setRate(parseFloat(this.rateInput.value));
        });
        this.rateRefreshButton.addEventListener('click', () => this.rateService.fetchRate(true));
        this.rateService.addEventListener('rateChanged', (e) => {
            if (document.activeElement !== this.rateInput) {
                this.rateInput.value = e.detail.rate;
            }
            this.updateSummary(this.rateService.formatForeignFull(e.detail.rate));
        });
        this.rateService.addEventListener('stateChanged', (e) => this.rateRefreshButton.disabled = e.detail.busy);
        this.rateService.addEventListener('messageSent', (e) => this.rateHintOutput.textContent = e.detail.msg);
    }
}

class ReferenceCard extends Card {
    static referenceAmounts = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 5000];

    constructor(rateService) {
        super('card-reference', 'summary-reference');
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
        super('card-cost', 'summary-cost');
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
        super('card-market', 'summary-market');
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
        super('card-bill', 'summary-bill');
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
    #mode = 'plan'; // 'plan' | 'shop'

    constructor(rateService) {
        super('card-tally', 'summary-tally');
        this.rateService = rateService;

        // bindings
        this.render = this.render.bind(this);
        this.update = this.update.bind(this);

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
                this.render();
            }
        });
        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.#mode = btn.dataset.mode;
                this.modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.render();
            });
        });
        this.rateService.addEventListener('rateChanged', () => this.update());
    }

    #createItem(label = '', price = null, checked = false) {
        return { id: this.#nextId++, label, price, checked };
    }

    #addItem(label = '', price = null) {
        this.#items.push(this.#createItem(label, price));
        this.#save();
        this.render();
        // focus the new label input
        const inputs = this.listElement.querySelectorAll('.tally-label');
        if (inputs.length) inputs[inputs.length - 1].focus();
    }

    #removeItem(id) {
        this.#items = this.#items.filter(item => item.id !== id);
        this.#save();
        this.render();
    }

    #duplicateItem(id) {
        const source = this.#items.find(item => item.id === id);
        if (!source) return;
        this.#items.push(this.#createItem(source.label, source.price));
        this.#save();
        this.render();
    }

    #toggleItem(id) {
        const item = this.#items.find(item => item.id === id);
        if (item) item.checked = !item.checked;
        this.#save();
        this.render();
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
        this.render();
    }

    addExternalItem(label, price) {
        this.#addItem(label, price);
    }

    render() {
        this.listElement.innerHTML = this.#items.map(item => `
            <div class="tally-item ${this.#mode === 'shop' ? 'shop-mode' : ''} ${item.checked ? 'checked' : ''}" 
                 data-id="${item.id}">
                <input type="checkbox" class="tally-check" ${item.checked ? 'checked' : ''}>
                <input type="text" 
                       class="tally-label" 
                       value="${item.label}" 
                       placeholder="Item">
                <input type="number" 
                       class="tally-price" 
                       value="${item.price ?? ''}" 
                       placeholder="$0"
                       min="0" 
                       step="any">
                <button class="duplicate" title="Duplicate"><svg><use href="#icon-duplicate" /></svg></button>
                <button class="red delete" title="Delete"><svg><use href="#icon-delete" /></svg></button>
            </div>
        `).join('');

        // wire up row listeners
        this.listElement.querySelectorAll('.tally-item').forEach(row => {
            const id = parseInt(row.dataset.id);
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
                if (confirm(`Delete ${this.#items.find(i => i.id === id)?.label || 'this item'}?`)) {
                    this.#removeItem(id);
                }
            });
        });

        this.update();
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

    constructor() {
        super('card-notes', 'summary-notes');

        // elements
        this.listElement = document.getElementById('notes-list');
        this.addButton = document.getElementById('notes-add');
        this.clearButton = document.getElementById('notes-clear');

        // init
        this.#load();

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
                this.#save();
                this.render();
            }
        });
    }

    #createNote(title = '', body = '', collapsed = false) {
        return { id: this.#nextId++, title, body, collapsed };
    }

    #addNote() {
        this.#notes.push(this.#createNote());
        this.#save();
        this.render();
        // focus new note title
        const titles = this.listElement.querySelectorAll('.note-title');
        if (titles.length) titles[titles.length - 1].focus();
    }

    #removeNote(id) {
        this.#notes = this.#notes.filter(n => n.id !== id);
        this.#save();
        this.render();
    }

    #toggleCollapse(id) {
        const note = this.#notes.find(n => n.id === id);
        if (note) note.collapsed = !note.collapsed;
        this.#save();
        this.render();
    }

    #autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    #save() {
        localStorage.setItem('notes', JSON.stringify(this.#notes));
        localStorage.setItem('notesNextId', this.#nextId);
    }

    #load() {
        const stored = localStorage.getItem('notes');
        if (stored) {
            this.#notes = JSON.parse(stored);
            this.#nextId = parseInt(localStorage.getItem('notesNextId')) ||
                this.#notes.reduce((max, n) => Math.max(max, n.id), 0) + 1;
        }
        this.render();
    }

    render() {
        this.listElement.innerHTML = this.#notes.map(note => `
                    <div class="note-item" data-id="${note.id}">
                        <div class="note-toolbar ${note.collapsed ? 'collapsed' : ''}">
                            <button class="note-toggle" title="Toggle">
                                <svg class="note-chevron ${note.collapsed ? 'collapsed' : ''}"><use href="#icon-collapse" /></svg>
                            </button>
                            <input type="text" 
                                class="note-title" 
                                value="${note.title}" 
                                placeholder="Note title">
                        </div>
                        <div class="note-body-wrap ${note.collapsed ? 'collapsed' : ''}">
                            <textarea class="note-body" 
                                    placeholder="Type your note here…"
                            >${note.body}</textarea>
                            <div class="note-actions">
                                <button class="note-copy" title="Copy"><svg><use href="#icon-clipboard" /></svg></button>
                                <button class="red note-delete" title="Delete"><svg><use href="#icon-delete" /></svg></button>
                            </div>
                        </div>
                    </div>`).join('');

        // wire up row listeners
        this.listElement.querySelectorAll('.note-item').forEach(row => {
            const id = parseInt(row.dataset.id);
            const toggleBtn = row.querySelector('.note-toggle');
            const titleInput = row.querySelector('.note-title');
            const textarea = row.querySelector('.note-body');
            const deleteBtn = row.querySelector('.note-delete');
            const copyBtn = row.querySelector('.note-copy');

            // auto resize on load
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
                const label = note?.title || 'this note';
                if (confirm(`Delete "${label}"?`)) {
                    this.#removeNote(id);
                }
            });

            copyBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const note = this.#notes.find(n => n.id === id);
                if (!note) return;
                const text = note.title
                    ? `${note.title}\n\n${note.body}`
                    : note.body;
                try {
                    await navigator.clipboard.writeText(text);
                    copyBtn.innerHTML = '<svg><use href="#icon-check" /></svg>';
                    setTimeout(() => copyBtn.innerHTML = '<svg><use href="#icon-clipboard" /></svg>', 1500);
                } catch {
                    console.warn('Copy failed');
                }
            });
        });

        // update summary — note count
        const count = this.#notes.length;
        this.updateSummary(count > 0 ? `${count} note${count > 1 ? 's' : ''}` : '');
    }
}

class DebtCard extends Card {
    #debts = [];
    #nextId = 1;
    #direction = 'owe';
    #lastAmountCurrency = 'foreign';

    constructor(rateService) {
        super('card-debt', 'summary-debt');
        this.rateService = rateService;

        // bindings
        this.render = this.render.bind(this);
        this.update = this.update.bind(this);

        // elements
        this.listElement = document.getElementById('debt-list');
        this.personInput = document.getElementById('debt-person');
        this.noteInput = document.getElementById('debt-note');
        this.amountForeignInput = document.getElementById('debt-amount-foreign');
        this.amountLocalInput = document.getElementById('debt-amount-local');
        this.dirButtons = document.querySelectorAll('.debt-dir-btn');
        this.addButton = document.getElementById('debt-add');

        // init
        this.#load();

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
            this.#lastAmountCurrency = 'foreign';
            const val = parseFloat(this.amountForeignInput.value);
            if (!isNaN(val) && this.amountForeignInput.value !== '') {
                this.amountLocalInput.value =
                    this.rateService.formatLocalInput(this.rateService.toLocal(val));
            } else {
                this.amountLocalInput.value = '';
            }
        });

        this.amountLocalInput.addEventListener('input', () => {
            this.#lastAmountCurrency = 'local';
            const val = parseFloat(this.amountLocalInput.value);
            if (!isNaN(val) && this.amountLocalInput.value !== '') {
                this.amountForeignInput.value =
                    this.rateService.formatForeignInput(this.rateService.toForeign(val));
            } else {
                this.amountForeignInput.value = '';
            }
        });

        // add button
        this.addButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#addDebt();
        });

        // rate changes
        this.rateService.addEventListener('rateChanged', () => this.update());
    }

    #addDebt() {
        const person = this.personInput.value.trim();
        const note = this.noteInput.value.trim();

        if (!person) {
            this.personInput.focus();
            return;
        }

        const foreignVal = parseFloat(this.amountForeignInput.value);
        if (isNaN(foreignVal) || foreignVal <= 0) {
            this.amountForeignInput.focus();
            return;
        }

        this.#debts.push({
            id: this.#nextId++,
            person,
            amount: foreignVal,
            direction: this.#direction,
            note,
            settled: false
        });

        this.#save();
        this.render();
        this.#clearForm();
    }

    #clearForm() {
        this.personInput.value = '';
        this.noteInput.value = '';
        this.amountForeignInput.value = '';
        this.amountLocalInput.value = '';
        this.dirButtons.forEach(b => b.classList.remove('active'));
        this.dirButtons[0].classList.add('active');
        this.#direction = 'owe';
        this.personInput.focus();
    }

    #removeDebt(id) {
        this.#debts = this.#debts.filter(d => d.id !== id);
        this.#save();
        this.render();
    }

    #toggleSettled(id) {
        const debt = this.#debts.find(d => d.id === id);
        if (debt) debt.settled = !debt.settled;
        this.#save();
        this.render();
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
        this.render();
    }

    render() {
        if (this.#debts.length === 0) {
            this.listElement.innerHTML = '';
            this.update();
            return;
        }

        this.listElement.innerHTML = this.#debts.map(debt => `
            <div class="debt-entry ${debt.settled ? 'settled' : ''}" data-id="${debt.id}">
                <input type="checkbox" class="debt-settled" title="Mark settled" ${debt.settled ? 'checked' : ''}>
                <div>
                    ${debt.person}
                    <span class="debt-entry-direction ${debt.direction}">${debt.direction === 'owe' ? 'is owed' : 'owes me'}</span>
                    <span class="highlight">${this.rateService.formatLocalFull(this.rateService.toLocal(debt.amount))}</span> 
                    ${debt.note ? `for <span class="highlight">${debt.note}</span>` : ''}
                </div>
                <button class="red debt-delete" title="Delete">✕</button>
            </div>
        `).join('');

        // wire up row listeners
        this.listElement.querySelectorAll('.debt-entry').forEach(row => {
            const id = parseInt(row.dataset.id);
            const checkbox = row.querySelector('.debt-settled');
            const deleteBtn = row.querySelector('.debt-delete');

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
        });

        this.update();
    }

    update() {
        const active = this.#debts.filter(d => !d.settled);
        const oweCount = active.filter(d => d.direction === 'owe').length;
        const owedCount = active.filter(d => d.direction === 'owedBy').length;
        if (oweCount === 0 && owedCount === 0) {
            this.updateSummary('All settled');
        } else {
            this.updateSummary(`Owe ${oweCount} · Owed ${owedCount}`);
        }
    }
}

class App {
    #wakeLock = null;
    #installPrompt = null;
    #isInstalled = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true
        || localStorage.getItem('appInstalled') === 'true';
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
            .then(reg => console.log('SW registered:', reg.scope))
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
            this.installBanner.innerHTML = '<svg><use href="#icon-install"/></svg> Install App';
        });

        window.addEventListener('appinstalled', () => {
            this.#installPrompt = null;
            this.#isInstalled = true;
            localStorage.setItem('appInstalled', 'true');
            this.installBanner.innerHTML = '<svg><use href="#icon-check"/></svg>App Installed';
            setTimeout(() => this.installBanner.classList.remove('visible'), 3000);
        });

        this.installBanner.addEventListener('click', async () => {
            if (this.#installPrompt) {
                this.#installPrompt.prompt();
                const { outcome } = await this.#installPrompt.userChoice;
                if (outcome === 'accepted') {
                    this.#installPrompt = null;
                    this.#isInstalled = true;
                    localStorage.setItem('appInstalled', 'true');
                    this.installBanner.innerHTML = '<svg><use href="#icon-check"/></svg>App Installed';
                    setTimeout(() => this.installBanner.classList.remove('visible'), 3000);
                }
            } else if (this.#isIOS()) {
                alert('To install on iOS:\n\n1. Tap the Share button (□↑) at the bottom of Safari\n2. Tap "Add to Home Screen"\n3. Tap "Add"');
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
        console.log("getVersion");
        if (!('caches' in window)) return 'unknown';
        console.log("good");

        // wait for service worker to be ready before reading cache
        if ('serviceWorker' in navigator) {
            await navigator.serviceWorker.ready;
        }
        console.log("done");

        const keys = await caches.keys();
        console.log(keys);
        console.log('cache keys:', keys); // debug — what's actually there?
        const cache = keys.find(k => k.startsWith('travel-tools-'));
        return cache ? cache.replace('travel-tools-', '') : 'unknown';
    }
}

new App();