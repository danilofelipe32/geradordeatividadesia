import { GoogleGenAI, Type } from "@google/genai";
import { AiGeneratedActivity, ActivityFormData, StoredFile } from '../types';
import { parseFile, dataUrlToFile } from './fileParserService';

// Limite de caracteres para o contexto RAG.
const RAG_CONTEXT_LIMIT = 180000;

/**
 * Trunca um texto para um comprimento máximo sem cortar palavras ao meio.
 * Adiciona uma nota indicando que o conteúdo foi truncado.
 */
const smartTruncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) {
        return text;
    }
    // Encontra o último espaço dentro do limite para evitar cortar uma palavra.
    const lastSpaceIndex = text.lastIndexOf(' ', maxLength);
    const effectiveLength = lastSpaceIndex > 0 ? lastSpaceIndex : maxLength;
    
    // Retorna o texto truncado com uma nota para indicar que o conteúdo foi cortado.
    return text.substring(0, effectiveLength) + '... [Conteúdo truncado para caber no limite]';
};

/**
 * Monta o contexto a partir dos arquivos de apoio, garantindo que não exceda o orçamento de caracteres.
 * Otimizações:
 * 1. Trunca o conteúdo de forma inteligente, sem cortar palavras ao meio.
 * 2. Adiciona marcadores de início/fim para cada arquivo, ajudando a IA a distinguir as fontes.
 * 3. Lida com erros de parsing de arquivos individuais sem interromper o processo.
 */
const buildRagContext = async (files: StoredFile[], contextBudget: number): Promise<string> => {
    if (!files || files.length === 0 || contextBudget <= 0) {
        return '';
    }

    const parsingPromises = files.map(async (storedFile) => {
        try {
            const file = await dataUrlToFile(storedFile.content, storedFile.name, storedFile.type);
            return { name: storedFile.name, content: await parseFile(file) };
        } catch (error) {
            console.error(`Falha ao processar o arquivo ${storedFile.name}:`, error);
            // Retorna null para arquivos que falham, para serem filtrados depois.
            return null;
        }
    });
    
    // Filtra arquivos que falharam no parsing e não têm conteúdo.
    const parsedFiles = (await Promise.all(parsingPromises)).filter(
        (file): file is { name: string; content: string } => file !== null && file.content.length > 0
    );
    
    if (parsedFiles.length === 0) {
        return '';
    }

    const totalLength = parsedFiles.reduce((acc, file) => acc + file.content.length, 0);

    let finalContents: { name: string; content: string }[];

    if (totalLength > contextBudget) {
        console.warn(`O conteúdo dos arquivos (${totalLength} chars) excede o orçamento (${contextBudget} chars). O conteúdo será truncado proporcionalmente.`);
        
        finalContents = parsedFiles.map(file => {
            if (totalLength === 0) return { ...file, content: '' }; // Evita divisão por zero
            const proportion = file.content.length / totalLength;
            const budgetedLength = Math.floor(proportion * contextBudget);
            // Usa a função de truncagem inteligente
            return { ...file, content: smartTruncate(file.content, budgetedLength) };
        });

    } else {
        finalContents = parsedFiles;
    }

    // Adiciona metadados sobre qual arquivo está sendo usado no contexto
    return finalContents.map(file => {
        return `--- Início do Documento: ${file.name} ---\n${file.content}\n--- Fim do Documento: ${file.name} ---`;
    }).join('\n\n');
};

/**
 * Extrai uma string JSON de uma resposta que pode conter formatação extra (como blocos de código Markdown).
 */
