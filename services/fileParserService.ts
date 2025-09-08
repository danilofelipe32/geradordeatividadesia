// This service uses external libraries loaded via <script> tags in index.html
// We declare them globally to satisfy TypeScript.

declare global {
  interface Window {
    pdfjsLib: any;
    mammoth: any;
  }
}

/**
 * Converts a base64 data URL string into a File object.
 */
export const dataUrlToFile = async (dataUrl: string, filename: string, mimeType: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: mimeType });
}

/**
 * Parses the text content from a given File object based on its MIME type.
 * Supports .txt, .md, .pdf, and .docx files.
 */
export const parseFile = async (file: File): Promise<string> => {
  switch (file.type) {
    case 'text/plain':
    case 'text/markdown':
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
      });
    
    case 'application/pdf':
      return new Promise(async (resolve, reject) => {
        if (!window.pdfjsLib) {
          return reject(new Error('A biblioteca PDF.js não está carregada.'));
        }
        // Configure the worker to be fetched from the CDN
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            if (!event.target?.result) {
                return reject(new Error("Falha ao ler o arquivo PDF."));
            }
            const pdfData = new Uint8Array(event.target.result as ArrayBuffer);
            const pdf = await window.pdfjsLib.getDocument({ data: pdfData }).promise;
            let textContent = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const text = await page.getTextContent();
              // text.items is an array of objects with a 'str' property
              textContent += text.items.map((item: any) => item.str).join(' ');
              textContent += '\n\n'; // Add space between pages
            }
            resolve(textContent);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
      });

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return new Promise((resolve, reject) => {
        if (!window.mammoth) {
            return reject(new Error('A biblioteca Mammoth.js não está carregada.'));
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          if (!event.target?.result) {
            return reject(new Error("Falha ao ler o arquivo DOCX."));
          }
          window.mammoth.extractRawText({ arrayBuffer: event.target.result as ArrayBuffer })
            .then((result: any) => resolve(result.value))
            .catch(reject);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
      });
      
    default:
      return Promise.reject(new Error(`Tipo de arquivo não suportado: ${file.type || 'desconhecido'}`));
  }
};
