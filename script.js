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
            e.stopPropagation();
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
    constructor() {
        super('card-rate');

        // elements
        this.rateInput = document.getElementById('rate');
        this.rateLabel = document.getElementById('rate-label');
        this.hintOutput = document.getElementById('rate-hint');
        this.autoFetchCheckbox = document.getElementById('rate-auto-fetch');
        this.refreshButton = document.getElementById('rate-refresh');
        this.currencySelect = document.getElementById('rate-currency');

        // populate currency select — exclude USD (local currency)
        Object.values(Config.currencies)
            .filter(c => c.code !== 'USD')
            .forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.code;
                opt.textContent = `${c.code} > ${c.region} ${c.name}`;
                this.currencySelect.appendChild(opt);
            });

        // init
        const rate = RateService.getRate();
        this.currencySelect.value = RateService.getForeignCurrency().code;
        this.rateInput.value = rate;
        this.autoFetchCheckbox.checked = StorageService.getAutoFetchRate();
        this.hintOutput.textContent = RateService.getMessage();
        this.#updateLabel();
        this.updateSummary(RateService.formatForeignFull(rate));

        // listeners
        this.currencySelect.addEventListener('change', (e) => {
            e.stopPropagation();
            RateService.setForeignCurrency(e.target.value);
            this.#updateLabel();
        });
        this.rateInput.addEventListener('input', () => {
            this.hintOutput.textContent = 'Using a custom rate';
            const val = parseFloat(this.rateInput.value);
            StorageService.setStoredRate(val, true);
            RateService.setRate(val);
            this.autoFetchCheckbox.checked = false;
            StorageService.setAutoFetchRate(false);
        });
        this.autoFetchCheckbox.addEventListener('change', () => {
            StorageService.setAutoFetchRate(this.autoFetchCheckbox.checked);
        });
        this.refreshButton.addEventListener('click', (e) => {
            e.stopPropagation();
            RateService.fetchRate(true);
        });

        RateService.onRateChanged((e) => {
            if (document.activeElement !== this.rateInput) {
                this.rateInput.value = e.detail.rate;
            }
            this.updateSummary(RateService.formatForeignFull(e.detail.rate));
        });
        RateService.onStateChanged((e) => { this.refreshButton.disabled = e.detail.busy; });
        RateService.onMessageSent((e) => { this.hintOutput.textContent = e.detail.msg; });
    }

    #updateLabel() {
        const foreign = RateService.getForeignCurrency();
        this.rateLabel.textContent = `${foreign.symbol} ${foreign.code} per $1 USD`;
    }
}

class ReferenceCard extends Card {
    #multiplier = 1;

    constructor() {
        super('card-reference');

        // elements
        this.tableEl = document.getElementById('reference-table');
        this.multBtns = document.querySelectorAll('.ref-mult-btn');

        // init
        this.#multiplier = RateService.getForeignCurrency().multiplier ?? 1;
        this.#syncMultiplierButtons();
        this.#render();

        // listeners
        this.multBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.#multiplier = parseInt(btn.dataset.mult);
                this.#syncMultiplierButtons();
                this.#update();
            });
        });
        RateService.onRateChanged(() => this.#update());
        RateService.onCurrencyChanged(() => {
            this.#multiplier = RateService.getForeignCurrency().multiplier ?? 1;
            this.#syncMultiplierButtons();
            this.#update();
        });
    }

    #syncMultiplierButtons() {
        this.multBtns.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.mult) === this.#multiplier);
        });
    }

    #render() {
        const rows = Config.referenceAmounts.map(amount => `
        <div class="ref-row" data-amount="${amount}">
            <span class="ref-foreign"></span>
            <span class="ref-local highlight"></span>
        </div>`).join('');

        this.tableEl.innerHTML = `
        <div class="ref-row ref-header">
            <span id="ref-header-foreign"></span>
            <span id="ref-header-local" class="highlight"></span>
        </div>
        ${rows}`;

        // store header refs once
        this.headerForeign = document.getElementById('ref-header-foreign');
        this.headerLocal = document.getElementById('ref-header-local');

        this.#update();
    }

    #update() {
        const local = RateService.getLocalCurrency();
        const foreign = RateService.getForeignCurrency();

        // update headers
        this.headerForeign.textContent = foreign.code;
        this.headerLocal.textContent = local.code;

        // update rows
        this.tableEl.querySelectorAll('.ref-row[data-amount]').forEach(row => {
            const scaled = parseFloat(row.dataset.amount) * this.#multiplier;
            row.querySelector('.ref-foreign').textContent = RateService.formatForeignSymbol(scaled);
            row.querySelector('.ref-local').textContent = RateService.formatLocalSymbol(RateService.toLocal(scaled));
        });
    }
}

class CostCard extends Card {
    constructor() {
        super('card-cost');

        // elements
        this.costForeignLabel = document.getElementById('cost-foreign-label');
        this.costForeignInput = document.getElementById('cost-foreign-val');
        this.costLocalLabel = document.getElementById('cost-local-label');
        this.costLocalInput = document.getElementById('cost-local-val');
        this.costQuantityInput = document.getElementById('cost-qty');
        this.costQuantityMinusButton = document.getElementById('cost-qty-minus');
        this.costQuantityPlusButton = document.getElementById('cost-qty-plus');
        this.costTotalLabel = document.getElementById('cost-total-label');
        this.costTotalOutput = document.getElementById('cost-total-val');

        // init
        this.#updateLabels();

        // listeners
        this.costQuantityMinusButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.costQuantityInput.value = Math.max(1, this.#getQuantity() - 1);
            this.#updateValues();
        });
        this.costQuantityPlusButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.costQuantityInput.value = this.#getQuantity() + 1;
            this.#updateValues();
        });
        this.costQuantityInput.addEventListener('input', () => this.#updateValues());
        this.costForeignInput.addEventListener('input', () => {
            if (this.costForeignInput.value === '') { this.costLocalInput.value = ''; return; }
            this.#updateValues();
        });
        this.costLocalInput.addEventListener('input', () => {
            if (this.costLocalInput.value === '') { this.costForeignInput.value = ''; return; }
            this.costForeignInput.value = RateService.toForeign(this.costLocalInput.value);
            this.#updateValues();
        });
        RateService.onRateChanged(() => { this.#updateValues(); });
        RateService.onCurrencyChanged(() => {
            this.#updateLabels();
            this.costForeignInput.value = '';
            this.#updateValues();
        });
    }

    #updateLabels() {
        const local = RateService.getLocalCurrency();
        const foreign = RateService.getForeignCurrency();
        this.costForeignLabel.textContent = `${foreign.name} (${foreign.code})`;
        this.costLocalLabel.textContent = `${local.name} (${local.code})`;
        this.costTotalLabel.textContent = `Total (${local.code})`;
    }

    #updateValues() {
        const foreign = parseFloat(this.costForeignInput.value);
        if (isNaN(foreign) || this.costForeignInput.value === '') {
            this.costLocalInput.value = '';
            this.costTotalOutput.value = '';
            this.updateSummary('');
            return;
        }

        const localPerUnit = RateService.toLocal(foreign);
        const total = localPerUnit * this.#getQuantity();
        if (document.activeElement !== this.costLocalInput) {
            this.costLocalInput.value = RateService.formatLocalInput(localPerUnit);
        }
        this.costTotalOutput.value = RateService.formatLocalSymbol(total);
        this.updateSummary(RateService.formatLocalFull(total));
    }

    #getQuantity() {
        return Math.max(1, parseInt(this.costQuantityInput.value) || 1);
    }
}

