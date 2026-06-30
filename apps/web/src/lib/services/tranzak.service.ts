const IS_SANDBOX = process.env.TRANZAK_ENV !== 'production';
const BASE_URL = IS_SANDBOX
  ? 'https://sandbox.dsapi.tranzak.me'
  : 'https://dsapi.tranzak.me';

const APP_ID = process.env.TRANZAK_APP_ID!;
const APP_KEY = process.env.TRANZAK_APP_KEY!;

async function getToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: APP_ID, appKey: APP_KEY }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`TranZak auth failed: ${JSON.stringify(json)}`);
  return json.data.token;
}

export async function createPaymentRequest(params: {
  amount: number;
  currencyCode: string;
  description: string;
  mchTransactionRef: string;
  returnUrl: string;
}) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/xp021/v1/request/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`TranZak create request failed: ${JSON.stringify(json)}`);
  return json.data as {
    requestId: string;
    amount: number;
    currencyCode: string;
    status: string;
    links: { paymentAuthUrl: string };
  };
}

export async function getPaymentStatus(requestId: string) {
  const token = await getToken();
  const res = await fetch(
    `${BASE_URL}/xp021/v1/request/details?requestId=${requestId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = await res.json();
  if (!json.success) throw new Error(`TranZak status check failed: ${JSON.stringify(json)}`);
  return json.data as {
    requestId: string;
    status: string;
    amount: number;
    currencyCode: string;
    transactionId?: string;
    transactionTime?: string;
    fee?: number;
  };
}
