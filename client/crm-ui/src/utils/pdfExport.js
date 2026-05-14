import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo-idea-fueled-new.png';

export const exportPDF = ({
    title,
    filename = 'report.pdf',
    columns,
    data,
    orientation = 'portrait',
    headerText = 'Idea Fueled CRM - Official Report'
}) => {
    const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const timestamp = new Date().toLocaleString();

    // -- Header Section --
    // Header is now white (simple), so we don't need a filled rect
    // But we can add a subtle bottom border or just leave it clean
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(15, 42, pageWidth - 15, 42);

    // Add Logo Image
    try {
        // Position: x=15, y=10, width=40, height=auto (scaled)
        doc.addImage(logo, 'PNG', 15, 10, 45, 12);
    } catch (e) {
        // Fallback to text if image fails
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Idea Fueled', 15, 22);
    }

    // Add Report Title
    doc.setTextColor(51, 65, 85); // Slate-700
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text((title || 'REPORT').toUpperCase(), 15, 33);

    // Add Date/Time info on the right (Dark text now)
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${timestamp}`, pageWidth - 15, 22, { align: 'right' });
    doc.text(headerText, pageWidth - 15, 30, { align: 'right' });

    // -- Content Section --
    doc.setTextColor(51, 65, 85); // Slate-700

    autoTable(doc, {
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
