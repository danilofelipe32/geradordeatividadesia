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
 * Gera atividades chamando a função serverless da Netlify, que por sua vez chama a API do Gemini.
 * Esta abordagem é segura pois a chave de API não é exposta no frontend.
 */
export const generateActivities = async (formData: ActivityFormData, files: StoredFile[] = []): Promise<AiGeneratedActivity[]> => {
    try {
        // Calcular o orçamento de caracteres para o RAG, deixando espaço para o resto do prompt e a resposta.
        const promptBaseLength = 2000; // Reserva para systemInstruction e userPrompt na função serverless
        const ragBudget = RAG_CONTEXT_LIMIT - promptBaseLength;
        const ragContext = await buildRagContext(files, ragBudget);
        
        // Chama a função serverless da Netlify
        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ formData, ragContext }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Não foi possível analisar a resposta de erro do servidor.' }));
            throw new Error(`Erro do servidor (${response.status}): ${errorData.error || response.statusText}`);
        }

        const result = await response.json();
        
        if (result && Array.isArray(result.atividades)) {
            return result.atividades;
        } else {
            console.error("Resposta da função Netlify com formato inesperado:", result);
            throw new Error("A resposta do servidor não corresponde à estrutura esperada (falta a chave 'atividades').");
        }

    } catch (error) {
        console.error("Erro ao chamar a função Netlify:", error);
        const errorMessage = error instanceof Error 
            ? `Falha ao se comunicar com o serviço de geração de atividades. Detalhes: ${error.message}`
            : "Ocorreu um erro desconhecido ao gerar as atividades.";
        throw new Error(errorMessage);
    }
};