class MarketWeightCard extends Card {
    constructor() {
        super('card-market');

        // elements
        this.ratelabel = document.getElementById('market-rate-label');
        this.rateInput = document.getElementById('market-rate-val');
        this.weightlabel = document.getElementById('market-weight-label');
        this.weightInput = document.getElementById('market-weight-val');
        this.foreignlabel = document.getElementById('market-foreign-label');
        this.foreignOutput = document.getElementById('market-foreign-val');
        this.locallabel = document.getElementById('market-local-label');
        this.localOutput = document.getElementById('market-local-val');

        // init
        this.#updateLabels();

        // listeners
        this.rateInput.addEventListener('input', (e) => { this.#updateValues(); });
        this.weightInput.addEventListener('input', (e) => { this.#updateValues(); });
        RateService.onRateChanged((e) => { this.#updateValues(); });
        RateService.onCurrencyChanged(() => { this.#updateLabels() });
    }

    #updateLabels() {
        const foreign = RateService.getForeignCurrency();
        const local = RateService.getLocalCurrency();
        this.ratelabel.textContent = `${foreign.name} / KG`;
        this.foreignlabel.textContent = `Total (${foreign.code})`;
        this.locallabel.textContent = `Total (${local.code})`;
    }

    #updateValues() {
        const rate = parseFloat(this.rateInput.value);
        const weight = parseFloat(this.weightInput.value);
        if (isNaN(rate) || isNaN(weight) || this.rateInput.value === '' || this.weightInput.value === '') {
            this.foreignOutput.value = '';
            this.localOutput.value = '';
            this.updateSummary('');
            return;
        }
        const totalForeign = rate * weight;
        const totalLocal = RateService.toLocal(totalForeign);
        this.foreignOutput.value = RateService.formatForeignSymbol(totalForeign);
        this.localOutput.value = RateService.formatLocalSymbol(totalLocal);
        this.updateSummary(RateService.formatLocalFull(totalLocal));
    }
}

class BillCard extends Card {
    lastBillPercent = null;
    #splitRows = [];

    constructor() {
        super('card-bill');

        // elements
        this.foreignLabel = document.getElementById('bill-foreign-label');
        this.foreignInput = document.getElementById('bill-foreign-val');
        this.localLabel = document.getElementById('bill-local-label');
        this.localInput = document.getElementById('bill-local-val');
        this.peopleInput = document.getElementById('bill-people');
        this.peopleMinusButton = document.getElementById('bill-people-minus');
        this.peoplePlusButton = document.getElementById('bill-people-plus');
        this.tipButtons = document.getElementById('tip-options').querySelectorAll('button');
        this.tipCustomInput = document.getElementById('bill-tip-custom');
        this.tipForeignLabel = document.getElementById('bill-foreign-tip-label');
        this.tipForeignOutput = document.getElementById('bill-foreign-tip-val');
        this.tipLocalLabel = document.getElementById('bill-local-tip-label');
        this.tipLocalOutput = document.getElementById('bill-local-tip-val');
        this.totalForeignLabel = document.getElementById('bill-foreign-total-label');
        this.totalForeignOutput = document.getElementById('bill-foreign-total-val');
        this.totalLocalLabel = document.getElementById('bill-local-total-label');
        this.totalLocalOutput = document.getElementById('bill-local-total-val');
        this.splitList = UIDisplay.create(document.getElementById('split-list'), false);
        this.splitRowsEl = document.getElementById('split-rows');
        this.splitOffsetLabel = document.getElementById('split-offset-label');

        // listeners
        this.modeInput = new InputTab(document.getElementById('bill-mode'), 'even', (e) => {
            this.#syncRows();
            this.#updateValues();
        });

        this.foreignInput.addEventListener('input', () => {
            if (this.foreignInput.value === '') { this.localInput.value = ''; return; }
            this.#updateValues();
        });
        this.localInput.addEventListener('input', () => {
            if (this.localInput.value === '') { this.foreignInput.value = ''; return; }
            this.foreignInput.value = RateService.formatForeignInput(RateService.toForeign(this.localInput.value));
            this.#updateValues();
        });
        this.peopleInput.addEventListener('input', () => {
            this.#syncRows();
            this.#updateValues();
        });
        this.peopleMinusButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.peopleInput.value = Math.max(1, this.#getPeople() - 1);
            this.#syncRows();
            this.#updateValues();
        });
        this.peoplePlusButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.peopleInput.value = this.#getPeople() + 1;
            this.#syncRows();
            this.#updateValues();
        });
        this.tipButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.lastBillPercent = parseFloat(btn.dataset.pct);
                this.tipCustomInput.value = '';
                this.setTipPreset(btn);
                this.#updateValues();
            });
        });
        this.tipCustomInput.addEventListener('input', () => {
            this.lastBillPercent = parseFloat(this.tipCustomInput.value) || null;
            this.setTipCustom();
            this.#updateValues();
        });
        RateService.onRateChanged(() => this.#updateValues());
        RateService.onCurrencyChanged(() => {
            this.#updateLabels();
            this.#updateValues();
        });

        // init
        this.#updateLabels();
    }

    // ── Split rows ────────────────────────────────────

    #syncRows() {
        const count = this.#getPeople();

        // add missing rows
        while (this.#splitRows.length < count) {
            const id = this.#splitRows.length + 1;
            const row = this.#buildRow(id);
            this.#splitRows.push(row);
            this.splitRowsEl.appendChild(row.el);
        }

