export type ClientApiError = {
  code: string;
  message: string;
};

export async function readClientApiError(response: Response): Promise<ClientApiError> {
  try {
    const payload = (await response.json()) as { error?: { code?: string; message?: string } };
    return {
      code: payload.error?.code || "REQUEST_FAILED",
      message: payload.error?.message || "Something went wrong. Please try again."
    };
  } catch {
    return { code: "REQUEST_FAILED", message: "Something went wrong. Please try again." };
  }
}
