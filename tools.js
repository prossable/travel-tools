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
        this.setupDisplay(element, true, UIDisplay.HIDE);

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

class InputDate extends UIDisplay {
    #input;
    #trigger;
    #value = null;
    #onChanged;

    constructor(inputElement, triggerElement, dateString = null, onChanged = null) {
        super();
        this.#input = inputElement;
        this.#trigger = triggerElement;
        this.#onChanged = onChanged;
        this.setupDisplay(triggerElement, true, UIDisplay.HIDE);

        this.#trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.#input.showPicker) {
                this.#input.showPicker();
            } else {
                this.#input.style.pointerEvents = 'auto';
                this.#input.focus();
                this.#input.style.pointerEvents = 'none';
            }
        });

        this.#input.addEventListener('change', () => {
            this.setValue(this.#input.value);
        });

        this.setValue(dateString, true);
    }

    // ── Public ────────────────────────────────────────

    setValue(dateString) {
        this.#input.value = dateString;
        this.#value = dateString;
        this.#trigger.textContent = InputDate.format(this.#value);
        this.#onChanged?.(this.#input.value);
    }

    getValue() {
        return this.#value;
    }

    static format(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString(
            RateService.getLocalCurrency().locale, {
            month: 'short',
            day: 'numeric'
        });
    }
}

class InputSelector extends UIDisplay {
    #element;
    #items = [];
    #onChanged = null;

