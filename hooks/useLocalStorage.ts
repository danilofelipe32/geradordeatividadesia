import { useState, useEffect } from 'react';

// FIX: Declare chrome for TypeScript to recognize the Chrome Extension API.
declare var chrome: any;

// A lógica de serviço de armazenamento foi encapsulada aqui para centralizar a mudança.
// Ele detecta se a API de armazenamento do Chrome está disponível e a utiliza,
// caso contrário, recorre ao localStorage padrão.
const isChromeStorageAvailable = typeof chrome !== 'undefined' && chrome.storage && !!chrome.storage.local;

const storage = {
  async set<T>(key: string, value: T): Promise<void> {
    try {
      if (isChromeStorageAvailable) {
        await chrome.storage.local.set({ [key]: value });
      } else {
        const serializedValue = JSON.stringify(value);
        window.localStorage.setItem(key, serializedValue);
      }
    } catch (error) {
      console.error(`Falha ao salvar o item '${key}' no armazenamento:`, error);
      throw error;
    }
  },

  async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      if (isChromeStorageAvailable) {
        const result = await chrome.storage.local.get(key);
        // Se a chave não existir, chrome.storage.local.get retorna um objeto vazio.
        return key in result ? result[key] : defaultValue;
      } else {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      }
    } catch (error) {
      console.error(`Falha ao obter o item '${key}' do armazenamento:`, error);
      return defaultValue;
    }
  }
};

/**
 * Hook para persistir o estado no navegador. Utiliza `chrome.storage.local` se 
 * disponível, com um fallback para `localStorage`. A busca de dados agora é 
 * assíncrona para acomodar a API do Chrome.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  // Efeito para carregar o valor do armazenamento uma vez na montagem do componente.
  useEffect(() => {
    let isMounted = true;
    storage.get<T>(key, initialValue).then(value => {
      if (isMounted) {
        setStoredValue(value);
        setIsInitialized(true);
      }
    }).catch(error => {
      console.error(`Erro ao carregar o estado inicial para a chave "${key}":`, error);
      if (isMounted) {
        setIsInitialized(true); // Permite que a aplicação continue mesmo se o carregamento falhar
      }
    });
    
    return () => { isMounted = false; };
  }, [key]); // O hook é projetado para chaves estáticas; initialValue não está aqui para evitar recargas.

  // Efeito para salvar o valor no armazenamento sempre que ele mudar, mas somente após o carregamento inicial.
  useEffect(() => {
    if (isInitialized) {
      storage.set(key, storedValue).catch(error => {
        // O erro já é logado dentro da função `storage.set`, não é necessário logar novamente.
      });
    }
  }, [key, storedValue, isInitialized]);

  return [storedValue, setStoredValue];
}
