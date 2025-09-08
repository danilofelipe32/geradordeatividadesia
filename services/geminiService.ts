import { AiGeneratedActivity, ActivityFormData, StoredFile } from '../types';
import { parseFile, dataUrlToFile } from './fileParserService';

// Limite de caracteres para o contexto RAG, para evitar payloads muito grandes para a função serverless.
const RAG_CONTEXT_LIMIT = 180000; // ~180KB, margem de segurança.

/**
 * Monta o contexto a partir dos arquivos de apoio, garantindo que não exceda o orçamento de caracteres.
 * Se o conteúdo total for muito grande, ele é truncado de forma inteligente e proporcional.
 */
const buildRagContext = async (files: StoredFile[], contextBudget: number): Promise<string> => {
    if (!files || files.length === 0 || contextBudget <= 0) {
        return '';
    }

    const parsingPromises = files.map(async (storedFile) => {
        const file = await dataUrlToFile(storedFile.content, storedFile.name, storedFile.type);
        return parseFile(file);
    });
    
    const contents = await Promise.all(parsingPromises);
    const totalLength = contents.reduce((acc, content) => acc + content.length, 0);

    let finalContents: string[];

    if (totalLength > contextBudget) {
        console.warn(`O conteúdo dos arquivos (${totalLength} chars) excede o orçamento (${contextBudget} chars). O conteúdo será truncado proporcionalmente.`);
        
        finalContents = contents.map(content => {
            if (totalLength === 0) return ''; // Evita divisão por zero
            const proportion = content.length / totalLength;
            const budgetedLength = Math.floor(proportion * contextBudget);
            return content.substring(0, budgetedLength);
        });

    } else {
        finalContents = contents;
    }

    return finalContents.join('\n\n---\n\n');
};

/**
 * Gera atividades chamando a função Netlify, que por sua vez chama a API Gemini.
 */
export const generateActivities = async (formData: ActivityFormData, files: StoredFile[] = []): Promise<AiGeneratedActivity[]> => {
    try {
        const ragContext = await buildRagContext(files, RAG_CONTEXT_LIMIT);

        // Chama a função serverless Netlify
        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ formData, ragContext }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Falha ao obter detalhes do erro.' }));
            throw new Error(`O servidor retornou um erro: ${response.status} ${response.statusText}. Detalhes: ${errorData.error || 'N/A'}`);
        }

        const parsedResponse = await response.json();

        if (parsedResponse && Array.isArray(parsedResponse.atividades)) {
            return parsedResponse.atividades;
        } else {
            console.error("Resposta do servidor com formato inesperado:", parsedResponse);
            throw new Error("A resposta do servidor não corresponde à estrutura esperada (falta a chave 'atividades').");
        }

    } catch (error) {
        console.error("Erro ao chamar a função de geração:", error);
        if (error instanceof Error) {
            // Re-throw com uma mensagem mais amigável para o usuário
            throw new Error(`Falha ao se comunicar com o serviço de geração de atividades. ${error.message}`);
        }
        throw new Error("Ocorreu um erro desconhecido ao gerar as atividades.");
    }
};
