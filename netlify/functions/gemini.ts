// NOTA: Para implantar esta função, o pacote @google/genai
// deve ser adicionado como uma dependência em seu site Netlify.

import { GoogleGenAI, Type } from "@google/genai";
import type { ActivityFormData } from '../../types';

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

// O mesmo esquema de resposta que estava no geminiService.ts original
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        atividades: {
            type: Type.ARRAY,
            description: "Lista de planos de aula detalhados.",
            items: {
                type: Type.OBJECT,
                properties: {
                    titulo: {
                        type: Type.STRING,
                        description: "Um título criativo e chamativo que resuma a essência da atividade.",
                    },
                    descricao: {
                        type: Type.STRING,
                        description: "Descrição detalhada e contextualizada, incluindo objetivos, contextualização, passo a passo para professor e alunos, e sugestão de avaliação.",
                    },
                    competenciaBNCC: {
                        type: Type.STRING,
                        description: "O código e a descrição completa da principal competência da BNCC geral abordada. Ex: (EF01LP01) Reconhecer que textos são lidos e escritos da esquerda para a direita e de cima para baixo da página.",
                    },
                    competenciaBNCCComputacao: {
                        type: Type.STRING,
                        description: "O código e a descrição completa da principal competência da BNCC Computação. Ex: (EF01CO01) Identificar e nomear os principais componentes de um computador e suas funções.",
                    },
                    duracaoEstimada: {
                        type: Type.INTEGER,
                        description: "O tempo estimado em minutos para a conclusão da atividade.",
                    },
                    recursosNecessarios: {
                        type: Type.ARRAY,
                        description: "Uma lista detalhada de todos os recursos necessários, incluindo digitais e físicos.",
                        items: { type: Type.STRING },
                    },
                },
                required: ['titulo', 'descricao', 'competenciaBNCC', 'competenciaBNCCComputacao', 'duracaoEstimada', 'recursosNecessarios'],
            },
        },
    },
    required: ['atividades'],
};

const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  if (!process.env.API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'A variável de ambiente API_KEY não está configurada.' })
    };
  }
  
  try {
    const { formData, ragContext } = JSON.parse(event.body || '{}') as { formData: ActivityFormData; ragContext: string };
    
    if (!formData) {
       return { statusCode: 400, body: JSON.stringify({ error: 'O objeto formData é obrigatório.' }) };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = "Você é um designer instrucional sênior e especialista em pedagogia, com profundo conhecimento do currículo brasileiro (BNCC e BNCC Computação). Sua missão é criar planos de aula completos e detalhados, não apenas esboços de atividades. Cada atividade deve ser criativa, engajadora e eficaz, integrando perfeitamente a disciplina solicitada com o pilar do pensamento computacional. Para cada atividade, forneça um contexto rico, objetivos de aprendizagem claros, instruções passo a passo para o professor e para os alunos, e sugestões de avaliação. Se um contexto de documentos (RAG) for fornecido, suas respostas devem ser estritamente baseadas nele.";
    
    const userPrompt = `
      Gere ${formData.quantity} ${formData.quantity > 1 ? 'planos de aula detalhados' : 'plano de aula detalhado'} para a disciplina de "${formData.subject}" sobre o tópico "${formData.topic}".
      As atividades são destinadas a uma turma de "${formData.grade}" e devem ter um nível de dificuldade "${formData.level}".
      Cada plano de aula deve obrigatoriamente integrar o pilar do pensamento computacional: "${formData.pillar}".
    `;
    
    const contextPrompt = ragContext
    ? `Use estritamente as informações do contexto abaixo como fonte primária para criar as atividades. Não invente informações que não estejam nos documentos fornecidos.\n\n### CONTEXTO DOS DOCUMENTOS ###\n${ragContext}\n### FIM DO CONTEXTO ###\n\nCom base no contexto acima, elabore a seguinte solicitação:\n${userPrompt}`
    : userPrompt;
    
    const response = await ai.models.generateContent({
       model: "gemini-2.5-flash",
       contents: contextPrompt,
       config: {
         systemInstruction: systemInstruction,
         responseMimeType: "application/json",
         responseSchema: responseSchema,
       },
    });

    const jsonStr = response.text;
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: jsonStr,
    };

  } catch (error) {
    console.error("Erro na função Netlify:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Ocorreu um erro interno no servidor.' }),
    };
  }
};

export { handler };