        // hide/show rows
        this.#splitRows.forEach((row, i) => {
            row.el.style.display = i < count ? '' : 'none';
        });

        // toggle uneven list
        this.splitList.setDisplay(this.modeInput.getValue() === 'uneven' && this.#getPeople() > 1);
    }

    #buildRow(index) {
        const el = document.createElement('div');
        el.className = 'split-row';
        el.innerHTML = `
            <input type="text" class="split-name" placeholder="Person ${index}">
            <input type="number" class="split-offset" placeholder="0" min="0" step="any">
            <span class="split-tip">—</span>
            <span class="split-total">—</span>            
            <button class="split-currency-btn">${RateService.getForeignCurrency().code}</button>`;

        const currencyBtn = el.querySelector('.split-currency-btn');
        const offsetInput = el.querySelector('.split-offset');

        // currency toggle
        currencyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isForeign = currencyBtn.textContent === RateService.getForeignCurrency().code;
            currencyBtn.textContent = isForeign
                ? RateService.getLocalCurrency().code
                : RateService.getForeignCurrency().code;
            this.#updateValues();
        });

        // offset change triggers recalc
        offsetInput.addEventListener('blur', () => {
            const bill = parseFloat(this.foreignInput.value) || 0;
            const val = parseFloat(offsetInput.value) || 0;
            offsetInput.value = Math.min(Math.max(0, val), bill);
            this.#updateValues();
        });

        return {
            el,
            get currencyBtn() { return el.querySelector('.split-currency-btn'); },
            get nameInput() { return el.querySelector('.split-name'); },
            get offsetInput() { return el.querySelector('.split-offset'); },
            get tipEl() { return el.querySelector('.split-tip'); },
            get totalEl() { return el.querySelector('.split-total'); },
        };
    }

    // ── Labels ────────────────────────────────────────

    #updateLabels() {
        const foreign = RateService.getForeignCurrency();
        const local = RateService.getLocalCurrency();

        this.foreignLabel.textContent = `Bill (${foreign.code})`;
        this.localLabel.textContent = `Bill (${local.code})`;
        this.tipForeignLabel.textContent = `Tip (${foreign.code})`;
        this.tipLocalLabel.textContent = `Tip (${local.code})`;
        this.totalForeignLabel.textContent = `Total (${foreign.code})`;
        this.totalLocalLabel.textContent = `Total (${local.code})`;

        this.splitOffsetLabel.textContent = `Offset ${foreign.code}`;
        // reset currency buttons to foreign on currency change
        this.#splitRows.forEach(row => {
            row.currencyBtn.textContent = foreign.code;
        });
    }

    // ── Calculations ──────────────────────────────────

    #getPeople() { return Math.max(1, parseInt(this.peopleInput.value) || 1); }

    #updateValues() {
        const people = this.#getPeople();
        const pct = this.lastBillPercent;
        const foreign = parseFloat(this.foreignInput.value);

        if (isNaN(foreign) || this.foreignInput.value === '') {
            this.localInput.value = '';
            this.tipForeignOutput.value = '';
            this.tipLocalOutput.value = '';
            this.totalForeignOutput.value = '';
            this.totalLocalOutput.value = '';
            this.updateSummary('');
            this.#clearSplitRows();
            return;
        }

        if (document.activeElement !== this.localInput) {
            this.localInput.value = RateService.formatLocalInput(RateService.toLocal(foreign));
        }

        if (pct === null || isNaN(pct)) {
            this.tipForeignOutput.value = '';
            this.tipLocalOutput.value = '';
            this.totalForeignOutput.value = '';
            this.totalLocalOutput.value = '';
            this.updateSummary('');
            this.#clearSplitRows();
            return;
        }

        const tipF = foreign * (pct / 100);
        const tipL = RateService.toLocal(tipF);
        const tipPerF = tipF / people;
        const subF = foreign / people;
        const finalF = subF + tipPerF;
        const finalL = RateService.toLocal(finalF);

        // even mode outputs
        if (people == 1 || this.modeInput.getValue() === 'uneven') {
            this.tipForeignOutput.value = RateService.formatForeignSymbol(tipF);
            this.tipLocalOutput.value = RateService.formatLocalSymbol(tipL);
            this.totalForeignOutput.value = RateService.formatForeignSymbol(foreign + tipF);
            this.totalLocalOutput.value = RateService.formatLocalSymbol(RateService.toLocal(foreign + tipF));
            this.updateSummary(RateService.formatLocalFull(RateService.toLocal(foreign + tipF)));
        } else {
            this.tipForeignOutput.value = `${RateService.formatForeignSymbol(tipPerF)} (${RateService.formatForeignSymbol(tipF)})`;
            this.tipLocalOutput.value = `${RateService.formatLocalSymbol(RateService.toLocal(tipPerF))} (${RateService.formatLocalSymbol(tipL)})`;
            this.totalForeignOutput.value = `${RateService.formatForeignSymbol(finalF)} (${RateService.formatForeignSymbol(foreign + tipF)})`;
            this.totalLocalOutput.value = `${RateService.formatLocalSymbol(finalL)} (${RateService.formatLocalSymbol(RateService.toLocal(foreign + tipF))})`;
            this.updateSummary(`${RateService.formatLocalFull(finalL)} / person`);
        }

        // uneven mode
        if (this.modeInput.getValue() === 'uneven') this.#updateSplitRows(foreign, tipF);
    }

    #updateSplitRows(foreign, tipF) {
        const count = this.#getPeople();
        const activeRows = this.#splitRows.slice(0, count);

        // sum of offsets
        const totalOffset = activeRows.reduce((sum, row) => {
            const val = parseFloat(row.offsetInput.value) || 0;
            return sum + val;
        }, 0);

        const remainder = foreign - totalOffset;
        const perPerson = remainder / count;

        activeRows.forEach(row => {
            const offset = Math.min(Math.max(0, parseFloat(row.offsetInput.value) || 0), foreign);
            const sub = perPerson + offset;
            const tip = (sub / foreign) * tipF;
            const total = sub + tip;
            const isForeign = row.currencyBtn.textContent === RateService.getForeignCurrency().code;

            row.tipEl.textContent = isForeign
                ? RateService.formatForeignSymbol(tip)
                : RateService.formatLocalSymbol(RateService.toLocal(tip));
            row.totalEl.textContent = isForeign
                ? RateService.formatForeignSymbol(total)
                : RateService.formatLocalSymbol(RateService.toLocal(total));
        });
    }

    #clearSplitRows() {
        this.#splitRows.forEach(row => {
            row.tipEl.textContent = '—';
            row.totalEl.textContent = '—';
        });
    }

    // ── Tip helpers ───────────────────────────────────

    setTipPreset(btn) {
        this.tipButtons.forEach(b => b.classList.remove('active'));
        this.tipCustomInput.classList.remove('active');
        if (btn) btn.classList.add('active');
    }

    setTipCustom() {
        this.tipButtons.forEach(b => b.classList.remove('active'));
        this.tipCustomInput.classList.add('active');
    }
}

class MarketTallyCard extends Card {
    #items = [];
    #nextId = 1;
    #listManager;

