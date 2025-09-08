import { AiGeneratedActivity, ActivityFormData, StoredFile } from '../types';
import { parseFile, dataUrlToFile } from './fileParserService';

// Limite de caracteres da API, com uma margem de segurança.
const SAFE_API_LIMIT = 195000;

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
 * Extrai de forma robusta uma string JSON de uma resposta de texto da IA.
 * Lida com blocos de código markdown (```json) e texto extra antes/depois do JSON.
 */
const extractJson = (text: string): string | null => {
  // 1. Tenta encontrar um bloco de código JSON markdown.
  const markdownMatch = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (markdownMatch && markdownMatch[1]) {
    return markdownMatch[1];
  }

  // 2. Se não houver markdown, procura pelo primeiro objeto '{' ou array '['.
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  let start = -1;

  if (firstBrace === -1 && firstBracket === -1) return null;
  
  if (firstBrace !== -1 && firstBracket !== -1) {
    start = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    start = firstBrace;
  } else {
    start = firstBracket;
  }
  
  const endChar = text[start] === '{' ? '}' : ']';
  
  // Encontra o final correspondente, considerando aninhamento
  let braceCount = 0;
  let inString = false;
  let last = -1;

  for (let i = start; i < text.length; i++) {
    const char = text[i];
    // Ignora caracteres dentro de strings
    if (char === '"' && text[i-1] !== '\\') {
        inString = !inString;
    }
    if (inString) continue;

    if (char === text[start]) {
        braceCount++;
    } else if (char === endChar) {
        braceCount--;
    }
    if (braceCount === 0) {
        last = i;
        break;
    }
  }

  if (last !== -1) {
    return text.substring(start, last + 1);
  }

  // Fallback para o regex original se a contagem de chaves falhar
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return null;
};


/**
 * Gera atividades chamando a API do ApiFreeLLM diretamente do cliente.
 */
export const generateActivities = async (formData: ActivityFormData, files: StoredFile[] = []): Promise<AiGeneratedActivity[]> => {
    try {
        const systemInstruction = "Você é um designer instrucional sênior e especialista em pedagogia, com profundo conhecimento do currículo brasileiro (BNCC e BNCC Computação). Sua missão é criar planos de aula completos, detalhados e prontos para serem aplicados por um professor. Cada plano de aula deve ser criativo, engajador e eficaz. Se um contexto de documentos (RAG) for fornecido, suas respostas devem ser estritamente baseadas nele.";

        const userPrompt = `
          Gere ${formData.quantity} ${formData.quantity > 1 ? 'planos de aula detalhados' : 'plano de aula detalhado'} para a disciplina de "${formData.subject}" sobre o tópico "${formData.topic}".
          As atividades são destinadas a uma turma de "${formData.grade}" e devem ter um nível de dificuldade "${formData.level}".
          Cada plano de aula deve obrigatoriamente integrar o pilar do pensamento computacional: "${formData.pillar}".
        `;
        
        const ragPromptTemplate = "Use estritamente as informações do contexto abaixo como fonte primária para criar as atividades. Não invente informações que não estejam nos documentos fornecidos.\n\n### CONTEXTO DOS DOCUMENTOS ###\n${ragContext}\n### FIM DO CONTEXTO ###\n\nCom base no contexto acima, elabore a seguinte solicitação:\n";

        const jsonInstruction = `
          Sua resposta DEVE SER APENAS um objeto JSON válido, sem nenhum texto adicional antes ou depois. O JSON deve ter a seguinte estrutura:
          {
            "atividades": [
              {
                "titulo": "string",
                "descricao": "string (Um texto longo e detalhado formatado em Markdown contendo OBRIGATORIAMENTE as seguintes seções: '**Contextualização:**' (uma introdução ao tema e sua relevância), '**Objetivos de Aprendizagem:**' (uma lista com marcadores dos objetivos), '**Passo a Passo da Atividade:**' (instruções claras e sequenciais para o professor e os alunos), e '**Avaliação:**' (sugestões de como avaliar o aprendizado dos alunos).)",
                "competenciaBNCC": "string (código e descrição completa da competência)",
                "competenciaBNCCComputacao": "string (código e descrição completa da competência)",
                "duracaoEstimada": "integer (em minutos)",
                "recursosNecessarios": ["string", "string", ...]
              }
            ]
          }
        `;
        
        // Calcula dinamicamente o orçamento para o contexto RAG.
        const basePromptLength = (
            systemInstruction.length +
            userPrompt.length +
            jsonInstruction.length +
            (files.length > 0 ? ragPromptTemplate.replace('${ragContext}', '').length : 0)
        );
        const ragContextBudget = SAFE_API_LIMIT - basePromptLength;
        const ragContext = await buildRagContext(files, ragContextBudget);

        const contextPrompt = ragContext
          ? ragPromptTemplate.replace('${ragContext}', ragContext) + userPrompt
          : userPrompt;

        const fullPrompt = `${systemInstruction}\n\n${contextPrompt}\n\n${jsonInstruction}`;

        // Chama a API ApiFreeLLM
        const response = await fetch('https://apifreellm.com/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: fullPrompt }),
        });

        if (!response.ok) {
            throw new Error(`Erro de rede: ${response.status} ${response.statusText}`);
        }

        const apiResponse = await response.json();

        if (apiResponse.status !== 'success') {
            if (apiResponse.status === 'rate_limited') {
                throw new Error(`Limite de requisições atingido. Por favor, aguarde ${apiResponse.retry_after} segundos e tente novamente.`);
            }
            throw new Error(`Erro da API: ${apiResponse.error || 'Ocorreu um erro desconhecido.'}`);
        }

        const aiTextResponse = apiResponse.response;
        
        const jsonString = extractJson(aiTextResponse);
        if (!jsonString) {
            console.error("Nenhum JSON válido encontrado na resposta da IA:", aiTextResponse);
            throw new Error(`A IA retornou uma resposta que não contém um JSON válido. Resposta recebida: "${aiTextResponse}"`);
        }
        
        try {
            const parsedResponse = JSON.parse(jsonString);

            if (parsedResponse && Array.isArray(parsedResponse.atividades)) {
                return parsedResponse.atividades;
            } else {
                console.error("Resposta da API com JSON inválido (após extração):", jsonString);
                throw new Error("A resposta da IA não corresponde à estrutura esperada (falta a chave 'atividades' na resposta JSON).");
            }
        } catch (e) {
            console.error("Falha ao analisar o JSON da resposta da IA:", jsonString, e);
            throw new Error(`Falha ao analisar o JSON da resposta da IA. Resposta recebida: "${aiTextResponse}"`);
        }

    } catch (error) {
        console.error("Erro ao chamar a API FreeLLM:", error);
        if (error instanceof Error) {
            throw new Error(`Falha ao se comunicar com a IA. ${error.message}.`);
        }
        throw new Error("Ocorreu um erro desconhecido ao gerar as atividades.");
    }
};