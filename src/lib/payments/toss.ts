// src/lib/payments/toss.ts

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || '';
const TOSS_API_URL = 'https://api.tosspayments.com/v1';

function getAuthHeader(): string {
  const encoded = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64');
  return `Basic ${encoded}`;
}

export async function confirmPayment(
  paymentKey: string,
  orderId: string,
  amount: number
): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const response = await fetch(`${TOSS_API_URL}/payments/confirm`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const data = (await response.json()) as { message?: string } & Record<string, unknown>;

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `결제 승인 실패 (${response.status})`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '결제 승인 중 오류',
    };
  }
}

export async function cancelPayment(
  paymentKey: string,
  cancelReason: string,
  cancelAmount?: number
): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const body: Record<string, unknown> = { cancelReason };
    if (cancelAmount !== undefined) {
      body.cancelAmount = cancelAmount;
    }

    const response = await fetch(`${TOSS_API_URL}/payments/${paymentKey}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as { message?: string } & Record<string, unknown>;

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `결제 취소 실패 (${response.status})`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '결제 취소 중 오류',
    };
  }
}

export async function getPayment(
  paymentKey: string
): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const response = await fetch(`${TOSS_API_URL}/payments/${paymentKey}`, {
      headers: { Authorization: getAuthHeader() },
    });

    const data = (await response.json()) as { message?: string } & Record<string, unknown>;

    if (!response.ok) {
      return { success: false, error: data.message };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '결제 조회 오류',
    };
  }
}

export const ROOM_PRICING: Record<
  string,
  { price: number; label: string; entryType: 'AD' | 'VIDEO' }
> = {
  PLATFORM: { price: 0, label: '플랫폼 경품 (무료)', entryType: 'AD' },
  SELF_DELIVERY: { price: 0, label: '직접 배송 (무료)', entryType: 'AD' },
  CONSIGNMENT: { price: 5000, label: '위탁 배송 (5,000원)', entryType: 'AD' },
  SPONSORED: { price: 30000, label: '협찬 제품 (30,000원)', entryType: 'VIDEO' },
};