    constructor() {
        super('card-tally');

        // elements
        this.listElement = document.getElementById('tally-list');
        this.addButton = document.getElementById('tally-add');
        this.selectAllButton = document.getElementById('tally-select');
        this.deleteButton = document.getElementById('tally-delete');
        this.spentForeignOutput = document.getElementById('tally-spent-foreign');
        this.spentLocalOutput = document.getElementById('tally-spent-local');
        this.remainingForeignOutput = document.getElementById('tally-remaining-foreign');
        this.remainingLocalOutput = document.getElementById('tally-remaining-local');

        // list manager
        const listActions = [
            { icon: '#icon-add', label: 'Add below', onClick: (id) => this.#addItemAfter(id) },
            { icon: '#icon-arrow-up', label: 'Move up', onClick: (id) => this.#moveItem(id, -1) },
            { icon: '#icon-arrow-down', label: 'Move down', onClick: (id) => this.#moveItem(id, 1) }
        ];
        this.#listManager = new ListManager(this.listElement,
            this.selectAllButton,
            this.deleteButton,
            'tally-',
            listActions,
            (item) => { return this.#itemHTML(item); },
            (ids) => {
                const names = [...ids]
                    .map(id => this.#items.find(i => i.id === id)?.label)
                    .filter(Boolean)
                    .join(', ');
                if (confirm(`Delete basket items: ${names}?`)) {
                    ids.forEach(id => {
                        this.#items = this.#items.filter(i => i.id !== id);
                        this.#listManager.remove(id);
                    });
                    this.#listManager.setItems(this.#items);
                    this.#listManager.clearSelection();
                    this.#save();
                    this.update();
                }
            },
            (ids) => { this.deleteButton.disabled = ids.size === 0; }
        );

        // add
        this.addButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#addItem();
        });

        // rate / currency
        RateService.onRateChanged(() => this.update());
        RateService.onCurrencyChanged(() => this.update());

        // init
        this.#load();
    }

    // ── Private ───────────────────────────────────────

    #createItem(label = '', price = null, checked = false) {
        return { id: this.#nextId++, label, price, checked };
    }

    #addItem(label = '', price = null) {
        const item = this.#createItem(label, price);
        this.#items.push(item);
        this.#listManager.setItems(this.#items);

        var element = this.#listManager.add(item);
        element.querySelector('.tally-label').focus({ preventScroll: true });
        this.#wireListeners(element, item.id);

        this.#save();
        this.update();
    }

    #addItemAfter(id) {
        const index = this.#items.findIndex(i => i.id === id);
        const item = this.#createItem();
        this.#items.splice(index + 1, 0, item);
        this.#listManager.setItems(this.#items);

        var element = this.#listManager.add(item, id);
        element.querySelector('.tally-label').focus({ preventScroll: true });
        this.#wireListeners(element, item.id);

        this.#save();
        this.update();
    }

    #moveItem(id, direction) {
        const index = this.#items.findIndex(i => i.id === id);
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= this.#items.length) return;

