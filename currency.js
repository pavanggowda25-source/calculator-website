/**
 * Currency and Exchange Rate Module
 * Handles API fetching, caching, and formatting.
 */

window.Currency = {

    exchangeRates: {},
    fallbackRates: {
        "USD": 1, "EUR": 0.92, "GBP": 0.79, "JPY": 150.5, "AUD": 1.52, 
        "CAD": 1.35, "CHF": 0.88, "CNY": 7.19, "HKD": 7.82, "NZD": 1.65, 
        "INR": 83.1, "KRW": 1335, "SGD": 1.34, "MXN": 17.0, "BRL": 4.95, 
        "ZAR": 18.9, "RUB": 91.5, "NOK": 10.5, "SEK": 10.4, "THB": 35.8, 
        "IDR": 15600, "AED": 3.67, "PLN": 3.98, "ILS": 3.65, "PHP": 56.1, 
        "MYR": 4.77, "DKK": 6.85, "TRY": 31.0, "SAR": 3.75, "TWD": 31.5
    },

    isLoading: true,
    isError: false,

    async init() {
        this.isLoading = true;
        this.isError = false;
        const cached = localStorage.getItem('cachedRates');
        if (cached) {
            try { this.exchangeRates = JSON.parse(cached); } catch (e) { console.warn("Failed to parse cached rates"); }
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch("https://open.er-api.com/v6/latest/USD", { signal: controller.signal });
            clearTimeout(timeoutId);

            const data = await response.json();
            
            if (!data || !data.rates) {
                throw new Error("Invalid API response format");
            }

            this.exchangeRates = data.rates;
            localStorage.setItem('cachedRates', JSON.stringify(this.exchangeRates));
            this.isLoading = false;
        } catch (e) {
            console.error("Currency API failed:", e.message);
            this.isError = true;
            this.isLoading = false;
            if (Object.keys(this.exchangeRates).length === 0) {
                this.exchangeRates = this.fallbackRates;
            }
        }
    },

    format(amount, currency) {
        try {
            return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency }).format(amount);
        } catch (e) {
            return `${currency} ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    },

    extractCode(val) {
        if (!val) return "";
        const match = val.toUpperCase().match(/^[A-Z]{3}$/);
        const code = match ? match[0] : null;
        return code && this.exchangeRates[code] ? code : null;
    },

    convert(amount, fromCode, toCode) {
        if (!this.exchangeRates[fromCode] || !this.exchangeRates[toCode]) {
            throw new Error(`Unsupported currency code(s): ${fromCode} -> ${toCode}`);
        }
        const amountInUSD = amount / this.exchangeRates[fromCode];
        return amountInUSD * this.exchangeRates[toCode];
    }
};
