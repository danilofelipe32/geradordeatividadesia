import { AiGeneratedActivity, ActivityFormData, StoredFile } from '../types';
import { parseFile, dataUrlToFile } from './fileParserService';

// Limite de caracteres para o contexto RAG. A ApiFreeLLM tem um limite de 200k chars.
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
 * Extrai um objeto JSON de uma string de texto.
 * Lida com blocos de código markdown (```json) e JSON simples.
 */
const extractJson = (text: string): any => {
    // Primeiro, tenta encontrar um bloco de código JSON
    const jsonCodeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
        try {
            return JSON.parse(jsonCodeBlockMatch[1]);
        } catch (e) {
            console.error("JSON em bloco de código malformado, tentando extração geral.", jsonCodeBlockMatch[1]);
        }
    }

    // Se não encontrar ou falhar, tenta extrair o primeiro objeto JSON aninhado corretamente
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error("A resposta da IA não contém um objeto JSON válido.");
    }

    const jsonString = text.substring(startIndex, endIndex + 1);

    try {
        return JSON.parse(jsonString);
    } catch (parseError) {
        console.error("Falha ao analisar o JSON extraído:", jsonString);
        throw new Error("A resposta da IA está em um formato JSON malformado.");
    }
}


/**
 * Gera atividades chamando a ApiFreeLLM diretamente do cliente.
 */
export const generateActivities = async (formData: ActivityFormData, files: StoredFile[] = []): Promise<AiGeneratedActivity[]> => {
    try {
        const ragContext = await buildRagContext(files, RAG_CONTEXT_LIMIT);
        const hasRagContext = ragContext.length > 0;

        const systemInstruction = "Você é um designer instrucional sênior e especialista em pedagogia, com profundo conhecimento do currículo brasileiro (BNCC e BNCC Computação). Sua missão é criar planos de aula excepcionalmente completos e detalhados, prontos para serem aplicados em sala de aula. Se um contexto de documentos (RAG) for fornecido, suas respostas devem ser estritamente baseadas nele.";
        
        const bnccInstruction = hasRagContext
            ? "string - Após uma análise cuidadosa, extraia DIRETAMENTE E EXCLUSIVAMENTE do contexto (documentos de apoio) o código e a descrição da competência da BNCC mais relevante para a atividade. Se nenhuma competência aplicável for encontrada no contexto, retorne a string 'Não identificada no material de apoio'."
            : "string - O código e a descrição completa da principal competência da BNCC geral abordada.";

        const bnccComputacaoInstruction = hasRagContext
            ? "string - Após uma análise cuidadosa, extraia DIRETAMENTE E EXCLUSIVAMENTE do contexto (documentos de apoio) o código e a descrição da competência da BNCC Computação mais relevante para a atividade. Se nenhuma competência aplicável for encontrada no contexto, retorne a string 'Não identificada no material de apoio'."
            : "string - O código e a descrição completa da principal competência da BNCC Computação.";


        const jsonStructurePrompt = `
Sua resposta DEVE ser APENAS um objeto JSON válido, sem nenhum texto ou explicação adicional antes ou depois dele. O JSON deve seguir estritamente esta estrutura:
{
  "atividades": [
    {
      "titulo": "string - Um título criativo e chamativo para a atividade.",
      "descricao": "string - Descrição MUITO detalhada, formatada em markdown com títulos claros. DEVE OBRIGATORIAMENTE conter as seguintes seções com estes títulos exatos: '### Objetivos da Atividade', '### Passo a Passo para o Professor', '### Instruções para os Alunos', e '### Sugestão de Avaliação'. O passo a passo deve ser uma lista numerada e clara.",
      "competenciaBNCC": "${bnccInstruction}",
      "competenciaBNCCComputacao": "${bnccComputacaoInstruction}",
      "duracaoEstimada": "integer - O tempo estimado em minutos para a conclusão da atividade.",
      "recursosNecessarios": ["string[] - Uma lista detalhada de todos os recursos necessários."]
    }
  ]
}
`;
        
        const userPrompt = `
          Gere ${formData.quantity} ${formData.quantity > 1 ? 'planos de aula detalhados' : 'plano de aula detalhado'} para a disciplina de "${formData.subject}" sobre o tópico "${formData.topic}".
          As atividades são destinadas a uma turma de "${formData.grade}" e devem ter um nível de dificuldade "${formData.level}".
          Cada plano de aula deve obrigatoriamente integrar o pilar do pensamento computacional: "${formData.pillar}".
        `;
        
        const contextPrompt = hasRagContext
        ? `Use estritamente as informações do contexto abaixo como fonte primária para criar as atividades:\n\n### CONTEXTO DOS DOCUMENTOS ###\n${ragContext}\n### FIM DO CONTEXTO ###\n\nCom base no contexto acima, elabore a seguinte solicitação:\n${userPrompt}`
        : userPrompt;

        const finalMessage = `${systemInstruction}\n\n${jsonStructurePrompt}\n\n${contextPrompt}`;

        const response = await fetch('https://apifreellm.com/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: finalMessage }),
        });
        
        if (!response.ok) {
           // A documentação diz que sempre retorna 200, mas por segurança:
           throw new Error(`Erro de rede (${response.status}): ${response.statusText}`);
        }

        const result = await response.json();

        if (result.status === 'rate_limited') {
            throw new Error(`Limite de requisições atingido. Por favor, aguarde ${result.retry_after || 5} segundos antes de tentar novamente.`);
        }

        if (result.status !== 'success' || !result.response) {
            throw new Error(`Erro da API: ${result.error || 'Resposta inválida recebida.'}`);
        }

        const parsedJson = extractJson(result.response);
        
        if (parsedJson && Array.isArray(parsedJson.atividades)) {
            return parsedJson.atividades;
        } else {
            console.error("Resposta da API com formato JSON inesperado:", parsedJson);
            throw new Error("A resposta do servidor não corresponde à estrutura esperada (falta a chave 'atividades').");
        }

    } catch (error) {
        console.error("Erro ao chamar a ApiFreeLLM:", error);
        const errorMessage = error instanceof Error 
            ? `Falha ao se comunicar com o serviço de geração de atividades. Detalhes: ${error.message}`
            : "Ocorreu um erro desconhecido ao gerar as atividades.";
        throw new Error(errorMessage);
    }
};