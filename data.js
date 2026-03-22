class Config {
    static checklists = [
        {
            id: 'clothes',
            name: 'Clothes',
            items: ['T-shirts', 'Pants', 'Underwear', 'Socks', 'Jacket', 'Swimsuit', 'Pajamas']
        },
        {
            id: 'toiletries',
            name: 'Toiletries',
            items: ['Toothbrush', 'Toothpaste', 'Deodorant', 'Shampoo', 'Sunscreen', 'Razor', 'Medications']
        },
        {
            id: 'gear',
            name: 'Gear',
            items: ['Backpack', 'Day bag', 'Power bank', 'Chargers', 'Adapter', 'Headphones', 'Camera']
        },
        {
            id: 'entertainment',
            name: 'Entertainment',
            items: ['Books', 'Playing cards', 'Download shows', 'Spotify offline', 'Journal']
        },
        {
            id: 'camping',
            name: 'Camping',
            items: ['Tent', 'Sleeping bag', 'Sleeping pad', 'Headlamp', 'Matches', 'First aid kit']
        },
        {
            id: 'kitchen',
            name: 'Kitchen',
            items: ['Camp stove', 'Fuel', 'Cookware', 'Utensils', 'Plates', 'Cups', 'Dish soap']
        },
        {
            id: 'food',
            name: 'Food',
            items: ['Coffee', 'Snacks', 'Cooking oil', 'Salt and pepper', 'Spices']
        },
    ];

    static timeZones = [
        { label: 'Honolulu', zone: 'Hawaii', tz: 'Pacific/Honolulu' },
        { label: 'Anchorage', zone: 'Alaska', tz: 'America/Anchorage' },
        { label: 'Los Angeles', zone: 'Pacific', tz: 'America/Los_Angeles' },
        { label: 'Phoenix', zone: 'Mountain (no DST)', tz: 'America/Phoenix' },
        { label: 'Denver', zone: 'Mountain', tz: 'America/Denver' },
        { label: 'Chicago', zone: 'Central', tz: 'America/Chicago' },
        { label: 'New York', zone: 'Eastern', tz: 'America/New_York' },
        { label: 'Toronto', zone: 'Eastern', tz: 'America/Toronto' },
        { label: 'São Paulo', zone: 'Brasília', tz: 'America/Sao_Paulo' },
        { label: 'London', zone: 'GMT / BST', tz: 'Europe/London' },
        { label: 'Lisbon', zone: 'Western Europe', tz: 'Europe/Lisbon' },
        { label: 'Paris', zone: 'Central Europe', tz: 'Europe/Paris' },
        { label: 'Berlin', zone: 'Central Europe', tz: 'Europe/Berlin' },
        { label: 'Rome', zone: 'Central Europe', tz: 'Europe/Rome' },
        { label: 'Athens', zone: 'Eastern Europe', tz: 'Europe/Athens' },
        { label: 'Moscow', zone: 'Moscow', tz: 'Europe/Moscow' },
        { label: 'Dubai', zone: 'Gulf', tz: 'Asia/Dubai' },
        { label: 'Bangkok', zone: 'Indochina', tz: 'Asia/Bangkok' },
        { label: 'Singapore', zone: 'Singapore', tz: 'Asia/Singapore' },
        { label: 'Hong Kong', zone: 'Hong Kong', tz: 'Asia/Hong_Kong' },
        { label: 'Shanghai', zone: 'China', tz: 'Asia/Shanghai' },
        { label: 'Tokyo', zone: 'Japan', tz: 'Asia/Tokyo' },
        { label: 'Seoul', zone: 'Korea', tz: 'Asia/Seoul' },
        { label: 'Sydney', zone: 'Eastern Australia', tz: 'Australia/Sydney' },
        { label: 'Melbourne', zone: 'Eastern Australia', tz: 'Australia/Melbourne' },
        { label: 'Auckland', zone: 'New Zealand', tz: 'Pacific/Auckland' },
        { label: 'Tijuana', zone: 'Baja California', tz: 'America/Tijuana' },
        { label: 'Mazatlán', zone: 'Pacific Mexico', tz: 'America/Mazatlan' },
        { label: 'Hermosillo', zone: 'Sonora (no DST)', tz: 'America/Hermosillo' },
        { label: 'Mexico City', zone: 'Central Mexico', tz: 'America/Mexico_City' },
        { label: 'Cancún', zone: 'Eastern Mexico', tz: 'America/Cancun' },
        { label: 'Bogotá', zone: 'Colombia', tz: 'America/Bogota' },
        { label: 'Lima', zone: 'Peru', tz: 'America/Lima' },
        { label: 'Buenos Aires', zone: 'Argentina', tz: 'America/Argentina/Buenos_Aires' },
        { label: 'Casablanca', zone: 'Morocco', tz: 'Africa/Casablanca' },
        { label: 'Cairo', zone: 'Egypt', tz: 'Africa/Cairo' },
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

    static referenceAmounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 50, 75, 100];

    static currencies = {
        AUD: { code: 'AUD', locale: 'en-AU', symbol: '$', name: 'Dollar', region: 'Australia', default: 1.53, decimals: 2, multiplier: 1 },
        BRL: { code: 'BRL', locale: 'pt-BR', symbol: 'R$', name: 'Real', region: 'Brazil', default: 4.97, decimals: 2, multiplier: 10 },
        CAD: { code: 'CAD', locale: 'en-CA', symbol: '$', name: 'Dollar', region: 'Canada', default: 1.36, decimals: 2, multiplier: 1 },
        CNY: { code: 'CNY', locale: 'zh-CN', symbol: '¥', name: 'Yuan', region: 'China', default: 7.24, decimals: 2, multiplier: 10 },
        EUR: { code: 'EUR', locale: 'de-DE', symbol: '€', name: 'Euro', region: 'European Union', default: 0.92, decimals: 2, multiplier: 1 },
        GBP: { code: 'GBP', locale: 'en-GB', symbol: '£', name: 'Pound', region: 'United Kingdom', default: 0.79, decimals: 2, multiplier: 1 },
        HKD: { code: 'HKD', locale: 'zh-HK', symbol: '$', name: 'Dollar', region: 'Hong Kong', default: 7.82, decimals: 2, multiplier: 10 },
        INR: { code: 'INR', locale: 'en-IN', symbol: '₹', name: 'Rupee', region: 'India', default: 83.12, decimals: 2, multiplier: 10 },
        JPY: { code: 'JPY', locale: 'ja-JP', symbol: '¥', name: 'Yen', region: 'Japan', default: 149.50, decimals: 0, multiplier: 100 },
        MXN: { code: 'MXN', locale: 'es-MX', symbol: '$', name: 'Peso', region: 'Mexico', default: 17.57, decimals: 2, multiplier: 1 },
        PHP: { code: 'PHP', locale: 'en-PH', symbol: '₱', name: 'Peso', region: 'Philippines', default: 56.50, decimals: 2, multiplier: 10 },
        SGD: { code: 'SGD', locale: 'en-SG', symbol: '$', name: 'Dollar', region: 'Singapore', default: 1.34, decimals: 2, multiplier: 1 },
        THB: { code: 'THB', locale: 'th-TH', symbol: '฿', name: 'Baht', region: 'Thailand', default: 35.10, decimals: 2, multiplier: 10 },
        USD: { code: 'USD', locale: 'en-US', symbol: '$', name: 'Dollar', region: 'United States', default: 1, decimals: 2, multiplier: 1 },
    };

    static getCurrency(code) {
        return Config.currencies[code];
    }
}

