const EBA_SMS_ENDPOINT =
  process.env.EBA_SMS_API_URL?.trim() || "https://eba-sms.vercel.app/api/data";

const SMS_REQUEST_TIMEOUT_MS = Number(process.env.EBA_SMS_TIMEOUT_MS ?? 10_000);
const SMS_COOLDOWN_MS = Math.max(
  0,
  Number(process.env.EBA_SMS_COOLDOWN_MS ?? 1_500),
);

export type EbaSmsSendInput = {
  orderNumber: string;
  recipientNumber: string;
  message: string;
};

export type EbaSmsSendResult = {
  attempted: boolean;
  sent: boolean;
  recipientNumber?: string;
  error?: string;
  statusCode?: number;
};

type SmsQueueState = {
  tail: Promise<void>;
  lastCompletedAt: number;
};

const globalSmsQueueKey = "__ebaSmsQueueState";

const getSmsQueueState = (): SmsQueueState => {
  const holder = globalThis as typeof globalThis & {
    [globalSmsQueueKey]?: SmsQueueState;
  };

  if (!holder[globalSmsQueueKey]) {
    holder[globalSmsQueueKey] = {
      tail: Promise.resolve(),
      lastCompletedAt: 0,
    };
  }

  return holder[globalSmsQueueKey]!;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const normalizeEbaSmsRecipientNumber = (
  value: string | null | undefined,
) => {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+63")) return `0${digits.slice(3)}`;
  if (digits.startsWith("63")) return `0${digits.slice(2)}`;
  return digits;
};

const sendEbaSmsNow = async (
  input: EbaSmsSendInput,
): Promise<EbaSmsSendResult> => {
  const recipientNumber = normalizeEbaSmsRecipientNumber(input.recipientNumber);
  if (!recipientNumber) {
    return {
      attempted: false,
      sent: false,
      error: "Customer mobile number is missing.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SMS_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(EBA_SMS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ordernNo: input.orderNumber,
        recipientNumber,
        message: input.message,
        isSent: "false",
      }),
      signal: controller.signal,
    });

    const responseText = await response.text().catch(() => "");
    if (!response.ok) {
      return {
        attempted: true,
        sent: false,
        recipientNumber,
        statusCode: response.status,
        error: responseText.slice(0, 240) || "SMS API request failed.",
      };
    }

    return {
      attempted: true,
      sent: true,
      recipientNumber,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      attempted: true,
      sent: false,
      recipientNumber,
      error: error instanceof Error ? error.message : "SMS request failed.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const sendEbaSmsQueued = async (
  input: EbaSmsSendInput,
): Promise<EbaSmsSendResult> => {
  const queue = getSmsQueueState();
  const recipientNumber = normalizeEbaSmsRecipientNumber(input.recipientNumber);

  const taskPromise = queue.tail
    .catch(() => undefined)
    .then(async () => {
      const now = Date.now();
      const waitMs = Math.max(0, queue.lastCompletedAt + SMS_COOLDOWN_MS - now);
      if (waitMs > 0) {
        await sleep(waitMs);
      }

      const result = await sendEbaSmsNow({
        ...input,
        recipientNumber,
      });

      queue.lastCompletedAt = Date.now();
      return result;
    });

  queue.tail = taskPromise.then(
    () => undefined,
    () => undefined,
  );

  return taskPromise;
};
