export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = body?.message;
    throw new Error(
      message
        ? Array.isArray(message)
          ? message.join(" ")
          : message
        : "Não foi possível concluir a solicitação. Verifique se a API está em execução.",
    );
  }
  return response.json() as Promise<T>;
}
