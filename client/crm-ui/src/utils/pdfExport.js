import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportPDF = ({
    title,
    filename = 'report.pdf',
    columns,
    data,
    orientation = 'portrait',
    headerText = 'Idea Fueled CRM - Official Report'
}) => {
    const doc = jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const timestamp = new Date().toLocaleString();

    // -- Header Section --
    // Add a stylish header bar
    doc.setFillColor(11, 17, 33); // Dark slate from sidebar
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Add Logo Text (Simulated)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Idea Fueled', 15, 25);

    // Add Report Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(title.toUpperCase(), 15, 33);

    // Add Date/Time info on the right
    doc.setFontSize(9);
    doc.text(`Generated: ${timestamp}`, pageWidth - 15, 25, { align: 'right' });
    doc.text(headerText, pageWidth - 15, 33, { align: 'right' });

    // -- Content Section --
    doc.setTextColor(51, 65, 85); // Slate-700

    doc.autoTable({
        startY: 50,
        head: [columns],
        body: data,
        theme: 'grid',
        headStyles: {
            fillColor: [37, 99, 235], // blue-600
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: {
            fontSize: 9,
            textColor: [30, 41, 59], // Slate-800
            cellPadding: 4
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] // Slate-50
        },
        margin: { top: 50, left: 15, right: 15 },
        didDrawPage: (data) => {
            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); // Slate-400
            doc.text(
                `Page ${pageCount}`,
                pageWidth / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }
    });

    doc.save(filename);
};
