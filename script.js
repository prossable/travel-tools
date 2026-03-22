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
    constructor(rateService) {
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

    constructor(rateService) {
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
    constructor(rateService) {
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
    constructor(rateService) {
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
    #mode = 'even';
    #splitRows = [];

    constructor(rateService) {
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
        this.modeButtons = document.querySelectorAll('.bill-mode-btn');
        this.splitList = document.getElementById('split-list');
        this.splitRowsEl = document.getElementById('split-rows');
        this.splitOffsetLabel = document.getElementById('split-offset-label');

        // init
        this.#updateLabels();

        // listeners
        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.#mode = btn.dataset.mode;
                this.modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.#syncRows();
                this.#updateValues();
            });
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
        this.splitList.style.display = (this.#mode === 'uneven' && this.#getPeople() > 1) ? '' : 'none';
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
        if (people == 1 || this.#mode === 'uneven') {
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
        if (this.#mode === 'uneven') this.#updateSplitRows(foreign, tipF);
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
    #activeIds = new Set(); // selected row ids

    constructor() {
        super('card-tally');

        // elements
        this.listElement = document.getElementById('tally-list');
        this.addButton = document.getElementById('tally-add');
        this.selectAllButton = document.getElementById('tally-select');
        this.deleteButton = document.getElementById('tally-delete');
        this.toDebtButton = document.getElementById('tally-debt');
        this.spentForeignOutput = document.getElementById('tally-spent-foreign');
        this.spentLocalOutput = document.getElementById('tally-spent-local');
        this.remainingForeignOutput = document.getElementById('tally-remaining-foreign');
        this.remainingLocalOutput = document.getElementById('tally-remaining-local');

        // init
        this.#load();
        this.#updateToolbar();

        // add
        this.addButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#addItem();
        });

        // select all / deselect all
        this.selectAllButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const allSelected = this.#activeIds.size === this.#items.length;
            if (allSelected) {
                this.#activeIds.clear();
            } else {
                this.#items.forEach(i => this.#activeIds.add(i.id));
            }
            this.#syncSelectionStyles();
            this.#updateToolbar();
        });

        // delete selected
        this.deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.#activeIds.size) return;
            if (confirm(`Delete ${this.#activeIds.size} item(s)?`)) {
                this.#activeIds.forEach(id => {
                    this.#items = this.#items.filter(i => i.id !== id);
                    document.getElementById(`tally-${id}`)?.remove();
                });
                this.#activeIds.clear();
                this.#save();
                this.#updateToolbar();
                this.update();
            }
        });

        /*// to debt
        this.toDebtButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.#activeIds.size) return;
            const total = this.#items
                .filter(i => this.#activeIds.has(i.id) && i.price)
                .reduce((sum, i) => sum + i.price, 0);
            if (total > 0) EventService.addToDebt(total);
        });*/

        RateService.onRateChanged(() => this.update());
        RateService.onCurrencyChanged(() => this.update());
    }

    // ── Selection ─────────────────────────────────────

    #setActive(id, active) {
        active ? this.#activeIds.add(id) : this.#activeIds.delete(id);
        document.getElementById(`tally-${id}`)
            ?.classList.toggle('selected', active);
        this.#updateToolbar();
    }

    #syncSelectionStyles() {
        this.#items.forEach(item => {
            const row = document.getElementById(`tally-${item.id}`);
            if (!row) return;
            const isSelected = this.#activeIds.has(item.id);
            row.classList.toggle('selected', isSelected);
            row.querySelector('.tally-select').checked = isSelected; // add this
        });
    }

    #updateToolbar() {
        const hasSelection = this.#activeIds.size > 0;
        this.deleteButton.disabled = !hasSelection;
        //  this.toDebtButton.disabled = !hasSelection;
        this.selectAllButton.classList.toggle(
            'active',
            this.#activeIds.size === this.#items.length && this.#items.length > 0
        );
    }

    // ── Items ─────────────────────────────────────────

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
        this.update();
        itemEl.querySelector('.tally-label').focus();
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
        document.getElementById(`tally-${id}`).insertAdjacentElement('afterend', itemEl);
        this.#wireListeners(itemEl, item.id);
        this.update();
    }

    #removeItem(id) {
        this.#items = this.#items.filter(i => i.id !== id);
        this.#activeIds.delete(id);
        document.getElementById(`tally-${id}`).remove();
        this.#save();
        this.#updateToolbar();
        this.update();
    }

    #toggleItem(id) {
        const item = this.#items.find(i => i.id === id);
        if (!item) return;
        item.toggleItem = !item.toggleItem;
        const row = document.getElementById(`tally-${id}`);
        row.classList.toggle('toggleItem', item.toggleItem);
        //row.querySelectorAll('.tally-status-btn').forEach(btn => {btn.classList.toggle('active', btn.dataset.status === (item.got ? 'got' : 'need'));});
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
            <div class="tally-item ${item.checked ? 'checked' : ''}" 
                 id="tally-${item.id}" data-id="${item.id}">
                <input type="checkbox" class="tally-select" ${this.#activeIds.has(item.id) ? 'checked' : ''}>
                <input type="text" class="tally-label" value="${item.label}" placeholder="Item">
                <input type="number" class="tally-price" value="${item.price ?? ''}" placeholder="0" min="0" step="any">
                <div class="toggle tally-status">
                    <button class="${!item.checked ? 'active' : ''}"><svg><use href="#icon-basket" /></svg></button>
                    <button class="${item.checked ? 'active' : ''}"><svg><use href="#icon-check" /></svg></button>
                </div>
            </div>`;
    }

    #wireListeners(row, id) {
        const checkbox = row.querySelector('.tally-select');
        const labelInput = row.querySelector('.tally-label');
        const priceInput = row.querySelector('.tally-price');
        const statusContainer = row.querySelector('.tally-status');

        // selection checkbox
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.#setActive(id, checkbox.checked);
        });

        // label
        labelInput.addEventListener('input', () => {
            const item = this.#items.find(i => i.id === id);
            if (item) { item.label = labelInput.value; this.#save(); }
        });

        // price
        priceInput.addEventListener('input', () => {
            const item = this.#items.find(i => i.id === id);
            if (item) {
                item.price = parseFloat(priceInput.value) || null;
                this.#save();
                this.update();
            }
        });

        // toggle
        const item = this.#items.find(i => i.id === id);
        InputHelper.setupToggle(
            statusContainer,
            item.checked,
            (isGot) => {
                const item = this.#items.find(i => i.id === id);
                if (!item) return;
                item.checked = isGot;
                document.getElementById(`tally-${id}`).classList.toggle('checked', isGot);
                this.#save();
                this.update();
            }
        );
    }

    #renderAll() {
        this.listElement.innerHTML = this.#items.map(i => this.#itemHTML(i)).join('');
        this.listElement.querySelectorAll('.tally-item').forEach(row => {
            this.#wireListeners(row, parseInt(row.dataset.id));
        });
        this.update();
    }

    // ── Public ────────────────────────────────────────

    update() {
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
    #selection;

    constructor() {
        super('card-debt');

        // elements
        this.listElement = document.getElementById('debt-list');
        this.formElement = document.getElementById('debt-form');
        this.personInput = document.getElementById('debt-person');
        this.noteInput = document.getElementById('debt-note');
        this.foreignLabel = document.getElementById('debt-foreign-label');
        this.foreignInput = document.getElementById('debt-foreign-val');
        this.localLabel = document.getElementById('debt-local-label');
        this.localInput = document.getElementById('debt-local-val');
        this.dirButtons = document.querySelectorAll('.debt-dir-btn');
        this.addButton = document.getElementById('debt-add');
        this.toggleButton = document.getElementById('debt-toggle');

        // selection manager
        this.#selection = new SelectionManager({
            selectAllBtn: document.getElementById('debt-select-all'),
            deleteBtn: document.getElementById('debt-clear'),
            itemPrefix: 'debt-',
            selectClass: 'debt-select',
            onDelete: (ids) => {
                ids.forEach(id => {
                    this.#debts = this.#debts.filter(d => d.id !== id);
                    document.getElementById(`debt-${id}`)?.remove();
                });
                this.#save();
                this.#updateSummary();
            }
        });

        // init
        this.formElement.style.display = 'none';
        this.#updateLabels();
        this.#load();

        // listeners
        this.toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#setFormVisible(!this.#formVisible);
        });
        this.dirButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.#direction = btn.dataset.dir;
                this.dirButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        this.foreignInput.addEventListener('input', () => {
            if (this.foreignInput.value === '') { this.localInput.value = ''; return; }
            this.localInput.value = RateService.formatLocalInput(RateService.toLocal(this.foreignInput.value));
        });
        this.localInput.addEventListener('input', () => {
            if (this.localInput.value === '') { this.foreignInput.value = ''; return; }
            this.foreignInput.value = RateService.formatForeignInput(RateService.toForeign(this.localInput.value));
        });
        this.addButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#addDebt();
        });

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
        /* EventService.onAddToDebt((e) => {
             this.#setFormVisible(true);
             this.localInput.value = RateService.formatLocalInput(e.detail.amount);
             this.foreignInput.value = RateService.formatForeignInput(
                 RateService.toForeign(e.detail.amount)
             );
             if (e.detail.person) this.personInput.value = e.detail.person;
             if (e.detail.note) this.noteInput.value = e.detail.note;
         });*/
    }

    // ── Private ───────────────────────────────────────

    #setFormVisible(visible) {
        this.#formVisible = visible;
        this.formElement.style.display = visible ? '' : 'none';
        if (visible) this.personInput.focus();
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
            direction: this.#direction,
            note,
            settled: false
        };

        this.#debts.push(debt);
        this.#save();
        this.#selection.setItems(this.#debts);

        // append single element
        const el = document.createElement('div');
        el.innerHTML = this.#debtHTML(debt);
        const debtEl = el.firstElementChild;
        this.listElement.appendChild(debtEl);
        this.#wireListeners(debtEl, debt.id);

        this.#clearForm();
        this.#setFormVisible(false);
        this.#updateSummary();
    }

    #clearForm() {
        this.personInput.value = '';
        this.noteInput.value = '';
        this.foreignInput.value = '';
        this.localInput.value = '';
        this.dirButtons.forEach(b => b.classList.remove('active'));
        this.dirButtons[0].classList.add('active');
        this.#direction = 'owe';
    }

    #removeDebt(id) {
        this.#debts = this.#debts.filter(d => d.id !== id);
        document.getElementById(`debt-${id}`).remove();
        this.#selection.remove(id);
        this.#selection.setItems(this.#debts);
        this.#save();
        this.#updateSummary();
    }

    #toggleSettled(id) {
        const debt = this.#debts.find(d => d.id === id);
        if (!debt) return;
        debt.settled = !debt.settled;
        const row = document.getElementById(`debt-${id}`);
        row.classList.toggle('settled', debt.settled);
        this.#save();
        this.#updateSummary();
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

    #renderAll() {
        this.listElement.innerHTML = this.#debts.map(d => this.#debtHTML(d)).join('');
        this.listElement.querySelectorAll('.debt-entry').forEach(row => {
            this.#wireListeners(row, parseInt(row.dataset.id));
        });
        this.#selection.setItems(this.#debts);
        this.#updateSummary();
    }

    #debtHTML(debt) {
        return `
            <div class="debt-entry ${debt.settled ? 'settled' : ''}" id="debt-${debt.id}" data-id="${debt.id}">
                <input type="checkbox" class="debt-select" ${this.#selection.isSelected(debt.id) ? 'checked' : ''}>
                <div class="info">
                    <span>${debt.person}</span>
                    <span class="direction ${debt.direction}">${debt.direction === 'owe' ? 'is owed' : 'owes me'}</span>
                    <span class="highlight">${RateService.formatLocalFull(debt.amount)}</span>
                    ${debt.note ? ` for ${debt.note}` : ''}
                </div>
                <div class="toggle settled-toggle">
                    <button class="${!debt.settled ? 'active' : ''}"><svg><use href="#icon-debt"/></svg></button>
                    <button class="${debt.settled ? 'active' : ''}"><svg><use href="#icon-check"/></svg></button>
                </div>
            </div>`;
    }

    #wireListeners(row, id) {
        const checkbox = row.querySelector('.debt-select');
        const settledToggle = row.querySelector('.settled-toggle');

        // selection
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.#selection.setActive(id, checkbox.checked);
        });

        // settled toggle via InputHelper
        InputHelper.setupToggle(
            settledToggle,
            this.#debts.find(d => d.id === id)?.settled ?? false,
            (isSettled) => {
                const debt = this.#debts.find(d => d.id === id);
                if (!debt) return;
                debt.settled = isSettled;
                row.classList.toggle('settled', isSettled);
                this.#save();
                this.#updateSummary();
            }
        );
    }

    #updateLabels() {
        const local = RateService.getLocalCurrency();
        const foreign = RateService.getForeignCurrency();
        this.foreignLabel.textContent = `Amount (${foreign.code})`;
        this.localLabel.textContent = `Amount (${local.code})`;
    }

    #updateSummary() {
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

class BudgetCard extends Card {
    static #AMOUNT_WIDTH = 10;
    #items = [];
    #nextId = 1;
    #activeIds = new Set();
    #targetAmount = null;

    constructor() {
        super('card-budget');

        // elements
        this.formElement = document.getElementById('budget-form');
        this.newBtn = document.getElementById('budget-new-btn');
        this.noteInput = document.getElementById('budget-note');
        this.dateTrigger = document.getElementById('budget-date-trigger');
        this.dateInput = document.getElementById('budget-date');
        this.amountForeignInput = document.getElementById('budget-amount-foreign');
        this.amountLocalInput = document.getElementById('budget-amount-local');
        this.addBtn = document.getElementById('budget-add');
        this.listElement = document.getElementById('budget-list');
        this.selectAllBtn = document.getElementById('budget-select-all');
        this.deleteBtn = document.getElementById('budget-delete');
        this.totalEl = document.getElementById('budget-total');
        this.progressEl = document.getElementById('budget-progress');
        this.progressFill = document.getElementById('budget-progress-fill');
        this.progressLabel = document.getElementById('budget-progress-label');
        this.targetInput = document.getElementById('budget-target');
        this.foreignLabel = document.getElementById('budget-foreign-label');
        this.localLabel = document.getElementById('budget-local-label');

        // init date to today
        this.#setDate(RateService.getLocalDate());

        // restore target
        const savedTarget = localStorage.getItem('budgetTarget');
        if (savedTarget) {
            this.#targetAmount = parseFloat(savedTarget);
            this.targetInput.value = this.#targetAmount;
        }

        // load items
        this.#load();
        this.#updateLabels();

        // toggle form
        this.newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#toggleForm();
        });

        // date trigger
        this.dateTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.dateInput.showPicker) {
                this.dateInput.showPicker();
            } else {
                this.dateInput.style.pointerEvents = 'auto';
                this.dateInput.focus();
                this.dateInput.style.pointerEvents = 'none';
            }
        });

        this.dateInput.addEventListener('change', () => {
            this.#setDate(this.dateInput.value);
        });

        // bidirectional amount
        this.amountForeignInput.addEventListener('input', () => {
            if (this.amountForeignInput.value === '') {
                this.amountLocalInput.value = '';
                return;
            }
            this.amountLocalInput.value = RateService.formatLocalInput(
                RateService.toLocal(parseFloat(this.amountForeignInput.value))
            );
        });

        this.amountLocalInput.addEventListener('input', () => {
            if (this.amountLocalInput.value === '') {
                this.amountForeignInput.value = '';
                return;
            }
            this.amountForeignInput.value = RateService.formatForeignInput(
                RateService.toForeign(parseFloat(this.amountLocalInput.value))
            );
        });

        // add entry
        this.addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#addItem();
        });

        this.noteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.stopPropagation(); this.#addItem(); }
        });

        // target budget
        this.targetInput.addEventListener('input', () => {
            this.#targetAmount = parseFloat(this.targetInput.value) || null;
            localStorage.setItem('budgetTarget', this.#targetAmount ?? '');
            this.update();
        });

        // select all
        this.selectAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const allSelected = this.#activeIds.size === this.#items.length;
            if (allSelected) {
                this.#activeIds.clear();
            } else {
                this.#items.forEach(i => this.#activeIds.add(i.id));
            }
            this.#syncSelectionStyles();
            this.#updateToolbar();
        });

        // delete selected
        this.deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.#activeIds.size) return;
            if (confirm(`Delete ${this.#activeIds.size} item(s)?`)) {
                this.#activeIds.forEach(id => {
                    this.#items = this.#items.filter(i => i.id !== id);
                    document.getElementById(`budget-${id}`)?.remove();
                });
                this.#activeIds.clear();
                this.#save();
                this.#updateToolbar();
                this.update();
            }
        });

        RateService.onRateChanged(() => this.update());
        RateService.onCurrencyChanged(() => {
            this.#updateLabels();
            this.update();
        });
    }

    // ── Private ───────────────────────────────────────

    #toggleForm() {
        const visible = this.formElement.classList.toggle('visible');
        if (visible) this.noteInput.focus();
    }

    #setDate(dateString) {
        this.dateInput.value = dateString;
        this.dateTrigger.textContent = this.#formatDateShort(dateString);
    }

    #formatDateShort(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString(
            RateService.getLocalCurrency().locale, {
            month: 'short',
            day: 'numeric'
        });
    }

    #padAmount(formatted) {
        return formatted.padStart(BudgetCard.#AMOUNT_WIDTH);
    }

    #addItem() {
        const note = this.noteInput.value.trim();
        const localVal = parseFloat(this.amountLocalInput.value);
        const date = this.dateInput.value || RateService.getLocalDate();

        if (!note) { this.noteInput.focus(); return; }
        if (isNaN(localVal) || localVal <= 0) { this.amountForeignInput.focus(); return; }

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
        this.formElement.classList.remove('visible');
        this.update();
    }

    #clearForm() {
        this.noteInput.value = '';
        this.amountForeignInput.value = '';
        this.amountLocalInput.value = '';
        this.#setDate(RateService.getLocalDate());
    }

    #updateLabels() {
        const foreign = RateService.getForeignCurrency();
        const local = RateService.getLocalCurrency();
        this.foreignLabel.textContent = `Amount (${foreign.code})`;
        this.localLabel.textContent = `Amount (${local.code})`;
    }

    #setActive(id, active) {
        active ? this.#activeIds.add(id) : this.#activeIds.delete(id);
        document.getElementById(`budget-${id}`)
            ?.classList.toggle('selected', active);
        this.#updateToolbar();
    }

    #syncSelectionStyles() {
        this.#items.forEach(item => {
            const row = document.getElementById(`budget-${item.id}`);
            if (!row) return;
            const isSelected = this.#activeIds.has(item.id);
            row.classList.toggle('selected', isSelected);
            row.querySelector('.budget-select').checked = isSelected;
        });
    }

    #updateToolbar() {
        const hasSelection = this.#activeIds.size > 0;
        this.deleteBtn.disabled = !hasSelection;
        this.selectAllBtn.classList.toggle(
            'active',
            this.#activeIds.size === this.#items.length && this.#items.length > 0
        );
    }

    #updateProgress() {
        const total = this.#items.reduce((sum, i) => sum + i.amount, 0);

        if (!this.#targetAmount || this.#targetAmount <= 0) {
            this.progressEl.classList.remove('visible');
            return;
        }

        this.progressEl.classList.add('visible');
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

    #entryHTML(item) {
        const dateStr = this.#formatDateShort(item.date);
        const amountStr = this.#padAmount(RateService.formatLocalSymbol(item.amount));
        return `
            <div class="budget-entry" id="budget-${item.id}" data-id="${item.id}">
                <input type="checkbox" class="budget-select" ${this.#activeIds.has(item.id) ? 'checked' : ''}>
                <div>${dateStr}  <span class="highlight">${amountStr}</span>  ${item.note}</div>
            </div>`;
    }

    #wireListeners(row, id) {
        const checkbox = row.querySelector('.budget-select');
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.#setActive(id, checkbox.checked);
        });
    }

    #renderAll() {
        this.listElement.innerHTML = this.#items.map(i => this.#entryHTML(i)).join('');
        this.listElement.querySelectorAll('.budget-entry').forEach(row => {
            this.#wireListeners(row, parseInt(row.dataset.id));
        });
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
        this.amountLocalInput.value = RateService.formatLocalInput(amount);
        this.amountForeignInput.value = RateService.formatForeignInput(RateService.toForeign(amount));
        if (note) this.noteInput.value = note;
        this.formElement.classList.add('visible');
        this.noteInput.focus();
    }
}

