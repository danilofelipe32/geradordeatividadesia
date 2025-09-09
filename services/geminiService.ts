import { AiGeneratedActivity, ActivityFormData, StoredFile } from '../types';
import { parseFile, dataUrlToFile } from './fileParserService';

// RAG context character limit to stay within model constraints.
const RAG_CONTEXT_LIMIT = 180000;

/**
 * Truncates text to a maximum length without splitting words.
 * Appends a note indicating that the content was truncated.
 */
const smartTruncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) {
        return text;
    }
    // Find the last space within the limit to avoid cutting a word.
    const lastSpaceIndex = text.lastIndexOf(' ', maxLength);
    const effectiveLength = lastSpaceIndex > 0 ? lastSpaceIndex : maxLength;
    
    return text.substring(0, effectiveLength) + '... [Conteúdo truncado para caber no limite]';
};

/**
 * Builds the context from supporting files, ensuring it doesn't exceed the character budget.
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
            // Return null for failed files to be filtered out later.
            return null;
        }
    });
    
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
            if (totalLength === 0) return { ...file, content: '' }; // Avoid division by zero
            const proportion = file.content.length / totalLength;
            const budgetedLength = Math.floor(proportion * contextBudget);
            return { ...file, content: smartTruncate(file.content, budgetedLength) };
        });

    } else {
        finalContents = parsedFiles;
    }

    // Add metadata about which file is being used in the context.
    return finalContents.map(file => {
        return `--- Início do Documento: ${file.name} ---\n${file.content}\n--- Fim do Documento: ${file.name} ---`;
    }).join('\n\n');
};


/**
 * Generates activities by calling the Netlify function which proxies to the Gemini API.
 */
export const generateActivities = async (formData: ActivityFormData, files: StoredFile[] = []): Promise<AiGeneratedActivity[]> => {
    try {
        const ragContext = await buildRagContext(files, RAG_CONTEXT_LIMIT);
        
        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ formData, ragContext }),
        });
        
        const result = await response.json();

        if (!response.ok) {
           const errorDetails = result.details || result.error || response.statusText;
           throw new Error(`Erro de comunicação com o servidor (${response.status}): ${errorDetails}`);
        }
        
        if (result && Array.isArray(result.atividades)) {
            return result.atividades;
        } else {
            console.error("Resposta da API com formato JSON inesperado:", result);
            throw new Error("A resposta do servidor não corresponde à estrutura esperada (falta a chave 'atividades').");
        }

    } catch (error) {
        console.error("Erro ao chamar a função Netlify:", error);
        const errorMessage = error instanceof Error 
            ? `Falha ao gerar atividades. Detalhes: ${error.message}`
            : "Ocorreu um erro desconhecido ao gerar as atividades.";
        throw new Error(errorMessage);
    }
};