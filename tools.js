class UIDisplay {
    static HIDE = "hide_display";
    static SQUISH_V = "hide_squishv";
    static SQUISH_H = "hide_squishh";
    static FADE = "hide_fade";

    // ── Static convenience factories ──────────────────

    static create(element, isOpen = true, displayType = UIDisplay.SQUISH_V) {
        return new UIDisplay().setupDisplay(element, isOpen, displayType);
    }

    static getHideClass(element) {
        return element.dataset.hide || UIDisplay.HIDE;
    }

    static show(el) {
        el.classList.remove(UIDisplay.getHideClass(el));
    }

    static hide(el) {
        el.classList.add(UIDisplay.getHideClass(el));
    }

    static setVisible(el, value) {
        el.classList.toggle(UIDisplay.getHideClass(el), !value);
    }

    static isVisible(el) {
        return !el.classList.contains(UIDisplay.getHideClass(el));
    }

    // ── Instance ──────────────────

    #element;
    #isVisible;
    #displayClass;

    // ── Private ───────────────────────────────────────

    #apply() {
        this.#element.classList.toggle(this.#displayClass, !this.#isVisible);
        this.#setInteractivity(this.#isVisible);
    }

    #setInteractivity(enabled) {
        if (!enabled) {
            const focusedElement = this.#element.querySelector(':focus');
            if (focusedElement) {
                focusedElement.blur();
            }
        }
    }

    // ── Public ────────────────────────────────────────

    setupDisplay(element, isVisible = true, displayType = UIDisplay.SQUISH_V) {
        this.#element = element;
        this.#isVisible = isVisible;
        this.#displayClass = displayType ?? this.#element.dataset.hide ?? UIDisplay.SQUISH_V;
        this.#apply();
        return this;
    }

    isVisible() {
        return this.#isVisible;
    }

    show() {
        this.setDisplay(true);
    }

    hide() {
        this.setDisplay(false);
    }

    toggleDisplay() {
        this.setDisplay(!this.#isVisible);
        return this.#isVisible;
    }

    setDisplay(value) {
        this.#isVisible = value;
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

class InputTab extends UIDisplay {
    #element;
    #buttons = [];
    #value = null;
    #onChanged;

    constructor(element, initialValue = null, onChanged = null) {
        super();
        this.#element = element;
        this.#buttons = [...element.children];
        this.#onChanged = onChanged;
        this.setupDisplay(element);

        this.#element.addEventListener('click', (e) => {
            e.stopPropagation();
            const btn = e.target.closest('button[data-value]');
            if (!btn) return;
            this.setValue(btn.dataset.value);
        });

        this.setValue(initialValue, true);
    }

    // ── Public ────────────────────────────────────────

    setValue(value, suppressEvent = false) {
        const btn = this.#buttons.find(b => b.dataset.value === value)
            ?? this.#buttons[0];
        if (!btn) return;
        this.#value = btn.dataset.value;
        this.#buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (!suppressEvent) this.#onChanged?.(this.#value);
    }

    getValue() {
        return this.#value;
    }
}

class InputSelector extends UIDisplay {
    #element;
    #items = [];
    #onChanged = null;

    constructor(selectElement, onChanged) {
        super();
        this.setupDisplay(selectElement);
        this.#element = selectElement;
        this.#onChanged = onChanged ?? null;

        this.#element.disabled = true;
        this.#element.addEventListener('change', (e) => {
            e.stopPropagation();
            this.#onChanged?.(this.getValue());
        });
    }

    addItem(label, value) {
        this.#element.disabled = false;
        this.#items.push({ label, value });
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        this.#element.appendChild(opt);
    }

    addItems(items) {
        items.forEach(i => this.addItem(i.label, i.value));
    }

    clearItems() {
        this.#items = [];
        this.#element.innerHTML = '';
        this.#element.disabled = true;
    }

    setValue(value) {
        this.#element.value = value;
    }

    getValue() {
        return this.#element.value;
    }

    clearValue() {
        this.#element.value = '';
    }

    querySelector(id) {
        return this.#element.querySelector(`option[value="${id}"]`);
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