        // swap in array
        [this.#items[index], this.#items[newIndex]] =
            [this.#items[newIndex], this.#items[index]];

        // swap in DOM
        const el = document.getElementById(`tally-${id}`);
        const sibling = direction === -1
            ? el.previousElementSibling
            : el.nextElementSibling;
        if (!sibling) return;
        if (direction === -1) {
            sibling.insertAdjacentElement('beforebegin', el);
        } else {
            sibling.insertAdjacentElement('afterend', el);
        }

        this.#listManager.setItems(this.#items);
        this.#save();
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

        this.#items.forEach(item => {
            var element = this.#listManager.add(item);
            this.#wireListeners(element, item.id);
        });
        this.#listManager.setItems(this.#items);
        this.update();
    }

    #itemHTML(item) {
        return `
            <div class="tally-item ${item.checked ? 'checked' : ''}" id="tally-${item.id}" data-id="${item.id}">
                <input type="checkbox" class="item-select" ${this.#listManager.isSelected(item.id) ? 'checked' : ''}>
                <div class="toggle tally-status">
                    <button class="${!item.checked ? 'active' : ''}"><svg><use href="#icon-basket"/></svg></button>
                    <button class="${item.checked ? 'active' : ''}"><svg><use href="#icon-check"/></svg></button>
                </div>
                <input type="text" class="tally-label if-checked" value="${item.label}" placeholder="Item">
                <input type="number" class="tally-price if-checked" value="${item.price ?? ''}" placeholder="0" min="0" step="any">
                <button class="item-handle" title="More"><svg><use href="#icon-menu"/></svg></button>
            </div>`;
    }

    #wireListeners(row, id) {
        const labelInput = row.querySelector('.tally-label');
        const priceInput = row.querySelector('.tally-price');
        const toggle = row.querySelector('.tally-status');

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

        InputHelper.setupToggle(
            toggle,
            this.#items.find(i => i.id === id)?.checked ?? false,
            (isChecked) => {
                const item = this.#items.find(i => i.id === id);
                if (!item) return;
                item.checked = isChecked;
                row.classList.toggle('checked', isChecked);
                this.#save();
                this.update();
            }
        );
    }

    // ── Public ────────────────────────────────────────

    update() {
        this.deleteButton.disabled = this.#listManager.getActiveIds().size === 0;

        const withPrice = this.#items.filter(i => i.price !== null);
        const got = withPrice.filter(i => i.checked);
        const need = withPrice.filter(i => !i.checked);
        const totalForeign = withPrice.reduce((sum, i) => sum + i.price, 0);
        const spentForeign = got.reduce((sum, i) => sum + i.price, 0);
        const remainingForeign = need.reduce((sum, i) => sum + i.price, 0);

        this.spentForeignOutput.textContent = RateService.formatForeignFull(spentForeign);
        this.spentLocalOutput.textContent = RateService.formatLocalFull(RateService.toLocal(spentForeign));
        this.remainingForeignOutput.textContent = RateService.formatForeignFull(remainingForeign);
        this.remainingLocalOutput.textContent = RateService.formatLocalFull(RateService.toLocal(remainingForeign));
        this.updateSummary(RateService.formatLocalFull(RateService.toLocal(totalForeign)));
    }

    addExternalItem(label, price) {
        this.#addItem(label, price);
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
        this.listElement.querySelectorAll('.note').forEach(b => UIDisplay.hide(b));
        if (this.#activeNoteId !== null) {
            const noteElement = document.getElementById(`note-${this.#activeNoteId}`);
            UIDisplay.show(noteElement);
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
            <div class="note" id="note-${note.id}" data-id="${note.id}" data-hide="close">
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
    #items = [];
    #nextId = 1;
    #listManager;

    constructor() {
        super('card-debt');

        // toolbar
        this.toggleButton = document.getElementById('debt-toggle');
        this.toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#toggleForm();
        });
        this.deleteButton = document.getElementById('debt-clear');

        // new item form
        this.formElement = UIDisplay.create(document.getElementById('debt-form'), false);
        this.personInput = document.getElementById('debt-person');
        this.noteInput = document.getElementById('debt-note');

        this.foreignLabel = document.getElementById('debt-foreign-label');
        this.foreignInput = document.getElementById('debt-foreign-val');
        this.foreignInput.addEventListener('input', () => {
            if (this.foreignInput.value === '') { this.localInput.value = ''; return; }
            this.localInput.value = RateService.formatLocalInput(RateService.toLocal(this.foreignInput.value));
        });

        this.localLabel = document.getElementById('debt-local-label');
        this.localInput = document.getElementById('debt-local-val');
        this.localInput.addEventListener('input', () => {
            if (this.localInput.value === '') { this.foreignInput.value = ''; return; }
            this.foreignInput.value = RateService.formatForeignInput(RateService.toForeign(this.localInput.value));
        });

        this.modeInput = new InputTab(document.getElementById('debt-mode'), 'owe');

        this.addButton = document.getElementById('debt-add');
        this.addButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#addDebt();
        });

        // list manager
        this.listElement = document.getElementById('debt-list');
        const listActions = [
            { icon: '#icon-arrow-up', label: 'Move up', onClick: (id) => this.#moveItem(id, -1) },
            { icon: '#icon-arrow-down', label: 'Move down', onClick: (id) => this.#moveItem(id, 1) }
        ];
        this.#listManager = new ListManager(this.listElement,
            document.getElementById('debt-select-all'),
            this.deleteButton,
            'debt-',
            listActions,
            (item) => { return this.#itemHTML(item); },
            (ids) => {
                console.log("delete", ids);
                if (confirm(`Delete ${ids.size} item(s)?`)) {
                    ids.forEach(id => {
                        this.#items = this.#items.filter(i => i.id !== id);
                        this.#listManager.remove(id);
                    });
                    this.#listManager.setItems(this.#items);
                    this.#listManager.clearSelection();
                    this.#save();
                    this.#update();
                }
            },
            (ids) => { this.deleteButton.disabled = ids.size === 0; }
        );

        // services
        RateService.onRateChanged(() => {
            if (this.foreignInput.value === '') return;
            if (document.activeElement !== this.localInput) {
                this.localInput.value = RateService.formatLocalInput(RateService.toLocal(this.foreignInput.value));
            }
        });
        RateService.onCurrencyChanged(() => {
            this.#updateLabels();
            this.foreignInput.value = '';
            this.localInput.value = '';
        });

        // init
        this.#updateLabels();
        this.#load();
    }

    // ── Private ───────────────────────────────────────

    #toggleForm() {
        this.formElement.toggleDisplay();
        if (this.formElement.isVisible) this.personInput.focus({ preventScroll: true });
    }

    #clearForm() {
        this.personInput.value = '';
        this.noteInput.value = '';
        this.foreignInput.value = '';
        this.localInput.value = '';
        this.modeInput.setValue('owe');
    }

    #addDebt() {
        const person = this.personInput.value.trim();
        const note = this.noteInput.value.trim();
        const foreignVal = parseFloat(this.foreignInput.value);

        if (!person) { this.personInput.focus(); return; }
        if (isNaN(foreignVal) || foreignVal <= 0) { this.foreignInput.focus(); return; }

        const debt = {
            id: this.#nextId++,
            person,
            amount: RateService.toLocal(foreignVal),
            direction: this.modeInput.getValue(),
            note,
            settled: false
        };

        this.#items.push(debt);
        this.#listManager.setItems(this.#items);

        var element = this.#listManager.add(debt);
        this.#wireListeners(element, debt.id);

        this.#clearForm();
        this.formElement.hide();
        this.#save();
        this.#update();
    }

    #moveItem(id, direction) {
        const index = this.#items.findIndex(i => i.id === id);
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= this.#items.length) return;

        // swap in array
        [this.#items[index], this.#items[newIndex]] =
            [this.#items[newIndex], this.#items[index]];

        // swap in DOM
        const el = document.getElementById(`debt-${id}`);
        const sibling = direction === -1
            ? el.previousElementSibling
            : el.nextElementSibling;
        if (!sibling) return;
        if (direction === -1) {
            sibling.insertAdjacentElement('beforebegin', el);
        } else {
            sibling.insertAdjacentElement('afterend', el);
        }

        this.#listManager.setItems(this.#items);
        this.#save();
    }

    #save() {
        localStorage.setItem('debts', JSON.stringify(this.#items));
        localStorage.setItem('debtsNextId', this.#nextId);
    }

    #load() {
        const stored = localStorage.getItem('debts');
        if (stored) {
            this.#items = JSON.parse(stored);
            this.#nextId = parseInt(localStorage.getItem('debtsNextId')) ||
                this.#items.reduce((max, d) => Math.max(max, d.id), 0) + 1;
        }

        this.#items.forEach(item => {
            var element = this.#listManager.add(item);
            this.#wireListeners(element, item.id);
        });
        this.#listManager.setItems(this.#items);
        this.#update();
    }

    #itemHTML(item) {
        return `
            <div class="debt-entry ${item.settled ? 'checked' : ''}" id="debt-${item.id}" data-id="${item.id}">
                <input type="checkbox" class="item-select" ${this.#listManager.isSelected(item.id) ? 'checked' : ''}>
                <div class="toggle settled-toggle">
                    <button class="${!item.settled ? 'active' : ''}"><svg><use href="#icon-debt"/></svg></button>
                    <button class="${item.settled ? 'active' : ''}"><svg><use href="#icon-check"/></svg></button>
                </div>
                <label class="if-checked">
                    <span>${item.person}</span>
                    <span class="direction ${item.direction}">${item.direction === 'owe' ? 'is owed' : 'owes me'}</span>
                    <span class="highlight">${RateService.formatLocalFull(item.amount)}</span>
                    ${item.note ? ` for ${item.note}` : ''}
                </label>
                <button class="item-handle" title="More"><svg><use href="#icon-menu"/></svg></button>
            </div>`;
    }

    #wireListeners(row, id) {
        const settledToggle = row.querySelector('.settled-toggle');
        InputHelper.setupToggle(
            settledToggle,
            this.#items.find(d => d.id === id)?.settled ?? false,
            (isSettled) => {
                const debt = this.#items.find(d => d.id === id);
                if (!debt) return;
                debt.settled = isSettled;
                row.classList.toggle('checked', isSettled);
                this.#save();
                this.#update();
            }
        );
    }

    #updateLabels() {
        const local = RateService.getLocalCurrency();
        const foreign = RateService.getForeignCurrency();
        this.foreignLabel.textContent = `Amount (${foreign.code})`;
        this.localLabel.textContent = `Amount (${local.code})`;
    }

    #update() {
        const active = this.#items.filter(d => !d.settled);
        const oweCount = active.filter(d => d.direction === 'owe').length;
        const owedCount = active.filter(d => d.direction === 'owedBy').length;

        if (this.#items.length === 0) {
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
        this.formElement = UIDisplay.create(document.getElementById('tz-form'), false);
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
        this.formElement.toggleDisplay();
        if (this.formElement.isVisible()) {
            this.searchInput.focus({ preventScroll: true });
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

            const list = Config.timeZones;
            this.curatedSelect.innerHTML = '<option value="">— select —</option>' +
                list.map(z => `<option value="${z.tz}">${z.label} · ${z.zone}</option>`).join('');
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
        this.formElement.hide();
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

class BudgetCard extends Card {
    #items = [];
    #nextId = 1;
    #targetAmount = null;
    #listManager;

    constructor() {
        super('card-budget');

        // toolbar
        this.targetInput = document.getElementById('budget-target');
        this.targetInput.addEventListener('input', () => {
            this.#targetAmount = parseFloat(this.targetInput.value) || null;
            localStorage.setItem('budgetTarget', this.#targetAmount ?? '');
            this.update();
        });
        const savedTarget = localStorage.getItem('budgetTarget');
        if (savedTarget) {
            this.#targetAmount = parseFloat(savedTarget);
            this.targetInput.value = this.#targetAmount;
        }

        this.newBtn = document.getElementById('budget-new-btn');
        this.newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#toggleForm();
        });

        this.selectAllButton = document.getElementById('budget-select-all');
        this.deleteButton = document.getElementById('budget-delete');

        // form
        this.formElement = UIDisplay.create(document.getElementById('budget-form'), false);

        this.noteInput = document.getElementById('budget-note');

        this.dateInput = new InputDate(document.getElementById('budget-date'),
            document.getElementById('budget-date-trigger'),
            RateService.getLocalDate());

        this.foreignLabel = document.getElementById('budget-foreign-label');
        this.foreignInput = document.getElementById('budget-amount-foreign');
        this.localLabel = document.getElementById('budget-local-label');
        this.localInput = document.getElementById('budget-amount-local');
        this.foreignInput.addEventListener('input', () => {
            if (this.foreignInput.value === '') {
                this.localInput.value = '';
                return;
            }
            this.localInput.value = RateService.formatLocalInput(
                RateService.toLocal(parseFloat(this.foreignInput.value))
            );
        });

        this.localInput.addEventListener('input', () => {
            if (this.localInput.value === '') {
                this.foreignInput.value = '';
                return;
            }
            this.foreignInput.value = RateService.formatForeignInput(
                RateService.toForeign(parseFloat(this.localInput.value))
            );
        });

        this.addBtn = document.getElementById('budget-add');
        this.addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#addItem();
        });

        // content
        this.budgetContent = UIDisplay.create(document.getElementById('budget-content'), false);

        // list manager
        this.#listManager = new ListManager(document.getElementById('budget-list'),
            this.selectAllButton,
            this.deleteButton,
            'budget-',
            null,
            (item) => { return this.#itemHTML(item); },
            (ids) => {
                const names = [...ids]
                    .map(id => this.#items.find(i => i.id === id)?.note)
                    .filter(Boolean)
                    .join(', ');
                if (confirm(`Delete budget items: ${names}?`)) {
                    ids.forEach(id => {
                        this.#items = this.#items.filter(i => i.id !== id);
                        this.#listManager.remove(id);
                    });
                    this.#listManager.setItems(this.#items);
                    this.#listManager.clearSelection();
                    this.#save();
                    this.update();
                }
            },
            (ids) => { this.deleteButton.disabled = ids.size === 0; }
        );

        // progress
        this.totalEl = document.getElementById('budget-total');
        this.progressFill = document.getElementById('budget-progress-fill');
        this.progressLabel = document.getElementById('budget-progress-label');

        // init
        this.#load();
        this.#updateLabels();

        // rate changes
        RateService.onRateChanged(() => this.update());
        RateService.onCurrencyChanged(() => {
            this.#updateLabels();
            this.update();
        });
    }

    // ── Private ───────────────────────────────────────

    #toggleForm() {
        const visible = this.formElement.toggleDisplay();
        if (visible) this.noteInput.focus({ preventScroll: true });
    }

    #clearForm() {
        this.noteInput.value = '';
        this.foreignInput.value = '';
        this.localInput.value = '';
        this.dateInput.setValue(RateService.getLocalDate());
    }

    #addItem() {
        const note = this.noteInput.value.trim();
        const localVal = parseFloat(this.localInput.value);
        const date = this.dateInput.getValue() || RateService.getLocalDate();

        if (!note) { this.noteInput.focus(); return; }
        if (isNaN(localVal) || localVal <= 0) { this.foreignInput.focus(); return; }

        const item = {
            id: this.#nextId++,
            note,
            date,
            amount: localVal
        };

        this.#items.push(item);
        this.#items.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
        this.#save();
        this.#renderAll();
        this.#clearForm();
        this.formElement.hide();
        this.update();
    }

    #updateLabels() {
        const foreign = RateService.getForeignCurrency();
        const local = RateService.getLocalCurrency();
        this.foreignLabel.textContent = `Amount (${foreign.code})`;
        this.localLabel.textContent = `Amount (${local.code})`;
    }

    #updateProgress() {
        const total = this.#items.reduce((sum, i) => sum + i.amount, 0);

        if ((!this.#targetAmount || this.#targetAmount <= 0) && this.#items.length === 0) {
            this.budgetContent.hide();
            return;
        }

        this.budgetContent.show();
        const pct = Math.min((total / this.#targetAmount) * 100, 100);
        const left = this.#targetAmount - total;
        const isOver = total > this.#targetAmount;
        const isWarn = pct >= 80 && !isOver;

        this.progressFill.style.width = `${pct}%`;
        this.progressFill.classList.toggle('warning', isWarn);
        this.progressFill.classList.toggle('over', isOver);

        if (isOver) {
            this.progressLabel.textContent =
                `${RateService.formatLocalSymbol(total)} spent · ${RateService.formatLocalSymbol(Math.abs(left))} over budget`;
        } else {
            this.progressLabel.textContent =
                `${RateService.formatLocalSymbol(total)} of ${RateService.formatLocalSymbol(this.#targetAmount)} · ${RateService.formatLocalSymbol(left)} left`;
        }
    }

    #itemHTML(item) {
        const dateStr = InputDate.format(item.date);
        const amountStr = RateService.formatLocalSymbol(item.amount);
        return `
            <div class="budget-entry" id="budget-${item.id}" data-id="${item.id}">
                <input type="checkbox" class="item-select" ${this.#listManager.isSelected(item.id) ? 'checked' : ''}>
                <label><span class="accent">${dateStr}: </span><span class="highlight">${amountStr}</span>  ${item.note}</label>
                <button class="item-handle" title="More"><svg><use href="#icon-menu"/></svg></button>
            </div>`;
    }

    #renderAll() {
        this.#listManager.clearItems();
        this.#items.forEach(item => {
            var element = this.#listManager.add(item);
        });
        this.#listManager.setItems(this.#items);
    }

    #save() {
        localStorage.setItem('budgetItems', JSON.stringify(this.#items));
        localStorage.setItem('budgetNextId', this.#nextId);
    }

    #load() {
        const stored = localStorage.getItem('budgetItems');
        if (stored) {
            this.#items = JSON.parse(stored);
            this.#nextId = parseInt(localStorage.getItem('budgetNextId')) ||
                this.#items.reduce((max, i) => Math.max(max, i.id), 0) + 1;
        }
        this.#renderAll();
        this.update();
    }

    // ── Public ────────────────────────────────────────

    update() {
        const total = this.#items.reduce((sum, i) => sum + i.amount, 0);
        const target = this.#targetAmount;
        const left = target ? target - total : null;
        const isOver = left !== null && left < 0;

        this.#updateProgress();
        this.updateSummary(
            target
                ? `${RateService.formatLocalSymbol(total)} / ${RateService.formatLocalSymbol(target)}`
                : RateService.formatLocalFull(total)
        );
    }

    addExternalItem(amount, note = '') {
        // prefill form from external source (e.g. basket)
        this.localInput.value = RateService.formatLocalInput(amount);
        this.foreignInput.value = RateService.formatForeignInput(RateService.toForeign(amount));
        if (note) this.noteInput.value = note;
        this.formElement.show();
        this.noteInput.focus({ preventScroll: true });
    }
}

