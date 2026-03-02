// src/lib/smartstore/client.ts
import crypto from 'crypto';

const CLIENT_ID = process.env.NAVER_COMMERCE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.NAVER_COMMERCE_CLIENT_SECRET || '';
const API_BASE = 'https://api.commerce.naver.com/external';

function generateToken(): { timestamp: number; signature: string } {
  const timestamp = Date.now();
  const message = `${CLIENT_ID}_${timestamp}`;
  const signature = crypto.createHmac('sha256', CLIENT_SECRET).update(message).digest('base64');
  return { timestamp, signature };
}

function getHeaders(): Record<string, string> {
  const { timestamp, signature } = generateToken();
  return {
    'Content-Type': 'application/json',
    'client-id': CLIENT_ID,
    timestamp: String(timestamp),
    'client-secret-sign': signature,
    'grant-type': 'SELF',
  };
}

export async function createSmartStoreOrder(params: {
  productOrderId?: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientZipcode: string;
  productName: string;
  quantity?: number;
}): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  try {
    if (params.productOrderId) {
      const response = await fetch(`${API_BASE}/v1/pay-order/seller/product-orders/confirm`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          productOrderIds: [params.productOrderId],
        }),
      });

      const data = (await response.json()) as { message?: string } & Record<string, unknown>;
      if (!response.ok) {
        return { success: false, error: data.message || '발주 확인 실패' };
      }
      return { success: true, data };
    }

    return {
      success: true,
      data: {
        note: '스마트스토어 주문번호 없음. 수동 처리 필요.',
        recipientName: params.recipientName,
        recipientAddress: params.recipientAddress,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '스마트스토어 API 오류',
    };
  }
}

export async function registerShipping(params: {
  productOrderId: string;
  deliveryCompanyCode: string;
  trackingNumber: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/v1/pay-order/seller/product-orders/dispatch`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        dispatchProductOrders: [
          {
            productOrderId: params.productOrderId,
            deliveryMethod: 'DELIVERY',
            deliveryCompanyCode: params.deliveryCompanyCode,
            trackingNumber: params.trackingNumber,
          },
        ],
      }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { message?: string };
      return { success: false, error: data.message || '발송 처리 실패' };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '발송 처리 오류',
    };
  }
}

export const DELIVERY_COMPANIES = [
  { code: 'CJGLS', name: 'CJ대한통운' },
  { code: 'LOTTE', name: '롯데택배' },
  { code: 'HANJIN', name: '한진택배' },
  { code: 'KGB', name: '로젠택배' },
  { code: 'EPOST', name: '우체국택배' },
  { code: 'DAESIN', name: '대신택배' },
  { code: 'ILYANG', name: '일양로지스' },
  { code: 'KDEXP', name: '경동택배' },
];
