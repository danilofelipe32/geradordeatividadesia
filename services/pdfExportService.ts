import { Activity } from '../types';

// This service uses an external library loaded via <script> tag in index.html
// We declare it globally to satisfy TypeScript.
declare const jspdf: any;

const MARGIN = 15;
const FONT_SIZES = {
  title: 16,
  subtitle: 12,
  body: 10,
  header: 20,
};
const LINE_HEIGHT = 1.5;

export const exportActivitiesToPdf = (activities: Activity[]) => {
  if (activities.length === 0) {
    alert("Nenhuma atividade para exportar.");
    return;
  }
  
  const { jsPDF } = jspdf;
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - MARGIN * 2;
  let cursorY = MARGIN;

  const checkPageBreak = (spaceNeeded: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (cursorY + spaceNeeded > pageHeight - MARGIN) {
      doc.addPage();
      cursorY = MARGIN;
    }
  };
  
  // Document Title
  doc.setFontSize(FONT_SIZES.header);
  doc.setFont('helvetica', 'bold');
  doc.text("Plano de Atividades Gerado por IA", pageWidth / 2, cursorY, { align: 'center' });
  cursorY += FONT_SIZES.header / 2;

  activities.forEach((activity, index) => {
    if (index > 0) {
        cursorY += MARGIN / 2;
        checkPageBreak(MARGIN);
        doc.setDrawColor(200); // light grey line
        doc.line(MARGIN, cursorY, pageWidth - MARGIN, cursorY);
        cursorY += MARGIN / 2;
    }
    
    // Activity Title
    checkPageBreak(FONT_SIZES.title);
    doc.setFontSize(FONT_SIZES.title);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 61, 107); // primary-dark
    const titleLines = doc.splitTextToSize(activity.titulo, usableWidth);
    doc.text(titleLines, MARGIN, cursorY);
    cursorY += titleLines.length * FONT_SIZES.title / 2.5;

    // Sub-header (Subject, Grade, Level)
    checkPageBreak(FONT_SIZES.body);
    doc.setFontSize(FONT_SIZES.body);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100); // grey
    const subheaderText = `${activity.subject} | Turma: ${activity.grade} | Nível: ${activity.level} | Duração: ${activity.duracaoEstimada} min`;
    doc.text(subheaderText, MARGIN, cursorY);
    cursorY += FONT_SIZES.body * LINE_HEIGHT;
    
    const addSection = (title: string, content: string | string[]) => {
      cursorY += 5;
      checkPageBreak(FONT_SIZES.subtitle + 5);
      doc.setFontSize(FONT_SIZES.subtitle);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 90, 156); // primary
      doc.text(title, MARGIN, cursorY);
      cursorY += FONT_SIZES.subtitle / 2;

      checkPageBreak(FONT_SIZES.body);
      doc.setFontSize(FONT_SIZES.body);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50); // dark grey

      if (Array.isArray(content)) {
          content.forEach(item => {
              const itemText = `- ${item}`;
              const itemLines = doc.splitTextToSize(itemText, usableWidth - 5);
              checkPageBreak(itemLines.length * FONT_SIZES.body / 2);
              doc.text(itemLines, MARGIN + 2, cursorY);
              cursorY += itemLines.length * FONT_SIZES.body / 2 * LINE_HEIGHT;
          });
      } else {
          const contentLines = doc.splitTextToSize(content, usableWidth);
          checkPageBreak(contentLines.length * FONT_SIZES.body / 2);
          doc.text(contentLines, MARGIN, cursorY);
          cursorY += contentLines.length * FONT_SIZES.body / 2.2;
      }
    };

    addSection('Descrição da Atividade', activity.descricao);
    addSection('Competência BNCC', activity.competenciaBNCC);
    addSection('Competência BNCC Computação', activity.competenciaBNCCComputacao);
    addSection('Recursos Necessários', activity.recursosNecessarios);
  });
  
  doc.save('atividades-bncc.pdf');
};