const extractJson = (text: string): string => {
    const markdownMatch = text.match(/```(json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[2]) {
        return markdownMatch[2].trim();
    }
    
    // Fallback: Encontra o primeiro '{' ou '[' e o último '}' ou ']' correspondente.
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    
    let startIndex = -1;
    if (firstBrace === -1) startIndex = firstBracket;
    else if (firstBracket === -1) startIndex = firstBrace;
    else startIndex = Math.min(firstBrace, firstBracket);

    if (startIndex === -1) {
        throw new Error("Nenhum JSON válido encontrado na resposta da IA.");
    }

    const lastBrace = text.lastIndexOf('}');
    const lastBracket = text.lastIndexOf(']');
    const endIndex = Math.max(lastBrace, lastBracket);

    if (endIndex === -1) {
        throw new Error("JSON incompleto na resposta da IA.");
    }

    return text.substring(startIndex, endIndex + 1);
};


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
                        description: "Descrição detalhada e contextualizada, incluindo seções obrigatórias: 'Contextualização', 'Objetivos de Aprendizagem', 'Passo a Passo da Atividade', e 'Avaliação'.",
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

/**
 * Gera atividades chamando a API do Gemini diretamente do frontend.
 */
export const generateActivities = async (formData: ActivityFormData, files: StoredFile[] = []): Promise<AiGeneratedActivity[]> => {
    try {
        if (!process.env.API_KEY) {
            throw new Error('A variável de ambiente API_KEY não está configurada.');
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const systemInstruction = "Você é um designer instrucional sênior e especialista em pedagogia, com profundo conhecimento do currículo brasileiro (BNCC e BNCC Computação). Sua missão é criar planos de aula completos e detalhados, não apenas esboços de atividades. Cada atividade deve ser criativa, engajadora e eficaz, integrando perfeitamente a disciplina solicitada com o pilar do pensamento computacional. Cada 'descricao' deve obrigatoriamente conter as seguintes seções em negrito: '**Contextualização:**', '**Objetivos de Aprendizagem:**', '**Passo a Passo da Atividade:**' e '**Avaliação:**'. Se um contexto de documentos (RAG) for fornecido, suas respostas devem ser estritamente baseadas nele.";
    
        const userPrompt = `
          Gere ${formData.quantity} ${formData.quantity > 1 ? 'planos de aula detalhados' : 'plano de aula detalhado'} para a disciplina de "${formData.subject}" sobre o tópico "${formData.topic}".
          As atividades são destinadas a uma turma de "${formData.grade}" e devem ter um nível de dificuldade "${formData.level}".
          Cada plano de aula deve obrigatoriamente integrar o pilar do pensamento computacional: "${formData.pillar}".
        `;
        
        // Calcular o orçamento de caracteres para o RAG, deixando espaço para o resto do prompt e a resposta.
        const promptBaseLength = systemInstruction.length + userPrompt.length;
        const ragBudget = RAG_CONTEXT_LIMIT - promptBaseLength;
        const ragContext = await buildRagContext(files, ragBudget);
        
        const finalPrompt = ragContext
        ? `Use estritamente as informações do contexto abaixo como fonte primária para criar as atividades. Não invente informações que não estejam nos documentos fornecidos.\n\n### CONTEXTO DOS DOCUMENTOS ###\n${ragContext}\n### FIM DO CONTEXTO ###\n\nCom base no contexto acima, elabore a seguinte solicitação:\n${userPrompt}`
        : userPrompt;
    
        const response = await ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: finalPrompt,
           config: {
             systemInstruction: systemInstruction,
             responseMimeType: "application/json",
             responseSchema: responseSchema,
           },
        });
        
        const rawJsonText = response.text;
        const cleanedJson = extractJson(rawJsonText);
        const parsedResponse = JSON.parse(cleanedJson);

        if (parsedResponse && Array.isArray(parsedResponse.atividades)) {
            return parsedResponse.atividades;
        } else {
            console.error("Resposta da IA com formato inesperado:", parsedResponse);
            throw new Error("A resposta da IA não corresponde à estrutura esperada (falta a chave 'atividades').");
        }

    } catch (error) {
        console.error("Erro ao chamar a API Gemini:", error);
        let errorMessage = "Ocorreu um erro desconhecido ao gerar as atividades.";
        if (error instanceof Error) {
            if (error.message.includes('API key not valid')) {
                errorMessage = "Falha na autenticação. Verifique se a Chave de API está correta e configurada.";
            } else if (error.message.includes('found no valid JSON')) {
                 errorMessage = "Falha ao analisar o JSON da resposta da IA. A resposta pode estar mal formatada ou incompleta.";
            }
            else {
                 errorMessage = `Falha ao se comunicar com o serviço de geração de atividades. Detalhes: ${error.message}`;
            }
        }
        throw new Error(errorMessage);
    }
};