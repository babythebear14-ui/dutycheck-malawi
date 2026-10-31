document.addEventListener("DOMContentLoaded", function () {

const $ = id => document.getElementById(id);

function show(id) {
    $(id).classList.remove("hidden");
}

function hide(id) {
    $(id).classList.add("hidden");
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

function showMessage(element, message) {
    element.innerHTML = '<div class="warning">' + message + '</div>';
}

// Vehicle calculator
$("vehicleForm").addEventListener("submit", function (event) {
event.preventDefault();

const year = Number($("vehicleYear").value);
const cif = Number($("vehicleCif").value);
const currency = $("vehicleCurrency").value;
const port = Number($("vehiclePort").value);
const cc = Number($("vehicleEngine").value);
const category = $("vehicleCategory").value;
const type = $("vehicleType").value;

const result = $("vehicleResult");

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
    showMessage(result, "This calculation currently supports petrol and diesel cars only.");
    return;
}

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

const excise = (valueForDuty + duty) * (exciseRate / 100);

const vat = (valueForDuty + duty + excise) * 0.175;

const fixedCharge = currency === "MWK" ? 35000 : 0;

const total = duty + excise + vat + fixedCharge;

const format = number =>
    number.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

result.innerHTML =
    "<h3>Estimated import taxes</h3>" +
    "<p>Vehicle: " + type.toUpperCase() + "</p>" +
    "<p>Year: " + year + "</p>" +
    "<p>Age: " + ageBand + "</p>" +
    "<p>Engine: " + cc.toLocaleString() + " CC</p>" +
    "<hr>" +
    "<p>Value for duty: " + format(valueForDuty) + " " + currency + "</p>" +
    "<p>Import duty (25%): " + format(duty) + " " + currency + "</p>" +
    "<p>Excise (" + exciseRate + "%): " + format(excise) + " " + currency + "</p>" +
    "<p>VAT (17.5%): " + format(vat) + " " + currency + "</p>" +
    (currency === "MWK"
        ? "<p>Fixed charge: MK" + format(fixedCharge) + "</p>"
        : "<p>Fixed charge: Not included; calculated separately in MWK.</p>") +
    "<hr>" +
    "<h2>Estimated total: " + format(total) + " " + currency + "</h2>" +
    "<small>Estimate only. Exchange-rate conversion and official MRA assessment are not included.</small>";

});

// Goods calculator
$("goodsForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const name = $("productName").value.trim();
    const origin = $("productOrigin").value.trim();
    const price = Number($("goodsPrice").value);
    const shipping = Number($("goodsShipping").value);
    const currency = $("goodsCurrency").value;
    const known = $("insuranceChoice").value === "known";
    const insurance = known ? Number($("goodsInsurance").value) : null;

    if (
        !name ||
        !origin ||
        price <= 0 ||
        shipping < 0 ||
        (known && (insurance === null || insurance < 0))
    ) {
        showMessage($("goodsResult"), "Please check your product information.");
        return;
    }

    showMessage(
        $("goodsResult"),
        "<h3>Product information received</h3>" +
        "<p>Product: " + escapeHTML(name) + "</p>" +
        "<p>Origin: " + escapeHTML(origin) + "</p>" +
        "<p>Purchase price: " + price.toLocaleString() + " " + currency + "</p>" +
        "<p>Shipping: " + shipping.toLocaleString() + " " + currency + "</p>" +
        "<p>Insurance: " +
        (known
            ? insurance.toLocaleString() + " " + currency
            : "Not provided") +
        "</p>" +
        "<br><strong>Tariff calculation is not yet connected.</strong>"
    );
});

// Prevent HTML characters in product details from being interpreted as code
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