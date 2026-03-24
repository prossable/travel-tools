class UIDisplay {
    static show(el) { el.classList.remove('hidden'); }
    static hide(el) { el.classList.add('hidden'); }
    static setVisible(el, value) { el.classList.toggle('hidden', !value); }
    static isVisible(el) { return !el.classList.contains('hidden'); }

    #element;
    #isOpen;
    #displayClass;

    // ── Static convenience factories ──────────────────

    static create(element, isOpen = true, className = 'hidden') {
        return new UIDisplay().setupDisplay(element, isOpen, className);
    }

    // ── Private ───────────────────────────────────────

    #apply() {
        this.#element.classList.toggle(this.#displayClass, !this.#isOpen);
    }

    // ── Public ────────────────────────────────────────

    /**
     * @param {HTMLElement} element
     * @param {boolean} isOpen=true
     * @param {string} className=''
     */
    setupDisplay(element, isOpen = true, className = 'hidden') {
        this.#element = element;
        this.#isOpen = isOpen;
        this.#displayClass = className;
        this.#apply();
        return this;
    }

    isOpen() {
        return this.#isOpen;
    }

    open() {
        this.setDisplay(true);
    }

    close() {
        this.setDisplay(false);
    }

    toggleDisplay() {
        this.setDisplay(!this.#isOpen);
        return this.#isOpen;
    }

    setDisplay(value) {
        this.#isOpen = value;
        this.#apply();
    }
}

class InputHelper {
    static setupToggle(container, initialState, onChange) {
        InputHelper.updateToggle(container, initialState);

        container.addEventListener('click', (e) => {
            e.stopPropagation();
            const [first, second] = container.children;
            const next = !second.classList.contains('active');
            InputHelper.updateToggle(container, next);
            onChange(next);
        });
    }

    static updateToggle(container, state) {
        const [first, second] = container.children;
        first.classList.toggle('active', !state);
        second.classList.toggle('active', state);
    };
}

class InputSelector extends UIDisplay {
    #selectElement;
    #items = [];
    #onChanged = null;

    constructor(selectElement, onChanged) {
        super();
        this.setupDisplay(selectElement);
        this.#selectElement = selectElement;
        this.#onChanged = onChanged ?? null;

        this.#selectElement.disabled = true;
        this.#selectElement.addEventListener('change', (e) => {
            e.stopPropagation();
            this.#onChanged?.(this.getValue());
        });
    }

    addItem(label, value) {
        this.#selectElement.disabled = false;
        this.#items.push({ label, value });
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        this.#selectElement.appendChild(opt);
    }

    addItems(items) {
        items.forEach(i => this.addItem(i.label, i.value));
    }

    clearItems() {
        this.#items = [];
        this.#selectElement.innerHTML = '';
        this.#selectElement.disabled = true;
    }

    setValue(value) {
        this.#selectElement.value = value;
    }

    getValue() {
        return this.#selectElement.value;
    }

    clearValue() {
        this.#selectElement.value = '';
    }

    querySelector(id) {
        return this.#selectElement.querySelector(`option[value="${id}"]`);
    }
}

class SelectionManager {
    #activeIds = new Set();
    #items = [];
    #onChanged = null;

    /** 
     * @param {object} config
     * @param {HTMLElement} config.selectAllBtn
     * @param {HTMLElement} config.deleteBtn
     * @param {string}      config.itemPrefix      — e.g. 'budget-', 'tally-', 'debt-'
     * @param {string}      config.selectClass      — class on the checkbox e.g. 'budget-select'
     * @param {function}    config.onDelete        — callback(ids: Set) when delete confirmed
     * @param {function}    [config.onChanged]     — callback(ids: Set) on any selection change
     */
    constructor({ selectAllBtn, deleteBtn, itemPrefix, selectClass, onDelete, onChanged }) {
        this.selectAllBtn = selectAllBtn;
        this.deleteBtn = deleteBtn;
        this.itemPrefix = itemPrefix;
        this.selectClass = selectClass;
        this.#onChanged = onChanged ?? null;

        selectAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const allSelected = this.#activeIds.size === this.#items.length;
            allSelected ? this.#activeIds.clear() : this.#items.forEach(i => this.#activeIds.add(i.id));
            this.#syncStyles();
            this.#updateToolbar();
            this.#onChanged?.(this.#activeIds);
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.#activeIds.size) return;
            if (confirm(`Delete ${this.#activeIds.size} item(s)?`)) {
                onDelete(new Set(this.#activeIds));
                this.#activeIds.clear();
                this.#updateToolbar();
                this.#onChanged?.(this.#activeIds);
            }
        });
    }

    // ── Private ───────────────────────────────────────

    #syncStyles() {
        this.#items.forEach(item => {
            const row = document.getElementById(`${this.itemPrefix}${item.id}`);
            if (!row) return;
            const selected = this.#activeIds.has(item.id);
            row.classList.toggle('selected', selected);
            const cb = row.querySelector(`.${this.selectClass}`);
            if (cb) cb.checked = selected;
        });
    }

    #updateToolbar() {
        this.deleteBtn.disabled = !this.#activeIds.size;
        this.selectAllBtn.classList.toggle(
            'active',
            this.#activeIds.size === this.#items.length && this.#items.length > 0
        );
    }

    // ── Public ────────────────────────────────────────

    /** Call whenever your items array changes */
    setItems(items) {
        this.#items = items;
        // clear any selected ids that no longer exist
        this.#activeIds.forEach(id => {
            if (!items.find(i => i.id === id)) this.#activeIds.delete(id);
        });
        this.#updateToolbar();
    }

    /** Call from each row's checkbox change listener */
    setActive(id, active) {
        active ? this.#activeIds.add(id) : this.#activeIds.delete(id);
        document.getElementById(`${this.itemPrefix}${id}`)
            ?.classList.toggle('selected', active);
        this.#updateToolbar();
        this.#onChanged?.(this.#activeIds);
    }

    /** Call when a row is removed without going through onDelete */
    remove(id) {
        this.#activeIds.delete(id);
        this.#updateToolbar();
    }

    /** Returns copy of active ids */
    getActiveIds() { return new Set(this.#activeIds); }

    /** Clears selection without triggering delete */
    clear() {
        this.#activeIds.clear();
        this.#syncStyles();
        this.#updateToolbar();
    }

    isSelected(id) { return this.#activeIds.has(id); }
}