    constructor(selectElement, onChanged) {
        super();
        this.setupDisplay(selectElement, true, UIDisplay.HIDE);
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
     * @param {HTMLElement} selectAllBtn
     * @param {HTMLElement} deleteBtn
     * @param {string}      itemPrefix      — e.g. 'budget-', 'tally-', 'debt-'
     * @param {string}      selectClass      — class on the checkbox e.g. 'budget-select'
     * @param {function}    onDelete        — callback(ids: Set) when delete confirmed
     * @param {function}    [onChanged]     — callback(ids: Set) on any selection change
     */
    constructor(selectAllBtn, deleteBtn, itemPrefix, selectClass, onDelete, onChanged = null) {
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
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.#activeIds.size) return;
            if (confirm(`Delete ${this.#activeIds.size} item(s)?`)) {
                onDelete(new Set(this.#activeIds));
                this.#activeIds.clear();
                this.#updateToolbar();
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
        this.#onChanged?.(this.#activeIds);
    }

    // ── Public ────────────────────────────────────────

    setItems(items) {
        this.#items = items;
        // clear any selected ids that no longer exist
        this.#activeIds.forEach(id => {
            if (!items.find(i => i.id === id)) this.#activeIds.delete(id);
        });
        this.#updateToolbar();
    }

    setActive(id, active) {
        active ? this.#activeIds.add(id) : this.#activeIds.delete(id);
        document.getElementById(`${this.itemPrefix}${id}`)
            ?.classList.toggle('selected', active);
        this.#updateToolbar();
    }

    remove(id) {
        this.#activeIds.delete(id);
        this.#updateToolbar();
    }

    getActiveIds() { return new Set(this.#activeIds); }

    clear() {
        this.#activeIds.clear();
        this.#syncStyles();
        this.#updateToolbar();
    }

    isSelected(id) { return this.#activeIds.has(id); }
}

class ListManager {
    #itemPrefix;
    #items = [];
    #activeIds = new Set();
    #actions;
    #getHtml;
    #onDelete;
    #onSelectionChanged;
    #activeOverlayId = null;

    constructor(listElement, selectAllBtn, deleteBtn, itemPrefix, actions, getHtml, onDelete, onSelectionChanged) {
        this.listElement = listElement;
        this.#itemPrefix = itemPrefix;
        this.#actions = actions ?? [];
        this.#getHtml = getHtml;
        this.#onDelete = onDelete ?? null;
        this.#onSelectionChanged = onSelectionChanged ?? null;

        selectAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const allSelected = this.#activeIds.size === this.#items.length;
            allSelected ? this.clearSelection() : this.selectAll();
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.#activeIds.size) return;
            this.#onDelete?.(new Set(this.#activeIds));
        });

        document.addEventListener('click', () => this.#closeOverlay());

        this.listElement.addEventListener('scroll', () => this.#checkFade());
        this.#checkFade();
    }

    // ── Private ───────────────────────────────────────

    #checkFade() {
        const atBottom = this.listElement.scrollHeight - this.listElement.scrollTop
            <= this.listElement.clientHeight + 2;
        this.listElement.classList.toggle('at-bottom', atBottom);
    };

    #closeOverlay() {
        if (this.#activeOverlayId === null) return;
        const row = document.getElementById(`${this.#itemPrefix}${this.#activeOverlayId}`);
        row?.classList.remove('overlay-open');
        this.#activeOverlayId = null;
    }

    #openOverlay(id) {
        this.#closeOverlay();
        const row = document.getElementById(`${this.#itemPrefix}${id}`);
        if (!row) return;
        row.classList.add('overlay-open');
        this.#activeOverlayId = id;
    }

    #enterSelectionMode() {
        this.listElement.classList.add('selection-mode');
    }

    #exitSelectionMode() {
        this.listElement.classList.remove('selection-mode');
        this.#activeIds.clear();
        this.#items.forEach(item => {
            const row = document.getElementById(`${this.#itemPrefix}${item.id}`);
            const cb = row?.querySelector('.item-select');
            if (cb) cb.checked = false;
        });
        this.#onSelectionChanged?.(new Set());
    }

    #toggleSelection(id) {
        if (this.#activeIds.has(id)) {
            this.#activeIds.delete(id);
        } else {
            this.#activeIds.add(id);
        }

        const row = document.getElementById(`${this.#itemPrefix}${id}`);
        const cb = row?.querySelector('.item-select');
        if (cb) cb.checked = this.#activeIds.has(id);

        if (this.#activeIds.size === 0) {
            this.#exitSelectionMode();
        }

        this.#onSelectionChanged?.(new Set(this.#activeIds));
    }

    #overlayHTML() {
        const actionButtons = this.#actions.map(a => `
            <button class="overlay-action" data-action="${a.label}" title="${a.label}"><svg><use href="${a.icon}"/></svg></button>`).join('');

        return `
            <div class="item-overlay">
                <button class="overlay-check" title="Select"><svg><use href="#icon-check"/></svg></button>
                ${actionButtons}
                <button class="overlay-delete" title="Delete"><svg><use href="#icon-delete"/></svg></button>
                <span></span>
                <button class="overlay-close" title="Close"><svg><use href="#icon-close"/></svg></button>
            </div>`;
    }

    // ── Public ────────────────────────────────────────

    setItems(items) {
        this.#items = items;
        this.#activeIds.forEach(id => {
            if (!items.find(i => i.id === id)) this.#activeIds.delete(id);
        });
    }

    getActiveIds() { return new Set(this.#activeIds); }

    isSelected(id) { return this.#activeIds.has(id); }

    selectItem(id) {
        if (!this.listElement.classList.contains('selection-mode')) {
            this.#enterSelectionMode();
        }
        // force select this item
        this.#activeIds.add(id);
        const row = document.getElementById(`${this.#itemPrefix}${id}`);
        const cb = row?.querySelector('.item-select');
        if (cb) cb.checked = true;
        this.#onSelectionChanged?.(new Set(this.#activeIds));
    }

    selectAll() {
        if (!this.listElement.classList.contains('selection-mode')) {
            this.#enterSelectionMode();
        }
        this.#items.forEach(item => {
            this.#activeIds.add(item.id);
            const row = document.getElementById(`${this.#itemPrefix}${item.id}`);
            const cb = row?.querySelector('.item-select');
            if (cb) cb.checked = true;
        });
        this.#onSelectionChanged?.(new Set(this.#activeIds));
    }

    clearSelection() {
        this.#exitSelectionMode();
    }

    add(item, afterID = -1) {
        const id = item.id;

        // create and insert element
        const el = document.createElement('div');
        el.innerHTML = this.#getHtml(item);
        const element = el.firstElementChild;
        if (afterID === -1) {
            this.listElement.appendChild(element);
        } else {
            document.getElementById(`${this.#itemPrefix}${afterID}`)
                .insertAdjacentElement('afterend', element);
        }

        // wire row listeners
        const checkbox = element.querySelector('.item-select');
        const handle = element.querySelector('.item-handle');
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.#toggleSelection(id);
        });
        handle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = this.#activeOverlayId === id;
            this.#closeOverlay();
            if (!isOpen) this.#openOverlay(id);
        });

        // add overlay
        element.insertAdjacentHTML('beforeend', this.#overlayHTML());
        const overlay = element.querySelector('.item-overlay');
        const selectBtn = overlay.querySelector('.overlay-check');
        const deleteBtn = overlay.querySelector('.overlay-delete');
        const closeBtn = overlay.querySelector('.overlay-close');

        // wire overlay listeners
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#closeOverlay();
            this.selectItem(id)
        });
        overlay.querySelectorAll('.overlay-action').forEach(btn => {
            const action = this.#actions.find(a => a.label === btn.dataset.action);
            if (!action) return;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.#closeOverlay();
                action.onClick(id);
            });
        });
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#onDelete?.(new Set([id]));
        });
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#closeOverlay();
        });
        overlay.addEventListener('click', (e) => e.stopPropagation());

        this.#checkFade();

        // return the element for any further customisation
        return element;
    }

    remove(id) {
        const row = document.getElementById(`${this.#itemPrefix}${id}`);
        row?.remove();
        this.#activeIds.delete(id);
        this.#checkFade();
    }

    clearItems() {
        this.listElement.innerHTML = '';
        this.#items = [];
        this.#activeIds.clear();
        this.#checkFade();
    }
}