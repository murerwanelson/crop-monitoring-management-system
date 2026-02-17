import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { FullObservation } from '@/types/database.types';
import { format } from 'date-fns';

/**
 * Export observations to CSV
 */
export const exportToCSV = (data: FullObservation[], filename = 'observations_export.csv') => {
    // Flatten data for CSV
    const flatData = data.map(obs => ({
        ID: obs.id,
        Date: format(new Date(obs.date_recorded), 'yyyy-MM-dd HH:mm'),
        Field: obs.field_name,
        Section: obs.section_name,
        Block: obs.block_id,
        'Crop Type': obs.crop_information?.crop_type || '',
        Variety: obs.crop_information?.variety || '',
        Stage: obs.crop_information?.crop_stage || '',
        'Canopy %': obs.crop_monitoring?.canopy_cover || '',
        Vigor: obs.crop_monitoring?.crop_vigor || '',
        Stress: obs.crop_monitoring?.stress || 'None',
        'Moisture %': obs.irrigation_management?.soil_moisture_percentage || '',
        'Irrigation Vol': obs.irrigation_management?.irrigation_volume || '',
        'Fertilizer': obs.nutrient_management?.fertilizer_type || '',
        'App Rate': obs.nutrient_management?.application_rate || '',
        'Yield': obs.harvest?.yield || '',
        'Latitude': obs.latitude,
        'Longitude': obs.longitude
    }));

    const csv = Papa.unparse(flatData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

/**
 * Generate PDF Report for a single observation
 */
export const generatePDFReport = (obs: FullObservation) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(46, 125, 50); // Primary green
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Field Observation Report', 20, 25);

    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth - 20, 25, { align: 'right' });

    // Section 1: Overview
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Observation Overview', 20, 55);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 57, pageWidth - 20, 57);

    // Grid details
    autoTable(doc, {
        startY: 65,
        head: [['Field', 'Section', 'Block', 'Date Recorded']],
        body: [[
            obs.field_name,
            obs.section_name,
            obs.block_id,
            format(new Date(obs.date_recorded), 'MMM dd, yyyy HH:mm')
        ]],
        theme: 'striped',
        headStyles: { fillColor: [46, 125, 50] }
    });

    // Section 2: Crop Status
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text('2. Agronomic Status', 20, finalY);
    doc.line(20, finalY + 2, pageWidth - 20, finalY + 2);

    autoTable(doc, {
        startY: finalY + 10,
        head: [['Crop', 'Variety', 'Stage', 'Canopy %', 'Vigor', 'Stress']],
        body: [[
            obs.crop_information?.crop_type || '-',
            obs.crop_information?.variety || '-',
            obs.crop_information?.crop_stage || '-',
            `${obs.crop_monitoring?.canopy_cover || 0}%`,
            obs.crop_monitoring?.crop_vigor || '-',
            obs.crop_monitoring?.stress || 'None'
        ]],
        theme: 'striped',
        headStyles: { fillColor: [46, 125, 50] }
    });

    // Section 3: Inputs & Soil
    const finalY2 = (doc as any).lastAutoTable.finalY + 15;
    doc.text('3. Soil & Inputs', 20, finalY2);
    doc.line(20, finalY2 + 2, pageWidth - 20, finalY2 + 2);

    const inputsData = [
        ['Soil Moisture', `${obs.irrigation_management?.soil_moisture_percentage || 0}%`],
        ['Irrigation Vol', `${obs.irrigation_management?.irrigation_volume || 0} L`],
        ['Fertilizer', obs.nutrient_management?.fertilizer_type || '-'],
        ['Application Rate', obs.nutrient_management?.application_rate ? `${obs.nutrient_management.application_rate} kg/ha` : '-'],
        ['Pest/Disease', `${obs.crop_protection?.pest_type || '-'} / ${obs.crop_protection?.disease_type || '-'}`]
    ];

    autoTable(doc, {
        startY: finalY2 + 10,
        head: [['Metric', 'Value']],
        body: inputsData,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] }
    });

    // GPS footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`GPS: ${obs.latitude}, ${obs.longitude} | ID: ${obs.id}`, 20, doc.internal.pageSize.getHeight() - 10);

    doc.save(`Observation_Report_${obs.field_name}_${obs.id.substring(0, 6)}.pdf`);
};