class ChecklistCard extends Card {
    #lists = [];
    #activeList = null;
    #items = [];
    #listSelector;
    #templateSelector;
    #listManager;

    constructor() {
        super('card-checklist');

        // list toolbar
        this.newListBtn = document.getElementById('checklist-new-btn');
        this.newListBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.listForm.toggleDisplay();
            if (this.listForm.isVisible()) this.renameForm.hide();
        });

        const listSelect = document.getElementById('checklist-select');
        this.#listSelector = new InputSelector(listSelect, (val) => { this.#selectList(val); });

        this.renameListBtn = document.getElementById('checklist-rename-btn');
        this.renameListBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.renameForm.toggleDisplay();
            if (this.renameForm.isVisible()) this.listForm.hide();
        });

        this.deleteListBtn = document.getElementById('checklist-delete-btn');
        this.deleteListBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#deleteList();
        });

        // list form
        this.listForm = UIDisplay.create(document.getElementById('checklist-form'), false);

        this.nameInput = document.getElementById('checklist-name');
        this.nameInput.addEventListener('input', (e) => {
            e.stopPropagation();
            this.nameError.textContent = '';
        });
        this.nameError = document.getElementById('checklist-name-error');

        this.useTemplateCheck = document.getElementById('checklist-use-template');
        this.useTemplateCheck.addEventListener('change', (e) => {
            e.stopPropagation();
            const useTemplate = this.useTemplateCheck.checked;
            this.#templateSelector.setDisplay(useTemplate);
            if (useTemplate) {
                const templateId = this.#templateSelector.getValue();
                const template = Config.checklists.find(t => t.id === templateId);
                if (template) this.nameInput.value = template.name;
            } else {
                this.nameInput.value = '';
            }
        });

        const templateSelect = document.getElementById('checklist-template-select');
        this.#templateSelector = new InputSelector(templateSelect, (val) => {
            const template = Config.checklists.find(t => t.id === val);
            this.nameInput.value = template ? template.name : '';
            this.nameError.textContent = '';
        });
        const templates = Config.checklists.sort((a, b) => a.name.localeCompare(b.name));
        this.#templateSelector.addItems(templates.map(t => ({ value: t.id, label: t.name })));

        this.addBtn = document.getElementById('checklist-add-btn');
        this.addBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.#addList();
        });

        // rename form
        this.renameForm = UIDisplay.create(document.getElementById('checklist-rename-form'), false);
        this.renameInput = document.getElementById('checklist-rename');
        this.renameInput.addEventListener('input', () => {
            this.renameError.textContent = '';
        });
        this.renameInput.addEventListener('change', async () => {
            await this.#renameList(this.renameInput.value.trim());
        });
        this.renameError = document.getElementById('checklist-rename-error');

        // item toolbar
        this.toolbar = UIDisplay.create(document.getElementById('checklist-toolbar'), false);

        this.addItemBtn = document.getElementById('checklist-add-item-btn');
        this.addItemBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.#addItems(['']);
        });

        this.addItemsBtn = document.getElementById('checklist-add-items-btn');
        this.addItemsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.pasteForm.toggleDisplay();
        });

        this.selectAllBtn = document.getElementById('checklist-select-all-btn');
        this.deleteItemsBtn = document.getElementById('checklist-delete-items-btn');

        this.copyItemsBtn = document.getElementById('checklist-copy-items-btn');
        this.copyItemsBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const ids = this.#listManager.getActiveIds();
            const data = this.#items.filter(obj => ids.has(obj.id)).map(obj => obj.name).join(', ');
            await navigator.clipboard.writeText(data);
        });

        // items form
        this.pasteForm = UIDisplay.create(document.getElementById('checklist-paste-form'), false);
        this.pasteInput = document.getElementById('checklist-paste');

        this.pasteAddBtn = document.getElementById('checklist-paste-items-btn');
        this.pasteAddBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const names = this.pasteInput.value
                .split(/[\n\r\t,]+/)
                .map(n => n.trim())
                .filter(n => n.length > 0);
            this.#addItems(names);
        });

        // list element
        this.listContainer = UIDisplay.create(document.getElementById('checklist-content'), false);

        const listActions = [
            // { icon: '#icon-add', label: 'Add below', onClick: (id) => this.#addItemAfter(id) },
            // { icon: '#icon-arrow-up', label: 'Move up', onClick: (id) => this.#moveItem(id, -1) },
            // { icon: '#icon-arrow-down', label: 'Move down', onClick: (id) => this.#moveItem(id, 1) }
        ];
        this.#listManager = new ListManager(document.getElementById('checklist-list'),
            this.selectAllBtn,
            this.deleteItemsBtn,
            'cli-',
            listActions,
            (item) => { return this.#itemHTML(item); },
            async (ids) => {
                const names = [...ids]
                    .map(id => this.#items.find(i => i.id === id)?.name)
                    .filter(Boolean)
                    .join(', ');
                if (confirm(`Delete checklist items: ${names}?`)) {
                    ids.forEach(id => {
                        this.#items = this.#items.filter(i => i.id !== id);
                        this.#listManager.remove(id);
                    });
                    this.#listManager.setItems(this.#items);
                    this.#listManager.clearSelection();
                    await StorageService.deleteChecklistItems([...ids]);
                    await this.#updateListCounts();
                    this.#updateProgress();
                    this.#updateSummary();
                }
            },
            (ids) => { this.copyItemsBtn.disabled = this.#listManager.getActiveIds().size === 0; }
        );

        // progress
        this.progressFill = document.getElementById('checklist-progress-fill');
        this.progressLabel = document.getElementById('checklist-progress-label');

        // init
        this.#init();
    }

    // ── Private ───────────────────────────────────────

    async #init() {
        this.#lists = await StorageService.getChecklists();
        this.#lists.sort((a, b) => a.name.localeCompare(b.name));
        this.#syncListSelector();
        if (this.#lists.length > 0) await this.#selectList(this.#lists[0].id);
        this.#updateSummary();
        this.#resetForm();
    }

    async #selectList(id) {
        id = parseInt(id);
        this.#activeList = this.#lists.find(l => l.id === id) ?? null;
        if (!this.#activeList) return;
        this.#listSelector.setValue(id);

        this.#items = await StorageService.getChecklistItems(id);
        this.renameInput.value = this.#activeList.name;
        this.listForm.hide();
        this.renameForm.hide();
        this.pasteForm.hide();

        this.#listManager.clearItems();
        this.#items.forEach(item => {
            var element = this.#listManager.add(item);
            this.#wireListeners(element, item.id);
        });
        this.#listManager.setItems(this.#items);
        this.#updateProgress();
    }

    #resetForm() {
        this.nameInput.value = '';
        this.nameError.textContent = '';
        this.useTemplateCheck.checked = false;
        this.#templateSelector.setDisplay(false);
        this.#templateSelector.clearValue();
    }

    async #addList() {
        const name = this.nameInput.value.trim();
        if (!name) { this.nameInput.focus(); return; }

        if (this.#isDuplicateName(name)) {
            this.nameError.textContent = 'A list with this name already exists';
            this.nameInput.focus();
            return;
        }

        // insert list
        const list = await StorageService.addChecklist(name);
        this.#lists.push(list);
        this.#lists.sort((a, b) => a.name.localeCompare(b.name));
        this.#syncListSelector();
        await this.#selectList(list.id);
        this.#updateSummary();

        // add items from template or just one empty item
        if (this.useTemplateCheck.checked) {
            const templateId = this.#templateSelector.getValue();
            const template = Config.checklists.find(t => t.id === templateId);
            this.#addItems(template.items);
        } else {
            this.#addItems(['']);
        }

        this.#resetForm();
        this.listForm.hide();
    }

    async #addItems(names) {
        if (!this.#activeList || !names || !names.length) return;
        const items = await StorageService.addChecklistItems(this.#activeList.id, names);
        this.#items = [...this.#items, ...items];
        this.#listManager.setItems(this.#items);

        items.forEach(item => {
            var element = this.#listManager.add(item);
            this.#wireListeners(element, item.id);
        });

        this.pasteInput.value = '';
        this.pasteForm.hide();
        await this.#updateListCounts();
        this.#updateProgress();
        this.#updateSummary();
    }

    async #renameList(name) {
        if (!name || !this.#activeList) return;
        if (name === this.#activeList.name) return;

        if (this.#isDuplicateName(name, this.#activeList.id)) {
            this.renameError.textContent = 'A list with this name already exists';
            this.renameInput.value = this.#activeList.name;
            return;
        }

        this.#activeList.name = name;
        await StorageService.updateChecklist(this.#activeList);
        this.#lists.sort((a, b) => a.name.localeCompare(b.name));
        this.#syncListSelector();
        this.#updateSummary();
    }

    async #deleteList() {
        if (!this.#activeList) return;
        if (confirm(`Delete checklist "${this.#activeList.name}"?`)) {
            await StorageService.deleteChecklist(this.#activeList.id);
            this.#lists = this.#lists.filter(l => l.id !== this.#activeList.id);
            this.#activeList = null;
            this.#items = [];
            this.#listManager.clearItems();
            this.#syncListSelector();
            this.#updateProgress();
            this.#updateSummary();
            if (this.#lists.length > 0) await this.#selectList(this.#lists[0].id);
        }
    }

    async #updateListCounts() {
        if (!this.#activeList) return;
        this.#activeList.checkedCount = this.#items.filter(i => i.checked).length;
        this.#activeList.totalCount = this.#items.length;
        await StorageService.updateChecklist(this.#activeList);
        this.#updateListOption(this.#activeList);
    }

    #isDuplicateName(name, excludeId = null) {
        return this.#lists.some(l =>
            l.name.toLowerCase() === name.toLowerCase() &&
            l.id !== excludeId
        );
    }

    #listLabel(list) {
        const done = list.checkedCount === list.totalCount && list.totalCount > 0;
        return `${list.name}  ${list.checkedCount}/${list.totalCount}${done ? ' ✓' : ''}`;
    }

    #updateListOption(list) {
        const option = this.#listSelector.querySelector(list.id);
        if (option) option.textContent = this.#listLabel(list);
    }

    #syncListSelector() {
        const currentValue = this.#listSelector.getValue();
        this.#listSelector.clearItems();
        this.#listSelector.addItems(this.#lists.map(l => ({ value: l.id, label: this.#listLabel(l) })));
        if (currentValue) this.#listSelector.setValue(currentValue);

        const hasLists = this.#lists.length > 0;
        this.deleteListBtn.disabled = !hasLists;
        this.renameListBtn.disabled = !hasLists;
        this.toolbar.setDisplay(hasLists);
        this.listContainer.setDisplay(hasLists);
    }

    #updateProgress() {
        if (!this.#activeList) {
            return;
        }
        const total = this.#activeList.totalCount;
        const checked = this.#activeList.checkedCount;
        const pct = total > 0 ? (checked / total) * 100 : 0;

        this.progressFill.style.width = `${pct}%`;
        this.progressFill.classList.toggle('complete', pct === 100 && total > 0);
        this.progressLabel.textContent = `${checked} / ${total}`;
    }

    #updateSummary() {
        const totals = this.#lists.reduce((acc, l) => ({
            checked: acc.checked + l.checkedCount,
            total: acc.total + l.totalCount
        }), { checked: 0, total: 0 });

        this.updateSummary(totals.total > 0
            ? `${totals.checked}/${totals.total}`
            : '');
    }

    #itemHTML(item) {
        return `
            <div class="checklist-item ${item.checked ? 'checked' : ''}" id="cli-${item.id}" data-id="${item.id}">
                <input type="checkbox" class="item-select" ${this.#listManager.isSelected(item.id) ? 'checked' : ''}>
                <div class="toggle checklist-toggle">
                    <button class="${!item.checked ? 'active' : ''}"><svg><use href="#icon-close"/></svg></button>
                    <button class="${item.checked ? 'active' : ''}"><svg><use href="#icon-check"/></svg></button>
                </div> 
                <input type="text" class="checklist-item-name if-edit-mode if-checked" value="${item.name}" placeholder="Item">
                <button class="item-handle" title="More"><svg><use href="#icon-menu"/></svg></button>       
            </div>`;
    }

    #wireListeners(row, id) {
        const nameInput = row.querySelector('.checklist-item-name');
        const toggle = row.querySelector('.checklist-toggle');

        // name edit
        nameInput.addEventListener('blur', async () => {
            const item = this.#items.find(i => i.id === id);
            if (!item) return;
            item.name = nameInput.value;
            await StorageService.updateChecklistItem(item);
        });

        // check toggle
        InputHelper.setupToggle(toggle,
            this.#items.find(i => i.id === id)?.checked ?? false,
            async (isChecked) => {
                const item = this.#items.find(i => i.id === id);
                if (!item) return;
                item.checked = isChecked;
                row.classList.toggle('checked', isChecked);
                await StorageService.updateChecklistItem(item);
                await this.#updateListCounts();
                this.#updateProgress();
                this.#updateSummary();
            }
        );
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
        this.#init();

        // rate    
        RateService.init();
        RateService.onCurrencyChanged(() => this.#onCurrencyChange());
        this.#onCurrencyChange();

        // cards
        new RateCard();
        new ReferenceCard();
        new CostCard();
        new MarketWeightCard();
        new BillCard();
        new MarketTallyCard();
        new NotesCard();
        new DebtCard();
        new ConversionsCard();
        new TimezonesCard();
        new BudgetCard();

        // init
        this.#registerServiceWorker();
        this.#setupInstallPrompt();
        this.#setupWakeLock();
        this.#setupShareButton();
        this.#getVersion().then(v => {
            document.getElementById('footer-version').textContent = `v${v}`;
        });
    }

    async #init() {
        await StorageService.init();
        this.checklistCard = new ChecklistCard();
    }

    #onCurrencyChange() {
        const subtitle = document.getElementById('subtitle');
        const local = RateService.getLocalCurrency();
        const foreign = RateService.getForeignCurrency();
        subtitle.innerHTML = `Travel Tools · ${foreign.code} / ${local.code}`;
    }

    #registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.register('./service-worker.js')
            .then(() => {
                navigator.serviceWorker.addEventListener('message', (e) => {
                    if (e.data?.type === 'SW_UPDATED') {
                        document.getElementById('footer-version').textContent = `v${e.data.version}`;
                    }
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