class ChecklistCard extends Card {
    #lists = [];
    #activeList = null;
    #items = [];
    #mode = 'check';
    #selection;

    #listSelector;
    #templateSelector;

    constructor() {
        super('card-checklist');

        // elements
        this.formElement = document.getElementById('checklist-form');
        this.newBtn = document.getElementById('checklist-new-btn');
        this.deleteListBtn = document.getElementById('checklist-delete-btn');
        this.useTemplateCheck = document.getElementById('checklist-use-template');
        this.templateRow = document.getElementById('checklist-template-row');
        this.nameInput = document.getElementById('checklist-name');
        this.addBtn = document.getElementById('checklist-add-btn');
        this.listElement = document.getElementById('checklist-list');
        this.toolbar = document.getElementById('checklist-toolbar');
        this.modeBtns = document.querySelectorAll('.checklist-mode-btn');
        this.addItemBtn = document.getElementById('checklist-add-item-btn');
        this.selectAllBtn = document.getElementById('checklist-select-all-btn');
        this.deleteItemsBtn = document.getElementById('checklist-delete-items-btn');
        this.progressEl = document.getElementById('checklist-progress');
        this.progressFill = document.getElementById('checklist-progress-fill');
        this.progressLabel = document.getElementById('checklist-progress-label');

        // template selector        
        const listSelect = document.getElementById('checklist-select');
        this.#listSelector = new InputSelector(listSelect, (val) => { this.#selectList(val); });

        // template selector
        const templateSelect = document.getElementById('checklist-template-row');
        this.#templateSelector = new InputSelector(templateSelect, (val) => {
            const template = Config.checklists.find(t => t.id === val);
            this.nameInput.value = template ? template.name : '';
        });
        this.#templateSelector.addItems(Config.checklists.map(t => ({ value: t.id, label: t.name })));

        // selection manager
        this.#selection = new SelectionManager({
            selectAllBtn: this.selectAllBtn,
            deleteBtn: this.deleteItemsBtn,
            itemPrefix: 'cli-',
            selectClass: 'checklist-select',
            onDelete: async (ids) => {
                await StorageService.deleteChecklistItems([...ids]);
                ids.forEach(id => {
                    this.#items = this.#items.filter(i => i.id !== id);
                    document.getElementById(`cli-${id}`)?.remove();
                });
                this.#selection.setItems(this.#items);
                this.#updateProgress();
                this.#updateSummary();
            }
        });

        // init
        this.#init();

        // new list button
        this.newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.formElement.classList.toggle('visible');
            if (this.formElement.classList.contains('visible')) {
                this.nameInput.focus();
            }
        });

        // delete list button
        this.deleteListBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!this.#activeList) return;
            if (confirm(`Delete "${this.#activeList.name}"?`)) {
                await StorageService.deleteChecklist(this.#activeList.id);
                this.#lists = this.#lists.filter(l => l.id !== this.#activeList.id);
                this.#activeList = null;
                this.#items = [];
                this.#syncListSelector();
                this.listElement.innerHTML = '';
                this.#updateProgress();
                this.#updateSummary();

                if (this.#lists.length > 0) {
                    await this.#selectList(this.#lists[0].id);
                }
            }
        });

        // use template checkbox
        this.useTemplateCheck.addEventListener('change', (e) => {
            e.stopPropagation();
            this.templateRow.style.display = this.useTemplateCheck.checked ? '' : 'none';
            if (!this.useTemplateCheck.checked) {
                this.#templateSelector.clearValue();
                this.nameInput.value = '';
            }
        });

        // add list
        this.addBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.#addList();
        });

        this.nameInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') { e.stopPropagation(); await this.#addList(); }
        });

        // mode buttons
        this.modeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.#mode = btn.dataset.mode;
                this.modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.cardElement.classList.toggle('edit-mode', this.#mode === 'edit');
                this.#syncToolbarMode();
            });
        });

        // add item
        this.addItemBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.#addItem();
        });
    }

    // ── Private ───────────────────────────────────────

    async #init() {
        this.#lists = await StorageService.getChecklists();
        this.#syncListSelector();
        if (this.#lists.length > 0) {
            await this.#selectList(this.#lists[0].id);
        }
        this.#updateSummary();
    }

    async #selectList(id) {
        id = parseInt(id);
        if (!id) return;

        this.#activeList = this.#lists.find(l => l.id === id) ?? null;
        if (!this.#activeList) return;
        this.#listSelector.setValue(id);
        this.#items = await StorageService.getChecklistItems(id);
        this.#renderAll();
    }

    async #addList() {
        const name = this.nameInput.value.trim();
        if (!name) { this.nameInput.focus(); return; }

        const list = await StorageService.addChecklist(name);
        this.#lists.push(list);

        // add template items if selected
        const templateId = this.#templateSelector.getValue();
        if (this.useTemplateCheck.checked && templateId) {
            const template = Config.checklists.find(t => t.id === templateId);
            if (template) {
                await StorageService.addChecklistItems(list.id, template.items);
            }
        }

        this.#syncListSelector();
        await this.#selectList(list.id);

        // reset form
        this.nameInput.value = '';
        this.useTemplateCheck.checked = false;
        this.templateRow.style.display = 'none';
        this.#templateSelector.clearValue();
        this.formElement.classList.remove('visible');
    }

    async #addItem(name = '') {
        if (!this.#activeList) return;
        const item = await StorageService.addChecklistItem(this.#activeList.id, name);
        this.#items.push(item);
        this.#selection.setItems(this.#items);

        const el = document.createElement('div');
        el.innerHTML = this.#itemHTML(item);
        const itemEl = el.firstElementChild;
        this.listElement.appendChild(itemEl);
        this.#wireListeners(itemEl, item.id);

        // focus name input in edit mode
        itemEl.querySelector('.checklist-item-name').focus();
        this.#updateProgress();
        this.#updateSummary();
    }

    #syncListSelector() {
        this.#listSelector.clearItems();
        this.#listSelector.addItems(this.#lists.map(l => ({ value: l.id, label: l.name })));
        const hasLists = this.#lists.length > 0;
        this.deleteListBtn.disabled = !hasLists;
        this.toolbar.style.display = hasLists ? '' : 'none';
        this.progressEl.classList.toggle('visible', hasLists);
    }

    #syncToolbarMode() {
        const isEdit = this.#mode === 'edit';
        this.addItemBtn.style.display = isEdit ? '' : 'none';
        this.selectAllBtn.style.display = isEdit ? '' : 'none';
        this.deleteItemsBtn.style.display = isEdit ? '' : 'none';
        if (!isEdit) this.#selection.clear();
    }

    #updateProgress() {
        const total = this.#items.length;
        const checked = this.#items.filter(i => i.checked).length;
        const pct = total > 0 ? (checked / total) * 100 : 0;

        this.progressFill.style.width = `${pct}%`;
        this.progressFill.classList.toggle('complete', pct === 100);
        this.progressLabel.textContent = `${checked} / ${total}`;
        this.progressEl.classList.toggle('visible', total > 0);
    }

    #updateSummary() {
        if (!this.#activeList) { this.updateSummary(''); return; }
        const total = this.#items.length;
        const checked = this.#items.filter(i => i.checked).length;
        this.updateSummary(total > 0 ? `${checked}/${total}` : this.#activeList.name);
    }

    #itemHTML(item) {
        return `
            <div class="checklist-item ${item.checked ? 'checked' : ''}"
                 id="cli-${item.id}" data-id="${item.id}">
                <input type="checkbox" class="checklist-select">
                <input type="text" 
                       class="checklist-item-name" 
                       value="${item.name}" 
                       placeholder="Item">
                <div class="tab checklist-toggle">
                    <button class="${!item.checked ? 'active' : ''}">
                        <svg><use href="#icon-circle"/></svg>
                    </button>
                    <button class="${item.checked ? 'active' : ''}">
                        <svg><use href="#icon-check"/></svg>
                    </button>
                </div>
            </div>`;
    }

    #wireListeners(row, id) {
        const checkbox = row.querySelector('.checklist-select');
        const nameInput = row.querySelector('.checklist-item-name');
        const toggle = row.querySelector('.checklist-toggle');

        // selection
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.#selection.setActive(id, checkbox.checked);
        });

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
                this.#updateProgress();
                this.#updateSummary();
            }
        );
    }

    #renderAll() {
        this.listElement.innerHTML = this.#items.map(i => this.#itemHTML(i)).join('');
        this.listElement.querySelectorAll('.checklist-item').forEach(row => {
            this.#wireListeners(row, parseInt(row.dataset.id));
        });
        this.#selection.setItems(this.#items);
        this.#updateProgress();
        this.#updateSummary();
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
        await StorageService.init(); // completes
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