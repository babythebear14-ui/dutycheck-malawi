document.addEventListener("DOMContentLoaded", function () {

const $ = id => document.getElementById(id);

const EXCHANGE_API = "/.netlify/functions/exchange";

function show(id) {
    $(id).classList.remove("hidden");
}

function hide(id) {
    $(id).classList.add("hidden");
}

function format(number) {
    return Number(number).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char];
    });
}

function showMessage(element, message) {
    element.innerHTML =
        '<div class="warning">' + message + '</div>';
}

function getExchangeWarning(exchange) {

    if (exchange.lastUpdated === "Not required") {
        return "";
    }

    if (!exchange.lastUpdated ||
        exchange.lastUpdated === "Date unavailable") {
        return "<p style='color:#b45309;font-weight:bold;'>⚠️ Exchange-rate update date unavailable. Verify the rate before relying on this estimate.</p>";
    }

    const updatedTime = new Date(exchange.lastUpdated).getTime();

    if (!Number.isFinite(updatedTime)) {
        return "<p style='color:#b45309;font-weight:bold;'>⚠️ Exchange-rate update date could not be verified.</p>";
    }

    const age = Date.now() - updatedTime;

    if (age > 30 * 24 * 60 * 60 * 1000) {
        return "<p style='color:#b45309;font-weight:bold;'>⚠️ Warning: This MRA exchange rate is more than 30 days old. Your converted estimate may not reflect the current rate.</p>";
    }

    if (age < 0) {
        return "<p style='color:#b45309;font-weight:bold;'>⚠️ Exchange-rate date is in the future. Please verify it.</p>";
    }

    return "";
}

// Get exchange rate from MRA through Netlify
async function getExchangeRate(currency) {

    if (currency === "MWK") {
        return {
            rate: 1,
            lastUpdated: "Not required"
        };
    }

    const response = await fetch(
        EXCHANGE_API + "?currency=" +
        encodeURIComponent(currency)
    );

    if (!response.ok) {
        throw new Error("Could not retrieve the MRA exchange rate.");
    }

    const data = await response.json();

    const rate = Number(data.rate);

    if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error("Invalid exchange rate received.");
    }

    return {
        rate: rate,
        lastUpdated: data.lastUpdated || "Date unavailable"
    };
}

// Start button
$("startBtn").addEventListener("click", function () {
    hide("splash");
    show("app");
    show("infoBtn");
});

// Category buttons
document.querySelectorAll(".category").forEach(function (button) {
    button.addEventListener("click", function () {
        hide("home");
        show(button.dataset.page);
    });
});

// Back buttons
document.querySelectorAll(".back").forEach(function (button) {
    button.addEventListener("click", function () {

        document.querySelectorAll(".page").forEach(function (page) {
            page.classList.add("hidden");
        });

        show("home");
    });
});

// Information button
$("infoBtn").addEventListener("click", function () {
    $("infoBox").classList.toggle("hidden");
});

// Insurance selection
$("insuranceChoice").addEventListener("change", function () {
    $("insuranceBox").classList.toggle(
        "hidden",
        this.value !== "known"
    );
});

