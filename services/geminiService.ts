import { AiGeneratedActivity, ActivityFormData, StoredFile } from '../types';
import { parseFile, dataUrlToFile } from './fileParserService';

// Orçamento para caracteres de contexto RAG para evitar exceder os limites do modelo.
const CONTEXT_BUDGET = 180000;

/**
 * Monta o contexto a partir dos arquivos de apoio, garantindo que não exceda o orçamento de caracteres.
 * Se o conteúdo total for muito grande, ele é truncado de forma inteligente.
 */
const buildRagContext = async (files: StoredFile[]): Promise<string> => {
    if (!files || files.length === 0) {
        return '';
    }

    const parsingPromises = files.map(async (storedFile) => {
        const file = await dataUrlToFile(storedFile.content, storedFile.name, storedFile.type);
        return parseFile(file);
    });
    
    const contents = await Promise.all(parsingPromises);
    const totalLength = contents.reduce((acc, content) => acc + content.length, 0);

    let finalContents: string[];

    if (totalLength > CONTEXT_BUDGET) {
        console.warn(`O conteúdo dos arquivos (${totalLength} chars) excede o orçamento (${CONTEXT_BUDGET} chars). O conteúdo será truncado.`);
        const budgetPerFile = Math.floor(CONTEXT_BUDGET / contents.length);
        finalContents = contents.map(content => content.substring(0, budgetPerFile));
    } else {
        finalContents = contents;
    }

    return finalContents.join('\n\n---\n\n');
};


/**
 * Gera atividades chamando a API do Gemini através de uma função Netlify segura.
 */
export const generateActivities = async (formData: ActivityFormData, files: StoredFile[] = []): Promise<AiGeneratedActivity[]> => {
    try {
        const ragContext = await buildRagContext(files);

        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ formData, ragContext }),
        });

        const responseBody = await response.text();

        if (!response.ok) {
            let errorMsg = `Erro do servidor: ${response.status} ${response.statusText}`;
            try {
                const errorJson = JSON.parse(responseBody);
                errorMsg = errorJson.error || errorMsg;
            } catch (e) {
                // Ignora se a resposta não for JSON
            }
            throw new Error(errorMsg);
        }

        const parsedResponse = JSON.parse(responseBody);

        if (parsedResponse && Array.isArray(parsedResponse.atividades)) {
            return parsedResponse.atividades;
        } else {
            console.error("Resposta da função Netlify com JSON inválido:", responseBody);
            throw new Error("A resposta do servidor não corresponde à estrutura esperada.");
        }
    } catch (error) {
        console.error("Erro ao chamar a função Netlify:", error);
        if (error instanceof Error) {
            throw new Error(`Falha ao se comunicar com a IA. ${error.message}.`);
        }
        throw new Error("Ocorreu um erro desconhecido ao gerar as atividades.");
    }
};
