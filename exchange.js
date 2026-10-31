export default async (request) => {
const url = new URL(request.url);
const currency = (url.searchParams.get("currency") || "USD").toUpperCase();

const supportedCurrencies = ["USD", "JPY", "ZAR", "CNY", "EUR"];

if (!supportedCurrencies.includes(currency)) {
    return Response.json(
        { error: "Unsupported currency." },
        { status: 400 }
    );
}

const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xmlns:xsd="http://www.w3.org/2001/XMLSchema"
xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetRate xmlns="http://www.mra.mw/">
      <CurrencyCode>${currency}</CurrencyCode>
    </GetRate>
  </soap:Body>
</soap:Envelope>`;

try {
    const response = await fetch(
        "https://eservices.mra.mw/ws/info/exchangeRatesWs.asmx",
        {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": "http://www.mra.mw/GetRate"
            },
            body: soapRequest
        }
    );

    if (!response.ok) {
        throw new Error("MRA service unavailable.");
    }

    const xml = await response.text();

    const rateMatch = xml.match(/<Rate>(.*?)<\/Rate>/);
    const dateMatch = xml.match(/<LastUpdated>(.*?)<\/LastUpdated>/);
    const nameMatch = xml.match(/<CurrencyName>(.*?)<\/CurrencyName>/);

    if (!rateMatch) {
        throw new Error("Exchange rate not found.");
    }

    const rate = Number(rateMatch[1]);

    if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error("Invalid exchange rate.");
    }

    return Response.json({
        currency: currency,
        currencyName: nameMatch ? nameMatch[1] : currency,
        rate: rate,
        lastUpdated: dateMatch ? dateMatch[1] : null,
        source: "Malawi Revenue Authority"
    });

} catch (error) {
    return Response.json(
        { error: error.message || "Could not retrieve exchange rate." },
        { status: 502 }
    );
}

};