// Vehicle calculator
$("vehicleForm").addEventListener("submit", async function (event) {

    event.preventDefault();

    const result = $("vehicleResult");

    const year = Number($("vehicleYear").value);
    const cif = Number($("vehicleCif").value);
    const currency = $("vehicleCurrency").value;
    const port = Number($("vehiclePort").value);
    const cc = Number($("vehicleEngine").value);
    const category = $("vehicleCategory").value;
    const type = $("vehicleType").value;

    const currentYear = new Date().getFullYear();

    if (
        !Number.isFinite(year) ||
        !Number.isFinite(cif) ||
        !Number.isFinite(port) ||
        !Number.isFinite(cc) ||
        year < 1900 ||
        year > currentYear ||
        cif <= 0 ||
        port < 0 ||
        cc <= 0
    ) {
        showMessage(result, "Please enter valid vehicle details and numbers.");
        return;
    }

    if (category !== "passenger") {
        showMessage(result, "Commercial vehicle calculations are coming soon.");
        return;
    }

    if (type !== "petrol" && type !== "diesel") {
        showMessage(result, "Hybrid and electric vehicle calculations are not yet supported.");
        return;
    }

    result.innerHTML = "<p>Retrieving MRA exchange rate...</p>";

    try {

        const exchange = await getExchangeRate(currency);
        const rate = exchange.rate;

        const age = currentYear - year;

        let ageBand;

        if (age <= 8) {
            ageBand = "8 years or less";
        } else if (age <= 12) {
            ageBand = "9 to 12 years";
        } else {
            ageBand = "13 years or older";
        }

        let exciseRate = 0;

        if (cc < 1500) {

            if (age <= 8) exciseRate = 0;
            else if (age <= 12) exciseRate = 30;
            else exciseRate = 60;

        } else if (cc < 2000) {

            if (age <= 8) exciseRate = 15;
            else if (age <= 12) exciseRate = 45;
            else exciseRate = 75;

        } else if (cc < 2500) {

            if (age <= 8) exciseRate = 35;
            else if (age <= 12) exciseRate = 60;
            else exciseRate = 90;

        } else if (cc <= 3000) {

            if (age <= 8) exciseRate = 45;
            else if (age <= 12) exciseRate = 70;
            else exciseRate = 100;

        } else {

            if (age <= 8) exciseRate = 55;
            else if (age <= 12) exciseRate = 80;
            else exciseRate = 100;
        }

        const valueForDuty = cif + port;

        const duty = valueForDuty * 0.25;

        const excise =
            (valueForDuty + duty) * (exciseRate / 100);

        const vat =
            (valueForDuty + duty + excise) * 0.175;

        const total = duty + excise + vat;

        const mwkValue = valueForDuty * rate;
        const mwkDuty = duty * rate;
        const mwkExcise = excise * rate;
        const mwkVat = vat * rate;
        const mwkTotal = total * rate;

        result.innerHTML =

            "<h3>Provisional vehicle estimate</h3>" +

            "<p>Vehicle: " + escapeHTML(type.toUpperCase()) + "</p>" +

            "<p>Year: " + year + "</p>" +

            "<p>Age: " + ageBand + "</p>" +

            "<p>Engine: " + cc.toLocaleString() + " CC</p>" +

            "<hr>" +

            "<p>Value for duty: " +
            format(valueForDuty) + " " + escapeHTML(currency) + "</p>" +

            "<p>Exchange rate: 1 " + escapeHTML(currency) +
            " = MK" + format(rate) + "</p>" +

            "<p>Value in MWK: MK" +
            format(mwkValue) + "</p>" +

            "<hr>" +

            "<p>Estimated import duty (25%): MK" +
            format(mwkDuty) + "</p>" +

            "<p>Estimated excise (" + exciseRate +
            "%): MK" + format(mwkExcise) + "</p>" +

            "<p>Estimated VAT (17.5%): MK" +
            format(mwkVat) + "</p>" +

            "<hr>" +

            "<h2>Estimated taxes (excluding other charges): MK" +
            format(mwkTotal) + "</h2>" +

            "<small>Exchange rate last updated: " +
            escapeHTML(exchange.lastUpdated) +
            "</small>" +

            getExchangeWarning(exchange) +

            "<p><small>Provisional calculation only. Tax rates, customs valuation, tariff classification, other applicable charges and official MRA assessment may differ.</small></p>";

    } catch (error) {

        showMessage(
            result,
            "Exchange-rate error: " +
            escapeHTML(error.message) +
            " Please try again later."
        );
    }

});

// Goods calculator
$("goodsForm").addEventListener("submit", async function (event) {

    event.preventDefault();

    const result = $("goodsResult");

    const name = $("productName").value.trim();
    const origin = $("productOrigin").value.trim();
    const price = Number($("goodsPrice").value);
    const shipping = Number($("goodsShipping").value);
    const currency = $("goodsCurrency").value;

    const known = $("insuranceChoice").value === "known";

    const insurance = known
        ? Number($("goodsInsurance").value)
        : 0;

    if (
        !name ||
        !origin ||
        !Number.isFinite(price) ||
        !Number.isFinite(shipping) ||
        !Number.isFinite(insurance) ||
        price <= 0 ||
        shipping < 0 ||
        insurance < 0
    ) {
        showMessage(result, "Please check your product information and enter valid amounts.");
        return;
    }

    result.innerHTML = "<p>Retrieving MRA exchange rate...</p>";

    try {

        const exchange = await getExchangeRate(currency);

        const totalValue = price + shipping + insurance;

        const totalMWK = totalValue * exchange.rate;

        result.innerHTML =

            "<h3>Goods import estimate</h3>" +

            "<p>Product: " + escapeHTML(name) + "</p>" +

            "<p>Origin: " + escapeHTML(origin) + "</p>" +

            "<p>Purchase price: " +
            format(price) + " " + escapeHTML(currency) + "</p>" +

            "<p>Shipping: " +
            format(shipping) + " " + escapeHTML(currency) + "</p>" +

            "<p>Insurance: " +
            format(insurance) + " " + escapeHTML(currency) + "</p>" +

            "<hr>" +

            "<p>Total declared costs: " +
            format(totalValue) + " " + escapeHTML(currency) + "</p>" +

            "<p>Exchange rate: 1 " + escapeHTML(currency) +
            " = MK" + format(exchange.rate) + "</p>" +

            "<h2>Converted value: MK" +
            format(totalMWK) + "</h2>" +

            "<small>Exchange rate last updated: " +
            escapeHTML(exchange.lastUpdated) +
            "</small>" +

            getExchangeWarning(exchange) +

            "<p><small>Customs duty, excise and import VAT are not yet calculated. This is not the final landed cost.</small></p>";

    } catch (error) {

        showMessage(
            result,
            "Exchange-rate error: " +
            escapeHTML(error.message) +
            " Please try again later."
        );
    }

});

});