class StorageService {

    // ── Private keys ──────────────────────────────────

    static #STORED_RATE = 'storedRate';
    static #AUTO_FETCH_RATE = 'autoFetchRate';
    static #FOREIGN_CURRENCY = 'foreignCurrency';

    static #CHECKLISTS_LISTS = 'checklists';
    static #CHECKLISTS_ITEMS = 'checklistItems';

    // ── Init ──────────────────────────────────────────

    constructor() { throw new Error('StorageService is static'); }

    static async init() {
        await DatabaseService.init();
    }

    // ── Helpers ───────────────────────────────────────

    static #toBool(value, defaultVal = true) {
        return value === null ? defaultVal : value === 'true';
    }

    // ── Rate ──────────────────────────────────────────

    static deleteStoredRate() {
        localStorage.removeItem(StorageService.#STORED_RATE);
    }
    static getStoredRate() {
        return JSON.parse(localStorage.getItem(StorageService.#STORED_RATE));
    }
    static setStoredRate(rate, isCustom) {
        localStorage.setItem(StorageService.#STORED_RATE, JSON.stringify({
            rate,
            date: RateService.getLocalDate(),
            currency: RateService.getForeignCurrency().code,
            isCustom
        }));
    }

    // ── Settings ──────────────────────────────────────

    static getAutoFetchRate() {
        return StorageService.#toBool(localStorage.getItem(StorageService.#AUTO_FETCH_RATE));
    }
    static setAutoFetchRate(value) {
        localStorage.setItem(StorageService.#AUTO_FETCH_RATE, value);
    }

    static getForeignCode() {
        return localStorage.getItem(StorageService.#FOREIGN_CURRENCY) || 'MXN';
    }
    static setForeignCode(value) {
        localStorage.setItem(StorageService.#FOREIGN_CURRENCY, value);
    }

    // ── Checklists ────────────────────────────────────

    static async getChecklists() {
        const [result] = await DatabaseService.transaction()
            .getEntries(StorageService.#CHECKLISTS_LISTS)
            .run();
        return result;
    }

    static async addChecklist(name) {
        const [result] = await DatabaseService.transaction()
            .addEntry(StorageService.#CHECKLISTS_LISTS, { name })
            .run();
        return result;
    }

    static async deleteChecklist(id) {
        await DatabaseService.transaction()
            .deleteEntriesByIndex(StorageService.#CHECKLISTS_ITEMS, 'listId', id)
            .deleteEntry(StorageService.#CHECKLISTS_LISTS, id)
            .run();
    }

    static async getChecklistItems(listId) {
        const [items] = await DatabaseService.transaction()
            .getEntriesByIndex(StorageService.#CHECKLISTS_ITEMS, 'listId', listId)
            .run();
        return items;
    }

    static async addChecklistItem(listId, name) {
        const [result] = await DatabaseService.transaction()
            .addEntry(StorageService.#CHECKLISTS_ITEMS, { listId, name, checked: false })
            .run();
        return result;
    }

    static async addChecklistItems(listId, names) {
        const [result] = await DatabaseService.transaction()
            .addEntries(StorageService.#CHECKLISTS_ITEMS, names.map(name => ({ listId, name, checked: false })))
            .run();
        return result;
    }

    static async updateChecklistItem(obj) {
        await DatabaseService.transaction()
            .updateEntry(StorageService.#CHECKLISTS_ITEMS, obj)
            .run();
    }

    static async deleteChecklistItems(ids) {
        await DatabaseService.transaction()
            .deleteEntries(StorageService.#CHECKLISTS_ITEMS, ids)
            .run();
    }
}

class DatabaseService {
    static #DB_NAME = 'tripkit';
    static #DB_VERSION = 1;
    static DB = null;

    static #CHECKLISTS_LISTS = 'checklists';
    static #CHECKLISTS_ITEMS = 'checklistItems';

    constructor() { throw new Error('DatabaseService is static'); }

    static async init() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DatabaseService.#DB_NAME, DatabaseService.#DB_VERSION);

            req.onupgradeneeded = (e) => {
                const db = e.target.result;

                if (!db.objectStoreNames.contains(DatabaseService.#CHECKLISTS_LISTS)) {
                    db.createObjectStore(DatabaseService.#CHECKLISTS_LISTS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                }

                if (!db.objectStoreNames.contains(DatabaseService.#CHECKLISTS_ITEMS)) {
                    const items = db.createObjectStore(DatabaseService.#CHECKLISTS_ITEMS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    items.createIndex('listId', 'listId', { unique: false });
                }
            };

            req.onsuccess = (e) => {
                DatabaseService.DB = e.target.result;
                resolve();
            };
            req.onerror = (e) => reject(e.target.error);
        });
    }

    static transaction() {
        return new DBTransaction();
    }
}

class DBTransaction {
    static #debug = false;

    #write = false;
    #stores = [];
    #operations = [];

    // ── Logging ───────────────────────────────────────

    static #log(type, msg, data) {
        if (!DBTransaction.#debug) return;
        console.log(`DB.${type}: ${msg}`, data);
    }

    // ── Store tracking ────────────────────────────────

    #addStore(store, write = false) {
        this.#stores.push(store);
        if (write) this.#write = true;
    }

    // ── Read operations ───────────────────────────────

    getEntry(store, id) {
        this.#addStore(store);
        this.#operations.push((tx) =>
            new Promise((resolve, reject) => {
                const req = tx.objectStore(store).get(id);
                req.onsuccess = (e) => { DBTransaction.#log('success', `getEntry ${id} from ${store}`, e.target.result); resolve(e.target.result); };
                req.onerror = (e) => { DBTransaction.#log('error', `getEntry ${id} from ${store}`, e.target.error); reject(e.target.error); };
            })
        );
        return this;
    }

    getEntries(store) {
        this.#addStore(store);
        this.#operations.push((tx) =>
            new Promise((resolve, reject) => {
                const req = tx.objectStore(store).getAll();
                req.onsuccess = (e) => { DBTransaction.#log('success', `getEntries from ${store}`, e.target.result); resolve(e.target.result); };
                req.onerror = (e) => { DBTransaction.#log('error', `getEntries from ${store}`, e.target.error); reject(e.target.error); };
            })
        );
        return this;
    }

    getEntriesByIndex(store, indexName, indexValue) {
        this.#addStore(store);
        this.#operations.push((tx) =>
            new Promise((resolve, reject) => {
                const req = tx.objectStore(store).index(indexName).getAll(IDBKeyRange.only(indexValue));
                req.onsuccess = (e) => { DBTransaction.#log('success', `getEntriesByIndex ${indexName}=${indexValue} from ${store}`, e.target.result); resolve(e.target.result); };
                req.onerror = (e) => { DBTransaction.#log('error', `getEntriesByIndex ${indexName}=${indexValue} from ${store}`, e.target.error); reject(e.target.error); };
            })
        );
        return this;
    }

    // ── Write operations ──────────────────────────────

    addEntry(store, obj) {
        this.#addStore(store, true);
        this.#operations.push((tx) =>
            new Promise((resolve, reject) => {
                const req = tx.objectStore(store).add(obj);
                req.onsuccess = (e) => { DBTransaction.#log('success', `addEntry to ${store}`, e.target.result); resolve({ ...obj, id: e.target.result }); };
                req.onerror = (e) => { DBTransaction.#log('error', `addEntry to ${store}`, e.target.error); reject(e.target.error); };
            })
        );
        return this;
    }

    addEntries(store, objs) {
        this.#addStore(store, true);
        this.#operations.push((tx) =>
            new Promise((resolve, reject) => {
                if (objs.length === 0) { resolve([]); return; }
                const results = [];
                const storeObj = tx.objectStore(store);
                let completed = 0;
                objs.forEach(obj => {
                    const req = storeObj.add(obj);
                    req.onsuccess = (e) => {
                        DBTransaction.#log('success', `addEntries item to ${store}`, e.target.result);
                        results.push({ ...obj, id: e.target.result });
                        if (++completed === objs.length) resolve(results);
                    };
                    req.onerror = (e) => { DBTransaction.#log('error', `addEntries item to ${store}`, e.target.error); reject(e.target.error); };
                });
            })
        );
        return this;
    }

    updateEntry(store, obj) {
        this.#addStore(store, true);
        this.#operations.push((tx) =>
            new Promise((resolve, reject) => {
                const req = tx.objectStore(store).put(obj);
                req.onsuccess = (e) => { DBTransaction.#log('success', `updateEntry ${obj.id} in ${store}`, e.target.result); resolve({ ...obj, id: e.target.result }); };
                req.onerror = (e) => { DBTransaction.#log('error', `updateEntry ${obj.id} in ${store}`, e.target.error); reject(e.target.error); };
            })
        );
        return this;
    }

    deleteEntry(store, id) {
        this.#addStore(store, true);
        this.#operations.push((tx) =>
            new Promise((resolve, reject) => {
                const req = tx.objectStore(store).delete(id);
                req.onsuccess = (e) => { DBTransaction.#log('success', `deleteEntry ${id} from ${store}`, e.target.result); resolve(undefined); };
                req.onerror = (e) => { DBTransaction.#log('error', `deleteEntry ${id} from ${store}`, e.target.error); reject(e.target.error); };
            })
        );
        return this;
    }

    deleteEntries(store, ids) {
        this.#addStore(store, true);
        this.#operations.push((tx) =>
            new Promise((resolve, reject) => {
                if (ids.length === 0) { resolve(undefined); return; }
                const storeObj = tx.objectStore(store);
                let completed = 0;
                ids.forEach(id => {
                    const req = storeObj.delete(id);
                    req.onsuccess = (e) => {
                        DBTransaction.#log('success', `deleteEntries item ${id} from ${store}`, e.target.result);
                        if (++completed === ids.length) resolve(undefined);
                    };
                    req.onerror = (e) => { DBTransaction.#log('error', `deleteEntries item ${id} from ${store}`, e.target.error); reject(e.target.error); };
                });
            })
        );
        return this;
    }

    deleteEntriesByIndex(store, indexName, indexValue) {
        this.#addStore(store, true);
        this.#operations.push((tx) =>
            new Promise((resolve, reject) => {
                const request = tx.objectStore(store).index(indexName).openCursor(IDBKeyRange.only(indexValue));
                request.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        const req = cursor.delete();
                        req.onsuccess = () => { DBTransaction.#log('success', `deleteEntriesByIndex cursor ${indexName}=${indexValue} from ${store}`, undefined); };
                        req.onerror = (e) => { DBTransaction.#log('error', `deleteEntriesByIndex cursor ${indexName}=${indexValue} from ${store}`, e.target.error); reject(e.target.error); };
                        cursor.continue();
                    } else {
                        DBTransaction.#log('success', `deleteEntriesByIndex ${indexName}=${indexValue} from ${store} complete`, undefined);
                        resolve(undefined);
                    }
                };
                request.onerror = (e) => { DBTransaction.#log('error', `deleteEntriesByIndex ${indexName}=${indexValue} from ${store}`, e.target.error); reject(e.target.error); };
            })
        );
        return this;
    }

    // ── Execute ───────────────────────────────────────

    run() {
        return new Promise((resolve, reject) => {
            const uniqueStores = [...new Set(this.#stores)];
            const mode = this.#write ? 'readwrite' : 'readonly';
            const tx = DatabaseService.DB.transaction(uniqueStores, mode);
            const results = [];

            Promise.all(
                this.#operations.map(op => {
                    const result = op(tx);
                    return result instanceof Promise
                        ? result.then(r => results.push(r))
                        : Promise.resolve(results.push(undefined));
                })
            ).catch(reject);

            tx.oncomplete = () => { DBTransaction.#log('complete', '', results); resolve(results); };
            tx.onerror = (e) => { DBTransaction.#log('error', '', e.target.error); reject(e.target.error); };
            tx.onabort = (e) => { DBTransaction.#log('aborted', '', e.target.error); reject(e.target.error); };
        });
    }
}

class RateService {
    static #ON_RATE_CHANGED = 'rateChanged';
    static #ON_STATE_CHANGED = 'stateChanged';
    static #ON_CURRENCY_CHANGED = 'currencyChanged';
    static #ON_MESSAGE_SENT = 'messageSent';
    static #API_TIMEOUT = 5000;

    static #localCurrency = Config.currencies['USD'];
    static #foreignCurrency;
    static #rate = null;
    static #message = "Fetching live rate…";

    constructor() { throw new Error('EventService is static'); }

    static init() {
        RateService.setForeignCurrency(StorageService.getForeignCode());
    }

    // ── CURRENCY ────────────────────────────────────────

    static getLocalCurrency() { return RateService.#localCurrency; }
    static getForeignCurrency() { return RateService.#foreignCurrency; }
    static setForeignCurrency(code) {
        let currency = Config.getCurrency(code);
        if (currency == null) currency = Config.getCurrency('MXN');

        const oldCode = RateService.#foreignCurrency?.code;
        if (currency.code === oldCode) return;

        RateService.#foreignCurrency = currency;
        StorageService.setForeignCode(currency.code);
        RateService.#rate = null;

        // only clear stored rate if it belongs to a different currency
        const stored = StorageService.getStoredRate();
        if (stored !== null && stored.currency !== currency.code) {
            StorageService.deleteStoredRate();
        }

        RateService.#dispatch(RateService.#ON_CURRENCY_CHANGED, { currency });
        RateService.fetchRate();
    }

    // ── RATE ────────────────────────────────────────

    static getRate() {
        return RateService.#rate ?? RateService.#foreignCurrency.default;
    }

    static setRate(value) {
        const parsed = parseFloat(value);
        const changed = RateService.#rate !== parsed;
        RateService.#rate = parsed;
        if (changed) {
            RateService.#dispatch(RateService.#ON_RATE_CHANGED, { rate: RateService.#rate });
        }
    }

    static fetchRate(forceFetch = false) {
        const today = RateService.getLocalDate();
        const stored = StorageService.getStoredRate();

        // custom rate — only override if not force fetching
        if (stored?.isCustom && !forceFetch) {
            RateService.setRate(stored.rate);
            RateService.#sendMessage('Using a custom rate');
            return;
        }

        // valid cached rate for today
        if (!forceFetch &&
            stored !== null &&
            !stored.isCustom &&
            stored.date === today &&
            stored.currency === RateService.#foreignCurrency.code) {
            RateService.setRate(stored.rate);
            RateService.#sendMessage(`Cached rate as of ${RateService.formatDate(stored.date)}`);
            return;
        }

        // respect auto fetch setting
        if (!forceFetch && !StorageService.getAutoFetchRate()) {
            if (stored !== null && stored.currency === RateService.#foreignCurrency.code) {
                RateService.setRate(stored.rate);
                RateService.#sendMessage(`Rate as of ${RateService.formatDate(stored.date)} · auto-fetch disabled`);
            } else {
                RateService.setRate(RateService.getForeignCurrency().default);
                RateService.#sendMessage('Auto-fetch disabled · using default rate');
            }
            return;
        }

        // fetch live
        RateService.#dispatch(RateService.#ON_STATE_CHANGED, { busy: true });
        RateService.#sendMessage('Fetching live rate…');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), RateService.#API_TIMEOUT);
        const url = `https://api.frankfurter.app/latest?from=${RateService.#localCurrency.code}&to=${RateService.#foreignCurrency.code}`;

        fetch(url, { signal: controller.signal })
            .then(r => r.json())
            .then(data => {
                clearTimeout(timeout);
                const val = data.rates[RateService.#foreignCurrency.code];
                StorageService.setStoredRate(val, false);
                RateService.setRate(val);
                RateService.#sendMessage(`Live rate as of ${RateService.formatDate(today)} · European Central Bank`);
            })
            .catch(err => {
                console.log(err);
                clearTimeout(timeout);
                // fall back to stale stored rate if available
                if (stored !== null && stored.currency === RateService.#foreignCurrency.code) {
                    RateService.setRate(stored.rate);
                    RateService.#sendMessage(`Using rate from ${RateService.formatDate(stored.date)} · network unavailable`);
                } else {
                    RateService.#sendMessage(err.name === 'AbortError' ? 'Request timed out · using default rate' : 'Could not fetch live rate · using default rate');
                }
            })
            .finally(() => {
                RateService.#dispatch(RateService.#ON_STATE_CHANGED, { busy: false });
            });
    }

    // ── CONVERT ────────────────────────────────────────

    static toForeign(amount) { return parseFloat(amount) * RateService.getRate(); }
    static toLocal(amount) { return parseFloat(amount) / RateService.getRate(); }

    // ── FORMAT ────────────────────────────────────────

    static #format(value, currency) {
        if (isNaN(value) || !isFinite(value)) return '—';
        return value.toLocaleString(RateService.#localCurrency.locale, {
            minimumFractionDigits: currency.decimals,
            maximumFractionDigits: currency.decimals
        });
    }

    static #formatInput(value, currency) { return RateService.#format(value, currency).replace(/,/g, ''); }
    static formatLocalInput(value) { return RateService.#formatInput(value, RateService.#localCurrency); }
    static formatForeignInput(value) { return RateService.#formatInput(value, RateService.#foreignCurrency); }

    static #formatSymbol(value, currency) { return `${currency.symbol}${RateService.#format(value, currency)}`; }
    static formatLocalSymbol(value) { return RateService.#formatSymbol(value, RateService.#localCurrency); }
    static formatForeignSymbol(value) { return RateService.#formatSymbol(value, RateService.#foreignCurrency); }

    static #formatFull(value, currency) { return `${currency.symbol}${RateService.#format(value, currency)} ${currency.code}`; }
    static formatLocalFull(value) { return RateService.#formatFull(value, RateService.#localCurrency); }
    static formatForeignFull(value) { return RateService.#formatFull(value, RateService.#foreignCurrency); }

    // ── DATE ────────────────────────────────────────

    static getLocalDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    static formatDate(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString(
            RateService.#localCurrency.locale, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // ── EVENTS ────────────────────────────────────────

    static #dispatch(name, detail = {}) { document.dispatchEvent(new CustomEvent(name, { detail })); }
    static #listen(name, handler) { document.addEventListener(name, handler); }

    static #sendMessage(msg) {
        RateService.#message = msg;
        RateService.#dispatch(RateService.#ON_MESSAGE_SENT, { msg: msg });
    }
    static getMessage() { return RateService.#message; }

    static onRateChanged(handler) { RateService.#listen(RateService.#ON_RATE_CHANGED, handler); }
    static onStateChanged(handler) { RateService.#listen(RateService.#ON_STATE_CHANGED, handler); }
    static onCurrencyChanged(handler) { RateService.#listen(RateService.#ON_CURRENCY_CHANGED, handler); }
    static onMessageSent(handler) { RateService.#listen(RateService.#ON_MESSAGE_SENT, handler); }
}