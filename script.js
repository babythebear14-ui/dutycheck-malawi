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

function showMessage(element, message) {
    element.innerHTML =
        '<div class="warning">' + message + '</div>';
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
        EXCHANGE_API + "?currency=" + encodeURIComponent(currency)
    );

    if (!response.ok) {
        throw new Error("Could not retrieve the MRA exchange rate.");
    }

    const data = await response.json();

    if (!data.rate || !Number.isFinite(Number(data.rate))) {
        throw new Error("Invalid exchange rate received.");
    }

    return {
        rate: Number(data.rate),
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

    if (
        year < 1900 ||
        year > new Date().getFullYear() ||
        cif <= 0 ||
        port < 0 ||
        cc <= 0
    ) {
        showMessage(result, "Please check your vehicle details.");
        return;
    }

    if (category !== "passenger") {
        showMessage(result, "Commercial vehicle calculations are coming soon.");
        return;
    }

    if (type !== "petrol" && type !== "diesel") {
        showMessage(result, "Petrol and diesel vehicles only for now.");
        return;
    }

    result.innerHTML = "<p>Retrieving MRA exchange rate...</p>";

    try {

        const exchange = await getExchangeRate(currency);
        const rate = exchange.rate;

        const age = new Date().getFullYear() - year;

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

            "<p>Vehicle: " + type.toUpperCase() + "</p>" +
            "<p>Year: " + year + "</p>" +
            "<p>Age: " + ageBand + "</p>" +
            "<p>Engine: " + cc.toLocaleString() + " CC</p>" +

            "<hr>" +

            "<p>Value for duty: " +
            format(valueForDuty) + " " + currency + "</p>" +

            "<p>Exchange rate: 1 " + currency +
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
escapeHTML(exchange.lastUpdated || "Date unavailable") +
"</small>" +

        (exchange.lastUpdated &&
         (Date.now() - new Date(exchange.lastUpdated).getTime()) > 30 * 24 * 60 * 60 * 1000
            ? "<p style='color:#b45309;font-weight:bold;'>⚠️ Warning: This MRA exchange rate is more than 30 days old. Your converted estimate may not reflect the current rate.</p>"
            : "") +

        "<p><small>Provisional calculation only. Tax rates, customs valuation, other applicable charges and official MRA assessment may differ.</small></p>";
    } catch (error) {

        showMessage(
            result,
            "Exchange-rate error: " + escapeHTML(error.message) +
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
        price <= 0 ||
        shipping < 0 ||
        (known && insurance < 0)
    ) {
        showMessage(result, "Please check your product information.");
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
            format(price) + " " + currency + "</p>" +

            "<p>Shipping: " +
            format(shipping) + " " + currency + "</p>" +

            "<p>Insurance: " +
            format(insurance) + " " + currency + "</p>" +

            "<hr>" +

            "<p>Total declared costs: " +
            format(totalValue) + " " + currency + "</p>" +

            "<p>Exchange rate: 1 " + currency +
            " = MK" + format(exchange.rate) + "</p>" +

            "<h2>Converted value: MK" +
            format(totalMWK) + "</h2>" +

            "<small>Exchange rate last updated: " +
            escapeHTML(exchange.lastUpdated) +
            "</small>" +

            "<p><small>Customs duty, excise and import VAT are not yet calculated. This is not the final landed cost.</small></p>";

    } catch (error) {

        showMessage(
            result,
            "Exchange-rate error: " + escapeHTML(error.message) +
            " Please try again later."
        );
    }

});

// Prevent HTML characters from being interpreted as code
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

});
