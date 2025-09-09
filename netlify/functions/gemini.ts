import { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  if (!process.env.API_KEY) {
      return {
          statusCode: 500,
          body: JSON.stringify({ error: 'A chave da API não está configurada no servidor.' })
      };
  }

  try {
    const { formData, ragContext } = JSON.parse(event.body || '{}');

    if (!formData) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Dados do formulário ausentes na requisição.' })
        };
    }
    
    const hasRagContext = ragContext && ragContext.length > 0;

    const systemInstruction = "Você é um designer instrucional sênior e especialista em pedagogia, com profundo conhecimento do currículo brasileiro (BNCC e BNCC Computação). Sua missão é criar planos de aula excepcionalmente completos e detalhados, prontos para serem aplicados em sala de aula. Se um contexto de documentos (RAG) for fornecido, suas respostas devem ser estritamente baseadas nele.";
    
    const bnccInstruction = hasRagContext
        ? "Após uma análise cuidadosa, extraia DIRETAMENTE E EXCLUSIVAMENTE do contexto (documentos de apoio) o código e a descrição da competência da BNCC mais relevante para a atividade. Se nenhuma competência aplicável for encontrada no contexto, retorne a string 'Não identificada no material de apoio'."
        : "O código e a descrição completa da principal competência da BNCC geral abordada.";

    const bnccComputacaoInstruction = hasRagContext
        ? "Após uma análise cuidadosa, extraia DIRETAMENTE E EXCLUSIVAMENTE do contexto (documentos de apoio) o código e a descrição da competência da BNCC Computação mais relevante para a atividade. Se nenhuma competência aplicável for encontrada no contexto, retorne a string 'Não identificada no material de apoio'."
        : "O código e a descrição completa da principal competência da BNCC Computação.";

    const userPrompt = `
      Gere ${formData.quantity} ${formData.quantity > 1 ? 'planos de aula detalhados' : 'plano de aula detalhado'} para a disciplina de "${formData.subject}" sobre o tópico "${formData.topic}".
      As atividades são destinadas a uma turma de "${formData.grade}" e devem ter um nível de dificuldade "${formData.level}".
      Cada plano de aula deve obrigatoriamente integrar o pilar do pensamento computacional: "${formData.pillar}".
    `;
    
    const finalPrompt = hasRagContext
    ? `Use estritamente as informações do contexto abaixo como fonte primária para criar as atividades:\n\n### CONTEXTO DOS DOCUMENTOS ###\n${ragContext}\n### FIM DO CONTEXTO ###\n\nCom base no contexto acima, elabore a seguinte solicitação:\n${userPrompt}`
    : userPrompt;
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: finalPrompt,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    atividades: {
                        type: Type.ARRAY,
                        description: `Uma lista de ${formData.quantity} atividades.`,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                titulo: { 
                                    type: Type.STRING, 
                                    description: 'Um título criativo e chamativo para a atividade.' 
                                },
                                descricao: { 
                                    type: Type.STRING, 
                                    description: "Descrição MUITO detalhada, formatada em markdown com títulos claros. DEVE OBRIGATORIAMENTE conter as seguintes seções com estes títulos exatos: '### Objetivos da Atividade', '### Passo a Passo para o Professor', '### Instruções para os Alunos', e '### Sugestão de Avaliação'. O passo a passo deve ser uma lista numerada e clara." 
                                },
                                competenciaBNCC: { 
                                    type: Type.STRING, 
                                    description: bnccInstruction
                                },
                                competenciaBNCCComputacao: { 
                                    type: Type.STRING, 
                                    description: bnccComputacaoInstruction
                                },
                                duracaoEstimada: { 
                                    type: Type.INTEGER, 
                                    description: 'O tempo estimado em minutos para a conclusão da atividade.' 
                                },
                                recursosNecessarios: { 
                                    type: Type.ARRAY, 
                                    items: { type: Type.STRING }, 
                                    description: 'Uma lista detalhada de todos os recursos necessários.' 
                                }
                            },
                            required: ["titulo", "descricao", "competenciaBNCC", "competenciaBNCCComputacao", "duracaoEstimada", "recursosNecessarios"]
                        }
                    }
                },
                required: ["atividades"]
            }
        }
    });

    const responseText = response.text;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: responseText,
    };

  } catch (error) {
    console.error("Error in Gemini function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Falha ao gerar atividades.', details: errorMessage }),
    };
  }
};

export { handler };