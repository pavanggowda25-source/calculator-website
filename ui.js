
window.UI = {

    activePage: "home",
    backWarningActive: false,
    backWarningTimer: null,
    isScriptedBack: false,

    // Table state for progressive rendering & export
    activeTableData: null,
    renderedRowCount: 0,
    currentTableHeaders: [],
    currentTableCurrency: "",
    currentTableContainerId: "",
    currentCalculatorId: "",
    hapticsEnabled: true,

    init() {
        this._injectCommonUI();
        this._setupEventListeners();
        this._initTheme();
        this._initCurrencies();
        this._initHistory();
        this._toggleFrequency();
        this._checkNative();
    },

    _checkNative() {
        // Detect if running inside an Android WebView with our Native Bridge
        if (typeof window.Android !== 'undefined') {
            console.info("Native Android Bridge Detected Ready.");
        }
    },

    _vibrate(ms = 50) {
        if (this.hapticsEnabled && navigator.vibrate) {
            navigator.vibrate(ms);
        }
    },

    _notify(msg) {
        // If Android Bridge exists, use native Toast, otherwise fallback to custom JS Toast
        if (typeof window.Android !== 'undefined' && typeof window.Android.showToast === 'function') {
            window.Android.showToast(msg);
        } else {
            this._showToast(msg);
        }
    },

    // --- UX POLISH ---
    _injectCommonUI() {
        const calculators = document.querySelectorAll('section.calculator');
        calculators.forEach(section => {
            const id = section.id;
            const form = section.querySelector('form');
            if (!form) return;

            // Ensure Result Area
            const resId = `${id}Result`;
            if (!document.getElementById(resId)) {
                const resDiv = document.createElement('div');
                resDiv.id = resId;
                resDiv.className = 'result';
                resDiv.setAttribute('aria-live', 'polite');
                form.insertBefore(resDiv, form.querySelector('.btn-back'));
            }

            // Ensure Special Loan Breakdown Area
            if (id === 'loan' && !document.getElementById('monthlyBreakdown')) {
                const breakdown = document.createElement('div');
                breakdown.id = 'monthlyBreakdown';
                breakdown.setAttribute('aria-live', 'polite');
                form.insertBefore(breakdown, form.querySelector('.btn-back'));
            }

            // Ensure Converter Box
            if (!section.querySelector('.converter-box')) {
                const convDiv = document.createElement('div');
                convDiv.className = 'converter-box hidden';
                convDiv.innerHTML = `
                    <label>Convert Result To:</label>
                    <div class="flex-row">
                        <input list="currency-datalist" class="targetCurrency" placeholder="Currency" aria-label="Target Currency">
                        <button type="button" class="calc slim btn-convert" data-calc="${id}">Convert</button>
                    </div>
                    <div class="convertResult result" aria-live="polite"></div>
                `;
                form.insertBefore(convDiv, form.querySelector('.btn-back'));
            }
        });
    },

    _showLoading(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('calculating');
    },

    _hideLoading(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('calculating');
    },

    _scrollToResult(id) {
        const el = document.getElementById(id);
        if (el) {
            setTimeout(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    },

    // --- NAVIGATION & HISTORY ---
    _initHistory() {
        window.history.replaceState({ page: 'root' }, "", "");
        window.history.pushState({ page: 'home' }, "", "#home");

        this._injectExitDialog();

        window.addEventListener('popstate', (e) => {
            if (this.isScriptedBack) {
                // This was triggered by our own goBack() button — we already handled the UI
                this.isScriptedBack = false;
                return;
            }

            if (this.activePage !== 'home') {
                // User swiped back while INSIDE a calculator → go straight to home
                this._forceExitToMenu();
                // Keep history intact so next swipe is caught at home level
                window.history.pushState({ page: 'home' }, '', '#home');
            } else {
                // User swiped back from HOME SCREEN → show exit dialog
                if (!this.backWarningActive) {
                    this._showExitDialog();
                    this.backWarningActive = true;
                    // Push a state so next swipe is caught
                    window.history.pushState({ page: 'home' }, '', '#home');
                    this.backWarningTimer = setTimeout(() => {
                        this.backWarningActive = false;
                        this._hideExitDialog();
                    }, 4000);
                } else {
                    // Second swipe on home → actually exit
                    clearTimeout(this.backWarningTimer);
                    this.backWarningActive = false;
                    this._hideExitDialog();
                    window.history.back();
                }
            }
        });
    },

    openPage(id) {
        if (this.activePage === id) return;
        document.getElementById('menu').style.display = "none";
        document.getElementById('mainTitle').style.display = "none";
        document.querySelectorAll(".calculator").forEach(c => c.classList.add("hidden"));
        document.getElementById(id).classList.remove("hidden");
        this.activePage = id;
        this.currentCalculatorId = id;
        window.history.pushState({ page: id }, "", `#${id}`);
    },

    goBack() {
        // This is the explicit HTML Back button — no warning, go straight home
        this.isScriptedBack = true;
        this._forceExitToMenu();
        window.history.pushState({ page: 'home' }, '', '#home');
    },

    _forceExitToMenu() {
        ['profit', 'interest', 'loan', 'fvpv', 'shopping', 'ytm'].forEach(id => this._resetCalculator(id));
        document.getElementById('menu').style.display = "";
        document.getElementById('mainTitle').style.display = "";
        document.querySelectorAll(".calculator").forEach(c => c.classList.add("hidden"));
        this.activePage = "home";
    },

    // --- EXIT DIALOG ---
    _injectExitDialog() {
        if (document.getElementById('exitDialog')) return;
        const overlay = document.createElement('div');
        overlay.id = 'exitDialog';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 10000;
            background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
            display: none; align-items: flex-end; justify-content: center;
            padding-bottom: env(safe-area-inset-bottom, 20px);
        `;
        overlay.innerHTML = `
            <div id="exitDialogCard" style="
                background: var(--card-bg); border-radius: 20px 20px 0 0;
                padding: 2rem 1.5rem 2rem; width: 100%; max-width: 480px;
                box-shadow: 0 -8px 30px rgba(0,0,0,0.2);
                animation: slideUp 0.3s ease-out;
            ">
                <div style="width: 40px; height: 4px; background: var(--card-border); border-radius: 2px; margin: 0 auto 1.5rem;"></div>
                <h2 style="margin: 0 0 0.5rem; font-size: 1.2rem; color: var(--text-primary); text-align: center;">Exit Complex Calculator?</h2>
                <p style="margin: 0 0 1.5rem; color: var(--text-secondary); font-size: 0.9rem; text-align: center;">Swipe back once more to exit the app.</p>
                <button id="exitDialogCancel" style="
                    width: 100%; padding: 0.85rem; border-radius: 10px;
                    border: 1px solid var(--card-border); background: transparent;
                    color: var(--text-secondary); font-size: 1rem; font-family: inherit; cursor: pointer;
                ">Stay in App</button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('exitDialogCancel').addEventListener('click', () => {
            this.backWarningActive = false;
            clearTimeout(this.backWarningTimer);
            this._hideExitDialog();
        });
    },

    _showExitDialog() {
        if ("vibrate" in navigator) navigator.vibrate([60, 40, 60]);
        const dialog = document.getElementById('exitDialog');
        dialog.style.display = 'flex';
    },

    _hideExitDialog() {
        const dialog = document.getElementById('exitDialog');
        if (dialog) dialog.style.display = 'none';
    },

    // --- THEME ---
    _initTheme() {
        const toggle = document.getElementById('themeToggle');
        const set = (t) => {
            document.body.classList.toggle('dark-mode', t === 'dark');
            localStorage.setItem('theme', t);
        };
        toggle.onclick = () => set(document.body.classList.contains('dark-mode') ? 'light' : 'dark');
        const saved = localStorage.getItem('theme');
        const system = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (saved) set(saved); else if (system) set('dark');
    },

    // --- CURRENCIES ---
    async _initCurrencies() {
        this._updateCurrencyStatus("Fetching rates...");
        await Currency.init();

        if (Currency.isError) {
            this._updateCurrencyStatus("Using offline rates", true);
        } else {
            this._updateCurrencyStatus("Live rates active");
        }

        const datalist = document.getElementById('currency-datalist');
        const regionNames = new Intl.DisplayNames(['en'], { type: 'currency' });

        datalist.innerHTML = "";
        Object.keys(Currency.exchangeRates).forEach(c => {
            const opt = document.createElement("option");
            opt.value = c;
            let sym = c, name = c;
            try { sym = (0).toLocaleString('en-US', { style: 'currency', currency: c }).replace(/[\d.,\s]/g, '').trim() || c; } catch (e) { }
            try { name = regionNames.of(c) || c; } catch (e) { }
            opt.textContent = `${sym} - ${name}`;
            datalist.appendChild(opt);
        });
    },

    _updateCurrencyStatus(msg, isWarning = false) {
        let statusEl = document.getElementById('currencyStatus');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'currencyStatus';
            statusEl.style.cssText = "font-size: 0.7rem; text-align: center; margin-top: -10px; margin-bottom: 20px; opacity: 0.7;";
            document.querySelector('.menu').parentElement.insertBefore(statusEl, document.querySelector('.menu'));
        }
        statusEl.textContent = msg;
        statusEl.style.color = isWarning ? "var(--danger-text)" : "var(--text-secondary)";
    },

    // --- CALCULATOR OPERATIONS ---
    calculateProfit() {
        const id = 'profit';
        this.currentCalculatorId = id;
        this._showLoading(id);

        setTimeout(() => {
            try {
                const resId = 'profitResult';
                const cur = this._validateCurrency('profitCurrency', resId);
                if (!cur) {
                    this._hideLoading(id);
                    return;
                }

                const cost = this._getNumericValue('cost', 'Cost Price');
                const margin = this._getNumericValue('margin', 'Margin (%)');

                const result = Calculations.calculateProfit(cost, margin);
                const container = document.getElementById(resId);
                container.innerHTML = `
                    <strong>Sell Price:</strong> ${Currency.format(result.sellPrice, cur)}<br>
                    <strong>Profit:</strong> ${Currency.format(result.profit, cur)}<br>
                    <strong>Margin:</strong> ${result.marginPercent.toFixed(1)}%
                `;
                this._showConverter(id, result.profit, cur, 'Profit');
                this._scrollToResult(resId);
            } catch (e) {
                this._showError('profitResult', e.message);
            } finally {
                this._hideLoading(id);
            }
        }, 300);
    },

    calculateInterest() {
        const id = 'interest';
        this.currentCalculatorId = id;
        this._showLoading(id);

        setTimeout(() => {
            try {
                const resId = 'interestResult';
                const cur = this._validateCurrency('interestCurrency', resId);
                if (!cur) {
                    this._hideLoading(id);
                    return;
                }

                const P = this._getNumericValue('principal', 'Principal Amount');
                const r = this._getNumericValue('rate', 'Rate (%)') / 100;
                const t = this._getNumericValue('time', 'Years');
                const n = parseFloat(document.getElementById('compoundFreq').value);
                const type = document.getElementById('interestCalcType').value;

                const result = Calculations.calculateInterest(P, r, t, n, type);
                const container = document.getElementById(resId);

                container.innerHTML = `<strong>Total Interest:</strong> ${Currency.format(result.totalInterest, cur)}<br><strong>Final Amount:</strong> ${Currency.format(result.finalAmount, cur)}<br>`;
                this._renderTable(result.table, cur, ["Period", "Interest", "Amount"], resId);

                this._showConverter(id, result.finalAmount, cur, 'Final Amount');
                this._scrollToResult(resId);
            } catch (e) {
                this._showError('interestResult', e.message);
            } finally {
                this._hideLoading(id);
            }
        }, 300);
    },

    calculateLoan() {
        const id = 'loan';
        this.currentCalculatorId = id;
        this._showLoading(id);

        setTimeout(() => {
            try {
                const resId = 'loanResult';
                const cur = this._validateCurrency('loanCurrency', resId);
                if (!cur) {
                    this._hideLoading(id);
                    return;
                }

                const P = this._getNumericValue('loanAmount', 'Loan Amount');
                const annualRate = this._getNumericValue('interestRate', 'Interest Rate (%)') / 100;
                const years = this._getNumericValue('loanYears', 'Years');
                const freq = document.getElementById('frequency').value;
                const extra = parseFloat(document.getElementById('extraPayment').value) || 0;
                const mode = document.getElementById('loanMode').value;

                const result = Calculations.calculateLoan(P, annualRate, years, freq, extra, mode);
                const container = document.getElementById(resId);

                container.innerHTML = `
                    <strong>Payment per period:</strong> ${Currency.format(result.payment, cur)}<br>
                    <strong>Total Interest:</strong> ${Currency.format(result.totalInterest, cur)}<br>
                    <strong>Total Payable:</strong> ${Currency.format(result.totalPayable, cur)}
                `;
                const breakdown = document.getElementById('monthlyBreakdown');
                breakdown.innerHTML = "";
                this._renderTable(result.table, cur, ["Period", "Principal", "Interest", "Balance"], 'monthlyBreakdown');
                this._showConverter(id, result.totalPayable, cur, 'Total Amount Payable');
                this._scrollToResult(resId);
            } catch (e) {
                this._showError('loanResult', e.message);
            } finally {
                this._hideLoading(id);
            }
        }, 300);
    },

    calculateFVPV() {
        const id = 'fvpv';
        this.currentCalculatorId = id;
        this._showLoading(id);

        setTimeout(() => {
            try {
                const resId = 'fvpvResult';
                const cur = this._validateCurrency('fvpvCurrency', resId);
                if (!cur) {
                    this._hideLoading(id);
                    return;
                }

                const amt = this._getNumericValue('fvpvAmount', 'Amount');
                const r = this._getNumericValue('fvpvRate', 'Rate (%)') / 100;
                const t = this._getNumericValue('fvpvTime', 'Years');
                const n = parseFloat(document.getElementById('fvpvFreq').value);
                const op = document.getElementById('fvpvOp').value;

                const result = Calculations.calculateFVPV(amt, r, t, n, op);
                const container = document.getElementById(resId);

                container.innerHTML = `
                    <strong>Final ${result.opLabel}:</strong> ${Currency.format(result.amount, cur)}<br>
                    <strong>${result.interestLabel}:</strong> ${Currency.format(result.totalInterest, cur)}<br>
                `;
                this._renderTable(result.table, cur, ["Period", "Interest", "Amount"], resId);
                this._showConverter(id, result.amount, cur, 'Final Value');
                this._scrollToResult(resId);
            } catch (e) {
                this._showError('fvpvResult', e.message);
            } finally {
                this._hideLoading(id);
            }
        }, 300);
    },

    calculateShopping() {
        const id = 'shopping';
        this.currentCalculatorId = id;
        this._showLoading(id);

        setTimeout(() => {
            try {
                const resId = 'shoppingResult';
                const cur = this._validateCurrency('shopCurrency', resId);
                if (!cur) {
                    this._hideLoading(id);
                    return;
                }

                const price = this._getNumericValue('shopPrice', 'Original Price');
                const d1 = parseFloat(document.getElementById('shopDiscount').value) || 0;
                const d2 = parseFloat(document.getElementById('shopExtra').value) || 0;
                const tax = parseFloat(document.getElementById('shopTax').value) || 0;

                const result = Calculations.calculateShopping(price, d1, d2, tax);
                const container = document.getElementById(resId);

                container.innerHTML = `
                    <strong>After Discount:</strong> ${Currency.format(result.afterD2, cur)}<br>
                    <strong>Tax:</strong> ${Currency.format(result.taxAmt, cur)}<br>
                    <strong>Final Price:</strong> ${Currency.format(result.final, cur)}
                `;
                this._showConverter(id, result.final, cur, 'Final Price');
                this._scrollToResult(resId);
            } catch (e) {
                this._showError('shoppingResult', e.message);
            } finally {
                this._hideLoading(id);
            }
        }, 300);
    },

    calculateYTM() {
        const id = 'ytm';
        this.currentCalculatorId = id;
        this._showLoading(id);

        setTimeout(() => {
            try {
                const resId = 'ytmResult';
                const cur = this._validateCurrency('ytmCurrency', resId);
                if (!cur) {
                    this._hideLoading(id);
                    return;
                }

                const faceValue = this._getNumericValue('ytmFaceValue', 'Face Value');
                const price = this._getNumericValue('ytmPrice', 'Current Price');
                const couponRate = this._getNumericValue('ytmCouponRate', 'Annual Coupon Rate (%)') / 100;
                const years = this._getNumericValue('ytmYears', 'Years to Maturity');
                const freq = parseFloat(document.getElementById('ytmFreq').value);

                const result = Calculations.calculateYTM(faceValue, price, couponRate, years, freq);
                const container = document.getElementById(resId);

                container.innerHTML = `
                    <strong>Exact YTM:</strong> ${(result.annualYTM * 100).toFixed(4)}%<br>
                    <strong>Current Yield:</strong> ${(result.currentYield * 100).toFixed(4)}%<br>
                    <strong>Total Expected Returns:</strong> ${Currency.format(result.totalCashFlow, cur)}
                `;
                this._showConverter(id, result.totalCashFlow, cur, 'Total Cash Flow');
                this._scrollToResult(resId);
            } catch (e) {
                this._showError('ytmResult', e.message);
            } finally {
                this._hideLoading(id);
            }
        }, 300);
    },

    // --- CONVERTER ---
    handleConversion(id) {
        const container = document.getElementById(id);
        const box = container.querySelector('.converter-box');
        const display = box.querySelector('.convertResult');

        try {
            const amount = parseFloat(box.dataset.amount);
            const from = Currency.extractCode(box.dataset.base);
            const target = Currency.extractCode(box.querySelector('.targetCurrency').value);
            const label = box.dataset.label || 'Amount';

            const converted = Currency.convert(amount, from, target);
            display.innerHTML = `${label}: <strong>${Currency.format(converted, target)}</strong>`;
        } catch (e) {
            display.innerHTML = `<span style="color:var(--danger-text)">${e.message}</span>`;
        }
    },

    // --- HELPERS ---
    _getNumericValue(id, label) {
        const val = document.getElementById(id).value.trim();
        if (val === "" || isNaN(val)) {
            const msg = `Please enter a valid number for ${label}.`;
            this._notify(msg);
            throw new Error(msg);
        }
        return parseFloat(val);
    },

    _validateCurrency(id, resultId) {
        const input = document.getElementById(id);
        const code = Currency.extractCode(input.value.trim());

        if (!input.value.trim()) {
            const msg = "Please select a currency for accurate formatting.";
            this._notify(msg);
            this._showWarning(resultId, msg);
            return null;
        }

        if (!code) {
            const msg = "Invalid currency code. Please use a 3-letter code (e.g. USD).";
            this._notify(msg);
            this._showWarning(resultId, msg);
            return null;
        }
        return code;
    },

    _showWarning(id, msg) {
        document.getElementById(id).innerHTML = `<div class="warning-box" style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; color: #f59e0b; padding: 1rem; border-radius: 8px; margin: 1rem 0; font-size: 0.9rem;">${msg}</div>`;
    },

    _renderTable(data, cur, headers, containerId) {
        this.activeTableData = Array.isArray(data) ? data : data.rows;
        this.currentTableHeaders = headers;
        this.currentTableCurrency = cur;
        this.currentTableContainerId = containerId;
        this.renderedRowCount = 0;

        let html = `<div class="table-wrapper" style="margin-top: 1.5rem; overflow-x: auto;"><table id="result-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody></tbody></table></div>`;
        if (data.isHardCapped) {
            html += `<div class="info-text" style="font-size: 0.8rem; margin-top: 0.5rem; text-align: center; opacity: 0.8;">Note: Results capped at 10,000 periods for performance.</div>`;
        }

        const container = document.getElementById(containerId);
        container.innerHTML += html;
        this.showMore();

        // Add Download Button
        
    },

    showMore() {
        const CHUNK = this.renderedRowCount === 0 ? 50 : 100;
        const container = document.getElementById(this.currentTableContainerId);
        const tbody = container.querySelector('tbody');
        if (!tbody) return;

        const nextChunk = this.activeTableData.slice(this.renderedRowCount, this.renderedRowCount + CHUNK);

        nextChunk.forEach(row => {
            const tr = document.createElement('tr');
            Object.values(row).forEach((val, idx) => {
                const td = document.createElement('td');
                const isAmount = idx > 0 && typeof val === 'number';
                td.textContent = isAmount ? Currency.format(val, this.currentTableCurrency) : val;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        this.renderedRowCount += nextChunk.length;

        let btn = container.querySelector('.see-more-btn');
        if (this.renderedRowCount < this.activeTableData.length) {
            if (!btn) {
                btn = document.createElement('button');
                btn.className = 'calc slim see-more-btn';
                btn.style.marginTop = '1rem';
                btn.onclick = () => this.showMore();
                container.appendChild(btn);
            }
            btn.textContent = `See More (+${this.activeTableData.length - this.renderedRowCount} rows)`;
        } else if (btn) {
            btn.remove();
        }
    },

    downloadResults() {
        if (!this.activeTableData) return;

        const rows = [];
        const _escape = (val) => {
            if (val === null || val === undefined) return '""';
            let str = String(val).replace(/"/g, '""'); // Escape double quotes
            return `"${str}"`; // Wrap in quotes
        };

        // Add Header Section
        rows.push([_escape("COMPLEX CALCULATOR - REPORT")]);
        rows.push([_escape(`Calculator Type: ${this.currentCalculatorId.toUpperCase()}`)]);
        rows.push([""]);

        // Add Inputs Section
        rows.push([_escape("--- INPUTS ---")]);
        const form = document.querySelector(`#${this.currentCalculatorId} form`);
        if (form) {
            form.querySelectorAll('input, select').forEach(input => {
                const label = document.querySelector(`label[for="${input.id}"]`);
                const key = label ? label.textContent : (input.placeholder || input.id);
                if (key && input.value) {
                    rows.push([_escape(key), _escape(input.value)]);
                }
            });
        }
        rows.push([""]);

        // Add Results Section
        rows.push([_escape("--- DETAILED RESULTS ---")]);
        rows.push(this.currentTableHeaders.map(h => _escape(h)));

        this.activeTableData.forEach(row => {
            const rowData = Object.values(row).map((val, idx) => {
                const isAmount = idx > 0 && typeof val === 'number';
                const formatted = isAmount ? Currency.format(val, this.currentTableCurrency) : val;
                return _escape(formatted);
            });
            rows.push(rowData);
        });

        // Generate CSV with BOM (\uFEFF) for Excel compatibility
        const csvContent = "\uFEFF" + rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute("download", `calculator_report_${this.currentCalculatorId}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    _showConverter(id, amt, base, label) {
        const box = document.getElementById(id).querySelector('.converter-box');
        box.classList.remove('hidden');
        box.dataset.amount = amt;
        box.dataset.base = base;
        box.dataset.label = label;
        box.querySelector('.convertResult').textContent = "";
    },

    _showError(id, msg) {
        const container = document.getElementById(id);
        if (!container) return;

        let errorBox = container.querySelector('.error-box');
        if (!errorBox) {
            errorBox = document.createElement('div');
            errorBox.className = 'error-box';
            container.appendChild(errorBox);
        }
        errorBox.textContent = msg;
        this._vibrate(60);
        this._scrollToResult(id);
    },

    _resetCalculator(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.querySelectorAll('input').forEach(i => i.value = '');
        el.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
        el.querySelectorAll('.result').forEach(r => r.textContent = '');
        const table = document.getElementById('monthlyBreakdown');
        if (id === 'loan' && table) table.textContent = '';
        const conv = el.querySelector('.converter-box');
        if (conv) conv.classList.add('hidden');
    },

    _showToast(msg) {
        let toast = document.getElementById('toastAlert');
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "toastAlert";
            toast.style.cssText = "position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.85); color:white; padding:12px 24px; border-radius:20px; font-size:14px; z-index:9999; opacity:0; transition:opacity 0.3s ease; pointer-events:none;";
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = "1";
        setTimeout(() => { toast.style.opacity = "0"; }, 2500);
        if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
    },

    _toggleFrequency() {
        const type = document.getElementById('interestCalcType');
        if (type) {
            const group = document.getElementById('frequencyGroup');
            group.style.display = (type.value === "compound") ? "block" : "none";
        }
    },

    _setupEventListeners() {
        // Global Click handling
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (btn) this._vibrate(40);

            if (btn && btn.classList.contains('btn-calc')) {
                const action = btn.dataset.action;
                if (typeof this[action] === 'function') this[action]();
            }

            if (btn && btn.classList.contains('btn-convert')) {
                const id = btn.dataset.calc;
                this.handleConversion(id);
            }

            if (btn && btn.classList.contains('btn-back')) {
                this.goBack();
            }

            if (btn && btn.classList.contains('btn-home')) {
                const target = btn.dataset.target;
                this.openPage(target);
            }
        });

        // Form Submit interception
        document.addEventListener('submit', (e) => {
            e.preventDefault();
            const calcBtn = e.target.querySelector('.btn-calc');
            if (calcBtn) calcBtn.click();
        });

        document.addEventListener('keypress', (e) => {
            if (e.key === "Enter") {
                const activeForm = document.querySelector(".calculator:not(.hidden) form");
                if (activeForm) activeForm.dispatchEvent(new Event('submit'));
            }
        });

        const typeSelect = document.getElementById('interestCalcType');
        if (typeSelect) {
            typeSelect.addEventListener('change', () => this._toggleFrequency());
        }
    }
};

window.onload = () => UI.init();
window.UI = UI; // Expose for HTML event handlers if needed
