/**
 * Calculation Logic for Complex Calculator
 * All functions return structured data objects for the UI to render.
 */

window.Calculations = {

    // PROFIT & MARGIN
    calculateProfit(cost, marginPercent) {
        if (cost <= 0) throw new Error("Enter valid cost price");
        if (marginPercent >= 100) throw new Error("Margin cannot be 100% or more");
        
        const sellPrice = cost / (1 - marginPercent / 100);
        const profit = sellPrice - cost;
        
        return { sellPrice, profit, marginPercent };
    },

    // INTEREST
    calculateInterest(P, r, t, n, type) {
        const results = [];
        let totalInterest = 0;
        let finalAmount = 0;
        const periods = type === "simple" ? t : n * t;

        if (type === "simple") {
            totalInterest = P * r * t;
            finalAmount = P + totalInterest;
            for (let i = 1; i <= t; i++) {
                results.push({ period: `Year ${i}`, interest: P * r, amount: P + r * P * i });
            }
        } else {
            let amount = P;
            for (let i = 1; i <= periods; i++) {
                let interest = amount * (r / n);
                amount += interest;
                results.push({ period: i, interest: interest, amount: amount });
            }
            finalAmount = amount;
            totalInterest = finalAmount - P;
        }

        return { 
            totalInterest, 
            finalAmount, 
            table: this._capTable(results) 
        };
    },

    // LOAN / EMI
    calculateLoan(P, annualRate, years, freq, extra, mode) {
        if (P <= 0 || annualRate < 0 || years <= 0) throw new Error("Enter valid loan details");
        
        const r = annualRate / freq;
        const n = years * freq;
        const results = [];
        let payment, totalInterest = 0, balance = P;

        if (mode === "interestOnly") {
            payment = P * r + extra;
            totalInterest = (P * r) * n; // Total interest paid over time
            for (let i = 1; i <= n; i++) {
                results.push({ period: i, principal: 0, interest: P * r, balance: P });
            }
        } else {
            if (r === 0) payment = P / n + extra;
            else payment = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) + extra;

            for (let i = 1; i <= n && balance > 0; i++) {
                let interest = balance * r;
                let principalPayment = Math.min(payment - interest, balance);
                balance -= principalPayment;
                totalInterest += interest;
                results.push({ 
                    period: i, 
                    principal: principalPayment, 
                    interest: interest, 
                    balance: Math.max(0, balance) 
                });
            }
        }

        return { 
            payment, 
            totalInterest, 
            totalPayable: P + totalInterest, 
            table: this._capTable(results) 
        };
    },

    // FUTURE VALUE / PRESENT VALUE
    calculateFVPV(amt, r, t, n, op) {
        if (amt <= 0 || t <= 0) throw new Error("Enter valid amount and time");
        
        const results = [];
        let amount = amt;
        let totalInterest = 0;
        const periods = n * t;

        if (op === "fv") {
            for (let i = 1; i <= periods; i++) {
                let interest = amount * (r / n);
                amount += interest;
                totalInterest += interest;
                results.push({ period: i, interest, amount });
            }
        } else {
            for (let i = 1; i <= periods; i++) {
                let interestSaved = amount * (r / n);
                amount = amount / (1 + r / n);
                totalInterest += interestSaved;
                results.push({ period: i, interest: interestSaved, amount });
            }
        }

        return { 
            amount, 
            totalInterest, 
            opLabel: op === "fv" ? "Future Value" : "Present Value",
            interestLabel: op === "fv" ? "Interest Added" : "Interest Reduced",
            table: this._capTable(results) 
        };
    },

    // SHOPPING
    calculateShopping(price, d1, d2, tax) {
        if (price <= 0) throw new Error("Enter valid price");
        
        const afterD1 = price * (1 - d1 / 100);
        const afterD2 = afterD1 * (1 - d2 / 100);
        const taxAmt = afterD2 * (tax / 100);
        const final = afterD2 + taxAmt;
        
        return { afterD2, taxAmt, final };
    },

    // YTM (Yield to Maturity)
    calculateYTM(faceValue, price, couponRate, years, freq) {
        if (faceValue <= 0 || price <= 0 || years <= 0) throw new Error("Enter valid positive numbers");

        const n = Math.floor(years * freq);
        const C = (faceValue * couponRate) / freq;

        const presentValue = (r) => {
            if (r === 0) return (C * n) + faceValue;
            return C * ((1 - Math.pow(1 + r, -n)) / r) + faceValue * Math.pow(1 + r, -n);
        };

        let low = -0.9999;
        let high = 10.0;
        let mid = 0;
        let diff = 1;
        let iterations = 0;

        while (Math.abs(diff) > 0.0000001 && iterations < 1000) {
            mid = (low + high) / 2;
            diff = presentValue(mid) - price;
            if (diff > 0) low = mid;
            else high = mid;
            iterations++;
        }

        const annualYTM = mid * freq;
        const currentYield = (faceValue * couponRate) / price;
        const totalCashFlow = (C * n) + faceValue;

        return { annualYTM, currentYield, totalCashFlow };
    },

    // INTERNAL HELPER: Cap tables at 10,000 rows for safety
    _capTable(results) {
        const HARD_LIMIT = 10000;
        if (results.length <= HARD_LIMIT) return results;

        return {
            isHardCapped: true,
            originalLength: results.length,
            rows: results.slice(0, HARD_LIMIT)
        };
    }
};
