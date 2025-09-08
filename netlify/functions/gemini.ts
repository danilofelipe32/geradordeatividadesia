// Esta função foi desativada e não é mais utilizada pela aplicação.
// O conteúdo foi substituído para evitar falhas de build na Netlify
// após a remoção da dependência @google/genai.

// Define a assinatura do manipulador inline, pois não podemos importar de @netlify/functions
interface HandlerEvent {
  httpMethod: string;
  body: string | null;
}
interface HandlerResponse {
  statusCode: number;
  headers?: { [key: string]: string };
  body: string;
}

const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  return {
    statusCode: 410, // 410 Gone
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: 'This function is no longer in use and has been deactivated.' })
  };
};

export { handler };
