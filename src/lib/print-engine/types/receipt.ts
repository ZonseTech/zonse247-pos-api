/**
 * Subset of terminal receipt-display settings needed to format a receipt.
 */
export interface ReceiptDisplaySettings {
    storeName: string;
    storePhone: string;
    storeAddress: string;
    storeWebsite: string;
    taxTitle: string;
    businessTaxId: string;
    logoUrl: string;
    logoData?: string; // Base64 encoded monochrome logo for thermal printing
    receiptHeader: string;
    showPhoneOnReceipt: boolean;
    showAddressOnReceipt: boolean;
    showTaxOnReceipt: boolean;
    showWebsiteOnReceipt: boolean;
    showStoreLogo: boolean;
    showListPrice: boolean;
    showRateInReceipt: boolean;
    showTotalMoneySaved: boolean;
    showCashierName: boolean;
    showCustomerPhone: boolean;
    showCustomerAddress: boolean;
    thankYouNote: string;
    useAppLanguage: boolean;
    showTotalItemCount: boolean;
    showChangeReturn: boolean;
    showPaymentDetails: boolean;
    showPoweredBy: boolean;
    orderItemsBy: 'orderAdded' | 'name' | 'category';
    messageTemplate: string;
    whatsappShareApp: 'whatsapp' | 'whatsappBusiness';
}
