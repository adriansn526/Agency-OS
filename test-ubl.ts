import { parseEFacturaZip } from './apps/web/lib/accounting/ubl-parser';
import AdmZip from 'adm-zip';

const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:ID>FCT-999</cbc:ID>
    <cbc:IssueDate>2023-10-15</cbc:IssueDate>
    <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
    
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyName>
                <cbc:Name>Furnizor Test SRL</cbc:Name>
            </cac:PartyName>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>RO12345678</cbc:CompanyID>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="EUR">21.00</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="EUR">100.00</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="EUR">21.00</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:Percent>21</cbc:Percent>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>

    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="EUR">120.00</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="EUR">100.00</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="EUR">121.00</cbc:TaxInclusiveAmount>
        <cbc:AllowanceTotalAmount currencyID="EUR">20.00</cbc:AllowanceTotalAmount>
        <cbc:PayableAmount currencyID="EUR">121.00</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
</Invoice>`;

const zip = new AdmZip();
zip.addFile("factura.xml", Buffer.from(xmlContent, "utf8"));
const zipBuffer = zip.toBuffer();

try {
    const result = parseEFacturaZip(zipBuffer);
    console.log("TEST REUȘIT! Rezultat extragere:");
    console.log(JSON.stringify(result, null, 2));
} catch (e) {
    console.error("TEST EȘUAT!", e);
}
